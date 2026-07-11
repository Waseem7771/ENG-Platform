import { describe, it, expect } from "vitest";
import { studentExerciseWhere } from "@/app/api/exercises/route";

describe("studentExerciseWhere", () => {
  it("defaults to the user's level when no difficulty given", () => {
    expect(studentExerciseWhere({ userLevel: "BEGINNER" })).toEqual({ difficulty: "BEGINNER" });
  });
  it("ALL bypasses the default", () => {
    expect(studentExerciseWhere({ difficulty: "ALL", userLevel: "BEGINNER" })).toEqual({});
  });
  it("explicit difficulty wins", () => {
    expect(studentExerciseWhere({ difficulty: "ADVANCED", userLevel: "BEGINNER" })).toEqual({ difficulty: "ADVANCED" });
  });
  it("unplaced user gets everything", () => {
    expect(studentExerciseWhere({})).toEqual({});
  });
  it("keeps the type filter", () => {
    expect(studentExerciseWhere({ type: "QUIZ", userLevel: "ADVANCED" })).toEqual({ type: "QUIZ", difficulty: "ADVANCED" });
  });
});
