"use client";

import { useState } from "react";
import { Trash2, Edit, X, ChevronDown } from "lucide-react";

interface UpdateOption {
  label: string;
  value: string;
}

interface UpdateField {
  key: string;
  label: string;
  options: UpdateOption[];
}

interface BulkActionBarProps {
  selectedIds: string[];
  entityType: "leads" | "contacts" | "accounts" | "deals";
  onComplete: () => void;
  onClear: () => void;
  updateFields?: UpdateField[];
}

export default function BulkActionBar({
  selectedIds,
  entityType,
  onComplete,
  onClear,
  updateFields = [],
}: BulkActionBarProps) {
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpdateMenu, setShowUpdateMenu] = useState(false);
  const [activeField, setActiveField] = useState<UpdateField | null>(null);

  const count = selectedIds.length;

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/${entityType}/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids: selectedIds }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Delete failed");
      }
      setShowDeleteConfirm(false);
      onComplete();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fieldKey: string, value: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/${entityType}/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          ids: selectedIds,
          data: { [fieldKey]: value },
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Update failed");
      }
      setShowUpdateMenu(false);
      setActiveField(null);
      onComplete();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  if (count === 0) return null;

  return (
    <>
      {/* Bulk Action Bar */}
      <div className="bc-card mb-4 border-[#0070D2] bg-[#E8F4FC]">
        <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-[#0070D2]">
            {count} {count === 1 ? "record" : "records"} selected
          </span>

          <div className="flex items-center gap-2 ml-auto">
            {/* Update Button */}
            {updateFields.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowUpdateMenu(!showUpdateMenu);
                    setActiveField(null);
                  }}
                  disabled={loading}
                  className="bc-btn bc-btn-neutral text-xs"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Update
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showUpdateMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-[#DDDBDA] rounded shadow-lg z-50 min-w-[200px]">
                    {!activeField ? (
                      // Show field choices
                      <div className="py-1">
                        {updateFields.map((field) => (
                          <button
                            key={field.key}
                            onClick={() => setActiveField(field)}
                            className="w-full text-left px-4 py-2 text-sm text-[#3E3E3C] hover:bg-[#F4F6F9] transition-colors"
                          >
                            {field.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      // Show field value choices
                      <div className="py-1">
                        <div className="px-4 py-2 text-xs font-semibold text-[#706E6B] uppercase border-b border-[#DDDBDA]">
                          {activeField.label}
                        </div>
                        {activeField.options.map((option) => (
                          <button
                            key={option.value}
                            onClick={() =>
                              handleUpdate(activeField.key, option.value)
                            }
                            disabled={loading}
                            className="w-full text-left px-4 py-2 text-sm text-[#3E3E3C] hover:bg-[#F4F6F9] transition-colors disabled:opacity-50"
                          >
                            {option.label}
                          </button>
                        ))}
                        <button
                          onClick={() => setActiveField(null)}
                          className="w-full text-left px-4 py-2 text-xs text-[#706E6B] hover:bg-[#F4F6F9] border-t border-[#DDDBDA]"
                        >
                          &larr; Back
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Delete Button */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={loading}
              className="bc-btn bc-btn-destructive text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>

            {/* Deselect All */}
            <button
              onClick={onClear}
              disabled={loading}
              className="bc-btn bc-btn-neutral text-xs"
            >
              <X className="w-3.5 h-3.5" />
              Deselect All
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl border border-[#DDDBDA] max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-bold text-[#3E3E3C] mb-2">
              Confirm Deletion
            </h3>
            <p className="text-sm text-[#706E6B] mb-6">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-[#3E3E3C]">{count}</span>{" "}
              {count === 1 ? "record" : "records"}? This action cannot be
              undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
                className="bc-btn bc-btn-neutral"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="bc-btn bc-btn-destructive"
              >
                {loading ? "Deleting..." : `Delete ${count} Records`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click-away handler for update menu */}
      {showUpdateMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowUpdateMenu(false);
            setActiveField(null);
          }}
        />
      )}
    </>
  );
}
