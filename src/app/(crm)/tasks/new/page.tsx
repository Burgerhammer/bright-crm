"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, X } from "lucide-react";

const STATUS_OPTIONS = ["Open", "In Progress"];
const PRIORITY_OPTIONS = ["High", "Medium", "Low"];
const ENTITY_TYPES = ["", "Lead", "Contact", "Account", "Deal"];

interface EntityOption {
  id: string;
  label: string;
}

export default function NewTaskPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "Medium",
    status: "Open",
  });

  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [entityOptions, setEntityOptions] = useState<EntityOption[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);

  useEffect(() => {
    if (!entityType) {
      setEntityOptions([]);
      setEntityId("");
      return;
    }

    setLoadingEntities(true);
    setEntityId("");

    const endpoint = `/api/${entityType.toLowerCase()}s`;
    fetch(endpoint)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const options: EntityOption[] = data.map((item: Record<string, string>) => ({
            id: item.id,
            label:
              entityType === "Lead" || entityType === "Contact"
                ? `${item.firstName} ${item.lastName}`
                : item.name,
          }));
          setEntityOptions(options);
        }
      })
      .catch(() => {
        setEntityOptions([]);
      })
      .finally(() => {
        setLoadingEntities(false);
      });
  }, [entityType]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const payload: Record<string, string> = {
        title: form.title,
        description: form.description,
        dueDate: form.dueDate,
        priority: form.priority,
        status: form.status,
      };

      if (entityId && entityType) {
        const key = `${entityType.toLowerCase()}Id`;
        payload[key] = entityId;
      }

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create task");
      }

      const task = await res.json();
      router.push(`/tasks/${task.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[#3E3E3C]">New Task</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/tasks")}
            className="bc-btn bc-btn-neutral"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            type="submit"
            form="task-form"
            disabled={saving}
            className="bc-btn bc-btn-primary"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded border border-red-200 mb-4">
          {error}
        </div>
      )}

      <form id="task-form" onSubmit={handleSubmit}>
        {/* Task Information */}
        <div className="bc-card mb-4">
          <div className="bc-section-header">Task Information</div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <div className="sm:col-span-2">
              <label htmlFor="title" className="bc-label">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                value={form.title}
                onChange={handleChange}
                className="bc-input"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="description" className="bc-label">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                className="bc-input"
              />
            </div>
            <div>
              <label htmlFor="dueDate" className="bc-label">
                Due Date
              </label>
              <input
                id="dueDate"
                name="dueDate"
                type="datetime-local"
                value={form.dueDate}
                onChange={handleChange}
                className="bc-input"
              />
            </div>
            <div>
              <label htmlFor="priority" className="bc-label">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className="bc-input"
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="status" className="bc-label">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={form.status}
                onChange={handleChange}
                className="bc-input"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Related To */}
        <div className="bc-card mb-4">
          <div className="bc-section-header">Related To</div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <label htmlFor="entityType" className="bc-label">
                Entity Type
              </label>
              <select
                id="entityType"
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="bc-input"
              >
                {ENTITY_TYPES.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt || "-- None --"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="entityId" className="bc-label">
                {entityType || "Entity"}
              </label>
              <select
                id="entityId"
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                className="bc-input"
                disabled={!entityType || loadingEntities}
              >
                <option value="">
                  {loadingEntities ? "Loading..." : "-- Select --"}
                </option>
                {entityOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
