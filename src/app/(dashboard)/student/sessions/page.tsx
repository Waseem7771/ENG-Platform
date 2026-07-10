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
        <p className="mt-1 text-white/40">Join your teacher&apos;s live sessions and learn together in real-time</p>
      </div>

      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <p className="text-white/70">{error}</p>
          <button onClick={refetch} className="mt-4 rounded-full border border-white/15 px-5 py-2 text-sm text-white/80 hover:border-white/30">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && sessions && (
        <>
          {sessions.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-10 text-center">
              <p className="font-medium text-white/70">No active sessions</p>
              <p className="mt-2 text-sm text-white/40">
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
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/40">
        {pulsing && <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>}
        {title}
      </h2>
      <motion.div initial="hidden" animate="visible" variants={container} className="grid gap-4 md:grid-cols-2">
        {sessions.map((s) => (
          <motion.div key={s.id} variants={item} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{s.title}</p>
                <p className="mt-1 text-xs text-white/40">{s.className} · {s.teacherName}</p>
                <p className="mt-1 text-xs text-white/30">{s.participantCount} participant{s.participantCount === 1 ? "" : "s"}</p>
              </div>
              {s.status === "ENDED" ? (
                <button onClick={() => router.push(`/student/sessions/${s.id}`)} className="shrink-0 rounded-full border border-white/15 px-4 py-1.5 text-xs text-white/60 hover:border-white/30">
                  View
                </button>
              ) : (
                <button
                  onClick={() => onJoin(s.id)}
                  disabled={joiningId === s.id}
                  className="shrink-0 rounded-full bg-gradient-to-r from-violet-600 to-blue-500 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-white shadow-lg shadow-violet-500/20 disabled:opacity-50"
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
