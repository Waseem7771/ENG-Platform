"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { api, ApiClientError } from "@/lib/api";
import type { PlayerProps } from "./player-types";
import type { ChatMessage, StoryData } from "@/types";

type Payload = { turns: ChatMessage[] };
type LocalMsg = ChatMessage & { id: number };

const MAX_TURN_LENGTH = 2000;
const MAX_HISTORY_SENT = 39;

export function StoryPlayer({ exercise, data, onSubmit, submitting, registerForceSubmit }: PlayerProps<StoryData, Payload>) {
  const story = data.story;
  const [turns, setTurns] = useState<LocalMsg[]>([{ id: 0, role: "assistant", content: story.opening }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  const userTurns = turns.filter((t) => t.role === "user").length;
  const canFinish = userTurns >= story.minTurns;

  useEffect(() => {
    if (!registerForceSubmit) return;
    registerForceSubmit(() => onSubmit({ turns: turns.map(({ role, content }) => ({ role, content })) }));
  }, [turns, registerForceSubmit, onSubmit]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, sending]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    if (text.length > MAX_TURN_LENGTH) {
      toast.error(`That's too long (max ${MAX_TURN_LENGTH} characters).`);
      return;
    }
    const userTurn: LocalMsg = { id: nextId.current++, role: "user", content: text };
    const history = [...turns, userTurn];
    setTurns(history);
    setInput("");
    setSending(true);
    try {
      const historyToSend = history.slice(-MAX_HISTORY_SENT).map(({ role, content }) => ({ role, content }));
      const res = await api<{ reply: string; aiAvailable: boolean }>("/api/ai/story", {
        method: "POST",
        body: JSON.stringify({ exerciseId: exercise.id, turns: historyToSend }),
      });
      setTurns((prev) => [...prev, { id: nextId.current++, role: "assistant", content: res.reply }]);
    } catch (err) {
      setTurns((prev) => prev.filter((t) => t.id !== userTurn.id));
      setInput(text);
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't reach the AI. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full min-h-[520px] flex-col rounded-2xl border border-border bg-card">
      <div className="border-b border-border p-5">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{story.title}</h2>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{story.genre} · {userTurns}/{story.minTurns} turns</p>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
        {turns.map((t) => (
          <div key={t.id} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              dir="auto"
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                t.role === "user" ? "bg-primary text-foreground" : "border border-border bg-card text-foreground"
              }`}
            >
              {t.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex items-center gap-1.5 rounded-2xl border border-border bg-card px-4 py-3 w-fit">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-border p-4">
        <div className="flex items-center gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="Continue the story…"
            rows={2}
            dir="auto"
            maxLength={MAX_TURN_LENGTH}
            className="h-16 flex-1 resize-none rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none"
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || !input.trim()}
            className="h-16 shrink-0 rounded-xl bg-primary px-5 text-sm font-medium text-foreground transition disabled:opacity-40"
          >
            Send
          </button>
        </div>
        {canFinish && (
          <button
            type="button"
            onClick={() => onSubmit({ turns: turns.map(({ role, content }) => ({ role, content })) })}
            disabled={submitting}
            className="w-full rounded-full border border-border px-6 py-2.5 text-sm font-medium uppercase tracking-wider text-foreground transition hover:border-line-strong disabled:opacity-50"
          >
            {submitting ? "Scoring…" : "Finish story & Get Score"}
          </button>
        )}
      </div>
    </div>
  );
}
