import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClaudeClient, getCrmContext, SYSTEM_PROMPT } from "@/lib/claude";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { entityType, entityId } = await req.json();

    const client = await getClaudeClient(session.user.id);
    if (!client) {
      return NextResponse.json(
        { error: "API key not configured. Please add your Anthropic API key in Settings > Integrations." },
        { status: 400 }
      );
    }

    const crmContext = await getCrmContext(entityType, entityId);

    // Fetch all existing tags
    const existingTags = await prisma.tag.findMany({
      select: { name: true },
      orderBy: { name: "asc" },
    });
    const tagNames = existingTags.map((t) => t.name);

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT + "\n\n--- CRM Context ---\n" + crmContext,
      messages: [
        {
          role: "user",
          content: `Based on this CRM record, suggest relevant tags from the existing tags list or suggest new ones. Existing tags: ${JSON.stringify(tagNames)}. Return as JSON array of strings. Return ONLY the JSON array, no other text.`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "[]";

    // Parse JSON array from response
    let suggestions: string[] = [];
    try {
      // Find the JSON array in the response (handle potential surrounding text)
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        suggestions = JSON.parse(match[0]);
      }
    } catch {
      // If parsing fails, try to extract tag names manually
      suggestions = text
        .replace(/[\[\]"]/g, "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("AI suggest-tags error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to suggest tags",
      },
      { status: 500 }
    );
  }
}
