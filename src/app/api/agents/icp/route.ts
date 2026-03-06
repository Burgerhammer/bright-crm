import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profiles = await prisma.icpProfile.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(profiles);
  } catch (error) {
    console.error("ICP GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, industries, companySize, roles, regions, keywords, excludeKeywords } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const profile = await prisma.icpProfile.create({
      data: {
        name: name.trim(),
        industries: industries ? JSON.stringify(industries) : null,
        companySize: companySize || null,
        roles: roles ? JSON.stringify(roles) : null,
        regions: regions ? JSON.stringify(regions) : null,
        keywords: keywords ? JSON.stringify(keywords) : null,
        excludeKeywords: excludeKeywords ? JSON.stringify(excludeKeywords) : null,
        isActive: true,
      },
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    console.error("ICP POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
