"use client";

import React, { useState, useEffect } from "react";
import {
  Brain,
  Search,
  Plus,
  Trash2,
  Sparkles,
  Layers,
  History,
  BookOpen,
  Filter,
  ShieldCheck,
  Zap,
  Info,
  RefreshCw,
  Database,
} from "lucide-react";
import { Memory, MemorySearchResult, MemoryType, MemorySource } from "@/types";
import {
  fetchMemories,
  searchMemories,
  createMemory,
  deleteMemory,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export default function MemoryExplorerPage() {
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MemorySearchResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // New Memory Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState<MemoryType>("SEMANTIC");
  const [newSource, setNewSource] = useState<MemorySource>("MANUAL");
  const [newImportance, setNewImportance] = useState<number>(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadMemories = async () => {
    setLoading(true);
    try {
      const res = await fetchMemories({
        memory_type: activeTab === "ALL" ? undefined : activeTab,
        limit: 50,
      });
      setMemories(res.items);
    } catch (err) {
      console.error("Failed to load memories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      loadMemories();
    }
  }, [activeTab]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      loadMemories();
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchMemories(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    setIsSubmitting(true);
    try {
      await createMemory({
        content: newContent,
        memory_type: newType,
        source: newSource,
        importance: newImportance,
      });
      setNewContent("");
      setIsCreateOpen(false);
      loadMemories();
    } catch (err) {
      console.error("Create failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this memory item?")) return;
    try {
      await deleteMemory(id);
      if (searchResults) {
        setSearchResults(searchResults.filter((r) => r.memory.id !== id));
      }
      setMemories(memories.filter((m) => m.id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground font-mono flex items-center gap-2">
                <span>Memory Subsystem & Vector Index</span>
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                3-Tier Architecture: Working, Episodic, and Semantic Vector Store
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface/80 border border-border/80 text-xs text-muted-foreground font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Isolation: user_id active</span>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Ingest Memory</span>
          </button>
        </div>
      </div>

      {/* 3-Tier Architecture Overview Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-3xl bg-surface/75 border border-border/80 p-5 backdrop-blur-xl shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-cyan-400 font-bold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>TIER 1: WORKING MEMORY</span>
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">Ephemeral</span>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            Scratchpad & in-flight task execution variables. Cleared upon task completion.
          </p>
        </div>

        <div className="rounded-3xl bg-surface/75 border border-border/80 p-5 backdrop-blur-xl shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-amber-400 font-bold flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              <span>TIER 2: EPISODIC MEMORY</span>
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">Experiences</span>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            Mission execution logs, failure traces, and agent reflection histories.
          </p>
        </div>

        <div className="rounded-3xl bg-surface/75 border border-border/80 p-5 backdrop-blur-xl shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-purple-400 font-bold flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>TIER 3: SEMANTIC STORE</span>
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">Vector Index</span>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            Long-term knowledge, documentation facts, and reusable coding heuristics.
          </p>
        </div>
      </div>

      {/* Semantic Search & Multi-Factor Hybrid Tester */}
      <div className="rounded-3xl bg-surface/75 border border-border/90 p-6 backdrop-blur-xl shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-bold text-foreground font-mono">
              Multi-Factor Hybrid Vector Retrieval
            </h2>
          </div>
          <div className="text-[11px] text-purple-300 font-mono bg-purple-500/15 px-3 py-1 rounded-xl border border-purple-500/30">
            Score = 0.50·Sim + 0.20·Rec + 0.15·Imp + 0.15·Match
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Query vector index (e.g., 'autoprefixer configuration failure' or 'Next.js router rules')..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background/80 border border-border/80 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 font-mono text-xs"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-4 py-2.5 rounded-xl bg-surface-raised border border-border/80 hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50 font-mono"
          >
            {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5 text-cyan-400" />}
            <span>Retrieve</span>
          </button>
          {searchResults && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSearchResults(null);
                loadMemories();
              }}
              className="px-3.5 py-2.5 rounded-xl bg-surface border border-border text-muted-foreground hover:text-foreground text-xs font-mono"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Tier Filter Tabs */}
      {!searchResults && (
        <div className="flex items-center gap-2 border-b border-border/70 pb-3 overflow-x-auto">
          {[
            { id: "ALL", label: "All Tiers", icon: Layers, count: memories.length },
            { id: "WORKING", label: "Working Memory", icon: Zap, color: "text-cyan-400" },
            { id: "EPISODIC", label: "Episodic Experiences", icon: History, color: "text-amber-400" },
            { id: "SEMANTIC", label: "Semantic Knowledge", icon: BookOpen, color: "text-purple-400" },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all shrink-0",
                  active
                    ? "bg-surface-raised border border-border text-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface/50"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", tab.color || "")} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Memory Results List */}
      <div className="space-y-3">
        {loading || isSearching ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-400 mx-auto" />
            <p className="text-xs font-mono text-muted-foreground">Synthesizing vector memories...</p>
          </div>
        ) : searchResults ? (
          <div className="space-y-3">
            <div className="text-xs font-mono text-muted-foreground px-1 flex items-center justify-between">
              <span>Top {searchResults.length} Relevant Memories</span>
              <span className="text-purple-400">Ranked by hybrid weighted relevance</span>
            </div>
            {searchResults.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted-foreground bg-surface/60 rounded-3xl border border-dashed border-border/90 font-mono">
                No matching memories found for query.
              </div>
            ) : (
              searchResults.map((res, i) => (
                <div
                  key={res.memory.id}
                  className="rounded-3xl bg-surface/75 border border-border/80 p-5 shadow-xl backdrop-blur-xl space-y-3 hover:border-purple-500/50 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-semibold">
                        #{i + 1} Relevance: {(res.relevance_score * 100).toFixed(1)}%
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-mono px-2.5 py-0.5 rounded-full border",
                          res.memory.memory_type === "WORKING" && "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
                          res.memory.memory_type === "EPISODIC" && "bg-amber-500/10 text-amber-400 border-amber-500/30",
                          res.memory.memory_type === "SEMANTIC" && "bg-purple-500/10 text-purple-400 border-purple-500/30"
                        )}
                      >
                        {res.memory.memory_type}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                        {res.memory.source}
                      </span>
                      <span className="text-[10px] text-amber-400 font-mono">
                        Importance: {"★".repeat(res.memory.importance)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(res.memory.id)}
                      className="text-muted-foreground hover:text-rose-400 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-foreground font-mono whitespace-pre-wrap leading-relaxed">
                    {res.memory.content}
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-border/50 text-[10px] font-mono text-muted-foreground">
                    <div>Sim: {(res.similarity_score * 100).toFixed(0)}%</div>
                    <div>Recency: {(res.recency_score * 100).toFixed(0)}%</div>
                    <div>Imp: {(res.importance_score * 100).toFixed(0)}%</div>
                    <div>Match: {(res.mission_match_score * 100).toFixed(0)}%</div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : memories.length === 0 ? (
          <div className="p-16 text-center space-y-3 bg-surface/60 rounded-3xl border border-dashed border-border/90 backdrop-blur-xl">
            <Brain className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <h3 className="text-base font-semibold text-foreground font-mono">No memories stored in this tier yet</h3>
            <p className="text-xs text-muted-foreground font-mono max-w-sm mx-auto">
              Agent executions and failure analyses will automatically ingest episodic and semantic memories.
            </p>
          </div>
        ) : (
          memories.map((m) => (
            <div
              key={m.id}
              className="rounded-3xl bg-surface/75 border border-border/80 p-5 shadow-xl backdrop-blur-xl space-y-2.5 hover:border-border/90 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      "text-[10px] font-mono px-2.5 py-0.5 rounded-full border",
                      m.memory_type === "WORKING" && "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
                      m.memory_type === "EPISODIC" && "bg-amber-500/10 text-amber-400 border-amber-500/30",
                      m.memory_type === "SEMANTIC" && "bg-purple-500/10 text-purple-400 border-purple-500/30"
                    )}
                  >
                    {m.memory_type}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                    {m.source}
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono">
                    {"★".repeat(m.importance)}
                  </span>
                  {m.mission_id && (
                    <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[150px]">
                      mission: {m.mission_id.slice(0, 8)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {new Date(m.created_at).toLocaleString()}
                  </span>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="text-muted-foreground hover:text-rose-400 transition-colors p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-foreground font-mono whitespace-pre-wrap leading-relaxed">
                {m.content}
              </p>

              {m.metadata_payload && Object.keys(m.metadata_payload).length > 0 && (
                <div className="text-[10px] font-mono text-muted-foreground bg-background/60 p-2.5 rounded-xl border border-border/50">
                  {JSON.stringify(m.metadata_payload)}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Manual Ingest Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-foreground font-mono">
                  Ingest Memory Knowledge
                </h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-mono">Memory Content</label>
                <textarea
                  required
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Enter factual insight, coding rule, experience pattern, or environment fact..."
                  className="w-full p-3 rounded-xl bg-background border border-border text-xs text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-mono">Tier</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as MemoryType)}
                    className="w-full p-2.5 rounded-xl bg-background border border-border text-xs text-foreground font-mono"
                  >
                    <option value="SEMANTIC">SEMANTIC (Persistent)</option>
                    <option value="EPISODIC">EPISODIC (Experience)</option>
                    <option value="WORKING">WORKING (Ephemeral)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-mono">Source</label>
                  <select
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value as MemorySource)}
                    className="w-full p-2.5 rounded-xl bg-background border border-border text-xs text-foreground font-mono"
                  >
                    <option value="MANUAL">MANUAL</option>
                    <option value="USER_FEEDBACK">USER_FEEDBACK</option>
                    <option value="AGENT_REFLECTION">AGENT_REFLECTION</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-mono flex items-center justify-between">
                  <span>Importance Weight</span>
                  <span className="text-purple-400 font-bold">{newImportance} / 5</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={newImportance}
                  onChange={(e) => setNewImportance(parseInt(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-surface border border-border text-muted-foreground hover:text-foreground text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 font-mono"
                >
                  {isSubmitting ? "Ingesting..." : "Store Memory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
