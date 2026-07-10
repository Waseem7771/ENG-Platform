"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FeedbackBanner } from "./feedback-banner";
import { OptionButton } from "./option-button";
import type { PlayerProps } from "./player-types";
import type { GrammarData } from "@/types";

type Payload = { answers: Record<string, string>; timeSpent?: number };

export function GrammarPlayer({ data, onSubmit, submitting, registerForceSubmit }: PlayerProps<GrammarData, Payload>) {
  const items = data.items;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState(false);
  const [pickedWords, setPickedWords] = useState<string[]>([]);
  const [startedAt] = useState(() => Date.now());

  const item = items[index];
  const isLast = index === items.length - 1;
  const shuffledWords = useMemo(() => item.words ?? [], [item]);

  useEffect(() => {
    if (!registerForceSubmit) return;
    registerForceSubmit(() => onSubmit({ answers, timeSpent: Math.round((Date.now() - startedAt) / 1000) }));
  }, [answers, registerForceSubmit, onSubmit, startedAt]);

  function reveal(answer: string) {
    setAnswers((a) => ({ ...a, [item.id]: answer }));
    setRevealed(true);
  }

  function next() {
    if (isLast) {
      onSubmit({ answers, timeSpent: Math.round((Date.now() - startedAt) / 1000) });
      return;
    }
    setIndex((i) => i + 1);
    setRevealed(false);
    setPickedWords([]);
  }

  const currentAnswer = answers[item.id];
  const correct = currentAnswer !== undefined && currentAnswer.trim().toLowerCase() === item.answer.trim().toLowerCase();

  return (
    <div className="space-y-6">
      <ProgressHeader index={index} total={items.length} />

      <div>
        <p className="text-xs uppercase tracking-wider text-white/40">{item.prompt}</p>
        {item.text && <p className="mt-3 text-xl font-medium tracking-tight text-white">{item.text}</p>}
      </div>

      {item.kind === "reorder" ? (
        <div className="space-y-4">
          <div className="flex min-h-14 flex-wrap gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            {pickedWords.length === 0 && <span className="text-sm text-white/25">Tap words below to build the sentence</span>}
            {pickedWords.map((tok, i) => (
              <button
                key={i}
                type="button"
                disabled={revealed}
                onClick={() => setPickedWords((p) => p.filter((_, idx) => idx !== i))}
                className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-sm font-medium text-white"
              >
                {tok.split(":").slice(1).join(":")}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {shuffledWords.map((w, i) => {
              const token = `${i}:${w}`;
              if (pickedWords.includes(token)) return null;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={revealed}
                  onClick={() => setPickedWords((p) => [...p, token])}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white/80 hover:border-white/20"
                >
                  {w}
                </button>
              );
            })}
          </div>
          {!revealed && (
            <button
              type="button"
              disabled={pickedWords.length !== shuffledWords.length}
              onClick={() => reveal(pickedWords.map((t) => t.split(":").slice(1).join(":")).join(" "))}
              className="rounded-full bg-gradient-to-r from-violet-600 to-blue-500 px-6 py-2.5 text-sm font-medium uppercase tracking-wider text-white disabled:opacity-30"
            >
              Check
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {item.options?.map((opt) => (
            <OptionButton
              key={opt}
              label={opt}
              selected={currentAnswer === opt}
              correct={revealed && opt === item.answer}
              revealed={revealed}
              disabled={revealed}
              onClick={() => reveal(opt)}
            />
          ))}
        </div>
      )}

      {revealed && (
        <>
          <FeedbackBanner correct={correct} explanation={item.explanation} />
          <button
            type="button"
            onClick={next}
            disabled={submitting}
            className="w-full rounded-full bg-gradient-to-r from-violet-600 to-blue-500 px-6 py-3 text-sm font-medium uppercase tracking-wider text-white transition disabled:opacity-50"
          >
            {isLast ? (submitting ? "Submitting…" : "Finish") : "Next"}
          </button>
        </>
      )}
    </div>
  );
}

function ProgressHeader({ index, total }: { index: number; total: number }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-xs text-white/30">
        <span>Question {index + 1} of {total}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
          animate={{ width: `${((index + 1) / total) * 100}%` }}
          transition={{ duration: 0.4, ease: [0.35, 0.35, 0, 1] }}
        />
      </div>
    </div>
  );
}
