"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  ListTodo,
  ShieldAlert,
  Bot,
  Brain,
  Wrench,
  Activity,
  Layers,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DockItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const DOCK_ITEMS: DockItem[] = [
  { href: "/missions", label: "Missions", icon: Compass },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/approvals", label: "Security Gate", icon: ShieldAlert },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/activity", label: "Stream", icon: Activity },
];

export function FloatingDock() {
  const pathname = usePathname();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <div className="fixed bottom-7 left-1/2 -translate-x-1/2 z-40 pointer-events-auto select-none">
      <nav
        aria-label="Spatial Navigation Dock"
        className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.6)] transition-all duration-300 hover:border-white/20 hover:bg-black/60"
      >
        {/* Core Anchor / Home */}
        <Link
          href="/"
          className={cn(
            "relative p-2.5 rounded-xl transition-all duration-200 group flex items-center justify-center",
            pathname === "/"
              ? "bg-white/10 text-white shadow-[0_0_12px_rgba(255,255,255,0.15)]"
              : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"
          )}
          title="System Core"
        >
          <Layers className="w-4 h-4" />
          {pathname === "/" && (
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
          )}
        </Link>

        <div className="h-4 w-[1px] bg-white/10 mx-1" />

        {/* Navigation Items */}
        {DOCK_ITEMS.map((item, idx) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <div
              key={item.href}
              className="relative"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Tooltip Label on Hover */}
              {hoveredIdx === idx && (
                <div className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-zinc-900/90 border border-white/10 text-[10px] font-mono uppercase tracking-widest text-zinc-300 shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
                  {item.label}
                </div>
              )}

              <Link
                href={item.href}
                className={cn(
                  "relative p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center group",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"
                )}
              >
                <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                )}
              </Link>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
