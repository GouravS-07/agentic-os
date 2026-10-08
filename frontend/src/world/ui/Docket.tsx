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
    <div className="fixed top-16 right-6 z-40 w-[400px] max-w-[92vw] bg-[#EFE9DC] border border-[#121214] shadow-[0_12px_32px_rgba(18,18,20,0.18)] p-5 select-none animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-[#121214] pb-2.5 mb-3.5">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 inline-block ${
              status === "FAILED"
                ? "bg-[#A63A32]"
                : status === "RUNNING"
                ? "bg-[#C98A2B] animate-pulse"
                : status === "COMPLETED"
                ? "bg-[#121214]"
                : "bg-[#3A3A3C]"
            }`}
          />
          <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#3A3A3C] font-bold">
            INSPECTION DOCKET · {type}
          </span>
        </div>
        <button
          onClick={closeDocket}
          className="text-xs font-mono font-bold text-[#121214] hover:text-[#A63A32] px-1.5 py-0.5 border border-transparent hover:border-[#121214]"
          aria-label="Close docket"
        >
          [✕ ESC]
        </button>
      </div>

      {/* Item Title & Badges */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          {isRecovery && (
            <span className="text-[9px] font-mono font-bold text-[#C98A2B] border border-[#C98A2B] bg-[#EFE9DC] px-1.5 py-0.2">
              RECOVERY SIDING
            </span>
          )}
          {agent && (
            <span className="text-[9px] font-mono font-bold text-[#3A3A3C] bg-[#E4DCCB] border border-[#121214]/30 px-1.5 py-0.2">
              AGENT: {agent}
            </span>
          )}
          {status && (
            <span
              className={`text-[9px] font-mono font-bold px-1.5 py-0.2 border ${
                status === "RUNNING"
                  ? "border-[#C98A2B] text-[#C98A2B]"
                  : status === "COMPLETED"
                  ? "border-[#121214] bg-[#DDE6D3] text-[#121214]"
                  : status === "FAILED"
                  ? "border-[#A63A32] bg-[#F4EBE8] text-[#A63A32]"
                  : "border-[#121214]/30 text-[#3A3A3C]"
              }`}
            >
              {status}
            </span>
          )}
        </div>
        <h2 className="text-base font-bold text-[#121214] tracking-tight leading-snug">
          {title}
        </h2>
        {meta?.description && (
          <p className="text-xs text-[#3A3A3C] mt-1.5 leading-relaxed">
            {meta.description}
          </p>
        )}
      </div>

      {/* Technical Data Plate */}
      <div className="bg-[#E4DCCB] border border-[#A8A69E] p-3 font-mono text-[11px] text-[#232325] space-y-2 mb-4">
        <div className="flex justify-between border-b border-[#A8A69E]/40 pb-1">
          <span className="text-[#3A3A3C]">STATION IDENT:</span>
          <span className="font-bold text-[#121214] truncate max-w-[200px]">{id}</span>
        </div>

        {retryCount !== undefined && retryCount > 0 && (
          <div className="flex justify-between border-b border-[#A8A69E]/40 pb-1">
            <span className="text-[#3A3A3C]">RETRY ATTEMPTS:</span>
            <span className="font-bold text-[#A63A32]">{retryCount}</span>
          </div>
        )}

        {failureCategory && (
          <div className="flex justify-between border-b border-[#A8A69E]/40 pb-1">
            <span className="text-[#A63A32] font-bold">FAILURE CATEGORY:</span>
            <span className="font-bold text-[#A63A32]">{failureCategory}</span>
          </div>
        )}

        {dependencies.length > 0 && (
          <div className="pt-1">
            <div className="text-[10px] text-[#3A3A3C] uppercase mb-1">
              PREREQUISITE ROUTES ({dependencies.length}):
            </div>
            <div className="flex flex-wrap gap-1">
              {dependencies.map((dep: any, idx: number) => {
                const depId = typeof dep === "string" ? dep : dep.dependency_task_id || dep.id;
                return (
                  <span
                    key={idx}
                    className="text-[9px] bg-[#EFE9DC] border border-[#121214]/30 px-1 py-0.5 text-[#121214]"
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
      <div className="flex items-center justify-between gap-2 font-mono text-[10px]">
        <button
          onClick={closeDocket}
          className="px-2.5 py-1.5 bg-[#E4DCCB] border border-[#121214] text-[#121214] hover:bg-[#EFE9DC] uppercase tracking-wider font-bold"
        >
          DISMISS
        </button>

        <div className="flex items-center gap-2">
          {status === "FAILED" && (
            <button
              onClick={() => {
                // Replay/retry action
                fetch(`/api/v1/tasks/${id}/retry`, { method: "POST" }).catch(() => {});
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#A63A32] text-[#EFE9DC] hover:bg-[#852C25] uppercase tracking-wider font-bold"
            >
              <RotateCcw className="w-3 h-3" />
              <span>RETRY TASK</span>
            </button>
          )}

          {status === "READY" && (
            <button
              onClick={() => {
                fetch(`/api/v1/tasks/${id}/run`, { method: "POST" }).catch(() => {});
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#121214] text-[#EFE9DC] hover:bg-[#3A3A3C] uppercase tracking-wider font-bold"
            >
              <Play className="w-3 h-3" />
              <span>DISPATCH AGENT</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
