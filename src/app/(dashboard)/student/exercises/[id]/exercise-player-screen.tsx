"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import { api, ApiClientError } from "@/lib/api";
import { useT } from "@/components/providers/locale-provider";
import { ResultsScreen } from "@/components/exercise/results-screen";
import { renderPlayer } from "@/components/exercise/render-player";
import { exerciseHref } from "@/lib/exercise-href";
import type { ExerciseFull } from "../../_types";
import type { PathResponse } from "@/lib/path";
import type { Recommendation } from "@/lib/recommend";
import type { SubmitResponse } from "@/types";

const difficultyColor: Record<string, string> = {
  BEGINNER: "border-leaf bg-leaf-soft text-leaf-text",
  INTERMEDIATE: "border-sun-deep/30 bg-sun-soft text-sun-deep",
  ADVANCED: "border-destructive/30 bg-coral-soft text-destructive",
};

export function ExercisePlayerScreen({ id }: { id: string }) {
  const router = useRouter();
  const t = useT();
  const { data: exercise, loading, error, refetch } = useApi<ExerciseFull>(() => api<ExerciseFull>(`/api/exercises/${id}`), [id]);
  const [phase, setPhase] = useState<"playing" | "results">("playing");
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [next, setNext] = useState<{ label: string; href: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const forceSubmitRef = useRef<(() => void) | null>(null);
  const timedOutRef = useRef(false);
  const lastPayloadRef = useRef<unknown>(null);

  const fetchNext = useCallback(async () => {
    try {
      if (exercise?.lessonId) {
        const path = await api<PathResponse>("/api/path");
        if (path.continue) {
          setNext({
            label: t("results.nextLesson", { title: path.continue.exerciseTitle }),
            href: exerciseHref(path.continue.exerciseId, path.continue.type),
          });
          return;
        }
        setNext(null);
        return;
      }
      const { recommendation } = await api<{ recommendation: Recommendation | null }>(`/api/exercises/recommend?exclude=${id}`);
      if (recommendation) {
        setNext({
          label: t("results.nextPractice", { title: recommendation.title }),
          href: exerciseHref(recommendation.id, recommendation.type),
        });
        return;
      }
      setNext(null);
    } catch {
      setNext(null);
    }
  }, [exercise?.lessonId, id, t]);

  const registerForceSubmit = useCallback((fn: () => void) => {
    forceSubmitRef.current = fn;
  }, []);

  useEffect(() => {
    if (!exercise?.timeLimit || phase !== "playing") return;
    timedOutRef.current = false;
    setTimeLeft(exercise.timeLimit);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          if (!timedOutRef.current) {
            timedOutRef.current = true;
            toast.info("Time's up — submitting your answers.");
            forceSubmitRef.current?.();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [exercise?.timeLimit, phase, retryKey]);

  async function handleSubmit(payload: unknown) {
    if (submitting) return;
    lastPayloadRef.current = payload;
    setSubmitFailed(false);
    setSubmitting(true);
    try {
      const res = await api<SubmitResponse>(`/api/exercises/${id}/submit`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setResult(res);
      setPhase("results");
      setNext(null);
      toast.success(`Scored ${res.score}% · +${res.xpEarned} XP`);
      // Fetch the follow-up CTA after showing results — must not block the results screen.
      fetchNext();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't submit your answers. Try again.");
      setSubmitFailed(true);
    } finally {
      setSubmitting(false);
    }
  }

  function retrySubmit() {
    if (lastPayloadRef.current !== null) handleSubmit(lastPayloadRef.current);
  }

  if (loading) return <PlayerSkeleton />;
  if (error || !exercise) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-destructive/20 bg-coral-soft p-8 text-center">
        <p className="text-foreground">{error ?? "Exercise not found."}</p>
        <div className="mt-4 flex justify-center gap-3">
          <button onClick={() => refetch()} className="rounded-full border border-border px-5 py-2 text-sm text-foreground hover:border-line-strong">
            Retry
          </button>
          <Link href="/student/exercises" className="rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground">
            Back to Exercises
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "results" && result) {
    return (
      <div className="mx-auto max-w-3xl py-6">
        <ResultsScreen
          result={result}
          title={exercise.title}
          next={next}
          onRetry={() => {
            setPhase("playing");
            setResult(null);
            setNext(null);
            setRetryKey((k) => k + 1);
          }}
          onBack={() => router.push("/student/exercises")}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/student/exercises" className="text-xs text-muted-foreground hover:text-foreground">
            ← Back to Exercises
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{exercise.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${difficultyColor[exercise.difficulty]}`}>{exercise.difficulty}</span>
          <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">{exercise.points} pts</span>
          {timeLeft !== null && (
            <span className={`rounded-full border px-3 py-1 text-xs font-mono ${timeLeft <= 10 ? "border-destructive bg-coral-soft text-destructive" : "border-border bg-card text-muted-foreground"}`}>
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
            </span>
          )}
        </div>
      </div>

      {submitFailed && !submitting && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-coral-soft px-4 py-3 text-sm text-destructive">
          <span>Your last submission failed to save.</span>
          <button
            type="button"
            onClick={retrySubmit}
            className="shrink-0 rounded-full border border-destructive/30 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-destructive transition hover:border-destructive/50"
          >
            Try again
          </button>
        </div>
      )}

      <motion.div dir="ltr" key={retryKey} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.35, 0.35, 0, 1] }}>
        {renderPlayer(exercise, handleSubmit, submitting, registerForceSubmit)}
      </motion.div>
    </div>
  );
}

function PlayerSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-muted" />
      <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
      <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
    </div>
  );
}
