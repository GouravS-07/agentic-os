"use client";

import React from "react";
import { useWorldStore } from "../state/worldStore";
import { Play, RotateCcw, AlertTriangle, ShieldCheck, CheckCircle2, Clock } from "lucide-react";

export const Docket: React.FC = () => {
  const { activeDocket, closeDocket } = useWorldStore();

  if (!activeDocket) return null;

  const { type, id, title, meta } = activeDocket;
  const status = meta?.status;
  const isRecovery = meta?.is_recovery || meta?.isRecovery;
  const agent = meta?.assigned_agent || meta?.agentType || meta?.agent_id;
  const failureCategory = meta?.failure_category || meta?.error_type;
  const retryCount = meta?.retry_count ?? meta?.attemptCount;
  const dependencies = meta?.dependencies || meta?.depends_on || [];

  return (
    <div className="fixed top-16 right-6 z-40 w-[420px] max-w-[92vw] bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-lg shadow-[0_16px_40px_rgba(0,0,0,0.55)] p-5 select-none animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3.5">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full inline-block ${
              status === "FAILED"
                ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                : status === "RUNNING"
                ? "bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                : status === "COMPLETED"
                ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                : status === "WAITING_APPROVAL"
                ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                : "bg-slate-500"
            }`}
          />
          <span className="text-[11px] font-mono tracking-[0.16em] uppercase text-slate-400 font-semibold">
            TASK TELEMETRY · {type}
          </span>
        </div>
        <button
          onClick={closeDocket}
          className="text-xs font-mono text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 transition-colors"
          aria-label="Close task inspector"
        >
          ✕ ESC
        </button>
      </div>

      {/* Item Title & Badges */}
      <div className="mb-3.5">
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          {isRecovery && (
            <span className="text-[10px] font-mono font-medium text-amber-400 border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded">
              AUTONOMOUS RECOVERY
            </span>
          )}
          {agent && (
            <span className="text-[10px] font-mono font-medium text-cyan-300 bg-cyan-950/40 border border-cyan-700/40 px-2 py-0.5 rounded">
              AGENT: {agent}
            </span>
          )}
          {status && (
            <span
              className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded border ${
                status === "RUNNING"
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                  : status === "COMPLETED"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : status === "FAILED"
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                  : status === "WAITING_APPROVAL"
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                  : "border-slate-700 bg-slate-800 text-slate-300"
              }`}
            >
              {status}
            </span>
          )}
        </div>
        <h2 className="text-base font-semibold text-slate-100 tracking-tight leading-snug">
          {title}
        </h2>
        {meta?.description && (
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            {meta.description}
          </p>
        )}
      </div>

      {/* Technical Data Plate */}
      <div className="bg-slate-950/80 border border-slate-800/90 rounded-md p-3 font-mono text-[11px] text-slate-300 space-y-2 mb-4">
        <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
          <span className="text-slate-500">TASK IDENT:</span>
          <span className="font-semibold text-slate-200 truncate max-w-[220px]">{id}</span>
        </div>

        {retryCount !== undefined && retryCount > 0 && (
          <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
            <span className="text-slate-500">RETRY ATTEMPTS:</span>
            <span className="font-semibold text-rose-400">{retryCount}</span>
          </div>
        )}

        {failureCategory && (
          <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
            <span className="text-rose-400 font-medium">FAULT CATEGORY:</span>
            <span className="font-semibold text-rose-300">{failureCategory}</span>
          </div>
        )}

        {dependencies.length > 0 && (
          <div className="pt-1">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
              DEPENDENCY TASKS ({dependencies.length}):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {dependencies.map((dep: any, idx: number) => {
                const depId = typeof dep === "string" ? dep : dep.dependency_task_id || dep.id;
                return (
                  <span
                    key={idx}
                    className="text-[10px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-mono"
                  >
                    {depId.slice(0, 16)}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Action Controls */}
      <div className="flex items-center justify-between gap-2 font-mono text-xs">
        <button
          onClick={closeDocket}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-300 hover:text-slate-100 rounded transition-colors uppercase tracking-wider font-semibold text-[10px]"
        >
          DISMISS
        </button>

        <div className="flex items-center gap-2">
          {status === "FAILED" && (
            <button
              onClick={() => {
                fetch(`/api/v1/tasks/${id}/retry`, { method: "POST" }).catch(() => {});
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/80 border border-rose-700/80 text-rose-200 hover:bg-rose-900 rounded uppercase tracking-wider font-semibold text-[10px] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RETRY TASK</span>
            </button>
          )}

          {status === "READY" && (
            <button
              onClick={() => {
                fetch(`/api/v1/tasks/${id}/run`, { method: "POST" }).catch(() => {});
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950/80 border border-cyan-700/80 text-cyan-200 hover:bg-cyan-900 rounded uppercase tracking-wider font-semibold text-[10px] transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>DISPATCH AGENT</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
