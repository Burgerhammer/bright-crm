import { auth } from "@/lib/auth";
import { getClaudeClient, getCrmContext, SYSTEM_PROMPT } from "@/lib/claude";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { messages, context } = await req.json();

    const client = await getClaudeClient(session.user.id);
    if (!client) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const crmContext = await getCrmContext(
      context?.entityType,
      context?.entityId
    );
    const systemPrompt = SYSTEM_PROMPT + "\n\n--- CRM Context ---\n" + crmContext;

    const stream = client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(
                new TextEncoder().encode(event.delta.text)
              );
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readableStream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Failed to process request",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
