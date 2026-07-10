"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Trash2, Users, Video, Plus } from "lucide-react";
import { FloatingParticles } from "@/components/shared/floating-particles";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LevelBadge, SessionStatusBadge } from "@/components/teacher/badges";
import { CopyCode } from "@/components/teacher/copy-code";
import { EmptyState, ErrorState } from "@/components/teacher/state-views";
import { ConfirmDialog } from "@/components/teacher/confirm-dialog";
import { api, ApiClientError } from "@/lib/api";
import type { TeacherClassDetail } from "@/components/teacher/types";

export default function ClassDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const classId = params.id;

  const [detail, setDetail] = useState<TeacherClassDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingSession, setStartingSession] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<TeacherClassDetail>(`/api/classes/${classId}`);
      setDetail(data);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Couldn't load this class.");
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    try {
      await api(`/api/classes/${classId}`, { method: "DELETE" });
      toast.success("Class deleted");
      router.push("/teacher/classes");
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Couldn't delete this class.");
    }
  }

  async function handleNewSession() {
    if (!detail) return;
    setStartingSession(true);
    try {
      const { session } = await api<{ session: { id: string } }>("/api/sessions", {
        method: "POST",
        body: JSON.stringify({
          classId: detail.id,
          title: `${detail.name} — ${new Date().toLocaleDateString()}`,
        }),
      });
      router.push(`/teacher/sessions/${session.id}`);
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Couldn't start a session.");
      setStartingSession(false);
    }
  }

  return (
    <div className="relative min-h-screen">
      <FloatingParticles count={10} />

      <Link href="/teacher/classes" className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white/70">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to classes
      </Link>

      {loading && (
        <div className="space-y-6">
          <div className="h-28 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
          <div className="h-64 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
        </div>
      )}

      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && detail && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight">{detail.name}</h1>
                  <LevelBadge level={detail.level} />
                </div>
                <p className="max-w-xl text-sm text-white/40">{detail.description || "No description yet."}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="text-[11px] uppercase tracking-widest text-white/25">Join code</span>
                <CopyCode code={detail.code} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-7">
            <Tabs defaultValue="students">
              <TabsList variant="line" className="mb-6 border-b border-white/5">
                <TabsTrigger value="students" className="gap-1.5 text-white/50 data-active:text-white">
                  <Users className="h-3.5 w-3.5" />
                  Students ({detail.students.length})
                </TabsTrigger>
                <TabsTrigger value="sessions" className="gap-1.5 text-white/50 data-active:text-white">
                  <Video className="h-3.5 w-3.5" />
                  Sessions ({detail.sessions.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="students">
                {detail.students.length === 0 ? (
                  <EmptyState
                    icon={<Users className="h-6 w-6" />}
                    title="No students yet"
                    description={`Share code ${detail.code} with your students so they can join.`}
                  />
                ) : (
                  <RosterTable students={detail.students} />
                )}
              </TabsContent>

              <TabsContent value="sessions">
                <div className="mb-4 flex justify-end">
                  <button
                    onClick={handleNewSession}
                    disabled={startingSession}
                    className="flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-blue-500 px-4 py-2 text-sm font-medium text-white transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
                  >
                    {startingSession ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    New session
                  </button>
                </div>
                {detail.sessions.length === 0 ? (
                  <EmptyState icon={<Video className="h-6 w-6" />} title="No sessions yet" description="Start a live session for this class." />
                ) : (
                  <ul className="space-y-2">
                    {detail.sessions.map((s) => (
                      <li key={s.id}>
                        <Link
                          href={`/teacher/sessions/${s.id}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.015] p-4 transition-colors hover:border-white/10 hover:bg-white/[0.04]"
                        >
                          <div>
                            <p className="text-sm font-medium text-white/80">{s.title}</p>
                            <p className="mt-0.5 text-xs text-white/30">{new Date(s.createdAt).toLocaleString()}</p>
                          </div>
                          <SessionStatusBadge status={s.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="rounded-2xl border border-red-500/10 bg-red-500/[0.02] p-7">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-red-400/80">Danger zone</h2>
            <p className="mb-4 text-sm text-white/40">Deleting a class removes it for all enrolled students. This cannot be undone.</p>
            <ConfirmDialog
              trigger={
                <button className="flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10">
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete class
                </button>
              }
              title={`Delete "${detail.name}"?`}
              description="This will permanently remove the class, its roster, and its session history."
              confirmLabel="Delete class"
              destructive
              onConfirm={handleDelete}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}

function RosterTable({ students }: { students: TeacherClassDetail["students"] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-white/30">
            <th className="pb-3 font-medium">Name</th>
            <th className="pb-3 font-medium">Level</th>
            <th className="pb-3 font-medium">Overall score</th>
            <th className="pb-3 pr-0 text-right font-medium">XP</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id} className="border-b border-white/5 last:border-0">
              <td className="py-3.5">
                <p className="font-medium text-white/80">{s.name}</p>
                <p className="text-xs text-white/30">{s.email}</p>
              </td>
              <td className="py-3.5">{s.level ? <LevelBadge level={s.level} /> : <span className="text-white/25">—</span>}</td>
              <td className="py-3.5">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500" style={{ width: `${s.overallScore}%` }} />
                  </div>
                  <span className="text-xs text-white/40">{s.overallScore}%</span>
                </div>
              </td>
              <td className="py-3.5 text-right font-medium text-amber-400/90">{s.xp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
