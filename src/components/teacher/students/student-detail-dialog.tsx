"use client";

import { useCallback, useEffect, useState } from "react";
import { Award, Flame, History, Trophy, Video } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LevelBadge, ExerciseTypeBadge } from "@/components/teacher/badges";
import { ErrorState } from "@/components/teacher/state-views";
import { api, ApiClientError } from "@/lib/api";
import type { ProgressCategory } from "@/types";
import type { TeacherStudentDetail } from "@/components/teacher/types";

const SKILLS: { category: ProgressCategory; label: string; color: string }[] = [
  { category: "GRAMMAR", label: "Grammar", color: "bg-violet-500" },
  { category: "VOCABULARY", label: "Vocabulary", color: "bg-blue-500" },
  { category: "LISTENING", label: "Listening", color: "bg-cyan-500" },
  { category: "TRANSLATION", label: "Translation", color: "bg-emerald-500" },
  { category: "SPEAKING", label: "Speaking", color: "bg-amber-500" },
];

export function StudentDetailDialog({ studentId, onOpenChange }: { studentId: string | null; onOpenChange: (open: boolean) => void }) {
  const [detail, setDetail] = useState<TeacherStudentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    setDetail(null);
    try {
      const data = await api<TeacherStudentDetail>(`/api/students/${id}`);
      setDetail(data);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Couldn't load this student.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!studentId) return;
    load(studentId);
  }, [studentId, retryTick, load]);

  const overall = detail?.progress.find((p) => p.category === "OVERALL");
  const scoreByCategory = new Map(detail?.progress.map((p) => [p.category, p.score]));

  return (
    <Dialog open={studentId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border border-white/10 bg-[#15121f] text-white sm:max-w-xl">
        {loading && (
          <div className="space-y-3">
            <div className="h-16 animate-pulse rounded-xl border border-white/5 bg-white/[0.02]" />
            <div className="h-40 animate-pulse rounded-xl border border-white/5 bg-white/[0.02]" />
            <div className="h-40 animate-pulse rounded-xl border border-white/5 bg-white/[0.02]" />
          </div>
        )}

        {!loading && error && <ErrorState message={error} onRetry={() => setRetryTick((t) => t + 1)} />}

        {!loading && !error && detail && (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2 text-white">
                {detail.student.name}
                {detail.student.level && <LevelBadge level={detail.student.level} />}
              </DialogTitle>
              <DialogDescription className="text-white/50">{detail.student.email}</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-3">
              <StatChip icon={<Trophy className="h-4 w-4" />} label="XP" value={String(overall?.xp ?? 0)} />
              <StatChip icon={<Flame className="h-4 w-4" />} label="Streak" value={`${overall?.streak ?? 0}d`} />
              <StatChip icon={<Video className="h-4 w-4" />} label="Sessions" value={String(detail.sessionsAttended)} />
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/40">Skills</h3>
              <div className="space-y-4">
                {SKILLS.map((s) => {
                  const value = scoreByCategory.get(s.category) ?? 0;
                  return (
                    <div key={s.category}>
                      <div className="mb-1.5 flex justify-between text-sm">
                        <span className="text-white/60">{s.label}</span>
                        <span className="text-white/30">{value}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                        <div className={`h-full rounded-full ${s.color} transition-all duration-700`} style={{ width: `${value}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/40">
                <Award className="h-3.5 w-3.5" />
                Placement history
              </h3>
              {detail.placements.length === 0 ? (
                <p className="text-sm text-white/25">No placement exams taken yet.</p>
              ) : (
                <ul className="space-y-2">
                  {detail.placements.map((p, i) => (
                    <li key={i} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.015] px-3.5 py-2.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white/80">{p.score}%</span>
                        <span className="text-white/25">→</span>
                        <LevelBadge level={p.level} />
                      </div>
                      <span className="text-xs text-white/30">{new Date(p.completedAt).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/40">
                <History className="h-3.5 w-3.5" />
                Recent exercise results
              </h3>
              {detail.results.length === 0 ? (
                <p className="text-sm text-white/25">No exercises completed yet.</p>
              ) : (
                <ul className="space-y-2">
                  {detail.results.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.015] px-3.5 py-2.5 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white/80">{r.exercise.title}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <ExerciseTypeBadge type={r.exercise.type} />
                          <LevelBadge level={r.exercise.difficulty} />
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold text-white/85">{r.score}%</p>
                        <p className="text-[11px] text-white/25">{new Date(r.completedAt).toLocaleDateString()}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-white/30">{label}</p>
        <p className="truncate text-sm font-semibold text-white/85">{value}</p>
      </div>
    </div>
  );
}
