"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Save, Trash2, Tag } from "lucide-react";

interface TagData {
  id: string;
  name: string;
  color: string;
  _count?: {
    leads: number;
    contacts: number;
    accounts: number;
    deals: number;
  };
}

export default function TagsSettingsPage() {
  const [tags, setTags] = useState<TagData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3B82F6");
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", color: "" });
  const [error, setError] = useState("");

  const fetchTags = async () => {
    try {
      const res = await fetch("/api/tags");
      if (res.ok) {
        const data = await res.json();
        setTags(data);
      }
    } catch {
      setError("Failed to load tags");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    setError("");

    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      });

      if (res.ok) {
        setNewTagName("");
        setNewTagColor("#3B82F6");
        setShowNewTag(false);
        fetchTags();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create tag");
      }
    } catch {
      setError("Failed to create tag");
    }
  };

  const handleUpdateTag = async (id: string) => {
    if (!editForm.name.trim()) return;
    setError("");

    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editForm.name.trim(), color: editForm.color }),
      });

      if (res.ok) {
        setEditingTag(null);
        fetchTags();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update tag");
      }
    } catch {
      setError("Failed to update tag");
    }
  };

  const handleDeleteTag = async (id: string) => {
    const tag = tags.find((t) => t.id === id);
    const totalUsage = tag?._count
      ? tag._count.leads + tag._count.contacts + tag._count.accounts + tag._count.deals
      : 0;

    const message =
      totalUsage > 0
        ? `This tag is used on ${totalUsage} record(s). Delete it anyway?`
        : "Delete this tag?";

    if (!confirm(message)) return;
    setError("");

    try {
      const res = await fetch(`/api/tags/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchTags();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete tag");
      }
    } catch {
      setError("Failed to delete tag");
    }
  };

  const getContrastColor = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? "#1a1a1a" : "#ffffff";
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
          <h1 className="text-xl font-bold text-[#3E3E3C]">Tag Management</h1>
        </div>
        <button
          onClick={() => setShowNewTag(true)}
          className="bc-btn bc-btn-primary"
        >
          <Plus className="w-4 h-4" />
          New Tag
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded border border-red-200 mb-4">
          {error}
        </div>
      )}

      {/* New Tag Form */}
      {showNewTag && (
        <div className="bc-card mb-4 p-4">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={newTagColor}
              onChange={(e) => setNewTagColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-[#DDDBDA] flex-shrink-0"
            />
            <input
              className="bc-input flex-1"
              placeholder="Tag Name"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
              autoFocus
            />
            <button onClick={handleCreateTag} className="bc-btn bc-btn-primary">
              Create
            </button>
            <button
              onClick={() => {
                setShowNewTag(false);
                setNewTagName("");
                setNewTagColor("#3B82F6");
                setError("");
              }}
              className="bc-btn bc-btn-neutral"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tags Table */}
      <div className="bc-card">
        <div className="bc-section-header flex items-center gap-2">
          <Tag className="w-4 h-4" />
          All Tags ({tags.length})
        </div>

        {tags.length === 0 ? (
          <div className="p-8 text-center text-[#706E6B]">
            No tags yet. Create your first tag to start organizing records.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="bc-table">
              <thead>
                <tr>
                  <th>Tag</th>
                  <th>Color</th>
                  <th className="text-center">Leads</th>
                  <th className="text-center">Contacts</th>
                  <th className="text-center">Accounts</th>
                  <th className="text-center">Deals</th>
                  <th className="w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tags.map((tag) => (
                  <tr key={tag.id}>
                    {editingTag === tag.id ? (
                      <>
                        <td>
                          <input
                            className="bc-input"
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, name: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleUpdateTag(tag.id);
                              if (e.key === "Escape") setEditingTag(null);
                            }}
                            autoFocus
                          />
                        </td>
                        <td>
                          <input
                            type="color"
                            value={editForm.color}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, color: e.target.value }))
                            }
                            className="w-8 h-8 rounded cursor-pointer border border-[#DDDBDA]"
                          />
                        </td>
                        <td className="text-center text-[#706E6B]">
                          {tag._count?.leads ?? 0}
                        </td>
                        <td className="text-center text-[#706E6B]">
                          {tag._count?.contacts ?? 0}
                        </td>
                        <td className="text-center text-[#706E6B]">
                          {tag._count?.accounts ?? 0}
                        </td>
                        <td className="text-center text-[#706E6B]">
                          {tag._count?.deals ?? 0}
                        </td>
                        <td>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleUpdateTag(tag.id)}
                              className="bc-btn bc-btn-primary text-xs py-1 px-2"
                            >
                              <Save className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingTag(null);
                                setError("");
                              }}
                              className="bc-btn bc-btn-neutral text-xs py-1 px-2"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: tag.color,
                              color: getContrastColor(tag.color),
                            }}
                          >
                            {tag.name}
                          </span>
                        </td>
                        <td>
                          <div
                            className="w-6 h-6 rounded border border-[#DDDBDA]"
                            style={{ backgroundColor: tag.color }}
                          />
                        </td>
                        <td className="text-center text-[#706E6B]">
                          {tag._count?.leads ?? 0}
                        </td>
                        <td className="text-center text-[#706E6B]">
                          {tag._count?.contacts ?? 0}
                        </td>
                        <td className="text-center text-[#706E6B]">
                          {tag._count?.accounts ?? 0}
                        </td>
                        <td className="text-center text-[#706E6B]">
                          {tag._count?.deals ?? 0}
                        </td>
                        <td>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setEditingTag(tag.id);
                                setEditForm({
                                  name: tag.name,
                                  color: tag.color,
                                });
                                setError("");
                              }}
                              className="text-[#0070D2] hover:text-[#005FB2] text-xs font-semibold"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTag(tag.id)}
                              className="text-[#C23934] hover:text-[#A61A14] text-xs font-semibold ml-2"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
