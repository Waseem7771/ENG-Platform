"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FeedbackBanner } from "./feedback-banner";
import { OptionButton } from "./option-button";
import type { PlayerProps } from "./player-types";
import type { ListeningData } from "@/types";

type Payload = { answers: Record<string, string>; timeSpent?: number };

const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;

export function ListeningPlayer({ data, onSubmit, submitting, registerForceSubmit }: PlayerProps<ListeningData, Payload>) {
  const items = data.items;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [startedAt] = useState(() => Date.now());

  const item = items[index];
  const isLast = index === items.length - 1;
  const currentAnswer = answers[item.id];
  const correct = currentAnswer === item.answer;

  useEffect(() => {
    if (!registerForceSubmit) return;
    registerForceSubmit(() => onSubmit({ answers, timeSpent: Math.round((Date.now() - startedAt) / 1000) }));
  }, [answers, registerForceSubmit, onSubmit, startedAt]);

  useEffect(() => {
    return () => {
      if (speechSupported) window.speechSynthesis.cancel();
    };
  }, [index]);

  function play() {
    if (!speechSupported) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(item.transcript);
    utter.lang = "en-US";
    utter.rate = 0.9;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utter);
  }

  function reveal(opt: string) {
    setAnswers((a) => ({ ...a, [item.id]: opt }));
    setRevealed(true);
  }

  function next() {
    if (isLast) {
      onSubmit({ answers, timeSpent: Math.round((Date.now() - startedAt) / 1000) });
      return;
    }
    setIndex((i) => i + 1);
    setRevealed(false);
    setShowTranscript(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex justify-between text-xs text-muted-foreground">
          <span>Item {index + 1} of {items.length}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            animate={{ width: `${((index + 1) / items.length) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8">
        <button
          type="button"
          onClick={play}
          disabled={!speechSupported}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl text-primary-foreground shadow-lg shadow-primary/20 transition disabled:opacity-30"
        >
          {speaking ? "🔊" : "▶"}
        </button>
        <p className="text-xs text-muted-foreground">{speechSupported ? "Tap to play — replay as many times as you need" : "Audio isn't supported on this device"}</p>
        {!speechSupported && (
          <button type="button" onClick={() => setShowTranscript((s) => !s)} className="text-xs text-primary underline">
            {showTranscript ? "Hide transcript" : "Read transcript"}
          </button>
        )}
        {showTranscript && <p className="max-w-md text-center text-sm text-muted-foreground">{item.transcript}</p>}
      </div>

      <div>
        <p className="mb-3 text-base font-medium text-foreground">{item.question}</p>
        <div className="space-y-3">
          {item.options.map((opt) => (
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
      </div>

      {revealed && (
        <>
          <FeedbackBanner correct={correct} />
          <button
            type="button"
            onClick={next}
            disabled={submitting}
            className="w-full rounded-full bg-primary px-6 py-3 text-sm font-medium uppercase tracking-wider text-primary-foreground disabled:opacity-50"
          >
            {isLast ? (submitting ? "Submitting…" : "Finish") : "Next"}
          </button>
        </>
      )}
    </div>
  );
}
