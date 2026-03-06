"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Save, Pencil, ArrowLeft, CheckCircle2, RotateCcw } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";

const STATUS_OPTIONS = ["Open", "In Progress", "Completed", "Cancelled"];
const PRIORITY_OPTIONS = ["High", "Medium", "Low"];
const ENTITY_TYPES = ["", "Lead", "Contact", "Account", "Deal"];

interface EntityOption {
  id: string;
  label: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  completedAt: string | null;
  leadId: string | null;
  contactId: string | null;
  accountId: string | null;
  dealId: string | null;
  ownerId: string;
  owner: { id: string; name: string } | null;
  lead: { id: string; firstName: string; lastName: string } | null;
  contact: { id: string; firstName: string; lastName: string } | null;
  account: { id: string; name: string } | null;
  deal: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

function getEntityType(task: Task): string {
  if (task.leadId) return "Lead";
  if (task.contactId) return "Contact";
  if (task.accountId) return "Account";
  if (task.dealId) return "Deal";
  return "";
}

function getEntityId(task: Task): string {
  return task.leadId || task.contactId || task.accountId || task.dealId || "";
}

function getRelatedLink(task: Task): { name: string; href: string } | null {
  if (task.lead) {
    return {
      name: `${task.lead.firstName} ${task.lead.lastName}`,
      href: `/leads/${task.lead.id}`,
    };
  }
  if (task.contact) {
    return {
      name: `${task.contact.firstName} ${task.contact.lastName}`,
      href: `/contacts/${task.contact.id}`,
    };
  }
  if (task.account) {
    return { name: task.account.name, href: `/accounts/${task.account.id}` };
  }
  if (task.deal) {
    return { name: task.deal.name, href: `/deals/${task.deal.id}` };
  }
  return null;
}

function formatDateTimeForInput(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getEntityLabel(task: Task): string {
  if (task.lead) return `${task.lead.firstName} ${task.lead.lastName}`;
  if (task.contact) return `${task.contact.firstName} ${task.contact.lastName}`;
  if (task.account) return task.account.name;
  if (task.deal) return task.deal.name;
  return "--";
}

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

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

  const resetForm = useCallback((data: Task) => {
    setForm({
      title: data.title || "",
      description: data.description || "",
      dueDate: formatDateTimeForInput(data.dueDate),
      priority: data.priority || "Medium",
      status: data.status || "Open",
    });
    setEntityType(getEntityType(data));
    setEntityId(getEntityId(data));
  }, []);

  const fetchTask = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          router.push("/tasks");
          return;
        }
        throw new Error("Failed to fetch task");
      }
      const data: Task = await res.json();
      setTask(data);
      resetForm(data);
    } catch {
      setErrors({ _form: ["Failed to load task"] });
    } finally {
      setLoading(false);
    }
  }, [id, router, resetForm]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  useEffect(() => {
    if (!entityType) {
      setEntityOptions([]);
      return;
    }

    setLoadingEntities(true);

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

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[e.target.name];
        return next;
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      const payload: Record<string, string | null> = {
        title: form.title,
        description: form.description,
        dueDate: form.dueDate || null,
        priority: form.priority,
        status: form.status,
        leadId: null,
        contactId: null,
        accountId: null,
        dealId: null,
      };

      if (entityId && entityType) {
        const key = `${entityType.toLowerCase()}Id`;
        payload[key] = entityId;
      }

      const res = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.details) {
          setErrors(data.details);
        } else {
          setErrors({ _form: [data.error || "Failed to update task"] });
        }
        setSaving(false);
        return;
      }

      const updated = await res.json();
      setTask((prev) => (prev ? { ...prev, ...updated } : prev));
      setEditing(false);
      setSaving(false);
    } catch {
      setErrors({ _form: ["An unexpected error occurred"] });
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this task? This action cannot be undone.")) {
      return;
    }

    setDeleting(true);

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
      });

      if (res.status !== 204 && !res.ok) {
        const data = await res.json();
        setErrors({ _form: [data.error || "Failed to delete task"] });
        setDeleting(false);
        return;
      }

      router.push("/tasks");
    } catch {
      setErrors({ _form: ["An unexpected error occurred"] });
      setDeleting(false);
    }
  }

  async function handleQuickStatus(newStatus: string) {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        const updated = await res.json();
        setTask((prev) => (prev ? { ...prev, ...updated } : prev));
        setForm((prev) => ({ ...prev, status: newStatus }));
      }
    } catch {
      // Failed to update status
    }
  }

  function handleCancel() {
    if (task) {
      resetForm(task);
    }
    setEditing(false);
    setErrors({});
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[#706E6B]">Loading task...</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[#706E6B]">Task not found.</p>
      </div>
    );
  }

  const related = getRelatedLink(task);

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/tasks"
            className="text-[#0070D2] hover:text-[#005FB2]"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-[#3E3E3C]">
            {task.title}
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Action Buttons */}
          {task.status !== "Completed" && (
            <button
              onClick={() => handleQuickStatus("Completed")}
              className="bc-btn bc-btn-neutral"
            >
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Mark Complete
            </button>
          )}
          {task.status === "Completed" && (
            <button
              onClick={() => handleQuickStatus("Open")}
              className="bc-btn bc-btn-neutral"
            >
              <RotateCcw className="w-4 h-4 text-blue-600" />
              Reopen
            </button>
          )}
          {editing ? (
            <>
              <button
                type="button"
                onClick={handleCancel}
                className="bc-btn bc-btn-neutral"
              >
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
            </>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="bc-btn bc-btn-neutral"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>
      </div>

      {errors._form && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {errors._form[0]}
        </div>
      )}

      {/* Task Summary */}
      <div className="bc-card mb-4 px-4 py-3">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div>
            <span className="text-[#706E6B]">Status: </span>
            <span className={`bc-badge ${
              task.status === "Completed" ? "bg-green-100 text-green-800" :
              task.status === "In Progress" ? "bg-yellow-100 text-yellow-800" :
              task.status === "Cancelled" ? "bg-gray-100 text-gray-600" :
              "bg-blue-100 text-blue-800"
            }`}>
              {task.status}
            </span>
          </div>
          {task.completedAt && (
            <div className="text-[#706E6B]">
              Completed: {formatDate(task.completedAt)}
            </div>
          )}
          {related && (
            <div>
              <span className="text-[#706E6B]">Related: </span>
              <Link
                href={related.href}
                className="text-[#0070D2] hover:text-[#005FB2]"
              >
                {related.name}
              </Link>
            </div>
          )}
          <div className="text-[#706E6B] ml-auto text-xs">
            Created {formatDate(task.createdAt)}
          </div>
        </div>
      </div>

      <form id="task-form" onSubmit={handleSubmit}>
        {/* Task Information */}
        <div className="bc-card mb-4">
          <div className="bc-section-header">Task Information</div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="title" className="bc-label">
                  Title {editing && <span className="text-red-500">*</span>}
                </label>
                {editing ? (
                  <>
                    <input
                      id="title"
                      name="title"
                      type="text"
                      value={form.title}
                      onChange={handleChange}
                      className="bc-input"
                      required
                    />
                    {errors.title && (
                      <p className="text-xs text-red-600 mt-1">{errors.title[0]}</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-[#3E3E3C] py-1">{task.title || "--"}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label htmlFor="description" className="bc-label">
                  Description
                </label>
                {editing ? (
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    value={form.description}
                    onChange={handleChange}
                    className="bc-input"
                  />
                ) : (
                  <p className="text-sm text-[#3E3E3C] py-1 whitespace-pre-wrap">{task.description || "--"}</p>
                )}
              </div>
              <div>
                <label htmlFor="dueDate" className="bc-label">Due Date</label>
                {editing ? (
                  <input
                    id="dueDate"
                    name="dueDate"
                    type="datetime-local"
                    value={form.dueDate}
                    onChange={handleChange}
                    className="bc-input"
                  />
                ) : (
                  <p className="text-sm text-[#3E3E3C] py-1">
                    {task.dueDate ? formatDateTime(task.dueDate) : "--"}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="priority" className="bc-label">Priority</label>
                {editing ? (
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
                ) : (
                  <p className="text-sm text-[#3E3E3C] py-1">{task.priority || "--"}</p>
                )}
              </div>
              <div>
                <label htmlFor="status" className="bc-label">Status</label>
                {editing ? (
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
                ) : (
                  <p className="text-sm text-[#3E3E3C] py-1">{task.status || "--"}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Related To */}
        <div className="bc-card mb-4">
          <div className="bc-section-header">Related To</div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="entityType" className="bc-label">Entity Type</label>
                {editing ? (
                  <select
                    id="entityType"
                    value={entityType}
                    onChange={(e) => {
                      setEntityType(e.target.value);
                      setEntityId("");
                    }}
                    className="bc-input"
                  >
                    {ENTITY_TYPES.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt || "-- None --"}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-[#3E3E3C] py-1">{getEntityType(task) || "--"}</p>
                )}
              </div>
              <div>
                <label htmlFor="entityId" className="bc-label">
                  {entityType || "Entity"}
                </label>
                {editing ? (
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
                ) : (
                  <p className="text-sm text-[#3E3E3C] py-1">
                    {related ? (
                      <Link
                        href={related.href}
                        className="text-[#0070D2] hover:text-[#005FB2]"
                      >
                        {getEntityLabel(task)}
                      </Link>
                    ) : (
                      "--"
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="mt-8 pt-4 border-t border-[#DDDBDA]">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="text-sm text-red-500 hover:text-red-700 transition-colors"
        >
          {deleting ? "Deleting..." : "Delete this task"}
        </button>
      </div>
    </div>
  );
}
