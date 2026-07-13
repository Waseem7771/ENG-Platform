"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiClientError } from "@/lib/api";
import { useLocale, useT } from "@/components/providers/locale-provider";
import { SessionStatusBadge } from "@/components/teacher/badges";
import { SessionLobby } from "@/components/shared/session-lobby";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n-shared";
import type { SessionDetail, SessionMessageDTO } from "../../_types";

const POLL_MS = 2500;

/** Presentational only: renders scheduledAt in the viewer's locale + local timezone. */
function formatScheduledAt(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleString(locale === "ar" ? "ar" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function SessionRoom({ id }: { id: string }) {
  const t = useT();
  const locale = useLocale();
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
        if (isInitial) setError(err instanceof ApiClientError ? err.message : t("session.loadFailed"));
      } finally {
        if (isInitial) setLoading(false);
      }
    },
    [id, t]
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
      <div className="mx-auto max-w-lg rounded-2xl border border-destructive/20 bg-coral-soft p-8 text-center">
        <p className="text-foreground">{error ?? t("session.loadFailed")}</p>
        <div className="mt-4 flex justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true);
              fetchUpdates(true);
            }}
          >
            {t("common.retry")}
          </Button>
          <Button render={<Link href="/student/sessions" />} nativeButton={false} role="link" size="sm">
            {t("session.backToSessions")}
          </Button>
        </div>
      </div>
    );
  }

  const isEnded = detail.session.status === "ENDED";
  const isLobby = detail.phase === "LOBBY" || detail.phase === "SCHEDULED";

  return (
    <div className="relative flex h-[calc(100vh-4rem)] flex-col gap-4 lg:flex-row">
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <p className="font-medium text-foreground">{detail.session.title}</p>
            <p className="text-xs text-muted-foreground">{detail.session.className} · {detail.session.teacherName}</p>
          </div>
          <SessionStatusBadge status={detail.session.status} />
        </div>

        <AnimatePresence>
          {detail.pushedExercise && (
            <motion.div
              key={detail.pushedExercise.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="m-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-secondary px-4 py-3"
            >
              <p className="text-sm text-foreground">
                Your teacher pushed: <span className="font-semibold">{detail.pushedExercise.title}</span>
              </p>
              <button
                onClick={() => router.push(`/student/exercises/${detail.pushedExercise!.id}`)}
                className="shrink-0 rounded-full bg-primary px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-primary-foreground"
              >
                Start Exercise
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && <p className="text-center text-sm text-muted-foreground">{t("session.chatEmpty")}</p>}
          {messages
            .filter((m) => m.type !== "EXERCISE")
            .map((m) => {
              if (m.type === "SYSTEM") {
                return (
                  <p key={m.id} className="text-center text-xs italic text-muted-foreground">
                    {m.content}
                  </p>
                );
              }
              const isMe = m.user.id === meId;
              return (
                <div key={m.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  {!isMe && <span className="mb-1 text-[11px] text-muted-foreground">{m.user.name}</span>}
                  <div
                    dir="auto"
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                      isMe
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-foreground"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })}
        </div>

        <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-border p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isEnded}
            placeholder={isEnded ? t("session.chatEnded") : t("session.chatPlaceholder")}
            aria-label={t("session.chatPlaceholder")}
            dir="auto"
            maxLength={1000}
            className="h-11 flex-1 rounded-xl border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none disabled:opacity-40"
          />
          <Button type="submit" disabled={sending || isEnded || !input.trim()}>
            {t("session.send")}
          </Button>
        </form>
      </div>

      <div className="flex w-full shrink-0 flex-col rounded-2xl border border-border bg-card p-5 lg:w-72">
        {isLobby ? (
          <SessionLobby
            teacherName={detail.session.teacherName}
            roster={detail.roster}
            waitingText={
              <>
                <p>{t("session.waitingForTeacher", { teacher: detail.session.teacherName })}</p>
                {detail.phase === "SCHEDULED" && detail.session.scheduledAt && (
                  <p className="mt-1">
                    {t("session.scheduledFor", { when: formatScheduledAt(detail.session.scheduledAt, locale) })}
                  </p>
                )}
              </>
            }
          />
        ) : (
          <>
            <h3 className="mb-4 text-xs uppercase tracking-wider text-muted-foreground">
              {t("session.participants")} ({roster.length})
            </h3>
            <ul className="space-y-2">
              {roster.map((p) => (
                <li key={p.id} className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate text-sm text-foreground">{p.name}</span>
                  {p.isTeacher && (
                    <span className="ms-auto text-[10px] uppercase tracking-wider text-primary">{t("session.teacher")}</span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {isEnded && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/70">
          <div className="rounded-2xl border border-border bg-background p-8 text-center">
            <p className="text-lg font-semibold text-foreground">Session ended</p>
            <p className="mt-2 text-sm text-muted-foreground">Thanks for participating!</p>
            <Link href="/student/sessions" className="mt-4 inline-block rounded-full bg-primary px-6 py-2 text-sm text-primary-foreground">
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
      <div className="flex-1 animate-pulse rounded-2xl border border-border bg-card" />
      <div className="h-40 w-full shrink-0 animate-pulse rounded-2xl border border-border bg-card lg:h-full lg:w-72" />
    </div>
  );
}
