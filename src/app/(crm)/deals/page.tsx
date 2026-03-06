"use client";

import Link from "next/link";
import { Plus, Columns3 } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import BulkActionBar from "@/components/BulkActionBar";

interface Stage {
  id: string;
  name: string;
  color: string;
  order: number;
  probability: number;
}

interface Deal {
  id: string;
  name: string;
  amount: number | null;
  closeDate: string | null;
  probability: number | null;
  stage: Stage;
  pipeline: { id: string; name: string };
  account: { id: string; name: string } | null;
  contact: { id: string; firstName: string; lastName: string } | null;
  owner: { id: string; name: string } | null;
  createdAt: string;
}

interface Pipeline {
  id: string;
  name: string;
  stages: Stage[];
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [stageOptions, setStageOptions] = useState<
    { label: string; value: string }[]
  >([]);

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/deals");
      if (res.ok) {
        const data = await res.json();
        setDeals(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch pipelines/stages for the update dropdown
  useEffect(() => {
    async function fetchStages() {
      try {
        const res = await fetch("/api/pipelines");
        if (res.ok) {
          const pipelines: Pipeline[] = await res.json();
          const options: { label: string; value: string }[] = [];
          for (const pipeline of pipelines) {
            for (const stage of pipeline.stages) {
              const label =
                pipelines.length > 1
                  ? `${pipeline.name} - ${stage.name}`
                  : stage.name;
              options.push({ label, value: stage.id });
            }
          }
          setStageOptions(options);
        }
      } catch {
        // Stages dropdown will just be empty
      }
    }
    fetchStages();
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    if (selectedIds.length === deals.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(deals.map((d) => d.id));
    }
  }

  function handleBulkComplete() {
    setSelectedIds([]);
    fetchDeals();
  }

  const allSelected = deals.length > 0 && selectedIds.length === deals.length;
  const someSelected =
    selectedIds.length > 0 && selectedIds.length < deals.length;

  const updateFields =
    stageOptions.length > 0
      ? [
          {
            key: "stageId",
            label: "Update Stage",
            options: stageOptions,
          },
        ]
      : [];

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

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedIds={selectedIds}
        entityType="deals"
        onComplete={handleBulkComplete}
        onClear={() => setSelectedIds([])}
        updateFields={updateFields}
      />

      {/* Deals Table */}
      <div className="bc-card overflow-hidden">
        <div className="bc-section-header">All Deals ({deals.length})</div>
        <div className="overflow-x-auto">
          <table className="bc-table">
            <thead>
              <tr>
                <th className="w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleSelectAll}
                    className="rounded border-[#DDDBDA]"
                  />
                </th>
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
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-8 text-[#706E6B]"
                  >
                    Loading...
                  </td>
                </tr>
              ) : deals.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-8 text-[#706E6B]"
                  >
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
                  <tr
                    key={deal.id}
                    className={
                      selectedIds.includes(deal.id) ? "bg-[#E8F4FC]" : ""
                    }
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(deal.id)}
                        onChange={() => toggleSelect(deal.id)}
                        className="rounded border-[#DDDBDA]"
                      />
                    </td>
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
                      {deal.amount != null
                        ? formatCurrency(deal.amount)
                        : "--"}
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
                      {deal.probability != null
                        ? `${deal.probability}%`
                        : "--"}
                    </td>
                    <td className="hidden lg:table-cell">
                      {deal.owner ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-6 h-6 rounded-full bg-[#0070D2] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                            {getInitials(deal.owner.name)}
                          </span>
                          <span className="text-[#3E3E3C] text-xs">
                            {deal.owner.name}
                          </span>
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
