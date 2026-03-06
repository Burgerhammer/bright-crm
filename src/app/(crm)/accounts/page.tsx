"use client";

import Link from "next/link";
import { Plus, Building2 } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import BulkActionBar from "@/components/BulkActionBar";

const typeBadgeColors: Record<string, string> = {
  Prospect: "bg-blue-100 text-blue-800",
  Customer: "bg-green-100 text-green-800",
  Partner: "bg-purple-100 text-purple-800",
  Vendor: "bg-orange-100 text-orange-800",
  Other: "bg-gray-100 text-gray-700",
};

const typeOptions = ["Prospect", "Customer", "Partner", "Vendor", "Other"];

interface Account {
  id: string;
  name: string;
  industry: string | null;
  type: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  annualRevenue: number | null;
  employees: number | null;
  owner: { id: string; name: string; email: string } | null;
}

const UPDATE_FIELDS = [
  {
    key: "type",
    label: "Update Type",
    options: typeOptions.map((t) => ({ label: t, value: t })),
  },
];

export default function AccountsPage() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type");

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const url = type ? `/api/accounts?type=${type}` : "/api/accounts";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      }
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Clear selection when filter changes
  useEffect(() => {
    setSelectedIds([]);
  }, [type]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    if (selectedIds.length === accounts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(accounts.map((a) => a.id));
    }
  }

  function handleBulkComplete() {
    setSelectedIds([]);
    fetchAccounts();
  }

  const allSelected =
    accounts.length > 0 && selectedIds.length === accounts.length;
  const someSelected =
    selectedIds.length > 0 && selectedIds.length < accounts.length;

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-6 h-6 text-[#0070D2]" />
          <h1 className="text-xl font-bold text-[#3E3E3C]">Accounts</h1>
          <span className="text-sm text-[#706E6B] ml-1">
            ({accounts.length})
          </span>
        </div>
        <Link href="/accounts/new" className="bc-btn bc-btn-primary">
          <Plus className="w-4 h-4" />
          New Account
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bc-card mb-4">
        <div className="p-3 flex items-center gap-3">
          <label className="text-xs font-semibold text-[#706E6B] uppercase tracking-wide">
            Filter by Type
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/accounts"
              className={`bc-btn text-xs ${
                !type ? "bc-btn-primary" : "bc-btn-neutral"
              }`}
            >
              All
            </Link>
            {typeOptions.map((t) => (
              <Link
                key={t}
                href={`/accounts?type=${t}`}
                className={`bc-btn text-xs ${
                  type === t ? "bc-btn-primary" : "bc-btn-neutral"
                }`}
              >
                {t}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedIds={selectedIds}
        entityType="accounts"
        onComplete={handleBulkComplete}
        onClear={() => setSelectedIds([])}
        updateFields={UPDATE_FIELDS}
      />

      {/* Table */}
      <div className="bc-card overflow-hidden">
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
                <th className="hidden sm:table-cell">Industry</th>
                <th className="hidden md:table-cell">Type</th>
                <th className="hidden sm:table-cell">Phone</th>
                <th>City / State</th>
                <th className="hidden lg:table-cell">Revenue</th>
                <th className="hidden lg:table-cell">Employees</th>
                <th className="hidden lg:table-cell">Owner</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center py-8 text-[#706E6B] text-sm"
                  >
                    Loading...
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center py-8 text-[#706E6B] text-sm"
                  >
                    No accounts found.{" "}
                    <Link
                      href="/accounts/new"
                      className="text-[#0070D2] hover:text-[#005FB2]"
                    >
                      Create one
                    </Link>
                  </td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr
                    key={account.id}
                    className={
                      selectedIds.includes(account.id) ? "bg-[#E8F4FC]" : ""
                    }
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(account.id)}
                        onChange={() => toggleSelect(account.id)}
                        className="rounded border-[#DDDBDA]"
                      />
                    </td>
                    <td>
                      <Link
                        href={`/accounts/${account.id}`}
                        className="text-[#0070D2] hover:text-[#005FB2] font-medium"
                      >
                        {account.name}
                      </Link>
                    </td>
                    <td className="hidden sm:table-cell text-[#706E6B]">
                      {account.industry || "--"}
                    </td>
                    <td className="hidden md:table-cell">
                      {account.type ? (
                        <span
                          className={`bc-badge ${
                            typeBadgeColors[account.type] ||
                            typeBadgeColors.Other
                          }`}
                        >
                          {account.type}
                        </span>
                      ) : (
                        <span className="text-[#706E6B]">--</span>
                      )}
                    </td>
                    <td className="hidden sm:table-cell text-[#706E6B]">
                      {account.phone || "--"}
                    </td>
                    <td className="text-[#706E6B]">
                      {account.city && account.state
                        ? `${account.city}, ${account.state}`
                        : account.city || account.state || "--"}
                    </td>
                    <td className="hidden lg:table-cell text-[#706E6B]">
                      {account.annualRevenue
                        ? formatCurrency(account.annualRevenue)
                        : "--"}
                    </td>
                    <td className="hidden lg:table-cell text-[#706E6B]">
                      {account.employees?.toLocaleString() || "--"}
                    </td>
                    <td className="hidden lg:table-cell text-[#706E6B]">
                      {account.owner?.name || "--"}
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
