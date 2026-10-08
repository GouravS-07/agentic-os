"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/missions", label: "Missions" },
  { href: "/tasks", label: "Tasks" },
  { href: "/agents", label: "Agents" },
  { href: "/approvals", label: "Security" },
  { href: "/activity", label: "Stream" },
];

export function EditorialNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 pointer-events-auto select-none">
      <nav
        aria-label="Editorial Navigation"
        className="flex items-center gap-6 px-6 py-2.5 rounded-full bg-black/60 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] transition-all duration-300 hover:border-white/20"
      >
        <Link
          href="/"
          className={cn(
            "text-[11px] font-mono tracking-widest uppercase transition-colors",
            pathname === "/" ? "text-white font-bold" : "text-zinc-400 hover:text-white"
          )}
        >
          System
        </Link>

        {NAV_LINKS.map((link) => {
          const isActive = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-[11px] font-mono tracking-widest uppercase transition-colors",
                isActive ? "text-white font-bold" : "text-zinc-400 hover:text-white"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
