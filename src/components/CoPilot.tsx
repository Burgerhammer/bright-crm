"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Sparkles, X, Send, AlertCircle } from "lucide-react";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface CoPilotProps {
  context?: { entityType: string; entityId: string };
}

export default function CoPilot({ context }: CoPilotProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleClose = () => {
    setOpen(false);
    setMessages([]);
    setInput("");
    setError(null);
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isStreaming) return;

    const userMessage: Message = { role: "user", content: content.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          context,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (
          res.status === 400 &&
          data.error === "API key not configured"
        ) {
          setError("api_key_missing");
          setIsStreaming(false);
          return;
        }
        throw new Error(data.error || "Failed to get response");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let assistantContent = "";

      // Add empty assistant message to fill via streaming
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;

        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: assistantContent,
          };
          return updated;
        });
      }
    } catch (err) {
      console.error("CoPilot error:", err);
      if (!error) {
        setError(
          err instanceof Error ? err.message : "Something went wrong"
        );
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const quickActions = [
    {
      label: "Summarize pipeline",
      message: "Summarize my current pipeline health",
      always: true,
    },
    {
      label: "Draft follow-up email",
      message: "Draft a follow-up email for this record",
      always: false,
    },
    {
      label: "Meeting prep",
      message: "Help me prepare for a meeting about this record",
      always: false,
    },
    {
      label: "Suggest next actions",
      message: "Suggest the best next actions for this record",
      always: false,
    },
  ];

  const visibleActions = quickActions.filter(
    (a) => a.always || context
  );

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-12 h-12 sm:w-14 sm:h-14 bg-[#0070D2] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#005FB2] transition-colors group"
          aria-label="Open AI CoPilot"
        >
          <span className="absolute w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#0070D2] animate-ping opacity-20 group-hover:opacity-30" />
          <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 relative z-10" />
        </button>
      )}

      {/* Slide-out panel — full screen on mobile, side panel on desktop */}
      <div
        className={`fixed inset-0 sm:inset-auto sm:top-0 sm:right-0 sm:bottom-0 z-50 sm:z-40 w-full sm:w-[400px] bg-white shadow-xl sm:border-l border-[#DDDBDA] flex flex-col transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-[env(safe-area-inset-top,0px)] py-3 border-b border-[#DDDBDA] bg-white">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#0070D2]" />
            <h2 className="font-semibold text-[#3E3E3C]">AI CoPilot</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-[#706E6B] hover:text-[#3E3E3C] p-1 rounded hover:bg-[#F4F6F9] transition-colors"
            aria-label="Close CoPilot"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {error === "api_key_missing" ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <AlertCircle className="w-10 h-10 text-amber-500 mb-3" />
              <p className="text-sm text-[#3E3E3C] font-medium mb-1">
                API Key Not Configured
              </p>
              <p className="text-xs text-[#706E6B] mb-4">
                To use AI CoPilot, add your Anthropic API key in Settings.
              </p>
              <Link
                href="/settings/integrations"
                className="bc-btn bc-btn-primary text-sm"
                onClick={() => setOpen(false)}
              >
                Go to Settings &rarr; Integrations
              </Link>
            </div>
          ) : messages.length === 0 && !isStreaming ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <Sparkles className="w-10 h-10 text-[#0070D2] mb-3 opacity-50" />
              <p className="text-sm text-[#706E6B] mb-4">
                Ask me anything about your CRM data, pipeline, or let me help draft messages.
              </p>
              {/* Quick actions */}
              <div className="flex flex-wrap gap-2 justify-center">
                {visibleActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.message)}
                    className="text-xs px-3 py-1.5 rounded-full border border-[#DDDBDA] text-[#3E3E3C] hover:bg-[#F4F6F9] hover:border-[#0070D2] hover:text-[#0070D2] transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-[#0070D2] text-white"
                        : "bg-[#F4F6F9] text-[#3E3E3C]"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isStreaming &&
                messages.length > 0 &&
                messages[messages.length - 1].role !== "assistant" && (
                  <div className="flex justify-start">
                    <div className="bg-[#F4F6F9] text-[#3E3E3C] px-3 py-2 rounded-lg text-sm">
                      <span className="inline-flex gap-1">
                        <span className="w-2 h-2 bg-[#706E6B] rounded-full animate-pulse" />
                        <span
                          className="w-2 h-2 bg-[#706E6B] rounded-full animate-pulse"
                          style={{ animationDelay: "0.2s" }}
                        />
                        <span
                          className="w-2 h-2 bg-[#706E6B] rounded-full animate-pulse"
                          style={{ animationDelay: "0.4s" }}
                        />
                      </span>
                    </div>
                  </div>
                )}
              {error && error !== "api_key_missing" && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] px-3 py-2 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
                    {error}
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        {error !== "api_key_missing" && (
          <div className="border-t border-[#DDDBDA] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white">
            {messages.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {visibleActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.message)}
                    disabled={isStreaming}
                    className="text-[10px] px-2 py-1 rounded-full border border-[#DDDBDA] text-[#706E6B] hover:bg-[#F4F6F9] hover:text-[#0070D2] transition-colors disabled:opacity-50"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask CoPilot..."
                rows={1}
                disabled={isStreaming}
                className="bc-input flex-1 resize-none text-sm min-h-[38px] max-h-[120px]"
                style={{
                  height: "auto",
                  overflow: "hidden",
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height =
                    Math.min(target.scrollHeight, 120) + "px";
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isStreaming}
                className="w-9 h-9 flex-shrink-0 bg-[#0070D2] text-white rounded-lg flex items-center justify-center hover:bg-[#005FB2] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
