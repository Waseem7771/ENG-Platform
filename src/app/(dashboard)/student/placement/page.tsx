"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import { api, ApiClientError } from "@/lib/api";
import { useT } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/shared/score-ring";
import type { PlacementQuestionPublic, PlacementResult } from "@/types";

interface PlacementGetResponse {
  questions: PlacementQuestionPublic[];
  taken: boolean;
  lastResult?: PlacementResult;
}

interface PlacementDraft {
  answers: Record<string, string>;
  qIndex: number;
}

const DRAFT_KEY = "sp-placement-draft";

const levelColor: Record<string, string> = {
  BEGINNER: "border-leaf bg-leaf-soft text-leaf-text",
  INTERMEDIATE: "border-sun-deep/30 bg-sun-soft text-sun-deep",
  ADVANCED: "border-primary/30 bg-secondary text-primary",
};

function readDraft(): PlacementDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      "answers" in parsed &&
      "qIndex" in parsed &&
      typeof (parsed as PlacementDraft).qIndex === "number" &&
      typeof (parsed as PlacementDraft).answers === "object"
    ) {
      return parsed as PlacementDraft;
    }
    return null;
  } catch {
    return null;
  }
}

function writeDraft(draft: PlacementDraft) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // localStorage may be unavailable (private mode / quota) — non-fatal.
  }
}

function clearDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // non-fatal
  }
}

export default function PlacementExamPage() {
  const router = useRouter();
  const t = useT();
  const { data, loading, error, refetch } = useApi<PlacementGetResponse>(() => api<PlacementGetResponse>("/api/placement"), []);
  const [phase, setPhase] = useState<"intro" | "exam" | "review" | "results">("intro");
  const [qIndex, setQIndex] = useState(() => readDraft()?.qIndex ?? 0);
  const [answers, setAnswers] = useState<Record<string, string>>(() => readDraft()?.answers ?? {});
  const [hasDraft, setHasDraft] = useState(() => readDraft() !== null);
  const [reviewVisited, setReviewVisited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PlacementResult | null>(null);

  // Mirror in-progress answers to localStorage while the exam or review stage is active.
  useEffect(() => {
    if (phase !== "exam" && phase !== "review") return;
    if (Object.keys(answers).length === 0) return;
    writeDraft({ answers, qIndex });
    setHasDraft(true);
  }, [answers, qIndex, phase]);

  // Warn before an accidental tab close / refresh while there's unsaved exam progress.
  useEffect(() => {
    if (phase !== "exam" && phase !== "review") return;
    if (Object.keys(answers).length === 0) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [phase, answers]);

  if (loading) return <PlacementSkeleton />;
  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-destructive/20 bg-coral-soft p-8 text-center">
        <p className="text-foreground">{error ?? t("common.error")}</p>
        <button onClick={() => refetch()} className="mt-4 rounded-full border border-border px-5 py-2 text-sm text-foreground hover:border-line-strong">
          {t("common.retry")}
        </button>
      </div>
    );
  }

  function startExam() {
    setAnswers({});
    setQIndex(0);
    setResult(null);
    setReviewVisited(false);
    clearDraft();
    setHasDraft(false);
    setPhase("exam");
  }

  function resumeExam() {
    const draft = readDraft();
    if (draft) {
      setAnswers(draft.answers);
      setQIndex(draft.qIndex);
    }
    setReviewVisited(false);
    setPhase("exam");
  }

  function goToReview() {
    setReviewVisited(true);
    setPhase("review");
  }

  function handleCloseOverlay() {
    if (window.confirm(t("placement.leaveConfirm"))) {
      setPhase("intro");
    }
  }

  async function submitExam() {
    setSubmitting(true);
    try {
      const res = await api<PlacementResult>("/api/placement", { method: "POST", body: JSON.stringify({ answers }) });
      clearDraft();
      setHasDraft(false);
      setResult(res);
      setPhase("results");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t("common.error"));
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === "intro") {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-8 text-3xl font-bold tracking-tight">{t("placement.title")}</h1>
        <div className="rounded-2xl border border-border bg-card p-7">
          <h2 className="text-xl font-semibold tracking-tight">{data.taken ? t("placement.refineTitle") : t("placement.findTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {data.taken && data.lastResult ? t("placement.refineBody", { level: data.lastResult.level }) : t("placement.findBody")}
          </p>

          {data.taken && data.lastResult && (
            <div className="mt-6 rounded-xl border border-border bg-card p-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("placement.lastResult")}</p>
              <div className="mt-2 flex items-center gap-4">
                <span className="text-2xl font-bold">{data.lastResult.score}%</span>
                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${levelColor[data.lastResult.level]}`}>{data.lastResult.level}</span>
              </div>
            </div>
          )}

          <div className="mt-6 grid gap-3">
            <InfoRow icon="📝" title={t("placement.questionsCount", { n: data.questions.length })} subtitle={t("placement.questionsSub")} />
            <InfoRow icon="⏱️" title={t("placement.timeEstimate")} subtitle={t("placement.timeSub")} />
            <InfoRow icon="🎯" title={t("placement.levelsCount")} subtitle={t("placement.levelsSub")} />
          </div>

          <Button onClick={startExam} className="mt-7 w-full">
            {data.taken ? t("placement.retake") : t("placement.start")}
          </Button>

          {hasDraft && (
            <Button variant="ghost" onClick={resumeExam} className="mt-3 w-full">
              {t("placement.resume")}
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (phase === "exam") {
    const question = data.questions[qIndex];
    const isLast = qIndex === data.questions.length - 1;
    const answered = !!answers[question.id];

    return (
      <ExamOverlay onClose={handleCloseOverlay} closeLabel={t("common.close")}>
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
          <div>
            <div className="mb-2 flex justify-between text-xs text-muted-foreground">
              <span>{t("placement.questionOf", { n: qIndex + 1, total: data.questions.length })}</span>
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

          <div dir="ltr" className="space-y-6 text-start">
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
                  className={`w-full rounded-xl border px-4 py-3 text-start text-sm font-medium transition-all duration-200 ${
                    answers[question.id] === opt ? "border-primary/50 bg-secondary text-foreground" : "border-border bg-card text-foreground hover:border-line-strong"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={qIndex === 0}
              onClick={() => setQIndex((i) => i - 1)}
              className="rounded-full border border-border px-6 py-2.5 text-sm text-foreground disabled:opacity-30"
            >
              {t("common.back")}
            </button>
            {reviewVisited && (
              <button
                type="button"
                onClick={goToReview}
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {t("placement.backToReview")}
              </button>
            )}
            <button
              type="button"
              disabled={!answered}
              onClick={() => (isLast ? goToReview() : setQIndex((i) => i + 1))}
              className="rounded-full bg-primary px-8 py-2.5 text-sm font-medium uppercase tracking-wider text-primary-foreground disabled:opacity-30"
            >
              {t("common.next")}
            </button>
          </div>
        </div>
      </ExamOverlay>
    );
  }

  if (phase === "review") {
    const unansweredCount = data.questions.filter((q) => !answers[q.id]).length;

    return (
      <ExamOverlay onClose={handleCloseOverlay} closeLabel={t("common.close")}>
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
          <h1 className="text-2xl font-bold tracking-tight">{t("placement.reviewTitle")}</h1>

          <div className="grid grid-cols-5 gap-3">
            {data.questions.map((q, i) => {
              const isAnswered = !!answers[q.id];
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    setQIndex(i);
                    setPhase("exam");
                  }}
                  className={`flex h-12 items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
                    isAnswered ? "bg-secondary text-secondary-foreground" : "border-2 border-line-strong bg-card text-foreground"
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          {unansweredCount > 0 && (
            <p className="text-center text-sm text-muted-foreground">{t("placement.unanswered", { n: unansweredCount })}</p>
          )}

          <Button onClick={submitExam} disabled={submitting} className="w-full">
            {submitting ? t("common.loading") : t("placement.submit")}
          </Button>
        </div>
      </ExamOverlay>
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

function ExamOverlay({ children, onClose, closeLabel }: { children: React.ReactNode; onClose: () => void; closeLabel: string }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <Button type="button" variant="ghost" size="icon" onClick={onClose} className="absolute end-4 top-4 z-10">
        <X />
        <span className="sr-only">{closeLabel}</span>
      </Button>
      {children}
    </div>
  );
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
    <div className="rounded-xl border border-border bg-card p-4 text-start">
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
