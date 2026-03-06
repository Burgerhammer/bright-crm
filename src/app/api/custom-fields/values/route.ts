import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const VALID_ENTITY_TYPES = ["Lead", "Contact", "Account", "Deal"];

const upsertSchema = z.object({
  entityId: z.string().min(1),
  values: z.array(
    z.object({
      customFieldId: z.string().min(1),
      value: z.string().nullable(),
    })
  ),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: "entityType and entityId are required" },
        { status: 400 }
      );
    }

    if (!VALID_ENTITY_TYPES.includes(entityType)) {
      return NextResponse.json(
        { error: "Invalid entityType" },
        { status: 400 }
      );
    }

    // Get custom fields for this entity type with their values for this entity
    const customFields = await prisma.customField.findMany({
      where: { entityType },
      include: {
        values: {
          where: { entityId },
        },
      },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    });

    // Flatten the response: each field with its value
    const result = customFields.map((field) => ({
      id: field.id,
      name: field.name,
      fieldType: field.fieldType,
      entityType: field.entityType,
      options: field.options,
      required: field.required,
      order: field.order,
      value: field.values[0]?.value ?? null,
      valueId: field.values[0]?.id ?? null,
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = upsertSchema.parse(body);

    // Upsert each value
    const results = await Promise.all(
      data.values.map((v) =>
        prisma.customFieldValue.upsert({
          where: {
            customFieldId_entityId: {
              customFieldId: v.customFieldId,
              entityId: data.entityId,
            },
          },
          update: {
            value: v.value,
          },
          create: {
            customFieldId: v.customFieldId,
            entityId: data.entityId,
            value: v.value,
          },
        })
      )
    );

    return NextResponse.json(results);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error("Failed to update custom field values:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
