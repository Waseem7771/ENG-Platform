import { describe, it, expect, vi } from "vitest";
import type { Class } from "@/generated/prisma/client";

// Same rationale as tests/exercise-patch.test.ts / tests/lessons-api.test.ts:
// `requireOwnedClass` goes through `getSessionUser()` -> `headers()` from
// `next/headers`, which throws (`throwForMissingRequestStore`) outside a real
// Next.js request scope. Mock it via `vi.hoisted` so the *actual exported*
// route handlers can run end-to-end against the real test DB with a real
// better-auth session cookie.
const { getMockHeaders, setMockHeaders } = vi.hoisted(() => {
  let current = new Headers();
  return {
    getMockHeaders: () => current,
    setMockHeaders: (h: Headers) => {
      current = h;
    },
  };
});

vi.mock("next/headers", () => ({
  headers: async () => getMockHeaders(),
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/guard";
import { PATCH, buildClassPatch } from "@/app/api/classes/[id]/route";
import { DELETE as removeStudent } from "@/app/api/classes/[id]/students/[studentId]/route";

function fakeClass(overrides: Partial<Class> = {}): Class {
  return {
    id: "class1",
    name: "Original Class",
    description: "Original description",
    level: "BEGINNER",
    code: "ABC123",
    teacherId: "teacher1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Class;
}

// ==================== Unit tests: buildClassPatch (pure) ====================

describe("buildClassPatch", () => {
  it("builds a name update, trimmed", () => {
    expect(buildClassPatch(fakeClass(), { name: "  New Name  " })).toEqual({ name: "New Name" });
  });

  it("rejects an empty/whitespace-only name", () => {
    expect(() => buildClassPatch(fakeClass(), { name: "   " })).toThrow(ApiError);
  });

  it("rejects a non-string name", () => {
    expect(() => buildClassPatch(fakeClass(), { name: 5 })).toThrow(ApiError);
  });

  it("builds a description update, trimmed", () => {
    expect(buildClassPatch(fakeClass(), { description: "  New description  " })).toEqual({
      description: "New description",
    });
  });

  it("treats an empty/whitespace-only description as null (clears it)", () => {
    expect(buildClassPatch(fakeClass(), { description: "   " })).toEqual({ description: null });
  });

  it("accepts an explicit null description", () => {
    expect(buildClassPatch(fakeClass(), { description: null })).toEqual({ description: null });
  });

  it("rejects a non-string, non-null description", () => {
    expect(() => buildClassPatch(fakeClass(), { description: 5 })).toThrow(ApiError);
  });

  it("builds a level update", () => {
    expect(buildClassPatch(fakeClass(), { level: "ADVANCED" })).toEqual({ level: "ADVANCED" });
  });

  it.each(["ALL", "", 5, null, "beginner"])("rejects an invalid level %p", (bad) => {
    expect(() => buildClassPatch(fakeClass(), { level: bad })).toThrow(ApiError);
  });

  it("combines multiple fields into one patch", () => {
    const patch = buildClassPatch(fakeClass(), { name: "New", level: "INTERMEDIATE" });
    expect(patch).toEqual({ name: "New", level: "INTERMEDIATE" });
  });

  it("returns an empty patch for an empty body", () => {
    expect(buildClassPatch(fakeClass(), {})).toEqual({});
  });

  it("ignores unrecognized/immutable keys (id, code, teacherId)", () => {
    expect(buildClassPatch(fakeClass(), { id: "other", code: "ZZZZZZ", teacherId: "someone-else" })).toEqual({});
  });

  it.each([null, "nope", 42, ["array"]])("rejects a non-object body %p", (bad) => {
    expect(() => buildClassPatch(fakeClass(), bad)).toThrow(ApiError);
  });
});

// ==================== Integration touch: real route handlers + DB ====================

let classCounter = 0;

async function signUp(email: string, role?: "TEACHER") {
  const { headers: setCookie } = await auth.api.signUpEmail({
    body: { email, password: "password-123", name: "Test User" },
    query: role ? { role } : undefined,
    returnHeaders: true,
  });
  const cookie = setCookie
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  const user = await db.user.findUnique({ where: { email } });
  return { cookie, userId: user!.id };
}

function asUser(cookie: string) {
  setMockHeaders(new Headers({ cookie }));
}

function req(url: string, init?: RequestInit) {
  return new Request(url, init);
}

async function setupTeacherWithClass(email: string) {
  const { cookie, userId } = await signUp(email, "TEACHER");
  classCounter += 1;
  const klass = await db.class.create({
    data: {
      name: "Test Class",
      description: "A class",
      level: "BEGINNER",
      code: `CODE-${classCounter}-${Date.now()}`,
      teacherId: userId,
    },
  });
  return { cookie, userId, klass };
}

describe("PATCH /api/classes/[id] (integration)", () => {
  it("owner PATCH updates name/description/level; response is the full updated row", async () => {
    const { cookie, klass } = await setupTeacherWithClass("class-owner1@test.local");

    asUser(cookie);
    const res = await PATCH(
      req(`http://localhost/api/classes/${klass.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated Name", description: "Updated desc", level: "ADVANCED" }),
      }),
      { params: Promise.resolve({ id: klass.id }) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Updated Name");
    expect(body.description).toBe("Updated desc");
    expect(body.level).toBe("ADVANCED");

    const row = await db.class.findUnique({ where: { id: klass.id } });
    expect(row?.name).toBe("Updated Name");
    expect(row?.level).toBe("ADVANCED");
  });

  it("PATCH with an invalid level returns 400 and does not touch the row", async () => {
    const { cookie, klass } = await setupTeacherWithClass("class-owner2@test.local");

    asUser(cookie);
    const res = await PATCH(
      req(`http://localhost/api/classes/${klass.id}`, {
        method: "PATCH",
        body: JSON.stringify({ level: "EXPERT" }),
      }),
      { params: Promise.resolve({ id: klass.id }) }
    );
    expect(res.status).toBe(400);

    const row = await db.class.findUnique({ where: { id: klass.id } });
    expect(row?.level).toBe("BEGINNER");
  });

  it("non-owner PATCH returns 404 (not 403) and leaves the row untouched", async () => {
    const owner = await setupTeacherWithClass("class-owner3@test.local");
    const intruder = await signUp("class-intruder1@test.local", "TEACHER");

    asUser(intruder.cookie);
    const res = await PATCH(
      req(`http://localhost/api/classes/${owner.klass.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "Hijacked" }),
      }),
      { params: Promise.resolve({ id: owner.klass.id }) }
    );
    expect(res.status).toBe(404);

    const row = await db.class.findUnique({ where: { id: owner.klass.id } });
    expect(row?.name).toBe("Test Class");
  });
});

describe("DELETE /api/classes/[id]/students/[studentId] (integration)", () => {
  it("removes an enrolled student's ClassStudent row without deleting the student's User row", async () => {
    const { cookie, klass } = await setupTeacherWithClass("class-remove-owner1@test.local");
    const student = await signUp("class-remove-student1@test.local");
    await db.classStudent.create({ data: { classId: klass.id, studentId: student.userId } });

    asUser(cookie);
    const res = await removeStudent(
      req(`http://localhost/api/classes/${klass.id}/students/${student.userId}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: klass.id, studentId: student.userId }) }
    );
    expect(res.status).toBe(200);

    const enrollment = await db.classStudent.findUnique({
      where: { classId_studentId: { classId: klass.id, studentId: student.userId } },
    });
    expect(enrollment).toBeNull();

    const studentUser = await db.user.findUnique({ where: { id: student.userId } });
    expect(studentUser).not.toBeNull();
  });

  it("revokes the student's SessionStudent join tokens for THIS class's sessions, but not other classes'", async () => {
    const { cookie, userId, klass } = await setupTeacherWithClass("class-remove-owner-sess@test.local");
    const student = await signUp("class-remove-student-sess@test.local");
    await db.classStudent.create({ data: { classId: klass.id, studentId: student.userId } });

    // A live session in THIS class the student has joined (the token to revoke).
    const thisSession = await db.liveSession.create({
      data: { classId: klass.id, teacherId: userId, title: "This", status: "ACTIVE", startedAt: new Date() },
    });
    await db.sessionStudent.create({ data: { sessionId: thisSession.id, studentId: student.userId } });

    // A session in a DIFFERENT class the same student joined — must be untouched.
    const other = await setupTeacherWithClass("class-remove-owner-sess-b@test.local");
    const otherSession = await db.liveSession.create({
      data: { classId: other.klass.id, teacherId: other.userId, title: "Other", status: "ACTIVE", startedAt: new Date() },
    });
    await db.sessionStudent.create({ data: { sessionId: otherSession.id, studentId: student.userId } });

    asUser(cookie);
    const res = await removeStudent(
      req(`http://localhost/api/classes/${klass.id}/students/${student.userId}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: klass.id, studentId: student.userId }) }
    );
    expect(res.status).toBe(200);

    const revoked = await db.sessionStudent.findUnique({
      where: { sessionId_studentId: { sessionId: thisSession.id, studentId: student.userId } },
    });
    expect(revoked).toBeNull();

    const survivor = await db.sessionStudent.findUnique({
      where: { sessionId_studentId: { sessionId: otherSession.id, studentId: student.userId } },
    });
    expect(survivor).not.toBeNull();
  });

  it("404s when the student isn't enrolled in the class", async () => {
    const { cookie, klass } = await setupTeacherWithClass("class-remove-owner2@test.local");
    const student = await signUp("class-remove-student2@test.local");

    asUser(cookie);
    const res = await removeStudent(
      req(`http://localhost/api/classes/${klass.id}/students/${student.userId}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: klass.id, studentId: student.userId }) }
    );
    expect(res.status).toBe(404);
  });

  it("non-owner DELETE returns 404 and leaves the enrollment untouched", async () => {
    const owner = await setupTeacherWithClass("class-remove-owner3@test.local");
    const intruder = await signUp("class-remove-intruder1@test.local", "TEACHER");
    const student = await signUp("class-remove-student3@test.local");
    await db.classStudent.create({ data: { classId: owner.klass.id, studentId: student.userId } });

    asUser(intruder.cookie);
    const res = await removeStudent(
      req(`http://localhost/api/classes/${owner.klass.id}/students/${student.userId}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: owner.klass.id, studentId: student.userId }) }
    );
    expect(res.status).toBe(404);

    const enrollment = await db.classStudent.findUnique({
      where: { classId_studentId: { classId: owner.klass.id, studentId: student.userId } },
    });
    expect(enrollment).not.toBeNull();
  });
});
