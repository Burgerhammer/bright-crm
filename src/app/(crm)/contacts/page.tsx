"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { formatDate } from "@/lib/utils";
import BulkActionBar from "@/components/BulkActionBar";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  account: { id: string; name: string } | null;
  owner: { id: string; name: string } | null;
  createdAt: string;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/contacts");
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    if (selectedIds.length === contacts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(contacts.map((c) => c.id));
    }
  }

  function handleBulkComplete() {
    setSelectedIds([]);
    fetchContacts();
  }

  const allSelected =
    contacts.length > 0 && selectedIds.length === contacts.length;
  const someSelected =
    selectedIds.length > 0 && selectedIds.length < contacts.length;

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[var(--bc-text)]">Contacts</h1>
        <Link href="/contacts/new" className="bc-btn bc-btn-primary">
          <Plus className="w-4 h-4" />
          New Contact
        </Link>
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedIds={selectedIds}
        entityType="contacts"
        onComplete={handleBulkComplete}
        onClear={() => setSelectedIds([])}
      />

      {/* Contacts Table */}
      <div className="bc-card">
        <div className="bc-section-header">
          All Contacts ({contacts.length})
        </div>
        <div className="overflow-x-auto">
          <table className="bc-table">
            <thead>
              <tr>
                <th className="w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleSelectAll}
                    className="rounded border-[#DDDBDA]"
                  />
                </th>
                <th>Name</th>
                <th className="hidden sm:table-cell">Title</th>
                <th>Account Name</th>
                <th className="hidden sm:table-cell">Email</th>
                <th>Phone</th>
                <th className="hidden lg:table-cell">Owner</th>
                <th className="hidden lg:table-cell">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-8 text-[var(--bc-text-light)]"
                  >
                    Loading...
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-8 text-[var(--bc-text-light)]"
                  >
                    No contacts yet.{" "}
                    <Link
                      href="/contacts/new"
                      className="text-[var(--bc-link)] hover:text-[var(--bc-link-hover)]"
                    >
                      Create your first contact
                    </Link>
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className={
                      selectedIds.includes(contact.id) ? "bg-[#E8F4FC]" : ""
                    }
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(contact.id)}
                        onChange={() => toggleSelect(contact.id)}
                        className="rounded border-[#DDDBDA]"
                      />
                    </td>
                    <td>
                      <Link
                        href={`/contacts/${contact.id}`}
                        className="text-[var(--bc-link)] hover:text-[var(--bc-link-hover)] font-medium"
                      >
                        {contact.firstName} {contact.lastName}
                      </Link>
                    </td>
                    <td className="hidden sm:table-cell">
                      {contact.title || "-"}
                    </td>
                    <td>
                      {contact.account ? (
                        <Link
                          href={`/accounts/${contact.account.id}`}
                          className="text-[var(--bc-link)] hover:text-[var(--bc-link-hover)]"
                        >
                          {contact.account.name}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="hidden sm:table-cell">
                      {contact.email || "-"}
                    </td>
                    <td>{contact.phone || "-"}</td>
                    <td className="hidden lg:table-cell">
                      {contact.owner?.name || "-"}
                    </td>
                    <td className="hidden lg:table-cell">
                      {formatDate(contact.createdAt)}
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
