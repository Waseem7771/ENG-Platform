import { describe, it, expect } from "vitest";
import { studentExerciseWhere, validateDifficultyParam } from "@/app/api/exercises/route";
import { ApiError } from "@/lib/guard";

describe("validateDifficultyParam", () => {
  it("accepts undefined for both roles", () => {
    expect(() => validateDifficultyParam(null, "TEACHER")).not.toThrow();
    expect(() => validateDifficultyParam(null, "STUDENT")).not.toThrow();
  });

  it("accepts valid LEVELS for both roles", () => {
    expect(() => validateDifficultyParam("BEGINNER", "TEACHER")).not.toThrow();
    expect(() => validateDifficultyParam("INTERMEDIATE", "TEACHER")).not.toThrow();
    expect(() => validateDifficultyParam("ADVANCED", "TEACHER")).not.toThrow();
    expect(() => validateDifficultyParam("BEGINNER", "STUDENT")).not.toThrow();
  });

  it("rejects ALL for teachers", () => {
    expect(() => validateDifficultyParam("ALL", "TEACHER")).toThrow(ApiError);
  });

  it("accepts ALL for students", () => {
    expect(() => validateDifficultyParam("ALL", "STUDENT")).not.toThrow();
  });

  it("rejects invalid values for both roles", () => {
    expect(() => validateDifficultyParam("INVALID", "TEACHER")).toThrow(ApiError);
    expect(() => validateDifficultyParam("INVALID", "STUDENT")).toThrow(ApiError);
  });
});

describe("studentExerciseWhere", () => {
  it("defaults to the user's level when no difficulty given", () => {
    expect(studentExerciseWhere({ userLevel: "BEGINNER" })).toEqual({ difficulty: "BEGINNER", status: "PUBLISHED" });
  });
  it("ALL bypasses the default", () => {
    expect(studentExerciseWhere({ difficulty: "ALL", userLevel: "BEGINNER" })).toEqual({ status: "PUBLISHED" });
  });
  it("explicit difficulty wins", () => {
    expect(studentExerciseWhere({ difficulty: "ADVANCED", userLevel: "BEGINNER" })).toEqual({ difficulty: "ADVANCED", status: "PUBLISHED" });
  });
  it("unplaced user gets everything", () => {
    expect(studentExerciseWhere({})).toEqual({ status: "PUBLISHED" });
  });
  it("keeps the type filter", () => {
    expect(studentExerciseWhere({ type: "QUIZ", userLevel: "ADVANCED" })).toEqual({ type: "QUIZ", difficulty: "ADVANCED", status: "PUBLISHED" });
  });
  it("always excludes drafts, regardless of other filters", () => {
    expect(studentExerciseWhere({}).status).toBe("PUBLISHED");
  });
});
