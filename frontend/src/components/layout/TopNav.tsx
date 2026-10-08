"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ShieldAlert,
  Cpu,
  Sparkles,
  Loader2,
  ArrowRight,
  Command,
  Zap,
  Box,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSceneStore } from "@/scene/state/useSceneStore";

interface TopNavProps {
  onSearchSubmit?: (query: string) => void;
  pendingApprovalsCount?: number;
}

const QUICK_SUGGESTIONS = [
  "Build a portfolio website from my GitHub repositories and deploy",
  "Perform automated security audit and scan repository for vulnerabilities",
  "Analyze codebase architecture and generate technical documentation",
];

export function TopNav({ onSearchSubmit, pendingApprovalsCount = 0 }: TopNavProps) {
  const router = useRouter();
  const [goal, setGoal] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState(pendingApprovalsCount);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Poll or fetch pending approvals count
  useEffect(() => {
    const checkApprovals = async () => {
      try {
        const res = await fetch("/api/v1/approvals?status=PENDING");
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : (data.items || []);
          setPendingApprovals(items.length);
        }
      } catch (err) {
        // silent fail
      }
    };
    checkApprovals();
    const interval = setInterval(checkApprovals, 10000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut Cmd/Ctrl + K to focus command bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = goal.trim();
    if (!trimmed) return;

    if (onSearchSubmit) {
      onSearchSubmit(trimmed);
      return;
    }

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
        // Trigger initial AI planning automatically
        await fetch(`/api/v1/missions/${mission.id}/plan`, { method: "POST" });
        setGoal("");
        setIsFocused(false);
        router.push(`/missions/${mission.id}`);
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to dispatch mission goal.");
      }
    } catch (err) {
      console.error("Global Command Bar submission error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const { is3DEnabled, set3DEnabled } = useSceneStore();

  return (
    <header className="h-16 border-b border-border/80 bg-surface/60 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-40 transition-all">
      {/* Floating Raycast-Style Global Command Bar */}
      <div className="flex-1 max-w-2xl relative">
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400" />
            <input
              ref={inputRef}
              type="text"
              value={goal}
              disabled={isSubmitting}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Enter a high-level goal... (e.g. 'Build a portfolio from my GitHub repositories')"
              className={cn(
                "w-full bg-background/80 border rounded-xl pl-10 pr-28 py-2 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none transition-all font-mono",
                isFocused
                  ? "border-primary ring-2 ring-primary/20 shadow-[0_0_20px_rgba(99,102,241,0.25)] bg-background"
                  : "border-border/80 hover:border-border"
              )}
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {isSubmitting ? (
                <div className="flex items-center gap-1 text-[10px] text-cyan-400 font-mono">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing...</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono bg-surface-raised border border-border/80 rounded text-muted-foreground">
                    <span>Ctrl</span>
                    <span>K</span>
                  </kbd>
                  <button
                    type="submit"
                    disabled={!goal.trim()}
                    className="px-2 py-0.5 text-[10px] font-mono bg-primary/20 hover:bg-primary/30 border border-primary/40 rounded text-primary hover:text-white flex items-center gap-1 transition-all disabled:opacity-30"
                  >
                    <span>Run</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Focus Dropdown Suggestions */}
        {isFocused && !goal.trim() && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-surface/95 border border-border rounded-xl p-2.5 shadow-2xl backdrop-blur-2xl z-50 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>Recommended Autonomous Directives</span>
            </div>
            {QUICK_SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onMouseDown={() => {
                  setGoal(s);
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-raised text-xs text-muted-foreground hover:text-foreground font-mono transition-colors flex items-center justify-between group"
              >
                <span className="truncate">{s}</span>
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-cyan-400 transition-opacity shrink-0 ml-2" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Telemetry Actions */}
      <div className="flex items-center gap-3 ml-6">
        {/* HITL Approvals Indicator */}
        {pendingApprovals > 0 && (
          <a
            href="/approvals"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs font-semibold animate-pulse hover:bg-amber-500/25 transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)]"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{pendingApprovals} Pending Approval</span>
          </a>
        )}

        {/* Active Agents Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface/70 border border-border/80 text-xs text-muted-foreground font-mono">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span>Agents: <strong className="text-foreground font-semibold">5 Active</strong></span>
        </div>

        {/* LLM Engine Status */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface/70 border border-border/80 text-xs text-muted-foreground font-mono">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>Engine: <strong className="text-foreground font-semibold">Autonomous OS</strong></span>
        </div>

        {/* 3D Spatial Environment Toggle */}
        <button
          type="button"
          onClick={() => set3DEnabled(!is3DEnabled)}
          title={is3DEnabled ? "Switch to 2D Mode" : "Switch to 3D Spatial Mode"}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all shadow-sm",
            is3DEnabled
              ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
              : "bg-surface/70 text-muted-foreground border border-border/80 hover:text-foreground hover:bg-surface-raised"
          )}
        >
          <Box className={cn("w-3.5 h-3.5", is3DEnabled ? "text-cyan-400 animate-pulse" : "text-muted-foreground")} />
          <span>{is3DEnabled ? "3D ON" : "3D OFF"}</span>
        </button>
      </div>
    </header>
  );
}
