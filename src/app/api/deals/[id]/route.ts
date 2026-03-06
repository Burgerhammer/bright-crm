import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit, diffChanges } from "@/lib/audit";
import { z } from "zod";

const updateDealSchema = z.object({
  name: z.string().min(1, "Deal name is required").optional(),
  amount: z.coerce.number().positive().optional().or(z.literal("")).or(z.null()),
  closeDate: z.string().optional().or(z.literal("")).or(z.null()),
  probability: z.coerce.number().int().min(0).max(100).optional().or(z.literal("")).or(z.null()),
  type: z.enum(["New Business", "Existing Business"]).optional().or(z.literal("")).or(z.null()),
  source: z.string().optional().or(z.literal("")).or(z.null()),
  description: z.string().optional().or(z.literal("")).or(z.null()),
  stageId: z.string().optional(),
  pipelineId: z.string().optional(),
  accountId: z.string().optional().or(z.literal("")).or(z.null()),
  contactId: z.string().optional().or(z.literal("")).or(z.null()),
  ownerId: z.string().optional().or(z.literal("")).or(z.null()),
});

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

    const deal = await prisma.deal.findUnique({
      where: { id },
      include: {
        stage: true,
        pipeline: { include: { stages: { orderBy: { order: "asc" } } } },
        account: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        owner: { select: { id: true, name: true, email: true } },
        activities: {
          include: { owner: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        notes: {
          include: { owner: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    return NextResponse.json(deal);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.deal.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const body = await request.json();
    const data = updateDealSchema.parse(body);

    // If stageId changed, auto-update probability from stage
    let probability = typeof data.probability === "number" ? data.probability : undefined;
    if (data.stageId && data.stageId !== existing.stageId) {
      const newStage = await prisma.stage.findUnique({ where: { id: data.stageId } });
      if (newStage) {
        probability = newStage.probability;
      }
    }

    const cleanData: Record<string, unknown> = {};

    if (data.name !== undefined) cleanData.name = data.name;
    if (data.amount !== undefined) cleanData.amount = typeof data.amount === "number" ? data.amount : null;
    if (data.closeDate !== undefined) cleanData.closeDate = data.closeDate ? new Date(data.closeDate) : null;
    if (probability !== undefined) cleanData.probability = probability;
    else if (data.probability !== undefined) cleanData.probability = typeof data.probability === "number" ? data.probability : null;
    if (data.type !== undefined) cleanData.type = data.type || null;
    if (data.source !== undefined) cleanData.source = data.source || null;
    if (data.description !== undefined) cleanData.description = data.description || null;
    if (data.stageId !== undefined) cleanData.stageId = data.stageId;
    if (data.pipelineId !== undefined) cleanData.pipelineId = data.pipelineId;
    if (data.accountId !== undefined) cleanData.accountId = data.accountId || null;
    if (data.contactId !== undefined) cleanData.contactId = data.contactId || null;
    if (data.ownerId !== undefined) cleanData.ownerId = data.ownerId || null;

    const changes = diffChanges(
      existing as unknown as Record<string, unknown>,
      cleanData
    );

    const deal = await prisma.deal.update({
      where: { id },
      data: cleanData,
      include: {
        stage: true,
        pipeline: { include: { stages: { orderBy: { order: "asc" } } } },
        account: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    await logAudit({
      entityType: "Deal",
      entityId: id,
      action: "update",
      changes,
      userId: session.user.id,
    });

    return NextResponse.json(deal);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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

    const existing = await prisma.deal.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    await prisma.deal.delete({ where: { id } });

    await logAudit({
      entityType: "Deal",
      entityId: id,
      action: "delete",
      userId: session.user.id,
    });

    return NextResponse.json({ message: "Deal deleted" });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
