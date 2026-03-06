"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Save,
  Trash2,
  ArrowLeft,
  Users,
  DollarSign,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

const typeOptions = ["", "Prospect", "Customer", "Partner", "Vendor", "Other"];

const typeBadgeColors: Record<string, string> = {
  Prospect: "bg-blue-100 text-blue-800",
  Customer: "bg-green-100 text-green-800",
  Partner: "bg-purple-100 text-purple-800",
  Vendor: "bg-orange-100 text-orange-800",
  Other: "bg-gray-100 text-gray-700",
};

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
}

interface Deal {
  id: string;
  name: string;
  amount: number | null;
  closeDate: string | null;
  stage: { name: string; color: string };
  owner: { name: string } | null;
}

interface Account {
  id: string;
  name: string;
  industry: string | null;
  type: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  description: string | null;
  employees: number | null;
  annualRevenue: number | null;
  ownerId: string | null;
  owner: { id: string; name: string; email: string } | null;
  contacts: Contact[];
  deals: Deal[];
  createdAt: string;
  updatedAt: string;
}

export default function AccountDetailClient({
  account,
}: {
  account: Account;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: account.name || "",
    industry: account.industry || "",
    type: account.type || "",
    website: account.website || "",
    phone: account.phone || "",
    employees: account.employees?.toString() || "",
    annualRevenue: account.annualRevenue?.toString() || "",
    address: account.address || "",
    city: account.city || "",
    state: account.state || "",
    zip: account.zip || "",
    country: account.country || "",
    description: account.description || "",
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
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
      } else {
        payload.employees = "";
      }
      if (form.annualRevenue) {
        payload.annualRevenue = parseFloat(form.annualRevenue);
      } else {
        payload.annualRevenue = "";
      }

      const res = await fetch(`/api/accounts/${account.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update account");
      }

      router.refresh();
      setSaving(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this account?")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/accounts/${account.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete account");
      }

      router.push("/accounts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setDeleting(false);
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/accounts"
            className="text-[#706E6B] hover:text-[#3E3E3C] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Building2 className="w-6 h-6 text-[#0070D2]" />
          <h1 className="text-xl font-bold text-[#3E3E3C]">{account.name}</h1>
          {account.type && (
            <span
              className={`bc-badge ml-2 ${
                typeBadgeColors[account.type] || typeBadgeColors.Other
              }`}
            >
              {account.type}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="bc-btn bc-btn-destructive"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? "Deleting..." : "Delete"}
          </button>
          <button
            type="submit"
            form="edit-account-form"
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

      <form id="edit-account-form" onSubmit={handleSave}>
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
              <div>
                <label className="bc-label">Owner</label>
                <p className="text-sm text-[#3E3E3C] py-1">
                  {account.owner?.name || "--"}
                </p>
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

      {/* Related Contacts */}
      <div className="bc-card mb-4">
        <div className="bc-section-header flex items-center gap-2">
          <Users className="w-4 h-4 text-[#0070D2]" />
          Contacts ({account.contacts.length})
        </div>
        <div className="overflow-x-auto">
          <table className="bc-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Title</th>
                <th>Email</th>
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              {account.contacts.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-6 text-[#706E6B] text-sm"
                  >
                    No contacts associated with this account.
                  </td>
                </tr>
              ) : (
                account.contacts.map((contact) => (
                  <tr key={contact.id}>
                    <td>
                      <Link
                        href={`/contacts/${contact.id}`}
                        className="text-[#0070D2] hover:text-[#005FB2] font-medium"
                      >
                        {contact.firstName} {contact.lastName}
                      </Link>
                    </td>
                    <td className="text-[#706E6B]">
                      {contact.title || "--"}
                    </td>
                    <td className="text-[#706E6B]">
                      {contact.email || "--"}
                    </td>
                    <td className="text-[#706E6B]">
                      {contact.phone || "--"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Related Deals */}
      <div className="bc-card mb-4">
        <div className="bc-section-header flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-[#0070D2]" />
          Deals ({account.deals.length})
        </div>
        <div className="overflow-x-auto">
          <table className="bc-table">
            <thead>
              <tr>
                <th>Deal Name</th>
                <th>Stage</th>
                <th>Amount</th>
                <th>Close Date</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {account.deals.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-6 text-[#706E6B] text-sm"
                  >
                    No deals associated with this account.
                  </td>
                </tr>
              ) : (
                account.deals.map((deal) => (
                  <tr key={deal.id}>
                    <td>
                      <Link
                        href={`/deals/${deal.id}`}
                        className="text-[#0070D2] hover:text-[#005FB2] font-medium"
                      >
                        {deal.name}
                      </Link>
                    </td>
                    <td>
                      <span
                        className="bc-badge"
                        style={{
                          backgroundColor: `${deal.stage.color}20`,
                          color: deal.stage.color,
                        }}
                      >
                        {deal.stage.name}
                      </span>
                    </td>
                    <td className="text-[#706E6B]">
                      {deal.amount ? formatCurrency(deal.amount) : "--"}
                    </td>
                    <td className="text-[#706E6B]">
                      {deal.closeDate ? formatDate(deal.closeDate) : "--"}
                    </td>
                    <td className="text-[#706E6B]">
                      {deal.owner?.name || "--"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
