"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StudentDetailView } from "@/components/teacher/students/student-detail-view";
import { ErrorState } from "@/components/teacher/state-views";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { useT } from "@/components/providers/locale-provider";
import type { TeacherStudentDetail } from "@/components/teacher/types";

export function StudentDetailScreen({ id }: { id: string }) {
  const t = useT();
  const { data, loading, error, refetch } = useApi<TeacherStudentDetail>(
    () => api<TeacherStudentDetail>(`/api/students/${id}`),
    [id]
  );

  return (
    <div className="relative mx-auto max-w-2xl">
      <Link
        href="/teacher/students"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t("teacher.backToStudents")}
      </Link>

      {loading && (
        <div className="space-y-3">
          <div className="h-24 animate-pulse rounded-card border-2 border-border bg-card shadow-sticker" />
          <div className="h-40 animate-pulse rounded-card border-2 border-border bg-card shadow-sticker" />
          <div className="h-40 animate-pulse rounded-card border-2 border-border bg-card shadow-sticker" />
        </div>
      )}

      {!loading && error && <ErrorState message={error ?? t("common.error")} onRetry={refetch} />}

      {!loading && !error && data && <StudentDetailView detail={data} />}
    </div>
  );
}
