import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const bulkSchema = z.object({
  action: z.enum(["delete", "update"]),
  ids: z.array(z.string()).min(1, "At least one ID is required"),
  data: z
    .object({
      ownerId: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, ids, data } = bulkSchema.parse(body);

    if (action === "delete") {
      const result = await prisma.contact.deleteMany({
        where: { id: { in: ids } },
      });
      return NextResponse.json({ deleted: result.count });
    }

    if (action === "update") {
      if (!data) {
        return NextResponse.json(
          { error: "Update data is required for update action" },
          { status: 400 }
        );
      }

      const updateData: Record<string, string> = {};
      if (data.ownerId) updateData.ownerId = data.ownerId;

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          { error: "No valid fields to update" },
          { status: 400 }
        );
      }

      const result = await prisma.contact.updateMany({
        where: { id: { in: ids } },
        data: updateData,
      });
      return NextResponse.json({ updated: result.count });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
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
