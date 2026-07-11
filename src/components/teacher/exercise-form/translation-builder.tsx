"use client";

import { cn } from "@/lib/utils";
import { AddRowButton, Field, inputClass, ItemCard } from "./form-controls";
import { newTranslationItem, type TranslationItemDraft } from "./types";

const DIRECTIONS: { value: TranslationItemDraft["direction"]; label: string }[] = [
  { value: "ar-en", label: "Arabic → English" },
  { value: "en-ar", label: "English → Arabic" },
];

export function TranslationBuilder({
  value,
  onChange,
  itemErrors,
}: {
  value: TranslationItemDraft[];
  onChange: (value: TranslationItemDraft[]) => void;
  itemErrors?: string[][];
}) {
  function update(index: number, patch: Partial<TranslationItemDraft>) {
    onChange(value.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  return (
    <div className="space-y-3">
      {value.map((it, i) => (
        <ItemCard key={it._cid} index={i} onRemove={() => onChange(value.filter((_, idx) => idx !== i))} canRemove={value.length > 1}>
          <Field label="Direction">
            <div className="grid grid-cols-2 gap-2">
              {DIRECTIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => update(i, { direction: d.value })}
                  className={cn(
                    "rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
                    it.direction === d.value
                      ? "border-primary/40 bg-secondary text-primary"
                      : "border-border bg-muted text-muted-foreground hover:border-line-strong"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Source text">
            <input value={it.source} onChange={(e) => update(i, { source: e.target.value })} className={inputClass} dir="auto" />
          </Field>
          <Field label="Reference translation" hint="used for AI scoring">
            <input value={it.reference} onChange={(e) => update(i, { reference: e.target.value })} className={inputClass} dir="auto" />
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
      <AddRowButton label="Add item" onClick={() => onChange([...value, newTranslationItem()])} />
    </div>
  );
}
