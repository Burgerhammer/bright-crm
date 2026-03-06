"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, X } from "lucide-react";

const STATUS_OPTIONS = ["New", "Contacted", "Qualified", "Unqualified", "Converted"];
const SOURCE_OPTIONS = ["", "Web", "Phone", "Referral", "Partner", "Other"];
const RATING_OPTIONS = ["", "Hot", "Warm", "Cold"];

export default function NewLeadPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    company: "",
    title: "",
    email: "",
    phone: "",
    status: "New",
    source: "",
    rating: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    description: "",
  });

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
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create lead");
      }

      const lead = await res.json();
      router.push(`/leads/${lead.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create lead");
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[#3E3E3C]">New Lead</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/leads")}
            className="bc-btn bc-btn-neutral"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            type="submit"
            form="lead-form"
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

      <form id="lead-form" onSubmit={handleSubmit}>
        {/* Lead Information */}
        <div className="bc-card mb-4">
          <div className="bc-section-header">Lead Information</div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <label htmlFor="firstName" className="bc-label">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={form.firstName}
                onChange={handleChange}
                className="bc-input"
                required
              />
            </div>
            <div>
              <label htmlFor="lastName" className="bc-label">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={form.lastName}
                onChange={handleChange}
                className="bc-input"
                required
              />
            </div>
            <div>
              <label htmlFor="company" className="bc-label">
                Company
              </label>
              <input
                id="company"
                name="company"
                type="text"
                value={form.company}
                onChange={handleChange}
                className="bc-input"
              />
            </div>
            <div>
              <label htmlFor="title" className="bc-label">
                Title
              </label>
              <input
                id="title"
                name="title"
                type="text"
                value={form.title}
                onChange={handleChange}
                className="bc-input"
              />
            </div>
            <div>
              <label htmlFor="email" className="bc-label">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="bc-input"
              />
            </div>
            <div>
              <label htmlFor="phone" className="bc-label">
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                className="bc-input"
              />
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
            <div>
              <label htmlFor="source" className="bc-label">
                Source
              </label>
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
            </div>
            <div>
              <label htmlFor="rating" className="bc-label">
                Rating
              </label>
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
              <input
                id="address"
                name="address"
                type="text"
                value={form.address}
                onChange={handleChange}
                className="bc-input"
              />
            </div>
            <div>
              <label htmlFor="city" className="bc-label">
                City
              </label>
              <input
                id="city"
                name="city"
                type="text"
                value={form.city}
                onChange={handleChange}
                className="bc-input"
              />
            </div>
            <div>
              <label htmlFor="state" className="bc-label">
                State / Province
              </label>
              <input
                id="state"
                name="state"
                type="text"
                value={form.state}
                onChange={handleChange}
                className="bc-input"
              />
            </div>
            <div>
              <label htmlFor="zip" className="bc-label">
                Zip / Postal Code
              </label>
              <input
                id="zip"
                name="zip"
                type="text"
                value={form.zip}
                onChange={handleChange}
                className="bc-input"
              />
            </div>
            <div>
              <label htmlFor="country" className="bc-label">
                Country
              </label>
              <input
                id="country"
                name="country"
                type="text"
                value={form.country}
                onChange={handleChange}
                className="bc-input"
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bc-card mb-4">
          <div className="bc-section-header">Description</div>
          <div className="p-4">
            <label htmlFor="description" className="bc-label">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              className="bc-input"
            />
          </div>
        </div>
      </form>
    </div>
  );
}
