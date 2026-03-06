import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
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

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT + "\n\n--- CRM Context ---\n" + crmContext,
      messages: [
        {
          role: "user",
          content:
            "Prepare a concise meeting brief based on this CRM data. Include: key facts about the person/company, relationship history, open deals and their status, recent interactions, and suggested talking points. Format with clear headings.",
        },
      ],
    });

    const brief =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ brief });
  } catch (error) {
    console.error("AI meeting-prep error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to prepare meeting brief",
      },
      { status: 500 }
    );
  }
}
