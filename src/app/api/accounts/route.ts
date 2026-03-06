import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const createAccountSchema = z.object({
  name: z.string().min(1, "Account name is required"),
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

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const where = type ? { type } : {};

    const accounts = await prisma.account.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(accounts);
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
    const data = createAccountSchema.parse(body);

    const cleanData = {
      name: data.name,
      industry: data.industry || null,
      type: data.type || null,
      website: data.website || null,
      phone: data.phone || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      zip: data.zip || null,
      country: data.country || null,
      description: data.description || null,
      employees:
        typeof data.employees === "number" ? data.employees : null,
      annualRevenue:
        typeof data.annualRevenue === "number" ? data.annualRevenue : null,
      ownerId: data.ownerId || session.user.id,
    };

    const account = await prisma.account.create({
      data: cleanData,
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    await logAudit({
      entityType: "Account",
      entityId: account.id,
      action: "create",
      userId: session.user.id,
    });

    return NextResponse.json(account, { status: 201 });
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
