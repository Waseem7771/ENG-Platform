"use client";

import { AddRowButton, Field, inputClass, ItemCard, OptionsEditor } from "./form-controls";
import { newQuizItem, type QuizItemDraft } from "./types";

export function QuizBuilder({
  value,
  timePerQuestion,
  onChangeItems,
  onChangeTime,
  itemErrors,
}: {
  value: QuizItemDraft[];
  timePerQuestion: number;
  onChangeItems: (value: QuizItemDraft[]) => void;
  onChangeTime: (value: number) => void;
  itemErrors?: string[][];
}) {
  function update(index: number, patch: Partial<QuizItemDraft>) {
    onChangeItems(value.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  return (
    <div className="space-y-3">
      <Field label="Time per question (seconds)" className="max-w-xs">
        <input
          type="number"
          min={3}
          value={timePerQuestion}
          onChange={(e) => onChangeTime(Number(e.target.value))}
          className={inputClass}
        />
      </Field>
      {value.map((it, i) => (
        <ItemCard key={it._cid} index={i} onRemove={() => onChangeItems(value.filter((_, idx) => idx !== i))} canRemove={value.length > 1}>
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
            <ul className="list-inside list-disc text-xs text-destructive">
              {itemErrors[i].map((e, idx) => (
                <li key={idx}>{e}</li>
              ))}
            </ul>
          ) : null}
        </ItemCard>
      ))}
      <AddRowButton label="Add question" onClick={() => onChangeItems([...value, newQuizItem()])} />
    </div>
  );
}
