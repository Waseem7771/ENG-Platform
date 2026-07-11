"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { PlayerProps } from "./player-types";
import type { TranslationData } from "@/types";

type Payload = { answers: Record<string, string>; timeSpent?: number };

export function TranslationPlayer({ data, onSubmit, submitting, registerForceSubmit }: PlayerProps<TranslationData, Payload>) {
  const items = data.items;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [startedAt] = useState(() => Date.now());
  const item = items[index];
  const isLast = index === items.length - 1;
  const isSourceArabic = item.direction === "ar-en";

  useEffect(() => {
    if (!registerForceSubmit) return;
    registerForceSubmit(() => onSubmit({ answers, timeSpent: Math.round((Date.now() - startedAt) / 1000) }));
  }, [answers, registerForceSubmit, onSubmit, startedAt]);

  function setValue(v: string) {
    setAnswers((a) => ({ ...a, [item.id]: v }));
  }

  function next() {
    if (isLast) {
      onSubmit({ answers, timeSpent: Math.round((Date.now() - startedAt) / 1000) });
      return;
    }
    setIndex((i) => i + 1);
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex justify-between text-xs text-muted-foreground">
          <span>Item {index + 1} of {items.length}</span>
          <span className="uppercase tracking-wider">{isSourceArabic ? "Arabic → English" : "English → Arabic"}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            animate={{ width: `${((index + 1) / items.length) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <p
          dir={isSourceArabic ? "rtl" : "ltr"}
          className={isSourceArabic ? "text-2xl font-medium leading-relaxed text-foreground" : "text-lg font-medium text-foreground"}
        >
          {item.source}
        </p>
      </div>

      <div>
        <label htmlFor="translation-input" className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">
          Your translation
        </label>
        <textarea
          id="translation-input"
          value={answers[item.id] ?? ""}
          onChange={(e) => setValue(e.target.value)}
          dir={isSourceArabic ? "ltr" : "rtl"}
          rows={4}
          placeholder="Type your translation…"
          className="w-full rounded-xl border border-border bg-card p-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none"
        />
      </div>

      <button
        type="button"
        onClick={next}
        disabled={submitting || !answers[item.id]?.trim()}
        className="w-full rounded-full bg-primary px-6 py-3 text-sm font-medium uppercase tracking-wider text-foreground transition disabled:opacity-30"
      >
        {isLast ? (submitting ? "Submitting…" : "Finish") : "Next"}
      </button>
    </div>
  );
}
