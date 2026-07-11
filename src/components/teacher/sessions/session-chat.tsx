"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Radio, Send } from "lucide-react";
import { ExerciseTypeBadge } from "@/components/teacher/badges";
import type { SessionMessageItem } from "@/components/teacher/types";
import type { ExerciseType } from "@/types";

export interface ExerciseCacheEntry {
  title: string;
  type: ExerciseType;
}

export function SessionChat({
  messages,
  exerciseCache,
  currentUserId,
  onSend,
  disabled,
  disabledPlaceholder,
}: {
  messages: SessionMessageItem[];
  exerciseCache: Record<string, ExerciseCacheEntry>;
  currentUserId: string | null;
  onSend: (content: string) => Promise<void>;
  disabled: boolean;
  disabledPlaceholder: string;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setDraft("");
    try {
      await onSend(content);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">No messages yet. Say hello to get things started.</p>
        )}
        {messages.map((m) => {
          if (m.type === "SYSTEM") {
            return (
              <p key={m.id} className="py-1 text-center text-xs text-muted-foreground">
                {m.content}
              </p>
            );
          }
          if (m.type === "EXERCISE") {
            const info = exerciseCache[m.content];
            return (
              <div key={m.id} className="flex justify-center py-1">
                <div className="flex items-center gap-2 rounded-full border border-primary/25 bg-secondary px-4 py-2 text-sm text-primary">
                  <Radio className="h-3.5 w-3.5" />
                  Pushed{info ? `: ${info.title}` : " an exercise"}
                  {info && <ExerciseTypeBadge type={info.type} className="ms-1" />}
                </div>
              </div>
            );
          }
          const isOwn = m.user.id === currentUserId;
          return (
            <div key={m.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${isOwn ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground"}`}>
                {!isOwn && <p className="mb-0.5 text-[11px] font-medium text-muted-foreground">{m.user.name}</p>}
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border p-4">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={disabled}
          placeholder={disabled ? disabledPlaceholder : "Message your class..."}
          maxLength={1000}
          className="h-11 flex-1 rounded-xl border border-border bg-muted px-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/20 disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={disabled || sending || !draft.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
          aria-label="Send message"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
