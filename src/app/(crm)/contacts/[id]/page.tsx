"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Save, Trash2, ArrowLeft, DollarSign } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import IntegrationActions from "@/components/integrations/IntegrationActions";

interface Account {
  id: string;
  name: string;
}

interface Stage {
  id: string;
  name: string;
}

interface Deal {
  id: string;
  name: string;
  amount: number | null;
  closeDate: string | null;
  stage: Stage;
  account: Account | null;
  createdAt: string;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  title: string | null;
  department: string | null;
  accountId: string | null;
  account: Account | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  description: string | null;
  ownerId: string | null;
  owner: { id: string; name: string } | null;
  deals: Deal[];
  createdAt: string;
  updatedAt: string;
}

export default function ContactDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  const fetchContact = useCallback(async () => {
    try {
      const res = await fetch(`/api/contacts/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          router.push("/contacts");
          return;
        }
        throw new Error("Failed to fetch contact");
      }
      const data: Contact = await res.json();
      setContact(data);
      setForm({
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        title: data.title || "",
        department: data.department || "",
        email: data.email || "",
        phone: data.phone || "",
        mobile: data.mobile || "",
        accountId: data.accountId || "",
        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        zip: data.zip || "",
        country: data.country || "",
        description: data.description || "",
      });
    } catch {
      setErrors({ _form: ["Failed to load contact"] });
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchContact();
  }, [fetchContact]);

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
      const res = await fetch(`/api/contacts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.details) {
          setErrors(data.details);
        } else {
          setErrors({ _form: [data.error || "Failed to update contact"] });
        }
        setSaving(false);
        return;
      }

      const updated = await res.json();
      setContact((prev) => (prev ? { ...prev, ...updated } : prev));
      setSaving(false);
    } catch {
      setErrors({ _form: ["An unexpected error occurred"] });
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this contact? This action cannot be undone.")) {
      return;
    }

    setDeleting(true);

    try {
      const res = await fetch(`/api/contacts/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setErrors({ _form: [data.error || "Failed to delete contact"] });
        setDeleting(false);
        return;
      }

      router.push("/contacts");
    } catch {
      setErrors({ _form: ["An unexpected error occurred"] });
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[var(--bc-text-light)]">Loading contact...</p>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[var(--bc-text-light)]">Contact not found.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/contacts"
            className="text-[var(--bc-link)] hover:text-[var(--bc-link-hover)]"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-[var(--bc-text)]">
            {contact.firstName} {contact.lastName}
          </h1>
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
            form="contact-form"
            disabled={saving}
            className="bc-btn bc-btn-primary"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Integration Actions */}
      <div className="mb-4">
        <IntegrationActions
          email={contact.email || undefined}
          phone={contact.phone || contact.mobile || undefined}
          name={`${contact.firstName} ${contact.lastName}`}
          contactId={contact.id}
        />
      </div>

      {errors._form && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {errors._form[0]}
        </div>
      )}

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

      {/* Related Deals */}
      <div className="bc-card mb-4">
        <div className="bc-section-header flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Deals ({contact.deals?.length || 0})
        </div>
        <div className="overflow-x-auto">
          <table className="bc-table">
            <thead>
              <tr>
                <th>Deal Name</th>
                <th>Stage</th>
                <th>Amount</th>
                <th>Close Date</th>
                <th>Account</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {!contact.deals || contact.deals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-[var(--bc-text-light)]">
                    No related deals.
                  </td>
                </tr>
              ) : (
                contact.deals.map((deal) => (
                  <tr key={deal.id}>
                    <td>
                      <Link
                        href={`/deals/${deal.id}`}
                        className="text-[var(--bc-link)] hover:text-[var(--bc-link-hover)] font-medium"
                      >
                        {deal.name}
                      </Link>
                    </td>
                    <td>
                      <span className="bc-badge bg-blue-50 text-blue-700">
                        {deal.stage?.name || "-"}
                      </span>
                    </td>
                    <td>{deal.amount != null ? formatCurrency(deal.amount) : "-"}</td>
                    <td>{deal.closeDate ? formatDate(deal.closeDate) : "-"}</td>
                    <td>
                      {deal.account ? (
                        <Link
                          href={`/accounts/${deal.account.id}`}
                          className="text-[var(--bc-link)] hover:text-[var(--bc-link-hover)]"
                        >
                          {deal.account.name}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{formatDate(deal.createdAt)}</td>
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
