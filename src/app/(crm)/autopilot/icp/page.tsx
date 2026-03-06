"use client";

import { useEffect, useState, KeyboardEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Save,
  Trash2,
  X,
  Target,
  Pencil,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

interface IcpProfile {
  id: string;
  name: string;
  industries: string | null;
  companySize: string | null;
  roles: string | null;
  regions: string | null;
  keywords: string | null;
  excludeKeywords: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface IcpForm {
  name: string;
  industries: string[];
  companySize: string;
  roles: string[];
  regions: string[];
  keywords: string[];
  excludeKeywords: string[];
  isActive: boolean;
}

const EMPTY_FORM: IcpForm = {
  name: "",
  industries: [],
  companySize: "",
  roles: [],
  regions: [],
  keywords: [],
  excludeKeywords: [],
  isActive: true,
};

const COMPANY_SIZE_OPTIONS = [
  { value: "", label: "Select company size..." },
  { value: "1-50", label: "1-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "201-1000", label: "201-1,000 employees" },
  { value: "1001-5000", label: "1,001-5,000 employees" },
  { value: "5000+", label: "5,000+ employees" },
];

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function ChipInput({
  label,
  placeholder,
  values,
  onChange,
}: {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [input, setInput] = useState("");

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = input.trim();
      if (trimmed && !values.includes(trimmed)) {
        onChange([...values, trimmed]);
      }
      setInput("");
    }
  };

  const removeChip = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="bc-label">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {values.map((v, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#E8F4FC] text-[#0070D2] rounded-full text-xs font-medium"
          >
            {v}
            <button
              type="button"
              onClick={() => removeChip(i)}
              className="text-[#0070D2] hover:text-[#005FB2] ml-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <input
        className="bc-input"
        placeholder={placeholder}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <p className="text-xs text-[#706E6B] mt-1">
        Type and press Enter to add
      </p>
    </div>
  );
}

export default function IcpConfigPage() {
  const [profiles, setProfiles] = useState<IcpProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<IcpForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchProfiles = async () => {
    try {
      const res = await fetch("/api/agents/icp");
      if (res.ok) {
        const data = await res.json();
        setProfiles(data);
      }
    } catch {
      setError("Failed to load ICP profiles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowNew(false);
    setError("");
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setError("Profile name is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/agents/icp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          industries: form.industries.length > 0 ? form.industries : null,
          companySize: form.companySize || null,
          roles: form.roles.length > 0 ? form.roles : null,
          regions: form.regions.length > 0 ? form.regions : null,
          keywords: form.keywords.length > 0 ? form.keywords : null,
          excludeKeywords: form.excludeKeywords.length > 0 ? form.excludeKeywords : null,
        }),
      });

      if (res.ok) {
        resetForm();
        fetchProfiles();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create profile");
      }
    } catch {
      setError("Failed to create profile");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    if (!form.name.trim()) {
      setError("Profile name is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/agents/icp/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          industries: form.industries.length > 0 ? form.industries : null,
          companySize: form.companySize || null,
          roles: form.roles.length > 0 ? form.roles : null,
          regions: form.regions.length > 0 ? form.regions : null,
          keywords: form.keywords.length > 0 ? form.keywords : null,
          excludeKeywords: form.excludeKeywords.length > 0 ? form.excludeKeywords : null,
          isActive: form.isActive,
        }),
      });

      if (res.ok) {
        resetForm();
        fetchProfiles();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update profile");
      }
    } catch {
      setError("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this ICP profile?")) return;

    try {
      const res = await fetch(`/api/agents/icp/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (editingId === id) resetForm();
        fetchProfiles();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete profile");
      }
    } catch {
      setError("Failed to delete profile");
    }
  };

  const handleToggleActive = async (profile: IcpProfile) => {
    try {
      const res = await fetch(`/api/agents/icp/${profile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !profile.isActive }),
      });

      if (res.ok) {
        fetchProfiles();
      }
    } catch {
      setError("Failed to toggle profile status");
    }
  };

  const startEdit = (profile: IcpProfile) => {
    setEditingId(profile.id);
    setShowNew(false);
    setForm({
      name: profile.name,
      industries: parseJsonArray(profile.industries),
      companySize: profile.companySize || "",
      roles: parseJsonArray(profile.roles),
      regions: parseJsonArray(profile.regions),
      keywords: parseJsonArray(profile.keywords),
      excludeKeywords: parseJsonArray(profile.excludeKeywords),
      isActive: profile.isActive,
    });
    setError("");
  };

  const startNew = () => {
    setEditingId(null);
    setShowNew(true);
    setForm(EMPTY_FORM);
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
            href="/autopilot"
            className="text-[#706E6B] hover:text-[#3E3E3C]"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Target className="w-5 h-5 text-[#706E6B]" />
          <h1 className="text-xl font-bold text-[#3E3E3C]">
            Ideal Customer Profiles
          </h1>
        </div>
        <button onClick={startNew} className="bc-btn bc-btn-primary">
          <Plus className="w-4 h-4" />
          New Profile
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded border border-red-200 mb-4">
          {error}
        </div>
      )}

      {/* Profile Editor */}
      {(showNew || editingId) && (
        <div className="bc-card mb-6">
          <div className="bc-section-header flex items-center justify-between">
            <span>{editingId ? "Edit ICP Profile" : "New ICP Profile"}</span>
            <button
              onClick={resetForm}
              className="text-[#706E6B] hover:text-[#3E3E3C]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 space-y-4">
            {/* Name */}
            <div>
              <label className="bc-label">Profile Name</label>
              <input
                className="bc-input"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder='e.g., "Enterprise SaaS Companies"'
                autoFocus
              />
            </div>

            {/* Target Industries */}
            <ChipInput
              label="Target Industries"
              placeholder='e.g., "SaaS", "Healthcare", "FinTech"'
              values={form.industries}
              onChange={(industries) => setForm((f) => ({ ...f, industries }))}
            />

            {/* Company Size */}
            <div>
              <label className="bc-label">Company Size</label>
              <select
                className="bc-input"
                value={form.companySize}
                onChange={(e) =>
                  setForm((f) => ({ ...f, companySize: e.target.value }))
                }
              >
                {COMPANY_SIZE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Roles/Titles */}
            <ChipInput
              label="Target Roles / Titles"
              placeholder='e.g., "VP Sales", "CTO", "Head of Engineering"'
              values={form.roles}
              onChange={(roles) => setForm((f) => ({ ...f, roles }))}
            />

            {/* Target Regions */}
            <ChipInput
              label="Target Regions"
              placeholder='e.g., "United States", "Florida", "Northeast"'
              values={form.regions}
              onChange={(regions) => setForm((f) => ({ ...f, regions }))}
            />

            {/* Keywords */}
            <ChipInput
              label="Keywords"
              placeholder='e.g., "hiring", "growth", "series B"'
              values={form.keywords}
              onChange={(keywords) => setForm((f) => ({ ...f, keywords }))}
            />

            {/* Exclude Keywords */}
            <ChipInput
              label="Exclude Keywords"
              placeholder='e.g., "non-profit", "government"'
              values={form.excludeKeywords}
              onChange={(excludeKeywords) =>
                setForm((f) => ({ ...f, excludeKeywords }))
              }
            />

            {/* Active Toggle */}
            {editingId && (
              <div className="flex items-center gap-3">
                <label className="bc-label mb-0">Active</label>
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, isActive: !f.isActive }))
                  }
                  className="text-[#706E6B] hover:text-[#3E3E3C]"
                >
                  {form.isActive ? (
                    <ToggleRight className="w-8 h-8 text-[#04844B]" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-[#706E6B]" />
                  )}
                </button>
                <span className="text-sm text-[#706E6B]">
                  {form.isActive ? "Enabled" : "Disabled"}
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
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
                    ? "Update Profile"
                    : "Create Profile"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profiles List */}
      {profiles.length > 0 ? (
        <div className="space-y-3">
          {profiles.map((profile) => (
            <div key={profile.id} className="bc-card">
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-[#3E3E3C] truncate">
                        {profile.name}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          profile.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {profile.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      {profile.companySize && (
                        <div>
                          <span className="text-[#706E6B]">Company Size: </span>
                          <span className="text-[#3E3E3C]">{profile.companySize}</span>
                        </div>
                      )}
                      {profile.industries && (
                        <div>
                          <span className="text-[#706E6B]">Industries: </span>
                          <span className="text-[#3E3E3C]">
                            {parseJsonArray(profile.industries).join(", ")}
                          </span>
                        </div>
                      )}
                      {profile.roles && (
                        <div>
                          <span className="text-[#706E6B]">Roles: </span>
                          <span className="text-[#3E3E3C]">
                            {parseJsonArray(profile.roles).join(", ")}
                          </span>
                        </div>
                      )}
                      {profile.regions && (
                        <div>
                          <span className="text-[#706E6B]">Regions: </span>
                          <span className="text-[#3E3E3C]">
                            {parseJsonArray(profile.regions).join(", ")}
                          </span>
                        </div>
                      )}
                      {profile.keywords && (
                        <div>
                          <span className="text-[#706E6B]">Keywords: </span>
                          <span className="text-[#3E3E3C]">
                            {parseJsonArray(profile.keywords).join(", ")}
                          </span>
                        </div>
                      )}
                      {profile.excludeKeywords && (
                        <div>
                          <span className="text-[#706E6B]">Exclude: </span>
                          <span className="text-[#3E3E3C]">
                            {parseJsonArray(profile.excludeKeywords).join(", ")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleToggleActive(profile)}
                      className="text-[#706E6B] hover:text-[#3E3E3C]"
                      title={profile.isActive ? "Deactivate" : "Activate"}
                    >
                      {profile.isActive ? (
                        <ToggleRight className="w-6 h-6 text-[#04844B]" />
                      ) : (
                        <ToggleLeft className="w-6 h-6" />
                      )}
                    </button>
                    <button
                      onClick={() => startEdit(profile)}
                      className="text-[#0070D2] hover:text-[#005FB2]"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(profile.id)}
                      className="text-[#C23934] hover:text-[#A61A14]"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !showNew && (
          <div className="bc-card p-8 text-center text-[#706E6B]">
            <Target className="w-10 h-10 mx-auto mb-3 text-[#C9C7C5]" />
            <p className="mb-1">No ICP profiles yet.</p>
            <p className="text-sm">
              Define your Ideal Customer Profile to help the Prospector agent
              find the right leads automatically.
            </p>
          </div>
        )
      )}
    </div>
  );
}
