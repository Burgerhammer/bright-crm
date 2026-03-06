"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, X } from "lucide-react";
import DuplicateWarning from "@/components/DuplicateWarning";

interface Account {
  id: string;
  name: string;
}

export default function NewContactPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    title: "",
    department: "",
    email: "",
    phone: "",
    mobile: "",
    accountId: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    description: "",
  });

  useEffect(() => {
    fetch("/api/accounts")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAccounts(data);
        }
      })
      .catch(() => {
        // Accounts endpoint may not exist yet
      });
  }, []);

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
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.details) {
          setErrors(data.details);
        } else {
          setErrors({ _form: [data.error || "Failed to create contact"] });
        }
        setSaving(false);
        return;
      }

      const contact = await res.json();
      router.push(`/contacts/${contact.id}`);
    } catch {
      setErrors({ _form: ["An unexpected error occurred"] });
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[var(--bc-text)]">New Contact</h1>
        <div className="flex items-center gap-2">
          <Link href="/contacts" className="bc-btn bc-btn-neutral">
            <X className="w-4 h-4" />
            Cancel
          </Link>
          <button
            type="submit"
            form="contact-form"
            disabled={saving}
            className="bc-btn bc-btn-primary"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {errors._form && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {errors._form[0]}
        </div>
      )}

      <DuplicateWarning
        entityType="Contact"
        firstName={form.firstName}
        lastName={form.lastName}
        email={form.email}
        phone={form.phone}
      />

      <form id="contact-form" onSubmit={handleSubmit}>
        {/* Contact Information */}
        <div className="bc-card mb-4">
          <div className="bc-section-header">Contact Information</div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                {errors.firstName && (
                  <p className="text-xs text-red-600 mt-1">{errors.firstName[0]}</p>
                )}
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
                {errors.lastName && (
                  <p className="text-xs text-red-600 mt-1">{errors.lastName[0]}</p>
                )}
              </div>
              <div>
                <label htmlFor="title" className="bc-label">Title</label>
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
                <label htmlFor="department" className="bc-label">Department</label>
                <input
                  id="department"
                  name="department"
                  type="text"
                  value={form.department}
                  onChange={handleChange}
                  className="bc-input"
                />
              </div>
              <div>
                <label htmlFor="email" className="bc-label">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  className="bc-input"
                />
                {errors.email && (
                  <p className="text-xs text-red-600 mt-1">{errors.email[0]}</p>
                )}
              </div>
              <div>
                <label htmlFor="phone" className="bc-label">Phone</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  className="bc-input"
                />
              </div>
              <div>
                <label htmlFor="mobile" className="bc-label">Mobile</label>
                <input
                  id="mobile"
                  name="mobile"
                  type="tel"
                  value={form.mobile}
                  onChange={handleChange}
                  className="bc-input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Account */}
        <div className="bc-card mb-4">
          <div className="bc-section-header">Account</div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="accountId" className="bc-label">Account Name</label>
                <select
                  id="accountId"
                  name="accountId"
                  value={form.accountId}
                  onChange={handleChange}
                  className="bc-input"
                >
                  <option value="">-- None --</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
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
                <label htmlFor="address" className="bc-label">Street Address</label>
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
                <label htmlFor="city" className="bc-label">City</label>
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
                <label htmlFor="state" className="bc-label">State / Province</label>
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
                <label htmlFor="zip" className="bc-label">Zip / Postal Code</label>
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
                <label htmlFor="country" className="bc-label">Country</label>
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
        </div>

        {/* Description */}
        <div className="bc-card mb-4">
          <div className="bc-section-header">Description</div>
          <div className="p-4">
            <div>
              <label htmlFor="description" className="bc-label">Description</label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={form.description}
                onChange={handleChange}
                className="bc-input"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
