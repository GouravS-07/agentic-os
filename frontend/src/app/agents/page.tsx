"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bot,
  Sparkles,
  CheckCircle2,
  Clock,
  Wrench,
  Shield,
  ArrowRight,
  Cpu,
  RefreshCw,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentItem {
  id: string;
  name: string;
  type: string;
  description: string;
  capabilities: string[];
  allowed_tools: string[];
  status: string;
  is_implemented: boolean;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = async () => {
    setLoading(true);
    fetch("/api/v1/agents")
      .then((res) => res.json())
      .then((data) => setAgents(Array.isArray(data) ? data : (data.items || [])))
      .catch((err) => console.error("Failed to load agents:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground font-mono flex items-center gap-2">
                <span>Autonomous Agent Fleet</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-normal">
                  {agents.length} Entities
                </span>
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                Specialized autonomous agents operating within deterministic execution boundaries
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchAgents}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface/80 border border-border/80 text-xs font-mono text-muted-foreground hover:text-foreground transition-all"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          <span>Refresh Fleet</span>
        </button>
      </div>

      {loading ? (
        <div className="p-16 text-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
          <p className="text-xs font-mono text-muted-foreground">Scanning agent fleet registry...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {agents.map((agent) => (
            <Link
              key={agent.id}
              href={`/agents/${agent.id}`}
              className="group relative rounded-3xl bg-surface/75 hover:bg-surface-raised border border-border/80 hover:border-cyan-500/50 p-6 transition-all duration-300 flex flex-col justify-between space-y-4 backdrop-blur-xl shadow-xl"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 via-purple-500/20 to-cyan-500/20 border border-border/80 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                    <Cpu className="w-5 h-5" />
                  </div>
                  {agent.is_implemented ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      OPERATIONAL
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-surface-raised border border-border text-muted-foreground">
                      REGISTERED
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-base font-bold text-foreground group-hover:text-cyan-300 transition-colors font-mono">
                    {agent.name}
                  </h3>
                  <span className="text-[11px] font-mono text-cyan-400 block mt-0.5 font-semibold">
                    ROLE: {agent.type}
                  </span>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-3 font-mono leading-relaxed">
                    {agent.description}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-border/60 space-y-2">
                <div className="text-[10px] font-mono text-muted-foreground uppercase">
                  Capabilities:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {agent.capabilities.slice(0, 3).map((cap, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-background/80 border border-border/80 text-muted-foreground"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
