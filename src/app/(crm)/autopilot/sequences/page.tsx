"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Mail,
  X,
  ChevronUp,
  ChevronDown,
  Play,
  Pause,
  Users,
  Search,
  UserCircle,
  Clock,
  Check,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SequenceStep {
  stepNumber: number;
  delayDays: number;
  type: string;
  subject: string;
  body: string;
}

interface Enrollment {
  id: string;
  entityType: string;
  entityId: string;
  currentStep: number;
  status: string;
  enrolledAt: string;
  lastStepAt: string | null;
  nextStepAt: string | null;
  entity?: {
    firstName: string;
    lastName: string;
    email: string | null;
    company: string | null;
  } | null;
}

interface Sequence {
  id: string;
  name: string;
  description: string | null;
  status: string;
  steps: SequenceStep[];
  totalEnrollments: number;
  activeEnrollments: number;
  enrollments?: Enrollment[];
  createdAt: string;
  updatedAt: string;
}

interface EntitySearchResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  company: string | null;
}

const AVAILABLE_VARIABLES = [
  { variable: "{{firstName}}", description: "First name" },
  { variable: "{{lastName}}", description: "Last name" },
  { variable: "{{company}}", description: "Company name" },
  { variable: "{{title}}", description: "Job title" },
];

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  archived: "bg-red-100 text-red-700",
  completed: "bg-blue-100 text-blue-700",
  replied: "bg-purple-100 text-purple-700",
  bounced: "bg-red-100 text-red-700",
  unsubscribed: "bg-gray-100 text-gray-700",
};

const EMPTY_STEP: SequenceStep = {
  stepNumber: 1,
  delayDays: 0,
  type: "email",
  subject: "",
  body: "",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SequencesPage() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState("draft");
  const [formSteps, setFormSteps] = useState<SequenceStep[]>([{ ...EMPTY_STEP }]);

  // Enrollment state
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [showEnrollSearch, setShowEnrollSearch] = useState(false);
  const [enrollEntityType, setEnrollEntityType] = useState<"Lead" | "Contact">("Lead");
  const [enrollSearch, setEnrollSearch] = useState("");
  const [enrollResults, setEnrollResults] = useState<EntitySearchResult[]>([]);
  const [enrollSearching, setEnrollSearching] = useState(false);
  const [enrollingIds, setEnrollingIds] = useState<Set<string>>(new Set());

  // Active step editing
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  /* -------- Fetch sequences -------- */
  const fetchSequences = useCallback(async () => {
    try {
      const res = await fetch("/api/agents/sequences");
      if (res.ok) {
        const data = await res.json();
        setSequences(data);
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSequences();
  }, [fetchSequences]);

  /* -------- Fetch detail with enrollments -------- */
  const fetchSequenceDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/agents/sequences/${id}`);
      if (res.ok) {
        const data = await res.json();
        setEnrollments(data.enrollments || []);
        return data;
      }
    } catch {
      // silently fail
    }
    return null;
  };

  /* -------- Reset form -------- */
  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormStatus("draft");
    setFormSteps([{ ...EMPTY_STEP }]);
    setEditingId(null);
    setShowNew(false);
    setError("");
    setEnrollments([]);
    setShowEnrollSearch(false);
    setActiveStepIndex(0);
  };

  /* -------- Start new -------- */
  const startNew = () => {
    resetForm();
    setShowNew(true);
  };

  /* -------- Start edit -------- */
  const startEdit = async (seq: Sequence) => {
    setEditingId(seq.id);
    setShowNew(false);
    setFormName(seq.name);
    setFormDescription(seq.description || "");
    setFormStatus(seq.status);
    setFormSteps(
      seq.steps.length > 0 ? seq.steps : [{ ...EMPTY_STEP }]
    );
    setActiveStepIndex(0);
    setError("");
    setShowEnrollSearch(false);
    await fetchSequenceDetail(seq.id);
  };

  /* -------- Create sequence -------- */
  const handleCreate = async () => {
    if (!formName.trim()) {
      setError("Name is required");
      return;
    }
    if (formSteps.some((s) => !s.subject.trim() || !s.body.trim())) {
      setError("Each step must have a subject and body");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/agents/sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          description: formDescription,
          steps: formSteps,
        }),
      });

      if (res.ok) {
        resetForm();
        fetchSequences();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create sequence");
      }
    } catch {
      setError("Failed to create sequence");
    }
    setSaving(false);
  };

  /* -------- Update sequence -------- */
  const handleUpdate = async () => {
    if (!editingId) return;
    if (!formName.trim()) {
      setError("Name is required");
      return;
    }
    if (formSteps.some((s) => !s.subject.trim() || !s.body.trim())) {
      setError("Each step must have a subject and body");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/agents/sequences/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          description: formDescription,
          status: formStatus,
          steps: formSteps,
        }),
      });

      if (res.ok) {
        resetForm();
        fetchSequences();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update sequence");
      }
    } catch {
      setError("Failed to update sequence");
    }
    setSaving(false);
  };

  /* -------- Delete sequence -------- */
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this sequence and all its enrollments?")) return;

    try {
      const res = await fetch(`/api/agents/sequences/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (editingId === id) resetForm();
        fetchSequences();
      }
    } catch {
      // silently fail
    }
  };

  /* -------- Step management -------- */
  const addStep = () => {
    const newStep: SequenceStep = {
      stepNumber: formSteps.length + 1,
      delayDays: 3,
      type: "email",
      subject: "",
      body: "",
    };
    setFormSteps([...formSteps, newStep]);
    setActiveStepIndex(formSteps.length);
  };

  const removeStep = (index: number) => {
    if (formSteps.length <= 1) return;
    const updated = formSteps.filter((_, i) => i !== index).map((s, i) => ({
      ...s,
      stepNumber: i + 1,
    }));
    setFormSteps(updated);
    if (activeStepIndex >= updated.length) {
      setActiveStepIndex(updated.length - 1);
    }
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= formSteps.length) return;
    const updated = [...formSteps];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    const renumbered = updated.map((s, i) => ({ ...s, stepNumber: i + 1 }));
    setFormSteps(renumbered);
    setActiveStepIndex(newIndex);
  };

  const updateStep = (index: number, field: keyof SequenceStep, value: string | number) => {
    const updated = [...formSteps];
    updated[index] = { ...updated[index], [field]: value };
    setFormSteps(updated);
  };

  /* -------- Enrollment search -------- */
  const searchEntities = async (query: string) => {
    if (query.trim().length < 2) {
      setEnrollResults([]);
      return;
    }
    setEnrollSearching(true);
    try {
      const endpoint = enrollEntityType === "Lead" ? "/api/leads" : "/api/contacts";
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        const filtered = data.filter(
          (e: EntitySearchResult & { company?: string; department?: string }) => {
            const name = `${e.firstName} ${e.lastName}`.toLowerCase();
            const company = (e.company || "").toLowerCase();
            const q = query.toLowerCase();
            return name.includes(q) || company.includes(q) || (e.email || "").toLowerCase().includes(q);
          }
        );
        // Exclude already enrolled
        const enrolledIds = new Set(
          enrollments
            .filter((en) => en.entityType === enrollEntityType)
            .map((en) => en.entityId)
        );
        setEnrollResults(
          filtered
            .filter((e: EntitySearchResult) => !enrolledIds.has(e.id))
            .slice(0, 10)
            .map((e: EntitySearchResult & { company?: string; department?: string }) => ({
              id: e.id,
              firstName: e.firstName,
              lastName: e.lastName,
              email: e.email || null,
              company: e.company || null,
            }))
        );
      }
    } catch {
      // silently fail
    }
    setEnrollSearching(false);
  };

  const enrollEntity = async (entityId: string) => {
    if (!editingId) return;
    setEnrollingIds((prev) => new Set(prev).add(entityId));
    try {
      const res = await fetch(`/api/agents/sequences/${editingId}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: enrollEntityType,
          entityIds: [entityId],
        }),
      });
      if (res.ok) {
        await fetchSequenceDetail(editingId);
        // Remove from search results
        setEnrollResults((prev) => prev.filter((r) => r.id !== entityId));
      }
    } catch {
      // silently fail
    }
    setEnrollingIds((prev) => {
      const next = new Set(prev);
      next.delete(entityId);
      return next;
    });
  };

  const removeEnrollment = async (entityType: string, entityId: string) => {
    if (!editingId) return;
    try {
      const res = await fetch(`/api/agents/sequences/${editingId}/enroll`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId }),
      });
      if (res.ok) {
        await fetchSequenceDetail(editingId);
      }
    } catch {
      // silently fail
    }
  };

  /* -------- Insert variable -------- */
  const insertVariable = (variable: string) => {
    // Append to the active step's body
    updateStep(activeStepIndex, "body", formSteps[activeStepIndex].body + variable);
  };

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#706E6B]">
        Loading...
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/autopilot" className="text-[#706E6B] hover:text-[#3E3E3C]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Mail className="w-5 h-5 text-[#706E6B]" />
          <h1 className="text-xl font-bold text-[#3E3E3C]">Outreach Sequences</h1>
        </div>
        <button onClick={startNew} className="bc-btn bc-btn-primary">
          <Plus className="w-4 h-4" />
          New Sequence
        </button>
      </div>

      {/* =================== Editor =================== */}
      {(showNew || editingId) && (
        <div className="bc-card mb-6">
          <div className="bc-section-header flex items-center justify-between">
            <span>{editingId ? "Edit Sequence" : "New Sequence"}</span>
            <button onClick={resetForm} className="text-[#706E6B] hover:text-[#3E3E3C]">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 space-y-5">
            {error && (
              <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded border border-red-200">
                {error}
              </div>
            )}

            {/* Name / Description / Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="bc-label">Name</label>
                <input
                  className="bc-input"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Cold Outreach, Follow-Up Drip"
                  autoFocus
                />
              </div>
              <div>
                <label className="bc-label">Description</label>
                <input
                  className="bc-input"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
              <div>
                <label className="bc-label">Status</label>
                <select
                  className="bc-input"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            {/* -------- Step Builder -------- */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-[#3E3E3C]">
                  Steps ({formSteps.length})
                </span>
                <button onClick={addStep} className="bc-btn bc-btn-neutral text-xs">
                  <Plus className="w-3 h-3" />
                  Add Step
                </button>
              </div>

              {/* Step tabs */}
              <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
                {formSteps.map((step, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveStepIndex(index)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors border",
                      activeStepIndex === index
                        ? "bg-[#0070D2] text-white border-[#0070D2]"
                        : "bg-white text-[#3E3E3C] border-[#DDDBDA] hover:bg-[#F4F6F9]"
                    )}
                  >
                    <Mail className="w-3 h-3" />
                    Step {step.stepNumber}
                    {step.delayDays > 0 && (
                      <span className={cn(
                        "text-[10px] opacity-75",
                        activeStepIndex === index ? "text-white/80" : "text-[#706E6B]"
                      )}>
                        +{step.delayDays}d
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Active step editor */}
              {formSteps[activeStepIndex] && (
                <div className="border border-[#DDDBDA] rounded p-4 space-y-3 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#3E3E3C]">
                      Step {formSteps[activeStepIndex].stepNumber}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveStep(activeStepIndex, "up")}
                        disabled={activeStepIndex === 0}
                        className="p-1 rounded hover:bg-[#F4F6F9] disabled:opacity-30"
                        title="Move up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveStep(activeStepIndex, "down")}
                        disabled={activeStepIndex === formSteps.length - 1}
                        className="p-1 rounded hover:bg-[#F4F6F9] disabled:opacity-30"
                        title="Move down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      {formSteps.length > 1 && (
                        <button
                          onClick={() => removeStep(activeStepIndex)}
                          className="p-1 rounded hover:bg-red-50 text-[#C23934]"
                          title="Remove step"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="bc-label">Delay (days from previous step)</label>
                      <input
                        type="number"
                        min={0}
                        className="bc-input"
                        value={formSteps[activeStepIndex].delayDays}
                        onChange={(e) =>
                          updateStep(activeStepIndex, "delayDays", parseInt(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div>
                      <label className="bc-label">Type</label>
                      <select
                        className="bc-input"
                        value={formSteps[activeStepIndex].type}
                        onChange={(e) => updateStep(activeStepIndex, "type", e.target.value)}
                      >
                        <option value="email">Email</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="bc-label">Subject</label>
                    <input
                      className="bc-input"
                      value={formSteps[activeStepIndex].subject}
                      onChange={(e) => updateStep(activeStepIndex, "subject", e.target.value)}
                      placeholder="e.g. Quick question, {{firstName}}"
                    />
                  </div>

                  <div>
                    <label className="bc-label">Body</label>
                    <textarea
                      className="bc-input min-h-[160px]"
                      value={formSteps[activeStepIndex].body}
                      onChange={(e) => updateStep(activeStepIndex, "body", e.target.value)}
                      placeholder="Hi {{firstName}},&#10;&#10;I noticed..."
                    />
                  </div>

                  {/* Variable helpers */}
                  <div className="bg-[#F4F6F9] rounded p-3">
                    <p className="text-xs font-semibold text-[#706E6B] mb-2">
                      Available Variables
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_VARIABLES.map((v) => (
                        <button
                          key={v.variable}
                          type="button"
                          onClick={() => insertVariable(v.variable)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-[#DDDBDA] rounded text-xs text-[#3E3E3C] hover:bg-[#F4F6F9] transition-colors"
                          title={v.description}
                        >
                          <span className="font-mono text-[#0070D2]">{v.variable}</span>
                          <span className="text-[#706E6B]">- {v.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* -------- Enrollments (edit mode only) -------- */}
            {editingId && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-[#3E3E3C]">
                    Enrollments ({enrollments.length})
                  </span>
                  <button
                    onClick={() => setShowEnrollSearch(!showEnrollSearch)}
                    className="bc-btn bc-btn-neutral text-xs"
                  >
                    <Users className="w-3 h-3" />
                    {showEnrollSearch ? "Close" : "Enroll Leads/Contacts"}
                  </button>
                </div>

                {/* Enroll search */}
                {showEnrollSearch && (
                  <div className="border border-[#DDDBDA] rounded p-3 mb-3 bg-[#F4F6F9] space-y-3">
                    <div className="flex gap-2">
                      <select
                        className="bc-input w-auto"
                        value={enrollEntityType}
                        onChange={(e) => {
                          setEnrollEntityType(e.target.value as "Lead" | "Contact");
                          setEnrollResults([]);
                          setEnrollSearch("");
                        }}
                      >
                        <option value="Lead">Leads</option>
                        <option value="Contact">Contacts</option>
                      </select>
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#706E6B]" />
                        <input
                          className="bc-input pl-8"
                          placeholder={`Search ${enrollEntityType.toLowerCase()}s by name, email, or company...`}
                          value={enrollSearch}
                          onChange={(e) => {
                            setEnrollSearch(e.target.value);
                            searchEntities(e.target.value);
                          }}
                        />
                      </div>
                    </div>

                    {enrollSearching && (
                      <div className="text-xs text-[#706E6B]">Searching...</div>
                    )}

                    {enrollResults.length > 0 && (
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {enrollResults.map((entity) => (
                          <div
                            key={entity.id}
                            className="flex items-center justify-between bg-white border border-[#DDDBDA] rounded px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              {enrollEntityType === "Lead" ? (
                                <Users className="w-3.5 h-3.5 text-blue-500" />
                              ) : (
                                <UserCircle className="w-3.5 h-3.5 text-purple-500" />
                              )}
                              <div>
                                <span className="text-sm font-medium text-[#3E3E3C]">
                                  {entity.firstName} {entity.lastName}
                                </span>
                                {entity.company && (
                                  <span className="text-xs text-[#706E6B] ml-2">
                                    at {entity.company}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => enrollEntity(entity.id)}
                              disabled={enrollingIds.has(entity.id)}
                              className="bc-btn bc-btn-primary text-xs py-1 px-2"
                            >
                              {enrollingIds.has(entity.id) ? "Enrolling..." : "Enroll"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {enrollSearch.length >= 2 && !enrollSearching && enrollResults.length === 0 && (
                      <div className="text-xs text-[#706E6B]">
                        No matching {enrollEntityType.toLowerCase()}s found.
                      </div>
                    )}
                  </div>
                )}

                {/* Enrolled list */}
                {enrollments.length > 0 ? (
                  <div className="overflow-x-auto border border-[#DDDBDA] rounded">
                    <table className="bc-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Type</th>
                          <th>Progress</th>
                          <th>Status</th>
                          <th>Next Step</th>
                          <th className="w-20">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrollments.map((enrollment) => (
                          <tr key={enrollment.id}>
                            <td className="font-medium text-[#3E3E3C]">
                              {enrollment.entity
                                ? `${enrollment.entity.firstName} ${enrollment.entity.lastName}`
                                : enrollment.entityId.slice(0, 8) + "..."}
                              {enrollment.entity?.email && (
                                <span className="text-xs text-[#706E6B] block">
                                  {enrollment.entity.email}
                                </span>
                              )}
                            </td>
                            <td>
                              <span
                                className={cn(
                                  "bc-badge",
                                  enrollment.entityType === "Lead"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-purple-100 text-purple-700"
                                )}
                              >
                                {enrollment.entityType}
                              </span>
                            </td>
                            <td className="text-sm text-[#706E6B]">
                              Step {enrollment.currentStep}/{formSteps.length}
                            </td>
                            <td>
                              <span
                                className={cn(
                                  "bc-badge",
                                  STATUS_STYLES[enrollment.status] || "bg-gray-100 text-gray-700"
                                )}
                              >
                                {enrollment.status === "active" && <Play className="w-3 h-3 mr-0.5" />}
                                {enrollment.status === "paused" && <Pause className="w-3 h-3 mr-0.5" />}
                                {enrollment.status === "completed" && <Check className="w-3 h-3 mr-0.5" />}
                                {enrollment.status}
                              </span>
                            </td>
                            <td className="text-xs text-[#706E6B]">
                              {enrollment.nextStepAt ? (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(enrollment.nextStepAt).toLocaleDateString()}
                                </span>
                              ) : (
                                "--"
                              )}
                            </td>
                            <td>
                              <button
                                onClick={() =>
                                  removeEnrollment(enrollment.entityType, enrollment.entityId)
                                }
                                className="text-[#C23934] hover:text-[#A61A14] text-xs font-semibold flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-[#706E6B] border border-[#DDDBDA] rounded bg-[#F4F6F9]">
                    No enrollments yet. Use the button above to enroll leads or contacts.
                  </div>
                )}
              </div>
            )}

            {/* Save / Cancel */}
            <div className="flex justify-end gap-2 pt-2 border-t border-[#DDDBDA]">
              <button onClick={resetForm} className="bc-btn bc-btn-neutral">
                Cancel
              </button>
              <button
                onClick={editingId ? handleUpdate : handleCreate}
                disabled={saving}
                className="bc-btn bc-btn-primary"
              >
                <Save className="w-4 h-4" />
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Sequence"
                    : "Create Sequence"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================== Sequence List =================== */}
      {sequences.length > 0 ? (
        <div className="bc-card">
          <div className="bc-section-header">Sequences</div>
          <div className="overflow-x-auto">
            <table className="bc-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Steps</th>
                  <th>Active Enrollments</th>
                  <th>Created</th>
                  <th className="w-28">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sequences.map((seq) => (
                  <tr key={seq.id}>
                    <td>
                      <button
                        onClick={() => startEdit(seq)}
                        className="font-medium text-[#0070D2] hover:text-[#005FB2] text-left"
                      >
                        {seq.name}
                      </button>
                      {seq.description && (
                        <span className="block text-xs text-[#706E6B] mt-0.5">
                          {seq.description.length > 60
                            ? seq.description.slice(0, 60) + "..."
                            : seq.description}
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        className={cn(
                          "bc-badge",
                          STATUS_STYLES[seq.status] || "bg-gray-100 text-gray-700"
                        )}
                      >
                        {seq.status === "active" && <Play className="w-3 h-3 mr-0.5" />}
                        {seq.status === "paused" && <Pause className="w-3 h-3 mr-0.5" />}
                        {seq.status === "draft" && <AlertCircle className="w-3 h-3 mr-0.5" />}
                        {seq.status}
                      </span>
                    </td>
                    <td className="text-[#706E6B]">{seq.steps.length}</td>
                    <td className="text-[#706E6B]">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {seq.activeEnrollments}
                        {seq.totalEnrollments !== seq.activeEnrollments && (
                          <span className="text-xs opacity-60">
                            / {seq.totalEnrollments} total
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="text-[#706E6B] text-sm">
                      {new Date(seq.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(seq)}
                          className="text-[#0070D2] hover:text-[#005FB2] text-xs font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(seq.id)}
                          className="text-[#C23934] hover:text-[#A61A14] text-xs font-semibold flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        !showNew && (
          <div className="bc-card p-8 text-center text-[#706E6B]">
            <Mail className="w-10 h-10 mx-auto mb-3 text-[#C9C7C5]" />
            <p className="mb-1 font-medium">No outreach sequences yet.</p>
            <p className="text-sm mb-4">
              Create a multi-step email sequence to automate your outreach.
              Enroll leads or contacts and let the AI personalize each message.
            </p>
            <button onClick={startNew} className="bc-btn bc-btn-primary">
              <Plus className="w-4 h-4" />
              Create Your First Sequence
            </button>
          </div>
        )
      )}
    </div>
  );
}
