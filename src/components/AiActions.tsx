"use client";

import { useState } from "react";
import {
  Mail,
  ClipboardList,
  Tag,
  TrendingUp,
  Sparkles,
  X,
  Copy,
  Check,
  Loader2,
} from "lucide-react";

interface AiActionsProps {
  entityType: string; // "lead" | "contact" | "account" | "deal"
  entityId: string;
  email?: string;
  name?: string;
}

type ModalType = "email" | "meeting" | "tags" | "insights" | null;

interface EmailResult {
  subject: string;
  body: string;
}

function renderSimpleMarkdown(text: string): string {
  return text
    // Headings: ## and ### to h3/h4
    .replace(/^### (.+)$/gm, '<h4 class="font-semibold text-[#3E3E3C] mt-4 mb-1">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="font-bold text-[#3E3E3C] text-lg mt-4 mb-2">$1</h3>')
    .replace(/^# (.+)$/gm, '<h3 class="font-bold text-[#3E3E3C] text-lg mt-4 mb-2">$1</h3>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Bullet lists
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-sm text-[#3E3E3C]">$1</li>')
    // Numbered lists
    .replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-4 list-decimal text-sm text-[#3E3E3C]">$1</li>')
    // Line breaks
    .replace(/\n\n/g, '<div class="my-2"></div>')
    .replace(/\n/g, "<br />");
}

export default function AiActions({
  entityType,
  entityId,
  email,
  name,
}: AiActionsProps) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Email state
  const [emailResult, setEmailResult] = useState<EmailResult | null>(null);
  const [emailIntent, setEmailIntent] = useState("follow-up");
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);

  // Meeting prep state
  const [meetingBrief, setMeetingBrief] = useState("");

  // Tags state
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [applyingTag, setApplyingTag] = useState<string | null>(null);
  const [appliedTags, setAppliedTags] = useState<Set<string>>(new Set());

  // Insights state
  const [insights, setInsights] = useState("");

  const closeModal = () => {
    setActiveModal(null);
    setError("");
  };

  const handleDraftEmail = async () => {
    setActiveModal("email");
    setLoading(true);
    setError("");
    setEmailResult(null);

    try {
      const res = await fetch("/api/ai/draft-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          entityId,
          intent: emailIntent,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to draft email");
      }

      const data = await res.json();
      setEmailResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to draft email");
    } finally {
      setLoading(false);
    }
  };

  const handleMeetingPrep = async () => {
    setActiveModal("meeting");
    setLoading(true);
    setError("");
    setMeetingBrief("");

    try {
      const res = await fetch("/api/ai/meeting-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to prepare meeting brief");
      }

      const data = await res.json();
      setMeetingBrief(data.brief);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to prepare meeting brief"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestTags = async () => {
    setActiveModal("tags");
    setLoading(true);
    setError("");
    setTagSuggestions([]);
    setAppliedTags(new Set());

    try {
      const res = await fetch("/api/ai/suggest-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to suggest tags");
      }

      const data = await res.json();
      setTagSuggestions(data.suggestions);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to suggest tags"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTag = async (tagName: string) => {
    setApplyingTag(tagName);
    try {
      // First, find or create the tag
      let tagId: string | null = null;

      // Check if tag exists
      const tagsRes = await fetch("/api/tags");
      if (tagsRes.ok) {
        const tags = await tagsRes.json();
        const existing = tags.find(
          (t: { name: string; id: string }) =>
            t.name.toLowerCase() === tagName.toLowerCase()
        );
        if (existing) {
          tagId = existing.id;
        }
      }

      // Create tag if it doesn't exist
      if (!tagId) {
        const createRes = await fetch("/api/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: tagName }),
        });
        if (createRes.ok) {
          const newTag = await createRes.json();
          tagId = newTag.id;
        } else {
          throw new Error("Failed to create tag");
        }
      }

      // Apply tag to entity
      if (tagId) {
        const applyRes = await fetch(
          `/api/${entityType}s/${entityId}/tags`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tagId }),
          }
        );
        if (!applyRes.ok) {
          throw new Error("Failed to apply tag");
        }
        setAppliedTags((prev) => new Set([...prev, tagName]));
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to apply tag"
      );
    } finally {
      setApplyingTag(null);
    }
  };

  const handleInsights = async () => {
    setActiveModal("insights");
    setLoading(true);
    setError("");
    setInsights("");

    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId: entityType === "deal" ? entityId : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate insights");
      }

      const data = await res.json();
      setInsights(data.insights);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate insights"
      );
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: "subject" | "body") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "subject") {
        setCopiedSubject(true);
        setTimeout(() => setCopiedSubject(false), 2000);
      } else {
        setCopiedBody(true);
        setTimeout(() => setCopiedBody(false), 2000);
      }
    } catch {
      // Fallback for older browsers
    }
  };

  return (
    <>
      {/* AI Action Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-xs text-[#706E6B] mr-1">
          <Sparkles className="w-3.5 h-3.5 text-purple-500" />
          <span className="font-medium">AI</span>
        </div>

        <button
          type="button"
          onClick={handleDraftEmail}
          className="bc-btn bc-btn-neutral text-xs gap-1"
        >
          <Mail className="w-3.5 h-3.5" />
          <Sparkles className="w-3 h-3 text-purple-500" />
          Draft Email
        </button>

        <button
          type="button"
          onClick={handleMeetingPrep}
          className="bc-btn bc-btn-neutral text-xs gap-1"
        >
          <ClipboardList className="w-3.5 h-3.5" />
          <Sparkles className="w-3 h-3 text-purple-500" />
          Meeting Prep
        </button>

        <button
          type="button"
          onClick={handleSuggestTags}
          className="bc-btn bc-btn-neutral text-xs gap-1"
        >
          <Tag className="w-3.5 h-3.5" />
          <Sparkles className="w-3 h-3 text-purple-500" />
          Suggest Tags
        </button>

        {entityType === "deal" && (
          <button
            type="button"
            onClick={handleInsights}
            className="bc-btn bc-btn-neutral text-xs gap-1"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <Sparkles className="w-3 h-3 text-purple-500" />
            Deal Insights
          </button>
        )}
      </div>

      {/* Modal Overlay */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#DDDBDA]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <h2 className="text-lg font-bold text-[#3E3E3C]">
                  {activeModal === "email" && "AI Draft Email"}
                  {activeModal === "meeting" && "AI Meeting Brief"}
                  {activeModal === "tags" && "AI Tag Suggestions"}
                  {activeModal === "insights" && "AI Deal Insights"}
                </h2>
                {name && (
                  <span className="text-sm text-[#706E6B]">
                    - {name}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-[#706E6B] hover:text-[#3E3E3C] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto flex-1">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                  <span className="ml-2 text-sm text-[#706E6B]">
                    AI is working...
                  </span>
                </div>
              )}

              {error && (
                <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded border border-red-200">
                  {error}
                </div>
              )}

              {/* Email Result */}
              {activeModal === "email" && !loading && !error && (
                <>
                  {!emailResult && (
                    <div className="space-y-3">
                      <div>
                        <label className="bc-label">Email Intent</label>
                        <select
                          value={emailIntent}
                          onChange={(e) => setEmailIntent(e.target.value)}
                          className="bc-input"
                        >
                          <option value="follow-up">Follow-up</option>
                          <option value="introduction">Introduction</option>
                          <option value="meeting request">Meeting Request</option>
                          <option value="proposal">Proposal</option>
                          <option value="thank you">Thank You</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={handleDraftEmail}
                        className="bc-btn bc-btn-primary"
                      >
                        <Sparkles className="w-4 h-4" />
                        Generate Email
                      </button>
                    </div>
                  )}
                  {emailResult && (
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="bc-label">Subject</label>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(emailResult.subject, "subject")
                            }
                            className="text-xs text-[#706E6B] hover:text-[#3E3E3C] flex items-center gap-1"
                          >
                            {copiedSubject ? (
                              <Check className="w-3 h-3 text-green-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            {copiedSubject ? "Copied" : "Copy"}
                          </button>
                        </div>
                        <div className="bg-[#F4F6F9] rounded px-3 py-2 text-sm text-[#3E3E3C]">
                          {emailResult.subject}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="bc-label">Body</label>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(emailResult.body, "body")
                            }
                            className="text-xs text-[#706E6B] hover:text-[#3E3E3C] flex items-center gap-1"
                          >
                            {copiedBody ? (
                              <Check className="w-3 h-3 text-green-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            {copiedBody ? "Copied" : "Copy"}
                          </button>
                        </div>
                        <div className="bg-[#F4F6F9] rounded px-3 py-2 text-sm text-[#3E3E3C] whitespace-pre-wrap">
                          {emailResult.body}
                        </div>
                      </div>
                      {email && (
                        <a
                          href={`mailto:${email}?subject=${encodeURIComponent(emailResult.subject)}&body=${encodeURIComponent(emailResult.body)}`}
                          className="bc-btn bc-btn-primary inline-flex"
                        >
                          <Mail className="w-4 h-4" />
                          Use in Email Composer
                        </a>
                      )}
                      <div className="pt-2 border-t border-[#DDDBDA]">
                        <label className="bc-label mb-1">Regenerate with different intent</label>
                        <div className="flex items-center gap-2">
                          <select
                            value={emailIntent}
                            onChange={(e) => setEmailIntent(e.target.value)}
                            className="bc-input flex-1"
                          >
                            <option value="follow-up">Follow-up</option>
                            <option value="introduction">Introduction</option>
                            <option value="meeting request">Meeting Request</option>
                            <option value="proposal">Proposal</option>
                            <option value="thank you">Thank You</option>
                          </select>
                          <button
                            type="button"
                            onClick={handleDraftEmail}
                            className="bc-btn bc-btn-neutral text-xs"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                            Regenerate
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Meeting Brief Result */}
              {activeModal === "meeting" && !loading && !error && meetingBrief && (
                <div
                  className="prose prose-sm max-w-none text-sm text-[#3E3E3C]"
                  dangerouslySetInnerHTML={{
                    __html: renderSimpleMarkdown(meetingBrief),
                  }}
                />
              )}

              {/* Tag Suggestions Result */}
              {activeModal === "tags" &&
                !loading &&
                !error &&
                tagSuggestions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-[#706E6B] mb-3">
                      Suggested tags based on the CRM record. Click
                      &quot;Apply&quot; to add a tag.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {tagSuggestions.map((tag) => (
                        <div
                          key={tag}
                          className="flex items-center gap-1.5 bg-[#F4F6F9] rounded-full px-3 py-1.5 border border-[#DDDBDA]"
                        >
                          <Tag className="w-3 h-3 text-[#706E6B]" />
                          <span className="text-sm text-[#3E3E3C]">
                            {tag}
                          </span>
                          {appliedTags.has(tag) ? (
                            <span className="text-xs text-green-600 flex items-center gap-0.5">
                              <Check className="w-3 h-3" />
                              Applied
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleApplyTag(tag)}
                              disabled={applyingTag === tag}
                              className="text-xs text-[#0070D2] hover:text-[#005FB2] font-medium"
                            >
                              {applyingTag === tag ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                "Apply"
                              )}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              {activeModal === "tags" &&
                !loading &&
                !error &&
                tagSuggestions.length === 0 && (
                  <p className="text-sm text-[#706E6B] italic">
                    No tag suggestions generated. Try again.
                  </p>
                )}

              {/* Insights Result */}
              {activeModal === "insights" && !loading && !error && insights && (
                <div
                  className="prose prose-sm max-w-none text-sm text-[#3E3E3C]"
                  dangerouslySetInnerHTML={{
                    __html: renderSimpleMarkdown(insights),
                  }}
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end p-4 border-t border-[#DDDBDA]">
              <button
                type="button"
                onClick={closeModal}
                className="bc-btn bc-btn-neutral"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
