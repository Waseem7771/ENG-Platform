"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Clock, MessageSquare, Play, Square, Users } from "lucide-react";
import { ErrorState } from "@/components/teacher/state-views";
import { SessionStatusBadge, ExerciseTypeBadge } from "@/components/teacher/badges";
import { ConfirmDialog } from "@/components/teacher/confirm-dialog";
import { SessionChat, type ExerciseCacheEntry } from "@/components/teacher/sessions/session-chat";
import { SessionParticipants } from "@/components/teacher/sessions/session-participants";
import { SessionLobby } from "@/components/shared/session-lobby";
import { PushExerciseDialog } from "@/components/teacher/sessions/push-exercise-dialog";
import { useElapsedTimer } from "@/components/teacher/sessions/use-elapsed-timer";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/providers/locale-provider";
import { api, ApiClientError } from "@/lib/api";
import type { SessionMessageItem, TeacherSessionDetail } from "@/components/teacher/types";
import type { SessionStatus } from "@/types";

const POLL_MS = 2500;

/** WAITING -> ACTIVE -> ENDED only moves forward; a stale/in-flight poll can never regress it. */
const STATUS_RANK: Record<SessionStatus, number> = { WAITING: 0, ACTIVE: 1, ENDED: 2 };

/** Rebuilds the list from a Map keyed by id so no id can ever appear twice, then sorts by time. */
function mergeMessages(prev: SessionMessageItem[], incoming: SessionMessageItem[]): SessionMessageItem[] {
  const byId = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return Array.from(byId.values()).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export default function TeacherSessionRoomPage() {
  const t = useT();
  const params = useParams<{ id: string }>();
  const sessionId = params.id;

  const [session, setSession] = useState<TeacherSessionDetail["session"] | null>(null);
  const [participants, setParticipants] = useState<TeacherSessionDetail["participants"]>([]);
  const [roster, setRoster] = useState<TeacherSessionDetail["roster"]>([]);
  const [messages, setMessages] = useState<SessionMessageItem[]>([]);
  const [pushedExercise, setPushedExercise] = useState<TeacherSessionDetail["pushedExercise"]>(null);
  const [exerciseCache, setExerciseCache] = useState<Record<string, ExerciseCacheEntry>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const cursorRef = useRef<string | undefined>(undefined);
  const mountedRef = useRef(true);

  const poll = useCallback(async () => {
    try {
      // `after` is the polling cursor: the createdAt of the newest message the previous
      // response actually returned (echoed back from `serverTime`), NOT wall-clock time.
      const qs = cursorRef.current ? `?after=${encodeURIComponent(cursorRef.current)}` : "";
      const data = await api<TeacherSessionDetail>(`/api/sessions/${sessionId}${qs}`);
      if (!mountedRef.current) return;
      setSession((prev) => (prev && STATUS_RANK[data.session.status] < STATUS_RANK[prev.status] ? prev : data.session));
      setParticipants(data.participants);
      setRoster(data.roster);
      setPushedExercise(data.pushedExercise);
      if (data.pushedExercise) {
        setExerciseCache((prev) => ({ ...prev, [data.pushedExercise!.id]: { title: data.pushedExercise!.title, type: data.pushedExercise!.type } }));
      }
      // The boundary message can repeat across polls (server uses `gte` on the cursor) —
      // merge by id so it's never duplicated in the list.
      setMessages((prev) => mergeMessages(prev, data.messages));
      cursorRef.current = data.serverTime;
      setClockOffsetMs(Date.parse(data.serverTime) - Date.now());
      setError(null);
    } catch (e) {
      if (mountedRef.current) setError(e instanceof ApiClientError ? e.message : t("session.loadFailed"));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [sessionId, t]);

  useEffect(() => {
    mountedRef.current = true;
    api<{ user: { id: string } }>("/api/me")
      .then((me) => mountedRef.current && setCurrentUserId(me.user.id))
      .catch(() => {});
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [poll]);

  async function handleStart() {
    setBusy(true);
    try {
      // The PATCH response's session object is authoritative — apply it directly rather
      // than guessing startedAt client-side, so a later stale poll can't contradict it.
      const res = await api<{ session: TeacherSessionDetail["session"] }>(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "start" }),
      });
      setSession(res.session);
      toast.success(t("session.sessionLive"));
      poll();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : t("session.startFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleEnd() {
    try {
      const res = await api<{ session: TeacherSessionDetail["session"] }>(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "end" }),
      });
      setSession(res.session);
      toast.success(t("session.sessionEnded"));
      poll();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : t("session.endFailed"));
    }
  }

  async function handleSend(content: string) {
    const tempId = `temp-${Date.now()}`;
    const optimistic: SessionMessageItem = {
      id: tempId,
      content,
      type: "TEXT",
      createdAt: new Date().toISOString(),
      user: { id: currentUserId ?? "me", name: "You", role: "TEACHER" },
    };
    setMessages((prev) => mergeMessages(prev, [optimistic]));
    try {
      const res = await api<{ message: SessionMessageItem }>(`/api/sessions/${sessionId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      // Drop the temp bubble and merge in the real one by id — if a poll already raced
      // in the same message, this collapses to a single entry instead of a duplicate key.
      setMessages((prev) => mergeMessages(
        prev.filter((m) => m.id !== tempId),
        [res.message]
      ));
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast.error(e instanceof ApiClientError ? e.message : t("session.messageSendFailed"));
    }
  }

  const elapsed = useElapsedTimer(session?.status === "ACTIVE" ? session.startedAt : null, clockOffsetMs);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-20 animate-pulse rounded-2xl border border-border bg-card" />
        <div className="h-[60vh] animate-pulse rounded-2xl border border-border bg-card" />
      </div>
    );
  }

  if (error && !session) {
    return <ErrorState message={error} onRetry={poll} />;
  }

  if (!session) return null;

  const studentCount = participants.length;
  // WAITING == phase LOBBY or SCHEDULED (server-computed): pre-start waiting room with chat enabled.
  const isLobby = session.status === "WAITING";

  return (
    <div className="relative flex h-[calc(100vh-4rem)] flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5">
        <div className="min-w-0">
          <Link href="/teacher/sessions" className="mb-1.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-3 w-3" />
            {t("session.allSessions")}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-bold tracking-tight">{session.title}</h1>
            <SessionStatusBadge status={session.status} />
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{session.className}</p>
        </div>

        <div className="flex items-center gap-3">
          {session.status === "ACTIVE" && (
            <span className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-sm font-medium tabular-nums text-foreground">
              <Clock className="h-3.5 w-3.5" />
              {elapsed}
            </span>
          )}
          {session.status === "WAITING" && (
            <Button variant="brand" onClick={handleStart} disabled={busy}>
              <Play className="h-3.5 w-3.5" />
              {t("session.startSession")}
            </Button>
          )}
          {session.status === "ACTIVE" && (
            <ConfirmDialog
              trigger={
                <Button variant="destructive">
                  <Square className="h-3.5 w-3.5" />
                  {t("session.endSession")}
                </Button>
              }
              title={t("session.endConfirmTitle")}
              description={t("session.endConfirmDescription")}
              confirmLabel={t("session.endSession")}
              destructive
              onConfirm={handleEnd}
            />
          )}
        </div>
      </div>

      {session.status === "ENDED" && (
        <div className="mb-4 grid grid-cols-3 gap-3">
          <SummaryStat icon={<Clock className="h-4 w-4" />} label="Duration" value={sessionDuration(session.startedAt, session.endedAt)} />
          <SummaryStat icon={<Users className="h-4 w-4" />} label="Participants" value={String(studentCount)} />
          <SummaryStat icon={<MessageSquare className="h-4 w-4" />} label="Messages" value={String(messages.filter((m) => m.type === "TEXT").length)} />
        </div>
      )}

      {pushedExercise && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-primary/25 bg-secondary px-4 py-3">
          <span className="text-xs uppercase tracking-widest text-primary/70">{t("session.pinned")}</span>
          <span className="text-sm font-medium text-foreground">{pushedExercise.title}</span>
          <ExerciseTypeBadge type={pushedExercise.type} />
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_280px]">
        <div className="min-h-0 rounded-2xl border border-border bg-card">
          <SessionChat
            messages={messages}
            exerciseCache={exerciseCache}
            currentUserId={currentUserId}
            onSend={handleSend}
            disabled={session.status === "ENDED"}
            disabledPlaceholder={t("session.chatEnded")}
          />
        </div>

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto rounded-2xl border border-border bg-card p-4">
          {isLobby ? (
            <SessionLobby teacherName={session.teacherName} roster={roster} />
          ) : (
            <>
              <PushExerciseDialog
                sessionId={sessionId}
                disabled={session.status !== "ACTIVE"}
                onPushed={(ex) => {
                  setExerciseCache((prev) => ({ ...prev, [ex.id]: { title: ex.title, type: ex.type } }));
                  poll();
                }}
              />
              <SessionParticipants participants={participants} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-primary">{icon}</div>
      <div>
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function sessionDuration(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt || !endedAt) return "—";
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "<1 min";
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
