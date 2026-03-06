"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Pencil,
  ChevronUp,
  ChevronDown,
  X,
  Layers,
} from "lucide-react";

interface CustomField {
  id: string;
  name: string;
  fieldType: string;
  entityType: string;
  options: string | null;
  required: boolean;
  order: number;
}

const ENTITY_TYPES = ["Lead", "Contact", "Account", "Deal"];
const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Select (Dropdown)" },
  { value: "boolean", label: "Boolean (Yes/No)" },
];

export default function CustomFieldsSettingsPage() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);

  // Create form state
  const [createForm, setCreateForm] = useState({
    name: "",
    fieldType: "text",
    entityType: "Lead",
    options: "",
    required: false,
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: "",
    fieldType: "text",
    entityType: "Lead",
    options: "",
    required: false,
  });

  const [error, setError] = useState("");

  const fetchFields = async () => {
    try {
      const res = await fetch("/api/custom-fields");
      if (res.ok) {
        const data = await res.json();
        setFields(data);
      }
    } catch {
      console.error("Failed to fetch custom fields");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, []);

  const handleCreate = async () => {
    if (!createForm.name.trim()) {
      setError("Name is required");
      return;
    }

    setError("");

    let options: string | null = null;
    if (createForm.fieldType === "select") {
      const optionsList = createForm.options
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);
      if (optionsList.length === 0) {
        setError("At least one option is required for select fields");
        return;
      }
      options = JSON.stringify(optionsList);
    }

    // Determine order: max order + 1 for the entity type
    const entityFields = fields.filter(
      (f) => f.entityType === createForm.entityType
    );
    const maxOrder = entityFields.length
      ? Math.max(...entityFields.map((f) => f.order))
      : -1;

    const res = await fetch("/api/custom-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: createForm.name,
        fieldType: createForm.fieldType,
        entityType: createForm.entityType,
        options,
        required: createForm.required,
        order: maxOrder + 1,
      }),
    });

    if (res.ok) {
      setShowCreateForm(false);
      setCreateForm({
        name: "",
        fieldType: "text",
        entityType: "Lead",
        options: "",
        required: false,
      });
      fetchFields();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to create custom field");
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editForm.name.trim()) {
      setError("Name is required");
      return;
    }

    setError("");

    let options: string | null = null;
    if (editForm.fieldType === "select") {
      const optionsList = editForm.options
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);
      if (optionsList.length === 0) {
        setError("At least one option is required for select fields");
        return;
      }
      options = JSON.stringify(optionsList);
    }

    const res = await fetch(`/api/custom-fields/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        fieldType: editForm.fieldType,
        entityType: editForm.entityType,
        options,
        required: editForm.required,
      }),
    });

    if (res.ok) {
      setEditingField(null);
      fetchFields();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to update custom field");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `Delete custom field "${name}"? All stored values for this field will also be deleted.`
      )
    )
      return;

    const res = await fetch(`/api/custom-fields/${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchFields();
    }
  };

  const handleMoveOrder = async (
    id: string,
    entityType: string,
    direction: "up" | "down"
  ) => {
    const entityFields = fields
      .filter((f) => f.entityType === entityType)
      .sort((a, b) => a.order - b.order);
    const idx = entityFields.findIndex((f) => f.id === id);
    if (idx === -1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= entityFields.length) return;

    const currentField = entityFields[idx];
    const swapField = entityFields[swapIdx];

    // Swap orders
    await Promise.all([
      fetch(`/api/custom-fields/${currentField.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: swapField.order }),
      }),
      fetch(`/api/custom-fields/${swapField.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: currentField.order }),
      }),
    ]);

    fetchFields();
  };

  // Group fields by entity type
  const groupedFields: Record<string, CustomField[]> = {};
  ENTITY_TYPES.forEach((type) => {
    const typeFields = fields.filter((f) => f.entityType === type);
    if (typeFields.length > 0) {
      groupedFields[type] = typeFields.sort((a, b) => a.order - b.order);
    }
  });

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
          <h1 className="text-xl font-bold text-[#3E3E3C]">Custom Fields</h1>
        </div>
        <button
          onClick={() => {
            setShowCreateForm(true);
            setError("");
          }}
          className="bc-btn bc-btn-primary"
        >
          <Plus className="w-4 h-4" />
          New Custom Field
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2">
          {error}
          <button
            onClick={() => setError("")}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="bc-card mb-4">
          <div className="bc-section-header flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Custom Field
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="bc-label">
                  Field Name <span className="text-red-500">*</span>
                </label>
                <input
                  className="bc-input"
                  placeholder="e.g., LinkedIn URL"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, name: e.target.value }))
                  }
                  autoFocus
                />
              </div>
              <div>
                <label className="bc-label">
                  Entity Type <span className="text-red-500">*</span>
                </label>
                <select
                  className="bc-input"
                  value={createForm.entityType}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, entityType: e.target.value }))
                  }
                >
                  {ENTITY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="bc-label">
                  Field Type <span className="text-red-500">*</span>
                </label>
                <select
                  className="bc-input"
                  value={createForm.fieldType}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, fieldType: e.target.value }))
                  }
                >
                  {FIELD_TYPES.map((ft) => (
                    <option key={ft.value} value={ft.value}>
                      {ft.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  id="create-required"
                  checked={createForm.required}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, required: e.target.checked }))
                  }
                  className="w-4 h-4 rounded border-[#DDDBDA] text-[#0070D2] focus:ring-[#0070D2]"
                />
                <label
                  htmlFor="create-required"
                  className="text-sm text-[#3E3E3C] cursor-pointer"
                >
                  Required field
                </label>
              </div>
            </div>
            {createForm.fieldType === "select" && (
              <div>
                <label className="bc-label">
                  Options <span className="text-red-500">*</span>
                </label>
                <input
                  className="bc-input"
                  placeholder="Option 1, Option 2, Option 3"
                  value={createForm.options}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, options: e.target.value }))
                  }
                />
                <p className="text-xs text-[#706E6B] mt-1">
                  Enter options separated by commas
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="bc-btn bc-btn-primary"
              >
                <Save className="w-4 h-4" />
                Create Field
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setError("");
                  setCreateForm({
                    name: "",
                    fieldType: "text",
                    entityType: "Lead",
                    options: "",
                    required: false,
                  });
                }}
                className="bc-btn bc-btn-neutral"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grouped Fields */}
      {Object.keys(groupedFields).length === 0 && !showCreateForm && (
        <div className="bc-card p-8 text-center text-[#706E6B]">
          No custom fields yet. Create your first custom field to extend your
          CRM data.
        </div>
      )}

      {ENTITY_TYPES.map((entityType) => {
        const typeFields = groupedFields[entityType];
        if (!typeFields) return null;

        return (
          <div key={entityType} className="bc-card mb-4">
            <div className="bc-section-header flex items-center gap-2">
              <Layers className="w-4 h-4" />
              {entityType} Fields ({typeFields.length})
            </div>
            <div className="p-2 overflow-x-auto">
              <table className="bc-table">
                <thead>
                  <tr>
                    <th className="w-20">Order</th>
                    <th>Name</th>
                    <th className="w-32">Type</th>
                    <th className="w-24">Required</th>
                    <th>Options</th>
                    <th className="w-32">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {typeFields.map((field, idx) => (
                    <tr key={field.id}>
                      {editingField === field.id ? (
                        <>
                          <td className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() =>
                                  handleMoveOrder(
                                    field.id,
                                    entityType,
                                    "up"
                                  )
                                }
                                disabled={idx === 0}
                                className="text-[#706E6B] hover:text-[#3E3E3C] disabled:opacity-30"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  handleMoveOrder(
                                    field.id,
                                    entityType,
                                    "down"
                                  )
                                }
                                disabled={idx === typeFields.length - 1}
                                className="text-[#706E6B] hover:text-[#3E3E3C] disabled:opacity-30"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                          <td>
                            <input
                              className="bc-input"
                              value={editForm.name}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  name: e.target.value,
                                }))
                              }
                            />
                          </td>
                          <td>
                            <select
                              className="bc-input"
                              value={editForm.fieldType}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  fieldType: e.target.value,
                                }))
                              }
                            >
                              {FIELD_TYPES.map((ft) => (
                                <option key={ft.value} value={ft.value}>
                                  {ft.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="text-center">
                            <input
                              type="checkbox"
                              checked={editForm.required}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  required: e.target.checked,
                                }))
                              }
                              className="w-4 h-4 rounded border-[#DDDBDA] text-[#0070D2] focus:ring-[#0070D2]"
                            />
                          </td>
                          <td>
                            {editForm.fieldType === "select" && (
                              <input
                                className="bc-input"
                                placeholder="Option 1, Option 2"
                                value={editForm.options}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    options: e.target.value,
                                  }))
                                }
                              />
                            )}
                          </td>
                          <td>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleUpdate(field.id)}
                                className="bc-btn bc-btn-primary text-xs py-1 px-2"
                              >
                                <Save className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingField(null);
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
                          <td className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() =>
                                  handleMoveOrder(
                                    field.id,
                                    entityType,
                                    "up"
                                  )
                                }
                                disabled={idx === 0}
                                className="text-[#706E6B] hover:text-[#3E3E3C] disabled:opacity-30"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  handleMoveOrder(
                                    field.id,
                                    entityType,
                                    "down"
                                  )
                                }
                                disabled={idx === typeFields.length - 1}
                                className="text-[#706E6B] hover:text-[#3E3E3C] disabled:opacity-30"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                          <td className="font-medium">{field.name}</td>
                          <td>
                            <span className="bc-badge bg-blue-50 text-blue-700">
                              {FIELD_TYPES.find(
                                (ft) => ft.value === field.fieldType
                              )?.label || field.fieldType}
                            </span>
                          </td>
                          <td className="text-center">
                            {field.required ? (
                              <span className="bc-badge bg-orange-50 text-orange-700">
                                Yes
                              </span>
                            ) : (
                              <span className="text-[#706E6B] text-sm">
                                No
                              </span>
                            )}
                          </td>
                          <td>
                            {field.options && (
                              <span className="text-sm text-[#706E6B]">
                                {(() => {
                                  try {
                                    return JSON.parse(field.options).join(", ");
                                  } catch {
                                    return field.options;
                                  }
                                })()}
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  setEditingField(field.id);
                                  setError("");
                                  let optionsStr = "";
                                  if (field.options) {
                                    try {
                                      optionsStr = JSON.parse(
                                        field.options
                                      ).join(", ");
                                    } catch {
                                      optionsStr = field.options;
                                    }
                                  }
                                  setEditForm({
                                    name: field.name,
                                    fieldType: field.fieldType,
                                    entityType: field.entityType,
                                    options: optionsStr,
                                    required: field.required,
                                  });
                                }}
                                className="text-[#0070D2] hover:text-[#005FB2] text-xs font-semibold"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() =>
                                  handleDelete(field.id, field.name)
                                }
                                className="text-[#C23934] hover:text-[#A61A14] text-xs font-semibold ml-2"
                              >
                                <Trash2 className="w-3 h-3" />
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
          </div>
        );
      })}
    </div>
  );
}
