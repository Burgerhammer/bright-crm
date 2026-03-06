"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bot,
  Search,
  Sparkles,
  Mail,
  MessageSquare,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft,
  CheckCheck,
} from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";

// --- Types ---

interface AgentActivityItem {
  id: string;
  agentType: string;
  action: string;
  description: string;
  entityType: string | null;
  entityId: string | null;
  status: string;
  metadata: string | null;
  createdAt: string;
}

// --- Agent metadata ---

const AGENT_META: Record<
  string,
  {
    name: string;
    icon: React.ElementType;
    color: string;
    badgeColor: string;
  }
> = {
  prospector: {
    name: "Prospector",
    icon: Search,
    color: "text-blue-600",
    badgeColor: "bg-blue-100 text-blue-700",
  },
  enricher: {
    name: "Enricher",
    icon: Sparkles,
    color: "text-purple-600",
    badgeColor: "bg-purple-100 text-purple-700",
  },
  outreach: {
    name: "Outreach",
    icon: Mail,
    color: "text-green-600",
    badgeColor: "bg-green-100 text-green-700",
  },
  follow_up: {
    name: "Follow-up",
    icon: MessageSquare,
    color: "text-yellow-600",
    badgeColor: "bg-yellow-100 text-yellow-700",
  },
  pipeline_mover: {
    name: "Pipeline Mover",
    icon: TrendingUp,
    color: "text-orange-600",
    badgeColor: "bg-orange-100 text-orange-700",
  },
};

function getAgentMeta(agentType: string) {
  return (
    AGENT_META[agentType] || {
      name: agentType,
      icon: Bot,
      color: "text-gray-600",
      badgeColor: "bg-gray-100 text-gray-700",
    }
  );
}

function getEntityLink(entityType: string | null, entityId: string | null): string | null {
  if (!entityType || !entityId) return null;
  const map: Record<string, string> = {
    Lead: "/leads",
    Contact: "/contacts",
    Account: "/accounts",
    Deal: "/deals",
  };
  const base = map[entityType];
  if (!base) return null;
  return `${base}/${entityId}`;
}

const AGENT_TYPES = [
  { value: "", label: "All Agents" },
  { value: "prospector", label: "Prospector" },
  { value: "enricher", label: "Enricher" },
  { value: "outreach", label: "Outreach" },
  { value: "follow_up", label: "Follow-up" },
  { value: "pipeline_mover", label: "Pipeline Mover" },
];

export default function ApprovalsPage() {
  const [activities, setActivities] = useState<AgentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentFilter, setAgentFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const fetchActivities = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(p),
          limit: "20",
          status: "pending_approval",
        });
        if (agentFilter) params.set("agentType", agentFilter);

        const res = await fetch(`/api/agents/activity?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setActivities(data.activities);
          setPage(data.page);
          setTotalPages(data.totalPages);
          setTotal(data.total);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    },
    [agentFilter]
  );

  useEffect(() => {
    fetchActivities(1);
    setSelectedIds(new Set());
  }, [fetchActivities]);

  // Individual approve/reject
  async function handleAction(id: string, status: "approved" | "rejected") {
    try {
      const res = await fetch("/api/agents/activity", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        fetchActivities(page);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    } catch {
      // silently fail
    }
  }

  // Bulk approve/reject
  async function handleBulkAction(status: "approved" | "rejected") {
    if (selectedIds.size === 0) return;
    setBulkProcessing(true);
    try {
      const res = await fetch("/api/agents/activity", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), status }),
      });
      if (res.ok) {
        setSelectedIds(new Set());
        fetchActivities(page);
      }
    } catch {
      // silently fail
    } finally {
      setBulkProcessing(false);
    }
  }

  // Toggle individual selection
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // Toggle all
  function toggleSelectAll() {
    if (selectedIds.size === activities.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(activities.map((a) => a.id)));
    }
  }

  const allSelected = activities.length > 0 && selectedIds.size === activities.length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/autopilot"
            className="p-1.5 rounded hover:bg-[#F4F6F9] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#706E6B]" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#3E3E3C]">
              Approval Queue
            </h1>
            <p className="text-xs text-[#706E6B]">
              {total} pending {total === 1 ? "action" : "actions"} awaiting
              review
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Bulk Actions */}
      <div className="bc-card mb-4">
        <div className="px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-[#706E6B] uppercase">
              Agent:
            </label>
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="bc-input !w-auto !py-1 text-xs"
            >
              {AGENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 sm:ml-auto">
              <span className="text-xs text-[#706E6B]">
                {selectedIds.size} selected
              </span>
              <button
                onClick={() => handleBulkAction("approved")}
                disabled={bulkProcessing}
                className="bc-btn text-xs !py-1 !px-2.5 bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
              >
                {bulkProcessing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <CheckCheck className="w-3 h-3" />
                )}
                Approve All
              </button>
              <button
                onClick={() => handleBulkAction("rejected")}
                disabled={bulkProcessing}
                className="bc-btn text-xs !py-1 !px-2.5 bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
              >
                {bulkProcessing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <XCircle className="w-3 h-3" />
                )}
                Reject All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bc-card overflow-hidden overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-[#706E6B] animate-spin mr-2" />
            <p className="text-[#706E6B]">Loading approvals...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[#706E6B]">
            <CheckCircle2 className="w-8 h-8 mb-2 text-green-400" />
            <p className="text-sm font-medium">All caught up!</p>
            <p className="text-xs mt-1">No pending approvals at this time.</p>
            <Link
              href="/autopilot"
              className="text-xs text-[#0070D2] hover:text-[#005FB2] mt-3"
            >
              Back to Autopilot
            </Link>
          </div>
        ) : (
          <table className="bc-table">
            <thead>
              <tr>
                <th className="w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th>Date</th>
                <th>Agent</th>
                <th>Action</th>
                <th>Description</th>
                <th className="hidden md:table-cell">Entity</th>
                <th className="w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((activity) => {
                const meta = getAgentMeta(activity.agentType);
                const Icon = meta.icon;
                const entityLink = getEntityLink(
                  activity.entityType,
                  activity.entityId
                );

                return (
                  <tr key={activity.id}>
                    <td className="w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(activity.id)}
                        onChange={() => toggleSelect(activity.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="text-xs text-[#706E6B] whitespace-nowrap">
                      {formatDateTime(activity.createdAt)}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                            meta.badgeColor
                          )}
                        >
                          <Icon className="w-3 h-3" />
                        </div>
                        <span className="text-xs font-medium text-[#3E3E3C]">
                          {meta.name}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="bc-badge bg-gray-100 text-gray-700 text-[10px]">
                        {activity.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="text-xs text-[#3E3E3C] max-w-xs truncate">
                      {activity.description}
                    </td>
                    <td className="hidden md:table-cell">
                      {entityLink ? (
                        <Link
                          href={entityLink}
                          className="text-xs text-[#0070D2] hover:text-[#005FB2]"
                        >
                          {activity.entityType} &rarr;
                        </Link>
                      ) : (
                        <span className="text-xs text-[#706E6B]">--</span>
                      )}
                    </td>
                    <td className="w-24">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            handleAction(activity.id, "approved")
                          }
                          className="p-1.5 rounded hover:bg-green-100 text-green-600 transition-colors"
                          title="Approve"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            handleAction(activity.id, "rejected")
                          }
                          className="p-1.5 rounded hover:bg-red-100 text-red-600 transition-colors"
                          title="Reject"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-[#DDDBDA] flex items-center justify-between">
            <span className="text-xs text-[#706E6B]">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchActivities(page - 1)}
                disabled={page <= 1}
                className={cn(
                  "bc-btn bc-btn-neutral text-xs !py-1 !px-2.5",
                  page <= 1 && "opacity-50 cursor-not-allowed"
                )}
              >
                Previous
              </button>
              <button
                onClick={() => fetchActivities(page + 1)}
                disabled={page >= totalPages}
                className={cn(
                  "bc-btn bc-btn-neutral text-xs !py-1 !px-2.5",
                  page >= totalPages && "opacity-50 cursor-not-allowed"
                )}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
