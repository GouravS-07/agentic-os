"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Activity,
  Radio,
  Pause,
  Play,
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  ShieldAlert,
  Wrench,
  Bot,
  ListTodo,
  Compass,
} from "lucide-react";
import { useWebSocket } from "@/lib/useWebSocket";
import { EventItem, fetchEvents } from "@/lib/events";
import { cn } from "@/lib/utils";

export default function ActivityCenterPage() {
  const [initialEvents, setInitialEvents] = useState<EventItem[]>([]);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [bufferedEvents, setBufferedEvents] = useState<EventItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetchEvents({ limit: 100 });
        setInitialEvents(Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []));
      } catch (e) {
        console.error("Failed to load event history:", e);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadHistory();
  }, []);

  const { status, events: liveEvents, reconnect } = useWebSocket({
    channel: "system",
  });

  const allEvents = useMemo(() => {
    const map = new Map<string, EventItem>();
    liveEvents.forEach((ev) => map.set(ev.id, ev));
    initialEvents.forEach((ev) => {
      if (!map.has(ev.id)) map.set(ev.id, ev);
    });

    const combined = Array.from(map.values());
    combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return combined;
  }, [liveEvents, initialEvents]);

  const displayEvents = useMemo(() => {
    if (isPaused) {
      return bufferedEvents;
    }
    return allEvents;
  }, [isPaused, bufferedEvents, allEvents]);

  const togglePause = () => {
    if (!isPaused) {
      setBufferedEvents(allEvents);
      setIsPaused(true);
    } else {
      setIsPaused(false);
    }
  };

  const filteredEvents = useMemo(() => {
    return displayEvents.filter((ev) => {
      if (selectedCategory !== "ALL") {
        if (selectedCategory === "MISSION" && !ev.event_type.startsWith("MISSION_")) return false;
        if (selectedCategory === "TASK" && !ev.event_type.startsWith("TASK_") && !ev.event_type.startsWith("DAG_")) return false;
        if (selectedCategory === "AGENT" && !ev.event_type.startsWith("AGENT_")) return false;
        if (selectedCategory === "TOOL" && !ev.event_type.startsWith("TOOL_")) return false;
        if (selectedCategory === "APPROVAL" && !ev.event_type.startsWith("APPROVAL_")) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesType = ev.event_type.toLowerCase().includes(q);
        const matchesSource = ev.source.toLowerCase().includes(q);
        const matchesCorr = ev.correlation_id.toLowerCase().includes(q);
        const matchesMission = ev.mission_id?.toLowerCase().includes(q) || false;
        const matchesPayload = JSON.stringify(ev.payload || {}).toLowerCase().includes(q);
        return matchesType || matchesSource || matchesCorr || matchesMission || matchesPayload;
      }

      return true;
    });
  }, [displayEvents, selectedCategory, searchQuery]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getEventBadge = (eventType: string) => {
    if (eventType.startsWith("MISSION_")) {
      return {
        bg: "bg-purple-950/40 text-purple-400 border-purple-800/40",
        icon: Compass,
      };
    }
    if (eventType.startsWith("TASK_") || eventType.startsWith("DAG_")) {
      return {
        bg: "bg-cyan-950/40 text-cyan-400 border-cyan-800/40",
        icon: ListTodo,
      };
    }
    if (eventType.startsWith("AGENT_")) {
      return {
        bg: "bg-emerald-950/40 text-emerald-400 border-emerald-800/40",
        icon: Bot,
      };
    }
    if (eventType.startsWith("TOOL_")) {
      return {
        bg: "bg-amber-950/40 text-amber-400 border-amber-800/40",
        icon: Wrench,
      };
    }
    if (eventType.startsWith("APPROVAL_")) {
      return {
        bg: "bg-rose-950/40 text-rose-400 border-rose-800/40",
        icon: ShieldAlert,
      };
    }
    return {
      bg: "bg-zinc-800 text-zinc-400 border-zinc-700",
      icon: Activity,
    };
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner & Stream Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface/75 p-6 rounded-3xl border border-border/80 backdrop-blur-xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 font-mono">
              <Activity className="w-6 h-6 text-cyan-400" />
              <span>Live Activity Center</span>
            </h1>
            {/* Live Connection Pill */}
            <div
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border",
                status === "connected" && "bg-emerald-950/50 text-emerald-400 border-emerald-800/60",
                status === "connecting" && "bg-amber-950/50 text-amber-400 border-amber-800/60 animate-pulse",
                status === "reconnecting" && "bg-amber-950/50 text-amber-400 border-amber-800/60 animate-pulse",
                status === "disconnected" && "bg-rose-950/50 text-rose-400 border-rose-800/60"
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  status === "connected" && "bg-emerald-400 animate-ping",
                  status === "connecting" && "bg-amber-400",
                  status === "reconnecting" && "bg-amber-400",
                  status === "disconnected" && "bg-rose-400"
                )}
              />
              <span className="capitalize">{status}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            Real-time event bus telemetry, monotonic sequence ordering, and cross-mission domain streams.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={togglePause}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-medium border transition-colors",
              isPaused
                ? "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25"
                : "bg-surface-raised text-foreground border-border hover:bg-surface-active"
            )}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? "Resume Stream" : "Pause Stream"}</span>
          </button>
          <button
            onClick={() => reconnect()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-medium bg-surface-raised text-foreground border border-border hover:bg-surface-active transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reconnect</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 bg-surface/75 p-1 rounded-2xl border border-border/80 w-full md:w-auto overflow-x-auto backdrop-blur-xl">
          {["ALL", "MISSION", "TASK", "AGENT", "TOOL", "APPROVAL"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap",
                selectedCategory === cat
                  ? "bg-primary text-white font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-raised"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search payload, type, correlation ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface/75 border border-border/80 rounded-2xl pl-9 pr-4 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 backdrop-blur-xl"
          />
        </div>
      </div>

      {/* Event Stream Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event List (2 cols) */}
        <div className="lg:col-span-2 space-y-2.5">
          {loadingInitial ? (
            <div className="p-16 text-center space-y-3 bg-surface/60 rounded-3xl border border-border/80 backdrop-blur-xl">
              <Activity className="w-6 h-6 animate-pulse text-cyan-400 mx-auto" />
              <p className="text-xs font-mono text-muted-foreground">Loading initial event telemetry...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-16 text-center text-xs font-mono text-muted-foreground bg-surface/60 rounded-3xl border border-dashed border-border/90 backdrop-blur-xl">
              No events found matching current criteria.
            </div>
          ) : (
            filteredEvents.map((ev) => {
              const badge = getEventBadge(ev.event_type);
              const BadgeIcon = badge.icon;
              const isSelected = selectedEvent?.id === ev.id;

              return (
                <div
                  key={ev.id}
                  onClick={() => setSelectedEvent(ev)}
                  className={cn(
                    "p-4 bg-surface/75 border rounded-2xl cursor-pointer transition-all hover:border-cyan-500/50 flex items-start justify-between gap-4 backdrop-blur-xl shadow-sm",
                    isSelected ? "border-primary ring-1 ring-primary/40 bg-surface-raised" : "border-border/80"
                  )}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={cn("p-2 rounded-xl border shrink-0", badge.bg)}>
                      <BadgeIcon className="w-4 h-4" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-foreground">
                          {ev.event_type}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface-raised text-cyan-400 border border-border">
                          #{ev.sequence_number}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {ev.source}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate font-mono">
                        {JSON.stringify(ev.payload || {})}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0 text-right">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </span>
                    {ev.mission_id && (
                      <span className="text-[10px] font-mono text-primary truncate max-w-[120px]">
                        m:{ev.mission_id.slice(0, 8)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Event Detail Drawer (1 col) */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 bg-surface/75 p-5 rounded-3xl border border-border/90 backdrop-blur-xl shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-foreground font-mono flex items-center justify-between border-b border-border/80 pb-3">
              <span>Event Inspector</span>
              {selectedEvent && (
                <span className="text-[10px] font-mono text-cyan-400">
                  seq #{selectedEvent.sequence_number}
                </span>
              )}
            </h2>

            {selectedEvent ? (
              <div className="space-y-4 text-xs font-mono">
                {/* Meta Fields */}
                <div className="space-y-2 p-3.5 bg-background/80 rounded-2xl border border-border/80 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Event Type:</span>
                    <span className="font-semibold text-cyan-400">{selectedEvent.event_type}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Event ID:</span>
                    <div className="flex items-center gap-1">
                      <span>{selectedEvent.id.slice(0, 12)}...</span>
                      <button
                        onClick={() => copyToClipboard(selectedEvent.id, "id")}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {copiedId === "id" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Correlation ID:</span>
                    <div className="flex items-center gap-1">
                      <span>{selectedEvent.correlation_id.slice(0, 12)}...</span>
                      <button
                        onClick={() => copyToClipboard(selectedEvent.correlation_id, "corr")}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {copiedId === "corr" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                  {selectedEvent.mission_id && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Mission ID:</span>
                      <span className="text-primary">{selectedEvent.mission_id}</span>
                    </div>
                  )}
                  {selectedEvent.task_id && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Task ID:</span>
                      <span>{selectedEvent.task_id}</span>
                    </div>
                  )}
                  {selectedEvent.agent_id && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Agent ID:</span>
                      <span className="text-cyan-400">{selectedEvent.agent_id}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Timestamp:</span>
                    <span>{new Date(selectedEvent.timestamp).toISOString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Source:</span>
                    <span>{selectedEvent.source}</span>
                  </div>
                </div>

                {/* Formatted JSON Payload */}
                <div className="space-y-1.5">
                  <span className="text-muted-foreground text-[11px] font-semibold">Sanitized Payload</span>
                  <pre className="p-3.5 bg-background/80 rounded-2xl border border-border/80 text-[11px] text-foreground overflow-x-auto max-h-72">
                    {JSON.stringify(selectedEvent.payload, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-muted-foreground font-mono">
                Select an event from the stream to inspect details, trace correlation IDs, and review sanitized payloads.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
