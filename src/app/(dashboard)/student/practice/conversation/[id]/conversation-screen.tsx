"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import { api, ApiClientError } from "@/lib/api";
import { useT } from "@/components/providers/locale-provider";
import { ResultsScreen } from "@/components/exercise/results-screen";
import { ConversationChat } from "@/components/exercise/conversation-chat";
import type { ExerciseFull } from "../../../_types";
import type { Recommendation } from "@/lib/recommend";
import type { ConversationData, SubmitResponse } from "@/types";

const difficultyColor: Record<string, string> = {
  BEGINNER: "border-leaf bg-leaf-soft text-leaf-text",
  INTERMEDIATE: "border-sun-deep/30 bg-sun-soft text-sun-deep",
  ADVANCED: "border-destructive/30 bg-coral-soft text-destructive",
};

const BACK_HREF = "/student/practice?type=CONVERSATION";

type T = ReturnType<typeof useT>;

export function ConversationScreen({ id }: { id: string }) {
  const router = useRouter();
  const t = useT();
  const { data: exercise, loading, error, refetch } = useApi<ExerciseFull>(() => api<ExerciseFull>(`/api/exercises/${id}`), [id]);
  const [phase, setPhase] = useState<"playing" | "results">("playing");
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [next, setNext] = useState<{ label: string; href: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const forceSubmitRef = useRef<(() => void) | null>(null);
  const timedOutRef = useRef(false);
  const lastPayloadRef = useRef<unknown>(null);
  const persistKey = `sp-conv-${id}`;

  const fetchNext = useCallback(async () => {
    try {
      const { recommendation } = await api<{ recommendation: Recommendation | null }>(`/api/exercises/recommend?exclude=${id}`);
      if (recommendation) {
        // Route CONVERSATION recommendations back through this canonical page (not the generic player).
        const href =
          recommendation.type === "CONVERSATION"
            ? `/student/practice/conversation/${recommendation.id}`
            : `/student/exercises/${recommendation.id}`;
        setNext({ label: t("results.nextPractice", { title: recommendation.title }), href });
        return;
      }
      setNext(null);
    } catch {
      setNext(null);
    }
  }, [id, t]);

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
  }, [exercise?.timeLimit, phase]);

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
      // Clear the persisted transcript only once the submit is confirmed saved —
      // ConversationChat itself stays "dumb" about the network result.
      if (typeof window !== "undefined") {
        try {
          window.sessionStorage.removeItem(persistKey);
        } catch {
          // sessionStorage may be unavailable (private mode) — non-fatal.
        }
      }
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

  /**
   * Native `beforeunload` (handled inside ConversationChat) only covers tab close/
   * refresh — it can't fire for an in-app `<Link>` transition, which Next.js
   * navigates client-side without unloading the document. This reads the same
   * `persistKey` sessionStorage entry ConversationChat already writes to (no new
   * prop needed — the page and component share the one contract) to warn before
   * leaving an unfinished conversation via this link specifically.
   */
  function handleBackClick(e: MouseEvent<HTMLAnchorElement>) {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(persistKey);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 1) {
        if (!window.confirm(t("conversation.leaveWarning"))) e.preventDefault();
      }
    } catch {
      // Malformed storage — let the navigation proceed.
    }
  }

  if (loading) return <ConversationSkeleton />;

  if (error || !exercise) {
    return <ErrorPanel message={error ?? "Exercise not found."} onRetry={refetch} t={t} />;
  }

  if (exercise.type !== "CONVERSATION") {
    return <ErrorPanel message="This isn't a conversation exercise." onRetry={refetch} t={t} />;
  }

  if (phase === "results" && result) {
    return (
      <div className="mx-auto max-w-3xl py-6">
        <ResultsScreen result={result} title={exercise.title} next={next} compact onBack={() => router.push(BACK_HREF)} />
      </div>
    );
  }

  const summary = {
    id: exercise.id,
    title: exercise.title,
    type: exercise.type,
    difficulty: exercise.difficulty,
    points: exercise.points,
    timeLimit: exercise.timeLimit,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={BACK_HREF} onClick={handleBackClick} className="text-xs text-muted-foreground hover:text-foreground">
            ← {t("conversation.back")}
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

      <motion.div dir="ltr" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.35, 0.35, 0, 1] }} className="h-[70vh]">
        <ConversationChat
          exercise={summary}
          data={exercise.data as ConversationData}
          onSubmit={handleSubmit}
          submitting={submitting}
          registerForceSubmit={registerForceSubmit}
          persistKey={persistKey}
        />
      </motion.div>
    </div>
  );
}

function ErrorPanel({ message, onRetry, t }: { message: string; onRetry: () => void; t: T }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-destructive/20 bg-coral-soft p-8 text-center">
      <p className="text-foreground">{message}</p>
      <div className="mt-4 flex justify-center gap-3">
        <button onClick={() => onRetry()} className="rounded-full border border-border px-5 py-2 text-sm text-foreground hover:border-line-strong">
          Retry
        </button>
        <Link href={BACK_HREF} className="rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground">
          {t("conversation.back")}
        </Link>
      </div>
    </div>
  );
}

function ConversationSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-muted" />
      <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
      <div className="h-[70vh] animate-pulse rounded-2xl border border-border bg-card" />
    </div>
  );
}
