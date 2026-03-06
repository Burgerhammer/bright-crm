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
  Play,
  Loader2,
  Users,
  Send,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Settings2,
  Target,
  ListChecks,
} from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";

// --- Types ---

interface AgentConfig {
  id: string;
  agentType: string;
  enabled: boolean;
  approvalRequired: boolean;
  config: string | null;
  schedule: string | null;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

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

interface Stats {
  leadsFound: { today: number; total: number };
  emailsSent: { today: number; total: number };
  dealsAdvanced: { today: number; total: number };
  pendingApprovals: number;
}

// --- Agent metadata ---

const AGENT_META: Record<
  string,
  {
    name: string;
    description: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    badgeColor: string;
  }
> = {
  prospector: {
    name: "Prospector",
    description: "Finds new leads matching your ICP",
    icon: Search,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    badgeColor: "bg-blue-100 text-blue-700",
  },
  enricher: {
    name: "Enricher",
    description: "Fills in missing data on leads",
    icon: Sparkles,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    badgeColor: "bg-purple-100 text-purple-700",
  },
  outreach: {
    name: "Outreach",
    description: "Sends personalized email sequences",
    icon: Mail,
    color: "text-green-600",
    bgColor: "bg-green-50",
    badgeColor: "bg-green-100 text-green-700",
  },
  follow_up: {
    name: "Follow-up",
    description: "Manages replies and follow-ups",
    icon: MessageSquare,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    badgeColor: "bg-yellow-100 text-yellow-700",
  },
  pipeline_mover: {
    name: "Pipeline Mover",
    description: "Advances deals through stages",
    icon: TrendingUp,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    badgeColor: "bg-orange-100 text-orange-700",
  },
};

function getAgentMeta(agentType: string) {
  return (
    AGENT_META[agentType] || {
      name: agentType,
      description: "",
      icon: Bot,
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      badgeColor: "bg-gray-100 text-gray-700",
    }
  );
}

function formatSchedule(schedule: string | null): string {
  if (!schedule) return "Manual";
  const map: Record<string, string> = {
    every_hour: "Every hour",
    every_6_hours: "Every 6 hours",
    daily: "Daily",
  };
  return map[schedule] || schedule;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
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

// --- Component ---

export default function AutopilotPage() {
  const [systemActive, setSystemActive] = useState(false);
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activities, setActivities] = useState<AgentActivityItem[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotalPages, setActivityTotalPages] = useState(1);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [runningAgents, setRunningAgents] = useState<Set<string>>(new Set());

  // Fetch agents
  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents/config");
      if (res.ok) {
        const data: AgentConfig[] = await res.json();
        setAgents(data);
        // System is "active" if any agent is enabled
        setSystemActive(data.some((a) => a.enabled));
      }
    } catch {
      // silently fail
    } finally {
      setLoadingAgents(false);
    }
  }, []);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/agents/stats");
      if (res.ok) {
        setStats(await res.json());
      }
    } catch {
      // silently fail
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Fetch activities
  const fetchActivities = useCallback(async (page = 1) => {
    try {
      const res = await fetch(`/api/agents/activity?page=${page}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        if (page === 1) {
          setActivities(data.activities);
        } else {
          setActivities((prev) => [...prev, ...data.activities]);
        }
        setActivityPage(data.page);
        setActivityTotalPages(data.totalPages);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingActivities(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAgents();
    fetchStats();
    fetchActivities(1);
  }, [fetchAgents, fetchStats, fetchActivities]);

  // Auto-refresh activities every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchActivities(1);
      fetchStats();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchActivities, fetchStats]);

  // Toggle agent enabled
  async function handleToggleAgent(agentType: string, currentEnabled: boolean) {
    try {
      const res = await fetch("/api/agents/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentType, enabled: !currentEnabled }),
      });
      if (res.ok) {
        fetchAgents();
      }
    } catch {
      // silently fail
    }
  }

  // Toggle approval mode
  async function handleToggleApproval(agentType: string, currentApproval: boolean) {
    try {
      const res = await fetch("/api/agents/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentType, approvalRequired: !currentApproval }),
      });
      if (res.ok) {
        fetchAgents();
      }
    } catch {
      // silently fail
    }
  }

  // Run agent now
  async function handleRunAgent(agentType: string) {
    setRunningAgents((prev) => new Set(prev).add(agentType));
    try {
      await fetch(`/api/agents/${agentType}/run`, { method: "POST" });
      // Refresh data after a brief delay
      setTimeout(() => {
        fetchAgents();
        fetchStats();
        fetchActivities(1);
        setRunningAgents((prev) => {
          const next = new Set(prev);
          next.delete(agentType);
          return next;
        });
      }, 2000);
    } catch {
      setRunningAgents((prev) => {
        const next = new Set(prev);
        next.delete(agentType);
        return next;
      });
    }
  }

  // Toggle master system
  async function handleToggleSystem() {
    const newState = !systemActive;
    setSystemActive(newState);
    // Enable/disable all agents
    for (const agent of agents) {
      try {
        await fetch("/api/agents/config", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentType: agent.agentType, enabled: newState }),
        });
      } catch {
        // silently fail
      }
    }
    fetchAgents();
  }

  // Approve/reject activity
  async function handleApproval(id: string, status: "approved" | "rejected") {
    try {
      const res = await fetch("/api/agents/activity", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        fetchActivities(1);
        fetchStats();
      }
    } catch {
      // silently fail
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#0070D2] rounded-lg flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#3E3E3C]">Autopilot</h1>
            <p className="text-xs text-[#706E6B]">Autonomous AI agent control center</p>
          </div>
        </div>
        <button
          onClick={handleToggleSystem}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            systemActive
              ? "bg-green-100 text-green-800 hover:bg-green-200"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          <span
            className={cn(
              "w-2.5 h-2.5 rounded-full",
              systemActive ? "bg-green-500 animate-pulse" : "bg-gray-400"
            )}
          />
          {systemActive ? "System Active" : "System Paused"}
        </button>
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        {loadingAgents
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bc-card p-4 animate-pulse">
                <div className="h-8 w-8 bg-gray-200 rounded mb-3" />
                <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-full bg-gray-200 rounded" />
              </div>
            ))
          : agents.map((agent) => {
              const meta = getAgentMeta(agent.agentType);
              const Icon = meta.icon;
              const isRunning = runningAgents.has(agent.agentType);
              return (
                <div key={agent.id} className="bc-card p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center",
                        meta.bgColor
                      )}
                    >
                      <Icon className={cn("w-5 h-5", meta.color)} />
                    </div>
                    {/* Toggle switch */}
                    <button
                      onClick={() =>
                        handleToggleAgent(agent.agentType, agent.enabled)
                      }
                      className={cn(
                        "relative w-10 h-5 rounded-full transition-colors",
                        agent.enabled ? "bg-green-500" : "bg-gray-300"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                          agent.enabled ? "translate-x-5" : "translate-x-0.5"
                        )}
                      />
                    </button>
                  </div>

                  <h3 className="text-sm font-semibold text-[#3E3E3C]">
                    {meta.name}
                  </h3>
                  <p className="text-xs text-[#706E6B] mt-0.5 mb-3 line-clamp-2">
                    {meta.description}
                  </p>

                  {/* Approval badge */}
                  <button
                    onClick={() =>
                      handleToggleApproval(
                        agent.agentType,
                        agent.approvalRequired
                      )
                    }
                    className={cn(
                      "bc-badge text-[10px] cursor-pointer mb-3",
                      agent.approvalRequired
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                    )}
                  >
                    {agent.approvalRequired ? "Needs Approval" : "Auto"}
                  </button>

                  {/* Last run + schedule */}
                  <div className="flex items-center gap-1 text-[10px] text-[#706E6B] mb-3">
                    <Clock className="w-3 h-3" />
                    <span>
                      {formatRelativeTime(agent.lastRunAt)} &middot;{" "}
                      {formatSchedule(agent.schedule)}
                    </span>
                  </div>

                  {/* Run now button */}
                  <button
                    onClick={() => handleRunAgent(agent.agentType)}
                    disabled={isRunning}
                    className={cn(
                      "w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors",
                      isRunning
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-[#F4F6F9] text-[#3E3E3C] hover:bg-[#DDDBDA]"
                    )}
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3" />
                        Run Now
                      </>
                    )}
                  </button>
                </div>
              );
            })}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loadingStats ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bc-card px-4 py-3 animate-pulse">
              <div className="h-3 w-20 bg-gray-200 rounded mb-2" />
              <div className="h-6 w-12 bg-gray-200 rounded" />
            </div>
          ))
        ) : stats ? (
          <>
            <div className="bc-card px-4 py-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-[#706E6B] uppercase">
                  Leads Found
                </span>
              </div>
              <p className="text-2xl font-bold text-[#3E3E3C] mt-1">
                {stats.leadsFound.today}
              </p>
              <p className="text-xs text-[#706E6B]">
                {stats.leadsFound.total} total
              </p>
            </div>
            <div className="bc-card px-4 py-3">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-green-600" />
                <span className="text-xs font-semibold text-[#706E6B] uppercase">
                  Emails Sent
                </span>
              </div>
              <p className="text-2xl font-bold text-[#3E3E3C] mt-1">
                {stats.emailsSent.today}
              </p>
              <p className="text-xs text-[#706E6B]">
                {stats.emailsSent.total} total
              </p>
            </div>
            <div className="bc-card px-4 py-3">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-semibold text-[#706E6B] uppercase">
                  Deals Advanced
                </span>
              </div>
              <p className="text-2xl font-bold text-[#3E3E3C] mt-1">
                {stats.dealsAdvanced.today}
              </p>
              <p className="text-xs text-[#706E6B]">
                {stats.dealsAdvanced.total} total
              </p>
            </div>
            <div className="bc-card px-4 py-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span className="text-xs font-semibold text-[#706E6B] uppercase">
                  Pending Approvals
                </span>
              </div>
              <p className="text-2xl font-bold text-[#3E3E3C] mt-1">
                {stats.pendingApprovals}
              </p>
              <Link
                href="/autopilot/approvals"
                className="text-xs text-[#0070D2] hover:text-[#005FB2]"
              >
                View queue
              </Link>
            </div>
          </>
        ) : null}
      </div>

      {/* Activity Feed + Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Activity Feed */}
        <div className="lg:col-span-3 bc-card overflow-hidden">
          <div className="bc-section-header px-4 py-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#3E3E3C]">
              Activity Feed
            </h2>
            <span className="text-xs text-[#706E6B]">Auto-refreshes every 10s</span>
          </div>

          {loadingActivities ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-[#706E6B] animate-spin" />
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#706E6B]">
              <Bot className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">No agent activity yet</p>
              <p className="text-xs mt-1">
                Enable agents and run them to see activity here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#DDDBDA]">
              {activities.map((activity) => {
                const meta = getAgentMeta(activity.agentType);
                const Icon = meta.icon;
                const entityLink = getEntityLink(
                  activity.entityType,
                  activity.entityId
                );
                const isPending = activity.status === "pending_approval";

                return (
                  <div
                    key={activity.id}
                    className={cn(
                      "px-4 py-3 flex items-start gap-3",
                      isPending && "bg-yellow-50/50"
                    )}
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                        meta.badgeColor
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm text-[#3E3E3C]">
                            <span className="font-medium">{meta.name}</span>
                            {" — "}
                            {activity.description}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-[#706E6B]">
                              {formatDateTime(activity.createdAt)}
                            </span>
                            {entityLink && (
                              <Link
                                href={entityLink}
                                className="text-[10px] text-[#0070D2] hover:text-[#005FB2]"
                              >
                                View {activity.entityType}
                              </Link>
                            )}
                            {activity.status === "approved" && (
                              <span className="bc-badge bg-green-100 text-green-700 text-[10px]">
                                Approved
                              </span>
                            )}
                            {activity.status === "rejected" && (
                              <span className="bc-badge bg-red-100 text-red-700 text-[10px]">
                                Rejected
                              </span>
                            )}
                          </div>
                        </div>
                        {isPending && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() =>
                                handleApproval(activity.id, "approved")
                              }
                              className="p-1 rounded hover:bg-green-100 text-green-600 transition-colors"
                              title="Approve"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleApproval(activity.id, "rejected")
                              }
                              className="p-1 rounded hover:bg-red-100 text-red-600 transition-colors"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More */}
          {activityPage < activityTotalPages && (
            <div className="px-4 py-3 border-t border-[#DDDBDA]">
              <button
                onClick={() => fetchActivities(activityPage + 1)}
                className="w-full text-center text-xs font-medium text-[#0070D2] hover:text-[#005FB2] py-1"
              >
                Load More
              </button>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="bc-card p-4">
          <h2 className="text-sm font-semibold text-[#3E3E3C] mb-3">
            Quick Links
          </h2>
          <div className="space-y-2">
            <Link
              href="/autopilot/icp"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-[#F4F6F9] transition-colors group"
            >
              <Target className="w-4 h-4 text-[#706E6B] group-hover:text-[#0070D2]" />
              <div>
                <p className="text-sm font-medium text-[#3E3E3C] group-hover:text-[#0070D2]">
                  Configure ICP
                </p>
                <p className="text-[10px] text-[#706E6B]">
                  Define ideal customer profile
                </p>
              </div>
            </Link>
            <Link
              href="/autopilot/sequences"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-[#F4F6F9] transition-colors group"
            >
              <Settings2 className="w-4 h-4 text-[#706E6B] group-hover:text-[#0070D2]" />
              <div>
                <p className="text-sm font-medium text-[#3E3E3C] group-hover:text-[#0070D2]">
                  Outreach Sequences
                </p>
                <p className="text-[10px] text-[#706E6B]">
                  Manage email sequences
                </p>
              </div>
            </Link>
            <Link
              href="/autopilot/approvals"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-[#F4F6F9] transition-colors group"
            >
              <ListChecks className="w-4 h-4 text-[#706E6B] group-hover:text-[#0070D2]" />
              <div>
                <p className="text-sm font-medium text-[#3E3E3C] group-hover:text-[#0070D2]">
                  Approval Queue
                </p>
                <p className="text-[10px] text-[#706E6B]">
                  Review pending actions
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
