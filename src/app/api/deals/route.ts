import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const createDealSchema = z.object({
  name: z.string().min(1, "Deal name is required"),
  amount: z.coerce.number().positive().optional().or(z.literal("")).or(z.null()),
  closeDate: z.string().optional().or(z.literal("")),
  probability: z.coerce.number().int().min(0).max(100).optional().or(z.literal("")).or(z.null()),
  type: z.enum(["New Business", "Existing Business"]).optional().or(z.literal("")),
  source: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  stageId: z.string().min(1, "Stage is required"),
  pipelineId: z.string().min(1, "Pipeline is required"),
  accountId: z.string().optional().or(z.literal("")),
  contactId: z.string().optional().or(z.literal("")),
  ownerId: z.string().optional().or(z.literal("")),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pipelineId = searchParams.get("pipelineId");
    const stageId = searchParams.get("stageId");

    const where: Record<string, unknown> = {};
    if (pipelineId) where.pipelineId = pipelineId;
    if (stageId) where.stageId = stageId;

    const deals = await prisma.deal.findMany({
      where,
      include: {
        stage: true,
        pipeline: true,
        account: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(deals);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = createDealSchema.parse(body);

    // If probability not provided, get it from the stage
    let probability = typeof data.probability === "number" ? data.probability : null;
    if (probability === null) {
      const stage = await prisma.stage.findUnique({ where: { id: data.stageId } });
      if (stage) {
        probability = stage.probability;
      }
    }

    const cleanData = {
      name: data.name,
      amount: typeof data.amount === "number" ? data.amount : null,
      closeDate: data.closeDate ? new Date(data.closeDate) : null,
      probability,
      type: data.type || null,
      source: data.source || null,
      description: data.description || null,
      stageId: data.stageId,
      pipelineId: data.pipelineId,
      accountId: data.accountId || null,
      contactId: data.contactId || null,
      ownerId: data.ownerId || session.user.id,
    };

    const deal = await prisma.deal.create({
      data: cleanData,
      include: {
        stage: true,
        pipeline: true,
        account: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    await logAudit({
      entityType: "Deal",
      entityId: deal.id,
      action: "create",
      userId: session.user.id,
    });

    return NextResponse.json(deal, { status: 201 });
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
