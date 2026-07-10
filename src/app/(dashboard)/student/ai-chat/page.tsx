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
  BEGINNER: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  INTERMEDIATE: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  ADVANCED: "border-red-500/30 bg-red-500/10 text-red-300",
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
          <button onClick={backToGrid} className="text-xs text-white/30 hover:text-white/60">
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
        <button onClick={backToGrid} className="w-fit text-xs text-white/30 hover:text-white/60">
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
        <p className="mt-1 text-white/40">Choose a scenario and practice speaking English with our AI conversation partner</p>
      </div>

      {loading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <p className="text-white/70">{error}</p>
          <button onClick={refetch} className="mt-4 rounded-full border border-white/15 px-5 py-2 text-sm text-white/80 hover:border-white/30">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && scenarios?.length === 0 && (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-10 text-center">
          <p className="text-white/50">No conversation scenarios are available yet — check back soon.</p>
        </div>
      )}

      {!loading && !error && scenarios && scenarios.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={container} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {scenarios.map((ex) => {
            const scenario = (ex.data as ConversationData).scenario;
            return (
              <motion.button key={ex.id} variants={item} type="button" onClick={() => setSelected(ex)} className="text-left">
                <div className="h-full rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04]">
                  <div className="mb-2 text-3xl">{scenario.emoji}</div>
                  <h3 className="font-semibold tracking-tight text-white">{scenario.title}</h3>
                  <p className="mt-1 text-sm text-white/40">{scenario.description}</p>
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
