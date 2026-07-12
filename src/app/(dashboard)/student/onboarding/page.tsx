"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import { api, ApiClientError } from "@/lib/api";
import { useT } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { OptionButton } from "@/components/exercise/option-button";
import { exerciseHref } from "@/lib/exercise-href";
import type { PlacementQuestionPublic } from "@/types";
import type { PathResponse } from "@/lib/path";
import type { MeResponse } from "../_types";

const ease = [0.35, 0.35, 0, 1] as const;

interface PlacementGetResponse {
  questions: PlacementQuestionPublic[];
}

/** POST /api/placement?mode=mini response — deliberately not PlacementResult: the
 * mini flow never returns a breakdown. */
type MiniResult = { score: number; level: string; mini: true };

type Stage = "welcome" | "quiz" | "done";

const levelColor: Record<string, string> = {
  BEGINNER: "border-leaf bg-leaf-soft text-leaf-text",
  INTERMEDIATE: "border-sun-deep/30 bg-sun-soft text-sun-deep",
  ADVANCED: "border-primary/30 bg-secondary text-primary",
};

export default function OnboardingPage() {
  const router = useRouter();
  const t = useT();
  const me = useApi<MeResponse>(() => api<MeResponse>("/api/me"), []);
  const placement = useApi<PlacementGetResponse>(() => api<PlacementGetResponse>("/api/placement?mode=mini"), []);

  const [stage, setStage] = useState<Stage>("welcome");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<MiniResult | null>(null);
  const [ctaHref, setCtaHref] = useState<string>("/student");

  const alreadyPlaced = Boolean(me.data?.user.level);

  useEffect(() => {
    if (!me.loading && alreadyPlaced) {
      router.push("/student");
    }
  }, [me.loading, alreadyPlaced, router]);

  if (me.loading || placement.loading || alreadyPlaced) {
    return <OnboardingSkeleton />;
  }

  if (placement.error || !placement.data) {
    return (
      <div className="mx-auto max-w-lg rounded-card border-2 border-border bg-card p-8 text-center shadow-sticker">
        <p className="text-foreground">{placement.error ?? t("common.error")}</p>
        <Button variant="ghost" className="mt-4" onClick={() => placement.refetch()}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  const questions = placement.data.questions;

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await api<MiniResult>("/api/placement", {
        method: "POST",
        body: JSON.stringify({ answers, mode: "mini" }),
      });
      setResult(res);
      try {
        const path = await api<PathResponse>("/api/path");
        setCtaHref(path.continue ? exerciseHref(path.continue.exerciseId, path.continue.type) : "/student");
      } catch {
        setCtaHref("/student");
      }
      setStage("done");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t("common.error"));
    } finally {
      setSubmitting(false);
    }
  }

  if (stage === "welcome") {
    return (
      <div className="mx-auto max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
          <div className="rounded-card border-2 border-border bg-card p-8 text-center shadow-sticker">
            <h1 className="text-2xl font-bold tracking-tight">{t("onboarding.title")}</h1>
            <p className="mt-3 text-sm text-muted-foreground">{t("onboarding.subtitle")}</p>
            <Button className="mt-7 w-full" onClick={() => setStage("quiz")}>
              {t("onboarding.start")}
            </Button>
            <button
              type="button"
              onClick={() => router.push("/student")}
              className="mt-4 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              {t("onboarding.skip")}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (stage === "quiz") {
    const question = questions[qIndex];
    const isLast = qIndex === questions.length - 1;
    const answered = Boolean(answers[question.id]);

    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2">
            {questions.map((q, i) => (
              <span
                key={q.id}
                className={`h-2.5 w-2.5 rounded-full transition-colors duration-300 ${
                  i === qIndex ? "bg-primary" : i < qIndex ? "bg-primary/50" : "bg-muted"
                }`}
              />
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {t("onboarding.question", { n: qIndex + 1, total: questions.length })}
          </p>
        </div>

        <div dir="ltr" className="rounded-card border-2 border-border bg-card p-7 text-start shadow-sticker">
          {question.passage && (
            <div className="mb-5 rounded-xl border border-border bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground">
              {question.passage}
            </div>
          )}
          <p className="text-lg font-medium tracking-tight text-foreground">{question.question}</p>

          <div className="mt-5 space-y-3">
            {question.options.map((opt) => (
              <OptionButton
                key={opt}
                label={opt}
                selected={answers[question.id] === opt}
                revealed={false}
                onClick={() => setAnswers((a) => ({ ...a, [question.id]: opt }))}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-between gap-3">
          <Button type="button" variant="ghost" disabled={qIndex === 0} onClick={() => setQIndex((i) => i - 1)}>
            {t("common.back")}
          </Button>
          <Button
            type="button"
            disabled={!answered || submitting}
            onClick={() => (isLast ? handleSubmit() : setQIndex((i) => i + 1))}
          >
            {isLast ? (submitting ? t("common.loading") : t("common.submit")) : t("common.next")}
          </Button>
        </div>
      </div>
    );
  }

  if (stage === "done" && result) {
    return (
      <div className="mx-auto max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
          <div className="rounded-card border-2 border-border bg-card p-8 text-center shadow-sticker">
            <h1 className="text-2xl font-bold tracking-tight">{t("onboarding.doneTitle")}</h1>

            <div className="mt-6 flex flex-col items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{t("onboarding.yourLevel")}</span>
              <span className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${levelColor[result.level] ?? "border-border bg-card text-foreground"}`}>
                {result.level}
              </span>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <Button onClick={() => router.push(ctaHref)}>{t("onboarding.firstLesson")}</Button>
              <Button variant="ghost" onClick={() => router.push("/student")}>
                {t("onboarding.goToPath")}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}

function OnboardingSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="mx-auto h-8 w-56 animate-pulse rounded-lg bg-muted" />
      <div className="h-80 animate-pulse rounded-card border-2 border-border bg-card shadow-sticker" />
    </div>
  );
}
