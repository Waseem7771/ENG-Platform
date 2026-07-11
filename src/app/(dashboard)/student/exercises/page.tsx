"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import type { ExerciseListItem, ExerciseType } from "@/types";

const EXERCISE_TYPE_META: { type: ExerciseType; label: string; icon: string; description: string }[] = [
  { type: "GRAMMAR", label: "Grammar Puzzles", icon: "🧩", description: "Fill-in-blank, reordering, error correction" },
  { type: "VOCABULARY", label: "Vocabulary Match", icon: "🔤", description: "Match words to their meanings" },
  { type: "TRANSLATION", label: "Translation Challenge", icon: "🌐", description: "Translate between Arabic and English" },
  { type: "LISTENING", label: "Listening Practice", icon: "🎧", description: "Listen and answer comprehension questions" },
  { type: "QUIZ", label: "Speed Quiz", icon: "⚡", description: "Timed multiple choice questions" },
  { type: "CONVERSATION", label: "AI Conversation", icon: "💬", description: "Practice real scenarios with AI" },
  { type: "PICTURE", label: "Picture Description", icon: "🖼️", description: "Describe scenes in English" },
  { type: "STORY", label: "Story Builder", icon: "📖", description: "Build stories collaboratively with AI" },
];

const difficultyColor: Record<string, string> = {
  BEGINNER: "border-leaf bg-leaf-soft text-leaf-text",
  INTERMEDIATE: "border-sun-deep/30 bg-sun-soft text-sun-deep",
  ADVANCED: "border-destructive/30 bg-coral-soft text-destructive",
};

const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { y: 16, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: [0.35, 0.35, 0, 1] as const } } };

export default function StudentExercisesPage() {
  const { data: exercises, loading, error, refetch } = useApi<ExerciseListItem[]>(() => api<ExerciseListItem[]>("/api/exercises"), []);
  const [selectedType, setSelectedType] = useState<ExerciseType | "ALL">("ALL");

  const counts = useMemo(() => {
    const c: Partial<Record<ExerciseType, number>> = {};
    for (const e of exercises ?? []) c[e.type] = (c[e.type] ?? 0) + 1;
    return c;
  }, [exercises]);

  const filtered = useMemo(() => {
    if (!exercises) return [];
    return selectedType === "ALL" ? exercises : exercises.filter((e) => e.type === selectedType);
  }, [exercises, selectedType]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Exercises</h1>
        <p className="mt-1 text-muted-foreground">Choose an exercise type to practice</p>
      </div>

      {loading && <TypeGridSkeleton />}
      {error && !loading && (
        <ErrorCard message={error} onRetry={refetch} />
      )}

      {!loading && !error && (
        <>
          <motion.div initial="hidden" animate="visible" variants={container} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <motion.button variants={item} type="button" onClick={() => setSelectedType("ALL")} className="text-left">
              <TypeCard label="All Exercises" icon="✨" description="Everything in one place" count={exercises?.length ?? 0} active={selectedType === "ALL"} />
            </motion.button>
            {EXERCISE_TYPE_META.map((t) => (
              <motion.button key={t.type} variants={item} type="button" onClick={() => setSelectedType(t.type)} className="text-left">
                <TypeCard label={t.label} icon={t.icon} description={t.description} count={counts[t.type] ?? 0} active={selectedType === t.type} />
              </motion.button>
            ))}
          </motion.div>

          <div>
            <h2 className="mb-4 text-lg font-semibold tracking-tight">
              {selectedType === "ALL" ? "All Exercises" : EXERCISE_TYPE_META.find((t) => t.type === selectedType)?.label}
            </h2>
            {filtered.length === 0 ? (
              <EmptyState />
            ) : (
              <motion.div initial="hidden" animate="visible" variants={container} className="grid gap-3 sm:grid-cols-2">
                {filtered.map((ex) => (
                  <motion.div key={ex.id} variants={item}>
                    <ExerciseCard exercise={ex} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function TypeCard({ label, icon, description, count, active }: { label: string; icon: string; description: string; count: number; active: boolean }) {
  return (
    <div
      className={`h-full rounded-2xl border p-6 transition-all duration-300 ${
        active ? "border-primary bg-secondary" : "border-border bg-card hover:border-border hover:bg-card"
      }`}
    >
      <div className="mb-3 text-3xl">{icon}</div>
      <h3 className="font-semibold tracking-tight text-foreground">{label}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">{count} exercise{count === 1 ? "" : "s"}</p>
    </div>
  );
}

function ExerciseCard({ exercise }: { exercise: ExerciseListItem }) {
  return (
    <Link href={`/student/exercises/${exercise.id}`}>
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:border-border hover:bg-card">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{exercise.title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${difficultyColor[exercise.difficulty]}`}>{exercise.difficulty}</span>
            <span className="text-xs text-muted-foreground">{exercise.points} pts</span>
            {exercise.timeLimit && <span className="text-xs text-muted-foreground">⏱ {exercise.timeLimit}s</span>}
          </div>
        </div>
        {exercise.completed && (
          <div className="ml-3 flex shrink-0 flex-col items-end">
            <span className="text-leaf-text">✓</span>
            {exercise.bestScore !== null && <span className="text-xs text-muted-foreground">{exercise.bestScore}%</span>}
          </div>
        )}
      </div>
    </Link>
  );
}

function TypeGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-36 animate-pulse rounded-2xl border border-border bg-card" />
      ))}
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-destructive/20 bg-coral-soft p-8 text-center">
      <p className="text-foreground">{message}</p>
      <button onClick={onRetry} className="mt-4 rounded-full border border-border px-5 py-2 text-sm text-foreground hover:border-line-strong">
        Retry
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-border bg-card p-10 text-center">
      <p className="text-muted-foreground">No exercises here yet — check back soon or try another type.</p>
    </div>
  );
}
