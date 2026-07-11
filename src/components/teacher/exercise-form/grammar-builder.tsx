"use client";

import { cn } from "@/lib/utils";
import { AddRowButton, Field, inputClass, ItemCard, OptionsEditor } from "./form-controls";
import { newGrammarItem, type GrammarItemDraft } from "./types";
import type { GrammarItem } from "@/types";

const KINDS: { value: GrammarItem["kind"]; label: string }[] = [
  { value: "fill-blank", label: "Fill in the blank" },
  { value: "error-correction", label: "Error correction" },
  { value: "reorder", label: "Reorder words" },
];

export function GrammarBuilder({
  value,
  onChange,
  itemErrors,
}: {
  value: GrammarItemDraft[];
  onChange: (value: GrammarItemDraft[]) => void;
  itemErrors?: string[][];
}) {
  function update(index: number, patch: Partial<GrammarItemDraft>) {
    onChange(value.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function changeKind(index: number, kind: GrammarItem["kind"]) {
    const fresh = newGrammarItem(kind);
    onChange(value.map((it, i) => (i === index ? { ...fresh, _cid: it._cid } : it)));
  }

  return (
    <div className="space-y-3">
      {value.map((it, i) => (
        <ItemCard key={it._cid} index={i} onRemove={() => onChange(value.filter((_, idx) => idx !== i))} canRemove={value.length > 1}>
          <Field label="Question type">
            <div className="grid grid-cols-3 gap-2">
              {KINDS.map((k) => (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => changeKind(i, k.value)}
                  className={cn(
                    "rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
                    it.kind === k.value
                      ? "border-primary/40 bg-secondary text-primary"
                      : "border-border bg-muted text-muted-foreground hover:border-line-strong"
                  )}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Instruction shown to student">
            <input value={it.prompt} onChange={(e) => update(i, { prompt: e.target.value })} className={inputClass} />
          </Field>

          {it.kind === "reorder" ? (
            <Field label="Correct sentence" hint="words will be shuffled automatically for the student">
              <input
                value={it.answer}
                onChange={(e) => update(i, { answer: e.target.value })}
                placeholder="She goes to school every day."
                className={inputClass}
              />
            </Field>
          ) : (
            <>
              <Field label={it.kind === "fill-blank" ? "Sentence (use ___ for the blank)" : "Sentence with the mistake"}>
                <input
                  value={it.text}
                  onChange={(e) => update(i, { text: e.target.value })}
                  placeholder={it.kind === "fill-blank" ? "She ___ to school every day." : "She go to school every day."}
                  className={inputClass}
                />
              </Field>
              <OptionsEditor
                options={it.options}
                answer={it.answer}
                onChange={(options) => update(i, { options })}
                onAnswerChange={(answer) => update(i, { answer })}
              />
            </>
          )}

          <Field label="Explanation" hint="shown after the student answers">
            <textarea
              value={it.explanation}
              onChange={(e) => update(i, { explanation: e.target.value })}
              rows={2}
              className={`${inputClass} h-auto resize-none py-2`}
            />
          </Field>

          {itemErrors?.[i]?.length ? (
            <ul className="list-inside list-disc text-xs text-destructive">
              {itemErrors[i].map((e, idx) => (
                <li key={idx}>{e}</li>
              ))}
            </ul>
          ) : null}
        </ItemCard>
      ))}
      <AddRowButton label="Add item" onClick={() => onChange([...value, newGrammarItem()])} />
    </div>
  );
}
