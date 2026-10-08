"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Bot,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Wrench,
  Sparkles,
  Terminal,
  Activity,
  AlertCircle,
  RefreshCw,
  Cpu,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentDetail {
  id: string;
  name: string;
  type: string;
  description: string;
  capabilities: string[];
  allowed_tools: string[];
  status: string;
  is_implemented: boolean;
}

interface AgentRun {
  id: string;
  agent_id: string;
  mission_id: string;
  task_id?: string;
  status: string;
  model: string;
  input_context?: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params?.id as string;

  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) return;
    Promise.all([
      fetch(`/api/v1/agents/${agentId}`).then((r) => r.json()),
      fetch(`/api/v1/agents/${agentId}/runs`).then((r) => r.json()),
    ])
      .then(([aData, rData]) => {
        setAgent(aData);
        setRuns(Array.isArray(rData) ? rData : []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [agentId]);

  if (loading) {
    return (
      <div className="p-16 text-center space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
        <p className="text-xs font-mono text-muted-foreground">Loading agent telemetry...</p>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="p-16 text-center space-y-4">
        <h3 className="text-base font-semibold text-foreground font-mono">Agent Not Found</h3>
        <Link href="/agents" className="text-xs text-primary underline font-mono">
          Back to Agent Fleet
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/80 pb-5">
        <Link
          href="/agents"
          className="p-2.5 rounded-xl bg-surface/80 border border-border/80 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-bold text-foreground font-mono">{agent.name}</h2>
            {agent.is_implemented ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold">
                ACTIVE FLEET MEMBER
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-surface-raised border border-border text-muted-foreground">
                REGISTERED
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            Role: {agent.type} • ID: {agent.id}
          </p>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 rounded-3xl bg-surface/75 border border-border/90 p-6 backdrop-blur-xl shadow-xl space-y-4">
          <div>
            <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
              Agent Purpose & Role
            </h4>
            <p className="text-sm text-foreground font-mono leading-relaxed bg-background/60 p-3.5 rounded-2xl border border-border/80">
              {agent.description}
            </p>
          </div>

          <div className="pt-3 border-t border-border/60">
            <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
              Capabilities
            </h4>
            <div className="flex flex-wrap gap-2">
              {agent.capabilities.map((cap, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-xl text-xs font-mono bg-surface-raised border border-border text-foreground"
                >
                  {cap}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-border/60">
            <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
              Tool Access Permissions
            </h4>
            <div className="flex flex-wrap gap-2">
              {agent.allowed_tools.length > 0 ? (
                agent.allowed_tools.map((t, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-xl text-xs font-mono bg-cyan-500/10 border border-cyan-500/30 text-cyan-400"
                  >
                    {t}
                  </span>
                ))
              ) : (
                <span className="text-xs font-mono text-muted-foreground">
                  No direct tool execution permitted (Planning only)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className="rounded-3xl bg-surface/75 border border-border/90 p-6 backdrop-blur-xl shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h4 className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Runtime Telemetry
            </h4>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-semibold text-emerald-400 font-mono">
                Ready for Dispatch
              </span>
            </div>
          </div>

          <div className="text-xs font-mono text-muted-foreground space-y-2 pt-3 border-t border-border/60">
            <div className="flex justify-between">
              <span>Total Invocations:</span>
              <strong className="text-foreground">{runs.length}</strong>
            </div>
            <div className="flex justify-between">
              <span>Engine:</span>
              <strong className="text-cyan-400">Deterministic Guard</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Execution Runs History */}
      <div className="rounded-3xl bg-surface/75 border border-border/90 p-6 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-foreground font-mono uppercase">
              Recent Execution Invocations ({runs.length})
            </h3>
          </div>
        </div>

        {runs.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-xs font-mono bg-background/40 rounded-2xl border border-border/60">
            No execution runs recorded for this agent yet.
          </div>
        ) : (
          <div className="space-y-3">
            {runs.map((run) => (
              <div
                key={run.id}
                className="p-4 rounded-2xl bg-background/80 border border-border/80 space-y-2 text-xs font-mono"
              >
                <div className="flex items-center justify-between">
                  <span className="text-foreground font-semibold">
                    Run ID: {run.id.slice(0, 8)}...
                  </span>
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] border",
                      run.status === "COMPLETED" && "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
                      run.status === "FAILED" && "bg-rose-500/15 text-rose-400 border-rose-500/30",
                      run.status !== "COMPLETED" && run.status !== "FAILED" && "bg-primary/15 text-primary border-primary/30"
                    )}
                  >
                    {run.status}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  Mission:{" "}
                  <Link href={`/missions/${run.mission_id}`} className="text-cyan-400 hover:underline">
                    {run.mission_id.slice(0, 8)}
                  </Link>
                  {run.task_id && <span> • Task: {run.task_id.slice(0, 8)}</span>}
                </div>
                {run.output && (
                  <pre className="p-3 rounded-xl bg-background border border-border text-[11px] text-muted-foreground overflow-x-auto max-h-36">
                    {JSON.stringify(run.output, null, 2)}
                  </pre>
                )}
                {run.error && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px]">
                    Error: {run.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
