"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { formatDate } from "@/lib/utils";
import BulkActionBar from "@/components/BulkActionBar";

const statusColors: Record<string, string> = {
  New: "bg-blue-100 text-blue-800",
  Contacted: "bg-yellow-100 text-yellow-800",
  Qualified: "bg-green-100 text-green-800",
  Unqualified: "bg-gray-100 text-gray-600",
  Converted: "bg-purple-100 text-purple-800",
};

const ratingColors: Record<string, string> = {
  Hot: "text-red-600 font-bold",
  Warm: "text-orange-500 font-semibold",
  Cold: "text-blue-400",
};

const STATUSES = ["All", "New", "Contacted", "Qualified", "Unqualified", "Converted"];

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  company: string | null;
  status: string;
  rating: string | null;
  owner: { id: string; name: string } | null;
  createdAt: string;
}

const UPDATE_FIELDS = [
  {
    key: "status",
    label: "Update Status",
    options: [
      { label: "New", value: "New" },
      { label: "Contacted", value: "Contacted" },
      { label: "Qualified", value: "Qualified" },
      { label: "Unqualified", value: "Unqualified" },
      { label: "Converted", value: "Converted" },
    ],
  },
];

export default function LeadsPage() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const activeStatus = status && status !== "All" ? status : undefined;

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const url = activeStatus
        ? `/api/leads?status=${activeStatus}`
        : "/api/leads";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } finally {
      setLoading(false);
    }
  }, [activeStatus]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Clear selection when filter changes
  useEffect(() => {
    setSelectedIds([]);
  }, [activeStatus]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    if (selectedIds.length === leads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leads.map((l) => l.id));
    }
  }

  function handleBulkComplete() {
    setSelectedIds([]);
    fetchLeads();
  }

  const allSelected = leads.length > 0 && selectedIds.length === leads.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < leads.length;

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-4">
        <h1 className="text-xl font-bold text-[#3E3E3C]">Leads</h1>
        <Link href="/leads/new" className="bc-btn bc-btn-primary">
          <Plus className="w-4 h-4" />
          New Lead
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bc-card mb-4">
        <div className="px-4 py-3 flex items-center gap-3">
          <label className="text-xs font-semibold text-[#706E6B] uppercase">
            Status:
          </label>
          <div className="flex gap-1">
            {STATUSES.map((s) => {
              const isActive =
                s === "All" ? !activeStatus : s === activeStatus;
              return (
                <Link
                  key={s}
                  href={s === "All" ? "/leads" : `/leads?status=${s}`}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-[#0070D2] text-white"
                      : "bg-[#F4F6F9] text-[#3E3E3C] hover:bg-[#DDDBDA]"
                  }`}
                >
                  {s}
                </Link>
              );
            })}
          </div>
          <span className="ml-auto text-xs text-[#706E6B]">
            {leads.length} {leads.length === 1 ? "record" : "records"}
          </span>
        </div>
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedIds={selectedIds}
        entityType="leads"
        onComplete={handleBulkComplete}
        onClear={() => setSelectedIds([])}
        updateFields={UPDATE_FIELDS}
      />

      {/* Leads Table */}
      <div className="bc-card overflow-hidden overflow-x-auto">
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
              <th>Company</th>
              <th className="hidden sm:table-cell">Email</th>
              <th>Status</th>
              <th className="hidden md:table-cell">Rating</th>
              <th className="hidden lg:table-cell">Owner</th>
              <th className="hidden lg:table-cell">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-[#706E6B]">
                  Loading...
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-[#706E6B]">
                  No leads found.{" "}
                  <Link
                    href="/leads/new"
                    className="text-[#0070D2] hover:text-[#005FB2]"
                  >
                    Create your first lead
                  </Link>
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr
                  key={lead.id}
                  className={
                    selectedIds.includes(lead.id) ? "bg-[#E8F4FC]" : ""
                  }
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(lead.id)}
                      onChange={() => toggleSelect(lead.id)}
                      className="rounded border-[#DDDBDA]"
                    />
                  </td>
                  <td>
                    <Link
                      href={`/leads/${lead.id}`}
                      className="text-[#0070D2] hover:text-[#005FB2] font-medium"
                    >
                      {lead.firstName} {lead.lastName}
                    </Link>
                  </td>
                  <td className="text-[#3E3E3C]">{lead.company || "--"}</td>
                  <td className="hidden sm:table-cell text-[#3E3E3C]">
                    {lead.email || "--"}
                  </td>
                  <td>
                    <span
                      className={`bc-badge ${statusColors[lead.status] || "bg-gray-100 text-gray-600"}`}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="hidden md:table-cell">
                    {lead.rating ? (
                      <span className={ratingColors[lead.rating] || ""}>
                        {lead.rating}
                      </span>
                    ) : (
                      <span className="text-[#706E6B]">--</span>
                    )}
                  </td>
                  <td className="hidden lg:table-cell text-[#3E3E3C]">
                    {lead.owner?.name || "--"}
                  </td>
                  <td className="hidden lg:table-cell text-[#706E6B] text-xs">
                    {formatDate(lead.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
