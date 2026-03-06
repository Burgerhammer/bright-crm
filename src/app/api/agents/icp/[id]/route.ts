import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const existing = await prisma.icpProfile.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "ICP profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, industries, companySize, roles, regions, keywords, excludeKeywords, isActive } = body;

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name.trim();
    if (industries !== undefined) updateData.industries = industries ? JSON.stringify(industries) : null;
    if (companySize !== undefined) updateData.companySize = companySize || null;
    if (roles !== undefined) updateData.roles = roles ? JSON.stringify(roles) : null;
    if (regions !== undefined) updateData.regions = regions ? JSON.stringify(regions) : null;
    if (keywords !== undefined) updateData.keywords = keywords ? JSON.stringify(keywords) : null;
    if (excludeKeywords !== undefined) updateData.excludeKeywords = excludeKeywords ? JSON.stringify(excludeKeywords) : null;
    if (typeof isActive === "boolean") updateData.isActive = isActive;

    const profile = await prisma.icpProfile.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("ICP PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

    const existing = await prisma.icpProfile.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "ICP profile not found" }, { status: 404 });
    }

    await prisma.icpProfile.delete({ where: { id } });

    return NextResponse.json({ message: "ICP profile deleted" });
  } catch (error) {
    console.error("ICP DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
