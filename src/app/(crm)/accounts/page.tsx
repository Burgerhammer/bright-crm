import Link from "next/link";
import { Plus, Building2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

const typeBadgeColors: Record<string, string> = {
  Prospect: "bg-blue-100 text-blue-800",
  Customer: "bg-green-100 text-green-800",
  Partner: "bg-purple-100 text-purple-800",
  Vendor: "bg-orange-100 text-orange-800",
  Other: "bg-gray-100 text-gray-700",
};

const typeOptions = ["Prospect", "Customer", "Partner", "Vendor", "Other"];

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { type } = await searchParams;

  const where = type ? { type } : {};

  const accounts = await prisma.account.findMany({
    where,
    include: {
      owner: { select: { id: true, name: true, email: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-6 h-6 text-[#0070D2]" />
          <h1 className="text-xl font-bold text-[#3E3E3C]">Accounts</h1>
          <span className="text-sm text-[#706E6B] ml-1">
            ({accounts.length})
          </span>
        </div>
        <Link href="/accounts/new" className="bc-btn bc-btn-primary">
          <Plus className="w-4 h-4" />
          New Account
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bc-card mb-4">
        <div className="p-3 flex items-center gap-3">
          <label className="text-xs font-semibold text-[#706E6B] uppercase tracking-wide">
            Filter by Type
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/accounts"
              className={`bc-btn text-xs ${
                !type ? "bc-btn-primary" : "bc-btn-neutral"
              }`}
            >
              All
            </Link>
            {typeOptions.map((t) => (
              <Link
                key={t}
                href={`/accounts?type=${t}`}
                className={`bc-btn text-xs ${
                  type === t ? "bc-btn-primary" : "bc-btn-neutral"
                }`}
              >
                {t}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bc-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="bc-table">
            <thead>
              <tr>
                <th>Name</th>
                <th className="hidden sm:table-cell">Industry</th>
                <th className="hidden md:table-cell">Type</th>
                <th className="hidden sm:table-cell">Phone</th>
                <th>City / State</th>
                <th className="hidden lg:table-cell">Revenue</th>
                <th className="hidden lg:table-cell">Employees</th>
                <th className="hidden lg:table-cell">Owner</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-8 text-[#706E6B] text-sm"
                  >
                    No accounts found.{" "}
                    <Link
                      href="/accounts/new"
                      className="text-[#0070D2] hover:text-[#005FB2]"
                    >
                      Create one
                    </Link>
                  </td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <Link
                        href={`/accounts/${account.id}`}
                        className="text-[#0070D2] hover:text-[#005FB2] font-medium"
                      >
                        {account.name}
                      </Link>
                    </td>
                    <td className="hidden sm:table-cell text-[#706E6B]">
                      {account.industry || "--"}
                    </td>
                    <td className="hidden md:table-cell">
                      {account.type ? (
                        <span
                          className={`bc-badge ${
                            typeBadgeColors[account.type] ||
                            typeBadgeColors.Other
                          }`}
                        >
                          {account.type}
                        </span>
                      ) : (
                        <span className="text-[#706E6B]">--</span>
                      )}
                    </td>
                    <td className="hidden sm:table-cell text-[#706E6B]">
                      {account.phone || "--"}
                    </td>
                    <td className="text-[#706E6B]">
                      {account.city && account.state
                        ? `${account.city}, ${account.state}`
                        : account.city || account.state || "--"}
                    </td>
                    <td className="hidden lg:table-cell text-[#706E6B]">
                      {account.annualRevenue
                        ? formatCurrency(account.annualRevenue)
                        : "--"}
                    </td>
                    <td className="hidden lg:table-cell text-[#706E6B]">
                      {account.employees?.toLocaleString() || "--"}
                    </td>
                    <td className="hidden lg:table-cell text-[#706E6B]">
                      {account.owner?.name || "--"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
