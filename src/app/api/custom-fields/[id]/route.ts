import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  fieldType: z.enum(["text", "number", "date", "select", "boolean"]).optional(),
  entityType: z.enum(["Lead", "Contact", "Account", "Deal"]).optional(),
  options: z.string().nullable().optional(),
  required: z.boolean().optional(),
  order: z.number().int().optional(),
});

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

    const existing = await prisma.customField.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Custom field not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const data = updateSchema.parse(body);

    // Validate options for select type
    const fieldType = data.fieldType || existing.fieldType;
    if (fieldType === "select") {
      const options = data.options !== undefined ? data.options : existing.options;
      if (!options) {
        return NextResponse.json(
          { error: "Options are required for select field type" },
          { status: 400 }
        );
      }
      try {
        const parsed = JSON.parse(options);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          return NextResponse.json(
            { error: "Options must be a non-empty JSON array" },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: "Options must be a valid JSON array" },
          { status: 400 }
        );
      }
    }

    const customField = await prisma.customField.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.fieldType !== undefined && { fieldType: data.fieldType }),
        ...(data.entityType !== undefined && { entityType: data.entityType }),
        ...(data.options !== undefined && { options: data.options }),
        ...(data.required !== undefined && { required: data.required }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });

    return NextResponse.json(customField);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error("Failed to update custom field:", error);
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

    const existing = await prisma.customField.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Custom field not found" },
        { status: 404 }
      );
    }

    // Cascade delete is handled by the schema (onDelete: Cascade on values)
    await prisma.customField.delete({ where: { id } });

    return NextResponse.json({ message: "Custom field deleted" });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
