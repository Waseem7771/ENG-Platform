"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  BookOpen,
  LayoutGrid,
  Loader2,
  Settings as SettingsIcon,
  Trash2,
  Users,
  Video,
  Plus,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LevelBadge, SessionStatusBadge } from "@/components/teacher/badges";
import { CopyCode } from "@/components/teacher/copy-code";
import { EmptyState, ErrorState } from "@/components/teacher/state-views";
import { ConfirmDialog } from "@/components/teacher/confirm-dialog";
import { ClassSettings, type ClassSettingsValue } from "@/components/teacher/classes/class-settings";
import { LessonsTab } from "@/components/teacher/classes/lessons-tab";
import { api, ApiClientError } from "@/lib/api";
import { useT } from "@/components/providers/locale-provider";
import type { TeacherClassDetail } from "@/components/teacher/types";

type T = ReturnType<typeof useT>;

export default function ClassDetailPage() {
  const t = useT();
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
      setError(e instanceof ApiClientError ? e.message : t("teacher.loadClassFailed"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    try {
      await api(`/api/classes/${classId}`, { method: "DELETE" });
      toast.success(t("teacher.classDeleted"));
      router.push("/teacher/classes");
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : t("teacher.deleteClassFailed"));
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
      toast.error(e instanceof ApiClientError ? e.message : t("teacher.newSessionFailed"));
      setStartingSession(false);
    }
  }

  async function handleRemoveStudent(studentId: string) {
    try {
      await api(`/api/classes/${classId}/students/${studentId}`, { method: "DELETE" });
      toast.success(t("teacher.studentRemoved"));
      await load();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : t("teacher.removeStudentFailed"));
    }
  }

  function handleSettingsSaved(updated: ClassSettingsValue) {
    setDetail((prev) => (prev ? { ...prev, ...updated } : prev));
  }

  return (
    <div className="relative min-h-screen">
      <Link
        href="/teacher/classes"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("teacher.backToClasses")}
      </Link>

      {loading && (
        <div className="space-y-6">
          <div className="h-28 animate-pulse rounded-card border-2 border-border bg-card shadow-sticker" />
          <div className="h-64 animate-pulse rounded-card border-2 border-border bg-card shadow-sticker" />
        </div>
      )}

      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && detail && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
          <div className="rounded-card border-2 border-border bg-card p-7 shadow-sticker">
            <div className="mb-2 flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{detail.name}</h1>
              <LevelBadge level={detail.level} />
            </div>
            <p className="max-w-xl text-sm text-muted-foreground">{detail.description || t("teacher.noDescriptionYet")}</p>
          </div>

          <div className="rounded-card border-2 border-border bg-card p-7 shadow-sticker">
            <Tabs defaultValue="overview">
              <TabsList variant="line" className="mb-6 border-b border-border">
                <TabsTrigger value="overview" className="gap-1.5 text-muted-foreground data-active:text-foreground">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  {t("teacher.tabOverview")}
                </TabsTrigger>
                <TabsTrigger value="students" className="gap-1.5 text-muted-foreground data-active:text-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {t("teacher.tabStudents")} ({detail.students.length})
                </TabsTrigger>
                <TabsTrigger value="lessons" className="gap-1.5 text-muted-foreground data-active:text-foreground">
                  <BookOpen className="h-3.5 w-3.5" />
                  {t("teacher.tabLessons")}
                </TabsTrigger>
                <TabsTrigger value="sessions" className="gap-1.5 text-muted-foreground data-active:text-foreground">
                  <Video className="h-3.5 w-3.5" />
                  {t("teacher.tabSessions")} ({detail.sessions.length})
                </TabsTrigger>
                <TabsTrigger value="settings" className="gap-1.5 text-muted-foreground data-active:text-foreground">
                  <SettingsIcon className="h-3.5 w-3.5" />
                  {t("teacher.tabSettings")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="grid gap-3 sm:grid-cols-2">
                  <StatChip icon={<Users className="h-4 w-4" />} label={t("teacher.tabStudents")} value={String(detail.students.length)} />
                  <StatChip icon={<Video className="h-4 w-4" />} label={t("teacher.tabSessions")} value={String(detail.sessions.length)} />
                </div>
                <div className="mt-4 flex flex-col items-start gap-2 rounded-xl border border-border bg-muted p-5">
                  <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{t("teacher.joinCode")}</span>
                  <CopyCode code={detail.code} />
                </div>
              </TabsContent>

              <TabsContent value="students">
                {detail.students.length === 0 ? (
                  <EmptyState
                    icon={<Users className="h-6 w-6" />}
                    title={t("teacher.noStudentsTitle")}
                    description={t("teacher.rosterEmpty")}
                  />
                ) : (
                  <RosterTable students={detail.students} onRemove={handleRemoveStudent} t={t} />
                )}
              </TabsContent>

              <TabsContent value="lessons">
                <LessonsTab classId={detail.id} classLevel={detail.level} />
              </TabsContent>

              <TabsContent value="sessions">
                <div className="mb-4 flex justify-end">
                  <button
                    onClick={handleNewSession}
                    disabled={startingSession}
                    className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
                  >
                    {startingSession ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    {t("teacher.newSession")}
                  </button>
                </div>
                {detail.sessions.length === 0 ? (
                  <EmptyState
                    icon={<Video className="h-6 w-6" />}
                    title={t("teacher.noSessionsTitle")}
                    description={t("teacher.noSessionsDescription")}
                  />
                ) : (
                  <ul className="space-y-2">
                    {detail.sessions.map((s) => (
                      <li key={s.id}>
                        <Link
                          href={`/teacher/sessions/${s.id}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-line-strong hover:bg-muted"
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">{s.title}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleString()}</p>
                          </div>
                          <SessionStatusBadge status={s.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="settings">
                <div className="space-y-6">
                  <ClassSettings
                    classId={detail.id}
                    initial={{ name: detail.name, description: detail.description, level: detail.level }}
                    onSaved={handleSettingsSaved}
                  />

                  <div className="rounded-xl border border-destructive/20 bg-coral-soft p-6">
                    <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-destructive/80">{t("teacher.dangerZone")}</h2>
                    <p className="mb-4 text-sm text-muted-foreground">{t("teacher.deleteClassWarning")}</p>
                    <ConfirmDialog
                      trigger={
                        <button className="flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/15">
                          <Trash2 className="h-3.5 w-3.5" />
                          {t("teacher.deleteClass")}
                        </button>
                      }
                      title={t("teacher.deleteClassConfirmTitle", { name: detail.name })}
                      description={t("teacher.deleteClassConfirmDescription")}
                      confirmLabel={t("teacher.deleteClass")}
                      destructive
                      onConfirm={handleDelete}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function StatChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-muted p-3.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function RosterTable({
  students,
  onRemove,
  t,
}: {
  students: TeacherClassDetail["students"];
  onRemove: (studentId: string) => Promise<void>;
  t: T;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border text-start text-xs uppercase tracking-wider text-muted-foreground">
            <th className="pb-3 font-medium">{t("teacher.colName")}</th>
            <th className="pb-3 font-medium">{t("teacher.colLevel")}</th>
            <th className="pb-3 font-medium">{t("teacher.colOverallScore")}</th>
            <th className="pb-3 font-medium">{t("teacher.xp")}</th>
            <th className="pb-3 pe-0 text-end font-medium" />
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id} className="border-b border-border last:border-0">
              <td className="py-3.5">
                <Link href={`/teacher/students/${s.id}`} className="font-medium text-foreground hover:underline">
                  {s.name}
                </Link>
                <p className="text-xs text-muted-foreground">{s.email}</p>
              </td>
              <td className="py-3.5">{s.level ? <LevelBadge level={s.level} /> : <span className="text-muted-foreground">—</span>}</td>
              <td className="py-3.5">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${s.overallScore}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground">{s.overallScore}%</span>
                </div>
              </td>
              <td className="py-3.5 font-medium text-sun-deep/90">{s.xp}</td>
              <td className="py-3.5 ps-3 text-end">
                <ConfirmDialog
                  trigger={
                    <button className="rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/15">
                      {t("teacher.removeStudent")}
                    </button>
                  }
                  title={t("teacher.removeStudentTitle", { name: s.name })}
                  description={t("teacher.removeStudentDescription")}
                  confirmLabel={t("teacher.removeStudent")}
                  destructive
                  onConfirm={() => onRemove(s.id)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
