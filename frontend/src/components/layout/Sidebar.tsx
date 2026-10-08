"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Compass,
  Bot,
  ListTodo,
  Brain,
  Activity,
  Wrench,
  Settings,
  Terminal,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavGroup {
  group: string;
  items: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
    badgeColor?: string;
  }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    group: "COMMAND",
    items: [
      { href: "/", label: "Home", icon: LayoutDashboard },
      { href: "/missions", label: "Missions", icon: Compass },
    ],
  },
  {
    group: "OPERATE",
    items: [
      { href: "/tasks", label: "Tasks", icon: ListTodo },
      { href: "/approvals", label: "Approvals", icon: ShieldAlert },
    ],
  },
  {
    group: "INTELLIGENCE",
    items: [
      { href: "/agents", label: "Agents", icon: Bot },
      { href: "/memory", label: "Memory", icon: Brain },
      { href: "/tools", label: "Tools", icon: Wrench },
    ],
  },
  {
    group: "OBSERVE & SYSTEM",
    items: [
      { href: "/activity", label: "Activity", icon: Activity },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen border-r border-border/80 bg-surface/80 backdrop-blur-xl transition-all duration-300 select-none z-30 shrink-0",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="h-16 border-b border-border/80 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3 overflow-hidden group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-cyan-500/20 border border-primary/40 flex items-center justify-center text-primary group-hover:border-primary transition-all shadow-sm">
            <Terminal className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          </div>
          {!collapsed && (
            <div className="truncate">
              <h1 className="text-xs font-bold tracking-widest text-foreground flex items-center gap-1.5 font-mono">
                <span>AGENTIC OS</span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              </h1>
              <p className="text-[10px] font-mono text-muted-foreground tracking-tight">
                AI COMMAND CENTER
              </p>
            </div>
          )}
        </Link>

        {/* Collapse toggle button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-lg hover:bg-surface-raised text-muted-foreground hover:text-foreground transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto overflow-x-hidden">
        {NAV_GROUPS.map((sec) => (
          <div key={sec.group} className="space-y-1">
            {!collapsed && (
              <h3 className="px-3 text-[10px] font-mono tracking-widest uppercase text-muted-foreground/70 font-semibold mb-2">
                {sec.group}
              </h3>
            )}
            <div className="space-y-0.5">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group relative",
                      isActive
                        ? "bg-gradient-to-r from-primary/20 to-purple-500/10 text-white border border-primary/40 shadow-sm"
                        : "text-muted-foreground hover:bg-surface-raised/60 hover:text-foreground border border-transparent"
                    )}
                  >
                    {/* Active Left Indicator Bar */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                    )}

                    <Icon
                      className={cn(
                        "w-4 h-4 shrink-0 transition-transform group-hover:scale-105",
                        isActive
                          ? "text-cyan-400"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />

                    {!collapsed && (
                      <span className="truncate flex-1 font-sans">{item.label}</span>
                    )}

                    {!collapsed && item.badge && (
                      <span
                        className={cn(
                          "px-1.5 py-0.2 text-[10px] font-mono font-semibold rounded",
                          item.badgeColor || "bg-primary/20 text-primary border border-primary/30"
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* System Status Footer */}
      <div className="p-3 border-t border-border/80 bg-surface/50">
        {!collapsed ? (
          <div className="p-2.5 rounded-xl bg-background/60 border border-border/80 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-muted-foreground font-semibold">CORE RUNTIME</span>
              </div>
              <span className="text-emerald-400 font-bold">ONLINE</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground/80">
              <span>SANDBOX GUARD</span>
              <span className="text-cyan-400">ACTIVE</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title="Core Runtime Online">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
