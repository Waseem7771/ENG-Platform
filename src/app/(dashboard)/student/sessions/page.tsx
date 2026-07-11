"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import { api, ApiClientError } from "@/lib/api";
import type { SessionSummary } from "../_types";

const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { y: 16, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: [0.35, 0.35, 0, 1] as const } } };

export default function StudentSessionsPage() {
  const router = useRouter();
  const { data: sessions, loading, error, refetch } = useApi<SessionSummary[]>(
    () => api<{ sessions: SessionSummary[] }>("/api/sessions").then((r) => r.sessions),
    []
  );
  const [joiningId, setJoiningId] = useState<string | null>(null);

  async function handleJoin(id: string) {
    setJoiningId(id);
    try {
      await api(`/api/sessions/${id}/join`, { method: "POST" });
      router.push(`/student/sessions/${id}`);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't join that session.");
      setJoiningId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Live Sessions</h1>
        <p className="mt-1 text-muted-foreground">Join your teacher&apos;s live sessions and learn together in real-time</p>
      </div>

      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-border bg-card" />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-destructive/20 bg-coral-soft p-8 text-center">
          <p className="text-foreground">{error}</p>
          <button onClick={refetch} className="mt-4 rounded-full border border-border px-5 py-2 text-sm text-foreground hover:border-line-strong">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && sessions && (
        <>
          {sessions.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center">
              <p className="font-medium text-foreground">No active sessions</p>
              <p className="mt-2 text-sm text-muted-foreground">
                When your teacher starts a live session, it will appear here. Join to learn together with your classmates in real-time.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              <SessionSection
                title="Live now"
                sessions={sessions.filter((s) => s.status === "ACTIVE")}
                pulsing
                onJoin={handleJoin}
                joiningId={joiningId}
              />
              <SessionSection
                title="Waiting"
                sessions={sessions.filter((s) => s.status === "WAITING")}
                onJoin={handleJoin}
                joiningId={joiningId}
              />
              <SessionSection
                title="Recent"
                sessions={sessions.filter((s) => s.status === "ENDED")}
                onJoin={handleJoin}
                joiningId={joiningId}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SessionSection({
  title,
  sessions,
  pulsing = false,
  onJoin,
  joiningId,
}: {
  title: string;
  sessions: SessionSummary[];
  pulsing?: boolean;
  onJoin: (id: string) => void;
  joiningId: string | null;
}) {
  const router = useRouter();
  if (sessions.length === 0) return null;

  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {pulsing && <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-leaf" /></span>}
        {title}
      </h2>
      <motion.div initial="hidden" animate="visible" variants={container} className="grid gap-4 md:grid-cols-2">
        {sessions.map((s) => (
          <motion.div key={s.id} variants={item} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{s.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.className} · {s.teacherName}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.participantCount} participant{s.participantCount === 1 ? "" : "s"}</p>
              </div>
              {s.status === "ENDED" ? (
                <button onClick={() => router.push(`/student/sessions/${s.id}`)} className="shrink-0 rounded-full border border-border px-4 py-1.5 text-xs text-muted-foreground hover:border-line-strong">
                  View
                </button>
              ) : (
                <button
                  onClick={() => onJoin(s.id)}
                  disabled={joiningId === s.id}
                  className="shrink-0 rounded-full bg-primary px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-foreground shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {joiningId === s.id ? "Joining…" : "Join"}
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
