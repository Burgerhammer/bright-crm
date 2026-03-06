import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const integration = await prisma.integration.findUnique({
      where: {
        userId_provider: { userId: session.user.id, provider: "anthropic" },
      },
      select: { accessToken: true },
    });

    return NextResponse.json({
      connected: !!integration?.accessToken,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { apiKey } = await req.json();
    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 400 }
      );
    }

    await prisma.integration.upsert({
      where: {
        userId_provider: { userId: session.user.id, provider: "anthropic" },
      },
      update: {
        accessToken: apiKey,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        provider: "anthropic",
        accessToken: apiKey,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Anthropic save error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save API key",
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.integration.deleteMany({
      where: {
        userId: session.user.id,
        provider: "anthropic",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Anthropic disconnect error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to remove API key",
      },
      { status: 500 }
    );
  }
}
