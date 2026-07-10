"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiClientError } from "@/lib/api";
import type { SessionDetail, SessionMessageDTO } from "../../_types";

const POLL_MS = 2500;

const statusColor: Record<string, string> = {
  ACTIVE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  WAITING: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  ENDED: "border-white/10 bg-white/[0.02] text-white/40",
};

export function SessionRoom({ id }: { id: string }) {
  const router = useRouter();
  const [meId, setMeId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [messages, setMessages] = useState<SessionMessageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const cursorRef = useRef<string | undefined>(undefined);
  const prevPushedIdRef = useRef<string | null>(null);
  const endedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchUpdates = useCallback(
    async (isInitial = false) => {
      if (endedRef.current && !isInitial) return;
      try {
        const qs = cursorRef.current ? `?after=${encodeURIComponent(cursorRef.current)}` : "";
        const res = await api<SessionDetail>(`/api/sessions/${id}${qs}`);
        cursorRef.current = res.serverTime;
        setDetail(res);
        setMessages((prev) => {
          const map = new Map(prev.map((m) => [m.id, m]));
          for (const m of res.messages) map.set(m.id, m);
          return Array.from(map.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        });
        if (res.pushedExercise && res.pushedExercise.id !== prevPushedIdRef.current) {
          if (prevPushedIdRef.current !== null) toast.info(`Your teacher pushed: ${res.pushedExercise.title}`);
          prevPushedIdRef.current = res.pushedExercise.id;
        }
        if (res.session.status === "ENDED") endedRef.current = true;
        setError(null);
      } catch (err) {
        if (isInitial) setError(err instanceof ApiClientError ? err.message : "Couldn't load this session.");
      } finally {
        if (isInitial) setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    api<{ user: { id: string } }>("/api/me").then((r) => setMeId(r.user.id)).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await api(`/api/sessions/${id}/join`, { method: "POST" });
      } catch {
        // joining is idempotent / best-effort; the GET below still reveals read access errors
      }
      if (!cancelled) await fetchUpdates(true);
    })();
    const interval = setInterval(() => fetchUpdates(false), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id, fetchUpdates]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const roster = useMemo(() => {
    if (!detail) return [];
    return [
      { id: detail.session.teacherId, name: detail.session.teacherName, isTeacher: true },
      ...detail.participants.map((p) => ({ id: p.id, name: p.name, isTeacher: false })),
    ];
  }, [detail]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await api(`/api/sessions/${id}/messages`, { method: "POST", body: JSON.stringify({ content: text }) });
      setInput("");
      await fetchUpdates(false);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Message failed to send.");
    } finally {
      setSending(false);
    }
  }

  if (loading) return <RoomSkeleton />;
  if (error || !detail) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
        <p className="text-white/70">{error ?? "Session not found."}</p>
        <div className="mt-4 flex justify-center gap-3">
          <button
            onClick={() => {
              setLoading(true);
              fetchUpdates(true);
            }}
            className="rounded-full border border-white/15 px-5 py-2 text-sm text-white/80 hover:border-white/30"
          >
            Retry
          </button>
          <Link href="/student/sessions" className="rounded-full bg-gradient-to-r from-violet-600 to-blue-500 px-5 py-2 text-sm text-white">
            Back to Sessions
          </Link>
        </div>
      </div>
    );
  }

  const isEnded = detail.session.status === "ENDED";

  return (
    <div className="relative flex h-[calc(100vh-4rem)] flex-col gap-4 lg:flex-row">
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/5 bg-white/[0.02]">
        <div className="flex items-center justify-between border-b border-white/5 p-4">
          <div>
            <p className="font-medium text-white">{detail.session.title}</p>
            <p className="text-xs text-white/30">{detail.session.className} · {detail.session.teacherName}</p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusColor[detail.session.status]}`}>{detail.session.status}</span>
        </div>

        <AnimatePresence>
          {detail.pushedExercise && (
            <motion.div
              key={detail.pushedExercise.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="m-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-500/15 to-blue-500/10 px-4 py-3"
            >
              <p className="text-sm text-white">
                Your teacher pushed: <span className="font-semibold">{detail.pushedExercise.title}</span>
              </p>
              <button
                onClick={() => router.push(`/student/exercises/${detail.pushedExercise!.id}`)}
                className="shrink-0 rounded-full bg-gradient-to-r from-violet-600 to-blue-500 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-white"
              >
                Start Exercise
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && <p className="text-center text-sm text-white/25">No messages yet — say hello!</p>}
          {messages
            .filter((m) => m.type !== "EXERCISE")
            .map((m) => {
              if (m.type === "SYSTEM") {
                return (
                  <p key={m.id} className="text-center text-xs italic text-white/25">
                    {m.content}
                  </p>
                );
              }
              const isMe = m.user.id === meId;
              return (
                <div key={m.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  {!isMe && <span className="mb-1 text-[11px] text-white/30">{m.user.name}</span>}
                  <div
                    dir="auto"
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                      isMe ? "bg-gradient-to-r from-violet-600 to-blue-500 text-white" : "border border-white/10 bg-white/[0.03] text-white/80"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })}
        </div>

        <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-white/5 p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isEnded}
            placeholder={isEnded ? "This session has ended" : "Type a message…"}
            aria-label="Message"
            dir="auto"
            maxLength={1000}
            className="h-11 flex-1 rounded-xl border border-white/10 bg-white/[0.02] px-4 text-sm text-white placeholder:text-white/25 focus:border-violet-500/40 focus:outline-none disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={sending || isEnded || !input.trim()}
            className="h-11 shrink-0 rounded-xl bg-gradient-to-r from-violet-600 to-blue-500 px-5 text-sm font-medium text-white transition disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </div>

      <div className="w-full shrink-0 rounded-2xl border border-white/5 bg-white/[0.02] p-5 lg:w-72">
        <h3 className="mb-4 text-xs uppercase tracking-wider text-white/30">Participants ({roster.length})</h3>
        <ul className="space-y-2">
          {roster.map((p) => (
            <li key={p.id} className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600/40 to-blue-500/40 text-xs font-semibold text-white">
                {p.name.charAt(0).toUpperCase()}
              </div>
              <span className="truncate text-sm text-white/70">{p.name}</span>
              {p.isTeacher && <span className="ml-auto text-[10px] uppercase tracking-wider text-violet-300">Teacher</span>}
            </li>
          ))}
        </ul>
      </div>

      {isEnded && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/70 backdrop-blur-sm">
          <div className="rounded-2xl border border-white/10 bg-[#14111f] p-8 text-center">
            <p className="text-lg font-semibold text-white">Session ended</p>
            <p className="mt-2 text-sm text-white/40">Thanks for participating!</p>
            <Link href="/student/sessions" className="mt-4 inline-block rounded-full bg-gradient-to-r from-violet-600 to-blue-500 px-6 py-2 text-sm text-white">
              Back to Sessions
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function RoomSkeleton() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 lg:flex-row">
      <div className="flex-1 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
      <div className="h-40 w-full shrink-0 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02] lg:h-full lg:w-72" />
    </div>
  );
}
