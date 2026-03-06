"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Home,
  Users,
  UserCircle,
  Building2,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
  Search,
  Phone,
  Menu,
  CheckSquare,
  ArrowUpDown,
  Loader2,
  Bell,
  CheckCheck,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  label: string;
  type: "lead" | "contact" | "account" | "deal";
  subtitle: string;
}

interface SearchResults {
  leads: SearchResult[];
  contacts: SearchResult[];
  accounts: SearchResult[];
  deals: SearchResult[];
}

const typeConfig = {
  lead: { label: "Leads", icon: Users, href: "/leads", color: "bg-blue-100 text-blue-700" },
  contact: { label: "Contacts", icon: UserCircle, href: "/contacts", color: "bg-emerald-100 text-emerald-700" },
  account: { label: "Accounts", icon: Building2, href: "/accounts", color: "bg-purple-100 text-purple-700" },
  deal: { label: "Deals", icon: DollarSign, href: "/deals", color: "bg-amber-100 text-amber-700" },
} as const;

const tabs = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Leads", href: "/leads", icon: Users },
  { name: "Contacts", href: "/contacts", icon: UserCircle },
  { name: "Accounts", href: "/accounts", icon: Building2 },
  { name: "Deals", href: "/deals", icon: DollarSign },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Import", href: "/import", icon: ArrowUpDown },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function TopNav({
  userName,
  onOpenDialpad,
  onToggleSidebar,
}: {
  userName: string;
  onOpenDialpad?: () => void;
  onToggleSidebar?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Notifications
  const [notifications, setNotifications] = useState<
    { id: string; message: string; type: string; link: string | null; createdAt: string }[]
  >([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const closeSearch = useCallback(() => {
    setIsOpen(false);
    setResults(null);
  }, []);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeSearch();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeSearch]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeSearch();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeSearch]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      // First check for new overdue/due notifications
      await fetch("/api/notifications/check", { method: "POST" });
      // Then fetch all unread
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch {
      // silently fail
    }
  }, []);

  // Fetch on mount and poll every 60 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close notification dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    if (notifications.length === 0) return;
    const ids = notifications.map((n) => n.id);
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    setNotifications([]);
    setNotifOpen(false);
  };

  const handleNotifClick = (link: string | null) => {
    if (link) {
      router.push(link);
    }
    setNotifOpen(false);
  };

  function handleChange(value: string) {
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.trim().length < 2) {
      setResults(null);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value.trim())}`);
        if (res.ok) {
          const data: SearchResults = await res.json();
          setResults(data);
          setIsOpen(true);
        }
      } catch {
        // silently fail
      } finally {
        setIsLoading(false);
      }
    }, 300);
  }

  function handleResultClick(result: SearchResult) {
    const config = typeConfig[result.type];
    router.push(`${config.href}/${result.id}`);
    setQuery("");
    closeSearch();
  }

  const hasResults =
    results &&
    (results.leads.length > 0 ||
      results.contacts.length > 0 ||
      results.accounts.length > 0 ||
      results.deals.length > 0);

  const groups = results
    ? ([
        { key: "leads" as const, items: results.leads },
        { key: "contacts" as const, items: results.contacts },
        { key: "accounts" as const, items: results.accounts },
        { key: "deals" as const, items: results.deals },
      ].filter((g) => g.items.length > 0))
    : [];

  return (
    <nav className="bg-[#1B2A4A] text-white">
      {/* Top bar with logo and user */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="md:hidden flex items-center justify-center w-8 h-8"
            title="Toggle sidebar"
          >
            <Menu className="w-5 h-5 text-white" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#0070D2] rounded flex items-center justify-center font-bold text-sm">
              B
            </div>
            <span className="font-semibold text-sm tracking-wide">
              Bright CRM
            </span>
          </Link>
          <div className="relative ml-4 hidden sm:block" ref={containerRef}>
            {isLoading ? (
              <Loader2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 animate-spin" />
            ) : (
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            )}
            <input
              type="text"
              placeholder="Search..."
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              onFocus={() => {
                if (results) setIsOpen(true);
              }}
              className="bg-white/10 border border-white/20 rounded pl-8 pr-3 py-1.5 text-sm text-white placeholder-white/50 focus:outline-none focus:border-white/40 w-40 sm:w-64"
            />
            {isOpen && results && (
              <div className="absolute top-full left-0 mt-1 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
                {!hasResults ? (
                  <div className="px-4 py-6 text-center text-sm text-gray-500">
                    No results found
                  </div>
                ) : (
                  groups.map((group) => {
                    const config = typeConfig[group.items[0].type];
                    return (
                      <div key={group.key}>
                        <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                          {config.label}
                        </div>
                        {group.items.map((item) => {
                          const Icon = typeConfig[item.type].icon;
                          return (
                            <button
                              key={item.id}
                              onClick={() => handleResultClick(item)}
                              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                            >
                              <span className={cn("flex items-center justify-center w-7 h-7 rounded-full shrink-0", typeConfig[item.type].color)}>
                                <Icon className="w-3.5 h-3.5" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {item.label}
                                </div>
                                {item.subtitle && (
                                  <div className="text-xs text-gray-500 truncate">
                                    {item.subtitle}
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenDialpad}
            className="flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-green-500 hover:bg-green-600 transition-colors"
            title="Open Dialpad"
          >
            <Phone className="w-4 h-4 text-white" />
          </button>
          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 rounded-full hover:bg-white/10 transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-white" />
              {notifications.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
                  {notifications.length > 99 ? "99+" : notifications.length}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                  <span className="text-sm font-semibold text-[#3E3E3C]">
                    Notifications
                  </span>
                  {notifications.length > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-1 text-xs text-[#0070D2] hover:text-[#005FB2] font-medium"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto max-h-72">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-400">
                      No new notifications
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <button
                        key={notif.id}
                        onClick={() => handleNotifClick(notif.link)}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={cn(
                              "mt-0.5 w-2 h-2 rounded-full shrink-0",
                              notif.type === "task_overdue"
                                ? "bg-red-500"
                                : notif.type === "task_due"
                                  ? "bg-amber-500"
                                  : "bg-blue-500"
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-[#3E3E3C]">
                              {notif.message}
                            </p>
                            <p className="text-xs text-[#706E6B] mt-0.5">
                              {new Date(notif.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <span className="text-sm text-white/80">{userName}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center px-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          const Icon = tab.icon;
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                "flex items-center gap-1.5 px-2 sm:px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap",
                isActive
                  ? "text-white"
                  : "text-white/70 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.name}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white rounded-t" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
