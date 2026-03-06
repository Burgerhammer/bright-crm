import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit, diffChanges } from "@/lib/audit";
import { z } from "zod";

const updateLeadSchema = z.object({
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  email: z.string().email().optional().or(z.literal("")).or(z.null()),
  phone: z.string().optional().or(z.literal("")).or(z.null()),
  company: z.string().optional().or(z.literal("")).or(z.null()),
  title: z.string().optional().or(z.literal("")).or(z.null()),
  status: z.enum(["New", "Contacted", "Qualified", "Unqualified", "Converted"]).optional(),
  source: z.enum(["Web", "Phone", "Referral", "Partner", "Other"]).optional().or(z.literal("")).or(z.null()),
  rating: z.enum(["Hot", "Warm", "Cold"]).optional().or(z.literal("")).or(z.null()),
  address: z.string().optional().or(z.literal("")).or(z.null()),
  city: z.string().optional().or(z.literal("")).or(z.null()),
  state: z.string().optional().or(z.literal("")).or(z.null()),
  zip: z.string().optional().or(z.literal("")).or(z.null()),
  country: z.string().optional().or(z.literal("")).or(z.null()),
  description: z.string().optional().or(z.literal("")).or(z.null()),
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

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
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

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json(lead);
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

    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const body = await request.json();
    const data = updateLeadSchema.parse(body);

    // Clean up empty strings to null for optional fields
    const cleanData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (key === "firstName" || key === "lastName" || key === "status") {
        cleanData[key] = value;
      } else {
        cleanData[key] = value === "" ? null : value;
      }
    }

    const changes = diffChanges(
      existing as unknown as Record<string, unknown>,
      cleanData
    );

    const lead = await prisma.lead.update({
      where: { id },
      data: cleanData,
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    await logAudit({
      entityType: "Lead",
      entityId: id,
      action: "update",
      changes,
      userId: session.user.id,
    });

    return NextResponse.json(lead);
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

    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    await prisma.lead.delete({ where: { id } });

    await logAudit({
      entityType: "Lead",
      entityId: id,
      action: "delete",
      userId: session.user.id,
    });

    return NextResponse.json({ message: "Lead deleted" });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
