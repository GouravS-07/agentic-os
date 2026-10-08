"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Sparkles, RefreshCw, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingDirectivePromptProps {
  onRunDemo?: () => Promise<void>;
  onSeed?: () => Promise<void>;
  isDemoRunning?: boolean;
  isSeeding?: boolean;
}

export function FloatingDirectivePrompt({
  onRunDemo,
  onSeed,
  isDemoRunning = false,
  isSeeding = false,
}: FloatingDirectivePromptProps) {
  const router = useRouter();
  const [goal, setGoal] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = goal.trim();
    if (!trimmed) return;

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
        await fetch(`/api/v1/missions/${mission.id}/plan`, { method: "POST" });
        setGoal("");
        router.push(`/missions/${mission.id}`);
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to initialize mission.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 select-none">
      {/* Editorial Typographic Prompt Header */}
      <div className="text-center space-y-1">
        <p className="text-[11px] font-mono tracking-[0.3em] uppercase text-zinc-400 font-medium">
          AUTONOMOUS DIRECTIVE DISPATCH
        </p>
        <h2 className="text-xl sm:text-2xl font-light tracking-tight text-white font-sans">
          What should the system accomplish?
        </h2>
      </div>

      {/* Clean Floating Input Box */}
      <form onSubmit={handleSubmit} className="relative group">
        <div
          className={cn(
            "relative flex items-center rounded-2xl bg-black/50 backdrop-blur-2xl border transition-all duration-300",
            isFocused
              ? "border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.15)] bg-black/70"
              : "border-white/[0.1] hover:border-white/20"
          )}
        >
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={isSubmitting}
            placeholder="e.g. Audit repository, synthesize security patches & execute tests"
            className="w-full bg-transparent px-5 py-3.5 text-xs sm:text-sm text-white placeholder:text-zinc-500 font-mono focus:outline-none"
          />

          <div className="pr-3 flex items-center gap-1.5">
            <button
              type="submit"
              disabled={isSubmitting || !goal.trim()}
              className={cn(
                "p-2 rounded-xl transition-all flex items-center justify-center",
                goal.trim()
                  ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:bg-cyan-400"
                  : "bg-white/[0.05] text-zinc-500 cursor-not-allowed"
              )}
              title="Execute Directive"
            >
              {isSubmitting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CornerDownLeft className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Contextual Quick Actions */}
      <div className="flex items-center justify-center gap-3 pt-1">
        {onRunDemo && (
          <button
            type="button"
            onClick={onRunDemo}
            disabled={isDemoRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/20 text-[10px] font-mono text-zinc-400 hover:text-white transition-all disabled:opacity-50"
          >
            {isDemoRunning ? (
              <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
            ) : (
              <Sparkles className="w-3 h-3 text-cyan-400" />
            )}
            <span>RUN COMPLETE DEMO LOOP</span>
          </button>
        )}

        {onSeed && (
          <button
            type="button"
            onClick={onSeed}
            disabled={isSeeding}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/20 text-[10px] font-mono text-zinc-400 hover:text-white transition-all disabled:opacity-50"
          >
            <Layers className="w-3 h-3 text-purple-400" />
            <span>SEED SCENARIO</span>
          </button>
        )}
      </div>
    </div>
  );
}
