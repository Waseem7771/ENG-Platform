"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ExerciseForm } from "@/components/teacher/exercise-form/exercise-form";

export default function NewExercisePage() {
  const router = useRouter();

  // ExerciseForm's onSaved fires on the autosave's first POST (id-capture) and again on
  // every Publish. Either can race in — this ref guarantees the URL replace happens exactly
  // once, so a Publish that lands right after the autosave's replace can't re-trigger it.
  const replacedRef = useRef(false);

  const handleSaved = useCallback(
    (id: string) => {
      if (replacedRef.current) return;
      replacedRef.current = true;
      router.replace(`/teacher/content/exercises/${id}/edit`);
    },
    [router]
  );

  return (
    <div className="mx-auto max-w-3xl">
      <ExerciseForm onSaved={handleSaved} />
    </div>
  );
}
