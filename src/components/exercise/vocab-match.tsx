"use client";

import { useEffect, useRef, useState } from "react";
import type { PlayerProps } from "./player-types";
import type { VocabularyData } from "@/types";

type Payload = { answers: { matchedPairs: number; totalPairs: number; mistakes: number }; timeSpent?: number };
type Tile = { pairIdx: number; text: string };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function VocabMatch({ data, onSubmit, submitting, registerForceSubmit }: PlayerProps<VocabularyData, Payload>) {
  const pairs = data.pairs;
  const [words] = useState<Tile[]>(() => shuffle(pairs.map((p, pairIdx) => ({ pairIdx, text: p.word }))));
  const [meanings] = useState<Tile[]>(() => shuffle(pairs.map((p, pairIdx) => ({ pairIdx, text: p.meaning }))));
  const [selectedWordIdx, setSelectedWordIdx] = useState<number | null>(null);
  const [selectedMeaningIdx, setSelectedMeaningIdx] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrongFlash, setWrongFlash] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const wrongTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const done = matched.size === pairs.length;

  useEffect(() => {
    if (!registerForceSubmit) return;
    registerForceSubmit(() =>
      onSubmit({
        answers: { matchedPairs: matched.size, totalPairs: pairs.length, mistakes },
        timeSpent: Math.round((Date.now() - startedAt) / 1000),
      })
    );
  }, [matched, mistakes, registerForceSubmit, onSubmit, pairs.length, startedAt]);

  // Cleanup the pending mismatch-flash timeout on unmount only — evaluation
  // itself happens synchronously from the click handlers below, not from a
  // reactive effect, so state updates never fire from inside an effect body.
  useEffect(() => {
    return () => {
      if (wrongTimeoutRef.current) clearTimeout(wrongTimeoutRef.current);
    };
  }, []);

  function evaluate(wordIdx: number | null, meaningIdx: number | null) {
    if (wordIdx === null || meaningIdx === null) return;
    const isMatch = wordIdx === meaningIdx;
    if (isMatch) {
      setMatched((m) => new Set(m).add(wordIdx));
      setSelectedWordIdx(null);
      setSelectedMeaningIdx(null);
      setWrongFlash(false);
    } else {
      setMistakes((m) => m + 1);
      setWrongFlash(true);
      wrongTimeoutRef.current = setTimeout(() => {
        setWrongFlash(false);
        setSelectedWordIdx(null);
        setSelectedMeaningIdx(null);
        wrongTimeoutRef.current = null;
      }, 500);
    }
  }

  function clearPendingFlash() {
    if (wrongTimeoutRef.current) {
      clearTimeout(wrongTimeoutRef.current);
      wrongTimeoutRef.current = null;
    }
    setWrongFlash(false);
  }

  function selectWord(pairIdx: number) {
    if (matched.has(pairIdx)) return;
    clearPendingFlash();
    setSelectedWordIdx(pairIdx);
    evaluate(pairIdx, selectedMeaningIdx);
  }

  function selectMeaning(pairIdx: number) {
    if (matched.has(pairIdx)) return;
    clearPendingFlash();
    setSelectedMeaningIdx(pairIdx);
    evaluate(selectedWordIdx, pairIdx);
  }

  function finish() {
    onSubmit({
      answers: { matchedPairs: matched.size, totalPairs: pairs.length, mistakes },
      timeSpent: Math.round((Date.now() - startedAt) / 1000),
    });
  }

  function cellClass(isSelected: boolean, isMatched: boolean) {
    if (isMatched) return "border-leaf bg-leaf-soft text-leaf-text cursor-default";
    if (isSelected && wrongFlash) return "border-destructive bg-coral-soft text-destructive";
    if (isSelected) return "border-primary bg-secondary text-foreground";
    return "border-border bg-card text-foreground hover:border-line-strong hover:bg-muted";
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Matched {matched.size} / {pairs.length}</span>
        <span>Mistakes: {mistakes}</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Words</p>
          {words.map((tile) => {
            const isMatched = matched.has(tile.pairIdx);
            return (
              <button
                key={tile.pairIdx}
                type="button"
                disabled={isMatched}
                onClick={() => selectWord(tile.pairIdx)}
                className={`w-full rounded-xl border px-3 py-3 text-left text-sm font-medium transition-all duration-200 ${cellClass(selectedWordIdx === tile.pairIdx, isMatched)}`}
              >
                {tile.text}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          <p className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Meanings</p>
          {meanings.map((tile) => {
            const isMatched = matched.has(tile.pairIdx);
            return (
              <button
                key={tile.pairIdx}
                type="button"
                disabled={isMatched}
                onClick={() => selectMeaning(tile.pairIdx)}
                className={`w-full rounded-xl border px-3 py-3 text-left text-sm font-medium transition-all duration-200 ${cellClass(selectedMeaningIdx === tile.pairIdx, isMatched)}`}
              >
                {tile.text}
              </button>
            );
          })}
        </div>
      </div>

      {done && (
        <button
          type="button"
          onClick={finish}
          disabled={submitting}
          className="w-full rounded-full bg-primary px-6 py-3 text-sm font-medium uppercase tracking-wider text-primary-foreground disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "See Results"}
        </button>
      )}
    </div>
  );
}
