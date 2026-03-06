import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      leadsFoundToday,
      leadsFoundTotal,
      emailsSentToday,
      emailsSentTotal,
      dealsAdvancedToday,
      dealsAdvancedTotal,
      pendingApprovals,
    ] = await Promise.all([
      prisma.agentActivity.count({
        where: { action: "found_lead", createdAt: { gte: startOfToday } },
      }),
      prisma.agentActivity.count({
        where: { action: "found_lead" },
      }),
      prisma.agentActivity.count({
        where: { action: "sent_email", createdAt: { gte: startOfToday } },
      }),
      prisma.agentActivity.count({
        where: { action: "sent_email" },
      }),
      prisma.agentActivity.count({
        where: { action: "advanced_deal", createdAt: { gte: startOfToday } },
      }),
      prisma.agentActivity.count({
        where: { action: "advanced_deal" },
      }),
      prisma.agentActivity.count({
        where: { status: "pending_approval" },
      }),
    ]);

    return NextResponse.json({
      leadsFound: { today: leadsFoundToday, total: leadsFoundTotal },
      emailsSent: { today: emailsSentToday, total: emailsSentTotal },
      dealsAdvanced: { today: dealsAdvancedToday, total: dealsAdvancedTotal },
      pendingApprovals,
    });
  } catch (error) {
    console.error("Agent stats GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
