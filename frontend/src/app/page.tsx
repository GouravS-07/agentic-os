"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Sparkles,
  RefreshCw,
  GitBranch,
  Layers,
  ChevronDown,
} from "lucide-react";
import { Mission, Task } from "@/types";
import { useWebSocket } from "@/lib/useWebSocket";
import { EventItem } from "@/lib/events";
import { AICoreSphere, AICoreState } from "@/components/core/AICoreSphere";
import { useSceneStore } from "@/scene/state/useSceneStore";
import { SceneAdapter } from "@/scene/adapters/SceneAdapter";
import { cn } from "@/lib/utils";
import { evaluateWorldMode } from "@/world/config";
import { WorldShell } from "@/world/ui/WorldShell";

export default function HomePage() {
  const router = useRouter();
  const [goalInput, setGoalInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [liveEvents, setLiveEvents] = useState<EventItem[]>([]);
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isWorldMode, setIsWorldMode] = useState(false);

  useEffect(() => {
    setIsWorldMode(evaluateWorldMode());
  }, []);

  const is3DEnabled = useSceneStore((s) => s.is3DEnabled);

  const loadData = useCallback(async () => {
    try {
      const [mRes, aRes, tRes] = await Promise.all([
        fetch("/api/v1/missions"),
        fetch("/api/v1/approvals?status=PENDING"),
        fetch("/api/v1/tasks"),
      ]);
      let mList: Mission[] = [];
      let aList: any[] = [];
      let tList: Task[] = [];

      if (mRes.ok) {
        const mData = await mRes.json();
        mList = Array.isArray(mData) ? mData : (mData.items || []);
        setMissions(mList);
      }
      if (aRes.ok) {
        const aData = await aRes.json();
        aList = Array.isArray(aData) ? aData : (aData.items || []);
        setApprovals(aList);
      }
      if (tRes.ok) {
        const tData = await tRes.json();
        tList = Array.isArray(tData) ? tData : (tData.items || []);
        setTasks(tList);
      }

      SceneAdapter.syncHomeData(mList, tList, aList, []);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // WebSocket Live Domain Stream
  const handleLiveEvent = useCallback(
    (ev: EventItem) => {
      setLiveEvents((prev) => [ev, ...prev].slice(0, 15));
      if (
        ev.event_type.startsWith("MISSION_") ||
        ev.event_type.startsWith("TASK_") ||
        ev.event_type.startsWith("APPROVAL_") ||
        ev.event_type.startsWith("REPLAN_")
      ) {
        loadData();
      }
    },
    [loadData]
  );

  useWebSocket({
    channel: "system",
    onEvent: handleLiveEvent,
    enableReplaySync: true,
  });

  const handleCreateMissionFromGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = goalInput.trim();
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
        router.push(`/missions/${mission.id}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRunDemoScenario = async () => {
    setIsDemoRunning(true);
    try {
      const res = await fetch("/api/v1/demo/scenarios/complete-loop", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        await loadData();
        router.push(`/missions/${data.mission.id}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDemoRunning(false);
    }
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch("/api/v1/demo/seed", { method: "POST" });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSeeding(false);
    }
  };

  const safeMissions = Array.isArray(missions) ? missions : [];
  const activeMission =
    safeMissions.find(
      (m) =>
        m.status === "RUNNING" ||
        m.status === "WAITING_APPROVAL" ||
        m.status === "PLANNING"
    ) || safeMissions[0];

  let coreState: AICoreState = "IDLE";
  if (isDemoRunning || isSubmitting) coreState = "PLANNING";
  else if (activeMission) {
    if (activeMission.status === "RUNNING") coreState = "RUNNING";
    else if (activeMission.status === "WAITING_APPROVAL") coreState = "WAITING_APPROVAL";
    else if (activeMission.status === "PLANNING") coreState = "PLANNING";
    else if (activeMission.status === "COMPLETED") coreState = "COMPLETED";
    else if (activeMission.replan_count && activeMission.replan_count > 0) coreState = "RECOVERING";
  }

  // ----------------------------------------------------
  // INTERLOCKING WORLD MODE (Milestone M1+)
  // ----------------------------------------------------
  if (isWorldMode) {
    return <WorldShell />;
  }

  // ----------------------------------------------------
  // 3D EXPERIMENTAL EDITORIAL HOME (basement/Vela style)
  // ----------------------------------------------------
  if (is3DEnabled) {
    return (
      <div className="relative text-white font-sans selection:bg-white selection:text-black">
        {/* ==================================================== */}
        {/* SECTION 1: THE MONOLITH (95% Pure Spatial Scene)     */}
        {/* ==================================================== */}
        <section className="relative h-screen w-full flex flex-col justify-between px-8 sm:px-14 pt-28 pb-12 pointer-events-none select-none">
          {/* Top Editorial Wordmark Layer */}
          <div className="flex items-start justify-between z-20">
            <div className="space-y-1.5">
              <h1 className="text-4xl sm:text-7xl font-extralight tracking-[-0.04em] leading-none uppercase font-sans text-white/90">
                Agentic
              </h1>
              <p className="text-[11px] font-mono tracking-[0.3em] uppercase text-zinc-400">
                An Operating System for Autonomous Machines
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <span className="text-[10px] font-mono tracking-[0.25em] text-zinc-400 uppercase block">
                CORE SYSTEM // 01
              </span>
              <span className="text-xs font-mono text-zinc-300">
                {activeMission ? `MISSION ${activeMission.id.slice(0, 6)}` : "STANDBY"}
              </span>
            </div>
          </div>

          {/* Bottom Huge Typography & Minimal Scroll Cue */}
          <div className="flex items-end justify-between z-20 pb-4">
            <div className="max-w-xs text-[11px] font-mono text-zinc-400 leading-relaxed hidden md:block">
              Continuous neural synthesis, deterministic DAG execution, and self-healing graph replanning.
            </div>

            <a
              href="#directives-section"
              className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] font-mono text-zinc-300 hover:text-white transition-all pointer-events-auto cursor-pointer shadow-2xl backdrop-blur-md"
            >
              <span>EXPLORE THE RUNTIME</span>
              <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
            </a>

            <div className="text-right">
              <span className="text-6xl sm:text-9xl font-black tracking-[-0.05em] leading-none text-white/10 font-mono block">
                OS
              </span>
            </div>
          </div>
        </section>

        {/* ==================================================== */}
        {/* SECTION 2: THE DIRECTIVE ENGINE (Scroll Reveal)     */}
        {/* ==================================================== */}
        <section
          id="directives-section"
          className="relative min-h-screen flex flex-col justify-center px-6 sm:px-16 py-32 z-20 pointer-events-auto"
        >
          <div className="max-w-4xl mx-auto w-full space-y-12">
            <div className="space-y-3">
              <span className="text-[11px] font-mono tracking-[0.35em] text-zinc-400 uppercase font-semibold">
                // 02 DIRECTIVE SYNTHESIS
              </span>
              <h2 className="text-4xl sm:text-6xl font-light tracking-tight text-white">
                What should we build?
              </h2>
            </div>

            {/* Restrained Typographic Input */}
            <form onSubmit={handleCreateMissionFromGoal} className="space-y-6">
              <div className="relative border-b-2 border-white/20 focus-within:border-white transition-colors pb-3">
                <input
                  type="text"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Assign high-level intent..."
                  className="w-full bg-transparent text-xl sm:text-3xl text-white font-light placeholder:text-zinc-600 focus:outline-none font-sans"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !goalInput.trim()}
                  className="absolute right-0 bottom-3 px-6 py-2 rounded-full bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all flex items-center gap-2 disabled:opacity-20 shadow-xl"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>INITIALIZE</span>
                  )}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Action Pills */}
              <div className="flex items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={handleRunDemoScenario}
                  disabled={isDemoRunning}
                  className="flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors disabled:opacity-40"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>RUN COMPLETE DEMO LOOP →</span>
                </button>

                <span className="text-zinc-600">•</span>

                <button
                  type="button"
                  onClick={handleSeedData}
                  disabled={isSeeding}
                  className="flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors disabled:opacity-40"
                >
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <span>SEED SCENARIO STATE →</span>
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* ==================================================== */}
        {/* SECTION 3: MISSION ARCHITECTURE                      */}
        {/* ==================================================== */}
        <section className="relative min-h-screen flex flex-col justify-center px-6 sm:px-16 py-32 z-20 pointer-events-auto">
          <div className="max-w-4xl mx-auto w-full space-y-8">
            <div className="space-y-3">
              <span className="text-[11px] font-mono tracking-[0.35em] text-zinc-400 uppercase font-semibold">
                // 03 EXECUTION GRAPH
              </span>
              <h2 className="text-4xl sm:text-5xl font-light tracking-tight text-white">
                Active Constellation
              </h2>
            </div>

            {activeMission ? (
              <div className="border border-white/10 rounded-3xl p-8 sm:p-10 space-y-6 bg-black/40 backdrop-blur-xl">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-white/10 pb-6">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-1">
                      DIRECTIVE TARGET
                    </span>
                    <h3 className="text-2xl font-bold text-white tracking-tight">{activeMission.title}</h3>
                  </div>
                  <Link
                    href={`/missions/${activeMission.id}`}
                    className="text-xs font-mono text-zinc-300 hover:text-white underline underline-offset-8 flex items-center gap-1.5"
                  >
                    <span>ENTER WORKSPACE</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-xs font-mono pt-2">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase block mb-1">STATUS</span>
                    <span className="text-white font-semibold">{activeMission.status}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase block mb-1">PLAN VERSION</span>
                    <span className="text-zinc-200">v{activeMission.plan_version || 1}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase block mb-1">GRAPH HEALING</span>
                    <span className="text-zinc-200">{activeMission.replan_count || 0} Replans</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase block mb-1">PROGRESS</span>
                    <span className="text-white font-semibold">{activeMission.progress}%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-xs font-mono text-zinc-500 border border-white/5 rounded-3xl">
                No mission currently active. Dispatch a directive to synthesize graph.
              </div>
            )}
          </div>
        </section>

        {/* ==================================================== */}
        {/* SECTION 4: AGENT ROSTER                              */}
        {/* ==================================================== */}
        <section className="relative min-h-screen flex flex-col justify-center px-6 sm:px-16 py-32 z-20 pointer-events-auto pb-44">
          <div className="max-w-4xl mx-auto w-full space-y-8">
            <div className="space-y-3">
              <span className="text-[11px] font-mono tracking-[0.35em] text-zinc-400 uppercase font-semibold">
                // 04 AUTONOMOUS FLEET
              </span>
              <h2 className="text-4xl sm:text-5xl font-light tracking-tight text-white">
                Specialized Agents
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { role: "PLANNER", title: "Mission Planner", desc: "Decomposes unstructured intent into validated dependency DAGs." },
                { role: "CODER", title: "Code Synthesizer", desc: "Writes, refactors, and tests code within isolated sandboxes." },
                { role: "AUDITOR", title: "Security Gate", desc: "Enforces strict tool access control and human approval gates." },
                { role: "RESEARCHER", title: "Knowledge Agent", desc: "Retrieves context from cross-session episodic & vector memory." },
              ].map((ag) => (
                <div
                  key={ag.role}
                  className="p-6 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md space-y-2 hover:border-white/25 transition-all"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                    <span>{ag.role}</span>
                    <span>ONLINE</span>
                  </div>
                  <h4 className="text-base font-semibold text-white">{ag.title}</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">{ag.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ----------------------------------------------------
  // 2D DASHBOARD FALLBACK MODE (When 3D is OFF)
  // ----------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto space-y-8 text-foreground">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono flex items-center gap-2">
            <span>Agentic OS</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              2D COMMAND CENTER
            </span>
          </h1>
          <p className="text-xs text-muted-foreground font-mono">
            Autonomous multi-agent orchestration, dynamic DAG replanning, and cryptographic tool security.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSeedData}
            disabled={isSeeding}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface/80 border border-border text-xs text-muted-foreground hover:text-foreground font-mono transition-all disabled:opacity-50"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isSeeding ? "Seeding..." : "Seed State"}</span>
          </button>
          <button
            onClick={handleRunDemoScenario}
            disabled={isDemoRunning}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-all disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>Run Demo Loop</span>
          </button>
        </div>
      </div>

      {activeMission && (
        <div className="p-6 rounded-3xl bg-surface border border-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold">{activeMission.title}</h3>
            <Link
              href={`/missions/${activeMission.id}`}
              className="px-4 py-2 rounded-xl bg-surface-raised border border-border text-xs font-semibold flex items-center gap-1.5"
            >
              <span>Open Mission</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="flex justify-center py-4">
            <AICoreSphere state={coreState} size={160} sublabel={`CORE • ${coreState}`} />
          </div>
        </div>
      )}
    </div>
  );
}
