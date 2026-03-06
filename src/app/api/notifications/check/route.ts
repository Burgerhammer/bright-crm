import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    // Find tasks that are overdue (dueDate < start of today, status not Completed/Cancelled)
    const overdueTasks = await prisma.task.findMany({
      where: {
        dueDate: { lt: startOfDay },
        status: { in: ["Open", "In Progress"] },
        ownerId: session.user.id,
      },
    });

    // Find tasks due today (dueDate is today, status not Completed/Cancelled)
    const dueTodayTasks = await prisma.task.findMany({
      where: {
        dueDate: { gte: startOfDay, lt: endOfDay },
        status: { in: ["Open", "In Progress"] },
        ownerId: session.user.id,
      },
    });

    let created = 0;

    // Create overdue notifications
    for (const task of overdueTasks) {
      const link = `/tasks/${task.id}`;
      const existing = await prisma.notification.findFirst({
        where: {
          userId: session.user.id,
          type: "task_overdue",
          link,
          read: false,
        },
      });

      if (!existing) {
        await prisma.notification.create({
          data: {
            message: `Task '${task.title}' is overdue`,
            type: "task_overdue",
            link,
            userId: session.user.id,
          },
        });
        created++;
      }
    }

    // Create due today notifications
    for (const task of dueTodayTasks) {
      const link = `/tasks/${task.id}`;
      const existing = await prisma.notification.findFirst({
        where: {
          userId: session.user.id,
          type: "task_due",
          link,
          read: false,
        },
      });

      if (!existing) {
        await prisma.notification.create({
          data: {
            message: `Task '${task.title}' is due today`,
            type: "task_due",
            link,
            userId: session.user.id,
          },
        });
        created++;
      }
    }

    return NextResponse.json({ created });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
