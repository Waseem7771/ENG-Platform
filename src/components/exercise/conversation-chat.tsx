"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { api, ApiClientError } from "@/lib/api";
import type { PlayerProps } from "./player-types";
import type { ChatFeedback, ChatMessage, ConversationData } from "@/types";

type Payload = { messages: ChatMessage[] };
type LocalMsg = ChatMessage & { id: number; feedback?: ChatFeedback | null };

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_SENT = 39;

interface MinimalSpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
type SpeechRecognitionCtor = new () => MinimalSpeechRecognition;
function getSpeechRecognitionCtor(): SpeechRecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function ConversationChat({ exercise, data, onSubmit, submitting, registerForceSubmit }: PlayerProps<ConversationData, Payload>) {
  const scenario = data.scenario;
  const [messages, setMessages] = useState<LocalMsg[]>([{ id: 0, role: "assistant", content: scenario.opening }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [timeUpNotice, setTimeUpNotice] = useState(false);
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  const micSupported = getSpeechRecognitionCtor() !== undefined;

  const userCount = messages.filter((m) => m.role === "user").length;
  const canEnd = userCount >= 2;

  useEffect(() => {
    if (!registerForceSubmit) return;
    registerForceSubmit(() => {
      if (userCount >= 2) {
        onSubmit({ messages: messages.map(({ role, content }) => ({ role, content })) });
      } else {
        setTimeUpNotice(true);
      }
    });
  }, [messages, userCount, registerForceSubmit, onSubmit]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    if (text.length > MAX_MESSAGE_LENGTH) {
      toast.error(`Message is too long (max ${MAX_MESSAGE_LENGTH} characters).`);
      return;
    }
    const userMsg: LocalMsg = { id: nextId.current++, role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setSending(true);
    try {
      const historyToSend = history.slice(-MAX_HISTORY_SENT).map(({ role, content }) => ({ role, content }));
      const res = await api<{ reply: string; feedback: ChatFeedback | null; aiAvailable: boolean }>("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ exerciseId: exercise.id, messages: historyToSend }),
      });
      setMessages((prev) => [
        ...prev.map((m) => (m.id === userMsg.id ? { ...m, feedback: res.feedback } : m)),
        { id: nextId.current++, role: "assistant", content: res.reply },
      ]);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      setInput(text);
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't reach the AI. Try again.");
    } finally {
      setSending(false);
    }
  }

  function toggleMic() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript ?? "";
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  return (
    <div className="flex h-full min-h-[520px] flex-col rounded-2xl border border-border bg-card">
      <div className="border-b border-border p-5">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{scenario.emoji}</span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">{scenario.title}</h2>
            <p className="text-xs text-muted-foreground">{scenario.description}</p>
          </div>
        </div>
        {scenario.objectives?.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {scenario.objectives.map((o, i) => (
              <li key={i} className="rounded-full border border-border bg-card px-3 py-1 text-[11px] text-muted-foreground">
                {o}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
            <div
              dir="auto"
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-foreground"
              }`}
            >
              {m.content}
            </div>
            {m.feedback?.hasIssues && m.feedback.corrections.length > 0 && (
              <div className="mt-1.5 max-w-[80%] rounded-xl border border-sun-deep/20 bg-sun-soft p-3 text-xs text-sun-deep">
                {m.feedback.corrections.map((c, i) => (
                  <p key={i}>
                    <span className="line-through opacity-60">{c.original}</span> → <span className="font-medium">{c.corrected}</span>
                    {c.note && <span className="block text-sun-deep/70">{c.note}</span>}
                  </p>
                ))}
                {m.feedback.tip && <p className="mt-1 text-sun-deep/70">Tip: {m.feedback.tip}</p>}
              </div>
            )}
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
        {timeUpNotice && !canEnd && (
          <p className="rounded-xl border border-sun-deep/20 bg-sun-soft px-4 py-2 text-xs text-sun-deep">
            Time&apos;s up — send at least 2 replies, then End &amp; Get Score.
          </p>
        )}
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="Type your reply…"
            aria-label="Message"
            dir="auto"
            maxLength={MAX_MESSAGE_LENGTH}
            className="h-11 flex-1 rounded-xl border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none"
          />
          {micSupported && (
            <button
              type="button"
              onClick={toggleMic}
              aria-label={listening ? "Stop dictation" : "Start dictation"}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-lg transition ${
                listening ? "border-destructive/40 bg-coral-soft text-destructive" : "border-border bg-card text-muted-foreground hover:border-line-strong"
              }`}
            >
              🎤
            </button>
          )}
          <button
            type="button"
            onClick={send}
            disabled={sending || !input.trim()}
            className="h-11 shrink-0 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition disabled:opacity-40"
          >
            Send
          </button>
        </div>
        <AnimatePresence>
          {canEnd && (
            <motion.button
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              type="button"
              onClick={() => onSubmit({ messages: messages.map(({ role, content }) => ({ role, content })) })}
              disabled={submitting}
              className="w-full rounded-full border border-border px-6 py-2.5 text-sm font-medium uppercase tracking-wider text-foreground transition hover:border-line-strong disabled:opacity-50"
            >
              {submitting ? "Scoring…" : "End & Get Score"}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
