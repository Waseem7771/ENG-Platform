"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Clock, PenSquare, Trash2, Users } from "lucide-react";
import { FloatingParticles } from "@/components/shared/floating-particles";
import { SpotlightCard } from "@/components/shared/spotlight-card";
import { ErrorState, EmptyState, ListSkeleton } from "@/components/teacher/state-views";
import { LevelBadge, ExerciseTypeBadge, EXERCISE_TYPE_META } from "@/components/teacher/badges";
import { ConfirmDialog } from "@/components/teacher/confirm-dialog";
import { ExerciseFormDialog } from "@/components/teacher/exercise-form/exercise-form-dialog";
import { api, ApiClientError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { EXERCISE_TYPES, type ExerciseType, type Level } from "@/types";
import type { TeacherExerciseListItem } from "@/components/teacher/types";

const DIFFICULTIES: Level[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];

export default function TeacherExercisesPage() {
  const [exercises, setExercises] = useState<TeacherExerciseListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<ExerciseType | "ALL">("ALL");
  const [difficultyFilter, setDifficultyFilter] = useState<Level | "ALL">("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<TeacherExerciseListItem[]>("/api/exercises");
      setExercises(data);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Couldn't load your exercises.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!exercises) return [];
    return exercises.filter(
      (ex) => (typeFilter === "ALL" || ex.type === typeFilter) && (difficultyFilter === "ALL" || ex.difficulty === difficultyFilter)
    );
  }, [exercises, typeFilter, difficultyFilter]);

  async function handleDelete(id: string) {
    try {
      await api(`/api/exercises/${id}`, { method: "DELETE" });
      setExercises((prev) => prev?.filter((ex) => ex.id !== id) ?? null);
      toast.success("Exercise deleted");
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Couldn't delete this exercise.");
    }
  }

  return (
    <div className="relative min-h-screen">
      <FloatingParticles count={10} />

      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exercises</h1>
          <p className="mt-1 text-white/40">Build content your students will practice with.</p>
        </div>
        <ExerciseFormDialog onCreated={load} />
      </div>

      {!loading && !error && exercises && exercises.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <FilterChip active={typeFilter === "ALL"} onClick={() => setTypeFilter("ALL")} label="All types" />
          {EXERCISE_TYPES.map((t) => (
            <FilterChip key={t} active={typeFilter === t} onClick={() => setTypeFilter(t)} label={EXERCISE_TYPE_META[t].label} />
          ))}
          <div className="mx-1 h-5 w-px bg-white/10" />
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value as Level | "ALL")}
            className="h-8 rounded-full border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/60 outline-none focus:border-violet-500/50"
          >
            <option value="ALL">All levels</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d.charAt(0) + d.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading && <ListSkeleton count={6} />}

      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && exercises && exercises.length === 0 && (
        <EmptyState
          icon={<PenSquare className="h-6 w-6" />}
          title="No exercises yet"
          description="Create grammar puzzles, vocabulary games, translation challenges, and more for your students."
        />
      )}

      {!loading && !error && exercises && exercises.length > 0 && filtered.length === 0 && (
        <EmptyState title="No exercises match these filters" description="Try a different type or difficulty." />
      )}

      {!loading && !error && filtered.length > 0 && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
          className="space-y-3"
        >
          {filtered.map((ex) => (
            <motion.div key={ex.id} variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
              <ExerciseRow exercise={ex} onDelete={() => handleDelete(ex.id)} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "border-violet-500/40 bg-violet-500/15 text-violet-200" : "border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white/70"
      )}
    >
      {label}
    </button>
  );
}

function ExerciseRow({ exercise, onDelete }: { exercise: TeacherExerciseListItem; onDelete: () => void }) {
  return (
    <SpotlightCard className="rounded-2xl border-white/5 bg-white/[0.02] p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-white/90">{exercise.title}</h3>
            <ExerciseTypeBadge type={exercise.type} />
            <LevelBadge level={exercise.difficulty} />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-white/40">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {exercise.resultsCount} attempt{exercise.resultsCount === 1 ? "" : "s"}
            </span>
            <span>{exercise.points} pts</span>
            {exercise.timeLimit && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {exercise.timeLimit}s
              </span>
            )}
          </div>
        </div>
        <ConfirmDialog
          trigger={
            <button className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-white/50 transition-colors hover:border-red-500/30 hover:text-red-400">
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          }
          title={`Delete "${exercise.title}"?`}
          description="Students will no longer be able to practice this exercise. This can't be undone."
          confirmLabel="Delete exercise"
          destructive
          onConfirm={onDelete}
        />
      </div>
    </SpotlightCard>
  );
}
