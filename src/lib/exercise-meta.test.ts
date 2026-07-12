import { describe, it, expect } from "vitest";
import { EXERCISE_TYPE_META, EXERCISE_TYPES } from "@/lib/exercise-meta";

describe("exercise-meta", () => {
  it("covers all 8 exercise types", () => {
    expect(EXERCISE_TYPES).toHaveLength(8);
    for (const t of EXERCISE_TYPES) {
      expect(EXERCISE_TYPE_META[t].label.length).toBeGreaterThan(0);
      expect(EXERCISE_TYPE_META[t].icon).toBeTruthy();
    }
  });
});
