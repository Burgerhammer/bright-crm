import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getClaudeClient, getCrmContext, SYSTEM_PROMPT } from "@/lib/claude";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { entityType, entityId, intent } = await req.json();

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
          content: `Draft a professional email for the following context. Intent: ${intent || "follow-up"}. Return ONLY the email with Subject: line first, then a blank line, then the body. Do not include any other text.`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse subject and body from the response
    const lines = text.split("\n");
    let subject = "";
    let bodyStartIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.toLowerCase().startsWith("subject:")) {
        subject = line.replace(/^subject:\s*/i, "").trim();
        bodyStartIndex = i + 1;
        // Skip blank lines after subject
        while (
          bodyStartIndex < lines.length &&
          lines[bodyStartIndex].trim() === ""
        ) {
          bodyStartIndex++;
        }
        break;
      }
    }

    const body = lines.slice(bodyStartIndex).join("\n").trim();

    return NextResponse.json({ subject, body });
  } catch (error) {
    console.error("AI draft-email error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to draft email",
      },
      { status: 500 }
    );
  }
}
