import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const sequence = await prisma.outreachSequence.findUnique({ where: { id } });
    if (!sequence) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
    }

    const body = await request.json();
    const { entityType, entityIds } = body;

    if (!entityType || !["Lead", "Contact"].includes(entityType)) {
      return NextResponse.json({ error: "entityType must be 'Lead' or 'Contact'" }, { status: 400 });
    }

    if (!entityIds || !Array.isArray(entityIds) || entityIds.length === 0) {
      return NextResponse.json({ error: "entityIds must be a non-empty array" }, { status: 400 });
    }

    // Parse steps to get the first step's delay
    const steps = JSON.parse(sequence.steps) as { delayDays: number }[];
    const firstStepDelay = steps.length > 0 ? (steps[0].delayDays || 0) : 0;

    const now = new Date();
    const nextStepAt = new Date(now.getTime() + firstStepDelay * 24 * 60 * 60 * 1000);

    const results: { entityId: string; status: string; error?: string }[] = [];

    for (const entityId of entityIds) {
      try {
        // Check if already enrolled
        const existing = await prisma.outreachEnrollment.findUnique({
          where: {
            sequenceId_entityType_entityId: {
              sequenceId: id,
              entityType,
              entityId,
            },
          },
        });

        if (existing) {
          results.push({ entityId, status: "already_enrolled" });
          continue;
        }

        // Verify entity exists
        if (entityType === "Lead") {
          const lead = await prisma.lead.findUnique({ where: { id: entityId } });
          if (!lead) {
            results.push({ entityId, status: "error", error: "Lead not found" });
            continue;
          }
        } else {
          const contact = await prisma.contact.findUnique({ where: { id: entityId } });
          if (!contact) {
            results.push({ entityId, status: "error", error: "Contact not found" });
            continue;
          }
        }

        await prisma.outreachEnrollment.create({
          data: {
            sequenceId: id,
            entityType,
            entityId,
            currentStep: 0,
            status: "active",
            nextStepAt,
          },
        });

        results.push({ entityId, status: "enrolled" });
      } catch (err) {
        results.push({
          entityId,
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      enrolled: results.filter((r) => r.status === "enrolled").length,
      alreadyEnrolled: results.filter((r) => r.status === "already_enrolled").length,
      errors: results.filter((r) => r.status === "error").length,
      details: results,
    });
  } catch (error) {
    console.error("Enrollment POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { entityType, entityId } = body;

    if (!entityType || !entityId) {
      return NextResponse.json({ error: "entityType and entityId are required" }, { status: 400 });
    }

    const enrollment = await prisma.outreachEnrollment.findUnique({
      where: {
        sequenceId_entityType_entityId: {
          sequenceId: id,
          entityType,
          entityId,
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
    }

    await prisma.outreachEnrollment.delete({
      where: { id: enrollment.id },
    });

    return NextResponse.json({ message: "Enrollment removed" });
  } catch (error) {
    console.error("Enrollment DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
