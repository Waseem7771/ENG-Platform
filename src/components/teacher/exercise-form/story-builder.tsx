"use client";

import { Field, inputClass } from "./form-controls";
import type { StoryDraft } from "./types";

export function StoryBuilder({
  value,
  onChange,
  errors,
}: {
  value: StoryDraft;
  onChange: (value: StoryDraft) => void;
  errors?: string[];
}) {
  function update(patch: Partial<StoryDraft>) {
    onChange({ ...value, ...patch });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title">
          <input value={value.title} onChange={(e) => update({ title: e.target.value })} placeholder="The Lost Key" className={inputClass} />
        </Field>
        <Field label="Genre">
          <input value={value.genre} onChange={(e) => update({ genre: e.target.value })} placeholder="Mystery" className={inputClass} />
        </Field>
      </div>
      <Field label="Opening line" hint="the AI's first line of the story">
        <textarea
          value={value.opening}
          onChange={(e) => update({ opening: e.target.value })}
          rows={3}
          className={`${inputClass} h-auto resize-none py-2`}
        />
      </Field>
      <Field label="Minimum turns" hint="back-and-forth exchanges before it can end" className="max-w-xs">
        <input
          type="number"
          min={2}
          value={value.minTurns}
          onChange={(e) => update({ minTurns: Number(e.target.value) })}
          className={inputClass}
        />
      </Field>
      {errors?.length ? (
        <ul className="list-inside list-disc text-xs text-destructive">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
