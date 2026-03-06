"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Save,
  Pencil,
  Trash2,
  ArrowLeft,
  Clock,
  FileText,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import IntegrationActions from "@/components/integrations/IntegrationActions";

const STATUS_OPTIONS = ["New", "Contacted", "Qualified", "Unqualified", "Converted"];
const SOURCE_OPTIONS = ["", "Web", "Phone", "Referral", "Partner", "Other"];
const RATING_OPTIONS = ["", "Hot", "Warm", "Cold"];

const statusColors: Record<string, string> = {
  New: "bg-blue-100 text-blue-800",
  Contacted: "bg-yellow-100 text-yellow-800",
  Qualified: "bg-green-100 text-green-800",
  Unqualified: "bg-gray-100 text-gray-600",
  Converted: "bg-purple-100 text-purple-800",
};

interface Activity {
  id: string;
  type: string;
  subject: string;
  status: string;
  dueDate: string | null;
  createdAt: string;
  owner: { id: string; name: string } | null;
}

interface Note {
  id: string;
  body: string;
  createdAt: string;
  owner: { id: string; name: string } | null;
}

interface LeadData {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  status: string;
  source: string | null;
  rating: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  description: string | null;
  ownerId: string | null;
  convertedContactId: string | null;
  convertedAccountId: string | null;
  convertedDealId: string | null;
  createdAt: string;
  updatedAt: string;
  owner: { id: string; name: string; email: string } | null;
  activities: Activity[];
  notes: Note[];
}

interface UserOption {
  id: string;
  name: string;
}

export default function LeadDetailForm({
  lead,
  users,
}: {
  lead: LeadData;
  users: UserOption[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    firstName: lead.firstName,
    lastName: lead.lastName,
    company: lead.company || "",
    title: lead.title || "",
    email: lead.email || "",
    phone: lead.phone || "",
    status: lead.status,
    source: lead.source || "",
    rating: lead.rating || "",
    address: lead.address || "",
    city: lead.city || "",
    state: lead.state || "",
    zip: lead.zip || "",
    country: lead.country || "",
    description: lead.description || "",
    ownerId: lead.ownerId || "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setError("");
    setSaving(true);

    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update lead");
      }

      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update lead");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this lead? This action cannot be undone.")) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete lead");
      }

      router.push("/leads");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete lead");
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    setForm({
      firstName: lead.firstName,
      lastName: lead.lastName,
      company: lead.company || "",
      title: lead.title || "",
      email: lead.email || "",
      phone: lead.phone || "",
      status: lead.status,
      source: lead.source || "",
      rating: lead.rating || "",
      address: lead.address || "",
      city: lead.city || "",
      state: lead.state || "",
      zip: lead.zip || "",
      country: lead.country || "",
      description: lead.description || "",
      ownerId: lead.ownerId || "",
    });
    setEditing(false);
    setError("");
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/leads"
            className="text-[#706E6B] hover:text-[#3E3E3C] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#3E3E3C]">
              {lead.firstName} {lead.lastName}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`bc-badge ${statusColors[lead.status] || "bg-gray-100 text-gray-600"}`}
              >
                {lead.status}
              </span>
              {lead.company && (
                <span className="text-sm text-[#706E6B]">{lead.company}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="bc-btn bc-btn-primary"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="bc-btn bc-btn-neutral"
              >
                <Pencil className="w-4 h-4" />
                Edit
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="bc-btn bc-btn-destructive"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Integration Actions */}
      <div className="mb-4">
        <IntegrationActions
          email={lead.email || undefined}
          phone={lead.phone || undefined}
          name={`${lead.firstName} ${lead.lastName}`}
          leadId={lead.id}
        />
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded border border-red-200 mb-4">
          {error}
        </div>
      )}

      {/* Lead Information */}
      <div className="bc-card mb-4">
        <div className="bc-section-header">Lead Information</div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <label htmlFor="firstName" className="bc-label">
              First Name <span className="text-red-500">*</span>
            </label>
            {editing ? (
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={form.firstName}
                onChange={handleChange}
                className="bc-input"
                required
              />
            ) : (
              <p className="text-sm text-[#3E3E3C] py-1">{lead.firstName}</p>
            )}
          </div>
          <div>
            <label htmlFor="lastName" className="bc-label">
              Last Name <span className="text-red-500">*</span>
            </label>
            {editing ? (
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={form.lastName}
                onChange={handleChange}
                className="bc-input"
                required
              />
            ) : (
              <p className="text-sm text-[#3E3E3C] py-1">{lead.lastName}</p>
            )}
          </div>
          <div>
            <label htmlFor="company" className="bc-label">
              Company
            </label>
            {editing ? (
              <input
                id="company"
                name="company"
                type="text"
                value={form.company}
                onChange={handleChange}
                className="bc-input"
              />
            ) : (
              <p className="text-sm text-[#3E3E3C] py-1">
                {lead.company || "--"}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="title" className="bc-label">
              Title
            </label>
            {editing ? (
              <input
                id="title"
                name="title"
                type="text"
                value={form.title}
                onChange={handleChange}
                className="bc-input"
              />
            ) : (
              <p className="text-sm text-[#3E3E3C] py-1">
                {lead.title || "--"}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="email" className="bc-label">
              Email
            </label>
            {editing ? (
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="bc-input"
              />
            ) : (
              <p className="text-sm py-1">
                {lead.email ? (
                  <a
                    href={`mailto:${lead.email}`}
                    className="text-[#0070D2] hover:text-[#005FB2]"
                  >
                    {lead.email}
                  </a>
                ) : (
                  <span className="text-[#3E3E3C]">--</span>
                )}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="phone" className="bc-label">
              Phone
            </label>
            {editing ? (
              <input
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                className="bc-input"
              />
            ) : (
              <p className="text-sm text-[#3E3E3C] py-1">
                {lead.phone || "--"}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="ownerId" className="bc-label">
              Owner
            </label>
            {editing ? (
              <select
                id="ownerId"
                name="ownerId"
                value={form.ownerId}
                onChange={handleChange}
                className="bc-input"
              >
                <option value="">-- None --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-[#3E3E3C] py-1">
                {lead.owner?.name || "--"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Lead Details */}
      <div className="bc-card mb-4">
        <div className="bc-section-header">Lead Details</div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <label htmlFor="status" className="bc-label">
              Status
            </label>
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
              <p className="text-sm py-1">
                <span
                  className={`bc-badge ${statusColors[lead.status] || "bg-gray-100 text-gray-600"}`}
                >
                  {lead.status}
                </span>
              </p>
            )}
          </div>
          <div>
            <label htmlFor="source" className="bc-label">
              Source
            </label>
            {editing ? (
              <select
                id="source"
                name="source"
                value={form.source}
                onChange={handleChange}
                className="bc-input"
              >
                {SOURCE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt || "-- None --"}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-[#3E3E3C] py-1">
                {lead.source || "--"}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="rating" className="bc-label">
              Rating
            </label>
            {editing ? (
              <select
                id="rating"
                name="rating"
                value={form.rating}
                onChange={handleChange}
                className="bc-input"
              >
                {RATING_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt || "-- None --"}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-[#3E3E3C] py-1">
                {lead.rating || "--"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="bc-card mb-4">
        <div className="bc-section-header">Address</div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <div className="sm:col-span-2">
            <label htmlFor="address" className="bc-label">
              Street Address
            </label>
            {editing ? (
              <input
                id="address"
                name="address"
                type="text"
                value={form.address}
                onChange={handleChange}
                className="bc-input"
              />
            ) : (
              <p className="text-sm text-[#3E3E3C] py-1">
                {lead.address || "--"}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="city" className="bc-label">
              City
            </label>
            {editing ? (
              <input
                id="city"
                name="city"
                type="text"
                value={form.city}
                onChange={handleChange}
                className="bc-input"
              />
            ) : (
              <p className="text-sm text-[#3E3E3C] py-1">
                {lead.city || "--"}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="state" className="bc-label">
              State / Province
            </label>
            {editing ? (
              <input
                id="state"
                name="state"
                type="text"
                value={form.state}
                onChange={handleChange}
                className="bc-input"
              />
            ) : (
              <p className="text-sm text-[#3E3E3C] py-1">
                {lead.state || "--"}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="zip" className="bc-label">
              Zip / Postal Code
            </label>
            {editing ? (
              <input
                id="zip"
                name="zip"
                type="text"
                value={form.zip}
                onChange={handleChange}
                className="bc-input"
              />
            ) : (
              <p className="text-sm text-[#3E3E3C] py-1">
                {lead.zip || "--"}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="country" className="bc-label">
              Country
            </label>
            {editing ? (
              <input
                id="country"
                name="country"
                type="text"
                value={form.country}
                onChange={handleChange}
                className="bc-input"
              />
            ) : (
              <p className="text-sm text-[#3E3E3C] py-1">
                {lead.country || "--"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bc-card mb-4">
        <div className="bc-section-header">Description</div>
        <div className="p-4">
          {editing ? (
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              className="bc-input"
            />
          ) : (
            <p className="text-sm text-[#3E3E3C] whitespace-pre-wrap">
              {lead.description || "No description provided."}
            </p>
          )}
        </div>
      </div>

      {/* System Information */}
      <div className="bc-card mb-4">
        <div className="bc-section-header">System Information</div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <span className="bc-label">Created</span>
            <p className="text-sm text-[#3E3E3C] py-1">
              {formatDate(lead.createdAt)}
            </p>
          </div>
          <div>
            <span className="bc-label">Last Modified</span>
            <p className="text-sm text-[#3E3E3C] py-1">
              {formatDate(lead.updatedAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Related Lists - Activities */}
      <div className="bc-card mb-4">
        <div className="bc-section-header flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Activities ({lead.activities.length})
        </div>
        {lead.activities.length === 0 ? (
          <div className="p-4 text-sm text-[#706E6B] italic">
            No activities yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="bc-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Type</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {lead.activities.map((activity) => (
                <tr key={activity.id}>
                  <td className="font-medium text-[#3E3E3C]">
                    {activity.subject}
                  </td>
                  <td className="capitalize text-[#3E3E3C]">
                    {activity.type}
                  </td>
                  <td>
                    <span
                      className={`bc-badge ${
                        activity.status === "Completed"
                          ? "bg-green-100 text-green-800"
                          : activity.status === "Cancelled"
                            ? "bg-gray-100 text-gray-600"
                            : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {activity.status}
                    </span>
                  </td>
                  <td className="text-[#706E6B] text-xs">
                    {activity.dueDate ? formatDate(activity.dueDate) : "--"}
                  </td>
                  <td className="text-[#3E3E3C]">
                    {activity.owner?.name || "--"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Related Lists - Notes */}
      <div className="bc-card mb-4">
        <div className="bc-section-header flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Notes ({lead.notes.length})
        </div>
        {lead.notes.length === 0 ? (
          <div className="p-4 text-sm text-[#706E6B] italic">
            No notes yet.
          </div>
        ) : (
          <div className="divide-y divide-[#DDDBDA]">
            {lead.notes.map((note) => (
              <div key={note.id} className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-[#706E6B]">
                    {note.owner?.name || "Unknown"}
                  </span>
                  <span className="text-xs text-[#706E6B]">
                    {formatDate(note.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-[#3E3E3C] whitespace-pre-wrap">
                  {note.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
