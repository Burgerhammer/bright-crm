import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, subject, status, contactId, dealId, leadId } =
      await request.json();

    if (!type || !subject) {
      return NextResponse.json(
        { error: "type and subject are required" },
        { status: 400 }
      );
    }

    const activity = await prisma.activity.create({
      data: {
        type,
        subject,
        status: status || "Completed",
        ...(contactId && { contactId }),
        ...(dealId && { dealId }),
        ...(leadId && { leadId }),
        ownerId: session.user.id,
      },
    });

    return NextResponse.json(activity);
  } catch (error) {
    console.error("Activity create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create activity" },
      { status: 500 }
    );
  }
}
