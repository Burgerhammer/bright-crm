"use client";

import { useState, useEffect, useRef } from "react";
import { X, Plus, ChevronDown } from "lucide-react";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagManagerProps {
  entityType: string;
  entityId: string;
  initialTags: Tag[];
}

export default function TagManager({
  entityType,
  entityId,
  initialTags,
}: TagManagerProps) {
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newTagColor, setNewTagColor] = useState("#3B82F6");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showDropdown) {
      fetchAllTags();
      // Focus search input when dropdown opens
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [showDropdown]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
        setSearch("");
        setCreating(false);
      }
    }
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showDropdown]);

  const fetchAllTags = async () => {
    try {
      const res = await fetch("/api/tags");
      if (res.ok) {
        const data = await res.json();
        setAllTags(data);
      }
    } catch {
      // silently fail
    }
  };

  const handleAddTag = async (tagId: string) => {
    try {
      const res = await fetch(`/api/${entityType}/${entityId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId }),
      });
      if (res.ok) {
        const updatedTags = await res.json();
        setTags(updatedTags);
      }
    } catch {
      // silently fail
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      const res = await fetch(`/api/${entityType}/${entityId}/tags`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId }),
      });
      if (res.ok) {
        const updatedTags = await res.json();
        setTags(updatedTags);
      }
    } catch {
      // silently fail
    }
  };

  const handleCreateAndAdd = async () => {
    if (!search.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: search.trim(), color: newTagColor }),
      });
      if (res.ok) {
        const newTag = await res.json();
        await handleAddTag(newTag.id);
        setAllTags((prev) => [...prev, newTag]);
        setSearch("");
        setNewTagColor("#3B82F6");
      }
    } catch {
      // silently fail
    } finally {
      setCreating(false);
    }
  };

  // Get text color that contrasts with background
  const getContrastColor = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? "#1a1a1a" : "#ffffff";
  };

  const assignedTagIds = new Set(tags.map((t) => t.id));
  const filteredTags = allTags.filter(
    (t) =>
      !assignedTagIds.has(t.id) &&
      t.name.toLowerCase().includes(search.toLowerCase())
  );
  const exactMatch = allTags.some(
    (t) => t.name.toLowerCase() === search.trim().toLowerCase()
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
          style={{
            backgroundColor: tag.color,
            color: getContrastColor(tag.color),
          }}
        >
          {tag.name}
          <button
            type="button"
            onClick={() => handleRemoveTag(tag.id)}
            className="hover:opacity-70 transition-opacity"
            title={`Remove ${tag.name}`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium border border-dashed border-[#DDDBDA] text-[#706E6B] hover:border-[#0070D2] hover:text-[#0070D2] transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add Tag
          <ChevronDown className="w-3 h-3" />
        </button>

        {showDropdown && (
          <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-[#DDDBDA] rounded-lg shadow-lg z-50">
            <div className="p-2 border-b border-[#DDDBDA]">
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search or create tag..."
                className="w-full text-sm px-2 py-1.5 border border-[#DDDBDA] rounded focus:outline-none focus:ring-1 focus:ring-[#0070D2] focus:border-[#0070D2]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && search.trim() && !exactMatch) {
                    handleCreateAndAdd();
                  }
                }}
              />
            </div>

            <div className="max-h-48 overflow-y-auto">
              {filteredTags.length === 0 && !search.trim() && (
                <div className="px-3 py-4 text-xs text-[#706E6B] text-center italic">
                  No tags available. Type to create one.
                </div>
              )}

              {filteredTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    handleAddTag(tag.id);
                    setSearch("");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-[#F4F6F9] transition-colors"
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-[#3E3E3C] truncate">{tag.name}</span>
                </button>
              ))}

              {search.trim() && !exactMatch && (
                <div className="border-t border-[#DDDBDA]">
                  <div className="px-3 py-2 flex items-center gap-2">
                    <input
                      type="color"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border border-[#DDDBDA] flex-shrink-0"
                      title="Pick tag color"
                    />
                    <button
                      type="button"
                      onClick={handleCreateAndAdd}
                      disabled={creating}
                      className="flex-1 text-left text-sm text-[#0070D2] hover:text-[#005FB2] font-medium"
                    >
                      {creating ? "Creating..." : `Create "${search.trim()}"`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
