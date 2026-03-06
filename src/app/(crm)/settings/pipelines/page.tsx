"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  GripVertical,
  Star,
} from "lucide-react";

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

export default function PipelineSettingsPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPipelineName, setNewPipelineName] = useState("");
  const [showNewPipeline, setShowNewPipeline] = useState(false);
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [stageForm, setStageForm] = useState({
    name: "",
    probability: 0,
    color: "#3B82F6",
  });
  const [newStage, setNewStage] = useState<{
    pipelineId: string;
    name: string;
    probability: number;
    color: string;
  } | null>(null);

  const fetchPipelines = async () => {
    const res = await fetch("/api/pipelines");
    const data = await res.json();
    setPipelines(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPipelines();
  }, []);

  const handleCreatePipeline = async () => {
    if (!newPipelineName.trim()) return;
    const res = await fetch("/api/pipelines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newPipelineName }),
    });
    if (res.ok) {
      setNewPipelineName("");
      setShowNewPipeline(false);
      fetchPipelines();
    }
  };

  const handleDeletePipeline = async (id: string) => {
    if (!confirm("Delete this pipeline and all its stages?")) return;
    await fetch(`/api/pipelines/${id}`, { method: "DELETE" });
    fetchPipelines();
  };

  const handleAddStage = async (pipelineId: string) => {
    if (!newStage || !newStage.name.trim()) return;
    const pipeline = pipelines.find((p) => p.id === pipelineId);
    const maxOrder = pipeline?.stages?.length
      ? Math.max(...pipeline.stages.map((s) => s.order))
      : 0;

    const res = await fetch(`/api/pipelines/${pipelineId}/stages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newStage.name,
        probability: newStage.probability,
        color: newStage.color,
        order: maxOrder + 1,
      }),
    });
    if (res.ok) {
      setNewStage(null);
      fetchPipelines();
    }
  };

  const handleUpdateStage = async (stageId: string) => {
    const res = await fetch(`/api/stages/${stageId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stageForm),
    });
    if (res.ok) {
      setEditingStage(null);
      fetchPipelines();
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    if (!confirm("Delete this stage? Deals in this stage will need to be moved.")) return;
    await fetch(`/api/stages/${stageId}`, { method: "DELETE" });
    fetchPipelines();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#706E6B]">
        Loading...
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="text-[#706E6B] hover:text-[#3E3E3C]"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-[#3E3E3C]">
            Pipeline Management
          </h1>
        </div>
        <button
          onClick={() => setShowNewPipeline(true)}
          className="bc-btn bc-btn-primary"
        >
          <Plus className="w-4 h-4" />
          New Pipeline
        </button>
      </div>

      {/* New Pipeline Form */}
      {showNewPipeline && (
        <div className="bc-card mb-4 p-4">
          <div className="flex items-center gap-3">
            <input
              className="bc-input flex-1"
              placeholder="Pipeline Name"
              value={newPipelineName}
              onChange={(e) => setNewPipelineName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreatePipeline()}
              autoFocus
            />
            <button
              onClick={handleCreatePipeline}
              className="bc-btn bc-btn-primary"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowNewPipeline(false);
                setNewPipelineName("");
              }}
              className="bc-btn bc-btn-neutral"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pipelines */}
      {pipelines.map((pipeline) => (
        <div key={pipeline.id} className="bc-card mb-4">
          <div className="bc-section-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              {pipeline.name}
              {pipeline.isDefault && (
                <span className="bc-badge bg-blue-100 text-blue-700">
                  <Star className="w-3 h-3 mr-1" />
                  Default
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setNewStage({
                    pipelineId: pipeline.id,
                    name: "",
                    probability: 0,
                    color: "#3B82F6",
                  });
                }}
                className="bc-btn bc-btn-neutral text-xs py-1"
              >
                <Plus className="w-3 h-3" />
                Add Stage
              </button>
              {!pipeline.isDefault && (
                <button
                  onClick={() => handleDeletePipeline(pipeline.id)}
                  className="bc-btn bc-btn-destructive text-xs py-1"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="p-2 overflow-x-auto">
            <table className="bc-table">
              <thead>
                <tr>
                  <th className="w-8"></th>
                  <th>Stage Name</th>
                  <th className="w-24">Order</th>
                  <th className="w-28">Probability</th>
                  <th className="w-20">Color</th>
                  <th className="w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pipeline.stages
                  .sort((a, b) => a.order - b.order)
                  .map((stage) => (
                    <tr key={stage.id}>
                      <td>
                        <GripVertical className="w-4 h-4 text-[#C9C7C5]" />
                      </td>
                      {editingStage === stage.id ? (
                        <>
                          <td>
                            <input
                              className="bc-input"
                              value={stageForm.name}
                              onChange={(e) =>
                                setStageForm((f) => ({
                                  ...f,
                                  name: e.target.value,
                                }))
                              }
                            />
                          </td>
                          <td className="text-center">{stage.order}</td>
                          <td>
                            <input
                              className="bc-input"
                              type="number"
                              min="0"
                              max="100"
                              value={stageForm.probability}
                              onChange={(e) =>
                                setStageForm((f) => ({
                                  ...f,
                                  probability: parseInt(e.target.value) || 0,
                                }))
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="color"
                              value={stageForm.color}
                              onChange={(e) =>
                                setStageForm((f) => ({
                                  ...f,
                                  color: e.target.value,
                                }))
                              }
                              className="w-8 h-8 rounded cursor-pointer border border-[#DDDBDA]"
                            />
                          </td>
                          <td>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleUpdateStage(stage.id)}
                                className="bc-btn bc-btn-primary text-xs py-1 px-2"
                              >
                                <Save className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setEditingStage(null)}
                                className="bc-btn bc-btn-neutral text-xs py-1 px-2"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="font-medium">{stage.name}</td>
                          <td className="text-center">{stage.order}</td>
                          <td>{stage.probability}%</td>
                          <td>
                            <div
                              className="w-6 h-6 rounded border border-[#DDDBDA]"
                              style={{ backgroundColor: stage.color }}
                            />
                          </td>
                          <td>
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  setEditingStage(stage.id);
                                  setStageForm({
                                    name: stage.name,
                                    probability: stage.probability,
                                    color: stage.color,
                                  });
                                }}
                                className="text-[#0070D2] hover:text-[#005FB2] text-xs font-semibold"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteStage(stage.id)}
                                className="text-[#C23934] hover:text-[#A61A14] text-xs font-semibold ml-2"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}

                {/* New Stage Row */}
                {newStage?.pipelineId === pipeline.id && (
                  <tr>
                    <td></td>
                    <td>
                      <input
                        className="bc-input"
                        placeholder="Stage Name"
                        value={newStage.name}
                        onChange={(e) =>
                          setNewStage((s) =>
                            s ? { ...s, name: e.target.value } : s
                          )
                        }
                        autoFocus
                      />
                    </td>
                    <td className="text-center text-[#706E6B]">Auto</td>
                    <td>
                      <input
                        className="bc-input"
                        type="number"
                        min="0"
                        max="100"
                        value={newStage.probability}
                        onChange={(e) =>
                          setNewStage((s) =>
                            s
                              ? {
                                  ...s,
                                  probability: parseInt(e.target.value) || 0,
                                }
                              : s
                          )
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="color"
                        value={newStage.color}
                        onChange={(e) =>
                          setNewStage((s) =>
                            s ? { ...s, color: e.target.value } : s
                          )
                        }
                        className="w-8 h-8 rounded cursor-pointer border border-[#DDDBDA]"
                      />
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleAddStage(pipeline.id)}
                          className="bc-btn bc-btn-primary text-xs py-1 px-2"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => setNewStage(null)}
                          className="bc-btn bc-btn-neutral text-xs py-1 px-2"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {pipeline.stages.length === 0 && !newStage && (
              <div className="text-center text-sm text-[#706E6B] py-6 italic">
                No stages. Add stages to use this pipeline.
              </div>
            )}
          </div>
        </div>
      ))}

      {pipelines.length === 0 && (
        <div className="bc-card p-8 text-center text-[#706E6B]">
          No pipelines yet. Create your first pipeline to get started.
        </div>
      )}
    </div>
  );
}
