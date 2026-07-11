"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Radio, Users } from "lucide-react";
import { ErrorState, EmptyState, ListSkeleton } from "@/components/teacher/state-views";
import { SessionStatusBadge } from "@/components/teacher/badges";
import { StartSessionDialog } from "@/components/teacher/sessions/start-session-dialog";
import { api, ApiClientError } from "@/lib/api";
import type { SessionStatus } from "@/types";
import type { TeacherSessionListItem } from "@/components/teacher/types";

const GROUPS: { status: SessionStatus; label: string }[] = [
  { status: "ACTIVE", label: "Live now" },
  { status: "WAITING", label: "Waiting to start" },
  { status: "ENDED", label: "Ended" },
];

export default function TeacherSessionsPage() {
  const [sessions, setSessions] = useState<TeacherSessionListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ sessions: TeacherSessionListItem[] }>("/api/sessions");
      setSessions(data.sessions);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Couldn't load your sessions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    if (!sessions) return null;
    return GROUPS.map((g) => ({
      ...g,
      items: sessions
        .filter((s) => s.status === g.status)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    }));
  }, [sessions]);

  return (
    <div className="relative min-h-screen">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Sessions</h1>
          <p className="mt-1 text-muted-foreground">Run real-time classes and push exercises to your students.</p>
        </div>
        <StartSessionDialog />
      </div>

      {loading && <ListSkeleton count={5} />}

      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && sessions && sessions.length === 0 && (
        <EmptyState
          icon={<Radio className="h-6 w-6" />}
          title="No sessions yet"
          description="Start a live session for your class. Students will be able to join and learn together in real-time."
        />
      )}

      {!loading && !error && grouped && sessions && sessions.length > 0 && (
        <div className="space-y-8">
          {grouped
            .filter((g) => g.items.length > 0)
            .map((g) => (
              <div key={g.status}>
                <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {g.label}
                  <span className="text-muted-foreground">·</span>
                  {g.items.length}
                </h2>
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
                  className="space-y-2"
                >
                  {g.items.map((s) => (
                    <motion.div key={s.id} variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
                      <SessionRow session={s} />
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function SessionRow({ session }: { session: TeacherSessionListItem }) {
  return (
    <div className="rounded-card border-2 border-border bg-card shadow-sticker p-0">
      <Link href={`/teacher/sessions/${session.id}`} className="flex items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2">
            <h3 className="truncate font-semibold text-foreground">{session.title}</h3>
            <SessionStatusBadge status={session.status} />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>{session.className}</span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {session.participantCount}
            </span>
            <span>{new Date(session.createdAt).toLocaleString()}</span>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
          Open room
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </Link>
    </div>
  );
}
