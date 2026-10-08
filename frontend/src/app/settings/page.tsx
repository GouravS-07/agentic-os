"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  ShieldCheck,
  Bot,
  Brain,
  Database,
  Cpu,
  Lock,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Server,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/health")
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch((err) => console.error("Health check error:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground font-mono flex items-center gap-2">
                <span>System Architecture & Policy Settings</span>
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                Configure Agent Runtimes, Safety Guards, Vector Embeddings, and System Policies
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface/80 border border-border/80 text-xs font-mono text-muted-foreground">
          <Server className="w-3.5 h-3.5 text-emerald-400" />
          <span>Status: <strong className="text-emerald-400">{health?.status === "healthy" ? "Healthy" : "Operational"}</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Agent & Model Provider Configuration */}
        <div className="rounded-3xl bg-surface/75 border border-border/90 p-6 space-y-4 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-2.5 border-b border-border/80 pb-3">
            <Bot className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-foreground font-mono">
              LLM & Agent Runtime Configuration
            </h2>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="space-y-1">
              <label className="text-muted-foreground">Active LLM Provider</label>
              <input
                type="text"
                disabled
                value="Claude 3.5 Sonnet / OpenAI / Gemini / Mock Developer Fallback"
                className="w-full p-3 rounded-xl bg-background/80 border border-border/80 text-foreground text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground">Default Model Engine</label>
              <input
                type="text"
                disabled
                value="claude-3-5-sonnet-20241022"
                className="w-full p-3 rounded-xl bg-background/80 border border-border/80 text-foreground text-xs font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-muted-foreground">Max Execution Timeout</label>
                <div className="p-2.5 rounded-xl bg-background/80 border border-border/80 text-foreground">60 Seconds</div>
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground">Max Output Buffer</label>
                <div className="p-2.5 rounded-xl bg-background/80 border border-border/80 text-foreground">512 KB</div>
              </div>
            </div>
          </div>
        </div>

        {/* Safety & Permission Guard Policies */}
        <div className="rounded-3xl bg-surface/75 border border-border/90 p-6 space-y-4 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-2.5 border-b border-border/80 pb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-foreground font-mono">
              Permission Guard & HITL Safety Policies
            </h2>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex items-center justify-between p-3 rounded-xl bg-background/80 border border-border/80">
              <span>LOW Risk Tools (Read-Only)</span>
              <span className="text-emerald-400 font-bold">AUTO-APPROVE</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-background/80 border border-border/80">
              <span>MEDIUM Risk Tools (File Writes)</span>
              <span className="text-amber-400 font-bold">REQUIRE APPROVAL</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-background/80 border border-border/80">
              <span>HIGH Risk Tools (Terminal Exec)</span>
              <span className="text-amber-400 font-bold">REQUIRE APPROVAL</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-background/80 border border-border/80">
              <span>CRITICAL Risk Actions (Destructive)</span>
              <span className="text-rose-400 font-bold">ALWAYS BLOCKED</span>
            </div>
          </div>
        </div>

        {/* Memory & Embedding Configuration */}
        <div className="rounded-3xl bg-surface/75 border border-border/90 p-6 space-y-4 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-2.5 border-b border-border/80 pb-3">
            <Brain className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-bold text-foreground font-mono">
              Memory & Vector Embeddings
            </h2>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="space-y-1">
              <label className="text-muted-foreground">Embedding Provider</label>
              <div className="p-3 rounded-xl bg-background/80 border border-border/80 text-foreground flex items-center justify-between">
                <span>Mock / OpenAI / Gemini / Ollama</span>
                <span className="text-purple-400 font-bold">1536-dim</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground">Multi-Factor Hybrid Formula</label>
              <div className="p-3 rounded-xl bg-background/80 border border-border/80 text-[11px] text-muted-foreground leading-relaxed">
                Relevance = 0.50·Sim + 0.20·Recency + 0.15·Importance + 0.15·MissionMatch
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-muted-foreground">Max Replans Per Mission</label>
                <div className="p-2.5 rounded-xl bg-background/80 border border-border/80 text-foreground">5 Limit</div>
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground">Max Task Retries</label>
                <div className="p-2.5 rounded-xl bg-background/80 border border-border/80 text-foreground">3 Limit</div>
              </div>
            </div>
          </div>
        </div>

        {/* Database & Infrastructure Status */}
        <div className="rounded-3xl bg-surface/75 border border-border/90 p-6 space-y-4 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-2.5 border-b border-border/80 pb-3">
            <Database className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-foreground font-mono">
              Database & Subsystem Health
            </h2>
          </div>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="flex items-center justify-between p-3 rounded-xl bg-background/80 border border-border/80">
              <span>Database Engine</span>
              <span className="text-cyan-400 font-bold">SQLite / PostgreSQL + pgvector</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-background/80 border border-border/80">
              <span>Event Bus Architecture</span>
              <span className="text-emerald-400 font-bold">In-Memory Async / Redis Ready</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-background/80 border border-border/80">
              <span>WebSocket Gateway</span>
              <span className="text-emerald-400 font-bold">Active (/ws/missions, /ws/system)</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-background/80 border border-border/80">
              <span>Workspace Isolation</span>
              <span className="text-foreground">./workspaces</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
