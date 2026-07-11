"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Flag, Flame, Lock, Star } from "lucide-react";
import { useT } from "@/components/providers/locale-provider";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PathResponse, PathLesson, PathUnit } from "@/lib/path";
import type { MeResponse } from "./_types";

type T = ReturnType<typeof useT>;

const ease = [0.35, 0.35, 0, 1] as const;
const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease } } };

export default function StudentPathPage() {
  const t = useT();
  const me = useApi<MeResponse>(() => api<MeResponse>("/api/me"), []);
  const path = useApi<PathResponse>(() => api<PathResponse>("/api/path"), []);

  if (me.loading || path.loading) return <PathSkeleton />;

  if (me.error || !me.data || path.error || !path.data) {
    return (
      <div className="mx-auto max-w-lg rounded-card border-2 border-destructive/20 bg-coral-soft p-8 text-center shadow-sticker">
        <p className="text-foreground">{me.error ?? path.error ?? t("common.error")}</p>
        <Button
          variant="ghost"
          className="mt-4"
          onClick={() => {
            me.refetch();
            path.refetch();
          }}
        >
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  const { user, progress } = me.data;
  const overall = progress.find((p) => p.category === "OVERALL");
  const streak = overall?.streak ?? 0;
  const xp = overall?.xp ?? 0;
  const { placed, units, continue: cont } = path.data;

  return (
    <motion.div initial="hidden" animate="visible" variants={container} className="space-y-8">
      <motion.div variants={item} className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">
          {t("path.greeting", { name: user.name.split(" ")[0] })}
        </h1>
        <div className="flex items-center gap-2">
          <Badge variant="streak" className="gap-1">
            <Flame className="size-3" />
            {t("path.streakDays", { n: streak })}
          </Badge>
          <Badge variant="xp">{t("path.xp", { n: xp })}</Badge>
        </div>
      </motion.div>

      {!placed && (
        <>
          <motion.div variants={item}>
            <div className="rounded-card border-2 border-primary/25 bg-secondary p-8 text-center shadow-sticker">
              <h2 className="text-xl font-bold tracking-tight text-foreground">{t("path.placementCardTitle")}</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{t("path.placementCardBody")}</p>
              <Button className="mt-6" render={<Link href="/student/onboarding" />} nativeButton={false}>
                {t("path.start")}
              </Button>
            </div>
          </motion.div>
          <motion.div variants={item}>
            <LockedUnitPreview t={t} />
          </motion.div>
        </>
      )}

      {placed && cont && (
        <motion.div variants={item}>
          <div className="rounded-card bg-primary p-6 text-primary-foreground shadow-press-brand">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-foreground/70">{t("path.continue")}</p>
            <p className="mt-2 text-xl font-bold tracking-tight">
              <span dir="ltr">{cont.exerciseTitle}</span>
            </p>
            <p className="mt-1 text-sm text-primary-foreground/75">
              <span dir="ltr">{cont.lessonTitle}</span>
            </p>
            <Button
              variant="sun"
              className="mt-6"
              render={<Link href={`/student/exercises/${cont.exerciseId}`} />}
              nativeButton={false}
            >
              {t("path.start")}
            </Button>
          </div>
        </motion.div>
      )}

      {placed &&
        units.map((unit) => (
          <motion.div key={unit.unit} variants={item}>
            <UnitSection unit={unit} t={t} />
          </motion.div>
        ))}

      {placed && !cont && (
        <motion.div variants={item}>
          <div className="rounded-card border-2 border-leaf/40 bg-leaf-soft p-8 text-center shadow-sticker">
            <p className="font-medium text-leaf-text">{t("path.completeBanner")}</p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function UnitSection({ unit, t }: { unit: PathUnit; t: T }) {
  return (
    <div className="rounded-card border-2 border-border bg-card p-6 shadow-sticker">
      <h2 className="mb-5 text-lg font-bold tracking-tight">{t("path.unit", { n: unit.unit })}</h2>
      <div>
        {unit.lessons.map((lesson, i) => (
          <LessonRow
            key={lesson.id}
            lesson={lesson}
            isFirst={i === 0}
            prevDone={i > 0 ? unit.lessons[i - 1].status === "done" : false}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

function LessonRow({ lesson, isFirst, prevDone, t }: { lesson: PathLesson; isFirst: boolean; prevDone: boolean; t: T }) {
  const locked = lesson.status === "locked";
  const nodeClass = lesson.isCheckpoint
    ? "rounded-btn border-2 border-sun bg-sun-soft text-sun-deep"
    : lesson.status === "done"
      ? "rounded-full bg-primary text-primary-foreground"
      : lesson.status === "current"
        ? "rounded-full border-2 border-primary bg-card text-primary"
        : "rounded-full bg-muted text-muted-foreground";
  const Icon = lesson.isCheckpoint ? Flag : lesson.status === "done" ? Check : lesson.status === "current" ? Star : Lock;

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        {!isFirst && <div className={`h-6 w-1 rounded-full ${prevDone ? "bg-primary/50" : "bg-border"}`} />}
        <div className={`flex size-11 shrink-0 items-center justify-center ${nodeClass}`}>
          <Icon className="size-5" />
        </div>
      </div>
      <div className="flex-1 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold tracking-tight text-foreground">
            <span dir="ltr">{lesson.title}</span>
          </p>
          {lesson.isCheckpoint && (
            <span className="rounded-full border border-sun/50 bg-sun-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sun-deep">
              {t("path.checkpoint")}
            </span>
          )}
        </div>
        {lesson.isCheckpoint && <p className="mt-0.5 text-xs text-muted-foreground">{t("path.checkpointHint")}</p>}
        {!lesson.isCheckpoint && (lesson.status === "done" || locked) && (
          <p className="mt-0.5 text-xs text-muted-foreground">{t(lesson.status === "done" ? "path.done" : "path.locked")}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {lesson.exercises.map((ex) => {
            const linkable = !locked && !ex.completed;
            const chipClass = `inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
              ex.completed
                ? "border-leaf/40 bg-leaf-soft text-leaf-text"
                : locked
                  ? "border-border bg-muted text-muted-foreground"
                  : "border-border bg-card text-foreground hover:border-line-strong"
            }`;
            const content = (
              <>
                {ex.completed && <Check className="size-3" />}
                <span dir="ltr">{ex.title}</span>
              </>
            );
            return linkable ? (
              <Link key={ex.id} href={`/student/exercises/${ex.id}`} className={chipClass}>
                {content}
              </Link>
            ) : (
              <span key={ex.id} className={chipClass}>
                {content}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LockedUnitPreview({ t }: { t: T }) {
  return (
    <div className="rounded-card border-2 border-border bg-card p-6 shadow-sticker opacity-80">
      <h2 className="mb-5 text-lg font-bold tracking-tight text-muted-foreground">{t("path.unit", { n: 1 })}</h2>
      <div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="flex flex-col items-center">
              {i > 0 && <div className="h-6 w-1 rounded-full bg-border" />}
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Lock className="size-5" />
              </div>
            </div>
            <div className="flex-1 pb-6">
              <div className="h-4 w-40 rounded-full bg-muted" />
              <p className="mt-2 text-xs text-muted-foreground">{t("path.locked")}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PathSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="h-9 w-72 animate-pulse rounded-lg bg-muted" />
        <div className="flex gap-2">
          <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
          <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
      <div className="h-32 animate-pulse rounded-card bg-muted" />
      <div className="h-80 animate-pulse rounded-card border-2 border-border bg-card shadow-sticker" />
    </div>
  );
}
