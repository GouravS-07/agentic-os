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
  Bot,
  Activity,
  ShieldAlert,
  ListTodo,
  CheckCircle2,
  Clock,
  Zap,
  Terminal,
  Brain,
  Cpu,
  Play,
} from "lucide-react";
import { Mission, Task } from "@/types";
import { useWebSocket } from "@/lib/useWebSocket";
import { EventItem } from "@/lib/events";
import { AICoreSphere, AICoreState } from "@/components/core/AICoreSphere";
import { useSceneStore } from "@/scene/state/useSceneStore";
import { SceneAdapter } from "@/scene/adapters/SceneAdapter";
import { cn } from "@/lib/utils";

const QUICK_DIRECTIVES = [
  "Build a portfolio website from my GitHub repositories and deploy",
  "Perform automated security audit and scan repository for vulnerabilities",
  "Analyze codebase architecture and generate technical documentation",
];

const AGENT_FLEET = [
  {
    role: "PLANNER",
    name: "Mission Planner",
    desc: "Decomposes unstructured intent into validated dependency DAGs.",
    status: "ONLINE",
    color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
  },
  {
    role: "CODER",
    name: "Code Synthesizer",
    desc: "Writes, refactors, and tests code within isolated sandboxes.",
    status: "ONLINE",
    color: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  },
  {
    role: "AUDITOR",
    name: "Security Gate",
    desc: "Enforces strict tool access control and human approval gates.",
    status: "ONLINE",
    color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  },
  {
    role: "RESEARCHER",
    name: "Knowledge Agent",
    desc: "Retrieves context from episodic memory and vector stores.",
    status: "ONLINE",
    color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  },
];

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
        setGoalInput("");
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

  const runningTasksCount = tasks.filter((t) => t.status === "RUNNING").length;
  const completedTasksCount = tasks.filter((t) => t.status === "COMPLETED").length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 text-foreground pb-16">
      {/* 1. Header & Telemetry Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]" />
              <span>Agentic OS</span>
            </h1>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              AUTONOMOUS COMMAND CENTER
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            Deterministic DAG orchestration, multi-agent synthesis, and autonomous graph replanning.
          </p>
        </div>

        {/* Global Action Buttons */}
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
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>{isDemoRunning ? "Running Demo..." : "Run Complete Demo Loop"}</span>
          </button>
        </div>
      </div>

      {/* 2. System Status KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
        <div className="p-4 rounded-2xl bg-surface/60 border border-border/80 backdrop-blur-md space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>ACTIVE MISSIONS</span>
            <GitBranch className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-foreground">{safeMissions.length}</div>
          <div className="text-[10px] text-cyan-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>{safeMissions.filter((m) => m.status === "RUNNING").length} IN FLIGHT</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface/60 border border-border/80 backdrop-blur-md space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>EXECUTED TASKS</span>
            <ListTodo className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-foreground">{tasks.length}</div>
          <div className="text-[10px] text-purple-400">
            {completedTasksCount} COMPLETED • {runningTasksCount} RUNNING
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface/60 border border-border/80 backdrop-blur-md space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>HITL APPROVALS</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-foreground">{approvals.length}</div>
          <div className="text-[10px] text-amber-400">
            {approvals.length > 0 ? "ACTION REQUIRED" : "GATES CLEAR"}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface/60 border border-border/80 backdrop-blur-md space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>AGENT FLEET</span>
            <Bot className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-foreground">5 / 5</div>
          <div className="text-[10px] text-emerald-400">ONLINE • READY</div>
        </div>
      </div>

      {/* 3. Global Directive Synthesis Terminal */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface/80 border border-border/90 backdrop-blur-xl shadow-2xl relative overflow-hidden space-y-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono tracking-wider text-cyan-400 uppercase">
            <Terminal className="w-4 h-4" />
            <span>Autonomous Directive Engine</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
            What goal should the agent fleet execute?
          </h2>
        </div>

        <form onSubmit={handleCreateMissionFromGoal} className="space-y-4">
          <div className="relative flex items-center">
            <input
              type="text"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              disabled={isSubmitting}
              placeholder="Assign high-level intent... (e.g. 'Build and deploy full-stack telemetry service')"
              className="w-full bg-background/90 border border-border/90 rounded-2xl px-5 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-mono transition-all pr-36 shadow-inner"
            />
            <button
              type="submit"
              disabled={isSubmitting || !goalInput.trim()}
              className="absolute right-2 px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-all flex items-center gap-2 disabled:opacity-30 shadow-md shadow-primary/25"
            >
              {isSubmitting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <span>DISPATCH</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {/* Suggested Directives */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[10px] font-mono uppercase text-muted-foreground mr-1">
              Suggestions:
            </span>
            {QUICK_DIRECTIVES.map((d, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setGoalInput(d)}
                className="text-xs font-mono px-3 py-1 rounded-lg bg-surface-raised/70 hover:bg-surface-raised border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                {d.length > 45 ? `${d.slice(0, 42)}...` : d}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* 4. Active Mission Showcase & AICore */}
      {activeMission && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Mission Overview Card */}
          <div className="lg:col-span-2 p-6 sm:p-8 rounded-3xl bg-surface/70 border border-border/80 backdrop-blur-xl space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-widest uppercase text-cyan-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>TARGET DIRECTIVE</span>
                </span>
                <span
                  className={cn(
                    "text-xs font-mono px-2.5 py-0.5 rounded-full border font-semibold",
                    activeMission.status === "RUNNING"
                      ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                      : activeMission.status === "COMPLETED"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : activeMission.status === "WAITING_APPROVAL"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : "bg-surface-raised text-muted-foreground border-border"
                  )}
                >
                  {activeMission.status}
                </span>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                  {activeMission.title}
                </h3>
                {activeMission.description && (
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed font-mono">
                    {activeMission.description}
                  </p>
                )}
              </div>

              {/* Mission Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono text-muted-foreground">
                  <span>DAG Execution Progress</span>
                  <span className="text-foreground font-semibold">{activeMission.progress || 0}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-raised overflow-hidden border border-border/80">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-cyan-400 transition-all duration-500"
                    style={{ width: `${Math.max(activeMission.progress || 0, 5)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Bottom Metadata & Workspace Link */}
            <div className="pt-4 border-t border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="grid grid-cols-3 gap-6 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-muted-foreground block">PLAN VERSION</span>
                  <span className="text-foreground font-semibold">v{activeMission.plan_version || 1}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">GRAPH HEALING</span>
                  <span className="text-purple-400 font-semibold">{activeMission.replan_count || 0} Replans</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">TASKS</span>
                  <span className="text-foreground font-semibold">{tasks.length} Nodes</span>
                </div>
              </div>

              <Link
                href={`/missions/${activeMission.id}`}
                className="px-5 py-2.5 rounded-xl bg-surface-raised hover:bg-surface border border-border text-xs font-semibold text-foreground flex items-center justify-center gap-2 transition-all group shrink-0"
              >
                <span>OPEN WORKSPACE DAG</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-cyan-400" />
              </Link>
            </div>
          </div>

          {/* Interactive AI Core Sphere Visualizer Card */}
          <div className="p-6 rounded-3xl bg-surface/70 border border-border/80 backdrop-blur-xl flex flex-col items-center justify-center text-center space-y-3 relative overflow-hidden">
            <div className="absolute top-4 left-4 text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
              // NEURAL SPATIAL CORE
            </div>
            <div className="py-2">
              <AICoreSphere state={coreState} size={150} sublabel={`CORE • ${coreState}`} />
            </div>
            <div className="space-y-1 font-mono">
              <div className="text-xs text-foreground font-semibold uppercase tracking-wider">
                RUNTIME STATE: <span className="text-cyan-400">{coreState}</span>
              </div>
              <p className="text-[10px] text-muted-foreground max-w-xs">
                Active neural synthesis & deterministic graph orchestration
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 5. Autonomous Fleet Roster */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-foreground font-mono flex items-center gap-2">
              <Bot className="w-4 h-4 text-cyan-400" />
              <span>Autonomous Agent Fleet</span>
            </h3>
            <p className="text-xs text-muted-foreground font-mono">
              Specialized domain agents executing in parallel sandboxes
            </p>
          </div>
          <Link
            href="/agents"
            className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <span>View All Agents</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {AGENT_FLEET.map((ag) => (
            <div
              key={ag.role}
              className="p-5 rounded-2xl bg-surface/60 border border-border/80 backdrop-blur-md space-y-2.5 hover:border-border transition-all"
            >
              <div className="flex items-center justify-between">
                <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded border font-semibold", ag.color)}>
                  {ag.role}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>ONLINE</span>
                </span>
              </div>
              <h4 className="text-sm font-semibold text-foreground">{ag.name}</h4>
              <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                {ag.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Live Activity Stream & Recent Missions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Missions */}
        <div className="p-6 rounded-3xl bg-surface/70 border border-border/80 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-mono text-foreground flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-purple-400" />
              <span>Recent Execution Missions</span>
            </h3>
            <Link
              href="/missions"
              className="text-xs font-mono text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <span>Explore</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {safeMissions.slice(0, 4).map((m) => (
              <Link
                key={m.id}
                href={`/missions/${m.id}`}
                className="p-3.5 rounded-xl bg-surface-raised/60 hover:bg-surface-raised border border-border/80 flex items-center justify-between transition-all group"
              >
                <div className="space-y-1 min-w-0 pr-3">
                  <div className="text-xs font-semibold text-foreground truncate group-hover:text-cyan-400 transition-colors">
                    {m.title}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground">
                    PLAN v{m.plan_version || 1} • {m.replan_count || 0} REPLANS
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={cn(
                      "text-[10px] font-mono px-2 py-0.5 rounded border font-semibold",
                      m.status === "RUNNING"
                        ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                        : m.status === "COMPLETED"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-surface text-muted-foreground border-border"
                    )}
                  >
                    {m.status}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Live Domain Event Feed */}
        <div className="p-6 rounded-3xl bg-surface/70 border border-border/80 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-mono text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Live System Event Stream</span>
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>WS LIVE</span>
            </span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1 font-mono">
            {liveEvents.length > 0 ? (
              liveEvents.slice(0, 6).map((ev, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-surface-raised/40 border border-border/60 text-xs flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-cyan-400 shrink-0">
                      {ev.event_type}
                    </span>
                    <span className="text-[11px] text-muted-foreground truncate">
                      {ev.payload?.message || ev.payload?.title || ev.payload?.reason || JSON.stringify(ev.payload || {})}
                    </span>
                  </div>
                  <span className="text-[9px] text-muted-foreground shrink-0">
                    {new Date(ev.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
                Listening for real-time WebSocket domain events...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
