"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

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
          <div className="relative ml-4 hidden sm:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-white/10 border border-white/20 rounded pl-8 pr-3 py-1.5 text-sm text-white placeholder-white/50 focus:outline-none focus:border-white/40 w-40 sm:w-64"
            />
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
