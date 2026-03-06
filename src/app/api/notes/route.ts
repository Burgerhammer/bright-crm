import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const noteSchema = z.object({
  body: z.string().min(1, "Note body is required"),
  leadId: z.string().optional(),
  contactId: z.string().optional(),
  accountId: z.string().optional(),
  dealId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = noteSchema.parse(body);

    const note = await prisma.note.create({
      data: {
        body: validated.body,
        ...(validated.leadId && { leadId: validated.leadId }),
        ...(validated.contactId && { contactId: validated.contactId }),
        ...(validated.accountId && { accountId: validated.accountId }),
        ...(validated.dealId && { dealId: validated.dealId }),
        ownerId: session.user.id,
      },
      include: {
        owner: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error("Failed to create note:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
