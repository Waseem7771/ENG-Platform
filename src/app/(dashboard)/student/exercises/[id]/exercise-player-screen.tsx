"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import { api, ApiClientError } from "@/lib/api";
import { ResultsScreen } from "@/components/exercise/results-screen";
import { GrammarPlayer } from "@/components/exercise/grammar-player";
import { VocabMatch } from "@/components/exercise/vocab-match";
import { TranslationPlayer } from "@/components/exercise/translation-player";
import { ListeningPlayer } from "@/components/exercise/listening-player";
import { SpeedQuiz } from "@/components/exercise/speed-quiz";
import { ConversationChat } from "@/components/exercise/conversation-chat";
import { PicturePlayer } from "@/components/exercise/picture-player";
import { StoryPlayer } from "@/components/exercise/story-player";
import type { ExerciseFull } from "../../_types";
import type {
  ConversationData,
  GrammarData,
  ListeningData,
  PictureData,
  QuizData,
  StoryData,
  SubmitResponse,
  TranslationData,
  VocabularyData,
} from "@/types";

const difficultyColor: Record<string, string> = {
  BEGINNER: "border-leaf bg-leaf-soft text-leaf-text",
  INTERMEDIATE: "border-sun-deep/30 bg-sun-soft text-sun-deep",
  ADVANCED: "border-destructive/30 bg-coral-soft text-destructive",
};

export function ExercisePlayerScreen({ id }: { id: string }) {
  const router = useRouter();
  const { data: exercise, loading, error, refetch } = useApi<ExerciseFull>(() => api<ExerciseFull>(`/api/exercises/${id}`), [id]);
  const [phase, setPhase] = useState<"playing" | "results">("playing");
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const forceSubmitRef = useRef<(() => void) | null>(null);
  const timedOutRef = useRef(false);
  const lastPayloadRef = useRef<unknown>(null);

  const registerForceSubmit = useCallback((fn: () => void) => {
    forceSubmitRef.current = fn;
  }, []);

  useEffect(() => {
    if (!exercise?.timeLimit || phase !== "playing") return;
    timedOutRef.current = false;
    setTimeLeft(exercise.timeLimit);
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t === null) return t;
        if (t <= 1) {
          if (!timedOutRef.current) {
            timedOutRef.current = true;
            toast.info("Time's up — submitting your answers.");
            forceSubmitRef.current?.();
          }
          return 0;
        }
        return t - 1;
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
      toast.success(`Scored ${res.score}% · +${res.xpEarned} XP`);
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
          onRetry={() => {
            setPhase("playing");
            setResult(null);
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

      <motion.div key={retryKey} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.35, 0.35, 0, 1] }}>
        {renderPlayer(exercise, handleSubmit, submitting, registerForceSubmit)}
      </motion.div>
    </div>
  );
}

function renderPlayer(
  exercise: ExerciseFull,
  onSubmit: (payload: unknown) => void,
  submitting: boolean,
  registerForceSubmit: (fn: () => void) => void
) {
  const summary = { id: exercise.id, title: exercise.title, type: exercise.type, difficulty: exercise.difficulty, points: exercise.points, timeLimit: exercise.timeLimit };
  switch (exercise.type) {
    case "GRAMMAR":
      return <GrammarPlayer exercise={summary} data={exercise.data as GrammarData} onSubmit={onSubmit} submitting={submitting} registerForceSubmit={registerForceSubmit} />;
    case "VOCABULARY":
      return <VocabMatch exercise={summary} data={exercise.data as VocabularyData} onSubmit={onSubmit} submitting={submitting} registerForceSubmit={registerForceSubmit} />;
    case "TRANSLATION":
      return <TranslationPlayer exercise={summary} data={exercise.data as TranslationData} onSubmit={onSubmit} submitting={submitting} registerForceSubmit={registerForceSubmit} />;
    case "LISTENING":
      return <ListeningPlayer exercise={summary} data={exercise.data as ListeningData} onSubmit={onSubmit} submitting={submitting} registerForceSubmit={registerForceSubmit} />;
    case "QUIZ":
      return <SpeedQuiz exercise={summary} data={exercise.data as QuizData} onSubmit={onSubmit} submitting={submitting} registerForceSubmit={registerForceSubmit} />;
    case "CONVERSATION":
      return (
        <div className="h-[70vh]">
          <ConversationChat exercise={summary} data={exercise.data as ConversationData} onSubmit={onSubmit} submitting={submitting} registerForceSubmit={registerForceSubmit} />
        </div>
      );
    case "PICTURE":
      return <PicturePlayer exercise={summary} data={exercise.data as PictureData} onSubmit={onSubmit} submitting={submitting} registerForceSubmit={registerForceSubmit} />;
    case "STORY":
      return (
        <div className="h-[70vh]">
          <StoryPlayer exercise={summary} data={exercise.data as StoryData} onSubmit={onSubmit} submitting={submitting} registerForceSubmit={registerForceSubmit} />
        </div>
      );
    default:
      return <p className="text-muted-foreground">This exercise type isn&apos;t supported yet.</p>;
  }
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
