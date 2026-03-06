import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClaudeClient } from "@/lib/claude";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await getClaudeClient(session.user.id);
    if (!client) {
      return NextResponse.json(
        { error: "API key not configured. Please add your Anthropic API key in Settings > Integrations." },
        { status: 400 }
      );
    }

    // Get agent config
    const config = await prisma.agentConfig.findUnique({
      where: { agentType: "enricher" },
    });
    const approvalRequired = config?.approvalRequired ?? false;

    // Create agent run
    const run = await prisma.agentRun.create({
      data: {
        agentType: "enricher",
        status: "running",
      },
    });

    let enriched = 0;
    let errors = 0;
    const summaryParts: string[] = [];

    try {
      // Find leads that need enrichment:
      // - Source is "AI Prospector" or missing key fields
      const leads = await prisma.lead.findMany({
        where: {
          OR: [
            { source: "AI Prospector" },
            { email: null },
            { email: "" },
            { phone: null },
            { phone: "" },
            { company: null },
            { company: "" },
            { title: null },
            { title: "" },
          ],
        },
        take: 10,
        orderBy: { createdAt: "desc" },
      });

      for (const lead of leads) {
        try {
          const response = await client.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1024,
            messages: [
              {
                role: "user",
                content: `Based on this person's information, fill in any missing details with plausible, realistic data. This is for a CRM system.

Current data:
- Name: ${lead.firstName} ${lead.lastName}
- Company: ${lead.company || "unknown"}
- Title: ${lead.title || "unknown"}
- Email: ${lead.email || "unknown"}
- Phone: ${lead.phone || "unknown"}
- Industry: unknown
- City/State: ${lead.city || "unknown"}/${lead.state || "unknown"}

Return ONLY a JSON object with the enriched fields (only include fields you can reasonably infer):
{ "title": "...", "company": "...", "city": "...", "state": "...", "description": "..." }`,
              },
            ],
          });

          const text = response.content[0].type === "text" ? response.content[0].text : "";

          // Parse the JSON response
          let enrichedFields: Record<string, string> = {};

          try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              enrichedFields = JSON.parse(jsonMatch[0]);
            }
          } catch {
            summaryParts.push(`Failed to parse enrichment for ${lead.firstName} ${lead.lastName}`);
            errors++;
            continue;
          }

          // Filter to only include fields that are currently missing
          const updateData: Record<string, string> = {};
          if (enrichedFields.title && (!lead.title || lead.title === "unknown")) {
            updateData.title = enrichedFields.title;
          }
          if (enrichedFields.company && (!lead.company || lead.company === "unknown")) {
            updateData.company = enrichedFields.company;
          }
          if (enrichedFields.city && (!lead.city || lead.city === "unknown")) {
            updateData.city = enrichedFields.city;
          }
          if (enrichedFields.state && (!lead.state || lead.state === "unknown")) {
            updateData.state = enrichedFields.state;
          }
          if (enrichedFields.description && !lead.description) {
            updateData.description = enrichedFields.description;
          }

          if (Object.keys(updateData).length === 0) {
            summaryParts.push(`No new data found for ${lead.firstName} ${lead.lastName}`);
            continue;
          }

          if (approvalRequired) {
            // Create pending approval activity
            await prisma.agentActivity.create({
              data: {
                agentType: "enricher",
                action: "enriched_lead",
                description: `Enriched ${lead.firstName} ${lead.lastName}: ${Object.keys(updateData).join(", ")}`,
                entityType: "Lead",
                entityId: lead.id,
                status: "pending_approval",
                metadata: JSON.stringify({
                  leadId: lead.id,
                  enrichedFields: updateData,
                  originalData: {
                    title: lead.title,
                    company: lead.company,
                    city: lead.city,
                    state: lead.state,
                    description: lead.description,
                  },
                }),
              },
            });
          } else {
            // Update the lead directly
            await prisma.lead.update({
              where: { id: lead.id },
              data: updateData,
            });

            await prisma.agentActivity.create({
              data: {
                agentType: "enricher",
                action: "enriched_lead",
                description: `Enriched ${lead.firstName} ${lead.lastName}: ${Object.keys(updateData).join(", ")}`,
                entityType: "Lead",
                entityId: lead.id,
                status: "completed",
                metadata: JSON.stringify({
                  leadId: lead.id,
                  enrichedFields: updateData,
                }),
              },
            });
          }

          enriched++;
          summaryParts.push(
            `${approvalRequired ? "Proposed enrichment" : "Enriched"} ${lead.firstName} ${lead.lastName} (${Object.keys(updateData).join(", ")})`
          );
        } catch (err) {
          errors++;
          console.error(`Enricher error for lead ${lead.id}:`, err);
          summaryParts.push(
            `Error enriching ${lead.firstName} ${lead.lastName}: ${err instanceof Error ? err.message : "Unknown error"}`
          );
        }
      }

      const summary = leads.length === 0
        ? "No leads found that need enrichment"
        : `Processed ${enriched} lead(s), ${errors} error(s). ${summaryParts.join("; ")}`;

      // Update run
      await prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: "completed",
          summary,
          results: JSON.stringify({ enriched, errors, total: leads.length }),
          completedAt: new Date(),
        },
      });

      // Update agent config lastRunAt
      await prisma.agentConfig.update({
        where: { agentType: "enricher" },
        data: { lastRunAt: new Date() },
      }).catch(() => {
        // Config may not exist yet
      });

      return NextResponse.json({
        runId: run.id,
        enriched,
        errors,
        total: leads.length,
        summary,
      });
    } catch (err) {
      await prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: "failed",
          error: err instanceof Error ? err.message : "Unknown error",
          completedAt: new Date(),
        },
      });
      throw err;
    }
  } catch (error) {
    console.error("Enricher agent run error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
