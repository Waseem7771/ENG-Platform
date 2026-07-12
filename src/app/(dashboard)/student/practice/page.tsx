"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useT } from "@/components/providers/locale-provider";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { exerciseHref } from "@/lib/exercise-href";
import { EXERCISE_TYPES, type ExerciseListItem, type ExerciseType, type Level } from "@/types";

type T = ReturnType<typeof useT>;

/** Moved from the old `student/exercises/page.tsx` library — type metadata for filter chips and card badges. */
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

const difficultyColor: Record<Level, string> = {
  BEGINNER: "border-leaf bg-leaf-soft text-leaf-text",
  INTERMEDIATE: "border-sun-deep/30 bg-sun-soft text-sun-deep",
  ADVANCED: "border-destructive/30 bg-coral-soft text-destructive",
};

const LEVELS: Level[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];

const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { y: 16, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: [0.35, 0.35, 0, 1] as const } } };

function PracticeLibrary() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawType = searchParams.get("type");
  const type: ExerciseType | "ALL" = rawType && EXERCISE_TYPES.includes(rawType as ExerciseType) ? (rawType as ExerciseType) : "ALL";
  const rawDifficulty = searchParams.get("difficulty");
  const difficultyParam: Level | "ALL" | null =
    rawDifficulty === "ALL" || (rawDifficulty && LEVELS.includes(rawDifficulty as Level))
      ? (rawDifficulty as Level | "ALL")
      : null;
  const allLevels = difficultyParam === "ALL";

  const qs = useMemo(() => {
    const params = new URLSearchParams();
    if (type !== "ALL") params.set("type", type);
    if (difficultyParam) params.set("difficulty", difficultyParam);
    return params.toString();
  }, [type, difficultyParam]);

  const { data: exercises, loading, error, refetch } = useApi<ExerciseListItem[]>(
    () => api<ExerciseListItem[]>(`/api/exercises${qs ? `?${qs}` : ""}`),
    [qs]
  );

  function replaceParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    const next = params.toString();
    router.replace(next ? `/student/practice?${next}` : "/student/practice");
  }

  function selectType(next: ExerciseType | "ALL") {
    replaceParams({ type: next === "ALL" ? null : next });
  }

  function selectLevel(wantAllLevels: boolean) {
    replaceParams({ difficulty: wantAllLevels ? "ALL" : null });
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={container} className="space-y-8">
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold tracking-tight">{t("practice.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("practice.subtitle")}</p>
      </motion.div>

      <motion.div variants={item} className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip active={type === "ALL"} label={t("practice.all")} onClick={() => selectType("ALL")} />
          {EXERCISE_TYPE_META.map((meta) => (
            <FilterChip key={meta.type} active={type === meta.type} label={meta.label} onClick={() => selectType(meta.type)} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip active={!allLevels} label={t("practice.myLevel")} onClick={() => selectLevel(false)} />
          <FilterChip active={allLevels} label={t("practice.allLevels")} onClick={() => selectLevel(true)} />
        </div>
      </motion.div>

      {loading && <ExerciseGridSkeleton />}

      {error && !loading && (
        <div className="rounded-card border-2 border-destructive/20 bg-coral-soft p-8 text-center shadow-sticker">
          <p className="text-foreground">{error}</p>
          <button
            type="button"
            onClick={refetch}
            className="mt-4 rounded-full border border-border px-5 py-2 text-sm text-foreground hover:border-line-strong"
          >
            {t("common.retry")}
          </button>
        </div>
      )}

      {!loading && !error && exercises && (
        exercises.length === 0 ? (
          <div className="rounded-card border-2 border-border bg-card p-10 text-center shadow-sticker">
            <p className="text-muted-foreground">{t("practice.empty")}</p>
          </div>
        ) : (
          <motion.div initial="hidden" animate="visible" variants={container} className="grid gap-3 sm:grid-cols-2">
            {exercises.map((exercise) => (
              <motion.div key={exercise.id} variants={item}>
                <ExerciseCard exercise={exercise} t={t} />
              </motion.div>
            ))}
          </motion.div>
        )
      )}
    </motion.div>
  );
}

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? "border-primary/40 bg-secondary text-primary" : "border-border bg-muted text-muted-foreground hover:border-line-strong hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function ExerciseCard({ exercise, t }: { exercise: ExerciseListItem; t: T }) {
  const meta = EXERCISE_TYPE_META.find((m) => m.type === exercise.type);
  return (
    <Link href={exerciseHref(exercise.id, exercise.type)}>
      <div className="flex items-center justify-between gap-4 rounded-card border-2 border-border bg-card p-5 shadow-sticker transition-all duration-300 hover:border-line-strong hover:bg-muted">
        <div className="min-w-0">
          <p className="truncate font-semibold tracking-tight text-foreground" dir="ltr">
            {exercise.title}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {meta && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-medium text-foreground">
                <span aria-hidden="true">{meta.icon}</span>
                {meta.label}
              </span>
            )}
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${difficultyColor[exercise.difficulty]}`}>
              {exercise.difficulty}
            </span>
            <span className="text-xs text-muted-foreground">{exercise.points} pts</span>
            {exercise.timeLimit && <span className="text-xs text-muted-foreground">⏱ {exercise.timeLimit}s</span>}
          </div>
        </div>
        {exercise.completed && (
          <div className="ms-3 flex shrink-0 flex-col items-end">
            <span className="text-leaf-text" aria-label={t("practice.completed")}>
              ✓
            </span>
            {exercise.bestScore !== null && (
              <span className="text-xs text-muted-foreground">{t("practice.best", { score: exercise.bestScore })}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

function ExerciseGridSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-card border-2 border-border bg-card shadow-sticker" />
      ))}
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={null}>
      <PracticeLibrary />
    </Suspense>
  );
}
