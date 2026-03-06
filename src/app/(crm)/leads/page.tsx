import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

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

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeStatus = status && status !== "All" ? status : undefined;

  const leads = await prisma.lead.findMany({
    where: activeStatus ? { status: activeStatus } : {},
    include: {
      owner: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

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

      {/* Leads Table */}
      <div className="bc-card overflow-hidden overflow-x-auto">
        <table className="bc-table">
          <thead>
            <tr>
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
            {leads.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-[#706E6B]">
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
                <tr key={lead.id}>
                  <td>
                    <Link
                      href={`/leads/${lead.id}`}
                      className="text-[#0070D2] hover:text-[#005FB2] font-medium"
                    >
                      {lead.firstName} {lead.lastName}
                    </Link>
                  </td>
                  <td className="text-[#3E3E3C]">{lead.company || "--"}</td>
                  <td className="hidden sm:table-cell text-[#3E3E3C]">{lead.email || "--"}</td>
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
