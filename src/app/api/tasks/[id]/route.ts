import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const updateTaskSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional().or(z.literal("")).or(z.null()),
  status: z.enum(["Open", "In Progress", "Completed", "Cancelled"]).optional(),
  priority: z.enum(["High", "Medium", "Low"]).optional(),
  dueDate: z.string().optional().or(z.literal("")).or(z.null()),
  leadId: z.string().optional().or(z.literal("")).or(z.null()),
  contactId: z.string().optional().or(z.literal("")).or(z.null()),
  accountId: z.string().optional().or(z.literal("")).or(z.null()),
  dealId: z.string().optional().or(z.literal("")).or(z.null()),
  ownerId: z.string().optional().or(z.literal("")).or(z.null()),
});

const taskInclude = {
  owner: { select: { id: true, name: true } },
  lead: { select: { id: true, firstName: true, lastName: true } },
  contact: { select: { id: true, firstName: true, lastName: true } },
  account: { select: { id: true, name: true } },
  deal: { select: { id: true, name: true } },
};

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

    const task = await prisma.task.findUnique({
      where: { id },
      include: taskInclude,
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task);
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

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const body = await request.json();
    const data = updateTaskSchema.parse(body);

    // Build clean data, converting empty strings to null
    const cleanData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (key === "title" || key === "status" || key === "priority") {
        if (value !== undefined) {
          cleanData[key] = value;
        }
      } else if (key === "dueDate") {
        if (value === "" || value === null) {
          cleanData[key] = null;
        } else if (value) {
          cleanData[key] = new Date(value as string);
        }
      } else {
        cleanData[key] = value === "" ? null : value;
      }
    }

    // Handle completedAt based on status changes
    if (data.status === "Completed" && existing.status !== "Completed") {
      cleanData.completedAt = new Date();
    } else if (data.status && data.status !== "Completed" && existing.status === "Completed") {
      cleanData.completedAt = null;
    }

    const task = await prisma.task.update({
      where: { id },
      data: cleanData,
      include: taskInclude,
    });

    return NextResponse.json(task);
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

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await prisma.task.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
