"use client";

import { useEffect, useRef, useState } from "react";
import { OptionButton } from "./option-button";
import type { PlayerProps } from "./player-types";
import type { QuizData } from "@/types";

type Payload = { answers: Record<string, string>; timeSpent?: number };

const ADVANCE_DELAY = 700;

export function SpeedQuiz({ data, onSubmit, submitting, registerForceSubmit }: PlayerProps<QuizData, Payload>) {
  const items = data.items;
  const totalMs = data.timePerQuestion * 1000;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [msLeft, setMsLeft] = useState(totalMs);
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const lockedRef = useRef(false);

  const item = items[index];
  const isLast = index === items.length - 1;

  useEffect(() => {
    if (!registerForceSubmit) return;
    registerForceSubmit(() => onSubmit({ answers, timeSpent: Math.round((Date.now() - startedAt) / 1000) }));
  }, [answers, registerForceSubmit, onSubmit, startedAt]);

  useEffect(() => {
    lockedRef.current = false;
    setMsLeft(totalMs);
    setRevealed(false);
    setSelected(null);
    const tickMs = 100;
    const interval = setInterval(() => {
      setMsLeft((t) => {
        const next = t - tickMs;
        if (next <= 0 && !lockedRef.current) {
          lockedRef.current = true;
          setRevealed(true);
          setStreak(0);
        }
        return Math.max(0, next);
      });
    }, tickMs);
    return () => clearInterval(interval);
  }, [index, totalMs]);

  useEffect(() => {
    if (!revealed) return;
    const t = setTimeout(() => {
      if (isLast) {
        onSubmit({ answers, timeSpent: Math.round((Date.now() - startedAt) / 1000) });
      } else {
        setIndex((i) => i + 1);
      }
    }, ADVANCE_DELAY);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed]);

  function choose(opt: string) {
    if (lockedRef.current) return;
    lockedRef.current = true;
    setSelected(opt);
    setAnswers((a) => ({ ...a, [item.id]: opt }));
    const correct = opt === item.answer;
    setStreak((s) => {
      const n = correct ? s + 1 : 0;
      setBestStreak((b) => Math.max(b, n));
      return n;
    });
    setRevealed(true);
  }

  const pct = (msLeft / totalMs) * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-xs text-white/30">
        <span>Question {index + 1} of {items.length}</span>
        <span className="flex items-center gap-1 text-amber-300">🔥 {streak} streak (best {bestStreak})</span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full transition-[width] duration-100 ease-linear ${pct < 25 ? "bg-red-500" : "bg-gradient-to-r from-violet-500 to-cyan-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-xl font-medium tracking-tight text-white">{item.question}</p>

      <div className="space-y-3">
        {item.options.map((opt) => (
          <OptionButton
            key={opt}
            label={opt}
            selected={selected === opt}
            correct={revealed && opt === item.answer}
            revealed={revealed}
            disabled={revealed}
            onClick={() => choose(opt)}
          />
        ))}
      </div>

      {revealed && !selected && <p className="text-center text-sm text-red-300">Time&apos;s up! The answer was &quot;{item.answer}&quot;.</p>}
      {submitting && isLast && <p className="text-center text-xs text-white/30">Submitting…</p>}
    </div>
  );
}
