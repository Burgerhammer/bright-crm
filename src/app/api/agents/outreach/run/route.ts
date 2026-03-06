import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClaudeClient, getCrmContext } from "@/lib/claude";

interface SequenceStep {
  stepNumber: number;
  delayDays: number;
  type: string;
  subject: string;
  body: string;
}

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
      where: { agentType: "outreach" },
    });
    const approvalRequired = config?.approvalRequired ?? true;

    // Create agent run
    const run = await prisma.agentRun.create({
      data: {
        agentType: "outreach",
        status: "running",
      },
    });

    const now = new Date();
    let processed = 0;
    let errors = 0;
    const summaryParts: string[] = [];

    try {
      // Find all active enrollments where nextStepAt <= now
      const enrollments = await prisma.outreachEnrollment.findMany({
        where: {
          status: "active",
          nextStepAt: { lte: now },
          sequence: { status: "active" },
        },
        include: {
          sequence: true,
        },
      });

      for (const enrollment of enrollments) {
        try {
          const steps: SequenceStep[] = JSON.parse(enrollment.sequence.steps);
          const currentStepIndex = enrollment.currentStep;

          if (currentStepIndex >= steps.length) {
            // No more steps — mark completed
            await prisma.outreachEnrollment.update({
              where: { id: enrollment.id },
              data: { status: "completed" },
            });
            continue;
          }

          const step = steps[currentStepIndex];

          // Fetch entity data
          let entityData: {
            firstName: string;
            lastName: string;
            title: string | null;
            company: string | null;
            email: string | null;
          } | null = null;

          if (enrollment.entityType === "Lead") {
            const lead = await prisma.lead.findUnique({
              where: { id: enrollment.entityId },
              select: { firstName: true, lastName: true, title: true, company: true, email: true },
            });
            entityData = lead;
          } else if (enrollment.entityType === "Contact") {
            const contact = await prisma.contact.findUnique({
              where: { id: enrollment.entityId },
              include: { account: { select: { name: true } } },
            });
            if (contact) {
              entityData = {
                firstName: contact.firstName,
                lastName: contact.lastName,
                title: contact.title,
                company: contact.account?.name || null,
                email: contact.email,
              };
            }
          }

          if (!entityData) {
            // Entity was deleted — remove enrollment
            await prisma.outreachEnrollment.update({
              where: { id: enrollment.id },
              data: { status: "completed" },
            });
            continue;
          }

          // Get CRM context for this entity
          const crmContext = await getCrmContext(
            enrollment.entityType.toLowerCase(),
            enrollment.entityId
          );

          // Use Claude to personalize the template
          const response = await client.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1024,
            messages: [
              {
                role: "user",
                content: `Personalize this email template for the recipient. Replace placeholders with actual data, and adjust the tone to feel natural and personal. Keep it concise.

Template Subject: ${step.subject}
Template Body: ${step.body}

Recipient: ${entityData.firstName} ${entityData.lastName}, ${entityData.title || "Professional"} at ${entityData.company || "their company"}
Context: ${crmContext}

Return the result as JSON: { "subject": "...", "body": "..." }`,
              },
            ],
          });

          const text = response.content[0].type === "text" ? response.content[0].text : "";

          // Parse the JSON response
          let personalizedSubject = step.subject;
          let personalizedBody = step.body;

          try {
            // Extract JSON from the response (handle markdown code blocks)
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              personalizedSubject = parsed.subject || step.subject;
              personalizedBody = parsed.body || step.body;
            }
          } catch {
            // If parsing fails, do simple placeholder replacement
            personalizedSubject = step.subject
              .replace(/\{\{firstName\}\}/g, entityData.firstName)
              .replace(/\{\{lastName\}\}/g, entityData.lastName)
              .replace(/\{\{company\}\}/g, entityData.company || "your company")
              .replace(/\{\{title\}\}/g, entityData.title || "");
            personalizedBody = step.body
              .replace(/\{\{firstName\}\}/g, entityData.firstName)
              .replace(/\{\{lastName\}\}/g, entityData.lastName)
              .replace(/\{\{company\}\}/g, entityData.company || "your company")
              .replace(/\{\{title\}\}/g, entityData.title || "");
          }

          const activityStatus = approvalRequired ? "pending_approval" : "completed";
          const activityAction = approvalRequired ? "draft_email" : "sent_email";

          // Create agent activity
          await prisma.agentActivity.create({
            data: {
              agentType: "outreach",
              action: activityAction,
              description: `Step ${currentStepIndex + 1}/${steps.length}: "${personalizedSubject}" to ${entityData.firstName} ${entityData.lastName}`,
              entityType: enrollment.entityType,
              entityId: enrollment.entityId,
              status: activityStatus,
              metadata: JSON.stringify({
                enrollmentId: enrollment.id,
                sequenceId: enrollment.sequenceId,
                sequenceName: enrollment.sequence.name,
                stepNumber: currentStepIndex + 1,
                subject: personalizedSubject,
                body: personalizedBody,
                to: entityData.email,
              }),
            },
          });

          // Update enrollment progress
          const nextStepIndex = currentStepIndex + 1;
          const isCompleted = nextStepIndex >= steps.length;

          const enrollmentUpdate: Record<string, unknown> = {
            currentStep: nextStepIndex,
            lastStepAt: now,
          };

          if (isCompleted) {
            enrollmentUpdate.status = "completed";
            enrollmentUpdate.nextStepAt = null;
          } else {
            const nextStep = steps[nextStepIndex];
            const nextDelay = nextStep.delayDays || 0;
            enrollmentUpdate.nextStepAt = new Date(now.getTime() + nextDelay * 24 * 60 * 60 * 1000);
          }

          await prisma.outreachEnrollment.update({
            where: { id: enrollment.id },
            data: enrollmentUpdate,
          });

          processed++;
          summaryParts.push(
            `${approvalRequired ? "Drafted" : "Sent"} email to ${entityData.firstName} ${entityData.lastName} (Step ${currentStepIndex + 1})`
          );
        } catch (err) {
          errors++;
          console.error(`Outreach error for enrollment ${enrollment.id}:`, err);
          summaryParts.push(
            `Error processing enrollment ${enrollment.id}: ${err instanceof Error ? err.message : "Unknown error"}`
          );
        }
      }

      const summary = enrollments.length === 0
        ? "No enrollments ready to process"
        : `Processed ${processed} email(s), ${errors} error(s). ${summaryParts.join("; ")}`;

      // Update run
      await prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: "completed",
          summary,
          results: JSON.stringify({ processed, errors, total: enrollments.length }),
          completedAt: new Date(),
        },
      });

      // Update agent config lastRunAt
      await prisma.agentConfig.update({
        where: { agentType: "outreach" },
        data: { lastRunAt: new Date() },
      }).catch(() => {
        // Config may not exist yet
      });

      return NextResponse.json({
        runId: run.id,
        processed,
        errors,
        total: enrollments.length,
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
    console.error("Outreach agent run error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
