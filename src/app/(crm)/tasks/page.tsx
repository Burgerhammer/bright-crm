"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, CheckCircle2, Circle, AlertTriangle, Clock, ListTodo } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface TaskOwner {
  id: string;
  name: string;
}

interface TaskLead {
  id: string;
  firstName: string;
  lastName: string;
}

interface TaskContact {
  id: string;
  firstName: string;
  lastName: string;
}

interface TaskAccount {
  id: string;
  name: string;
}

interface TaskDeal {
  id: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  completedAt: string | null;
  owner: TaskOwner | null;
  lead: TaskLead | null;
  contact: TaskContact | null;
  account: TaskAccount | null;
  deal: TaskDeal | null;
  createdAt: string;
}

const STATUS_TABS = ["All", "Open", "In Progress", "Completed", "Overdue"];

const statusColors: Record<string, string> = {
  Open: "bg-blue-100 text-blue-800",
  "In Progress": "bg-yellow-100 text-yellow-800",
  Completed: "bg-green-100 text-green-800",
  Cancelled: "bg-gray-100 text-gray-600",
};

const priorityColors: Record<string, string> = {
  High: "bg-red-100 text-red-800",
  Medium: "bg-yellow-100 text-yellow-800",
  Low: "bg-green-100 text-green-800",
};

function isOverdue(task: Task): boolean {
  if (!task.dueDate) return false;
  if (task.status === "Completed" || task.status === "Cancelled") return false;
  return new Date(task.dueDate) < new Date();
}

function isDueToday(task: Task): boolean {
  if (!task.dueDate) return false;
  const due = new Date(task.dueDate);
  const now = new Date();
  return (
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate()
  );
}

function getDueDateColor(task: Task): string {
  if (isOverdue(task)) return "text-red-600 font-semibold";
  if (isDueToday(task)) return "text-yellow-600 font-semibold";
  return "text-[#706E6B]";
}

function getRelatedEntity(task: Task): { name: string; href: string } | null {
  if (task.lead) {
    return {
      name: `${task.lead.firstName} ${task.lead.lastName}`,
      href: `/leads/${task.lead.id}`,
    };
  }
  if (task.contact) {
    return {
      name: `${task.contact.firstName} ${task.contact.lastName}`,
      href: `/contacts/${task.contact.id}`,
    };
  }
  if (task.account) {
    return { name: task.account.name, href: `/accounts/${task.account.id}` };
  }
  if (task.deal) {
    return { name: task.deal.name, href: `/deals/${task.deal.id}` };
  }
  return null;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [stats, setStats] = useState({ open: 0, dueToday: 0, overdue: 0 });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      if (activeTab === "Overdue") {
        params.set("due", "overdue");
      } else if (activeTab !== "All") {
        params.set("status", activeTab);
      }

      if (priorityFilter) {
        params.set("priority", priorityFilter);
      }

      const res = await fetch(`/api/tasks?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch {
      // Failed to fetch
    } finally {
      setLoading(false);
    }
  }, [activeTab, priorityFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const [openRes, todayRes, overdueRes] = await Promise.all([
        fetch("/api/tasks?status=Open"),
        fetch("/api/tasks?due=today"),
        fetch("/api/tasks?due=overdue"),
      ]);

      const [openData, todayData, overdueData] = await Promise.all([
        openRes.ok ? openRes.json() : [],
        todayRes.ok ? todayRes.json() : [],
        overdueRes.ok ? overdueRes.json() : [],
      ]);

      setStats({
        open: Array.isArray(openData) ? openData.length : 0,
        dueToday: Array.isArray(todayData) ? todayData.length : 0,
        overdue: Array.isArray(overdueData) ? overdueData.length : 0,
      });
    } catch {
      // Failed to fetch stats
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  async function handleQuickComplete(taskId: string, currentStatus: string) {
    const newStatus = currentStatus === "Completed" ? "Open" : "Completed";
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        fetchTasks();
        fetchStats();
      }
    } catch {
      // Failed to update
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-4">
        <h1 className="text-xl font-bold text-[#3E3E3C]">Tasks</h1>
        <Link href="/tasks/new" className="bc-btn bc-btn-primary">
          <Plus className="w-4 h-4" />
          New Task
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bc-card px-4 py-3">
          <div className="flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-[#706E6B] uppercase">Open</span>
          </div>
          <p className="text-2xl font-bold text-[#3E3E3C] mt-1">{stats.open}</p>
        </div>
        <div className="bc-card px-4 py-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-600" />
            <span className="text-xs font-semibold text-[#706E6B] uppercase">Due Today</span>
          </div>
          <p className="text-2xl font-bold text-[#3E3E3C] mt-1">{stats.dueToday}</p>
        </div>
        <div className="bc-card px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-xs font-semibold text-[#706E6B] uppercase">Overdue</span>
          </div>
          <p className="text-2xl font-bold text-[#3E3E3C] mt-1">{stats.overdue}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bc-card mb-4">
        <div className="px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-[#706E6B] uppercase">
              Status:
            </label>
            <div className="flex gap-1 flex-wrap">
              {STATUS_TABS.map((s) => {
                const isActive = s === activeTab;
                return (
                  <button
                    key={s}
                    onClick={() => setActiveTab(s)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-[#0070D2] text-white"
                        : "bg-[#F4F6F9] text-[#3E3E3C] hover:bg-[#DDDBDA]"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <label className="text-xs font-semibold text-[#706E6B] uppercase">
              Priority:
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bc-input !w-auto !py-1 text-xs"
            >
              <option value="">All</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <span className="ml-2 text-xs text-[#706E6B]">
              {tasks.length} {tasks.length === 1 ? "record" : "records"}
            </span>
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bc-card overflow-hidden overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-[#706E6B]">Loading tasks...</p>
          </div>
        ) : (
          <table className="bc-table">
            <thead>
              <tr>
                <th className="w-10"></th>
                <th>Title</th>
                <th>Due Date</th>
                <th>Priority</th>
                <th className="hidden sm:table-cell">Status</th>
                <th className="hidden md:table-cell">Related To</th>
                <th className="hidden lg:table-cell">Owner</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[#706E6B]">
                    No tasks found.{" "}
                    <Link
                      href="/tasks/new"
                      className="text-[#0070D2] hover:text-[#005FB2]"
                    >
                      Create your first task to start tracking follow-ups
                    </Link>
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const related = getRelatedEntity(task);
                  return (
                    <tr key={task.id}>
                      <td className="w-10">
                        <button
                          onClick={() => handleQuickComplete(task.id, task.status)}
                          className="p-1 hover:bg-[#F4F6F9] rounded transition-colors"
                          title={task.status === "Completed" ? "Reopen task" : "Mark as completed"}
                        >
                          {task.status === "Completed" ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : (
                            <Circle className="w-5 h-5 text-[#DDDBDA] hover:text-green-600" />
                          )}
                        </button>
                      </td>
                      <td>
                        <Link
                          href={`/tasks/${task.id}`}
                          className={`text-[#0070D2] hover:text-[#005FB2] font-medium ${
                            task.status === "Completed" ? "line-through opacity-60" : ""
                          }`}
                        >
                          {task.title}
                        </Link>
                      </td>
                      <td>
                        {task.dueDate ? (
                          <span className={`text-xs ${getDueDateColor(task)}`}>
                            {formatDate(task.dueDate)}
                            {isOverdue(task) && " (Overdue)"}
                            {isDueToday(task) && " (Today)"}
                          </span>
                        ) : (
                          <span className="text-[#706E6B] text-xs">--</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`bc-badge ${priorityColors[task.priority] || "bg-gray-100 text-gray-600"}`}
                        >
                          {task.priority}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell">
                        <span
                          className={`bc-badge ${statusColors[task.status] || "bg-gray-100 text-gray-600"}`}
                        >
                          {task.status}
                        </span>
                      </td>
                      <td className="hidden md:table-cell">
                        {related ? (
                          <Link
                            href={related.href}
                            className="text-[#0070D2] hover:text-[#005FB2] text-xs"
                          >
                            {related.name}
                          </Link>
                        ) : (
                          <span className="text-[#706E6B] text-xs">--</span>
                        )}
                      </td>
                      <td className="hidden lg:table-cell text-[#3E3E3C] text-xs">
                        {task.owner?.name || "--"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
