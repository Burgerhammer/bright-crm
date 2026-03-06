import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const sequence = await prisma.outreachSequence.findUnique({
      where: { id },
      include: {
        enrollments: true,
      },
    });

    if (!sequence) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
    }

    // Fetch entity details for each enrollment
    const enrichedEnrollments = await Promise.all(
      sequence.enrollments.map(async (enrollment) => {
        let entity: { firstName: string; lastName: string; email: string | null; company: string | null } | null = null;
        if (enrollment.entityType === "Lead") {
          const lead = await prisma.lead.findUnique({
            where: { id: enrollment.entityId },
            select: { firstName: true, lastName: true, email: true, company: true },
          });
          entity = lead;
        } else if (enrollment.entityType === "Contact") {
          const contact = await prisma.contact.findUnique({
            where: { id: enrollment.entityId },
            select: { firstName: true, lastName: true, email: true, department: true },
          });
          if (contact) {
            entity = {
              firstName: contact.firstName,
              lastName: contact.lastName,
              email: contact.email,
              company: contact.department,
            };
          }
        }
        return {
          ...enrollment,
          entity,
        };
      })
    );

    return NextResponse.json({
      ...sequence,
      steps: JSON.parse(sequence.steps),
      enrollments: enrichedEnrollments,
    });
  } catch (error) {
    console.error("Sequence GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.outreachSequence.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, steps, status } = body;

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (status !== undefined) {
      if (!["draft", "active", "paused", "archived"].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updateData.status = status;
    }

    if (steps !== undefined) {
      if (!Array.isArray(steps) || steps.length === 0) {
        return NextResponse.json({ error: "At least one step is required" }, { status: 400 });
      }
      // Normalize step numbers
      const normalizedSteps = steps.map((step: Record<string, unknown>, index: number) => ({
        stepNumber: index + 1,
        delayDays: step.delayDays ?? 0,
        type: step.type || "email",
        subject: step.subject || "",
        body: step.body || "",
      }));
      updateData.steps = JSON.stringify(normalizedSteps);
    }

    const sequence = await prisma.outreachSequence.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      ...sequence,
      steps: JSON.parse(sequence.steps),
    });
  } catch (error) {
    console.error("Sequence PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.outreachSequence.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
    }

    // Cascade delete is handled by Prisma schema (onDelete: Cascade on enrollments)
    await prisma.outreachSequence.delete({ where: { id } });

    return NextResponse.json({ message: "Sequence deleted" });
  } catch (error) {
    console.error("Sequence DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
