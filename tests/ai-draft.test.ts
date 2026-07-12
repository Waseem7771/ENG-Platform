import { describe, it, expect } from "vitest";
import { generateExerciseDraft } from "@/lib/ai";
import { validateExerciseData } from "@/app/api/exercises/route";
import { EXERCISE_TYPES } from "@/types";
import type { ExerciseType } from "@/types";

// No real OPENAI_API_KEY is configured in the test environment (see
// tests/global-setup.ts / .env's placeholder key), so aiAvailable() is false
// and every call below exercises the deterministic offline fallback. The
// contract that matters: it must ALWAYS be structurally valid per
// validateExerciseData, because the caller (the AI-draft endpoint / the
// exercise editor) drops the result straight into the form with no further
// checks.
describe("generateExerciseDraft (offline fallback)", () => {
  it.each(EXERCISE_TYPES)(
    "%s: resolves aiAvailable:false with data that passes validateExerciseData",
    async (type) => {
      const result = await generateExerciseDraft(type as ExerciseType, "BEGINNER", "daily routines");
      expect(result.aiAvailable).toBe(false);
      expect(() => validateExerciseData(type as ExerciseType, result.data)).not.toThrow();
    }
  );

  it("incorporates the given topic into the draft content", async () => {
    const result = await generateExerciseDraft("VOCABULARY", "INTERMEDIATE", "space travel");
    expect(JSON.stringify(result.data)).toContain("space travel");
  });

  it("falls back to a safe default when topic is blank", async () => {
    const result = await generateExerciseDraft("STORY", "ADVANCED", "   ");
    expect(result.aiAvailable).toBe(false);
    expect(() => validateExerciseData("STORY", result.data)).not.toThrow();
  });
});
