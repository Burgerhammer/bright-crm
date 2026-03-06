import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClaudeClient } from "@/lib/claude";

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get Claude client
    const claude = await getClaudeClient(session.user.id);
    if (!claude) {
      return NextResponse.json(
        { error: "Anthropic API key not configured. Go to Settings > Integrations to add it." },
        { status: 400 }
      );
    }

    // Get agent config for prospector
    const agentConfig = await prisma.agentConfig.findUnique({
      where: { agentType: "prospector" },
    });

    const approvalRequired = agentConfig?.approvalRequired ?? true;

    // Get active ICP profiles
    const icpProfiles = await prisma.icpProfile.findMany({
      where: { isActive: true },
    });

    if (icpProfiles.length === 0) {
      return NextResponse.json(
        { error: "No active ICP profiles found. Create one at Autopilot > ICP Profiles." },
        { status: 400 }
      );
    }

    // Create agent run record
    const agentRun = await prisma.agentRun.create({
      data: {
        agentType: "prospector",
        status: "running",
      },
    });

    let totalLeadsFound = 0;
    let totalLeadsCreated = 0;
    let totalPendingApproval = 0;
    let totalDuplicates = 0;
    const errors: string[] = [];

    for (const profile of icpProfiles) {
      const industries = parseJsonArray(profile.industries);
      const roles = parseJsonArray(profile.roles);
      const regions = parseJsonArray(profile.regions);
      const keywords = parseJsonArray(profile.keywords);

      const prompt = `You are a sales prospecting AI. Based on the following Ideal Customer Profile, generate 5 potential leads that would be good prospects.

ICP Criteria:
- Industries: ${industries.length > 0 ? industries.join(", ") : "Any"}
- Company Size: ${profile.companySize || "Any"}
- Target Roles: ${roles.length > 0 ? roles.join(", ") : "Any"}
- Regions: ${regions.length > 0 ? regions.join(", ") : "Any"}
- Keywords: ${keywords.length > 0 ? keywords.join(", ") : "None specified"}

For each lead, provide realistic and plausible information in this exact JSON format:
[
  {
    "firstName": "...",
    "lastName": "...",
    "email": "realistic-email@company.com",
    "phone": "555-XXX-XXXX",
    "company": "Company Name",
    "title": "Job Title",
    "source": "AI Prospector",
    "rating": "Warm",
    "description": "Brief reason why this is a good prospect"
  }
]

Return ONLY the JSON array, no other text.`;

      try {
        const response = await claude.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2048,
          messages: [{ role: "user", content: prompt }],
        });

        // Extract text content from the response
        const textBlock = response.content.find((block) => block.type === "text");
        if (!textBlock || textBlock.type !== "text") {
          errors.push(`No text response for profile "${profile.name}"`);
          continue;
        }

        // Parse JSON from the response
        let leads: Array<{
          firstName: string;
          lastName: string;
          email: string;
          phone?: string;
          company?: string;
          title?: string;
          source?: string;
          rating?: string;
          description?: string;
        }>;

        try {
          // Try to extract JSON from the response - handle cases where Claude wraps in markdown
          let jsonText = textBlock.text.trim();
          const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            jsonText = jsonMatch[0];
          }
          leads = JSON.parse(jsonText);
        } catch {
          errors.push(`Failed to parse response for profile "${profile.name}"`);
          continue;
        }

        if (!Array.isArray(leads)) {
          errors.push(`Invalid response format for profile "${profile.name}"`);
          continue;
        }

        for (const lead of leads) {
          totalLeadsFound++;

          // Check for duplicates by email
          if (lead.email) {
            const existingLead = await prisma.lead.findFirst({
              where: { email: lead.email },
            });

            if (existingLead) {
              totalDuplicates++;

              await prisma.agentActivity.create({
                data: {
                  agentType: "prospector",
                  action: "found_lead",
                  description: `Duplicate skipped: ${lead.firstName} ${lead.lastName} (${lead.email}) already exists`,
                  entityType: "Lead",
                  entityId: existingLead.id,
                  status: "completed",
                  metadata: JSON.stringify({ ...lead, duplicate: true }),
                },
              });

              continue;
            }
          }

          if (approvalRequired) {
            // Create pending approval activity
            totalPendingApproval++;

            await prisma.agentActivity.create({
              data: {
                agentType: "prospector",
                action: "found_lead",
                description: `Found prospect: ${lead.firstName} ${lead.lastName} at ${lead.company || "Unknown"} (${lead.title || "Unknown title"})`,
                entityType: "Lead",
                status: "pending_approval",
                metadata: JSON.stringify(lead),
              },
            });
          } else {
            // Directly create the lead
            const newLead = await prisma.lead.create({
              data: {
                firstName: lead.firstName,
                lastName: lead.lastName,
                email: lead.email || null,
                phone: lead.phone || null,
                company: lead.company || null,
                title: lead.title || null,
                source: lead.source || "AI Prospector",
                rating: lead.rating || "Warm",
                description: lead.description || null,
                ownerId: session.user.id,
                status: "New",
              },
            });

            totalLeadsCreated++;

            await prisma.agentActivity.create({
              data: {
                agentType: "prospector",
                action: "found_lead",
                description: `Created lead: ${lead.firstName} ${lead.lastName} at ${lead.company || "Unknown"}`,
                entityType: "Lead",
                entityId: newLead.id,
                status: "completed",
                metadata: JSON.stringify(lead),
              },
            });
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        errors.push(`Error processing profile "${profile.name}": ${message}`);
      }
    }

    // Build summary
    const summaryParts: string[] = [];
    summaryParts.push(`Processed ${icpProfiles.length} ICP profile(s)`);
    summaryParts.push(`Found ${totalLeadsFound} potential lead(s)`);
    if (totalLeadsCreated > 0) summaryParts.push(`Created ${totalLeadsCreated} lead(s)`);
    if (totalPendingApproval > 0) summaryParts.push(`${totalPendingApproval} pending approval`);
    if (totalDuplicates > 0) summaryParts.push(`${totalDuplicates} duplicate(s) skipped`);
    if (errors.length > 0) summaryParts.push(`${errors.length} error(s)`);

    const summary = summaryParts.join(". ");

    // Update agent run
    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: errors.length > 0 && totalLeadsFound === 0 ? "failed" : "completed",
        summary,
        results: JSON.stringify({
          totalLeadsFound,
          totalLeadsCreated,
          totalPendingApproval,
          totalDuplicates,
          errors,
        }),
        completedAt: new Date(),
      },
    });

    // Update agent config lastRunAt
    if (agentConfig) {
      await prisma.agentConfig.update({
        where: { agentType: "prospector" },
        data: { lastRunAt: new Date() },
      });
    }

    return NextResponse.json({
      runId: agentRun.id,
      summary,
      totalLeadsFound,
      totalLeadsCreated,
      totalPendingApproval,
      totalDuplicates,
      errors,
    });
  } catch (error) {
    console.error("Prospector run error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Prospector agent failed" },
      { status: 500 }
    );
  }
}
