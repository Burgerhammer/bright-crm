import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getClaudeClient, getCrmContext, SYSTEM_PROMPT } from "@/lib/claude";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { dealId } = await req.json();

    const client = await getClaudeClient(session.user.id);
    if (!client) {
      return NextResponse.json(
        { error: "API key not configured. Please add your Anthropic API key in Settings > Integrations." },
        { status: 400 }
      );
    }

    const crmContext = dealId
      ? await getCrmContext("deal", dealId)
      : await getCrmContext();

    const prompt = dealId
      ? "Analyze this deal and provide actionable insights: risk assessment, suggested next steps, and estimated win probability reasoning."
      : "Analyze the overall pipeline health. Identify deals at risk, deals that need attention, and provide recommendations.";

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT + "\n\n--- CRM Context ---\n" + crmContext,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const insights =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ insights });
  } catch (error) {
    console.error("AI insights error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate insights",
      },
      { status: 500 }
    );
  }
}
