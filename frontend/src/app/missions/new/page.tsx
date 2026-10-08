"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Compass, Sparkles, Plus, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

function NewMissionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialGoal = searchParams?.get("goal") || "";

  const [title, setTitle] = useState(
    initialGoal ? initialGoal.slice(0, 50) : "Portfolio Build & Deployment"
  );
  const [description, setDescription] = useState(
    initialGoal || "Analyze GitHub repositories and deploy a modern portfolio showcase"
  );
  const [priority, setPriority] = useState(2);
  const [tasks, setTasks] = useState<Array<{ title: string; description: string }>>([
    { title: "Analyze GitHub Repositories", description: "Fetch public repository details and metrics" },
    { title: "Select Strongest Projects", description: "Rank and select the top 3 projects for the showcase" },
    { title: "Generate Portfolio Architecture", description: "Draft layout structure and components" },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const addTaskField = () => {
    setTasks((prev) => [...prev, { title: "", description: "" }]);
  };

  const removeTaskField = (index: number) => {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTask = (index: number, field: "title" | "description", val: string) => {
    setTasks((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;
    setSubmitting(true);

    try {
      const missionRes = await fetch("/api/v1/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          priority: Number(priority),
        }),
      });

      if (!missionRes.ok) throw new Error("Failed to create mission");
      const mission = await missionRes.json();

      let prevTaskId: string | null = null;
      for (const t of tasks) {
        if (!t.title.trim()) continue;
        const taskRes: Response = await fetch(`/api/v1/missions/${mission.id}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: t.title,
            description: t.description || t.title,
            dependencies: prevTaskId ? [prevTaskId] : [],
          }),
        });
        if (taskRes.ok) {
          const createdTask = await taskRes.json();
          prevTaskId = createdTask.id;
        }
      }

      router.push(`/missions/${mission.id}`);
    } catch (err) {
      console.error("Error creating mission:", err);
      alert("Error creating mission. Check console for details.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl bg-surface/75 border border-border/90 p-8 backdrop-blur-xl shadow-2xl">
      {/* Mission Goal Details */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
            Mission Title
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Build portfolio website"
            className="w-full bg-background/80 border border-border/80 rounded-2xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
            High-Level Goal / Directive
          </label>
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what the autonomous agents need to accomplish..."
            className="w-full bg-background/80 border border-border/80 rounded-2xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
            Execution Priority
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            className="bg-background/80 border border-border/80 rounded-2xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
          >
            <option value={1}>1 - Low</option>
            <option value={2}>2 - Normal</option>
            <option value={3}>3 - High</option>
            <option value={4}>4 - Critical</option>
          </select>
        </div>
      </div>

      {/* Initial Tasks Section */}
      <div className="pt-4 border-t border-border/60 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Initial Task Sequence (Auto-linked Chain)
          </h4>
          <button
            type="button"
            onClick={addTaskField}
            className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-mono font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Step</span>
          </button>
        </div>

        <div className="space-y-3">
          {tasks.map((task, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3.5 rounded-2xl bg-background/80 border border-border/80"
            >
              <span className="text-[10px] font-mono text-cyan-400 mt-2 shrink-0 font-semibold">
                STEP {idx + 1}
              </span>
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={task.title}
                  onChange={(e) => updateTask(idx, "title", e.target.value)}
                  placeholder="Task title"
                  className="w-full bg-surface border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
                <input
                  type="text"
                  value={task.description}
                  onChange={(e) => updateTask(idx, "description", e.target.value)}
                  placeholder="Task details"
                  className="w-full bg-surface border border-border rounded-xl px-3 py-1.5 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
              </div>
              {tasks.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTaskField(idx)}
                  className="text-muted-foreground hover:text-rose-400 mt-2 transition-colors p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="pt-4 border-t border-border/60 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-purple-600 hover:from-primary-hover hover:to-purple-500 text-white text-xs font-semibold transition-all shadow-lg shadow-primary/25 disabled:opacity-50 font-mono"
        >
          <Sparkles className="w-4 h-4 text-cyan-300" />
          <span>{submitting ? "Initializing Mission..." : "Create & Initialize Mission"}</span>
        </button>
      </div>
    </form>
  );
}

export default function NewMissionPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3 border-b border-border/80 pb-5">
        <Link
          href="/missions"
          className="p-2.5 rounded-xl bg-surface/80 border border-border/80 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-foreground font-mono flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-400" />
            <span>Create New Autonomous Mission</span>
          </h2>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            Specify your high-level goal and initial task breakdown
          </p>
        </div>
      </div>

      <Suspense fallback={<div className="p-12 text-center text-muted-foreground font-mono text-sm">Loading mission form...</div>}>
        <NewMissionForm />
      </Suspense>
    </div>
  );
}
