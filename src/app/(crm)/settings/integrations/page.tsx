"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Calendar,
  Phone,
  MessageSquare,
  Check,
  X,
  Loader2,
  ExternalLink,
  Unplug,
  Headphones,
  Mic,
  Sparkles,
  Brain,
  MessageCircle,
  Trash2,
} from "lucide-react";

interface GoogleStatus {
  connected: boolean;
  email?: string;
}

interface TwilioStatus {
  configured: boolean;
  phoneNumber?: string | null;
}

interface DialpadStatus {
  connected: boolean;
  configured: boolean;
  miniDialerUrl?: string | null;
}

interface AnthropicStatus {
  connected: boolean;
}

export default function IntegrationsPage() {
  const searchParams = useSearchParams();
  const justConnected = searchParams.get("connected");

  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [twilioStatus, setTwilioStatus] = useState<TwilioStatus | null>(null);
  const [dialpadStatus, setDialpadStatus] = useState<DialpadStatus | null>(null);
  const [anthropicStatus, setAnthropicStatus] = useState<AnthropicStatus | null>(null);
  const [anthropicKey, setAnthropicKey] = useState("");
  const [anthropicSaving, setAnthropicSaving] = useState(false);
  const [anthropicRemoving, setAnthropicRemoving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [dialpadConnecting, setDialpadConnecting] = useState(false);
  const [dialpadDisconnecting, setDialpadDisconnecting] = useState(false);

  useEffect(() => {
    // Check Google connection status
    fetch("/api/integrations/google/status")
      .then((r) => r.json())
      .then(setGoogleStatus)
      .catch(() => setGoogleStatus({ connected: false }));

    // Check Twilio status
    fetch("/api/integrations/twilio/status")
      .then((r) => r.json())
      .then(setTwilioStatus)
      .catch(() => setTwilioStatus({ configured: false }));

    // Check Dialpad status
    fetch("/api/integrations/dialpad/status")
      .then((r) => r.json())
      .then(setDialpadStatus)
      .catch(() => setDialpadStatus({ connected: false, configured: false }));

    // Check Anthropic status
    fetch("/api/integrations/anthropic")
      .then((r) => r.json())
      .then(setAnthropicStatus)
      .catch(() => setAnthropicStatus({ connected: false }));
  }, []);

  const handleConnectGoogle = async () => {
    setConnecting(true);
    const res = await fetch("/api/integrations/google/connect");
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert(data.error || "Failed to start Google connection");
      setConnecting(false);
    }
  };

  const handleConnectDialpad = async () => {
    setDialpadConnecting(true);
    const res = await fetch("/api/integrations/dialpad/connect");
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert(data.error || "Failed to start Dialpad connection");
      setDialpadConnecting(false);
    }
  };

  const handleDisconnectDialpad = async () => {
    if (!confirm("Disconnect Dialpad? Phone and SMS via Dialpad will stop.")) return;
    setDialpadDisconnecting(true);
    const res = await fetch("/api/integrations/dialpad/disconnect", {
      method: "POST",
    });
    if (res.ok) {
      setDialpadStatus({ connected: false, configured: dialpadStatus?.configured ?? false });
    }
    setDialpadDisconnecting(false);
  };

  const handleSaveAnthropicKey = async () => {
    if (!anthropicKey.trim()) return;
    setAnthropicSaving(true);
    try {
      const res = await fetch("/api/integrations/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: anthropicKey.trim() }),
      });
      if (res.ok) {
        setAnthropicStatus({ connected: true });
        setAnthropicKey("");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save API key");
      }
    } catch {
      alert("Failed to save API key");
    }
    setAnthropicSaving(false);
  };

  const handleRemoveAnthropicKey = async () => {
    if (!confirm("Remove your Anthropic API key? AI CoPilot will stop working.")) return;
    setAnthropicRemoving(true);
    try {
      const res = await fetch("/api/integrations/anthropic", {
        method: "DELETE",
      });
      if (res.ok) {
        setAnthropicStatus({ connected: false });
      }
    } catch {
      alert("Failed to remove API key");
    }
    setAnthropicRemoving(false);
  };

  const handleDisconnectGoogle = async () => {
    if (!confirm("Disconnect your Google account? Email and calendar sync will stop.")) return;
    setDisconnecting(true);
    const res = await fetch("/api/integrations/google/disconnect", {
      method: "POST",
    });
    if (res.ok) {
      setGoogleStatus({ connected: false });
    }
    setDisconnecting(false);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings" className="text-[#706E6B] hover:text-[#3E3E3C]">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-[#3E3E3C]">Integrations</h1>
      </div>

      {justConnected && (
        <div className="bg-green-50 text-green-700 border border-green-200 rounded px-4 py-3 mb-6 flex items-center gap-2">
          <Check className="w-5 h-5" />
          <span className="font-medium">
            {justConnected === "google"
              ? "Google account connected successfully! Gmail and Calendar are now available."
              : justConnected === "dialpad"
              ? "Dialpad connected successfully! Phone calls and SMS are now available."
              : "Integration connected successfully!"}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Google Integration */}
        <div className="bc-card">
          <div className="bc-section-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded border border-[#DDDBDA] flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              </div>
              Google (Gmail + Calendar)
            </div>
            {googleStatus?.connected ? (
              <span className="bc-badge bg-green-100 text-green-700">
                <Check className="w-3 h-3 mr-1" /> Connected
              </span>
            ) : (
              <span className="bc-badge bg-gray-100 text-gray-600">
                <X className="w-3 h-3 mr-1" /> Not Connected
              </span>
            )}
          </div>
          <div className="p-4">
            <p className="text-sm text-[#706E6B] mb-4">
              Connect your Google account to send emails via Gmail and manage
              calendar events directly from the CRM.
            </p>

            {/* Features */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-[#0070D2]" />
                <span>Send & track emails</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-[#0070D2]" />
                <span>Schedule meetings</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-[#0070D2]" />
                <span>View inbox</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-[#0070D2]" />
                <span>Sync events</span>
              </div>
            </div>

            {googleStatus?.connected ? (
              <div className="space-y-3">
                <div className="bg-[#F4F6F9] rounded px-3 py-2 text-sm">
                  <span className="text-[#706E6B]">Connected as:</span>{" "}
                  <span className="font-medium">{googleStatus.email}</span>
                </div>
                <button
                  onClick={handleDisconnectGoogle}
                  disabled={disconnecting}
                  className="bc-btn bc-btn-destructive"
                >
                  <Unplug className="w-4 h-4" />
                  {disconnecting ? "Disconnecting..." : "Disconnect"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleConnectGoogle}
                  disabled={connecting}
                  className="bc-btn bc-btn-primary"
                >
                  {connecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4" />
                  )}
                  {connecting ? "Connecting..." : "Connect Google Account"}
                </button>
                <p className="text-xs text-[#706E6B]">
                  Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in
                  environment variables.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Twilio Integration */}
        <div className="bc-card">
          <div className="bc-section-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#F22F46] rounded flex items-center justify-center">
                <Phone className="w-4 h-4 text-white" />
              </div>
              Twilio (Phone + SMS)
            </div>
            {twilioStatus?.configured ? (
              <span className="bc-badge bg-green-100 text-green-700">
                <Check className="w-3 h-3 mr-1" /> Configured
              </span>
            ) : (
              <span className="bc-badge bg-gray-100 text-gray-600">
                <X className="w-3 h-3 mr-1" /> Not Configured
              </span>
            )}
          </div>
          <div className="p-4">
            <p className="text-sm text-[#706E6B] mb-4">
              Connect Twilio to make calls and send SMS messages directly from
              contact and deal pages. All communications are logged as
              activities.
            </p>

            {/* Features */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-[#F22F46]" />
                <span>Click-to-call</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MessageSquare className="w-4 h-4 text-[#F22F46]" />
                <span>Send SMS</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-[#F22F46]" />
                <span>Call logging</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MessageSquare className="w-4 h-4 text-[#F22F46]" />
                <span>SMS templates</span>
              </div>
            </div>

            {twilioStatus?.configured ? (
              <div className="space-y-3">
                <div className="bg-[#F4F6F9] rounded px-3 py-2 text-sm">
                  <span className="text-[#706E6B]">Phone Number:</span>{" "}
                  <span className="font-medium">
                    {twilioStatus.phoneNumber}
                  </span>
                </div>
                <p className="text-xs text-green-600">
                  Twilio is configured and ready. Click-to-call and SMS are
                  available on contact, lead, and deal pages.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2 text-sm text-amber-700">
                  Configure Twilio by setting these environment variables:
                  <ul className="list-disc list-inside mt-1 text-xs font-mono">
                    <li>TWILIO_ACCOUNT_SID</li>
                    <li>TWILIO_AUTH_TOKEN</li>
                    <li>TWILIO_PHONE_NUMBER</li>
                  </ul>
                </div>
                <a
                  href="https://console.twilio.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bc-btn bc-btn-neutral inline-flex"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Twilio Console
                </a>
              </div>
            )}
          </div>
        </div>
        {/* Dialpad Integration */}
        <div className="bc-card">
          <div className="bc-section-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#6C47FF] rounded flex items-center justify-center">
                <Headphones className="w-4 h-4 text-white" />
              </div>
              Dialpad (Cloud Phone + SMS)
            </div>
            {dialpadStatus?.connected ? (
              <span className="bc-badge bg-green-100 text-green-700">
                <Check className="w-3 h-3 mr-1" /> Connected
              </span>
            ) : dialpadStatus?.configured ? (
              <span className="bc-badge bg-gray-100 text-gray-600">
                <X className="w-3 h-3 mr-1" /> Not Connected
              </span>
            ) : (
              <span className="bc-badge bg-gray-100 text-gray-600">
                <X className="w-3 h-3 mr-1" /> Not Configured
              </span>
            )}
          </div>
          <div className="p-4">
            <p className="text-sm text-[#706E6B] mb-4">
              Connect Dialpad for cloud-based calling, SMS, and AI-powered call
              recaps. Includes an embedded Mini Dialer for making calls directly
              from the CRM.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-[#6C47FF]" />
                <span>Cloud calling</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MessageSquare className="w-4 h-4 text-[#6C47FF]" />
                <span>Send SMS</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mic className="w-4 h-4 text-[#6C47FF]" />
                <span>AI call recaps</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Headphones className="w-4 h-4 text-[#6C47FF]" />
                <span>Mini Dialer CTI</span>
              </div>
            </div>

            {dialpadStatus?.connected ? (
              <div className="space-y-3">
                {dialpadStatus.miniDialerUrl && (
                  <div className="bg-[#F4F6F9] rounded px-3 py-2 text-sm">
                    <span className="text-[#706E6B]">Mini Dialer:</span>{" "}
                    <span className="font-medium text-green-600">Enabled</span>
                  </div>
                )}
                <p className="text-xs text-green-600">
                  Dialpad is connected. Use the phone button in the top nav to
                  open the Mini Dialer.
                </p>
                <button
                  onClick={handleDisconnectDialpad}
                  disabled={dialpadDisconnecting}
                  className="bc-btn bc-btn-destructive"
                >
                  <Unplug className="w-4 h-4" />
                  {dialpadDisconnecting ? "Disconnecting..." : "Disconnect"}
                </button>
              </div>
            ) : dialpadStatus?.configured ? (
              <div className="space-y-3">
                <button
                  onClick={handleConnectDialpad}
                  disabled={dialpadConnecting}
                  className="bc-btn bc-btn-primary"
                >
                  {dialpadConnecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4" />
                  )}
                  {dialpadConnecting ? "Connecting..." : "Connect Dialpad"}
                </button>
                <p className="text-xs text-[#706E6B]">
                  You will be redirected to Dialpad to authorize access.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2 text-sm text-amber-700">
                  Configure Dialpad by setting these environment variables:
                  <ul className="list-disc list-inside mt-1 text-xs font-mono">
                    <li>DIALPAD_CLIENT_ID</li>
                    <li>DIALPAD_CLIENT_SECRET</li>
                    <li>DIALPAD_CTI_CLIENT_ID (optional, for Mini Dialer)</li>
                  </ul>
                </div>
                <a
                  href="https://developers.dialpad.com/docs/oauth2"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bc-btn bc-btn-neutral inline-flex"
                >
                  <ExternalLink className="w-4 h-4" />
                  Dialpad Developer Docs
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Anthropic (Claude AI) Integration */}
        <div className="bc-card">
          <div className="bc-section-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#D4A27F] rounded flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              Anthropic (Claude AI)
            </div>
            {anthropicStatus?.connected ? (
              <span className="bc-badge bg-green-100 text-green-700">
                <Check className="w-3 h-3 mr-1" /> Connected
              </span>
            ) : (
              <span className="bc-badge bg-gray-100 text-gray-600">
                <X className="w-3 h-3 mr-1" /> Not Connected
              </span>
            )}
          </div>
          <div className="p-4">
            <p className="text-sm text-[#706E6B] mb-4">
              Connect your Anthropic API key to enable the AI CoPilot. Get
              pipeline summaries, draft emails, meeting prep, and intelligent
              suggestions powered by Claude.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Brain className="w-4 h-4 text-[#D4A27F]" />
                <span>Pipeline analysis</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-[#D4A27F]" />
                <span>Draft emails</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MessageCircle className="w-4 h-4 text-[#D4A27F]" />
                <span>AI CoPilot chat</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-[#D4A27F]" />
                <span>Smart suggestions</span>
              </div>
            </div>

            {anthropicStatus?.connected ? (
              <div className="space-y-3">
                <div className="bg-[#F4F6F9] rounded px-3 py-2 text-sm">
                  <span className="text-[#706E6B]">Status:</span>{" "}
                  <span className="font-medium text-green-600">
                    API key configured
                  </span>
                </div>
                <p className="text-xs text-green-600">
                  Claude AI is ready. Use the CoPilot button in the bottom-right
                  corner of any page.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleRemoveAnthropicKey}
                    disabled={anthropicRemoving}
                    className="bc-btn bc-btn-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                    {anthropicRemoving ? "Removing..." : "Remove Key"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={anthropicKey}
                    onChange={(e) => setAnthropicKey(e.target.value)}
                    placeholder="sk-ant-..."
                    className="bc-input flex-1 text-sm font-mono"
                  />
                  <button
                    onClick={handleSaveAnthropicKey}
                    disabled={!anthropicKey.trim() || anthropicSaving}
                    className="bc-btn bc-btn-primary"
                  >
                    {anthropicSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    {anthropicSaving ? "Saving..." : "Save"}
                  </button>
                </div>
                <p className="text-xs text-[#706E6B]">
                  Enter your Anthropic API key from{" "}
                  <a
                    href="https://console.anthropic.com/settings/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0070D2] hover:underline"
                  >
                    console.anthropic.com
                  </a>
                  . Your key is stored securely and only used for AI CoPilot
                  requests.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
