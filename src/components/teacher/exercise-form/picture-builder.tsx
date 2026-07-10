"use client";

import { Field, inputClass } from "./form-controls";
import type { PictureDraft } from "./types";

export function PictureBuilder({
  value,
  onChange,
  errors,
}: {
  value: PictureDraft;
  onChange: (value: PictureDraft) => void;
  errors?: string[];
}) {
  function update(patch: Partial<PictureDraft>) {
    onChange({ ...value, ...patch });
  }

  function updateHint(i: number, text: string) {
    const hints = [...value.hints] as PictureDraft["hints"];
    hints[i] = text;
    update({ hints });
  }

  return (
    <div className="space-y-4">
      <Field label="Scene emojis" hint="e.g. 🏖️🌊☀️🏄">
        <input value={value.emojis} onChange={(e) => update({ emojis: e.target.value })} className={`${inputClass} text-lg`} />
      </Field>
      <Field label="Title">
        <input value={value.title} onChange={(e) => update({ title: e.target.value })} placeholder="A day at the beach" className={inputClass} />
      </Field>
      <Field label="Ground-truth description" hint="used for AI scoring — never shown to the student">
        <textarea
          value={value.description}
          onChange={(e) => update({ description: e.target.value })}
          rows={3}
          className={`${inputClass} h-auto resize-none py-2`}
        />
      </Field>
      <Field label="Hints" hint="3 prompts shown to the student">
        <div className="space-y-2">
          {value.hints.map((h, i) => (
            <input
              key={i}
              value={h}
              onChange={(e) => updateHint(i, e.target.value)}
              placeholder={`Hint ${i + 1}`}
              className={inputClass}
            />
          ))}
        </div>
      </Field>
      <Field label="Minimum words" className="max-w-xs">
        <input
          type="number"
          min={5}
          value={value.minWords}
          onChange={(e) => update({ minWords: Number(e.target.value) })}
          className={inputClass}
        />
      </Field>
      {errors?.length ? (
        <ul className="list-inside list-disc text-xs text-red-400">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
