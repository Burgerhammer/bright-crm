"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Save, Trash2, ArrowLeft } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import IntegrationActions from "@/components/integrations/IntegrationActions";

interface Deal {
  id: string;
  name: string;
  amount: number | null;
  closeDate: string | null;
  probability: number | null;
  type: string | null;
  source: string | null;
  description: string | null;
  stageId: string;
  pipelineId: string;
  accountId: string | null;
  contactId: string | null;
  stage: { id: string; name: string; color: string; probability: number };
  pipeline: { id: string; name: string; stages: { id: string; name: string; order: number; color: string; probability: number }[] };
  account: { id: string; name: string } | null;
  contact: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface Account {
  id: string;
  name: string;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
}

interface Pipeline {
  id: string;
  name: string;
  stages: { id: string; name: string; order: number; color: string; probability: number }[];
}

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    amount: "",
    closeDate: "",
    probability: "",
    type: "",
    source: "",
    description: "",
    stageId: "",
    pipelineId: "",
    accountId: "",
    contactId: "",
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/deals/${params.id}`).then((r) => r.json()),
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/contacts").then((r) => r.json()),
      fetch("/api/pipelines").then((r) => r.json()),
    ]).then(([dealData, accountData, contactData, pipelineData]) => {
      setDeal(dealData);
      setAccounts(accountData);
      setContacts(contactData);
      setPipelines(pipelineData);
      setForm({
        name: dealData.name || "",
        amount: dealData.amount?.toString() || "",
        closeDate: dealData.closeDate ? dealData.closeDate.split("T")[0] : "",
        probability: dealData.probability?.toString() || "",
        type: dealData.type || "",
        source: dealData.source || "",
        description: dealData.description || "",
        stageId: dealData.stageId || "",
        pipelineId: dealData.pipelineId || "",
        accountId: dealData.accountId || "",
        contactId: dealData.contactId || "",
      });
      setLoading(false);
    });
  }, [params.id]);

  const selectedPipeline = pipelines.find((p) => p.id === form.pipelineId);
  const stages = selectedPipeline?.stages?.sort((a, b) => a.order - b.order) || [];

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/deals/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        amount: form.amount ? parseFloat(form.amount) : null,
        probability: form.probability ? parseInt(form.probability) : null,
        closeDate: form.closeDate || null,
        accountId: form.accountId || null,
        contactId: form.contactId || null,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setDeal(updated);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this deal?")) return;
    const res = await fetch(`/api/deals/${params.id}`, { method: "DELETE" });
    if (res.ok) router.push("/deals");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#706E6B]">
        Loading...
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="flex items-center justify-center h-64 text-[#706E6B]">
        Deal not found
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/deals" className="text-[#706E6B] hover:text-[#3E3E3C]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-[#3E3E3C]">{deal.name}</h1>
          {deal.amount != null && (
            <span className="text-lg text-[#706E6B]">
              {formatCurrency(deal.amount)}
            </span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleDelete}
            className="bc-btn bc-btn-destructive"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bc-btn bc-btn-primary"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Stage Path */}
      <div className="bc-card mb-6 p-4 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-0">
          {stages.map((stage, i) => {
            const isCurrent = stage.id === form.stageId;
            const currentIdx = stages.findIndex((s) => s.id === form.stageId);
            const isPast = i < currentIdx;
            return (
              <button
                key={stage.id}
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    stageId: stage.id,
                    probability: stage.probability.toString(),
                  }))
                }
                className="flex-1 relative py-2 px-3 text-xs font-semibold text-center transition-colors rounded"
                style={{
                  backgroundColor: isCurrent
                    ? stage.color
                    : isPast
                    ? stage.color + "33"
                    : "#F4F6F9",
                  color: isCurrent ? "white" : "#3E3E3C",
                  border: `1px solid ${isCurrent ? stage.color : "#DDDBDA"}`,
                }}
              >
                {stage.name}
                {isCurrent && (
                  <div className="text-[10px] font-normal opacity-80">
                    {stage.probability}%
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Integration Actions */}
      {deal.contact && (
        <div className="mb-4">
          <IntegrationActions
            email={deal.contact ? undefined : undefined}
            phone={undefined}
            name={deal.contact ? `${deal.contact.firstName} ${deal.contact.lastName}` : undefined}
            dealId={deal.id}
            contactId={deal.contact?.id}
          />
        </div>
      )}

      {/* Deal Information */}
      <div className="bc-card mb-4">
        <div className="bc-section-header">Deal Information</div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="bc-label">Deal Name</label>
            <input
              className="bc-input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="bc-label">Type</label>
            <select
              className="bc-input"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              <option value="">-- Select --</option>
              <option value="New Business">New Business</option>
              <option value="Existing Business">Existing Business</option>
            </select>
          </div>
          <div>
            <label className="bc-label">Amount</label>
            <input
              className="bc-input"
              type="number"
              value={form.amount}
              onChange={(e) =>
                setForm((f) => ({ ...f, amount: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="bc-label">Close Date</label>
            <input
              className="bc-input"
              type="date"
              value={form.closeDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, closeDate: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="bc-label">Probability (%)</label>
            <input
              className="bc-input"
              type="number"
              min="0"
              max="100"
              value={form.probability}
              onChange={(e) =>
                setForm((f) => ({ ...f, probability: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="bc-label">Source</label>
            <input
              className="bc-input"
              value={form.source}
              onChange={(e) =>
                setForm((f) => ({ ...f, source: e.target.value }))
              }
            />
          </div>
        </div>
      </div>

      {/* Relationships */}
      <div className="bc-card mb-4">
        <div className="bc-section-header">Relationships</div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="bc-label">Account</label>
            <select
              className="bc-input"
              value={form.accountId}
              onChange={(e) =>
                setForm((f) => ({ ...f, accountId: e.target.value }))
              }
            >
              <option value="">-- None --</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="bc-label">Contact</label>
            <select
              className="bc-input"
              value={form.contactId}
              onChange={(e) =>
                setForm((f) => ({ ...f, contactId: e.target.value }))
              }
            >
              <option value="">-- None --</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="bc-label">Pipeline</label>
            <select
              className="bc-input"
              value={form.pipelineId}
              onChange={(e) => {
                const pid = e.target.value;
                const pl = pipelines.find((p) => p.id === pid);
                const firstStage = pl?.stages?.sort(
                  (a, b) => a.order - b.order
                )[0];
                setForm((f) => ({
                  ...f,
                  pipelineId: pid,
                  stageId: firstStage?.id || "",
                  probability: firstStage?.probability?.toString() || "",
                }));
              }}
            >
              <option value="">-- Select --</option>
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="bc-label">Stage</label>
            <select
              className="bc-input"
              value={form.stageId}
              onChange={(e) => {
                const stage = stages.find((s) => s.id === e.target.value);
                setForm((f) => ({
                  ...f,
                  stageId: e.target.value,
                  probability: stage?.probability?.toString() || f.probability,
                }));
              }}
            >
              <option value="">-- Select --</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.probability}%)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bc-card mb-4">
        <div className="bc-section-header">Description</div>
        <div className="p-4">
          <textarea
            className="bc-input min-h-[100px]"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
          />
        </div>
      </div>

      {/* Details */}
      <div className="bc-card">
        <div className="bc-section-header">Details</div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-[#706E6B]">Created:</span>{" "}
            {formatDate(deal.createdAt)}
          </div>
          <div>
            <span className="text-[#706E6B]">Last Modified:</span>{" "}
            {formatDate(deal.updatedAt)}
          </div>
          {deal.account && (
            <div>
              <span className="text-[#706E6B]">Account:</span>{" "}
              <Link
                href={`/accounts/${deal.account.id}`}
                className="text-[#0070D2] hover:text-[#005FB2]"
              >
                {deal.account.name}
              </Link>
            </div>
          )}
          {deal.contact && (
            <div>
              <span className="text-[#706E6B]">Contact:</span>{" "}
              <Link
                href={`/contacts/${deal.contact.id}`}
                className="text-[#0070D2] hover:text-[#005FB2]"
              >
                {deal.contact.firstName} {deal.contact.lastName}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
