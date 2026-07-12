"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { ExerciseForm } from "@/components/teacher/exercise-form/exercise-form";

export function EditExerciseScreen({ id }: { id: string }) {
  const router = useRouter();

  // Only fires when Publish succeeds (the initial-load id is already set, so the
  // POST-branch id-capture in ExerciseForm never runs here; draft saves don't call
  // onSaved at all). ExerciseForm already shows the "published" toast itself.
  const handleSaved = useCallback(() => {
    router.push("/teacher/exercises");
  }, [router]);

  return (
    <div className="mx-auto max-w-3xl">
      <ExerciseForm exerciseId={id} onSaved={handleSaved} />
    </div>
  );
}
