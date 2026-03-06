"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, RefreshCw, Mail, Phone, User } from "lucide-react";

interface RecordInfo {
  id: string;
  entityType: "Lead" | "Contact";
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
}

interface DuplicateGroup {
  matchType: string;
  matchValue: string;
  records: RecordInfo[];
}

function matchIcon(matchType: string) {
  switch (matchType) {
    case "email":
      return <Mail className="w-4 h-4" />;
    case "phone":
      return <Phone className="w-4 h-4" />;
    case "name":
      return <User className="w-4 h-4" />;
    default:
      return <Copy className="w-4 h-4" />;
  }
}

function matchLabel(matchType: string): string {
  switch (matchType) {
    case "email":
      return "Email Match";
    case "phone":
      return "Phone Match";
    case "name":
      return "Name Match";
    default:
      return "Match";
  }
}

export default function DuplicatesPage() {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDuplicates() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/duplicates");
      if (!res.ok) throw new Error("Failed to load duplicates");
      const data = await res.json();
      setGroups(data.groups || []);
    } catch {
      setError("Failed to load duplicate records");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDuplicates();
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="text-[#706E6B] hover:text-[#3E3E3C]"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Copy className="w-6 h-6 text-[#706E6B]" />
            <h1 className="text-xl font-bold text-[#3E3E3C]">
              Duplicate Detection
            </h1>
          </div>
        </div>
        <button
          onClick={loadDuplicates}
          disabled={loading}
          className="bc-btn bc-btn-neutral"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Scanning..." : "Rescan"}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && groups.length === 0 && (
        <div className="bc-card">
          <div className="p-8 text-center text-sm text-[#706E6B]">
            Scanning for duplicate records...
          </div>
        </div>
      )}

      {!loading && groups.length === 0 && (
        <div className="bc-card">
          <div className="p-8 text-center">
            <Copy className="w-10 h-10 text-[#706E6B] mx-auto mb-3" />
            <p className="text-sm text-[#706E6B]">
              No potential duplicates found. Your records look clean.
            </p>
          </div>
        </div>
      )}

      {groups.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-[#706E6B]">
            Found {groups.length} potential duplicate group{groups.length !== 1 ? "s" : ""} across leads and contacts.
          </p>

          {groups.map((group, idx) => (
            <div key={idx} className="bc-card">
              <div className="bc-section-header flex items-center gap-2">
                {matchIcon(group.matchType)}
                <span>{matchLabel(group.matchType)}</span>
                <span className="text-xs font-normal text-[#706E6B] ml-1">
                  &mdash; &quot;{group.matchValue}&quot;
                </span>
                <span className="ml-auto bc-badge text-xs">
                  {group.records.length} records
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="bc-table w-full">
                  <thead>
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-[#706E6B] uppercase">
                        Type
                      </th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-[#706E6B] uppercase">
                        Name
                      </th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-[#706E6B] uppercase">
                        Email
                      </th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-[#706E6B] uppercase">
                        Phone
                      </th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-[#706E6B] uppercase">
                        Company
                      </th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-[#706E6B] uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.records.map((record) => {
                      const href =
                        record.entityType === "Lead"
                          ? `/leads/${record.id}`
                          : `/contacts/${record.id}`;
                      return (
                        <tr
                          key={`${record.entityType}-${record.id}`}
                          className="border-t border-[#E5E5E5]"
                        >
                          <td className="px-4 py-2">
                            <span
                              className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${
                                record.entityType === "Lead"
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-green-50 text-green-700"
                              }`}
                            >
                              {record.entityType}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-[#3E3E3C]">
                            {record.firstName} {record.lastName}
                          </td>
                          <td className="px-4 py-2 text-sm text-[#706E6B]">
                            {record.email || "--"}
                          </td>
                          <td className="px-4 py-2 text-sm text-[#706E6B]">
                            {record.phone || "--"}
                          </td>
                          <td className="px-4 py-2 text-sm text-[#706E6B]">
                            {record.company || "--"}
                          </td>
                          <td className="px-4 py-2">
                            <Link
                              href={href}
                              className="text-sm text-[#0070D2] hover:underline"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
