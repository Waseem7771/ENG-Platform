"use client";

import { Field, inputClass } from "./form-controls";
import type { ConversationDraft } from "./types";

export function ConversationBuilder({
  value,
  onChange,
  errors,
}: {
  value: ConversationDraft;
  onChange: (value: ConversationDraft) => void;
  errors?: string[];
}) {
  function update(patch: Partial<ConversationDraft>) {
    onChange({ ...value, ...patch });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <Field label="Emoji" className="w-20">
          <input value={value.emoji} onChange={(e) => update({ emoji: e.target.value })} className={`${inputClass} text-center text-lg`} />
        </Field>
        <Field label="Scenario title">
          <input value={value.title} onChange={(e) => update({ title: e.target.value })} placeholder="At the Restaurant" className={inputClass} />
        </Field>
      </div>
      <Field label="Description" hint="shown to the student before starting">
        <textarea
          value={value.description}
          onChange={(e) => update({ description: e.target.value })}
          rows={2}
          className={`${inputClass} h-auto resize-none py-2`}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="AI role" hint="e.g. waiter">
          <input value={value.aiRole} onChange={(e) => update({ aiRole: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Student role" hint="e.g. customer">
          <input value={value.userRole} onChange={(e) => update({ userRole: e.target.value })} className={inputClass} />
        </Field>
      </div>
      <Field label="Opening line" hint="the AI's first message">
        <textarea
          value={value.opening}
          onChange={(e) => update({ opening: e.target.value })}
          rows={2}
          className={`${inputClass} h-auto resize-none py-2`}
        />
      </Field>
      <Field label="Objectives" hint="one per line">
        <textarea
          value={value.objectives}
          onChange={(e) => update({ objectives: e.target.value })}
          rows={3}
          placeholder={"Order a meal\nAsk about the menu\nAsk for the bill"}
          className={`${inputClass} h-auto resize-none py-2`}
        />
      </Field>
      <Field label="Fallback replies" hint="one per line, at least 3 — used when AI is offline">
        <textarea
          value={value.fallbackReplies}
          onChange={(e) => update({ fallbackReplies: e.target.value })}
          rows={3}
          placeholder={"Sure, what would you like to order?\nWould you like anything to drink?\nHere's your bill, thank you!"}
          className={`${inputClass} h-auto resize-none py-2`}
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
