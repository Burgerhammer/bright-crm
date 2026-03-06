"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Handshake,
  Users,
  Activity,
  CheckSquare,
  Phone,
  Mail,
  CalendarCheck,
  ClipboardList,
  FileText,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Trophy,
  XCircle,
  UserPlus,
  Building2,
} from "lucide-react";

interface DashboardData {
  pipeline: {
    totalDeals: number;
    totalValue: number;
    dealsByStage: { name: string; count: number; value: number; color: string }[];
    wonThisMonth: number;
    wonValueThisMonth: number;
    lostThisMonth: number;
  };
  leads: {
    total: number;
    newThisMonth: number;
    byStatus: { status: string; count: number }[];
  };
  activities: {
    totalThisMonth: number;
    byType: { type: string; count: number }[];
    recent: {
      id: string;
      type: string;
      subject: string;
      createdAt: string;
      lead?: { id: string; firstName: string; lastName: string } | null;
      contact?: { id: string; firstName: string; lastName: string } | null;
      account?: { id: string; name: string } | null;
      deal?: { id: string; name: string } | null;
    }[];
  };
  tasks: {
    open: number;
    dueToday: number;
    overdue: number;
    completedThisMonth: number;
  };
  contacts: {
    total: number;
    newThisMonth: number;
  };
  accounts: {
    total: number;
    newThisMonth: number;
  };
}

function LoadingSkeleton() {
  return (
    <div>
      <div className="mb-6">
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mt-2" />
      </div>

      {/* Metric cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-[#DDDBDA] shadow-sm p-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse" />
              <div className="flex-1">
                <div className="h-7 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-24 bg-gray-200 rounded animate-pulse mt-2" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Two column skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg border border-[#DDDBDA] shadow-sm p-6">
          <div className="h-5 w-36 bg-gray-200 rounded animate-pulse mb-4" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 bg-gray-200 rounded animate-pulse mb-3" />
          ))}
        </div>
        <div className="bg-white rounded-lg border border-[#DDDBDA] shadow-sm p-6">
          <div className="h-5 w-36 bg-gray-200 rounded animate-pulse mb-4" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-gray-200 rounded animate-pulse mb-3" />
          ))}
        </div>
      </div>

      {/* Bottom row skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-[#DDDBDA] shadow-sm p-6">
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-4" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-6 bg-gray-200 rounded animate-pulse mb-3" />
          ))}
        </div>
        <div className="bg-white rounded-lg border border-[#DDDBDA] shadow-sm p-6">
          <div className="h-5 w-36 bg-gray-200 rounded animate-pulse mb-4" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-6 bg-gray-200 rounded animate-pulse mb-3" />
          ))}
        </div>
      </div>
    </div>
  );
}

function activityIcon(type: string) {
  switch (type) {
    case "call":
      return <Phone className="h-4 w-4 text-green-600" />;
    case "email":
      return <Mail className="h-4 w-4 text-blue-600" />;
    case "meeting":
      return <CalendarCheck className="h-4 w-4 text-purple-600" />;
    case "task":
      return <ClipboardList className="h-4 w-4 text-orange-600" />;
    case "note":
      return <FileText className="h-4 w-4 text-gray-600" />;
    default:
      return <ClipboardList className="h-4 w-4 text-gray-500" />;
  }
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

function relatedEntity(activity: DashboardData["activities"]["recent"][0]): {
  label: string;
  href: string;
} | null {
  if (activity.deal) {
    return { label: activity.deal.name, href: `/deals/${activity.deal.id}` };
  }
  if (activity.contact) {
    return {
      label: `${activity.contact.firstName} ${activity.contact.lastName}`,
      href: `/contacts/${activity.contact.id}`,
    };
  }
  if (activity.lead) {
    return {
      label: `${activity.lead.firstName} ${activity.lead.lastName}`,
      href: `/leads/${activity.lead.id}`,
    };
  }
  if (activity.account) {
    return { label: activity.account.name, href: `/accounts/${activity.account.id}` };
  }
  return null;
}

const leadStatusColors: Record<string, string> = {
  New: "bg-blue-100 text-blue-800",
  Contacted: "bg-yellow-100 text-yellow-800",
  Qualified: "bg-green-100 text-green-800",
  Unqualified: "bg-red-100 text-red-800",
  Converted: "bg-purple-100 text-purple-800",
};

const borderColors = ["border-l-[#0070D2]", "border-l-[#4BCA81]", "border-l-[#FFB75D]", "border-l-[#C23934]"];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) {
          throw new Error("Failed to load dashboard data");
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) return <LoadingSkeleton />;

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-10 w-10 text-[#C23934] mx-auto mb-3" />
          <p className="text-[#3E3E3C] font-medium">Failed to load dashboard</p>
          <p className="text-sm text-[#706E6B] mt-1">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bc-btn bc-btn-primary mt-4"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const metricCards = [
    {
      label: "Open Deals",
      value: data.pipeline.totalDeals,
      sub: formatCurrency(data.pipeline.totalValue),
      icon: <Handshake className="h-5 w-5 text-[#0070D2]" />,
      borderIdx: 0,
    },
    {
      label: "New Leads",
      value: data.leads.newThisMonth,
      sub: `${data.leads.total} total`,
      icon: <Users className="h-5 w-5 text-[#4BCA81]" />,
      borderIdx: 1,
    },
    {
      label: "Activities",
      value: data.activities.totalThisMonth,
      sub: "this month",
      icon: <Activity className="h-5 w-5 text-[#FFB75D]" />,
      borderIdx: 2,
    },
    {
      label: "Tasks Due",
      value: data.tasks.dueToday,
      sub: data.tasks.overdue > 0
        ? `${data.tasks.overdue} overdue`
        : `${data.tasks.open} open`,
      icon: <CheckSquare className="h-5 w-5 text-[#C23934]" />,
      borderIdx: 3,
      alert: data.tasks.overdue > 0,
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#3E3E3C]">Dashboard</h1>
        <p className="text-sm text-[#706E6B] mt-1">
          Your CRM overview at a glance
        </p>
      </div>

      {/* Row 1: Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metricCards.map((card) => (
          <div
            key={card.label}
            className={`bg-white rounded-lg border border-[#DDDBDA] shadow-sm p-6 border-l-4 ${borderColors[card.borderIdx]}`}
          >
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#F4F6F9] flex items-center justify-center">
                {card.icon}
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-bold text-[#3E3E3C]">
                  {card.value}
                </div>
                <div className="text-xs text-[#706E6B] mt-0.5">{card.label}</div>
              </div>
            </div>
            <div className={`text-xs mt-3 ${card.alert ? "text-[#C23934] font-semibold" : "text-[#706E6B]"}`}>
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Pipeline by Stage + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Pipeline by Stage */}
        <div className="bg-white rounded-lg border border-[#DDDBDA] shadow-sm">
          <div className="bc-section-header flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#706E6B]" />
            Pipeline by Stage
          </div>
          <div className="p-4">
            {data.pipeline.dealsByStage.length === 0 ? (
              <p className="text-sm text-[#706E6B] text-center py-6">
                No pipeline stages configured yet.
              </p>
            ) : (
              <div className="space-y-3">
                {data.pipeline.dealsByStage.map((stage) => (
                  <div key={stage.name} className="flex items-center gap-3">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: stage.color }}
                    />
                    <div className="flex-1 min-w-0 text-sm font-medium text-[#3E3E3C] truncate">
                      {stage.name}
                    </div>
                    <div className="text-xs text-[#706E6B] flex-shrink-0 w-12 text-right">
                      {stage.count} {stage.count === 1 ? "deal" : "deals"}
                    </div>
                    <div className="text-xs font-semibold text-[#3E3E3C] flex-shrink-0 w-20 text-right">
                      {formatCurrency(stage.value)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-[#DDDBDA] shadow-sm">
          <div className="bc-section-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#706E6B]" />
              Recent Activity
            </div>
            <Link
              href="#"
              className="text-xs font-semibold text-[#0070D2] hover:text-[#005FB2] flex items-center gap-1"
            >
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-[#DDDBDA]">
            {data.activities.recent.length === 0 ? (
              <div className="text-center text-[#706E6B] text-sm py-6">
                No recent activities.
              </div>
            ) : (
              data.activities.recent.map((activity) => {
                const related = relatedEntity(activity);
                return (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[#F4F6F9] transition-colors"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      {activityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#3E3E3C] truncate">
                        {activity.subject}
                      </p>
                      <p className="text-xs text-[#706E6B] truncate">
                        <span className="capitalize">{activity.type}</span>
                        {related && (
                          <>
                            {" "}
                            &middot;{" "}
                            <Link
                              href={related.href}
                              className="text-[#0070D2] hover:text-[#005FB2]"
                            >
                              {related.label}
                            </Link>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-xs text-[#706E6B] whitespace-nowrap">
                      {timeAgo(activity.createdAt)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Leads by Status + Monthly Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by Status */}
        <div className="bg-white rounded-lg border border-[#DDDBDA] shadow-sm">
          <div className="bc-section-header flex items-center gap-2">
            <Users className="h-4 w-4 text-[#706E6B]" />
            Leads by Status
          </div>
          <div className="p-4">
            {data.leads.byStatus.length === 0 ? (
              <p className="text-sm text-[#706E6B] text-center py-6">
                No leads yet.
              </p>
            ) : (
              <div className="space-y-3">
                {data.leads.byStatus.map((row) => (
                  <div key={row.status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`bc-badge ${leadStatusColors[row.status] || "bg-gray-100 text-gray-800"}`}
                      >
                        {row.status}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-[#3E3E3C]">
                      {row.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Monthly Summary */}
        <div className="bg-white rounded-lg border border-[#DDDBDA] shadow-sm">
          <div className="bc-section-header flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[#706E6B]" />
            Monthly Summary
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-[#4BCA81]" />
                <span className="text-sm text-[#3E3E3C]">Deals Won</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-[#4BCA81]">
                  {data.pipeline.wonThisMonth}
                </span>
                <span className="text-xs text-[#706E6B] ml-2">
                  {formatCurrency(data.pipeline.wonValueThisMonth)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-[#C23934]" />
                <span className="text-sm text-[#3E3E3C]">Deals Lost</span>
              </div>
              <span className="text-sm font-bold text-[#C23934]">
                {data.pipeline.lostThisMonth}
              </span>
            </div>

            <div className="border-t border-[#DDDBDA] pt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-[#0070D2]" />
                <span className="text-sm text-[#3E3E3C]">New Contacts</span>
              </div>
              <span className="text-sm font-bold text-[#3E3E3C]">
                {data.contacts.newThisMonth}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#0070D2]" />
                <span className="text-sm text-[#3E3E3C]">New Accounts</span>
              </div>
              <span className="text-sm font-bold text-[#3E3E3C]">
                {data.accounts.newThisMonth}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
