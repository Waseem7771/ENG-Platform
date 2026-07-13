"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import { api, ApiClientError } from "@/lib/api";
import { useT } from "@/components/providers/locale-provider";
import { ResultsScreen } from "@/components/exercise/results-screen";
import { renderPlayer } from "@/components/exercise/render-player";
import { buildSubmitBody } from "@/components/exercise/submit-body";
import { Button } from "@/components/ui/button";
import type { ExerciseFull } from "@/app/(dashboard)/student/_types";
import type { SubmitResponse } from "@/types";

/**
 * Plays a pushed exercise INSIDE the live-session room — the student is never
 * ejected to /student/exercises/[id]. It fetches the same redacted-but-playable
 * ExerciseFull the standalone page uses (GET /api/exercises/[id] — student
 * redaction + DRAFT-404 inherited), renders it through the shared renderPlayer,
 * and submits with the session id attached so the result is attributed to this
 * live session (the server re-validates that id, per Task 5).
 */
export function EmbeddedExercise({
  exerciseId,
  sessionId,
  onDone,
}: {
  exerciseId: string;
  sessionId: string;
  onDone: () => void;
}) {
  const t = useT();
  const { data: exercise, loading, error, refetch } = useApi<ExerciseFull>(
    () => api<ExerciseFull>(`/api/exercises/${exerciseId}`),
    [exerciseId]
  );
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const forceSubmitRef = useRef<(() => void) | null>(null);
  const timedOutRef = useRef(false);

  const registerForceSubmit = useCallback((fn: () => void) => {
    forceSubmitRef.current = fn;
  }, []);

  // Timed pushes (e.g. a SpeedQuiz with a timeLimit) must still enforce their
  // limit in-room: mirror the exercise page's countdown, which fires the
  // player's registered force-submit exactly once when it hits zero.
  useEffect(() => {
    if (!exercise?.timeLimit || result) return;
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
  }, [exercise?.timeLimit, result]);

  const handleSubmit = useCallback(
    async (payload: unknown) => {
      if (submitting) return;
      setSubmitting(true);
      try {
        const res = await api<SubmitResponse>(`/api/exercises/${exerciseId}/submit`, {
          method: "POST",
          body: JSON.stringify(buildSubmitBody(payload, sessionId)),
        });
        setResult(res);
        toast.success(`Scored ${res.score}% · +${res.xpEarned} XP`);
      } catch (err) {
        toast.error(err instanceof ApiClientError ? err.message : "Couldn't submit your answers. Try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [exerciseId, sessionId, submitting]
  );

  if (loading) return <EmbeddedSkeleton />;

  if (error || !exercise) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-coral-soft p-6 text-center text-sm">
        <p className="text-foreground">{error ?? t("session.loadFailed")}</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {t("common.retry")}
          </Button>
          <Button variant="ghost" size="sm" onClick={onDone}>
            {t("session.completedInRoom")}
          </Button>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div dir="ltr">
        <ResultsScreen
          result={result}
          title={exercise.title}
          compact
          onBack={onDone}
          backLabel={t("session.completedInRoom")}
        />
      </div>
    );
  }

  return (
    <div dir="ltr" className="space-y-4">
      {timeLeft !== null && (
        <div className="flex justify-end">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-mono ${
              timeLeft <= 10
                ? "border-destructive bg-coral-soft text-destructive"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
          </span>
        </div>
      )}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.35, 0.35, 0, 1] }}
      >
        {renderPlayer(exercise, handleSubmit, submitting, registerForceSubmit)}
      </motion.div>
    </div>
  );
}

function EmbeddedSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-40 animate-pulse rounded-lg bg-muted" />
      <div className="h-56 animate-pulse rounded-2xl border border-border bg-card" />
    </div>
  );
}
