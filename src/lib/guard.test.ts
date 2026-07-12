import { describe, it, expect } from "vitest";
import { assertOwned, ApiError } from "@/lib/guard";

// `requireOwnedExercise`/`requireOwnedClass` call `requireTeacher()`, which reads the
// session via `getSessionUser()` -> `headers()`. `next/headers` has no request store
// outside a real request context, so it throws (or returns an empty store) under plain
// vitest — there is nothing meaningful to assert without a live route. Per the task
// brief, those wrappers are exercised end-to-end via route integration tests in later
// tasks; here we unit-test the pure ownership core they both delegate to.

interface Owned {
  id: string;
  createdById: string;
}

describe("assertOwned", () => {
  const row: Owned = { id: "ex1", createdById: "teacher-1" };

  it("returns the row when the owner field matches userId", () => {
    expect(assertOwned(row, "createdById", "teacher-1")).toBe(row);
  });

  it("throws ApiError(404) when the row is null", () => {
    expect(() => assertOwned<Owned>(null, "createdById", "teacher-1")).toThrow(ApiError);
    try {
      assertOwned<Owned>(null, "createdById", "teacher-1");
      expect.unreachable("assertOwned should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(404);
    }
  });

  it("throws ApiError(404), not 403, when the row belongs to someone else", () => {
    try {
      assertOwned(row, "createdById", "someone-else");
      expect.unreachable("assertOwned should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(404);
    }
  });

  it("works with a differently-named owner field (e.g. Class.teacherId)", () => {
    const klass = { id: "c1", teacherId: "teacher-1" };
    expect(assertOwned(klass, "teacherId", "teacher-1")).toBe(klass);
    expect(() => assertOwned(klass, "teacherId", "teacher-2")).toThrow(ApiError);
  });

  it("throws ApiError(404) when userId is empty string", () => {
    const rowWithEmptyOwner = { id: "ex1", createdById: "" };
    try {
      assertOwned(rowWithEmptyOwner, "createdById", "");
      expect.unreachable("assertOwned should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(404);
    }
  });

  it("throws ApiError(404) when userId is undefined", () => {
    const rowWithUser = { id: "ex1", createdById: "teacher-1" };
    try {
      assertOwned(rowWithUser, "createdById", undefined as any);
      expect.unreachable("assertOwned should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(404);
    }
  });
});
