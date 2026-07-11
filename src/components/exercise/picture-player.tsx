"use client";

import { useEffect, useState } from "react";
import type { PlayerProps } from "./player-types";
import type { PictureData } from "@/types";

type Payload = { text: string; timeSpent?: number };

export function PicturePlayer({ data, onSubmit, submitting, registerForceSubmit }: PlayerProps<PictureData, Payload>) {
  const scene = data.scene;
  const [text, setText] = useState("");
  const [startedAt] = useState(() => Date.now());
  const wordCount = text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
  const canSubmit = wordCount >= scene.minWords;

  useEffect(() => {
    if (!registerForceSubmit) return;
    registerForceSubmit(() => onSubmit({ text, timeSpent: Math.round((Date.now() - startedAt) / 1000) }));
  }, [text, registerForceSubmit, onSubmit, startedAt]);

  function finish() {
    onSubmit({ text, timeSpent: Math.round((Date.now() - startedAt) / 1000) });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-10 text-center">
        <p className="text-7xl tracking-widest">{scene.emojis}</p>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{scene.title}</h2>
      </div>

      {scene.hints.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {scene.hints.map((h, i) => (
            <span key={i} className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              {h}
            </span>
          ))}
        </div>
      )}

      <div>
        <label htmlFor="picture-desc" className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground">
          Describe what you see
        </label>
        <textarea
          id="picture-desc"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="Start writing…"
          className="w-full rounded-xl border border-border bg-card p-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none"
        />
        <p className={`mt-2 text-xs ${canSubmit ? "text-leaf-text" : "text-muted-foreground"}`}>
          {wordCount} / {scene.minWords} words
        </p>
      </div>

      <button
        type="button"
        onClick={finish}
        disabled={!canSubmit || submitting}
        className="w-full rounded-full bg-primary px-6 py-3 text-sm font-medium uppercase tracking-wider text-primary-foreground transition disabled:opacity-30"
      >
        {submitting ? "Submitting…" : "Submit"}
      </button>
    </div>
  );
}
