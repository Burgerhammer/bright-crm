import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().or(z.literal("")),
  status: z.enum(["Open", "In Progress", "Completed", "Cancelled"]).default("Open"),
  priority: z.enum(["High", "Medium", "Low"]).default("Medium"),
  dueDate: z.string().optional().or(z.literal("")),
  leadId: z.string().optional().or(z.literal("")),
  contactId: z.string().optional().or(z.literal("")),
  accountId: z.string().optional().or(z.literal("")),
  dealId: z.string().optional().or(z.literal("")),
  ownerId: z.string().optional().or(z.literal("")),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const due = searchParams.get("due");

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (due === "today") {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      where.dueDate = { gte: startOfDay, lt: endOfDay };
    } else if (due === "week") {
      const now = new Date();
      const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      where.dueDate = { gte: now, lt: endOfWeek };
    } else if (due === "overdue") {
      const now = new Date();
      where.dueDate = { lt: now };
      where.status = { notIn: ["Completed", "Cancelled"] };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true } },
        lead: { select: { id: true, firstName: true, lastName: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        account: { select: { id: true, name: true } },
        deal: { select: { id: true, name: true } },
      },
      orderBy: [
        { dueDate: { sort: "asc", nulls: "last" } },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(tasks);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = createTaskSchema.parse(body);

    const cleanData = {
      title: data.title,
      description: data.description || null,
      status: data.status,
      priority: data.priority,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      leadId: data.leadId || null,
      contactId: data.contactId || null,
      accountId: data.accountId || null,
      dealId: data.dealId || null,
      ownerId: data.ownerId || session.user.id,
    };

    const task = await prisma.task.create({
      data: cleanData,
      include: {
        owner: { select: { id: true, name: true } },
        lead: { select: { id: true, firstName: true, lastName: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        account: { select: { id: true, name: true } },
        deal: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(task, { status: 201 });
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
