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
    const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    // --- Pipeline overview ---
    const [allDeals, stages, wonDeals, lostDeals] = await Promise.all([
      prisma.deal.findMany({
        select: { amount: true, stageId: true },
      }),
      prisma.stage.findMany({
        orderBy: { order: "asc" },
        include: {
          _count: { select: { deals: true } },
          deals: { select: { amount: true } },
        },
      }),
      // Won this month: stages with probability >= 90
      prisma.deal.findMany({
        where: {
          createdAt: { gte: firstDayOfCurrentMonth },
          stage: { probability: { gte: 90 } },
        },
        select: { amount: true },
      }),
      // Lost this month: stages with probability === 0
      prisma.deal.count({
        where: {
          createdAt: { gte: firstDayOfCurrentMonth },
          stage: { probability: 0 },
        },
      }),
    ]);

    const totalDeals = allDeals.length;
    const totalValue = allDeals.reduce((sum, d) => sum + (d.amount || 0), 0);

    const dealsByStage = stages.map((stage) => ({
      name: stage.name,
      count: stage._count.deals,
      value: stage.deals.reduce((sum, d) => sum + (d.amount || 0), 0),
      color: stage.color,
    }));

    const wonThisMonth = wonDeals.length;
    const wonValueThisMonth = wonDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
    const lostThisMonth = lostDeals;

    // --- Lead metrics ---
    const [totalLeads, newLeadsThisMonth, leadsByStatus] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({
        where: { createdAt: { gte: firstDayOfCurrentMonth } },
      }),
      prisma.lead.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
    ]);

    const byStatus = leadsByStatus.map((row) => ({
      status: row.status,
      count: row._count.status,
    }));

    // --- Activity metrics ---
    const [totalActivitiesThisMonth, activitiesByType, recentActivities] =
      await Promise.all([
        prisma.activity.count({
          where: { createdAt: { gte: firstDayOfCurrentMonth } },
        }),
        prisma.activity.groupBy({
          by: ["type"],
          _count: { type: true },
          where: { createdAt: { gte: firstDayOfCurrentMonth } },
        }),
        prisma.activity.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            lead: { select: { id: true, firstName: true, lastName: true } },
            contact: { select: { id: true, firstName: true, lastName: true } },
            account: { select: { id: true, name: true } },
            deal: { select: { id: true, name: true } },
          },
        }),
      ]);

    const byType = activitiesByType.map((row) => ({
      type: row.type,
      count: row._count.type,
    }));

    // --- Tasks overview (wrapped in try/catch in case table doesn't exist) ---
    let tasks = {
      open: 0,
      dueToday: 0,
      overdue: 0,
      completedThisMonth: 0,
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = prisma as any;
      const [openTasks, dueTodayTasks, overdueTasks, completedThisMonthTasks] =
        await Promise.all([
          db.task.count({
            where: { status: { in: ["Open", "In Progress"] } },
          }),
          db.task.count({
            where: {
              status: { in: ["Open", "In Progress"] },
              dueDate: { gte: startOfToday, lt: endOfToday },
            },
          }),
          db.task.count({
            where: {
              status: { in: ["Open", "In Progress"] },
              dueDate: { lt: startOfToday },
            },
          }),
          db.task.count({
            where: {
              status: "Completed",
              completedAt: { gte: firstDayOfCurrentMonth },
            },
          }),
        ]);

      tasks = {
        open: openTasks,
        dueToday: dueTodayTasks,
        overdue: overdueTasks,
        completedThisMonth: completedThisMonthTasks,
      };
    } catch {
      // Task model may not exist yet - return zeros
    }

    // --- Contacts & Accounts ---
    const [totalContacts, newContactsThisMonth, totalAccounts, newAccountsThisMonth] =
      await Promise.all([
        prisma.contact.count(),
        prisma.contact.count({
          where: { createdAt: { gte: firstDayOfCurrentMonth } },
        }),
        prisma.account.count(),
        prisma.account.count({
          where: { createdAt: { gte: firstDayOfCurrentMonth } },
        }),
      ]);

    return NextResponse.json({
      pipeline: {
        totalDeals,
        totalValue,
        dealsByStage,
        wonThisMonth,
        wonValueThisMonth,
        lostThisMonth,
      },
      leads: {
        total: totalLeads,
        newThisMonth: newLeadsThisMonth,
        byStatus,
      },
      activities: {
        totalThisMonth: totalActivitiesThisMonth,
        byType,
        recent: recentActivities,
      },
      tasks,
      contacts: {
        total: totalContacts,
        newThisMonth: newContactsThisMonth,
      },
      accounts: {
        total: totalAccounts,
        newThisMonth: newAccountsThisMonth,
      },
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
