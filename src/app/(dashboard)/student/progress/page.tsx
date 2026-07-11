"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useT } from "@/components/providers/locale-provider";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ExerciseTypeBadge } from "@/components/teacher/badges";
import type { ProgressCategory } from "@/types";
import type { MeResponse, ResultSummary, ResultsResponse, ReviewResponse } from "../_types";

type T = ReturnType<typeof useT>;

const ease = [0.35, 0.35, 0, 1] as const;
const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease } } };

const SKILLS: { category: ProgressCategory; key: string; color: string }[] = [
  { category: "GRAMMAR", key: "progress.skillGrammar", color: "bg-primary" },
  { category: "VOCABULARY", key: "progress.skillVocabulary", color: "bg-sun" },
  { category: "LISTENING", key: "progress.skillListening", color: "bg-leaf" },
  { category: "TRANSLATION", key: "progress.skillTranslation", color: "bg-primary" },
  { category: "SPEAKING", key: "progress.skillSpeaking", color: "bg-sun" },
];

/** Local-date comparison — "today" means the same calendar day in the browser's own timezone. */
function isSameLocalDate(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

function scoreClass(score: number): string {
  if (score >= 80) return "text-leaf-text";
  if (score >= 50) return "text-sun-deep";
  return "text-destructive";
}

export default function ProgressPage() {
  const t = useT();
  const me = useApi<MeResponse>(() => api<MeResponse>("/api/me"), []);
  const results = useApi<ResultsResponse>(() => api<ResultsResponse>("/api/results?limit=20"), []);

  if (me.loading || results.loading) return <ProgressSkeleton />;

  if (me.error || !me.data || results.error || !results.data) {
    return (
      <div className="mx-auto max-w-lg rounded-card border-2 border-destructive/20 bg-coral-soft p-8 text-center shadow-sticker">
        <p className="text-foreground">{me.error ?? results.error ?? t("common.error")}</p>
        <Button
          variant="ghost"
          className="mt-4"
          onClick={() => {
            me.refetch();
            results.refetch();
          }}
        >
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  const { user, progress } = me.data;
  const overall = progress.find((p) => p.category === "OVERALL");
  const totalXp = overall?.xp ?? 0;
  const streak = overall?.streak ?? 0;
  const practicedToday = overall ? isSameLocalDate(new Date(overall.updatedAt), new Date()) : false;
  const exercisesPracticed = new Set(results.data.results.map((r) => r.exerciseId)).size;

  return (
    <motion.div initial="hidden" animate="visible" variants={container} className="space-y-8">
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold tracking-tight">{t("progress.title")}</h1>
      </motion.div>

      {overall && (
        <motion.div variants={item}>
          <div
            className={`rounded-card border-2 p-5 shadow-sticker ${
              practicedToday ? "border-leaf/40 bg-leaf-soft" : "border-sun/50 bg-sun-soft"
            }`}
          >
            <p className={`font-medium ${practicedToday ? "text-leaf-text" : "text-sun-deep"}`}>
              {practicedToday ? t("progress.streakSafe", { n: streak }) : t("progress.streakNudge", { n: streak })}
            </p>
          </div>
        </motion.div>
      )}

      <motion.div variants={container} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={item}>
          <StatCard title={t("progress.statLevel")} value={user.level ?? t("progress.notPlaced")} color="violet" />
        </motion.div>
        <motion.div variants={item}>
          <StatCard title={t("progress.statXp")} value={t("path.xp", { n: totalXp })} color="amber" />
        </motion.div>
        <motion.div variants={item}>
          <StatCard title={t("progress.statStreak")} value={t("path.streakDays", { n: streak })} color="orange" />
        </motion.div>
        <motion.div variants={item}>
          <StatCard title={t("progress.statExercises")} value={String(exercisesPracticed)} color="emerald" />
        </motion.div>
      </motion.div>

      <motion.div variants={item}>
        <div className="rounded-card border-2 border-border bg-card p-6 shadow-sticker">
          <h2 className="mb-5 text-lg font-bold tracking-tight">{t("progress.skillsTitle")}</h2>
          <div className="space-y-5">
            {SKILLS.map((s) => (
              <SkillBar
                key={s.category}
                label={t(s.key)}
                value={progress.find((p) => p.category === s.category)?.score ?? 0}
                color={s.color}
              />
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div variants={item}>
        <Link href="/student/placement">
          <div className="rounded-card border-2 border-primary/25 bg-secondary p-6 shadow-sticker transition-colors duration-300 hover:border-primary/50">
            <h2 className="text-lg font-bold tracking-tight text-foreground">{t("progress.refineTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("progress.refineBody")}</p>
          </div>
        </Link>
      </motion.div>

      <motion.div variants={item} className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight">{t("progress.history")}</h2>
        {results.data.results.length === 0 ? (
          <div className="rounded-card border-2 border-border bg-card p-10 text-center shadow-sticker">
            <p className="text-sm text-muted-foreground">{t("progress.noHistory")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.data.results.map((r) => (
              <AttemptRow key={r.id} result={r} t={t} />
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function AttemptRow({ result, t }: { result: ResultSummary; t: T }) {
  const [expanded, setExpanded] = useState(false);
  const dateStr = new Date(result.completedAt).toLocaleDateString();

  return (
    <div className="rounded-card border-2 border-border bg-card p-5 shadow-sticker">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold tracking-tight text-foreground" dir="ltr">
            {result.exerciseTitle}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <ExerciseTypeBadge type={result.type} />
            <span className="text-xs text-muted-foreground">{dateStr}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className={`text-lg font-bold tabular-nums ${scoreClass(result.score)}`}>{result.score}%</span>
          <Button variant="outline" size="sm" onClick={() => setExpanded((e) => !e)}>
            {expanded ? t("progress.hideReview") : t("progress.review")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            render={<Link href={`/student/exercises/${result.exerciseId}`} />}
            nativeButton={false}
            role="link"
          >
            {t("progress.tryAgain")}
          </Button>
        </div>
      </div>
      {expanded && <ReviewPanel resultId={result.id} t={t} />}
    </div>
  );
}

function ReviewPanel({ resultId, t }: { resultId: string; t: T }) {
  const review = useApi<ReviewResponse>(() => api<ReviewResponse>(`/api/results/${resultId}/review`), [resultId]);

  if (review.loading) {
    return (
      <div className="mt-4 space-y-2 border-t border-border pt-4">
        <div className="h-14 animate-pulse rounded-xl bg-muted" />
        <div className="h-14 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (review.error || !review.data) {
    return <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">{t("common.error")}</p>;
  }

  if (!review.data.items) {
    return <p className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">{t("progress.reviewUnavailable")}</p>;
  }

  return (
    <div className="mt-4 space-y-2 border-t border-border pt-4">
      {review.data.items.map((reviewItem, i) => (
        <div
          key={i}
          className={`rounded-xl border p-3 ${
            reviewItem.correct ? "border-leaf/30 bg-leaf-soft" : "border-destructive/20 bg-coral-soft"
          }`}
        >
          <p dir="ltr" className="text-sm font-medium text-foreground">
            {reviewItem.prompt}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              {t("progress.yourAnswer")}:{" "}
              <span dir="ltr" className="font-medium text-foreground">
                {reviewItem.given || "—"}
              </span>
            </span>
            {reviewItem.expected !== null && (
              <span>
                {t("progress.expected")}:{" "}
                <span dir="ltr" className="font-medium text-leaf-text">
                  {reviewItem.expected}
                </span>
              </span>
            )}
          </div>
          {reviewItem.note && (
            <p dir="ltr" className="mt-1.5 text-xs text-muted-foreground">
              {reviewItem.note}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    violet: "bg-secondary",
    amber: "bg-sun-soft",
    orange: "bg-sun-soft",
    emerald: "bg-leaf-soft",
  };
  const dotColors: Record<string, string> = {
    violet: "bg-primary",
    amber: "bg-sun",
    orange: "bg-sun",
    emerald: "bg-leaf",
  };

  return (
    <div className={`rounded-card border-2 border-border p-6 shadow-sticker ${colors[color]}`}>
      <div className="mb-3 flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${dotColors[color]}`} />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{title}</span>
      </div>
      <p className="truncate text-3xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

function SkillBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{value}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ProgressSkeleton() {
  return (
    <div className="space-y-8">
      <div className="h-9 w-56 animate-pulse rounded-lg bg-muted" />
      <div className="h-16 animate-pulse rounded-card bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-card border-2 border-border bg-card shadow-sticker" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-card border-2 border-border bg-card shadow-sticker" />
      <div className="h-32 animate-pulse rounded-card bg-muted" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-card border-2 border-border bg-card shadow-sticker" />
        ))}
      </div>
    </div>
  );
}
