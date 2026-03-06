import Link from "next/link";
import { Plus, Columns3 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";

export default async function DealsPage() {
  const deals = await prisma.deal.findMany({
    include: {
      stage: true,
      pipeline: true,
      account: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      owner: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[#3E3E3C]">Deals</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link href="/deals/pipeline" className="bc-btn bc-btn-neutral">
            <Columns3 className="w-4 h-4" />
            Pipeline View
          </Link>
          <Link href="/deals/new" className="bc-btn bc-btn-primary">
            <Plus className="w-4 h-4" />
            New Deal
          </Link>
        </div>
      </div>

      {/* Deals Table */}
      <div className="bc-card overflow-hidden">
        <div className="bc-section-header">
          All Deals ({deals.length})
        </div>
        <div className="overflow-x-auto">
          <table className="bc-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Account</th>
                <th className="hidden sm:table-cell">Amount</th>
                <th className="hidden sm:table-cell">Stage</th>
                <th className="hidden lg:table-cell">Close Date</th>
                <th>Probability</th>
                <th className="hidden lg:table-cell">Owner</th>
              </tr>
            </thead>
            <tbody>
              {deals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[#706E6B]">
                    No deals found.{" "}
                    <Link
                      href="/deals/new"
                      className="text-[#0070D2] hover:text-[#005FB2]"
                    >
                      Create your first deal
                    </Link>
                  </td>
                </tr>
              ) : (
                deals.map((deal) => (
                  <tr key={deal.id}>
                    <td>
                      <Link
                        href={`/deals/${deal.id}`}
                        className="text-[#0070D2] hover:text-[#005FB2] font-medium"
                      >
                        {deal.name}
                      </Link>
                    </td>
                    <td>
                      {deal.account ? (
                        <Link
                          href={`/accounts/${deal.account.id}`}
                          className="text-[#0070D2] hover:text-[#005FB2]"
                        >
                          {deal.account.name}
                        </Link>
                      ) : (
                        <span className="text-[#706E6B]">--</span>
                      )}
                    </td>
                    <td className="hidden sm:table-cell font-medium text-[#3E3E3C]">
                      {deal.amount != null ? formatCurrency(deal.amount) : "--"}
                    </td>
                    <td className="hidden sm:table-cell">
                      <span
                        className="bc-badge"
                        style={{
                          backgroundColor: deal.stage.color + "20",
                          color: deal.stage.color,
                        }}
                      >
                        {deal.stage.name}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell text-[#706E6B] text-xs">
                      {deal.closeDate ? formatDate(deal.closeDate) : "--"}
                    </td>
                    <td className="text-[#3E3E3C]">
                      {deal.probability != null ? `${deal.probability}%` : "--"}
                    </td>
                    <td className="hidden lg:table-cell">
                      {deal.owner ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-6 h-6 rounded-full bg-[#0070D2] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                            {getInitials(deal.owner.name)}
                          </span>
                          <span className="text-[#3E3E3C] text-xs">{deal.owner.name}</span>
                        </span>
                      ) : (
                        <span className="text-[#706E6B]">--</span>
                      )}
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
