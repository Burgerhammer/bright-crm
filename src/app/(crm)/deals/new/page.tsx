"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, X } from "lucide-react";

interface Account {
  id: string;
  name: string;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
}

interface Stage {
  id: string;
  name: string;
  order: number;
  probability: number;
  color: string;
}

interface Pipeline {
  id: string;
  name: string;
  isDefault: boolean;
  stages: Stage[];
}

export default function NewDealPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);

  const [form, setForm] = useState({
    name: "",
    type: "",
    source: "",
    amount: "",
    closeDate: "",
    probability: "",
    accountId: "",
    contactId: "",
    pipelineId: "",
    stageId: "",
    description: "",
  });

  // Fetch accounts, contacts, pipelines on mount
  useEffect(() => {
    Promise.all([
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/contacts").then((r) => r.json()),
      fetch("/api/pipelines").then((r) => r.json()),
    ]).then(([accts, ctcts, pipes]) => {
      setAccounts(accts);
      setContacts(ctcts);
      setPipelines(pipes);

      // Auto-select default pipeline
      const defaultPipeline = pipes.find((p: Pipeline) => p.isDefault) || pipes[0];
      if (defaultPipeline) {
        setForm((prev) => ({ ...prev, pipelineId: defaultPipeline.id }));
        setStages(defaultPipeline.stages);
        if (defaultPipeline.stages.length > 0) {
          const firstStage = defaultPipeline.stages[0];
          setForm((prev) => ({
            ...prev,
            pipelineId: defaultPipeline.id,
            stageId: firstStage.id,
            probability: String(firstStage.probability),
          }));
        }
      }
    });
  }, []);

  // When pipeline changes, update stages dropdown
  const handlePipelineChange = (pipelineId: string) => {
    const pipeline = pipelines.find((p) => p.id === pipelineId);
    const newStages = pipeline?.stages || [];
    setStages(newStages);

    const firstStage = newStages[0];
    setForm((prev) => ({
      ...prev,
      pipelineId,
      stageId: firstStage?.id || "",
      probability: firstStage ? String(firstStage.probability) : prev.probability,
    }));
  };

  // When stage changes, auto-fill probability
  const handleStageChange = (stageId: string) => {
    const stage = stages.find((s) => s.id === stageId);
    setForm((prev) => ({
      ...prev,
      stageId,
      probability: stage ? String(stage.probability) : prev.probability,
    }));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          type: form.type || undefined,
          source: form.source || undefined,
          amount: form.amount ? Number(form.amount) : undefined,
          closeDate: form.closeDate || undefined,
          probability: form.probability ? Number(form.probability) : undefined,
          accountId: form.accountId || undefined,
          contactId: form.contactId || undefined,
          pipelineId: form.pipelineId,
          stageId: form.stageId,
          description: form.description || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create deal");
      }

      const deal = await res.json();
      router.push(`/deals/${deal.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create deal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[#3E3E3C]">New Deal</h1>
        <div className="flex items-center gap-2">
          <Link href="/deals" className="bc-btn bc-btn-neutral">
            <X className="w-4 h-4" />
            Cancel
          </Link>
          <button
            type="submit"
            form="deal-form"
            disabled={saving}
            className="bc-btn bc-btn-primary"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      <form id="deal-form" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Deal Information */}
          <div className="bc-card">
            <div className="bc-section-header">Deal Information</div>
            <div className="p-4 space-y-4">
              <div>
                <label htmlFor="name" className="bc-label">
                  Deal Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={handleChange}
                  className="bc-input"
                  placeholder="e.g. Acme Corp - Enterprise License"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="type" className="bc-label">Type</label>
                  <select
                    id="type"
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    className="bc-input"
                  >
                    <option value="">-- Select --</option>
                    <option value="New Business">New Business</option>
                    <option value="Existing Business">Existing Business</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="source" className="bc-label">Source</label>
                  <input
                    id="source"
                    name="source"
                    type="text"
                    value={form.source}
                    onChange={handleChange}
                    className="bc-input"
                    placeholder="e.g. Web, Referral"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="amount" className="bc-label">Amount ($)</label>
                  <input
                    id="amount"
                    name="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={handleChange}
                    className="bc-input"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label htmlFor="closeDate" className="bc-label">Close Date</label>
                  <input
                    id="closeDate"
                    name="closeDate"
                    type="date"
                    value={form.closeDate}
                    onChange={handleChange}
                    className="bc-input"
                  />
                </div>
                <div>
                  <label htmlFor="probability" className="bc-label">Probability (%)</label>
                  <input
                    id="probability"
                    name="probability"
                    type="number"
                    min="0"
                    max="100"
                    value={form.probability}
                    onChange={handleChange}
                    className="bc-input"
                    placeholder="0-100"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Relationships */}
          <div className="bc-card">
            <div className="bc-section-header">Relationships</div>
            <div className="p-4 space-y-4">
              <div>
                <label htmlFor="accountId" className="bc-label">Account</label>
                <select
                  id="accountId"
                  name="accountId"
                  value={form.accountId}
                  onChange={handleChange}
                  className="bc-input"
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
                <label htmlFor="contactId" className="bc-label">Contact</label>
                <select
                  id="contactId"
                  name="contactId"
                  value={form.contactId}
                  onChange={handleChange}
                  className="bc-input"
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
                <label htmlFor="pipelineId" className="bc-label">
                  Pipeline <span className="text-red-500">*</span>
                </label>
                <select
                  id="pipelineId"
                  name="pipelineId"
                  required
                  value={form.pipelineId}
                  onChange={(e) => handlePipelineChange(e.target.value)}
                  className="bc-input"
                >
                  <option value="">-- Select Pipeline --</option>
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.isDefault ? "(Default)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="stageId" className="bc-label">
                  Stage <span className="text-red-500">*</span>
                </label>
                <select
                  id="stageId"
                  name="stageId"
                  required
                  value={form.stageId}
                  onChange={(e) => handleStageChange(e.target.value)}
                  className="bc-input"
                >
                  <option value="">-- Select Stage --</option>
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.probability}%)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bc-card mt-4">
          <div className="bc-section-header">Description</div>
          <div className="p-4">
            <textarea
              id="description"
              name="description"
              rows={4}
              value={form.description}
              onChange={handleChange}
              className="bc-input"
              placeholder="Add notes about this deal..."
            />
          </div>
        </div>
      </form>
    </div>
  );
}
