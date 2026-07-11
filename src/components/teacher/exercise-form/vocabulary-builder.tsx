"use client";

import { X } from "lucide-react";
import { AddRowButton, inputClass } from "./form-controls";
import { newVocabularyPair, type VocabularyPairDraft } from "./types";

export function VocabularyBuilder({
  value,
  onChange,
  itemErrors,
}: {
  value: VocabularyPairDraft[];
  onChange: (value: VocabularyPairDraft[]) => void;
  itemErrors?: string[][];
}) {
  function update(index: number, patch: Partial<VocabularyPairDraft>) {
    onChange(value.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Add at least 4 word / meaning pairs students will match.</p>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-1 text-xs uppercase tracking-wider text-muted-foreground">
        <span>Word</span>
        <span>Meaning</span>
        <span />
      </div>
      {value.map((pair, i) => (
        <div key={pair._cid}>
          <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
            <input
              value={pair.word}
              onChange={(e) => update(i, { word: e.target.value })}
              placeholder="e.g. generous"
              className={inputClass}
            />
            <input
              value={pair.meaning}
              onChange={(e) => update(i, { meaning: e.target.value })}
              placeholder="كريم"
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              disabled={value.length <= 4}
              className="shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-30"
              aria-label={`Remove pair ${i + 1}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {itemErrors?.[i]?.length ? <p className="mt-1 text-xs text-destructive">{itemErrors[i].join(" ")}</p> : null}
        </div>
      ))}
      <AddRowButton label="Add pair" onClick={() => onChange([...value, newVocabularyPair()])} />
    </div>
  );
}
