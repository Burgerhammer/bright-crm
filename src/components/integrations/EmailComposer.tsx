"use client";

import { useState, useEffect, useRef } from "react";
import { Mail, Send, X, Loader2, FileText, ChevronDown } from "lucide-react";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

interface EmailComposerProps {
  recipientEmail?: string;
  recipientName?: string;
  contactId?: string;
  dealId?: string;
  leadId?: string;
  contactData?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    company?: string;
    title?: string;
  };
  dealData?: {
    name?: string;
    amount?: number;
  };
  onSent?: () => void;
}

function replacePlaceholders(
  text: string,
  contactData?: EmailComposerProps["contactData"],
  dealData?: EmailComposerProps["dealData"]
): string {
  let result = text;
  if (contactData) {
    result = result.replace(/\{\{firstName\}\}/g, contactData.firstName || "");
    result = result.replace(/\{\{lastName\}\}/g, contactData.lastName || "");
    result = result.replace(/\{\{email\}\}/g, contactData.email || "");
    result = result.replace(/\{\{company\}\}/g, contactData.company || "");
    result = result.replace(/\{\{title\}\}/g, contactData.title || "");
  }
  if (dealData) {
    result = result.replace(/\{\{dealName\}\}/g, dealData.name || "");
    result = result.replace(
      /\{\{dealAmount\}\}/g,
      dealData.amount != null ? String(dealData.amount) : ""
    );
  }
  return result;
}

export default function EmailComposer({
  recipientEmail,
  recipientName,
  contactId,
  dealId,
  leadId,
  contactData,
  dealData,
  onSent,
}: EmailComposerProps) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(recipientEmail || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Template picker state
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close template picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setShowTemplatePicker(false);
      }
    }
    if (showTemplatePicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showTemplatePicker]);

  const fetchTemplates = async () => {
    if (templatesLoaded) return;
    const res = await fetch("/api/email-templates");
    if (res.ok) {
      const data = await res.json();
      setTemplates(data);
    }
    setTemplatesLoaded(true);
  };

  const handleToggleTemplatePicker = () => {
    if (!showTemplatePicker) {
      fetchTemplates();
    }
    setShowTemplatePicker(!showTemplatePicker);
  };

  const handleSelectTemplate = (template: EmailTemplate) => {
    const newSubject = replacePlaceholders(
      template.subject,
      contactData,
      dealData
    );
    const newBody = replacePlaceholders(template.body, contactData, dealData);
    setSubject(newSubject);
    setBody(newBody);
    setShowTemplatePicker(false);
  };

  const handleSend = async () => {
    if (!to || !subject || !body) {
      setError("To, Subject, and Body are required");
      return;
    }

    setSending(true);
    setError("");

    const res = await fetch("/api/integrations/google/gmail/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, body, contactId, dealId, leadId }),
    });

    if (res.ok) {
      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setSubject("");
        setBody("");
        onSent?.();
      }, 1500);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to send email");
    }

    setSending(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bc-btn bc-btn-neutral text-xs"
      >
        <Mail className="w-3.5 h-3.5" />
        Email
      </button>
    );
  }

  return (
    <div className="bc-card mt-3">
      <div className="bc-section-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4" />
          Send Email
          {recipientName && (
            <span className="font-normal text-[#706E6B]">
              to {recipientName}
            </span>
          )}
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-[#706E6B] hover:text-[#3E3E3C]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 space-y-3">
        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded border border-red-200">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 text-green-700 text-sm px-3 py-2 rounded border border-green-200">
            Email sent successfully!
          </div>
        )}

        {/* Template Picker */}
        <div className="relative" ref={pickerRef}>
          <button
            onClick={handleToggleTemplatePicker}
            className="bc-btn bc-btn-neutral text-xs"
            type="button"
          >
            <FileText className="w-3.5 h-3.5" />
            Use Template
            <ChevronDown className="w-3 h-3" />
          </button>
          {showTemplatePicker && (
            <div className="absolute z-10 mt-1 w-72 bg-white border border-[#DDDBDA] rounded shadow-lg max-h-60 overflow-y-auto">
              {templates.length === 0 ? (
                <div className="px-3 py-4 text-sm text-[#706E6B] text-center">
                  No templates found. Create templates in Settings.
                </div>
              ) : (
                templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className="w-full text-left px-3 py-2 hover:bg-[#F4F6F9] border-b border-[#DDDBDA] last:border-b-0 transition-colors"
                    type="button"
                  >
                    <div className="font-medium text-sm text-[#3E3E3C]">
                      {template.name}
                    </div>
                    <div className="text-xs text-[#706E6B] truncate">
                      {template.subject}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div>
          <label className="bc-label">To</label>
          <input
            className="bc-input"
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com"
          />
        </div>
        <div>
          <label className="bc-label">Subject</label>
          <input
            className="bc-input"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject"
          />
        </div>
        <div>
          <label className="bc-label">Body</label>
          <textarea
            className="bc-input min-h-[120px]"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message..."
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setOpen(false)}
            className="bc-btn bc-btn-neutral"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="bc-btn bc-btn-primary"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
