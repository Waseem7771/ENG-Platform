"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Clock, PenSquare, Plus, Trash2, Users } from "lucide-react";
import { ErrorState, EmptyState, ListSkeleton } from "@/components/teacher/state-views";
import { LevelBadge, ExerciseTypeBadge } from "@/components/teacher/badges";
import { ConfirmDialog } from "@/components/teacher/confirm-dialog";
import { Button } from "@/components/ui/button";
import { api, ApiClientError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useT } from "@/components/providers/locale-provider";
import { EXERCISE_TYPE_META, EXERCISE_TYPES } from "@/lib/exercise-meta";
import { type ExerciseType, type Level } from "@/types";
import type { TeacherExerciseListItem } from "@/components/teacher/types";

const DIFFICULTIES: Level[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];

export default function TeacherExercisesPage() {
  const t = useT();
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
      setError(e instanceof ApiClientError ? e.message : t("teacher.loadExercisesFailed"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      toast.success(t("teacher.exerciseDeleted"));
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : t("teacher.deleteExerciseFailed"));
    }
  }

  return (
    <div className="relative min-h-screen">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("teacher.exercisesTitle")}</h1>
          <p className="mt-1 text-muted-foreground">{t("teacher.exercisesSubtitle")}</p>
        </div>
        <Button render={<Link href="/teacher/content/exercises/new" />} nativeButton={false} role="link">
          <Plus className="h-4 w-4" />
          {t("teacher.newExercise")}
        </Button>
      </div>

      {!loading && !error && exercises && exercises.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <FilterChip active={typeFilter === "ALL"} onClick={() => setTypeFilter("ALL")} label={t("teacher.allTypes")} />
          {EXERCISE_TYPES.map((tp) => (
            <FilterChip key={tp} active={typeFilter === tp} onClick={() => setTypeFilter(tp)} label={EXERCISE_TYPE_META[tp].label} />
          ))}
          <div className="mx-1 h-5 w-px bg-muted" />
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value as Level | "ALL")}
            className="h-8 rounded-full border border-border bg-muted px-3 text-xs font-medium text-muted-foreground outline-none focus:border-primary/50"
          >
            <option value="ALL">{t("teacher.allLevels")}</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {t(`level.${d.toLowerCase()}`)}
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
          title={t("teacher.noExercisesTitle")}
          description={t("teacher.noExercisesDescription")}
        />
      )}

      {!loading && !error && exercises && exercises.length > 0 && filtered.length === 0 && (
        <EmptyState title={t("teacher.noExercisesMatchTitle")} description={t("teacher.noExercisesMatchDescription")} />
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
              <ExerciseRow exercise={ex} onDelete={() => handleDelete(ex.id)} t={t} />
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
        active ? "border-primary/40 bg-secondary text-primary" : "border-border bg-muted text-muted-foreground hover:border-line-strong hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

function ExerciseRow({
  exercise,
  onDelete,
  t,
}: {
  exercise: TeacherExerciseListItem;
  onDelete: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  return (
    <div className="rounded-card border-2 border-border bg-card shadow-sticker p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href={`/teacher/content/exercises/${exercise.id}/edit`} className="block min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-foreground">{exercise.title}</h3>
            <ExerciseTypeBadge type={exercise.type} />
            <LevelBadge level={exercise.difficulty} />
            {exercise.status === "DRAFT" && (
              <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {t("teacher.draft")}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {exercise.resultsCount === 1
                ? t("teacher.attemptCount", { n: exercise.resultsCount })
                : t("teacher.attemptsCount", { n: exercise.resultsCount })}
            </span>
            <span>{t("teacher.pointsAbbrev", { n: exercise.points })}</span>
            {exercise.timeLimit && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {t("teacher.secondsAbbrev", { n: exercise.timeLimit })}
              </span>
            )}
          </div>
        </Link>
        <ConfirmDialog
          trigger={
            <button className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/30 hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
              {t("teacher.delete")}
            </button>
          }
          title={t("teacher.deleteExerciseTitle", { title: exercise.title })}
          description={t("teacher.deleteExerciseDescription")}
          confirmLabel={t("teacher.deleteExercise")}
          destructive
          onConfirm={onDelete}
        />
      </div>
    </div>
  );
}
