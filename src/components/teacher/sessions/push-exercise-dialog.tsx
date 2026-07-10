"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Radio, Search } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ExerciseTypeBadge } from "@/components/teacher/badges";
import { ErrorState } from "@/components/teacher/state-views";
import { api, ApiClientError } from "@/lib/api";
import type { TeacherExerciseListItem } from "@/components/teacher/types";

export function PushExerciseDialog({
  sessionId,
  disabled,
  onPushed,
}: {
  sessionId: string;
  disabled: boolean;
  onPushed: (exercise: TeacherExerciseListItem) => void;
}) {
  const [open, setOpen] = useState(false);
  // Stays null until a fetch actually succeeds — lets us tell "never loaded" / "still loading"
  // apart from a genuinely empty roster, and a failed fetch never poisons this into `[]` forever.
  const [exercises, setExercises] = useState<TeacherExerciseListItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pushingId, setPushingId] = useState<string | null>(null);

  const loadExercises = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<TeacherExerciseListItem[]>("/api/exercises");
      setExercises(data);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Couldn't load your exercises.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch every time the dialog opens rather than caching once — a stale/failed load
  // should never be able to permanently brick this dialog behind an empty-state screen.
  useEffect(() => {
    if (!open) return;
    loadExercises();
  }, [open, loadExercises]);

  const filtered = (exercises ?? []).filter((ex) => ex.title.toLowerCase().includes(query.toLowerCase()));

  async function handlePush(exercise: TeacherExerciseListItem) {
    setPushingId(exercise.id);
    try {
      await api(`/api/sessions/${sessionId}/push`, {
        method: "POST",
        body: JSON.stringify({ exerciseId: exercise.id }),
      });
      toast.success(`Pushed "${exercise.title}"`);
      onPushed(exercise);
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Couldn't push this exercise.");
    } finally {
      setPushingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            disabled={disabled}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
          >
            <Radio className="h-3.5 w-3.5" />
            Push Exercise
          </button>
        }
      />
      <DialogContent className="max-h-[80vh] overflow-hidden border border-white/10 bg-[#15121f] p-0 text-white sm:max-w-lg">
        <div className="p-4">
          <DialogHeader>
            <DialogTitle className="text-white">Push an exercise</DialogTitle>
            <DialogDescription className="text-white/50">All students in this session will see it instantly.</DialogDescription>
          </DialogHeader>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search exercises..."
              className="h-10 w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-foreground placeholder:text-white/20 outline-none focus:border-violet-500/50"
            />
          </div>
        </div>
        <div className="max-h-[50vh] space-y-1.5 overflow-y-auto px-4 pb-4">
          {loading && (
            <div className="space-y-2">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl border border-white/5 bg-white/[0.02]" />
              ))}
            </div>
          )}
          {!loading && error && <ErrorState message={error} onRetry={loadExercises} />}
          {!loading && !error && exercises !== null && exercises.length === 0 && (
            <p className="py-8 text-center text-sm text-white/30">You haven&apos;t created any exercises yet.</p>
          )}
          {!loading && !error && exercises !== null && exercises.length > 0 && filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-white/30">No exercises match your search.</p>
          )}
          {!loading &&
            !error &&
            filtered.map((ex) => (
              <button
                key={ex.id}
                onClick={() => handlePush(ex)}
                disabled={pushingId !== null}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3.5 text-left transition-colors hover:border-violet-500/30 hover:bg-violet-500/5 disabled:pointer-events-none disabled:opacity-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white/85">{ex.title}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <ExerciseTypeBadge type={ex.type} />
                  </div>
                </div>
                {pushingId === ex.id && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-violet-300" />}
              </button>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
