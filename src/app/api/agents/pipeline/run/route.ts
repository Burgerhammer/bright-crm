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
      where: { agentType: "pipeline_mover" },
    });
    const approvalRequired = config?.approvalRequired ?? true;

    // Create agent run
    const run = await prisma.agentRun.create({
      data: {
        agentType: "pipeline_mover",
        status: "running",
      },
    });

    let advanced = 0;
    let atRisk = 0;
    let kept = 0;
    let errors = 0;
    const summaryParts: string[] = [];

    try {
      // Fetch all open deals with their context
      const deals = await prisma.deal.findMany({
        include: {
          stage: true,
          pipeline: {
            include: {
              stages: { orderBy: { order: "asc" } },
            },
          },
          account: { select: { name: true } },
          contact: { select: { firstName: true, lastName: true } },
          activities: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
          notes: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      });

      for (const deal of deals) {
        try {
          const totalStages = deal.pipeline.stages.length;
          const currentStageOrder = deal.stage.order;

          // Calculate days in current stage
          const daysSinceUpdate = Math.floor(
            (Date.now() - new Date(deal.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
          );

          // Build activities summary
          const activitiesSummary = deal.activities.length > 0
            ? deal.activities.map((a) => `[${a.type}] ${a.subject} (${a.status}) - ${new Date(a.createdAt).toLocaleDateString()}`).join("; ")
            : "No recent activities";

          // Build notes summary
          const notesSummary = deal.notes.length > 0
            ? deal.notes.map((n) => n.body.slice(0, 100)).join("; ")
            : "No recent notes";

          // Find next stage
          const nextStage = deal.pipeline.stages.find((s) => s.order === currentStageOrder + 1);

          const response = await client.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1024,
            messages: [
              {
                role: "user",
                content: `Analyze this deal and determine if it should be advanced to the next stage, kept in the current stage, or flagged as at-risk.

Deal: ${deal.name} - $${deal.amount?.toLocaleString() || "0"}
Current Stage: ${deal.stage.name} (Stage ${currentStageOrder} of ${totalStages})
Days in stage: ${daysSinceUpdate}
Recent activities: ${activitiesSummary}
Recent notes: ${notesSummary}
Close date: ${deal.closeDate ? new Date(deal.closeDate).toLocaleDateString() : "Not set"}
Account: ${deal.account?.name || "N/A"}
Contact: ${deal.contact ? `${deal.contact.firstName} ${deal.contact.lastName}` : "N/A"}

Available next stage: ${nextStage ? `${nextStage.name} (id: ${nextStage.id})` : "None - already at final stage"}

Return JSON: { "recommendation": "advance" | "keep" | "at_risk", "reason": "...", "nextStageId": "..." (only if advance, use the id provided above) }`,
              },
            ],
          });

          const text = response.content[0].type === "text" ? response.content[0].text : "";

          let recommendation: { recommendation: string; reason: string; nextStageId?: string } = {
            recommendation: "keep",
            reason: "Unable to parse recommendation",
          };

          try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              recommendation = JSON.parse(jsonMatch[0]);
            }
          } catch {
            errors++;
            summaryParts.push(`Failed to parse recommendation for ${deal.name}`);
            continue;
          }

          if (recommendation.recommendation === "advance" && nextStage) {
            if (approvalRequired) {
              await prisma.agentActivity.create({
                data: {
                  agentType: "pipeline_mover",
                  action: "advanced_deal",
                  description: `Recommends advancing "${deal.name}" from ${deal.stage.name} to ${nextStage.name}. Reason: ${recommendation.reason}`,
                  entityType: "Deal",
                  entityId: deal.id,
                  status: "pending_approval",
                  metadata: JSON.stringify({
                    dealId: deal.id,
                    dealName: deal.name,
                    currentStageId: deal.stageId,
                    currentStageName: deal.stage.name,
                    nextStageId: nextStage.id,
                    nextStageName: nextStage.name,
                    reason: recommendation.reason,
                  }),
                },
              });
            } else {
              // Update the deal stage directly
              await prisma.deal.update({
                where: { id: deal.id },
                data: {
                  stageId: nextStage.id,
                  probability: nextStage.probability,
                },
              });

              await prisma.agentActivity.create({
                data: {
                  agentType: "pipeline_mover",
                  action: "advanced_deal",
                  description: `Advanced "${deal.name}" from ${deal.stage.name} to ${nextStage.name}. Reason: ${recommendation.reason}`,
                  entityType: "Deal",
                  entityId: deal.id,
                  status: "completed",
                  metadata: JSON.stringify({
                    dealId: deal.id,
                    dealName: deal.name,
                    previousStageId: deal.stageId,
                    previousStageName: deal.stage.name,
                    newStageId: nextStage.id,
                    newStageName: nextStage.name,
                    reason: recommendation.reason,
                  }),
                },
              });
            }

            advanced++;
            summaryParts.push(
              `${approvalRequired ? "Recommended advancing" : "Advanced"} "${deal.name}" to ${nextStage.name}`
            );
          } else if (recommendation.recommendation === "at_risk") {
            await prisma.agentActivity.create({
              data: {
                agentType: "pipeline_mover",
                action: "flagged_at_risk",
                description: `Flagged "${deal.name}" as at-risk in ${deal.stage.name}. Reason: ${recommendation.reason}`,
                entityType: "Deal",
                entityId: deal.id,
                status: "completed",
                metadata: JSON.stringify({
                  dealId: deal.id,
                  dealName: deal.name,
                  stageName: deal.stage.name,
                  reason: recommendation.reason,
                }),
              },
            });

            atRisk++;
            summaryParts.push(`Flagged "${deal.name}" as at-risk: ${recommendation.reason}`);
          } else {
            kept++;
          }
        } catch (err) {
          errors++;
          console.error(`Pipeline mover error for deal ${deal.id}:`, err);
          summaryParts.push(
            `Error analyzing ${deal.name}: ${err instanceof Error ? err.message : "Unknown error"}`
          );
        }
      }

      const summary = deals.length === 0
        ? "No open deals to analyze"
        : `Analyzed ${deals.length} deal(s): ${advanced} to advance, ${atRisk} at-risk, ${kept} kept, ${errors} error(s). ${summaryParts.join("; ")}`;

      // Update run
      await prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: "completed",
          summary,
          results: JSON.stringify({ advanced, atRisk, kept, errors, total: deals.length }),
          completedAt: new Date(),
        },
      });

      // Update agent config lastRunAt
      await prisma.agentConfig.update({
        where: { agentType: "pipeline_mover" },
        data: { lastRunAt: new Date() },
      }).catch(() => {
        // Config may not exist yet
      });

      return NextResponse.json({
        runId: run.id,
        advanced,
        atRisk,
        kept,
        errors,
        total: deals.length,
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
    console.error("Pipeline mover agent run error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
