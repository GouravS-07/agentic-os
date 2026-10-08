"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Zap,
  Play,
  RefreshCw,
  Layers,
  ShieldAlert,
  Bot,
  Compass,
  GitBranch,
  Activity,
  X,
  ExternalLink,
  Focus,
} from "lucide-react";
import { useSceneStore } from "@/scene/state/useSceneStore";
import { cn } from "@/lib/utils";

interface SpatialHeroHUDProps {
  onRunDemo?: () => Promise<void>;
  onSeed?: () => Promise<void>;
  isDemoRunning?: boolean;
  isSeeding?: boolean;
}

export const SpatialHeroHUD: React.FC<SpatialHeroHUDProps> = ({
  onRunDemo,
  onSeed,
  isDemoRunning = false,
  isSeeding = false,
}) => {
  const router = useRouter();
  const [directiveInput, setDirectiveInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    telemetry,
    selectedEntity,
    selectEntity,
    activeMission,
    is3DEnabled,
  } = useSceneStore();

  const handleDispatchDirective = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = directiveInput.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmed.length > 50 ? `${trimmed.slice(0, 47)}...` : trimmed,
          description: trimmed,
          priority: 2,
        }),
      });

      if (res.ok) {
        const mission = await res.json();
        await fetch(`/api/v1/missions/${mission.id}/plan`, { method: "POST" });
        setDirectiveInput("");
        router.push(`/missions/${mission.id}`);
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to initialize mission.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar / Hero Typography */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono font-medium tracking-wide">
              SPATIAL OPERATING SYSTEM
            </span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
            </span>
            <span className="text-xs font-mono text-muted-foreground uppercase">
              STATUS: <strong className="text-cyan-400">{telemetry.coreState}</strong>
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground font-mono">
            Autonomous Command Fleet
          </h1>
          <p className="text-xs text-muted-foreground font-mono max-w-2xl">
            Real-time neural agent synthesis • Dynamic 3D DAG orchestration • Cryptographic safety boundaries
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {onSeed && (
            <button
              onClick={onSeed}
              disabled={isSeeding}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface/70 border border-border/80 text-xs text-muted-foreground hover:text-foreground font-mono transition-all backdrop-blur-xl hover:bg-surface-raised disabled:opacity-50"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isSeeding ? "Seeding..." : "Seed State"}</span>
            </button>
          )}

          {onRunDemo && (
            <button
              onClick={onRunDemo}
              disabled={isDemoRunning}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary via-purple-600 to-indigo-600 hover:from-primary-hover hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-primary/25 transition-all disabled:opacity-50"
            >
              {isDemoRunning ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              )}
              <span>Run Complete Demo Loop</span>
            </button>
          )}
        </div>
      </div>

      {/* Futuristic Directive Dispatch Glass Bar */}
      <div className="relative rounded-2xl bg-surface/60 border border-border/80 p-4 sm:p-5 backdrop-blur-2xl shadow-2xl space-y-3 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-semibold uppercase">
            <Zap className="w-4 h-4" />
            <span>Autonomous Goal Directive Dispatch</span>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground hidden md:inline">
            Natural Language → Recursive DAG Decomposition
          </span>
        </div>

        <form onSubmit={handleDispatchDirective} className="flex gap-2">
          <input
            type="text"
            value={directiveInput}
            onChange={(e) => setDirectiveInput(e.target.value)}
            disabled={isSubmitting}
            placeholder="Assign autonomous goal... (e.g. 'Audit security vulnerabilities, generate patches, and run integration tests')"
            className="flex-1 bg-background/90 border border-border/80 rounded-xl px-4 py-3 text-xs text-foreground font-mono placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
          <button
            type="submit"
            disabled={isSubmitting || !directiveInput.trim()}
            className="px-5 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-all flex items-center gap-2 disabled:opacity-50 shadow-md shadow-primary/20 shrink-0"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            <span>Decompose & Execute</span>
          </button>
        </form>
      </div>

      {/* Spatial Telemetry Glass Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-2xl bg-surface/50 border border-border/70 p-3.5 space-y-1 backdrop-blur-xl hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-mono">AGENT FLEET</span>
            <Bot className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-foreground font-mono">5 Active</div>
          <p className="text-[10px] font-mono text-muted-foreground">Planner • Coder • Auditor</p>
        </div>

        <div className="rounded-2xl bg-surface/50 border border-border/70 p-3.5 space-y-1 backdrop-blur-xl hover:border-primary/40 transition-all">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-mono">RUNNING MISSIONS</span>
            <Compass className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="text-xl font-bold text-foreground font-mono">
            {telemetry.activeMissionsCount} Active
          </div>
          <p className="text-[10px] font-mono text-emerald-400">
            {telemetry.runningTasksCount} tasks in progress
          </p>
        </div>

        <div className="rounded-2xl bg-surface/50 border border-border/70 p-3.5 space-y-1 backdrop-blur-xl hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-mono">AUTONOMOUS REPLANS</span>
            <GitBranch className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-foreground font-mono">
            {telemetry.replansCount} Rewired
          </div>
          <p className="text-[10px] font-mono text-purple-400">Dynamic graph healing</p>
        </div>

        <div className="rounded-2xl bg-surface/50 border border-border/70 p-3.5 space-y-1 backdrop-blur-xl hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] font-mono">HITL SECURITY GATE</span>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-foreground font-mono">
            {telemetry.pendingApprovalsCount} Blocked
          </div>
          <p className="text-[10px] font-mono text-amber-400/90">Human confirmation required</p>
        </div>
      </div>

      {/* Selected 3D Entity Inspector Floating Card */}
      {selectedEntity && (
        <div className="rounded-2xl bg-surface/90 border border-cyan-500/50 p-4 shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center justify-between border-b border-border/80 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <Focus className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold text-foreground">
                SPATIAL INSPECTOR: {selectedEntity.type}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                {selectedEntity.id}
              </span>
            </div>
            <button
              onClick={() => selectEntity(null)}
              className="p-1 rounded-lg hover:bg-surface-raised text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div>
              <p className="text-foreground font-semibold">
                {selectedEntity.data?.title || selectedEntity.data?.name || "Selected Spatial Node"}
              </p>
              <p className="text-muted-foreground text-[11px]">
                Status: <span className="text-cyan-400">{selectedEntity.data?.status || "ACTIVE"}</span>
              </p>
            </div>

            {selectedEntity.type === "MISSION" && (
              <Link
                href={`/missions/${selectedEntity.id}`}
                className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white flex items-center gap-1.5 transition-all text-xs"
              >
                <span>Open Mission Workspace</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
            {selectedEntity.type === "TASK" && activeMission && (
              <Link
                href={`/missions/${activeMission.id}`}
                className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white flex items-center gap-1.5 transition-all text-xs"
              >
                <span>View Task in Mission DAG</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
