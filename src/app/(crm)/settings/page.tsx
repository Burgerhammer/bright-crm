"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { Settings, GitBranch, User, Save, Plug, Mail, Tag, Copy, Layers, FileText } from "lucide-react";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [name, setName] = useState(session?.user?.name || "");
  const [email, setEmail] = useState(session?.user?.email || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/auth/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });
    if (res.ok) {
      setMessage("Profile updated successfully");
      await update();
    } else {
      const data = await res.json();
      setMessage(data.error || "Failed to update profile");
    }
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-6 h-6 text-[#706E6B]" />
        <h1 className="text-xl font-bold text-[#3E3E3C]">Settings</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile */}
        <div className="bc-card">
          <div className="bc-section-header flex items-center gap-2">
            <User className="w-4 h-4" />
            My Profile
          </div>
          <div className="p-4">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="bc-label">Name</label>
                <input
                  className="bc-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="bc-label">Email</label>
                <input
                  className="bc-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="bc-label">Role</label>
                <input
                  className="bc-input bg-[#F4F6F9]"
                  value={session?.user?.role || "user"}
                  disabled
                />
              </div>
              {message && (
                <div
                  className={`text-sm px-3 py-2 rounded ${
                    message.includes("success")
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {message}
                </div>
              )}
              <button
                type="submit"
                disabled={saving}
                className="bc-btn bc-btn-primary"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </form>
          </div>
        </div>

        {/* Pipeline Management */}
        <div className="bc-card">
          <div className="bc-section-header flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Pipeline Management
          </div>
          <div className="p-4">
            <p className="text-sm text-[#706E6B] mb-4">
              Configure your sales pipelines and stages. Define the stages deals
              move through from prospecting to close.
            </p>
            <Link href="/settings/pipelines" className="bc-btn bc-btn-neutral">
              Manage Pipelines
            </Link>
          </div>
        </div>

        {/* Integrations */}
        <div className="bc-card">
          <div className="bc-section-header flex items-center gap-2">
            <Plug className="w-4 h-4" />
            Integrations
          </div>
          <div className="p-4">
            <p className="text-sm text-[#706E6B] mb-4">
              Connect Gmail, Google Calendar, and Twilio for email, scheduling,
              phone calls, and SMS directly from the CRM.
            </p>
            <Link
              href="/settings/integrations"
              className="bc-btn bc-btn-neutral"
            >
              Manage Integrations
            </Link>
          </div>
        </div>

        {/* Tags */}
        <div className="bc-card">
          <div className="bc-section-header flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Tags
          </div>
          <div className="p-4">
            <p className="text-sm text-[#706E6B] mb-4">
              Create and manage tags to organize your leads, contacts, accounts,
              and deals. Apply color-coded labels for quick visual identification.
            </p>
            <Link href="/settings/tags" className="bc-btn bc-btn-neutral">
              Manage Tags
            </Link>
          </div>
        </div>

        {/* Email Templates */}
        <div className="bc-card">
          <div className="bc-section-header flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email Templates
          </div>
          <div className="p-4">
            <p className="text-sm text-[#706E6B] mb-4">
              Create reusable email templates with variable placeholders to
              speed up your outreach and ensure consistent messaging.
            </p>
            <Link
              href="/settings/email-templates"
              className="bc-btn bc-btn-neutral"
            >
              Manage Templates
            </Link>
          </div>
        </div>

        {/* Custom Fields */}
        <div className="bc-card">
          <div className="bc-section-header flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Custom Fields
          </div>
          <div className="p-4">
            <p className="text-sm text-[#706E6B] mb-4">
              Define custom fields to track additional data on leads, contacts,
              accounts, and deals. Supports text, number, date, dropdown, and
              boolean field types.
            </p>
            <Link
              href="/settings/custom-fields"
              className="bc-btn bc-btn-neutral"
            >
              Manage Custom Fields
            </Link>
          </div>
        </div>

        {/* Duplicate Detection */}
        <div className="bc-card">
          <div className="bc-section-header flex items-center gap-2">
            <Copy className="w-4 h-4" />
            Duplicate Detection
          </div>
          <div className="p-4">
            <p className="text-sm text-[#706E6B] mb-4">
              Scan your leads and contacts for potential duplicate records.
              Find and review matches by email, phone, or name.
            </p>
            <Link
              href="/settings/duplicates"
              className="bc-btn bc-btn-neutral"
            >
              View Duplicates
            </Link>
          </div>
        </div>

        {/* Audit Log */}
        <div className="bc-card">
          <div className="bc-section-header flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Audit Log
          </div>
          <div className="p-4">
            <p className="text-sm text-[#706E6B] mb-4">
              View a detailed history of all changes made to leads, contacts,
              accounts, deals, and tasks. Track who changed what and when.
            </p>
            <Link
              href="/settings/audit-log"
              className="bc-btn bc-btn-neutral"
            >
              View Audit Log
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
