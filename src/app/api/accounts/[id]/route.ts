import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit, diffChanges } from "@/lib/audit";
import { z } from "zod";

const updateAccountSchema = z.object({
  name: z.string().min(1, "Account name is required").optional(),
  industry: z.string().optional().or(z.literal("")),
  type: z
    .enum(["Prospect", "Customer", "Partner", "Vendor", "Other"])
    .optional()
    .or(z.literal("")),
  website: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  zip: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  employees: z.coerce.number().int().positive().optional().or(z.literal("")),
  annualRevenue: z.coerce.number().positive().optional().or(z.literal("")),
  ownerId: z.string().optional().or(z.literal("")),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const account = await prisma.account.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        contacts: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            title: true,
          },
          orderBy: { lastName: "asc" },
        },
        deals: {
          select: {
            id: true,
            name: true,
            amount: true,
            closeDate: true,
            stage: { select: { name: true, color: true } },
            owner: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json(account);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const data = updateAccountSchema.parse(body);

    const existing = await prisma.account.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const cleanData: Record<string, unknown> = {};
    if (data.name !== undefined) cleanData.name = data.name;
    if (data.industry !== undefined)
      cleanData.industry = data.industry || null;
    if (data.type !== undefined) cleanData.type = data.type || null;
    if (data.website !== undefined) cleanData.website = data.website || null;
    if (data.phone !== undefined) cleanData.phone = data.phone || null;
    if (data.address !== undefined) cleanData.address = data.address || null;
    if (data.city !== undefined) cleanData.city = data.city || null;
    if (data.state !== undefined) cleanData.state = data.state || null;
    if (data.zip !== undefined) cleanData.zip = data.zip || null;
    if (data.country !== undefined) cleanData.country = data.country || null;
    if (data.description !== undefined)
      cleanData.description = data.description || null;
    if (data.employees !== undefined)
      cleanData.employees =
        typeof data.employees === "number" ? data.employees : null;
    if (data.annualRevenue !== undefined)
      cleanData.annualRevenue =
        typeof data.annualRevenue === "number" ? data.annualRevenue : null;
    if (data.ownerId !== undefined)
      cleanData.ownerId = data.ownerId || null;

    const changes = diffChanges(
      existing as unknown as Record<string, unknown>,
      cleanData
    );

    const account = await prisma.account.update({
      where: { id },
      data: cleanData,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        contacts: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            title: true,
          },
          orderBy: { lastName: "asc" },
        },
        deals: {
          select: {
            id: true,
            name: true,
            amount: true,
            closeDate: true,
            stage: { select: { name: true, color: true } },
            owner: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    await logAudit({
      entityType: "Account",
      entityId: id,
      action: "update",
      changes,
      userId: session.user.id,
    });

    return NextResponse.json(account);
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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.account.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    await prisma.account.delete({ where: { id } });

    await logAudit({
      entityType: "Account",
      entityId: id,
      action: "delete",
      userId: session.user.id,
    });

    return NextResponse.json({ message: "Account deleted" });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
