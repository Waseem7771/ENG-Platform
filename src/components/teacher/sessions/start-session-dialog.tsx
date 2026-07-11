"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, Radio } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ErrorState } from "@/components/teacher/state-views";
import { api, ApiClientError } from "@/lib/api";
import type { TeacherClassListItem } from "@/components/teacher/types";

const inputClass =
  "h-11 w-full rounded-xl border border-border bg-muted px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/20";

export function StartSessionDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Stays null on failure — a fetch error must never be rendered as "you have zero classes".
  const [classes, setClasses] = useState<TeacherClassListItem[] | null>(null);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [classesError, setClassesError] = useState<string | null>(null);
  const [classId, setClassId] = useState("");
  const [title, setTitle] = useState("");
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
      setClassesError(e instanceof ApiClientError ? e.message : "Couldn't load your classes.");
    } finally {
      setLoadingClasses(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    loadClasses();
  }, [open, loadClasses]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!classId) {
      setError("Choose a class.");
      return;
    }
    if (!title.trim()) {
      setError("Session title is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { session } = await api<{ session: { id: string } }>("/api/sessions", {
        method: "POST",
        body: JSON.stringify({ classId, title: title.trim() }),
      });
      setOpen(false);
      router.push(`/teacher/sessions/${session.id}`);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Couldn't start the session.");
      toast.error("Couldn't start the session");
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
          setError(null);
        }
      }}
    >
      <DialogTrigger
        render={
          <button className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02] active:scale-[0.98]">
            <Plus className="h-4 w-4" />
            Start Session
          </button>
        }
      />
      <DialogContent className="border border-border bg-popover text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Radio className="h-4 w-4 text-primary" />
            Start a live session
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">Students in the class will be able to join instantly.</DialogDescription>
        </DialogHeader>

        {loadingClasses ? (
          <div className="h-24 animate-pulse rounded-xl border border-border bg-card" />
        ) : classesError ? (
          <ErrorState message={classesError} onRetry={loadClasses} />
        ) : classes && classes.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <p className="text-sm text-muted-foreground">You need a class before you can start a session.</p>
            <Link
              href="/teacher/classes"
              className="mt-3 inline-block rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Create a class
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Class</Label>
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
                Session title
              </Label>
              <input
                id="session-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Unit 4 Review"
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Go live
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
