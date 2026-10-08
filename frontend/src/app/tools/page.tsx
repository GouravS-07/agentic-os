"use client";

import React, { useState, useEffect } from "react";
import {
  Wrench,
  Shield,
  Terminal,
  FolderGit2,
  Search,
  FileCode,
  CheckCircle2,
  ShieldAlert,
  RefreshCw,
  Lock,
} from "lucide-react";
import { RiskLevel } from "@/types";
import { cn } from "@/lib/utils";

interface ToolItem {
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  default_risk: RiskLevel;
  required_permissions: string[];
}

const RISK_BADGES: Record<RiskLevel, { badge: string; text: string }> = {
  LOW: { badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", text: "LOW RISK (AUTO-ALLOWED)" },
  MEDIUM: { badge: "bg-amber-500/15 text-amber-400 border-amber-500/30", text: "MEDIUM RISK (REQUIRES APPROVAL)" },
  HIGH: { badge: "bg-primary/20 text-primary border-primary/30", text: "HIGH RISK (REQUIRES APPROVAL)" },
  CRITICAL: { badge: "bg-rose-500/20 text-rose-400 border-rose-500/30", text: "CRITICAL (BLOCKED BY DEFAULT)" },
};

const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "filesystem.read": FileCode,
  "filesystem.write": FileCode,
  "terminal.execute": Terminal,
  "git.status": FolderGit2,
  "git.diff": FolderGit2,
  "git.log": FolderGit2,
  "git.commit": FolderGit2,
  "search.web": Search,
  "github.mock": FolderGit2,
};

export default function ToolsPage() {
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTools = () => {
    setLoading(true);
    fetch("/api/v1/tools")
      .then((res) => res.json())
      .then((data) => setTools(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Failed to load tools:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTools();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-primary/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground font-mono flex items-center gap-2">
                <span>Sandboxed Tool Registry</span>
                <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  {tools.length} Tools
                </span>
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                Typed, permission-guarded interfaces through which autonomous agents interact with the environment
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchTools}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface/80 border border-border/80 text-xs font-mono text-muted-foreground hover:text-foreground transition-all"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          <span>Refresh Tools</span>
        </button>
      </div>

      {loading ? (
        <div className="p-16 text-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
          <p className="text-xs font-mono text-muted-foreground">Scanning tool registry & permissions...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tools.map((tool) => {
            const Icon = TOOL_ICONS[tool.name] || Wrench;
            const riskConfig = RISK_BADGES[tool.default_risk] || RISK_BADGES.LOW;

            return (
              <div
                key={tool.name}
                className="group relative rounded-3xl bg-surface/75 border border-border/80 hover:border-cyan-500/50 p-6 flex flex-col justify-between space-y-4 shadow-xl backdrop-blur-xl transition-all duration-300"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-surface-raised border border-border flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span
                      className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold border",
                        riskConfig.badge
                      )}
                    >
                      {tool.default_risk}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-foreground font-mono group-hover:text-cyan-300 transition-colors">
                      {tool.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 font-mono leading-relaxed">
                      {tool.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-border/60 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block mb-1">
                      Capabilities:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {tool.capabilities.map((cap, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md text-[10px] bg-background/80 border border-border/80 text-muted-foreground"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase block mb-1">
                      Required Permissions:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {tool.required_permissions.map((perm, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md text-[10px] bg-primary/10 border border-primary/20 text-cyan-400 font-semibold"
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
