"use client";

import { AddRowButton, Field, inputClass, ItemCard, OptionsEditor } from "./form-controls";
import { newListeningItem, type ListeningItemDraft } from "./types";

export function ListeningBuilder({
  value,
  onChange,
  itemErrors,
}: {
  value: ListeningItemDraft[];
  onChange: (value: ListeningItemDraft[]) => void;
  itemErrors?: string[][];
}) {
  function update(index: number, patch: Partial<ListeningItemDraft>) {
    onChange(value.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-white/30">The transcript is read aloud to the student via text-to-speech before they answer.</p>
      {value.map((it, i) => (
        <ItemCard key={it._cid} index={i} onRemove={() => onChange(value.filter((_, idx) => idx !== i))} canRemove={value.length > 1}>
          <Field label="Transcript" hint="what the student hears">
            <textarea
              value={it.transcript}
              onChange={(e) => update(i, { transcript: e.target.value })}
              rows={2}
              className={`${inputClass} h-auto resize-none py-2`}
            />
          </Field>
          <Field label="Question">
            <input value={it.question} onChange={(e) => update(i, { question: e.target.value })} className={inputClass} />
          </Field>
          <OptionsEditor
            options={it.options}
            answer={it.answer}
            onChange={(options) => update(i, { options })}
            onAnswerChange={(answer) => update(i, { answer })}
          />
          {itemErrors?.[i]?.length ? (
            <ul className="list-inside list-disc text-xs text-red-400">
              {itemErrors[i].map((e, idx) => (
                <li key={idx}>{e}</li>
              ))}
            </ul>
          ) : null}
        </ItemCard>
      ))}
      <AddRowButton label="Add item" onClick={() => onChange([...value, newListeningItem()])} />
    </div>
  );
}
