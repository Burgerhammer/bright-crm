import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULT_CONFIGS = [
  { agentType: "prospector", enabled: false, approvalRequired: true, schedule: "daily" },
  { agentType: "enricher", enabled: false, approvalRequired: false, schedule: "every_6_hours" },
  { agentType: "outreach", enabled: false, approvalRequired: true, schedule: "every_hour" },
  { agentType: "follow_up", enabled: false, approvalRequired: false, schedule: "every_hour" },
  { agentType: "pipeline_mover", enabled: false, approvalRequired: true, schedule: "daily" },
];

async function ensureDefaults() {
  const existing = await prisma.agentConfig.findMany();
  if (existing.length === 0) {
    await prisma.agentConfig.createMany({ data: DEFAULT_CONFIGS });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureDefaults();

    const configs = await prisma.agentConfig.findMany({
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(configs);
  } catch (error) {
    console.error("Agent config GET error:", error);
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
    const { agentType, enabled, approvalRequired, config, schedule } = body;

    if (!agentType) {
      return NextResponse.json({ error: "agentType is required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (typeof enabled === "boolean") updateData.enabled = enabled;
    if (typeof approvalRequired === "boolean") updateData.approvalRequired = approvalRequired;
    if (config !== undefined) updateData.config = typeof config === "string" ? config : JSON.stringify(config);
    if (schedule !== undefined) updateData.schedule = schedule;

    const updated = await prisma.agentConfig.update({
      where: { agentType },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Agent config PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
