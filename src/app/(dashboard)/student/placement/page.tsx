"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import { api, ApiClientError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/shared/score-ring";
import type { PlacementQuestionPublic, PlacementResult } from "@/types";

interface PlacementGetResponse {
  questions: PlacementQuestionPublic[];
  taken: boolean;
  lastResult?: PlacementResult;
}

const levelColor: Record<string, string> = {
  BEGINNER: "border-leaf bg-leaf-soft text-leaf-text",
  INTERMEDIATE: "border-sun-deep/30 bg-sun-soft text-sun-deep",
  ADVANCED: "border-primary/30 bg-secondary text-primary",
};

export default function PlacementExamPage() {
  const router = useRouter();
  const { data, loading, error, refetch } = useApi<PlacementGetResponse>(() => api<PlacementGetResponse>("/api/placement"), []);
  const [phase, setPhase] = useState<"intro" | "exam" | "results">("intro");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PlacementResult | null>(null);

  if (loading) return <PlacementSkeleton />;
  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-destructive/20 bg-coral-soft p-8 text-center">
        <p className="text-foreground">{error ?? "Couldn't load the placement exam."}</p>
        <button onClick={() => refetch()} className="mt-4 rounded-full border border-border px-5 py-2 text-sm text-foreground hover:border-line-strong">
          Retry
        </button>
      </div>
    );
  }

  function startExam() {
    setAnswers({});
    setQIndex(0);
    setResult(null);
    setPhase("exam");
  }

  async function submitExam() {
    setSubmitting(true);
    try {
      const res = await api<PlacementResult>("/api/placement", { method: "POST", body: JSON.stringify({ answers }) });
      setResult(res);
      setPhase("results");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't submit your exam.");
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === "intro") {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-8 text-3xl font-bold tracking-tight">Placement Exam</h1>
        <div className="rounded-2xl border border-border bg-card p-7">
          <h2 className="text-xl font-semibold tracking-tight">Find Your Level</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Take a quick exam to determine your English level. This helps us personalize your learning experience.
          </p>

          {data.taken && data.lastResult && (
            <div className="mt-6 rounded-xl border border-border bg-card p-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Your last result</p>
              <div className="mt-2 flex items-center gap-4">
                <span className="text-2xl font-bold">{data.lastResult.score}%</span>
                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${levelColor[data.lastResult.level]}`}>{data.lastResult.level}</span>
              </div>
            </div>
          )}

          <div className="mt-6 grid gap-3">
            <InfoRow icon="📝" title={`${data.questions.length} Questions`} subtitle="Grammar, vocabulary, and reading" />
            <InfoRow icon="⏱️" title="About 15 minutes" subtitle="Take your time, no rush" />
            <InfoRow icon="🎯" title="3 Levels" subtitle="Beginner, Intermediate, Advanced" />
          </div>

          <Button onClick={startExam} className="mt-7 w-full">
            {data.taken ? "Retake Exam" : "Start Exam"}
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "exam") {
    const question = data.questions[qIndex];
    const isLast = qIndex === data.questions.length - 1;
    const answered = !!answers[question.id];

    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <div className="mb-2 flex justify-between text-xs text-muted-foreground">
            <span>Question {qIndex + 1} of {data.questions.length}</span>
            <span className="rounded-full border border-border px-2 py-0.5 uppercase tracking-wider">{question.category}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-primary"
              animate={{ width: `${((qIndex + 1) / data.questions.length) * 100}%` }}
              transition={{ duration: 0.4, ease: [0.35, 0.35, 0, 1] }}
            />
          </div>
        </div>

        {question.passage && (
          <div className="rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed text-muted-foreground">{question.passage}</div>
        )}

        <p className="text-lg font-medium tracking-tight text-foreground">{question.question}</p>

        <div className="space-y-3">
          {question.options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setAnswers((a) => ({ ...a, [question.id]: opt }))}
              className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all duration-200 ${
                answers[question.id] === opt ? "border-primary/50 bg-secondary text-foreground" : "border-border bg-card text-foreground hover:border-line-strong"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        <div className="flex justify-between gap-3">
          <button
            type="button"
            disabled={qIndex === 0}
            onClick={() => setQIndex((i) => i - 1)}
            className="rounded-full border border-border px-6 py-2.5 text-sm text-foreground disabled:opacity-30"
          >
            Back
          </button>
          <button
            type="button"
            disabled={!answered || submitting}
            onClick={() => (isLast ? submitExam() : setQIndex((i) => i + 1))}
            className="rounded-full bg-primary px-8 py-2.5 text-sm font-medium uppercase tracking-wider text-primary-foreground disabled:opacity-30"
          >
            {isLast ? (submitting ? "Submitting…" : "Submit") : "Next"}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "results" && result) {
    return (
      <div className="mx-auto max-w-2xl space-y-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Your Results</h1>
        <div className="flex flex-col items-center gap-4">
          <ScoreRing score={result.score} label="overall" />
          <span className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${levelColor[result.level]}`}>{result.level}</span>
          <span className="rounded-full border border-sun-deep/30 bg-sun-soft px-3 py-1 text-xs font-semibold text-sun-deep">+50 XP completion bonus</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <BreakdownBar label="Grammar" value={result.breakdown.grammar} />
          <BreakdownBar label="Vocabulary" value={result.breakdown.vocabulary} />
          <BreakdownBar label="Reading" value={result.breakdown.reading} />
        </div>

        <Button onClick={() => router.push("/student")} className="w-full sm:w-auto">
          Continue to Dashboard
        </Button>
      </div>
    );
  }

  return null;
}

function InfoRow({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function BreakdownBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-left">
      <div className="mb-2 flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{value}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function PlacementSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="h-9 w-56 animate-pulse rounded-lg bg-muted" />
      <div className="h-80 animate-pulse rounded-2xl border border-border bg-card" />
    </div>
  );
}
