"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/shared/count-up";
import { useApi } from "@/hooks/use-api";
import { api, ApiClientError } from "@/lib/api";
import type { ExerciseListItem } from "@/types";
import type { ClassSummary, MeResponse } from "./_types";

const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const item = { hidden: { y: 30, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: [0.35, 0.35, 0, 1] as const } } };

const SKILLS: { category: string; label: string; color: string }[] = [
  { category: "GRAMMAR", label: "Grammar", color: "bg-primary" },
  { category: "VOCABULARY", label: "Vocabulary", color: "bg-sun" },
  { category: "LISTENING", label: "Listening", color: "bg-leaf" },
  { category: "TRANSLATION", label: "Translation", color: "bg-primary" },
  { category: "SPEAKING", label: "Speaking", color: "bg-sun" },
];

export default function StudentDashboard() {
  const me = useApi<MeResponse>(() => api<MeResponse>("/api/me"), []);
  const exercises = useApi<ExerciseListItem[]>(() => api<ExerciseListItem[]>("/api/exercises"), []);
  const classes = useApi<ClassSummary[]>(() => api<ClassSummary[]>("/api/classes"), []);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      toast.error("Enter the 6-character class code.");
      return;
    }
    setJoining(true);
    try {
      const res = await api<{ alreadyJoined: boolean }>("/api/classes/join", {
        method: "POST",
        body: JSON.stringify({ code: trimmed }),
      });
      toast.success(res.alreadyJoined ? "You're already in that class." : "Joined class!");
      setCode("");
      classes.refetch();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Couldn't join that class.");
    } finally {
      setJoining(false);
    }
  }

  if (me.loading) return <DashboardSkeleton />;
  if (me.error || !me.data) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-destructive/20 bg-coral-soft p-8 text-center">
        <p className="text-foreground">{me.error ?? "Couldn't load your dashboard."}</p>
        <button onClick={() => me.refetch()} className="mt-4 rounded-full border border-border px-5 py-2 text-sm text-foreground hover:border-line-strong">
          Retry
        </button>
      </div>
    );
  }

  const { user, progress } = me.data;
  const overall = progress.find((p) => p.category === "OVERALL");
  const totalXp = overall?.xp ?? 0;
  const streak = overall?.streak ?? 0;
  const exercisesDone = exercises.data?.filter((e) => e.completed).length ?? 0;

  return (
    <motion.div initial="hidden" animate="visible" variants={container} className="space-y-8">
        <motion.div variants={item}>
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome back, {user.name.split(" ")[0]}
            <span className="text-primary">!</span>
          </h1>
          <p className="mt-2 text-muted-foreground">Your English learning journey awaits. Let&apos;s make today count.</p>
        </motion.div>

        {!user.level && (
          <motion.div variants={item}>
            <Link href="/student/placement">
              <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-primary/30 bg-secondary p-6 transition-colors duration-300 hover:border-primary/50 sm:flex-row sm:items-center">
                <div>
                  <p className="font-semibold text-foreground">You haven&apos;t taken the placement exam yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">Find your level in about 15 minutes and unlock personalized exercises.</p>
                </div>
                <Button className="shrink-0">Take the placement exam</Button>
              </div>
            </Link>
          </motion.div>
        )}

        <motion.div variants={container} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <motion.div variants={item}>
            <StatCard title="Current Level" value={user.level ?? "Not placed"} description={user.level ? "Keep leveling up" : "Take placement exam"} color="violet" />
          </motion.div>
          <motion.div variants={item}>
            <StatCard title="Total XP" value={<CountUp end={totalXp} />} description="Complete exercises" color="amber" />
          </motion.div>
          <motion.div variants={item}>
            <StatCard title="Streak" value={<>{streak} days</>} description="Keep learning daily" color="orange" />
          </motion.div>
          <motion.div variants={item}>
            <StatCard title="Exercises" value={<CountUp end={exercisesDone} />} description="Start practicing" color="emerald" />
          </motion.div>
        </motion.div>

        <motion.div variants={container} className="grid gap-6 md:grid-cols-3">
          <motion.div variants={item} className="md:col-span-2">
            <div className="rounded-2xl border border-border bg-card p-7">
              <h2 className="mb-6 text-lg font-semibold tracking-tight">Skills Progress</h2>
              <div className="space-y-5">
                {SKILLS.map((s) => (
                  <SkillBar key={s.category} label={s.label} value={progress.find((p) => p.category === s.category)?.score ?? 0} color={s.color} />
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div variants={item}>
            <div className="rounded-2xl border border-border bg-card p-7">
              <h2 className="mb-6 text-lg font-semibold tracking-tight">Quick Actions</h2>
              <div className="space-y-3">
                <QuickAction label="Placement Exam" href="/student/placement" icon="P" color="violet" />
                <QuickAction label="Practice with AI" href="/student/ai-chat" icon="AI" color="blue" />
                <QuickAction label="Join Session" href="/student/sessions" icon="L" color="cyan" />
                <QuickAction label="Exercises" href="/student/exercises" icon="E" color="emerald" />
              </div>
            </div>
          </motion.div>
        </motion.div>

        <motion.div variants={item}>
          <div className="rounded-2xl border border-border bg-card p-7">
            <h2 className="mb-2 text-lg font-semibold tracking-tight">Join a class</h2>
            <p className="mb-4 text-sm text-muted-foreground">Enter the 6-character code your teacher shared with you.</p>
            <form onSubmit={handleJoin} className="flex flex-col gap-3 sm:flex-row">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="ABC123"
                aria-label="Class code"
                className="h-12 flex-1 rounded-xl border border-border bg-card px-4 font-mono text-lg tracking-[0.3em] text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none sm:max-w-xs"
              />
              <Button type="submit" disabled={joining}>
                {joining ? "Joining…" : "Join Class"}
              </Button>
            </form>

            <div className="mt-6 space-y-2">
              {classes.loading && <div className="h-14 animate-pulse rounded-xl bg-muted" />}
              {classes.error && <p className="text-sm text-muted-foreground">Couldn&apos;t load your classes.</p>}
              {!classes.loading && !classes.error && classes.data?.length === 0 && (
                <p className="text-sm text-muted-foreground">You haven&apos;t joined a class yet — ask your teacher for a code.</p>
              )}
              {classes.data?.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                  <div>
                    <p className="font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">Taught by {c.teacherName}</p>
                  </div>
                  <span className="rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] text-muted-foreground">{c.level}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
  );
}

function StatCard({ title, value, description, color }: { title: string; value: React.ReactNode; description: string; color: string }) {
  const colors: Record<string, string> = {
    violet: "bg-secondary",
    amber: "bg-sun-soft",
    orange: "bg-sun-soft",
    emerald: "bg-leaf-soft",
  };
  const dotColors: Record<string, string> = {
    violet: "bg-primary",
    amber: "bg-sun",
    orange: "bg-sun",
    emerald: "bg-leaf",
  };

  return (
    <div className={`rounded-card border-2 border-border shadow-sticker p-6 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`h-2 w-2 rounded-full ${dotColors[color]}`} />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{title}</span>
      </div>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function SkillBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{value}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function QuickAction({ label, href, icon, color }: { label: string; href: string; icon: string; color: string }) {
  const bgColors: Record<string, string> = {
    violet: "bg-secondary text-primary",
    blue: "bg-sun-soft text-sun-deep",
    cyan: "bg-leaf-soft text-leaf-text",
    emerald: "bg-leaf-soft text-leaf-text",
  };

  return (
    <Link href={href}>
      <motion.div
        className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors duration-300 hover:border-border hover:bg-card"
        whileHover={{ x: 4 }}
        transition={{ duration: 0.2 }}
      >
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold ${bgColors[color]}`}>{icon}</div>
        <span className="text-sm font-medium text-foreground">{label}</span>
      </motion.div>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="h-10 w-72 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl border border-border bg-card" />
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-card md:col-span-2" />
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
      </div>
    </div>
  );
}
