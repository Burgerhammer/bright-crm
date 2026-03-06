import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import { List } from "lucide-react";

export default async function PipelinePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const pipeline = await prisma.pipeline.findFirst({
    where: { isDefault: true },
    include: {
      stages: {
        orderBy: { order: "asc" },
        include: {
          deals: {
            include: {
              account: true,
              owner: true,
            },
          },
        },
      },
    },
  });

  if (!pipeline) {
    return (
      <div className="flex items-center justify-center h-64 text-[#706E6B]">
        No pipeline configured. Go to Settings to create one.
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#3E3E3C]">
            {pipeline.name} - Pipeline View
          </h1>
        </div>
        <div className="flex gap-2">
          <Link href="/deals" className="bc-btn bc-btn-neutral">
            <List className="w-4 h-4" />
            List View
          </Link>
          <Link href="/deals/new" className="bc-btn bc-btn-primary">
            + New Deal
          </Link>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {pipeline.stages.map((stage) => {
          const totalValue = stage.deals.reduce(
            (sum, d) => sum + (d.amount || 0),
            0
          );
          const isClosedStage =
            stage.name === "Closed Won" || stage.name === "Closed Lost";

          return (
            <div
              key={stage.id}
              className={`flex-shrink-0 ${
                isClosedStage ? "w-40 sm:w-48" : "w-60 sm:w-72"
              } flex flex-col`}
            >
              {/* Column Header */}
              <div
                className="rounded-t-lg px-3 py-2 text-white text-sm font-semibold"
                style={{ backgroundColor: stage.color }}
              >
                <div className="flex items-center justify-between">
                  <span>{stage.name}</span>
                  <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs">
                    {stage.deals.length}
                  </span>
                </div>
                <div className="text-xs font-normal opacity-80 mt-0.5">
                  {formatCurrency(totalValue)}
                </div>
              </div>

              {/* Cards Container */}
              <div className="bg-[#F4F6F9] border border-t-0 border-[#DDDBDA] rounded-b-lg flex-1 p-2 space-y-2 min-h-[200px]">
                {stage.deals.length === 0 ? (
                  <div className="text-center text-xs text-[#706E6B] py-8 italic">
                    No deals
                  </div>
                ) : (
                  stage.deals.map((deal) => (
                    <Link
                      key={deal.id}
                      href={`/deals/${deal.id}`}
                      className="block bc-card p-3 hover:shadow-md transition-shadow"
                    >
                      <div className="font-semibold text-sm text-[#0070D2] truncate">
                        {deal.name}
                      </div>
                      {deal.account && (
                        <div className="text-xs text-[#706E6B] truncate mt-1">
                          {deal.account.name}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        {deal.amount != null && (
                          <span className="text-sm font-semibold text-[#3E3E3C]">
                            {formatCurrency(deal.amount)}
                          </span>
                        )}
                        {deal.closeDate && (
                          <span className="text-xs text-[#706E6B]">
                            {formatDate(deal.closeDate)}
                          </span>
                        )}
                      </div>
                      {deal.owner && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <div className="w-5 h-5 rounded-full bg-[#0070D2] text-white text-[10px] font-semibold flex items-center justify-center">
                            {getInitials(deal.owner.name)}
                          </div>
                          <span className="text-xs text-[#706E6B]">
                            {deal.owner.name}
                          </span>
                        </div>
                      )}
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
