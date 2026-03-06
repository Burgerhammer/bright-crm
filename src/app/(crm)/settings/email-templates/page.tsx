"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Mail,
  Pencil,
  X,
} from "lucide-react";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

const AVAILABLE_VARIABLES = [
  { variable: "{{firstName}}", description: "Contact first name" },
  { variable: "{{lastName}}", description: "Contact last name" },
  { variable: "{{email}}", description: "Contact email" },
  { variable: "{{company}}", description: "Company / account name" },
  { variable: "{{title}}", description: "Contact job title" },
  { variable: "{{dealName}}", description: "Deal name" },
  { variable: "{{dealAmount}}", description: "Deal amount" },
];

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "", body: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchTemplates = async () => {
    const res = await fetch("/api/email-templates");
    if (res.ok) {
      const data = await res.json();
      setTemplates(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const resetForm = () => {
    setForm({ name: "", subject: "", body: "" });
    setEditingId(null);
    setShowNew(false);
    setError("");
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) {
      setError("All fields are required");
      return;
    }

    setSaving(true);
    setError("");

    const res = await fetch("/api/email-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      resetForm();
      fetchTemplates();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to create template");
    }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) {
      setError("All fields are required");
      return;
    }

    setSaving(true);
    setError("");

    const res = await fetch(`/api/email-templates/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      resetForm();
      fetchTemplates();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to update template");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this email template?")) return;

    const res = await fetch(`/api/email-templates/${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      if (editingId === id) resetForm();
      fetchTemplates();
    }
  };

  const startEdit = (template: EmailTemplate) => {
    setEditingId(template.id);
    setShowNew(false);
    setForm({
      name: template.name,
      subject: template.subject,
      body: template.body,
    });
    setError("");
  };

  const startNew = () => {
    setEditingId(null);
    setShowNew(true);
    setForm({ name: "", subject: "", body: "" });
    setError("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#706E6B]">
        Loading...
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="text-[#706E6B] hover:text-[#3E3E3C]"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Mail className="w-5 h-5 text-[#706E6B]" />
          <h1 className="text-xl font-bold text-[#3E3E3C]">
            Email Templates
          </h1>
        </div>
        <button onClick={startNew} className="bc-btn bc-btn-primary">
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      {/* Template Editor */}
      {(showNew || editingId) && (
        <div className="bc-card mb-6">
          <div className="bc-section-header flex items-center justify-between">
            <span>{editingId ? "Edit Template" : "New Template"}</span>
            <button
              onClick={resetForm}
              className="text-[#706E6B] hover:text-[#3E3E3C]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded border border-red-200">
                {error}
              </div>
            )}

            <div>
              <label className="bc-label">Template Name</label>
              <input
                className="bc-input"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Introduction Email, Follow-Up, Proposal"
                autoFocus
              />
            </div>

            <div>
              <label className="bc-label">Subject</label>
              <input
                className="bc-input"
                value={form.subject}
                onChange={(e) =>
                  setForm((f) => ({ ...f, subject: e.target.value }))
                }
                placeholder="e.g. Hi {{firstName}}, let's connect"
              />
            </div>

            <div>
              <label className="bc-label">Body</label>
              <textarea
                className="bc-input min-h-[200px]"
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Write your email template here. Use variables like {{firstName}} to personalize."
              />
            </div>

            {/* Available Variables */}
            <div className="bg-[#F4F6F9] rounded p-3">
              <p className="text-xs font-semibold text-[#706E6B] mb-2">
                Available Variables
              </p>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_VARIABLES.map((v) => (
                  <button
                    key={v.variable}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, body: f.body + v.variable }))
                    }
                    className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-[#DDDBDA] rounded text-xs text-[#3E3E3C] hover:bg-[#F4F6F9] transition-colors"
                    title={v.description}
                  >
                    <span className="font-mono text-[#0070D2]">
                      {v.variable}
                    </span>
                    <span className="text-[#706E6B]">- {v.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={resetForm} className="bc-btn bc-btn-neutral">
                Cancel
              </button>
              <button
                onClick={editingId ? handleUpdate : handleCreate}
                disabled={saving}
                className="bc-btn bc-btn-primary"
              >
                <Save className="w-4 h-4" />
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Template"
                    : "Create Template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates List */}
      {templates.length > 0 ? (
        <div className="bc-card">
          <div className="bc-section-header">Templates</div>
          <div className="overflow-x-auto">
            <table className="bc-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Subject</th>
                  <th>Created</th>
                  <th className="w-28">Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template.id}>
                    <td className="font-medium text-[#3E3E3C]">
                      {template.name}
                    </td>
                    <td className="text-[#706E6B]">
                      {template.subject.length > 60
                        ? template.subject.slice(0, 60) + "..."
                        : template.subject}
                    </td>
                    <td className="text-[#706E6B] text-sm">
                      {new Date(template.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(template)}
                          className="text-[#0070D2] hover:text-[#005FB2] text-xs font-semibold flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(template.id)}
                          className="text-[#C23934] hover:text-[#A61A14] text-xs font-semibold flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        !showNew && (
          <div className="bc-card p-8 text-center text-[#706E6B]">
            <Mail className="w-10 h-10 mx-auto mb-3 text-[#C9C7C5]" />
            <p className="mb-1">No email templates yet.</p>
            <p className="text-sm">
              Create templates to speed up your email outreach with reusable
              messages and variable placeholders.
            </p>
          </div>
        )
      )}
    </div>
  );
}
