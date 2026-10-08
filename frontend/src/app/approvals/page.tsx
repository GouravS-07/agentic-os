"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  FileCode,
  GitBranch,
  Search,
  Lock,
  Eye,
  RefreshCw,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return "just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return dateStr;
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1`
  : "/api/v1";

interface ApprovalItem {
  id: string;
  mission_id: string;
  task_id: string;
  agent_id: string;
  agent_run_id: string;
  tool_run_id: string;
  tool_name: string;
  arguments: Record<string, any>;
  arguments_hash: string;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  reason: string;
  status: "PENDING" | "APPROVED" | "DENIED" | "EXPIRED" | "CANCELLED";
  requested_at: string;
  decided_at?: string;
  expires_at: string;
  decided_by?: string;
  decision_metadata?: Record<string, any>;
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [filter, setFilter] = useState<string>("PENDING");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [operatorNote, setOperatorNote] = useState<string>("");

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      setError(null);
      const url =
        filter === "ALL"
          ? `${API_BASE}/approvals`
          : `${API_BASE}/approvals?status=${filter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch approvals.");
      const data = await res.json();
      setApprovals(data.items || []);
    } catch (err: any) {
      setError(err.message || "Failed to load approval requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [filter]);

  const handleApprove = async (approvalId: string) => {
    try {
      setActionLoading(approvalId);
      const res = await fetch(`${API_BASE}/approvals/${approvalId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decided_by: "human_operator",
          reason: operatorNote || "Approved by operator via Command Center",
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Approval failed");
      }
      setOperatorNote("");
      await fetchApprovals();
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeny = async (approvalId: string) => {
    const reason = prompt("Enter reason for denying this tool request:", "Operator rejected execution.");
    if (reason === null) return;

    try {
      setActionLoading(approvalId);
      const res = await fetch(`${API_BASE}/approvals/${approvalId}/deny`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decided_by: "human_operator",
          reason: reason || "Operator rejected execution",
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Denial failed");
      }
      await fetchApprovals();
    } catch (err: any) {
      alert(`Denial error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getToolIcon = (toolName: string) => {
    if (toolName.startsWith("terminal")) return <Terminal className="w-4 h-4 text-amber-400" />;
    if (toolName.startsWith("filesystem")) return <FileCode className="w-4 h-4 text-cyan-400" />;
    if (toolName.startsWith("git")) return <GitBranch className="w-4 h-4 text-primary" />;
    return <Search className="w-4 h-4 text-muted-foreground" />;
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "CRITICAL":
        return (
          <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40">
            CRITICAL RISK
          </span>
        );
      case "HIGH":
        return (
          <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
            HIGH RISK
          </span>
        );
      case "MEDIUM":
        return (
          <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/40">
            MEDIUM RISK
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            LOW RISK
          </span>
        );
    }
  };

  const pendingCount = approvals.filter((a) => a.status === "PENDING").length;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground font-mono flex items-center gap-2">
                <span>Security Checkpoint & Approvals</span>
                {pendingCount > 0 && (
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse font-semibold">
                    {pendingCount} Pending Action
                  </span>
                )}
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                Cryptographic SHA-256 bounded policy validation for autonomous tool invocations
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchApprovals}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface/80 border border-border/80 text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-all"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Security Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-surface/70 border border-border/80 flex items-center justify-between backdrop-blur-xl">
          <div>
            <p className="text-[10px] text-muted-foreground font-mono">PENDING APPROVALS</p>
            <p className="text-2xl font-bold text-amber-400 font-mono mt-1">{pendingCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface/70 border border-border/80 flex items-center justify-between backdrop-blur-xl">
          <div>
            <p className="text-[10px] text-muted-foreground font-mono">POLICY STATUS</p>
            <p className="text-sm font-semibold text-emerald-400 font-mono mt-1">Strict Guard Active</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface/70 border border-border/80 flex items-center justify-between backdrop-blur-xl">
          <div>
            <p className="text-[10px] text-muted-foreground font-mono">SANDBOX PROTECTION</p>
            <p className="text-sm font-semibold text-foreground font-mono mt-1">Jail & Traversal Guard</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
            <Lock className="w-5 h-5 text-cyan-400" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface/70 border border-border/80 flex items-center justify-between backdrop-blur-xl">
          <div>
            <p className="text-[10px] text-muted-foreground font-mono">INTEGRITY PROTOCOL</p>
            <p className="text-sm font-semibold text-cyan-400 font-mono mt-1">SHA-256 Bound</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border/70 pb-3 overflow-x-auto">
        {["PENDING", "APPROVED", "DENIED", "EXPIRED", "ALL"].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all",
              filter === tab
                ? "bg-surface-raised border border-border text-foreground font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-surface/50"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Approvals List */}
      {loading ? (
        <div className="p-16 text-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-amber-400 mx-auto" />
          <p className="text-xs font-mono text-muted-foreground">Loading security checkpoints...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
          {error}
        </div>
      ) : approvals.length === 0 ? (
        <div className="p-16 rounded-3xl bg-surface/60 border border-dashed border-border/90 text-center space-y-3 backdrop-blur-xl">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground font-mono">
            No {filter !== "ALL" ? filter.toLowerCase() : ""} approval requests
          </h3>
          <p className="text-xs text-muted-foreground font-mono max-w-md mx-auto">
            All agent operations are either low-risk auto-authorized or already resolved.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {approvals.map((item) => (
            <div
              key={item.id}
              className={cn(
                "p-6 rounded-3xl bg-surface/75 border transition-all backdrop-blur-xl shadow-xl space-y-4",
                item.status === "PENDING"
                  ? "border-amber-500/50 shadow-amber-500/5 ring-1 ring-amber-500/20"
                  : "border-border/80"
              )}
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                {/* Details */}
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-surface-raised border border-border text-xs font-mono font-medium text-foreground">
                      {getToolIcon(item.tool_name)}
                      <span>{item.tool_name}</span>
                    </div>
                    {getRiskBadge(item.risk_level)}
                    <span
                      className={cn(
                        "px-2.5 py-0.5 text-[10px] font-mono font-semibold rounded-full border",
                        item.status === "PENDING" && "bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse",
                        item.status === "APPROVED" && "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
                        item.status === "DENIED" && "bg-rose-500/20 text-rose-400 border-rose-500/40",
                        (item.status === "EXPIRED" || item.status === "CANCELLED") && "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-foreground font-mono">{item.reason}</h4>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      Requested {formatRelativeTime(item.requested_at)}
                    </p>
                  </div>

                  {/* Bound metadata tags */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-muted-foreground">
                    <span className="px-2 py-0.5 rounded-lg bg-surface-raised border border-border">
                      Agent: {item.agent_id}
                    </span>
                    <Link
                      href={`/missions/${item.mission_id}`}
                      className="px-2 py-0.5 rounded-lg bg-surface-raised border border-border hover:text-cyan-400 transition-colors"
                    >
                      Mission: {item.mission_id.substring(0, 8)}...
                    </Link>
                    <span className="px-2 py-0.5 rounded-lg bg-surface-raised border border-border">
                      Task: {item.task_id.substring(0, 8)}...
                    </span>
                  </div>

                  {/* Tool Arguments */}
                  <div className="mt-3">
                    <p className="text-xs font-mono text-muted-foreground mb-1">Target Arguments:</p>
                    <pre className="p-3.5 rounded-2xl bg-background/80 border border-border/80 text-xs font-mono text-foreground overflow-x-auto max-h-40">
                      {JSON.stringify(item.arguments, null, 2)}
                    </pre>
                  </div>

                  {/* Cryptographic SHA-256 digest */}
                  {item.arguments_hash && (
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                      <Lock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>SHA-256 Digest: </span>
                      <span className="text-foreground/90 font-bold">{item.arguments_hash.substring(0, 24)}...</span>
                    </div>
                  )}

                  {item.decided_at && (
                    <div className="p-3 rounded-xl bg-surface-raised border border-border/80 text-xs font-mono">
                      <p className="font-semibold text-foreground">
                        Decision recorded by: <span className="text-cyan-400">{item.decided_by || "Operator"}</span>
                      </p>
                      {item.decision_metadata && Object.keys(item.decision_metadata).length > 0 && (
                        <p className="text-muted-foreground mt-1 text-[11px]">
                          {JSON.stringify(item.decision_metadata)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {item.status === "PENDING" && (
                  <div className="flex flex-col gap-2.5 min-w-[200px] shrink-0">
                    <button
                      onClick={() => handleApprove(item.id)}
                      disabled={actionLoading === item.id}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-background font-bold text-xs transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{actionLoading === item.id ? "Authorizing..." : "Approve & Execute"}</span>
                    </button>

                    <button
                      onClick={() => handleDeny(item.id)}
                      disabled={actionLoading === item.id}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-raised hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs transition-all disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Deny Action</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
