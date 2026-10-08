"use client";

import React, { useState } from "react";
import { Task, TaskStatus } from "@/types";
import {
  CheckCircle2,
  Clock,
  Play,
  AlertCircle,
  ShieldAlert,
  Bot,
  Sparkles,
  GitBranch,
  ArrowRight,
  Zap,
  Activity,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DAGVisualizerProps {
  tasks: Task[];
  onTaskAction?: (taskId: string, action: "start" | "complete" | "fail" | "execute") => void;
}

const STATUS_ICONS: Record<TaskStatus, React.ComponentType<{ className?: string }>> = {
  PENDING: Clock,
  READY: Play,
  RUNNING: Activity,
  WAITING_APPROVAL: ShieldAlert,
  COMPLETED: CheckCircle2,
  FAILED: AlertCircle,
  CANCELLED: AlertCircle,
};

const STATUS_CONFIGS: Record<
  TaskStatus,
  { badge: string; border: string; glow: string; bg: string; dot: string }
> = {
  PENDING: {
    badge: "bg-surface-raised text-muted-foreground border-border",
    border: "border-border/80",
    glow: "",
    bg: "bg-surface/70",
    dot: "bg-muted-foreground",
  },
  READY: {
    badge: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    border: "border-cyan-500/40",
    glow: "shadow-[0_0_15px_rgba(6,182,212,0.15)]",
    bg: "bg-surface/80",
    dot: "bg-cyan-400",
  },
  RUNNING: {
    badge: "bg-primary/20 text-primary border-primary/40 animate-pulse",
    border: "border-primary",
    glow: "shadow-[0_0_20px_rgba(99,102,241,0.3)]",
    bg: "bg-surface/90",
    dot: "bg-primary animate-ping",
  },
  WAITING_APPROVAL: {
    badge: "bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse",
    border: "border-amber-500/60",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.25)]",
    bg: "bg-surface/90",
    dot: "bg-amber-400",
  },
  COMPLETED: {
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    border: "border-emerald-500/40",
    glow: "shadow-[0_0_12px_rgba(16,185,129,0.12)]",
    bg: "bg-surface/60",
    dot: "bg-emerald-400",
  },
  FAILED: {
    badge: "bg-rose-500/20 text-rose-400 border-rose-500/40",
    border: "border-rose-500/50",
    glow: "shadow-[0_0_15px_rgba(244,63,94,0.2)]",
    bg: "bg-surface/80",
    dot: "bg-rose-400",
  },
  CANCELLED: {
    badge: "bg-surface-raised text-muted-foreground border-border line-through",
    border: "border-border/60",
    glow: "",
    bg: "bg-surface/40",
    dot: "bg-muted-foreground",
  },
};

export function DAGVisualizer({ tasks, onTaskAction }: DAGVisualizerProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  if (!tasks || tasks.length === 0) {
    return (
      <div className="p-12 border border-dashed border-border/80 rounded-2xl text-center space-y-2 bg-surface/30">
        <GitBranch className="w-8 h-8 text-muted-foreground/40 mx-auto" />
        <p className="text-sm font-mono text-muted-foreground">No tasks scheduled in this DAG yet.</p>
        <p className="text-xs text-muted-foreground/60">Generate an autonomous plan to materialize execution nodes.</p>
      </div>
    );
  }

  // Pre-calculate step mappings and downstream unblocks
  const taskIndexMap = new Map<string, { index: number; title: string }>();
  const unblocksMap = new Map<string, Array<{ id: string; step: number; title: string }>>();

  tasks.forEach((t, i) => {
    taskIndexMap.set(t.id, { index: i + 1, title: t.title });
  });

  tasks.forEach((t, i) => {
    (t.dependencies || []).forEach((depId) => {
      const list = unblocksMap.get(depId) || [];
      list.push({ id: t.id, step: i + 1, title: t.title });
      unblocksMap.set(depId, list);
    });
  });

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  return (
    <div className="space-y-5">
      {/* Visualizer Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground tracking-wide font-mono flex items-center gap-2">
              <span>DIMENSIONAL TASK DAG</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-raised border border-border text-muted-foreground">
                {tasks.length} Nodes
              </span>
            </h4>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" /> Ready
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Running
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Security Gate
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Completed
          </span>
        </div>
      </div>

      {/* Grid of Dimensional Node Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map((task, index) => {
          const Icon = STATUS_ICONS[task.status] || Clock;
          const conf = STATUS_CONFIGS[task.status] || STATUS_CONFIGS.PENDING;
          const unblockedTasks = unblocksMap.get(task.id) || [];
          const isRecovery = task.title.startsWith("Fix & Recover");

          return (
            <div
              key={task.id}
              onClick={() => setSelectedTaskId(task.id === selectedTaskId ? null : task.id)}
              className={cn(
                "group relative border rounded-2xl p-5 transition-all duration-300 flex flex-col justify-between backdrop-blur-xl cursor-pointer select-none",
                conf.bg,
                conf.border,
                conf.glow,
                isRecovery && "border-purple-500/60 shadow-[0_0_20px_rgba(168,85,247,0.2)] bg-purple-950/20",
                selectedTaskId === task.id && "ring-2 ring-primary scale-[1.01]"
              )}
            >
              {/* Background ambient mesh gradient */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

              {/* Task Header */}
              <div className="relative z-10 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono text-muted-foreground bg-surface-raised/80 px-2 py-0.5 rounded-md border border-border">
                      STEP {index + 1}
                    </span>
                    {isRecovery && (
                      <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-md border border-purple-500/40 flex items-center gap-1 font-semibold">
                        <GitBranch className="w-3 h-3" />
                        RECOVERY INJECTION
                      </span>
                    )}
                    {task.assigned_agent_id && (
                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20 flex items-center gap-1">
                        <Bot className="w-3 h-3" />
                        {task.assigned_agent_id}
                      </span>
                    )}
                  </div>

                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border flex items-center gap-1 shrink-0",
                      conf.badge
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {task.status}
                  </span>
                </div>

                <div>
                  <h5 className="text-sm font-semibold text-foreground leading-snug group-hover:text-cyan-300 transition-colors">
                    {task.title}
                  </h5>
                  {task.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 font-sans">
                      {task.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Task Dependencies & Controls */}
              <div className="relative z-10 mt-4 pt-3 border-t border-border/60 space-y-2.5">
                {/* Incoming Prerequisites */}
                <div className="space-y-1">
                  {task.dependencies && task.dependencies.length > 0 ? (
                    <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground overflow-x-auto flex-wrap">
                      <span className="shrink-0 text-muted-foreground/70">Depends on:</span>
                      {task.dependencies.map((depId) => {
                        const depInfo = taskIndexMap.get(depId);
                        return (
                          <span
                            key={depId}
                            title={depInfo ? `Step ${depInfo.index}: ${depInfo.title}` : depId}
                            className="bg-surface-raised border border-border/80 px-1.5 py-0.5 rounded text-[10px] text-cyan-400 flex items-center gap-1"
                          >
                            <span>Step {depInfo ? depInfo.index : depId.slice(0, 4)}</span>
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-[10px] font-mono text-muted-foreground/60 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <span>Root Task (Direct Entry Node)</span>
                    </div>
                  )}
                </div>

                {/* Outgoing Dependents (Unblocks) */}
                {unblockedTasks.length > 0 && (
                  <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground overflow-x-auto flex-wrap">
                    <span className="shrink-0 text-purple-400/80">Unblocks:</span>
                    {unblockedTasks.map((ub) => (
                      <span
                        key={ub.id}
                        title={`Step ${ub.step}: ${ub.title}`}
                        className="bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.5 rounded text-[10px] text-purple-300"
                      >
                        Step {ub.step}
                      </span>
                    ))}
                  </div>
                )}

                {/* Direct Action Controls */}
                {onTaskAction && (
                  <div className="flex items-center gap-2 pt-1">
                    {task.status === "READY" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTaskAction(task.id, "execute");
                        }}
                        className="w-full py-1.5 text-xs font-mono bg-gradient-to-r from-primary to-purple-600 hover:from-primary-hover hover:to-purple-500 text-white rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md shadow-primary/20 font-semibold"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                        <span>Run AI Agent</span>
                      </button>
                    )}
                    {task.status === "RUNNING" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTaskAction(task.id, "complete");
                        }}
                        className="w-full py-1.5 text-xs font-mono bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded-lg transition-colors font-semibold"
                      >
                        Complete Step
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Task Inspector Details */}
      {selectedTask && (
        <div className="mt-4 p-5 rounded-2xl bg-surface/90 border border-primary/40 backdrop-blur-xl shadow-2xl space-y-3 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-bold text-foreground">
                Task Node Inspector: {selectedTask.title}
              </h4>
            </div>
            <button
              onClick={() => setSelectedTaskId(null)}
              className="text-xs font-mono text-muted-foreground hover:text-foreground p-1"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-background/60 border border-border">
              <span className="text-[10px] text-muted-foreground block">STATUS</span>
              <span className="text-foreground font-semibold">{selectedTask.status}</span>
            </div>
            <div className="p-3 rounded-xl bg-background/60 border border-border">
              <span className="text-[10px] text-muted-foreground block">ASSIGNED AGENT</span>
              <span className="text-cyan-400 font-semibold">{selectedTask.assigned_agent_id || "Unassigned"}</span>
            </div>
            <div className="p-3 rounded-xl bg-background/60 border border-border">
              <span className="text-[10px] text-muted-foreground block">TASK ID</span>
              <span className="text-muted-foreground truncate block">{selectedTask.id}</span>
            </div>
          </div>

          {selectedTask.input_data && Object.keys(selectedTask.input_data).length > 0 && (
            <div>
              <span className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">Input Data:</span>
              <pre className="p-3 rounded-xl bg-background/80 border border-border text-[11px] font-mono text-foreground overflow-x-auto">
                {JSON.stringify(selectedTask.input_data, null, 2)}
              </pre>
            </div>
          )}

          {selectedTask.output_data && Object.keys(selectedTask.output_data).length > 0 && (
            <div>
              <span className="text-[10px] font-mono text-muted-foreground uppercase block mb-1">Output Artifacts / Execution Result:</span>
              <pre className="p-3 rounded-xl bg-background/80 border border-border text-[11px] font-mono text-emerald-300 overflow-x-auto">
                {JSON.stringify(selectedTask.output_data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
