"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import { api, ApiClientError } from "@/lib/api";
import { ConversationChat } from "@/components/exercise/conversation-chat";
import { ResultsScreen } from "@/components/exercise/results-screen";
import type { ExerciseListItem, ConversationData, SubmitResponse } from "@/types";
import type { ExerciseFull } from "../_types";

const difficultyColor: Record<string, string> = {
  BEGINNER: "border-leaf bg-leaf-soft text-leaf-text",
  INTERMEDIATE: "border-sun-deep/30 bg-sun-soft text-sun-deep",
  ADVANCED: "border-destructive/30 bg-coral-soft text-destructive",
};

const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { y: 16, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: [0.35, 0.35, 0, 1] as const } } };

export default function AiChatPage() {
  const { data: scenarios, loading, error, refetch } = useApi<ExerciseFull[]>(async () => {
    const list = await api<ExerciseListItem[]>("/api/exercises?type=CONVERSATION");
    return Promise.all(list.map((l) => api<ExerciseFull>(`/api/exercises/${l.id}`)));
  }, []);

  const [selected, setSelected] = useState<ExerciseFull | null>(null);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  function backToGrid() {
    setSelected(null);
    setResult(null);
  }

  async function handleSubmit(payload: unknown) {
    if (!selected) return;
    setSubmitting(true);
    try {
      const res = await api<SubmitResponse>(`/api/exercises/${selected.id}/submit`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setResult(res);
      toast.success(`Scored ${res.score}% · +${res.xpEarned} XP`);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't score your conversation.");
    } finally {
      setSubmitting(false);
    }
  }

  if (selected) {
    const scenario = (selected.data as ConversationData).scenario;
    const summary = { id: selected.id, title: selected.title, type: selected.type, difficulty: selected.difficulty, points: selected.points, timeLimit: selected.timeLimit };

    if (result) {
      return (
        <div className="mx-auto max-w-3xl space-y-6 py-4">
          <button onClick={backToGrid} className="text-xs text-muted-foreground hover:text-muted-foreground">
            ← Back to scenarios
          </button>
          <ResultsScreen
            result={result}
            title={scenario.title}
            onRetry={() => {
              setResult(null);
              setRetryKey((k) => k + 1);
            }}
            onBack={backToGrid}
            backLabel="Choose another scenario"
            compact
          />
        </div>
      );
    }

    return (
      <div className="flex h-[calc(100vh-6rem)] flex-col gap-3">
        <button onClick={backToGrid} className="w-fit text-xs text-muted-foreground hover:text-muted-foreground">
          ← Back to scenarios
        </button>
        <div className="min-h-0 flex-1">
          <ConversationChat
            key={retryKey}
            exercise={summary}
            data={selected.data as ConversationData}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Conversation Practice</h1>
        <p className="mt-1 text-muted-foreground">Choose a scenario and practice speaking English with our AI conversation partner</p>
      </div>

      {loading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-destructive/20 bg-coral-soft p-8 text-center">
          <p className="text-foreground">{error}</p>
          <button onClick={refetch} className="mt-4 rounded-full border border-border px-5 py-2 text-sm text-foreground hover:border-line-strong">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && scenarios?.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <p className="text-muted-foreground">No conversation scenarios are available yet — check back soon.</p>
        </div>
      )}

      {!loading && !error && scenarios && scenarios.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={container} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {scenarios.map((ex) => {
            const scenario = (ex.data as ConversationData).scenario;
            return (
              <motion.button key={ex.id} variants={item} type="button" onClick={() => setSelected(ex)} className="text-left">
                <div className="h-full rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-border hover:bg-card">
                  <div className="mb-2 text-3xl">{scenario.emoji}</div>
                  <h3 className="font-semibold tracking-tight text-foreground">{scenario.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{scenario.description}</p>
                  <span className={`mt-3 inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${difficultyColor[ex.difficulty]}`}>{ex.difficulty}</span>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
