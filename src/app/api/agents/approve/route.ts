import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/google";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { activityId, status } = body;

    if (!activityId || typeof activityId !== "string") {
      return NextResponse.json({ error: "activityId is required" }, { status: 400 });
    }

    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "status must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    // Get the activity
    const activity = await prisma.agentActivity.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    if (activity.status !== "pending_approval") {
      return NextResponse.json(
        { error: "Activity is not pending approval" },
        { status: 400 }
      );
    }

    // Handle rejection
    if (status === "rejected") {
      await prisma.agentActivity.update({
        where: { id: activityId },
        data: { status: "rejected" },
      });

      return NextResponse.json({ message: "Action rejected" });
    }

    // Handle approval based on action type
    let metadata: Record<string, unknown> = {};
    if (activity.metadata) {
      try {
        metadata = JSON.parse(activity.metadata);
      } catch {
        return NextResponse.json(
          { error: "Invalid activity metadata" },
          { status: 400 }
        );
      }
    }

    let result: Record<string, unknown> = {};

    switch (activity.action) {
      case "found_lead": {
        // Create the lead record from metadata
        const newLead = await prisma.lead.create({
          data: {
            firstName: (metadata.firstName as string) || "Unknown",
            lastName: (metadata.lastName as string) || "Unknown",
            email: (metadata.email as string) || null,
            phone: (metadata.phone as string) || null,
            company: (metadata.company as string) || null,
            title: (metadata.title as string) || null,
            source: (metadata.source as string) || "AI Prospector",
            rating: (metadata.rating as string) || "Warm",
            description: (metadata.description as string) || null,
            ownerId: session.user.id,
            status: "New",
          },
        });

        // Update activity with the created entity ID
        await prisma.agentActivity.update({
          where: { id: activityId },
          data: {
            status: "approved",
            entityId: newLead.id,
          },
        });

        result = { leadId: newLead.id, message: "Lead created successfully" };
        break;
      }

      case "sent_email": {
        // Attempt to send the email via Google integration
        const to = metadata.to as string;
        const subject = metadata.subject as string;
        const emailBody = metadata.body as string;
        const htmlBody = metadata.htmlBody as string | undefined;

        if (!to || !subject || !emailBody) {
          await prisma.agentActivity.update({
            where: { id: activityId },
            data: { status: "rejected" },
          });
          return NextResponse.json(
            { error: "Incomplete email metadata (to, subject, body required)" },
            { status: 400 }
          );
        }

        try {
          const emailResult = await sendEmail(
            session.user.id,
            to,
            subject,
            emailBody,
            htmlBody
          );

          // Log activity on the related entity if present
          if (metadata.leadId || metadata.contactId || metadata.dealId) {
            await prisma.activity.create({
              data: {
                type: "email",
                subject,
                status: "Completed",
                leadId: (metadata.leadId as string) || null,
                contactId: (metadata.contactId as string) || null,
                dealId: (metadata.dealId as string) || null,
                ownerId: session.user.id,
              },
            });
          }

          await prisma.agentActivity.update({
            where: { id: activityId },
            data: { status: "approved" },
          });

          result = { message: "Email sent successfully", emailResult };
        } catch (err) {
          await prisma.agentActivity.update({
            where: { id: activityId },
            data: { status: "rejected" },
          });
          return NextResponse.json(
            {
              error: `Failed to send email: ${err instanceof Error ? err.message : "Google not connected"}`,
            },
            { status: 500 }
          );
        }
        break;
      }

      case "advanced_deal": {
        // Update the deal stage from metadata
        const dealId = metadata.dealId as string;
        const newStageId = metadata.newStageId as string;

        if (!dealId || !newStageId) {
          await prisma.agentActivity.update({
            where: { id: activityId },
            data: { status: "rejected" },
          });
          return NextResponse.json(
            { error: "Incomplete deal advancement metadata (dealId, newStageId required)" },
            { status: 400 }
          );
        }

        const deal = await prisma.deal.findUnique({ where: { id: dealId } });
        if (!deal) {
          await prisma.agentActivity.update({
            where: { id: activityId },
            data: { status: "rejected" },
          });
          return NextResponse.json({ error: "Deal not found" }, { status: 404 });
        }

        const newStage = await prisma.stage.findUnique({ where: { id: newStageId } });
        if (!newStage) {
          await prisma.agentActivity.update({
            where: { id: activityId },
            data: { status: "rejected" },
          });
          return NextResponse.json({ error: "Stage not found" }, { status: 404 });
        }

        await prisma.deal.update({
          where: { id: dealId },
          data: {
            stageId: newStageId,
            probability: newStage.probability,
          },
        });

        await prisma.agentActivity.update({
          where: { id: activityId },
          data: {
            status: "approved",
            entityId: dealId,
          },
        });

        result = { dealId, message: `Deal advanced to "${newStage.name}"` };
        break;
      }

      default: {
        // Generic approval - just update the status
        await prisma.agentActivity.update({
          where: { id: activityId },
          data: { status: "approved" },
        });
        result = { message: "Action approved" };
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Agent approve error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process approval" },
      { status: 500 }
    );
  }
}
