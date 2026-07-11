"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Search, Trophy, Users } from "lucide-react";
import { ErrorState, EmptyState, ListSkeleton } from "@/components/teacher/state-views";
import { LevelBadge } from "@/components/teacher/badges";
import { StudentDetailDialog } from "@/components/teacher/students/student-detail-dialog";
import { api, ApiClientError } from "@/lib/api";
import type { TeacherStudentListItem } from "@/components/teacher/types";

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState<TeacherStudentListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<TeacherStudentListItem[]>("/api/students");
      setStudents(data);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Couldn't load your students.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!students) return [];
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
  }, [students, query]);

  return (
    <div className="relative min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Students</h1>
        <p className="mt-1 text-muted-foreground">Track progress across every class you teach.</p>
      </div>

      {!loading && !error && students && students.length > 0 && (
        <div className="relative mb-6 max-w-sm">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="h-10 w-full rounded-xl border border-border bg-muted ps-9 pe-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
        </div>
      )}

      {loading && <ListSkeleton count={6} />}

      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && students && students.length === 0 && (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No students yet"
          description="Students will appear here once they join one of your classes — share a class join code to get started."
        />
      )}

      {!loading && !error && students && students.length > 0 && filtered.length === 0 && (
        <EmptyState title="No students match your search" description="Try a different name or email." />
      )}

      {!loading && !error && filtered.length > 0 && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
          className="space-y-3"
        >
          {filtered.map((s) => (
            <motion.div key={s.id} variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
              <StudentRow student={s} onOpen={() => setSelectedId(s.id)} />
            </motion.div>
          ))}
        </motion.div>
      )}

      <StudentDetailDialog studentId={selectedId} onOpenChange={(open) => !open && setSelectedId(null)} />
    </div>
  );
}

function StudentRow({ student, onOpen }: { student: TeacherStudentListItem; onOpen: () => void }) {
  return (
    <div className="rounded-card border-2 border-border bg-card shadow-sticker p-0">
      <button type="button" onClick={onOpen} className="w-full p-5 text-start">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-primary">
              {student.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{student.name}</p>
              <p className="truncate text-xs text-muted-foreground">{student.email}</p>
            </div>
          </div>
          {student.level ? <LevelBadge level={student.level} /> : <span className="text-xs text-muted-foreground">No level yet</span>}
        </div>

        {student.classNames.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {student.classNames.map((name) => (
              <span key={name} className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground">
                {name}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex min-w-[140px] items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${student.overallScore}%` }} />
            </div>
            <span className="text-xs text-muted-foreground">{student.overallScore}% overall</span>
          </div>
          <StatBit icon={<Trophy className="h-3 w-3" />} value={`${student.xp} XP`} />
          <StatBit icon={<Flame className="h-3 w-3" />} value={`${student.streak}d streak`} />
          <span className="text-xs text-muted-foreground">{student.exercisesDone} exercise{student.exercisesDone === 1 ? "" : "s"} done</span>
          <span className="text-xs text-muted-foreground">{student.avgScore}% avg score</span>
        </div>
      </button>
    </div>
  );
}

function StatBit({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      {icon}
      {value}
    </span>
  );
}
