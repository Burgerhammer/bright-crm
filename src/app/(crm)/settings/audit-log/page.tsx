"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changes: string | null;
  userId: string;
  user: { id: string; name: string; email: string };
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const entityLinks: Record<string, string> = {
  Lead: "/leads",
  Contact: "/contacts",
  Account: "/accounts",
  Deal: "/deals",
  Task: "/tasks",
};

function ChangesDisplay({ changes }: { changes: string | null }) {
  if (!changes) return <span className="text-[#706E6B]">--</span>;

  try {
    const parsed = JSON.parse(changes) as Record<
      string,
      { old: unknown; new: unknown }
    >;
    const keys = Object.keys(parsed);

    if (keys.length === 0) {
      return <span className="text-[#706E6B]">No changes</span>;
    }

    return (
      <div className="space-y-1">
        {keys.map((key) => (
          <div key={key} className="text-xs">
            <span className="font-medium text-[#3E3E3C]">{key}:</span>{" "}
            <span className="text-red-600 line-through">
              {String(parsed[key].old ?? "empty")}
            </span>{" "}
            <span className="text-[#706E6B]">&rarr;</span>{" "}
            <span className="text-green-700">
              {String(parsed[key].new ?? "empty")}
            </span>
          </div>
        ))}
      </div>
    );
  } catch {
    return <span className="text-[#706E6B] text-xs">{changes}</span>;
  }
}

function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    create: "bg-green-100 text-green-700",
    update: "bg-blue-100 text-blue-700",
    delete: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`bc-badge ${colors[action] || "bg-gray-100 text-gray-700"}`}
    >
      {action}
    </span>
  );
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterEntityType, setFilterEntityType] = useState("");

  const fetchLogs = useCallback(async (page: number, entityType: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (entityType) params.set("entityType", entityType);

    const res = await fetch(`/api/audit-log?${params}`);
    if (res.ok) {
      const data = await res.json();
      setLogs(data.data);
      setPagination(data.pagination);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs(pagination.page, filterEntityType);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (entityType: string) => {
    setFilterEntityType(entityType);
    fetchLogs(1, entityType);
  };

  const handlePageChange = (page: number) => {
    fetchLogs(page, filterEntityType);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="text-[#706E6B] hover:text-[#3E3E3C]"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <FileText className="w-6 h-6 text-[#706E6B]" />
          <h1 className="text-xl font-bold text-[#3E3E3C]">Audit Log</h1>
        </div>
        <div>
          <select
            className="bc-input text-sm"
            value={filterEntityType}
            onChange={(e) => handleFilterChange(e.target.value)}
          >
            <option value="">All Entity Types</option>
            <option value="Lead">Leads</option>
            <option value="Contact">Contacts</option>
            <option value="Account">Accounts</option>
            <option value="Deal">Deals</option>
            <option value="Task">Tasks</option>
          </select>
        </div>
      </div>

      <div className="bc-card">
        <div className="overflow-x-auto">
          <table className="bc-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity Type</th>
                <th>Entity</th>
                <th>Changes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center text-[#706E6B] py-8">
                    Loading...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-[#706E6B] py-8">
                    No audit log entries found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap text-sm">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="text-sm">{log.user.name}</td>
                    <td>
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="text-sm">{log.entityType}</td>
                    <td className="text-sm">
                      {log.action === "delete" ? (
                        <span className="text-[#706E6B]">{log.entityId}</span>
                      ) : (
                        <Link
                          href={`${entityLinks[log.entityType] || ""}/${log.entityId}`}
                          className="text-[#0070D2] hover:underline"
                        >
                          {log.entityId.slice(0, 12)}...
                        </Link>
                      )}
                    </td>
                    <td className="max-w-xs">
                      <ChangesDisplay changes={log.changes} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#DDDBDA]">
            <span className="text-sm text-[#706E6B]">
              Showing {(pagination.page - 1) * pagination.limit + 1} -{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
              {pagination.total}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="bc-btn bc-btn-neutral text-sm py-1 px-2 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-[#3E3E3C]">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="bc-btn bc-btn-neutral text-sm py-1 px-2 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
