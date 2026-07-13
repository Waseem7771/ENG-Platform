"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarClock, Loader2, Plus, Radio } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/teacher/state-views";
import { api, ApiClientError } from "@/lib/api";
import { localValueToIso } from "@/lib/session-schedule";
import { cn } from "@/lib/utils";
import { useT } from "@/components/providers/locale-provider";
import type { TeacherClassListItem } from "@/components/teacher/types";

const inputClass =
  "h-11 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/20";

const toggleBase =
  "flex h-11 items-center justify-center gap-2 rounded-btn border-2 px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

type Mode = "now" | "schedule";

export function StartSessionDialog() {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Stays null on failure — a fetch error must never be rendered as "you have zero classes".
  const [classes, setClasses] = useState<TeacherClassListItem[] | null>(null);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [classesError, setClassesError] = useState<string | null>(null);
  const [classId, setClassId] = useState("");
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<Mode>("now");
  const [scheduledLocal, setScheduledLocal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadClasses = useCallback(async () => {
    setLoadingClasses(true);
    setClassesError(null);
    try {
      const data = await api<TeacherClassListItem[]>("/api/classes");
      setClasses(data);
      if (data.length > 0) setClassId(data[0].id);
    } catch (e) {
      setClassesError(e instanceof ApiClientError ? e.message : t("session.loadClassesFailed"));
    } finally {
      setLoadingClasses(false);
    }
  }, [t]);

  useEffect(() => {
    if (!open) return;
    loadClasses();
  }, [open, loadClasses]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!classId) {
      setError(t("session.chooseClass"));
      return;
    }
    if (!title.trim()) {
      setError(t("session.titleRequired"));
      return;
    }
    // Client guard for the empty/garbage case; the server stays authoritative on
    // whether the instant is actually in the future (it 400s on a past date).
    let scheduledAt: string | undefined;
    if (mode === "schedule") {
      const iso = localValueToIso(scheduledLocal);
      if (!iso) {
        setError(t("session.scheduleTimeRequired"));
        return;
      }
      scheduledAt = iso;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body =
        mode === "now"
          ? { classId, title: title.trim(), mode: "now" }
          : { classId, title: title.trim(), mode: "schedule", scheduledAt };
      const { session } = await api<{ session: { id: string } }>("/api/sessions", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setOpen(false);
      router.push(`/teacher/sessions/${session.id}`);
    } catch (e) {
      // Surfaces the server's 400 message (e.g. "scheduledAt must be in the future") inline.
      setError(e instanceof ApiClientError ? e.message : t("session.startFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setTitle("");
          setMode("now");
          setScheduledLocal("");
          setError(null);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button variant="brand">
            <Plus className="h-4 w-4" />
            {t("session.startSession")}
          </Button>
        }
      />
      <DialogContent className="border border-border bg-popover text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Radio className="h-4 w-4 text-primary" />
            {t("session.dialogTitle")}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t("session.dialogDescription")}
          </DialogDescription>
        </DialogHeader>

        {loadingClasses ? (
          <div className="h-24 animate-pulse rounded-xl border border-border bg-card" />
        ) : classesError ? (
          <ErrorState message={classesError} onRetry={loadClasses} />
        ) : classes && classes.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <p className="text-sm text-muted-foreground">{t("session.noClass")}</p>
            <Button
              render={<Link href="/teacher/classes" />}
              nativeButton={false}
              role="link"
              variant="brand"
              className="mt-3"
            >
              {t("teacher.quickCreateClass")}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("session.classLabel")}
              </Label>
              <select value={classId} onChange={(e) => setClassId(e.target.value)} className={inputClass}>
                {classes?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="session-title" className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("session.titleLabel")}
              </Label>
              <input
                id="session-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("session.titlePlaceholder")}
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("session.timingLabel")}
              </Label>
              <div role="radiogroup" aria-label={t("session.timingLabel")} className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  role="radio"
                  aria-checked={mode === "now"}
                  onClick={() => {
                    setMode("now");
                    setError(null);
                  }}
                  className={cn(
                    toggleBase,
                    mode === "now"
                      ? "border-primary bg-secondary text-foreground"
                      : "border-border bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Radio className="h-4 w-4" />
                  {t("session.goLive")}
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={mode === "schedule"}
                  onClick={() => {
                    setMode("schedule");
                    setError(null);
                  }}
                  className={cn(
                    toggleBase,
                    mode === "schedule"
                      ? "border-primary bg-secondary text-foreground"
                      : "border-border bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  <CalendarClock className="h-4 w-4" />
                  {t("session.schedule")}
                </button>
              </div>
            </div>
            {mode === "schedule" && (
              <div className="space-y-1.5">
                <Label htmlFor="session-scheduled" className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t("session.scheduleTime")}
                </Label>
                <input
                  id="session-scheduled"
                  type="datetime-local"
                  value={scheduledLocal}
                  onChange={(e) => setScheduledLocal(e.target.value)}
                  className={inputClass}
                />
              </div>
            )}
            <Button type="submit" variant="brand" disabled={submitting} className="w-full">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "now" ? t("session.goLive") : t("session.scheduleSubmit")}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
