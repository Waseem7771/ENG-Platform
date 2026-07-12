import { describe, it, expect, vi } from "vitest";
import type { Exercise } from "@/generated/prisma/client";

// `requireOwnedExercise`/`requireUser` (via guard.ts) call next/headers'
// `headers()`, which throws outside a real Next.js request scope (confirmed
// in node_modules/next/dist/esm/server/request/headers.js —
// `throwForMissingRequestStore` when there's no work-unit store). A plain
// vitest test never has that store, so calling the exported route handlers
// directly needs `next/headers` mocked to hand back a real session cookie.
// `vi.hoisted` avoids the TDZ footgun of referencing a `let` from inside a
// hoisted `vi.mock` factory.
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
import { GET, PATCH, buildExercisePatch } from "@/app/api/exercises/[id]/route";
import { GET as listGET, POST as createPOST } from "@/app/api/exercises/route";
import { ApiError } from "@/lib/guard";

const GRAMMAR_DATA = {
  items: [
    {
      id: "g1",
      kind: "fill-blank",
      prompt: "She ___ to school.",
      text: "She ___ to school.",
      options: ["goes", "go", "going"],
      answer: "goes",
      explanation: "3rd person -s",
    },
  ],
};

const TRANSLATION_DATA = {
  items: [{ id: "t1", direction: "en-ar", source: "hello", reference: "مرحبا" }],
};

function fakeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: "ex1",
    lessonId: null,
    createdById: "teacher1",
    title: "Sample",
    type: "GRAMMAR",
    difficulty: "BEGINNER",
    data: JSON.stringify(GRAMMAR_DATA),
    timeLimit: null,
    points: 10,
    status: "PUBLISHED",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Exercise;
}

// ==================== Unit tests: buildExercisePatch (pure) ====================

describe("buildExercisePatch", () => {
  it("builds a title update", () => {
    expect(buildExercisePatch(fakeExercise(), { title: "  New Title  " })).toEqual({ title: "New Title" });
  });

  it("rejects an empty title", () => {
    expect(() => buildExercisePatch(fakeExercise(), { title: "   " })).toThrow(ApiError);
  });

  it("builds a difficulty update", () => {
    expect(buildExercisePatch(fakeExercise(), { difficulty: "ADVANCED" })).toEqual({ difficulty: "ADVANCED" });
  });

  it("rejects an invalid difficulty", () => {
    expect(() => buildExercisePatch(fakeExercise(), { difficulty: "ALL" })).toThrow(ApiError);
  });

  it("re-validates data against the STORED type and stringifies it", () => {
    const patch = buildExercisePatch(fakeExercise({ type: "GRAMMAR" }), { data: GRAMMAR_DATA });
    expect(patch.data).toBe(JSON.stringify(GRAMMAR_DATA));
  });

  it("rejects data that fails validateExerciseData for the stored type", () => {
    expect(() => buildExercisePatch(fakeExercise({ type: "GRAMMAR" }), { data: { items: [] } })).toThrow(ApiError);
  });

  it("type is immutable: a body.type is ignored and data is validated against existing.type, not body.type", () => {
    // existing row is GRAMMAR; body claims type QUIZ but supplies GRAMMAR-shaped
    // data (which would fail QUIZ validation, since QUIZ needs timePerQuestion).
    // If the code ever read body.type this would throw; it must not.
    const patch = buildExercisePatch(fakeExercise({ type: "GRAMMAR" }), {
      type: "QUIZ",
      data: GRAMMAR_DATA,
    });
    expect(patch.data).toBe(JSON.stringify(GRAMMAR_DATA));
    expect(patch).not.toHaveProperty("type");
  });

  it("accepts a positive integer points", () => {
    expect(buildExercisePatch(fakeExercise(), { points: 25 })).toEqual({ points: 25 });
  });

  it.each([0, -5, 1.5, "10"])("rejects invalid points %p", (bad) => {
    expect(() => buildExercisePatch(fakeExercise(), { points: bad })).toThrow(ApiError);
  });

  it("accepts a positive integer timeLimit", () => {
    expect(buildExercisePatch(fakeExercise(), { timeLimit: 60 })).toEqual({ timeLimit: 60 });
  });

  it("accepts an explicit null timeLimit (clears it)", () => {
    expect(buildExercisePatch(fakeExercise({ timeLimit: 60 }), { timeLimit: null })).toEqual({ timeLimit: null });
  });

  it.each([0, -1, 1.5])("rejects invalid non-null timeLimit %p", (bad) => {
    expect(() => buildExercisePatch(fakeExercise(), { timeLimit: bad })).toThrow(ApiError);
  });

  it("accepts DRAFT and PUBLISHED status", () => {
    expect(buildExercisePatch(fakeExercise(), { status: "DRAFT" })).toEqual({ status: "DRAFT" });
    expect(buildExercisePatch(fakeExercise(), { status: "PUBLISHED" })).toEqual({ status: "PUBLISHED" });
  });

  it("rejects an invalid status", () => {
    expect(() => buildExercisePatch(fakeExercise(), { status: "ARCHIVED" })).toThrow(ApiError);
  });

  it("combines multiple fields into one patch", () => {
    const patch = buildExercisePatch(fakeExercise(), { title: "New", points: 30, status: "DRAFT" });
    expect(patch).toEqual({ title: "New", points: 30, status: "DRAFT" });
  });

  it("returns an empty patch for an empty body", () => {
    expect(buildExercisePatch(fakeExercise(), {})).toEqual({});
  });

  it("ignores unrecognized keys (e.g. id, createdById)", () => {
    expect(buildExercisePatch(fakeExercise(), { id: "other", createdById: "someone-else" })).toEqual({});
  });

  it.each([null, "nope", 42, ["array"]])("rejects a non-object body %p", (bad) => {
    expect(() => buildExercisePatch(fakeExercise(), bad)).toThrow(ApiError);
  });
});

// ==================== Integration touch: real route handlers + DB ====================

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

describe("PATCH /api/exercises/[id] + edit-mode GET + status filtering (integration)", () => {
  it("owner PATCH updates title and toggles status; response is the full row with parsed data", async () => {
    const { cookie, userId } = await signUp("owner1@test.local", "TEACHER");
    const created = await db.exercise.create({
      data: {
        title: "Original",
        type: "TRANSLATION",
        difficulty: "BEGINNER",
        data: JSON.stringify(TRANSLATION_DATA),
        points: 10,
        status: "PUBLISHED",
        createdById: userId,
      },
    });

    asUser(cookie);
    const res = await PATCH(
      req(`http://localhost/api/exercises/${created.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated Title", status: "DRAFT" }),
      }),
      { params: Promise.resolve({ id: created.id }) }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("Updated Title");
    expect(body.status).toBe("DRAFT");
    expect(body.data).toEqual(TRANSLATION_DATA);

    const row = await db.exercise.findUnique({ where: { id: created.id } });
    expect(row?.title).toBe("Updated Title");
    expect(row?.status).toBe("DRAFT");
  });

  it("PATCH with invalid data for the stored type returns 400 and does not touch the row", async () => {
    const { cookie, userId } = await signUp("owner2@test.local", "TEACHER");
    const created = await db.exercise.create({
      data: {
        title: "Grammar Ex",
        type: "GRAMMAR",
        difficulty: "BEGINNER",
        data: JSON.stringify(GRAMMAR_DATA),
        points: 10,
        createdById: userId,
      },
    });

    asUser(cookie);
    const res = await PATCH(
      req(`http://localhost/api/exercises/${created.id}`, {
        method: "PATCH",
        body: JSON.stringify({ data: { items: [] } }),
      }),
      { params: Promise.resolve({ id: created.id }) }
    );
    expect(res.status).toBe(400);

    const row = await db.exercise.findUnique({ where: { id: created.id } });
    expect(row?.data).toBe(JSON.stringify(GRAMMAR_DATA));
  });

  it("non-owner PATCH returns 404 (not 403) and leaves the row untouched", async () => {
    const owner = await signUp("owner3@test.local", "TEACHER");
    const intruder = await signUp("intruder1@test.local", "TEACHER");
    const created = await db.exercise.create({
      data: {
        title: "Owned",
        type: "GRAMMAR",
        difficulty: "BEGINNER",
        data: JSON.stringify(GRAMMAR_DATA),
        points: 10,
        createdById: owner.userId,
      },
    });

    asUser(intruder.cookie);
    const res = await PATCH(
      req(`http://localhost/api/exercises/${created.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: "Hijacked" }),
      }),
      { params: Promise.resolve({ id: created.id }) }
    );
    expect(res.status).toBe(404);

    const row = await db.exercise.findUnique({ where: { id: created.id } });
    expect(row?.title).toBe("Owned");
  });

  it("GET ?edit=1 returns the owner the unredacted reference/description; normal GET stays redacted", async () => {
    const { cookie, userId } = await signUp("owner4@test.local", "TEACHER");
    const created = await db.exercise.create({
      data: {
        title: "Translate",
        type: "TRANSLATION",
        difficulty: "BEGINNER",
        data: JSON.stringify(TRANSLATION_DATA),
        points: 10,
        createdById: userId,
      },
    });

    asUser(cookie);
    const editRes = await GET(req(`http://localhost/api/exercises/${created.id}?edit=1`), {
      params: Promise.resolve({ id: created.id }),
    });
    expect(editRes.status).toBe(200);
    const editBody = await editRes.json();
    expect(editBody.data.items[0].reference).toBe("مرحبا");

    const plainRes = await GET(req(`http://localhost/api/exercises/${created.id}`), {
      params: Promise.resolve({ id: created.id }),
    });
    const plainBody = await plainRes.json();
    expect(plainBody.data.items[0].reference).toBeUndefined();
    expect(plainBody.data.items[0].source).toBe("hello");
  });

  it("GET ?edit=1 from a non-owner 404s (can't dodge redaction or probe a draft's existence)", async () => {
    const owner = await signUp("owner5@test.local", "TEACHER");
    const other = await signUp("other1@test.local", "TEACHER");
    const created = await db.exercise.create({
      data: {
        title: "Translate",
        type: "TRANSLATION",
        difficulty: "BEGINNER",
        data: JSON.stringify(TRANSLATION_DATA),
        points: 10,
        createdById: owner.userId,
      },
    });

    asUser(other.cookie);
    const res = await GET(req(`http://localhost/api/exercises/${created.id}?edit=1`), {
      params: Promise.resolve({ id: created.id }),
    });
    expect(res.status).toBe(404);
  });

  it("a DRAFT exercise's plain GET 404s for a student, but still works for its owner", async () => {
    const owner = await signUp("owner6@test.local", "TEACHER");
    const student = await signUp("student1@test.local");
    const created = await db.exercise.create({
      data: {
        title: "Draft Ex",
        type: "GRAMMAR",
        difficulty: "BEGINNER",
        data: JSON.stringify(GRAMMAR_DATA),
        points: 10,
        status: "DRAFT",
        createdById: owner.userId,
      },
    });

    asUser(student.cookie);
    const studentRes = await GET(req(`http://localhost/api/exercises/${created.id}`), {
      params: Promise.resolve({ id: created.id }),
    });
    expect(studentRes.status).toBe(404);

    asUser(owner.cookie);
    const ownerRes = await GET(req(`http://localhost/api/exercises/${created.id}`), {
      params: Promise.resolve({ id: created.id }),
    });
    expect(ownerRes.status).toBe(200);
  });

  it("student list excludes DRAFT exercises; teacher list includes them with status", async () => {
    const teacher = await signUp("teacher-list1@test.local", "TEACHER");
    const student = await signUp("student-list1@test.local");

    await db.exercise.create({
      data: {
        title: "Published One",
        type: "QUIZ",
        difficulty: "BEGINNER",
        data: JSON.stringify({ timePerQuestion: 20, items: [{ id: "q1", question: "2+2", options: ["3", "4"], answer: "4" }] }),
        points: 10,
        status: "PUBLISHED",
        createdById: teacher.userId,
      },
    });
    const draft = await db.exercise.create({
      data: {
        title: "Draft One",
        type: "QUIZ",
        difficulty: "BEGINNER",
        data: JSON.stringify({ timePerQuestion: 20, items: [{ id: "q2", question: "3+3", options: ["5", "6"], answer: "6" }] }),
        points: 10,
        status: "DRAFT",
        createdById: teacher.userId,
      },
    });

    asUser(student.cookie);
    const studentRes = await listGET(req("http://localhost/api/exercises"));
    const studentList = await studentRes.json();
    expect(studentList.some((e: { id: string }) => e.id === draft.id)).toBe(false);

    asUser(teacher.cookie);
    const teacherRes = await listGET(req("http://localhost/api/exercises"));
    const teacherList = await teacherRes.json();
    const draftEntry = teacherList.find((e: { id: string }) => e.id === draft.id);
    expect(draftEntry).toBeTruthy();
    expect(draftEntry.status).toBe("DRAFT");
  });

  it("POST defaults status to PUBLISHED, and accepts an explicit DRAFT", async () => {
    const teacher = await signUp("teacher-post1@test.local", "TEACHER");
    asUser(teacher.cookie);

    const defaultRes = await createPOST(
      req("http://localhost/api/exercises", {
        method: "POST",
        body: JSON.stringify({ title: "No status given", type: "GRAMMAR", difficulty: "BEGINNER", data: GRAMMAR_DATA }),
      })
    );
    expect(defaultRes.status).toBe(201);
    expect((await defaultRes.json()).status).toBe("PUBLISHED");

    const draftRes = await createPOST(
      req("http://localhost/api/exercises", {
        method: "POST",
        body: JSON.stringify({ title: "Explicit draft", type: "GRAMMAR", difficulty: "BEGINNER", data: GRAMMAR_DATA, status: "DRAFT" }),
      })
    );
    expect(draftRes.status).toBe(201);
    expect((await draftRes.json()).status).toBe("DRAFT");
  });
});
