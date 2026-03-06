"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Save, ArrowLeft } from "lucide-react";

const typeOptions = ["", "Prospect", "Customer", "Partner", "Vendor", "Other"];

export default function NewAccountPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    industry: "",
    type: "",
    website: "",
    phone: "",
    employees: "",
    annualRevenue: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    description: "",
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        industry: form.industry,
        type: form.type,
        website: form.website,
        phone: form.phone,
        address: form.address,
        city: form.city,
        state: form.state,
        zip: form.zip,
        country: form.country,
        description: form.description,
      };

      if (form.employees) {
        payload.employees = parseInt(form.employees, 10);
      }
      if (form.annualRevenue) {
        payload.annualRevenue = parseFloat(form.annualRevenue);
      }

      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create account");
      }

      const account = await res.json();
      router.push(`/accounts/${account.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Link
            href="/accounts"
            className="text-[#706E6B] hover:text-[#3E3E3C] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Building2 className="w-6 h-6 text-[#0070D2]" />
          <h1 className="text-xl font-bold text-[#3E3E3C]">New Account</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/accounts" className="bc-btn bc-btn-neutral">
            Cancel
          </Link>
          <button
            type="submit"
            form="account-form"
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

      <form id="account-form" onSubmit={handleSubmit}>
        {/* Account Information */}
        <div className="bc-card mb-4">
          <div className="bc-section-header">Account Information</div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="bc-label">
                  Account Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  className="bc-input"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="industry" className="bc-label">
                  Industry
                </label>
                <input
                  id="industry"
                  type="text"
                  className="bc-input"
                  value={form.industry}
                  onChange={(e) => updateField("industry", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="type" className="bc-label">
                  Type
                </label>
                <select
                  id="type"
                  className="bc-input"
                  value={form.type}
                  onChange={(e) => updateField("type", e.target.value)}
                >
                  {typeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t || "-- None --"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="website" className="bc-label">
                  Website
                </label>
                <input
                  id="website"
                  type="text"
                  className="bc-input"
                  value={form.website}
                  onChange={(e) => updateField("website", e.target.value)}
                  placeholder="https://"
                />
              </div>
              <div>
                <label htmlFor="phone" className="bc-label">
                  Phone
                </label>
                <input
                  id="phone"
                  type="text"
                  className="bc-input"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Financial */}
        <div className="bc-card mb-4">
          <div className="bc-section-header">Financial</div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="employees" className="bc-label">
                  Employees
                </label>
                <input
                  id="employees"
                  type="number"
                  className="bc-input"
                  value={form.employees}
                  onChange={(e) => updateField("employees", e.target.value)}
                  min="0"
                />
              </div>
              <div>
                <label htmlFor="annualRevenue" className="bc-label">
                  Annual Revenue
                </label>
                <input
                  id="annualRevenue"
                  type="number"
                  className="bc-input"
                  value={form.annualRevenue}
                  onChange={(e) => updateField("annualRevenue", e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bc-card mb-4">
          <div className="bc-section-header">Address</div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label htmlFor="address" className="bc-label">
                  Street Address
                </label>
                <input
                  id="address"
                  type="text"
                  className="bc-input"
                  value={form.address}
                  onChange={(e) => updateField("address", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="city" className="bc-label">
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  className="bc-input"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="state" className="bc-label">
                  State / Province
                </label>
                <input
                  id="state"
                  type="text"
                  className="bc-input"
                  value={form.state}
                  onChange={(e) => updateField("state", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="zip" className="bc-label">
                  Zip / Postal Code
                </label>
                <input
                  id="zip"
                  type="text"
                  className="bc-input"
                  value={form.zip}
                  onChange={(e) => updateField("zip", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="country" className="bc-label">
                  Country
                </label>
                <input
                  id="country"
                  type="text"
                  className="bc-input"
                  value={form.country}
                  onChange={(e) => updateField("country", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bc-card mb-4">
          <div className="bc-section-header">Description</div>
          <div className="p-4">
            <div>
              <label htmlFor="description" className="bc-label">
                Description
              </label>
              <textarea
                id="description"
                className="bc-input"
                rows={4}
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
