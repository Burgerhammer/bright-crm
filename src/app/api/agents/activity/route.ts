import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const status = searchParams.get("status");
    const agentType = searchParams.get("agentType");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (agentType) where.agentType = agentType;

    const [activities, total] = await Promise.all([
      prisma.agentActivity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.agentActivity.count({ where }),
    ]);

    return NextResponse.json({
      activities,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Agent activity GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ids, status } = body;

    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "status must be 'approved' or 'rejected'" }, { status: 400 });
    }

    // Support bulk updates via ids array, or single via id
    const targetIds: string[] = ids || (id ? [id] : []);
    if (targetIds.length === 0) {
      return NextResponse.json({ error: "id or ids is required" }, { status: 400 });
    }

    const updated = await prisma.agentActivity.updateMany({
      where: { id: { in: targetIds }, status: "pending_approval" },
      data: { status },
    });

    return NextResponse.json({ updated: updated.count });
  } catch (error) {
    console.error("Agent activity PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
