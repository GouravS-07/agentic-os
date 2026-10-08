"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Compass,
  Play,
  Pause,
  XCircle,
  Clock,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  Bot,
  ShieldAlert,
  Activity,
  Zap,
  Brain,
  GitBranch,
  History,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Mission, Task, PlanRevision, Memory } from "@/types";
import { DAGVisualizer } from "@/components/dag/DAGVisualizer";
import { useWebSocket } from "@/lib/useWebSocket";
import { EventItem } from "@/lib/events";
import {
  fetchMissionPlanRevisions,
  fetchMissionMemories,
  triggerMissionReplan,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { InterlockingDiagram } from "@/world/renderSvg/InterlockingDiagram";
import { Docket } from "@/world/ui/Docket";
import { useWorldStore } from "@/world/state/worldStore";
import { evaluateWorldMode } from "@/world/config";
import { reconcileMission, createInitialSceneModel } from "@/world/adapter/reconcile";
import type { SceneMission } from "@/world/adapter/types";
import dynamic from "next/dynamic";

// Dynamically import SpatialMissionCanvas (Three.js — client-side only)
const SpatialMissionCanvas = dynamic(
  () => import("@/spatial/SpatialMissionCanvas").then((m) => m.SpatialMissionCanvas),
  { ssr: false, loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#060608]">
      <span className="text-[10px] font-mono text-[#3a3a4a]">Initialising spatial workspace...</span>
    </div>
  )}
);

export default function MissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const missionId = params?.id as string;

  const [mission, setMission] = useState<Mission | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [planRevisions, setPlanRevisions] = useState<PlanRevision[]>([]);
  const [missionMemories, setMissionMemories] = useState<Memory[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [liveMissionEvents, setLiveMissionEvents] = useState<EventItem[]>([]);
  const [activeTab, setActiveTab] = useState<"dag" | "evolution" | "memory">("dag");
  const [viewMode, setViewMode] = useState<"INTERLOCKING" | "STANDARD" | "SPATIAL">("STANDARD");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const { openDocket, closeDocket, activeDocket } = useWorldStore();

  // Synchronize activeDocket with selectedTaskId (e.g. when user dismisses the docket with [X ESC])
  useEffect(() => {
    if (!activeDocket && selectedTaskId) {
      setSelectedTaskId(null);
    } else if (activeDocket && activeDocket.type === "STATION" && activeDocket.id !== selectedTaskId) {
      setSelectedTaskId(activeDocket.id);
    }
  }, [activeDocket, selectedTaskId]);

  // Authoritative SceneMission computed directly via the reconcile pipeline
  const sceneMission: SceneMission | null = React.useMemo(() => {
    if (!mission) return null;
    const initialModel = createInitialSceneModel();
    const model = reconcileMission(
      initialModel,
      {
        id: mission.id,
        title: mission.title,
        description: mission.description || "",
        status: mission.status,
        plan_version: mission.plan_version || 1,
        replan_count: mission.replan_count || 0,
        progress: mission.progress || 0,
      },
      tasks.map((t) => ({
        id: t.id,
        mission_id: t.mission_id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        assigned_agent_id: t.assigned_agent_id,
        dependencies: t.dependencies || [],
        retry_count: t.retry_count,
        max_retries: t.max_retries,
        error_message: t.error_message,
        output_data: t.output_data,
        input_data: t.input_data,
      })),
      approvals.map((a) => ({
        id: a.id,
        mission_id: a.mission_id,
        task_id: a.task_id,
        agent_id: a.agent_id || a.agent_name || "",
        tool_name: a.tool_name || "",
        risk_level: a.risk_level || "MEDIUM",
        reason: a.reason || a.action_description || "",
        arguments: a.parameters || {},
        arguments_hash: a.arguments_hash || "",
        status: a.status,
        requested_at: a.created_at || a.requested_at || new Date().toISOString(),
        expires_at: a.expires_at || new Date().toISOString(),
      })),
      planRevisions.map((r) => ({
        version: r.version,
        parent_version: r.parent_version,
        strategy: r.strategy,
        reason: r.reason,
        created_at: r.created_at,
        plan_snapshot: r.plan_snapshot,
      })),
      missionMemories.map((m) => ({
        id: m.id,
        memory_type: m.memory_type,
        source: m.source,
        content: m.content,
        importance: m.importance,
        relevance_score: (m as any).relevance_score,
        mission_id: m.mission_id,
        task_id: m.task_id,
      }))
    );
    return model.missions[mission.id] || null;
  }, [mission, tasks, approvals, planRevisions, missionMemories]);

  const handleSelectStation = (taskId: string | null) => {
    setSelectedTaskId(taskId);
    if (!taskId) {
      closeDocket();
      return;
    }
    const t = tasks.find((item) => item.id === taskId);
    if (t) {
      openDocket({
        type: "STATION",
        id: t.id,
        title: t.title,
        meta: {
          status: t.status,
          assigned_agent: (t as any).assigned_agent || (t as any).assigned_agent_type,
          is_recovery: (t as any).is_recovery || t.title.toLowerCase().includes("recovery"),
          retry_count: (t as any).retry_count,
          failure_category: (t as any).failure_category || (t as any).error_type,
          description: t.description,
          dependencies: (t as any).dependencies || (t as any).depends_on,
        },
      });
    }
  };

  const [replanTargetTask, setReplanTargetTask] = useState<Task | null>(null);
  const [replanReason, setReplanReason] = useState("");
  const [isReplanning, setIsReplanning] = useState(false);

  const loadData = useCallback(async () => {
    if (!missionId) return;
    try {
      const [mRes, tRes, aRes, revs, mems] = await Promise.all([
        fetch(`/api/v1/missions/${missionId}`),
        fetch(`/api/v1/missions/${missionId}/tasks`),
        fetch(`/api/v1/approvals`).catch(() => null),
        fetchMissionPlanRevisions(missionId).catch(() => []),
        fetchMissionMemories(missionId).catch(() => []),
      ]);

      if (mRes.ok) {
        const mData = await mRes.json();
        setMission(mData);
      } else {
        setMission(null);
      }

      if (tRes.ok) {
        const tData = await tRes.json();
        setTasks(Array.isArray(tData) ? tData : (tData.items || []));
      }

      if (aRes && aRes.ok) {
        const aData = await aRes.json();
        const items = Array.isArray(aData) ? aData : (aData.items || []);
        setApprovals(items.filter((item: any) => item.mission_id === missionId));
      } else {
        setApprovals([]);
      }

      setPlanRevisions(Array.isArray(revs) ? revs : []);
      setMissionMemories(Array.isArray(mems) ? mems : []);
    } catch (err) {
      console.error("Failed to load mission details:", err);
      setMission(null);
    } finally {
      setLoading(false);
    }
  }, [missionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle incoming live WebSocket domain event
  const handleLiveEvent = useCallback(
    (ev: EventItem) => {
      setLiveMissionEvents((prev) => [ev, ...prev].slice(0, 50));
      // Re-fetch mission, task DAG, and plan revision state when state changes
      if (
        ev.event_type.startsWith("TASK_") ||
        ev.event_type.startsWith("MISSION_") ||
        ev.event_type.startsWith("DAG_") ||
        ev.event_type.startsWith("APPROVAL_") ||
        ev.event_type.startsWith("REPLAN_") ||
        ev.event_type.startsWith("RECOVERY_") ||
        ev.event_type.startsWith("FAILURE_")
      ) {
        loadData();
      }
    },
    [loadData]
  );

  // Connect to mission-scoped WebSocket channel with auto-reconnect & replay sync
  const { status: wsStatus } = useWebSocket({
    channel: missionId || "system",
    onEvent: handleLiveEvent,
    enableReplaySync: true,
  });

  const handlePlanWithAI = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/missions/${missionId}/plan`, {
        method: "POST",
      });
      if (res.ok) {
        await loadData();
      } else {
        const err = await res.json();
        alert(err.message || "Failed to decompose plan with AI");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMissionAction = async (action: "start" | "pause" | "cancel") => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/missions/${missionId}/${action}`, {
        method: "POST",
      });
      if (res.ok) {
        await loadData();
      } else {
        const err = await res.json();
        alert(err.message || `Failed to ${action} mission`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTaskAction = async (
    taskId: string,
    action: "start" | "complete" | "fail" | "execute"
  ) => {
    try {
      const endpoint =
        action === "execute"
          ? `/api/v1/tasks/${taskId}/execute`
          : `/api/v1/tasks/${taskId}/${action}`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "complete" ? { output_data: {} } : {}),
      });
      if (res.ok) {
        await loadData();
      } else {
        const err = await res.json();
        alert(err.message || `Task action '${action}' failed`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualReplanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replanTargetTask) return;
    setIsReplanning(true);
    try {
      await triggerMissionReplan(missionId, replanTargetTask.id, replanReason);
      setReplanTargetTask(null);
      setReplanReason("");
      await loadData();
      setActiveTab("evolution");
    } catch (err: any) {
      alert(err.message || "Replanning failed");
    } finally {
      setIsReplanning(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
        <p className="text-xs font-mono text-muted-foreground">Synchronizing Mission Control Room {missionId}...</p>
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="p-16 text-center space-y-4">
        <h3 className="text-base font-semibold text-foreground">Mission Not Found</h3>
        <p className="text-xs text-muted-foreground font-mono">ID: {missionId}</p>
        <Link href="/missions" className="text-xs text-primary underline">
          Back to Missions
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/missions"
            className="p-2.5 rounded-xl bg-surface/80 border border-border/80 text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-bold text-foreground font-mono">{mission.title}</h2>
              <span
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold border",
                  mission.status === "RUNNING" && "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
                  mission.status === "WAITING_APPROVAL" && "bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse",
                  mission.status === "COMPLETED" && "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
                  mission.status === "PLANNING" && "bg-purple-500/15 text-purple-400 border-purple-500/30"
                )}
              >
                {mission.status}
              </span>
              {mission.plan_version && mission.plan_version > 1 && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center gap-1 font-semibold">
                  <GitBranch className="w-3 h-3" />
                  Plan v{mission.plan_version} ({mission.replan_count || 0} replans)
                </span>
              )}
              {/* WebSocket Live Status Pill */}
              <div
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium border",
                  wsStatus === "connected" && "bg-emerald-950/50 text-emerald-400 border-emerald-800/60",
                  wsStatus === "connecting" && "bg-amber-950/50 text-amber-400 border-amber-800/60 animate-pulse",
                  wsStatus === "reconnecting" && "bg-amber-950/50 text-amber-400 border-amber-800/60 animate-pulse",
                  wsStatus === "disconnected" && "bg-rose-950/50 text-rose-400 border-rose-800/60"
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    wsStatus === "connected" && "bg-emerald-400 animate-ping",
                    wsStatus === "connecting" && "bg-amber-400",
                    wsStatus === "reconnecting" && "bg-amber-400",
                    wsStatus === "disconnected" && "bg-rose-400"
                  )}
                />
                <span className="capitalize">Live WS: {wsStatus}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              Mission ID: {mission.id}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View mode toggle: STANDARD → SPATIAL → INTERLOCKING */}
          <button
            onClick={() =>
              setViewMode((v) => {
                if (v === "STANDARD") return "SPATIAL";
                if (v === "SPATIAL") return "INTERLOCKING";
                return "STANDARD";
              })
            }
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold border transition-all",
              viewMode === "SPATIAL"
                ? "bg-[#0d1a10] text-[#90c870] border-[#3a6030] shadow-sm"
                : viewMode === "INTERLOCKING"
                ? "bg-[#EFE9DC] text-[#121214] border-[#121214] shadow-sm"
                : "bg-surface-raised border-border/80 text-muted-foreground hover:text-foreground"
            )}
            title="Cycle view: Standard DAG → Spatial 3D → Interlocking Diagram"
          >
            <span
              className={cn(
                "w-2 h-2 rounded-none",
                viewMode === "SPATIAL" ? "bg-[#5a9040]" : viewMode === "INTERLOCKING" ? "bg-[#C98A2B]" : "bg-muted-foreground"
              )}
            />
            <span>
              {viewMode === "SPATIAL"
                ? "SPATIAL VIEW"
                : viewMode === "INTERLOCKING"
                ? "INTERLOCKING DIAGRAM"
                : "STANDARD DAG"}
            </span>
          </button>

          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-surface/80 border border-border/80 text-muted-foreground hover:text-foreground transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* AI Planner Trigger Button when in PLANNING state */}
          {mission.status === "PLANNING" && (
            <button
              onClick={handlePlanWithAI}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-purple-600 hover:from-primary-hover hover:to-purple-500 text-white text-xs font-semibold transition-all shadow-md shadow-primary/20 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>Decompose with AI Planner</span>
            </button>
          )}

          {mission.status !== "RUNNING" &&
            mission.status !== "COMPLETED" &&
            mission.status !== "CANCELLED" &&
            mission.status !== "PLANNING" && (
              <button
                onClick={() => handleMissionAction("start")}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Execution</span>
              </button>
            )}

          {mission.status === "RUNNING" && (
            <button
              onClick={() => handleMissionAction("pause")}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-raised border border-border/80 hover:bg-muted text-foreground text-xs font-semibold transition-all"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>
          )}

          {mission.status !== "COMPLETED" && mission.status !== "CANCELLED" && (
            <button
              onClick={() => handleMissionAction("cancel")}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </div>

      {/* Security Gate Banner */}
      {mission.status === "WAITING_APPROVAL" && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-between gap-4 backdrop-blur-xl shadow-lg shadow-amber-500/10">
          <div className="flex items-center gap-3 text-amber-400">
            <ShieldAlert className="w-5 h-5 shrink-0 animate-pulse" />
            <div>
              <p className="text-sm font-bold">Autonomous Execution Paused at Security Checkpoint</p>
              <p className="text-xs text-amber-400/80 font-mono">
                Tool call requires operator validation under Permission Guard policy.
              </p>
            </div>
          </div>
          <Link
            href="/approvals"
            className="px-4 py-2 rounded-xl bg-amber-500 text-background font-bold text-xs hover:bg-amber-400 transition-all shadow-md shrink-0"
          >
            Review & Authorize
          </Link>
        </div>
      )}

      {/* Goal & Progression Card */}
      <div className="rounded-3xl bg-surface/75 border border-border/90 p-6 backdrop-blur-xl shadow-xl space-y-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">
            Mission Directive / Objective
          </span>
          <p className="text-sm text-foreground font-mono leading-relaxed bg-background/60 p-3.5 rounded-2xl border border-border/80">
            {mission.description}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-2 border-t border-border/60">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-muted-foreground">DAG Progression (Derived)</span>
            <span className="text-cyan-400 font-bold">{mission.progress}%</span>
          </div>
          <div className="h-2 w-full bg-background rounded-full overflow-hidden border border-border">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-primary rounded-full transition-all duration-500"
              style={{ width: `${mission.progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-2">
        <button
          onClick={() => setActiveTab("dag")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all",
            activeTab === "dag"
              ? "bg-surface-raised border border-border/80 text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span>Task DAG Visualizer ({tasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("evolution")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all",
            activeTab === "evolution"
              ? "bg-surface-raised border border-border/80 text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <GitBranch className="w-3.5 h-3.5 text-purple-400" />
          <span>Plan Evolution ({planRevisions.length + 1} Revisions)</span>
        </button>

        <button
          onClick={() => setActiveTab("memory")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all",
            activeTab === "memory"
              ? "bg-surface-raised border border-border/80 text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Brain className="w-3.5 h-3.5 text-cyan-400" />
          <span>Mission Memory ({missionMemories.length})</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "dag" && (
        viewMode === "INTERLOCKING" ? (
          <div className="w-full h-[660px] rounded-3xl overflow-hidden border border-[#121214] shadow-2xl relative">
            <InterlockingDiagram
              mission={mission}
              tasks={tasks}
              planRevisions={planRevisions}
              selectedTaskId={selectedTaskId}
              onSelectTask={handleSelectStation}
            />
          </div>
        ) : viewMode === "SPATIAL" ? (
          <div className="w-full h-[760px] rounded-xl overflow-hidden border border-border/40 relative bg-[#0b0d13]">
            <SpatialMissionCanvas
              sceneMission={sceneMission}
              selectedTaskId={selectedTaskId}
              onStationSelect={(id) => {
                setSelectedTaskId(id);
                handleSelectStation(id);
              }}
            />
          </div>
        ) : (
          <div className="rounded-3xl bg-surface/75 border border-border/90 p-6 backdrop-blur-xl shadow-xl">
            <DAGVisualizer
              tasks={tasks}
              onTaskAction={handleTaskAction}
              selectedTaskId={selectedTaskId}
              onSelectTask={handleSelectStation}
            />
          </div>
        )
      )}

      {activeTab === "evolution" && (
        <div className="rounded-3xl bg-surface/75 border border-border/90 p-6 backdrop-blur-xl shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-border/80 pb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 font-mono">
                <GitBranch className="w-4 h-4 text-purple-400" />
                Plan Evolution & Dynamic Graph Rewiring
              </h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                Tracks dynamic graph restructuring, recovery task injections, and failure remediations.
              </p>
            </div>
            <div className="text-xs font-mono text-purple-300 font-semibold px-3 py-1 bg-purple-500/20 rounded-xl border border-purple-500/40">
              Current Plan Version: v{mission.plan_version || 1}
            </div>
          </div>

          <div className="space-y-4">
            {/* Version 1 Initial Plan */}
            <div className="p-4 rounded-2xl bg-background/80 border border-border/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-primary/20 text-primary border border-primary/30 font-semibold">
                    v1.0 (Initial Plan)
                  </span>
                  <span className="text-xs font-semibold text-foreground font-mono">Mission Decomposed</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {new Date(mission.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                Initial DAG synthesized with {tasks.filter(t => !t.title.startsWith("Fix & Recover")).length} planned tasks.
              </p>
            </div>

            {/* Replanned Revisions */}
            {planRevisions.map((rev) => (
              <div
                key={rev.id}
                className="p-5 rounded-2xl bg-background/80 border border-purple-500/40 space-y-3 relative pl-6 before:absolute before:left-2.5 before:top-6 before:bottom-0 before:w-0.5 before:bg-purple-500/40 shadow-lg shadow-purple-500/5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold">
                        v{rev.version}.0 (Replan #{rev.version - 1})
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        {rev.strategy}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        by {rev.created_by}
                      </span>
                    </div>
                    <p className="text-xs text-foreground font-mono">{rev.reason}</p>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                    {new Date(rev.created_at).toLocaleTimeString()}
                  </span>
                </div>

                {rev.plan_snapshot?.tasks && (
                  <div className="bg-surface/70 rounded-xl p-3 border border-border/80 text-xs font-mono space-y-1.5">
                    <div className="text-[10px] text-muted-foreground uppercase">Graph Snapshot ({rev.plan_snapshot.tasks.length} tasks):</div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {rev.plan_snapshot.tasks.map((st: any) => (
                        <span
                          key={st.id}
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] border font-mono",
                            st.title?.startsWith("Fix & Recover")
                              ? "bg-purple-500/20 text-purple-300 border-purple-500/40 font-semibold"
                              : "bg-surface text-muted-foreground border-border"
                          )}
                        >
                          {st.title} [{st.status}]
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "memory" && (
        <div className="rounded-3xl bg-surface/75 border border-border/90 p-6 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 font-mono">
                <Brain className="w-4 h-4 text-cyan-400" />
                Mission Memory & Episodic Traces
              </h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                Memories synthesized and retrieved during execution of this mission.
              </p>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {missionMemories.length} entries
            </span>
          </div>

          {missionMemories.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground bg-background/40 rounded-2xl border border-border/60">
              No memories recorded for this mission yet.
            </div>
          ) : (
            <div className="space-y-3">
              {missionMemories.map((m) => (
                <div
                  key={m.id}
                  className="bg-background/80 rounded-2xl border border-border/80 p-4 space-y-2 text-xs font-mono"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                        {m.memory_type}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{m.source}</span>
                    </div>
                    <span className="text-[10px] text-amber-400">{"★".repeat(m.importance)}</span>
                  </div>
                  <p className="text-foreground leading-relaxed">{m.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manual Replan Inspector Modal */}
      {replanTargetTask && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-foreground font-mono">Trigger Failure Replanning</h3>
              </div>
              <button
                onClick={() => setReplanTargetTask(null)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualReplanSubmit} className="space-y-4">
              <div className="text-xs text-muted-foreground font-mono">
                Target Task: <span className="text-foreground font-semibold">{replanTargetTask.title}</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-mono">Operator Replan Context / Cause</label>
                <textarea
                  rows={3}
                  value={replanReason}
                  onChange={(e) => setReplanReason(e.target.value)}
                  placeholder="Optional context for failure analyzer..."
                  className="w-full p-3 rounded-xl bg-background border border-border text-xs text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setReplanTargetTask(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-surface border border-border text-muted-foreground hover:text-foreground text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReplanning}
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                >
                  {isReplanning ? "Replanning..." : "Execute Replan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Event Stream Section */}
      {liveMissionEvents.length > 0 && (
        <div className="rounded-3xl bg-surface/75 border border-border/90 p-6 backdrop-blur-xl shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 font-mono">
              <Activity className="w-4 h-4 text-cyan-400" />
              Live Mission Event Stream
            </h3>
            <span className="text-[10px] font-mono text-muted-foreground">
              {liveMissionEvents.length} events received
            </span>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {liveMissionEvents.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between text-xs font-mono p-2.5 rounded-xl bg-background/80 border border-border/80"
              >
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 font-semibold">{ev.event_type}</span>
                  <span className="text-[10px] text-muted-foreground">#{ev.sequence_number}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground text-[10px]">
                  <span>{ev.source}</span>
                  <span>{new Date(ev.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interlocking Task Inspection Docket */}
      <Docket />
    </div>
  );
}
