import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type: agentType } = await params;

    const validTypes = ["prospector", "enricher", "outreach", "follow_up", "pipeline_mover"];
    if (!validTypes.includes(agentType)) {
      return NextResponse.json({ error: "Invalid agent type" }, { status: 400 });
    }

    // Check agent config exists
    const config = await prisma.agentConfig.findUnique({
      where: { agentType },
    });

    if (!config) {
      return NextResponse.json({ error: "Agent config not found" }, { status: 404 });
    }

    // Create an agent run record
    const run = await prisma.agentRun.create({
      data: {
        agentType,
        status: "running",
      },
    });

    // Update last run time
    await prisma.agentConfig.update({
      where: { agentType },
      data: { lastRunAt: new Date() },
    });

    // In a real system, this would trigger the actual agent execution.
    // For now, we mark it as completed after recording the run.
    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        summary: `Manual run triggered for ${agentType} agent`,
      },
    });

    return NextResponse.json({
      runId: run.id,
      agentType,
      status: "completed",
      message: `${agentType} agent run initiated`,
    });
  } catch (error) {
    console.error("Agent run error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
