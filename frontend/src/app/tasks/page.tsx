"use client";

import React, { useState, useEffect } from "react";
import {
  ListTodo,
  CheckCircle2,
  Clock,
  Play,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  Bot,
  Compass,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Task, TaskStatus } from "@/types";
import { cn } from "@/lib/utils";

export default function TaskCenterPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [executingTaskId, setExecutingTaskId] = useState<string | null>(null);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : (data.items || []));
      }
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleExecuteTask = async (taskId: string) => {
    setExecutingTaskId(taskId);
    try {
      const res = await fetch(`/api/v1/tasks/${taskId}/execute`, {
        method: "POST",
      });
      if (res.ok) {
        await loadTasks();
      } else {
        const err = await res.json();
        alert(err.detail || "Task execution failed.");
      }
    } catch (err) {
      console.error("Task execution error:", err);
    } finally {
      setExecutingTaskId(null);
    }
  };

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const filteredTasks = safeTasks.filter((t) => {
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <ListTodo className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground font-mono flex items-center gap-2">
                <span>Operational Task Center</span>
                <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  {safeTasks.length} Nodes
                </span>
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                Monitor, inspect, and trigger discrete DAG execution units across all missions
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadTasks}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface/80 border border-border/80 hover:bg-surface-raised text-muted-foreground hover:text-foreground text-xs font-mono transition-all"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          <span>Refresh Tasks</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface/75 p-4 rounded-3xl border border-border/80 backdrop-blur-xl shadow-xl">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {["ALL", "READY", "RUNNING", "WAITING_APPROVAL", "COMPLETED", "FAILED", "PENDING"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-mono transition-all",
                statusFilter === st
                  ? "bg-primary text-white font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-raised"
              )}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter tasks..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-background/80 border border-border/80 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
            <p className="text-xs font-mono text-muted-foreground">Loading operational tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-16 text-center text-xs text-muted-foreground bg-surface/60 rounded-3xl border border-dashed border-border/90 space-y-2 font-mono backdrop-blur-xl">
            <ListTodo className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <h3 className="text-base font-semibold text-foreground">No tasks match the selected criteria</h3>
          </div>
        ) : (
          filteredTasks.map((t) => (
            <div
              key={t.id}
              className="rounded-3xl bg-surface/75 border border-border/80 p-5 shadow-xl backdrop-blur-xl space-y-3 hover:border-border/90 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold border",
                        t.status === "COMPLETED" && "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
                        t.status === "READY" && "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
                        t.status === "RUNNING" && "bg-blue-500/15 text-blue-400 border-blue-500/30 animate-pulse",
                        t.status === "WAITING_APPROVAL" && "bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse",
                        t.status === "FAILED" && "bg-rose-500/15 text-rose-400 border-rose-500/30",
                        t.status === "PENDING" && "bg-surface-raised text-muted-foreground border-border"
                      )}
                    >
                      {t.status}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      ID: {t.id.slice(0, 8)}
                    </span>
                    {t.assigned_agent_id && (
                      <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                        <Bot className="w-3 h-3" />
                        {t.assigned_agent_id}
                      </span>
                    )}
                    {t.retry_count > 0 && (
                      <span className="text-[10px] font-mono text-amber-400">
                        Retries: {t.retry_count}/{t.max_retries}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-foreground font-mono">{t.title}</h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {t.status === "READY" && (
                    <button
                      onClick={() => handleExecuteTask(t.id)}
                      disabled={executingTaskId === t.id}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 font-mono"
                    >
                      {executingTaskId === t.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      )}
                      <span>Execute</span>
                    </button>
                  )}
                  <Link
                    href={`/missions/${t.mission_id}`}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface-raised border border-border hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-mono transition-all"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Mission Control</span>
                  </Link>
                </div>
              </div>

              <p className="text-xs text-muted-foreground font-mono bg-background/60 p-3 rounded-2xl border border-border/70">
                {t.description}
              </p>

              {t.error_message && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs font-mono text-rose-400 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Error Trace:</span>
                  </div>
                  <p>{t.error_message}</p>
                </div>
              )}

              {t.dependencies && t.dependencies.length > 0 && (
                <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground pt-1">
                  <span>Prerequisites:</span>
                  {t.dependencies.map((dep) => (
                    <span key={dep} className="px-2 py-0.5 rounded-lg bg-surface border border-border">
                      {dep.slice(0, 8)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
