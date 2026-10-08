"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Compass,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  GitBranch,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react";
import { Mission, MissionStatus } from "@/types";
import { cn } from "@/lib/utils";

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");

  const fetchMissions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/missions");
      if (res.ok) {
        const data = await res.json();
        setMissions(Array.isArray(data) ? data : (data.items || []));
      }
    } catch (err) {
      console.error("Failed to load missions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMissions();
  }, []);

  const safeMissions = Array.isArray(missions) ? missions : [];
  const filteredMissions = safeMissions.filter((m) => {
    if (filter === "ALL") return true;
    return m.status === filter;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <Compass className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground font-mono flex items-center gap-2">
                <span>Autonomous Mission Registry</span>
                <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-surface-raised border border-border text-muted-foreground">
                  {safeMissions.length} Missions
                </span>
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                Goal-directed orchestration pipelines with dynamic DAG replanning
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchMissions}
            className="p-2.5 rounded-xl bg-surface/80 border border-border/80 text-muted-foreground hover:text-foreground transition-all"
            title="Refresh"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <Link
            href="/missions/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-purple-600 hover:from-primary-hover hover:to-purple-500 text-white text-xs font-semibold shadow-md shadow-primary/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Launch New Mission</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border/70 pb-3 overflow-x-auto">
        {["ALL", "RUNNING", "WAITING_APPROVAL", "COMPLETED", "FAILED", "PLANNING"].map((st) => (
          <button
            key={st}
            onClick={() => setFilter(st)}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all shrink-0",
              filter === st
                ? "bg-surface-raised border border-border text-foreground font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-surface/50"
            )}
          >
            {st} ({st === "ALL" ? safeMissions.length : safeMissions.filter((m) => m.status === st).length})
          </button>
        ))}
      </div>

      {/* Mission List */}
      {loading ? (
        <div className="p-16 text-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
          <p className="text-xs font-mono text-muted-foreground">Loading mission registry...</p>
        </div>
      ) : filteredMissions.length === 0 ? (
        <div className="rounded-3xl bg-surface/60 border border-dashed border-border/90 p-12 text-center space-y-4 backdrop-blur-xl">
          <Compass className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <h3 className="text-base font-semibold text-foreground font-mono">No missions found</h3>
          <p className="text-xs text-muted-foreground font-mono max-w-sm mx-auto">
            Dispatch an autonomous directive to synthesize an executable task graph.
          </p>
          <Link
            href="/missions/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Mission</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMissions.map((mission) => (
            <Link
              key={mission.id}
              href={`/missions/${mission.id}`}
              className="group relative rounded-3xl bg-surface/75 hover:bg-surface-raised border border-border/80 hover:border-primary/50 p-6 transition-all duration-300 space-y-4 backdrop-blur-xl shadow-xl flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
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
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1 font-semibold">
                        <GitBranch className="w-3 h-3" />
                        v{mission.plan_version}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {mission.id.slice(0, 8)}
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-foreground group-hover:text-cyan-300 transition-colors font-mono">
                    {mission.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 font-mono">
                    {mission.description}
                  </p>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-2 pt-3 border-t border-border/60">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-muted-foreground">DAG Progression</span>
                  <span className="text-cyan-400 font-bold">{mission.progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-background rounded-full overflow-hidden border border-border/50">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-primary rounded-full transition-all duration-300"
                    style={{ width: `${mission.progress}%` }}
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
