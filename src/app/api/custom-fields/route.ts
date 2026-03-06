import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const VALID_ENTITY_TYPES = ["Lead", "Contact", "Account", "Deal"];
const VALID_FIELD_TYPES = ["text", "number", "date", "select", "boolean"];

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  fieldType: z.enum(["text", "number", "date", "select", "boolean"]),
  entityType: z.enum(["Lead", "Contact", "Account", "Deal"]),
  options: z.string().nullable().optional(), // JSON array string for select type
  required: z.boolean().default(false),
  order: z.number().int().default(0),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");

    const where: Record<string, unknown> = {};
    if (entityType) {
      if (!VALID_ENTITY_TYPES.includes(entityType)) {
        return NextResponse.json(
          { error: "Invalid entityType" },
          { status: 400 }
        );
      }
      where.entityType = entityType;
    }

    const customFields = await prisma.customField.findMany({
      where,
      orderBy: [{ entityType: "asc" }, { order: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(customFields);
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
    const data = createSchema.parse(body);

    // Validate options for select type
    if (data.fieldType === "select") {
      if (!data.options) {
        return NextResponse.json(
          { error: "Options are required for select field type" },
          { status: 400 }
        );
      }
      try {
        const parsed = JSON.parse(data.options);
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

    const customField = await prisma.customField.create({
      data: {
        name: data.name,
        fieldType: data.fieldType,
        entityType: data.entityType,
        options: data.options || null,
        required: data.required,
        order: data.order,
      },
    });

    return NextResponse.json(customField, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error("Failed to create custom field:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
