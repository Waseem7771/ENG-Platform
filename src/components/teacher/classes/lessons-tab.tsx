"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Flag, Loader2, PenSquare, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/teacher/confirm-dialog";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/teacher/state-views";
import { LevelSelect } from "@/components/teacher/level-select";
import { EXERCISE_TYPE_META } from "@/lib/exercise-meta";
import { useApi } from "@/hooks/use-api";
import { api, ApiClientError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useT } from "@/components/providers/locale-provider";
import type { Level } from "@/types";
import type { TeacherExerciseListItem, TeacherLessonItem } from "@/components/teacher/types";

type T = ReturnType<typeof useT>;

const inputClass =
  "h-11 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/20";

interface LessonFormValue {
  title: string;
  description: string;
  unit: number;
  order: number;
  level: Level;
  isCheckpoint: boolean;
  exerciseIds: string[];
}

function initialValue(lesson: TeacherLessonItem | undefined, classLevel: Level): LessonFormValue {
  if (!lesson) {
    return { title: "", description: "", unit: 1, order: 0, level: classLevel, isCheckpoint: false, exerciseIds: [] };
  }
  return {
    title: lesson.title,
    description: lesson.description ?? "",
    unit: lesson.unit,
    order: lesson.order,
    level: lesson.level,
    isCheckpoint: lesson.isCheckpoint,
    exerciseIds: lesson.exercises.map((ex) => ex.id),
  };
}

function groupByUnit(lessons: TeacherLessonItem[]) {
  const map = new Map<number, TeacherLessonItem[]>();
  for (const lesson of lessons) {
    const arr = map.get(lesson.unit) ?? [];
    arr.push(lesson);
    map.set(lesson.unit, arr);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([unit, unitLessons]) => ({ unit, lessons: unitLessons }));
}

/** Class hub Lessons tab: grouped lesson list + create/edit/delete + exercise assignment. */
export function LessonsTab({ classId, classLevel }: { classId: string; classLevel: Level }) {
  const t = useT();
  const {
    data: lessons,
    loading,
    error,
    refetch,
  } = useApi(() => api<TeacherLessonItem[]>(`/api/lessons?classId=${classId}`), [classId]);
  const { data: exercisesData } = useApi(() => api<TeacherExerciseListItem[]>("/api/exercises"), []);

  // Filter to PUBLISHED exercises only for the assignment checklist
  const exercisePool = useMemo(() => (exercisesData ?? []).filter((e) => e.status === "PUBLISHED"), [exercisesData]);

  const grouped = useMemo(() => groupByUnit(lessons ?? []), [lessons]);

  async function handleDelete(id: string) {
    try {
      await api(`/api/lessons/${id}`, { method: "DELETE" });
      toast.success(t("teacher.lessonDeleted"));
      await refetch();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : t("teacher.deleteLessonFailed"));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <LessonFormDialog
          classId={classId}
          classLevel={classLevel}
          exercisePool={exercisePool ?? []}
          onSaved={refetch}
          trigger={
            <button className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]">
              <Plus className="h-3.5 w-3.5" />
              {t("teacher.newLesson")}
            </button>
          }
        />
      </div>

      {loading && <ListSkeleton count={3} />}

      {!loading && error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && (lessons?.length ?? 0) === 0 && (
        <EmptyState icon={<BookOpen className="h-6 w-6" />} title={t("teacher.noLessons")} />
      )}

      {!loading && !error && grouped.length > 0 && (
        <div className="space-y-8">
          {grouped.map(({ unit, lessons: unitLessons }) => (
            <div key={unit}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t("teacher.unitLabel", { n: unit })}
              </h3>
              <div className="space-y-3">
                {unitLessons.map((lesson) => (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson}
                    classId={classId}
                    classLevel={classLevel}
                    exercisePool={exercisePool ?? []}
                    onSaved={refetch}
                    onDelete={() => handleDelete(lesson.id)}
                    t={t}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LessonRow({
  lesson,
  classId,
  classLevel,
  exercisePool,
  onSaved,
  onDelete,
  t,
}: {
  lesson: TeacherLessonItem;
  classId: string;
  classLevel: Level;
  exercisePool: TeacherExerciseListItem[];
  onSaved: () => void;
  onDelete: () => Promise<void>;
  t: T;
}) {
  return (
    <div className="rounded-card border-2 border-border bg-card p-5 shadow-sticker">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <h4 className="truncate font-semibold text-foreground">{lesson.title}</h4>
            <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              #{lesson.order}
            </span>
            {lesson.isCheckpoint && (
              <span className="inline-flex items-center gap-1 rounded-full border border-sun-deep/30 bg-sun-soft px-2 py-0.5 text-[11px] font-medium text-sun-deep">
                <Flag className="h-3 w-3" />
                {t("teacher.checkpoint")}
              </span>
            )}
          </div>
          {lesson.description && <p className="mb-2 text-sm text-muted-foreground">{lesson.description}</p>}
          {lesson.exercises.length > 0 ? (
            <div className="flex flex-wrap gap-1.5" dir="ltr">
              {lesson.exercises.map((ex) => {
                const meta = EXERCISE_TYPE_META[ex.type];
                const Icon = meta.icon;
                return (
                  <span
                    key={ex.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
                  >
                    <Icon className={cn("h-3 w-3", meta.color)} />
                    {ex.title}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t("teacher.noExercisesAssigned")}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <LessonFormDialog
            classId={classId}
            classLevel={classLevel}
            exercisePool={exercisePool}
            lesson={lesson}
            onSaved={onSaved}
            trigger={
              <button className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-line-strong hover:text-foreground">
                <PenSquare className="h-3.5 w-3.5" />
                {t("teacher.edit")}
              </button>
            }
          />
          <ConfirmDialog
            trigger={
              <button className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/30 hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
                {t("teacher.delete")}
              </button>
            }
            title={t("teacher.deleteLessonTitle", { title: lesson.title })}
            description={t("teacher.deleteLessonDescription")}
            confirmLabel={t("teacher.deleteLesson")}
            destructive
            onConfirm={onDelete}
          />
        </div>
      </div>
    </div>
  );
}

function LessonFormDialog({
  classId,
  classLevel,
  exercisePool,
  lesson,
  onSaved,
  trigger,
}: {
  classId: string;
  classLevel: Level;
  exercisePool: TeacherExerciseListItem[];
  lesson?: TeacherLessonItem;
  onSaved: () => void;
  trigger: React.ReactElement;
}) {
  const t = useT();
  const isEdit = !!lesson;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [value, setValue] = useState<LessonFormValue>(() => initialValue(lesson, classLevel));

  // Union the published pool with any currently-assigned exercises that aren't in the pool
  // (handles edge case of a lesson with a DRAFT exercise already assigned)
  const displayPool = useMemo(() => {
    const poolIds = new Set(exercisePool.map((ex) => ex.id));
    const assignedNotInPool = lesson?.exercises.filter((ex) => !poolIds.has(ex.id)) ?? [];
    return [...exercisePool, ...assignedNotInPool];
  }, [exercisePool, lesson]);

  // Reset to fresh values every time the dialog opens, so a canceled edit
  // (or a previous "New lesson" entry) never leaks into the next open.
  function handleOpenChange(next: boolean) {
    if (next) setValue(initialValue(lesson, classLevel));
    setOpen(next);
  }

  function toggleExercise(id: string) {
    setValue((v) => ({
      ...v,
      exerciseIds: v.exerciseIds.includes(id) ? v.exerciseIds.filter((eid) => eid !== id) : [...v.exerciseIds, id],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.title.trim()) return;
    setSaving(true);
    try {
      if (isEdit && lesson) {
        await api(`/api/lessons/${lesson.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            title: value.title.trim(),
            description: value.description.trim() || null,
            unit: value.unit,
            order: value.order,
            isCheckpoint: value.isCheckpoint,
            exerciseIds: value.exerciseIds,
          }),
        });
      } else {
        await api("/api/lessons", {
          method: "POST",
          body: JSON.stringify({
            classId,
            title: value.title.trim(),
            description: value.description.trim() || null,
            level: value.level,
            unit: value.unit,
            order: value.order,
            isCheckpoint: value.isCheckpoint,
            exerciseIds: value.exerciseIds,
          }),
        });
      }
      toast.success(t("teacher.lessonSaved"));
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t("teacher.lessonSaveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[85vh] overflow-y-auto border border-border bg-popover text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {isEdit ? t("teacher.editLesson") : t("teacher.newLesson")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t("teacher.lessonTitle")}</Label>
            <input
              value={value.title}
              onChange={(e) => setValue((v) => ({ ...v, title: e.target.value }))}
              className={inputClass}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("teacher.lessonDescription")}
            </Label>
            <textarea
              value={value.description}
              onChange={(e) => setValue((v) => ({ ...v, description: e.target.value }))}
              rows={2}
              className={`${inputClass} h-auto resize-none py-2.5`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("teacher.lessonUnit")}
              </Label>
              <input
                type="number"
                min={1}
                value={value.unit}
                onChange={(e) => setValue((v) => ({ ...v, unit: Math.max(1, Number(e.target.value) || 1) }))}
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("teacher.lessonOrder")}
              </Label>
              <input
                type="number"
                min={0}
                value={value.order}
                onChange={(e) => setValue((v) => ({ ...v, order: Math.max(0, Number(e.target.value) || 0) }))}
                className={inputClass}
              />
            </div>
          </div>

          {!isEdit && (
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("teacher.lessonLevel")}
              </Label>
              <LevelSelect value={value.level} onChange={(level) => setValue((v) => ({ ...v, level }))} />
            </div>
          )}

          <button
            type="button"
            onClick={() => setValue((v) => ({ ...v, isCheckpoint: !v.isCheckpoint }))}
            className={cn(
              "flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
              value.isCheckpoint
                ? "border-sun-deep/30 bg-sun-soft text-sun-deep"
                : "border-border bg-muted text-muted-foreground hover:border-line-strong hover:text-foreground"
            )}
          >
            <Flag className="h-4 w-4" />
            {t("teacher.checkpoint")}
          </button>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("teacher.assignExercises")}
            </Label>
            {displayPool.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("teacher.noExercisesToAssign")}</p>
            ) : (
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-border p-2" dir="ltr">
                {displayPool.map((ex) => {
                  const meta = EXERCISE_TYPE_META[ex.type];
                  const Icon = meta.icon;
                  const checked = value.exerciseIds.includes(ex.id);
                  return (
                    <label
                      key={ex.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleExercise(ex.id)}
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                      <Icon className={cn("h-3.5 w-3.5 shrink-0", meta.color)} />
                      <span className="truncate">{ex.title}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="-mx-4 -mb-4 border-border bg-transparent p-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-line-strong"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors disabled:opacity-60"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t("common.save")}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
