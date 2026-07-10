"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Radio, PenSquare, Plus, Video, Users } from "lucide-react";
import { SpotlightCard } from "@/components/shared/spotlight-card";
import { FloatingParticles } from "@/components/shared/floating-particles";
import { CountUp } from "@/components/shared/count-up";
import { ErrorState } from "@/components/teacher/state-views";
import { SessionStatusBadge } from "@/components/teacher/badges";
import { api, ApiClientError } from "@/lib/api";
import type { TeacherClassListItem, TeacherExerciseListItem, TeacherSessionListItem, TeacherStudentListItem } from "@/components/teacher/types";

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { y: 30, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: [0.35, 0.35, 0, 1] as const } },
};

interface DashboardData {
  students: TeacherStudentListItem[];
  classes: TeacherClassListItem[];
  sessions: TeacherSessionListItem[];
  exercises: TeacherExerciseListItem[];
}

export default function TeacherDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [students, classes, sessionsRes, exercises] = await Promise.all([
        api<TeacherStudentListItem[]>("/api/students"),
        api<TeacherClassListItem[]>("/api/classes"),
        api<{ sessions: TeacherSessionListItem[] }>("/api/sessions"),
        api<TeacherExerciseListItem[]>("/api/exercises"),
      ]);
      setData({ students, classes, sessions: sessionsRes.sessions, exercises });
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Couldn't load your dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const liveSessionsCount = data?.sessions.filter((s) => s.status === "ACTIVE").length ?? 0;
  const recentSessions = [...(data?.sessions ?? [])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="relative min-h-screen">
      <FloatingParticles count={12} />

      <motion.div initial="hidden" animate="visible" variants={container} className="space-y-8">
        <motion.div variants={item}>
          <h1 className="text-4xl font-bold tracking-tight">
            Teacher
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent"> Command Center</span>
          </h1>
          <p className="mt-2 text-white/40">Inspire your students and track their progress.</p>
        </motion.div>

        {error && !loading && (
          <motion.div variants={item}>
            <ErrorState message={error} onRetry={load} />
          </motion.div>
        )}

        {!error && (
          <>
            <motion.div variants={container} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <motion.div variants={item}>
                <StatCard title="Total Students" value={data?.students.length ?? 0} loading={loading} color="emerald" />
              </motion.div>
              <motion.div variants={item}>
                <StatCard title="Active Classes" value={data?.classes.length ?? 0} loading={loading} color="teal" />
              </motion.div>
              <motion.div variants={item}>
                <StatCard title="Live Sessions" value={liveSessionsCount} loading={loading} color="cyan" />
              </motion.div>
              <motion.div variants={item}>
                <StatCard title="Exercises Created" value={data?.exercises.length ?? 0} loading={loading} color="blue" />
              </motion.div>
            </motion.div>

            <motion.div variants={container} className="grid gap-6 lg:grid-cols-3">
              <motion.div variants={item} className="lg:col-span-2">
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-7">
                  <h2 className="mb-6 text-lg font-semibold tracking-tight">Recent Activity</h2>
                  {loading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }, (_, i) => (
                        <div key={i} className="h-16 animate-pulse rounded-xl border border-white/5 bg-white/[0.02]" />
                      ))}
                    </div>
                  ) : recentSessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-white/5 bg-white/[0.01] p-12 text-center">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                        <Radio className="h-6 w-6" />
                      </div>
                      <p className="font-medium text-white/60">No activity yet</p>
                      <p className="mt-1 text-sm text-white/25">Create a class and invite students to get started.</p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {recentSessions.map((s) => (
                        <li key={s.id}>
                          <Link
                            href={`/teacher/sessions/${s.id}`}
                            className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.015] p-3.5 transition-colors hover:border-white/10 hover:bg-white/[0.04]"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-white/80">{s.title}</p>
                              <p className="truncate text-xs text-white/30">{s.className}</p>
                            </div>
                            <SessionStatusBadge status={s.status} className="shrink-0" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </motion.div>

              <motion.div variants={item}>
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-7">
                  <h2 className="mb-6 text-lg font-semibold tracking-tight">Quick Actions</h2>
                  <div className="space-y-3">
                    <QuickAction label="Create a Class" href="/teacher/classes" icon={<Users className="h-4 w-4" />} color="emerald" />
                    <QuickAction label="Start a Session" href="/teacher/sessions" icon={<Video className="h-4 w-4" />} color="cyan" />
                    <QuickAction label="Create an Exercise" href="/teacher/exercises" icon={<PenSquare className="h-4 w-4" />} color="blue" />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
}

function StatCard({ title, value, loading, color }: { title: string; value: number; loading: boolean; color: string }) {
  const colors: Record<string, string> = {
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/10",
    teal: "from-teal-500/20 to-teal-500/5 border-teal-500/10",
    cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/10",
    blue: "from-blue-500/20 to-blue-500/5 border-blue-500/10",
  };
  const dotColors: Record<string, string> = {
    emerald: "bg-emerald-400",
    teal: "bg-teal-400",
    cyan: "bg-cyan-400",
    blue: "bg-blue-400",
  };

  return (
    <SpotlightCard className={`rounded-2xl border bg-gradient-to-b ${colors[color]} p-6`} spotlightColor="rgba(16, 185, 129, 0.08)">
      <div className="mb-3 flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${dotColors[color]}`} />
        <span className="text-xs uppercase tracking-wider text-white/40">{title}</span>
      </div>
      {loading ? (
        <div className="h-8 w-16 animate-pulse rounded bg-white/10" />
      ) : (
        <p className="text-3xl font-bold tracking-tight">
          <CountUp end={value} duration={1.2} />
        </p>
      )}
    </SpotlightCard>
  );
}

function QuickAction({ label, href, icon, color }: { label: string; href: string; icon: React.ReactNode; color: string }) {
  const bgColors: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-400",
    cyan: "bg-cyan-500/10 text-cyan-400",
    blue: "bg-blue-500/10 text-blue-400",
  };

  return (
    <Link href={href}>
      <motion.div
        className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-colors duration-300 hover:border-white/10 hover:bg-white/[0.04]"
        whileHover={{ x: 4 }}
        transition={{ duration: 0.2 }}
      >
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${bgColors[color]}`}>{icon}</div>
        <span className="text-sm font-medium text-white/70">{label}</span>
        <Plus className="ml-auto h-3.5 w-3.5 text-white/20" />
      </motion.div>
    </Link>
  );
}
