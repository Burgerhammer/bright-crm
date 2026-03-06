import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sequences = await prisma.outreachSequence.findMany({
      include: {
        _count: { select: { enrollments: true } },
        enrollments: {
          where: { status: "active" },
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = sequences.map((seq) => ({
      id: seq.id,
      name: seq.name,
      description: seq.description,
      status: seq.status,
      steps: JSON.parse(seq.steps),
      totalEnrollments: seq._count.enrollments,
      activeEnrollments: seq.enrollments.length,
      createdAt: seq.createdAt,
      updatedAt: seq.updatedAt,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Sequences GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, steps } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json({ error: "At least one step is required" }, { status: 400 });
    }

    // Validate step structure
    for (const step of steps) {
      if (!step.type || !step.subject || !step.body) {
        return NextResponse.json(
          { error: "Each step must have type, subject, and body" },
          { status: 400 }
        );
      }
    }

    // Normalize step numbers
    const normalizedSteps = steps.map((step: Record<string, unknown>, index: number) => ({
      stepNumber: index + 1,
      delayDays: step.delayDays ?? 0,
      type: step.type || "email",
      subject: step.subject || "",
      body: step.body || "",
    }));

    const sequence = await prisma.outreachSequence.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        steps: JSON.stringify(normalizedSteps),
        status: "draft",
      },
    });

    return NextResponse.json(
      {
        ...sequence,
        steps: normalizedSteps,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Sequences POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
