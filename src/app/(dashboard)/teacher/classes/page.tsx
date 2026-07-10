"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, Users, Video } from "lucide-react";
import { FloatingParticles } from "@/components/shared/floating-particles";
import { SpotlightCard } from "@/components/shared/spotlight-card";
import { GridSkeleton, ErrorState, EmptyState } from "@/components/teacher/state-views";
import { LevelBadge } from "@/components/teacher/badges";
import { CopyCode } from "@/components/teacher/copy-code";
import { CreateClassDialog } from "@/components/teacher/classes/create-class-dialog";
import { api, ApiClientError } from "@/lib/api";
import type { TeacherClassListItem } from "@/components/teacher/types";

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: [0.35, 0.35, 0, 1] as const } },
};

export default function TeacherClassesPage() {
  const [classes, setClasses] = useState<TeacherClassListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<TeacherClassListItem[]>("/api/classes");
      setClasses(data);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Couldn't load your classes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="relative min-h-screen">
      <FloatingParticles count={10} />

      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Classes</h1>
          <p className="mt-1 text-white/40">Manage your classes and invite students.</p>
        </div>
        <CreateClassDialog onCreated={load} />
      </div>

      {loading && <GridSkeleton count={6} />}

      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && classes && classes.length === 0 && (
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title="No classes yet"
          description="Create your first class to start teaching. Students will join using a class code."
        />
      )}

      {!loading && !error && classes && classes.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={container} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <motion.div key={c.id} variants={item}>
              <ClassCard classItem={c} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

function ClassCard({ classItem }: { classItem: TeacherClassListItem }) {
  return (
    <SpotlightCard className="h-full rounded-2xl border-white/5 bg-white/[0.02] p-0">
      <Link href={`/teacher/classes/${classItem.id}`} className="block p-6">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold tracking-tight text-white/90">{classItem.name}</h3>
          <LevelBadge level={classItem.level} className="shrink-0" />
        </div>
        <p className="mb-5 line-clamp-2 min-h-[2.5rem] text-sm text-white/40">
          {classItem.description || "No description yet."}
        </p>
        <div className="mb-4 flex items-center gap-4 text-sm text-white/50">
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {classItem.studentCount} student{classItem.studentCount === 1 ? "" : "s"}
          </span>
          <span className="flex items-center gap-1.5">
            <Video className="h-3.5 w-3.5" />
            {classItem.sessionCount} session{classItem.sessionCount === 1 ? "" : "s"}
          </span>
        </div>
      </Link>
      <div className="flex items-center justify-between border-t border-white/5 px-6 py-3.5">
        <span className="text-[11px] uppercase tracking-widest text-white/25">Join code</span>
        <CopyCode code={classItem.code} />
      </div>
    </SpotlightCard>
  );
}
