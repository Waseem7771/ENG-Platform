import { describe, it, expect, vi } from "vitest";

// Same rationale as tests/exercise-patch.test.ts (Task 5): `requireTeacher`/
// `requireOwnedClass`/`assertOwned`-backed handlers all go through
// `getSessionUser()` -> `headers()` from `next/headers`, which throws
// (`throwForMissingRequestStore`) outside a real Next.js request scope. Mock
// it via `vi.hoisted` (avoids the TDZ footgun of a hoisted factory closing
// over a `let`) so the *actual exported* route handlers can run end-to-end
// against the real test DB with a real better-auth session cookie.
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
import { GET as listGET, POST as createPOST, buildLessonCreate } from "@/app/api/lessons/route";
import { PATCH, DELETE, buildLessonPatch } from "@/app/api/lessons/[id]/route";

const GRAMMAR_DATA = {
  items: [
    {
      id: "g1",
      kind: "fill-blank",
      prompt: "She ___ to school.",
      text: "She ___ to school.",
      options: ["goes", "go"],
      answer: "goes",
      explanation: "3rd person -s",
    },
  ],
};

// ==================== Unit tests: buildLessonCreate (pure) ====================

describe("buildLessonCreate", () => {
  const validBody = {
    classId: "class1",
    title: "Lesson One",
    level: "BEGINNER",
    unit: 1,
    order: 0,
  };

  it("builds fields from a minimal valid body, defaulting isCheckpoint/exerciseIds/description", () => {
    expect(buildLessonCreate(validBody)).toEqual({
      classId: "class1",
      title: "Lesson One",
      description: null,
      level: "BEGINNER",
      unit: 1,
      order: 0,
      isCheckpoint: false,
      exerciseIds: [],
    });
  });

  it("trims title and classId, and passes through description/isCheckpoint/exerciseIds", () => {
    const fields = buildLessonCreate({
      ...validBody,
      classId: "  class1  ",
      title: "  Lesson One  ",
      description: "A description",
      isCheckpoint: true,
      exerciseIds: ["ex1", "ex2"],
    });
    expect(fields.classId).toBe("class1");
    expect(fields.title).toBe("Lesson One");
    expect(fields.description).toBe("A description");
    expect(fields.isCheckpoint).toBe(true);
    expect(fields.exerciseIds).toEqual(["ex1", "ex2"]);
  });

  it.each([null, undefined, "", "   "])("rejects a missing/empty/null classId %p", (bad) => {
    expect(() => buildLessonCreate({ ...validBody, classId: bad })).toThrow(ApiError);
  });

  it("rejects a missing/empty title", () => {
    expect(() => buildLessonCreate({ ...validBody, title: "" })).toThrow(ApiError);
  });

  it.each(["ALL", "", 5, null])("rejects an invalid level %p", (bad) => {
    expect(() => buildLessonCreate({ ...validBody, level: bad })).toThrow(ApiError);
  });

  it.each([0, -1, 1.5, "1"])("rejects an invalid unit %p", (bad) => {
    expect(() => buildLessonCreate({ ...validBody, unit: bad })).toThrow(ApiError);
  });

  it.each([-1, 1.5, "0"])("rejects an invalid order %p", (bad) => {
    expect(() => buildLessonCreate({ ...validBody, order: bad })).toThrow(ApiError);
  });

  it("accepts order 0", () => {
    expect(buildLessonCreate({ ...validBody, order: 0 }).order).toBe(0);
  });

  it("rejects a non-boolean isCheckpoint", () => {
    expect(() => buildLessonCreate({ ...validBody, isCheckpoint: "yes" })).toThrow(ApiError);
  });

  it("rejects a non-string-array exerciseIds", () => {
    expect(() => buildLessonCreate({ ...validBody, exerciseIds: [1, 2] })).toThrow(ApiError);
    expect(() => buildLessonCreate({ ...validBody, exerciseIds: "ex1" })).toThrow(ApiError);
  });

  it("rejects a non-string description", () => {
    expect(() => buildLessonCreate({ ...validBody, description: 5 })).toThrow(ApiError);
  });

  it.each([null, "nope", 42, ["array"]])("rejects a non-object body %p", (bad) => {
    expect(() => buildLessonCreate(bad)).toThrow(ApiError);
  });
});

// ==================== Unit tests: buildLessonPatch (pure) ====================

describe("buildLessonPatch", () => {
  it("returns an empty patch for an empty body", () => {
    expect(buildLessonPatch({})).toEqual({});
  });

  it("builds a title update, trimmed", () => {
    expect(buildLessonPatch({ title: "  New Title  " })).toEqual({ title: "New Title" });
  });

  it("rejects an empty title", () => {
    expect(() => buildLessonPatch({ title: "   " })).toThrow(ApiError);
  });

  it("builds a description update, including explicit null (clears it)", () => {
    expect(buildLessonPatch({ description: "Desc" })).toEqual({ description: "Desc" });
    expect(buildLessonPatch({ description: null })).toEqual({ description: null });
  });

  it("rejects a non-string, non-null description", () => {
    expect(() => buildLessonPatch({ description: 5 })).toThrow(ApiError);
  });

  it("builds a unit update", () => {
    expect(buildLessonPatch({ unit: 3 })).toEqual({ unit: 3 });
  });

  it.each([0, -1, 1.5, "2"])("rejects an invalid unit %p", (bad) => {
    expect(() => buildLessonPatch({ unit: bad })).toThrow(ApiError);
  });

  it("builds an order update, accepting 0", () => {
    expect(buildLessonPatch({ order: 0 })).toEqual({ order: 0 });
  });

  it.each([-1, 1.5, "2"])("rejects an invalid order %p", (bad) => {
    expect(() => buildLessonPatch({ order: bad })).toThrow(ApiError);
  });

  it("builds an isCheckpoint update", () => {
    expect(buildLessonPatch({ isCheckpoint: true })).toEqual({ isCheckpoint: true });
  });

  it("rejects a non-boolean isCheckpoint", () => {
    expect(() => buildLessonPatch({ isCheckpoint: "true" })).toThrow(ApiError);
  });

  it("builds an exerciseIds update, including an empty array (disconnect all)", () => {
    expect(buildLessonPatch({ exerciseIds: ["ex1", "ex2"] })).toEqual({ exerciseIds: ["ex1", "ex2"] });
    expect(buildLessonPatch({ exerciseIds: [] })).toEqual({ exerciseIds: [] });
  });

  it("rejects a non-string-array exerciseIds", () => {
    expect(() => buildLessonPatch({ exerciseIds: [1, 2] })).toThrow(ApiError);
  });

  it("ignores unrecognized/immutable keys (classId, level, id, createdById)", () => {
    expect(buildLessonPatch({ classId: "other", level: "ADVANCED", id: "x", createdById: "y" })).toEqual({});
  });

  it.each([null, "nope", 42, ["array"]])("rejects a non-object body %p", (bad) => {
    expect(() => buildLessonPatch(bad)).toThrow(ApiError);
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

let classCounter = 0;
async function setupTeacherWithClass(email: string) {
  const { cookie, userId } = await signUp(email, "TEACHER");
  classCounter += 1;
  const klass = await db.class.create({
    data: {
      name: "Test Class",
      level: "BEGINNER",
      code: `CODE-${classCounter}-${Date.now()}`,
      teacherId: userId,
    },
  });
  return { cookie, userId, klass };
}

async function createExercise(ownerId: string, title = "Ex") {
  return db.exercise.create({
    data: {
      title,
      type: "GRAMMAR",
      difficulty: "BEGINNER",
      data: JSON.stringify(GRAMMAR_DATA),
      points: 10,
      createdById: ownerId,
    },
  });
}

describe("POST /api/lessons (integration)", () => {
  it("creates a lesson owned by the teacher and connects only exercises the teacher owns", async () => {
    const { cookie, userId, klass } = await setupTeacherWithClass("lesson-owner1@test.local");
    const ex1 = await createExercise(userId, "Ex1");
    const ex2 = await createExercise(userId, "Ex2");

    asUser(cookie);
    const res = await createPOST(
      req("http://localhost/api/lessons", {
        method: "POST",
        body: JSON.stringify({
          classId: klass.id,
          title: "Lesson 1",
          level: "BEGINNER",
          unit: 1,
          order: 0,
          exerciseIds: [ex1.id, ex2.id],
        }),
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.createdById).toBe(userId);
    expect(body.classId).toBe(klass.id);
    expect(body.exercises.map((e: { id: string }) => e.id).sort()).toEqual([ex1.id, ex2.id].sort());

    const row = await db.lesson.findUnique({ where: { id: body.id }, include: { exercises: true } });
    expect(row?.exercises).toHaveLength(2);
  });

  it("rejects a foreign exerciseId with 400 and creates nothing", async () => {
    const { cookie, klass } = await setupTeacherWithClass("lesson-owner2@test.local");
    const other = await signUp("lesson-other1@test.local", "TEACHER");
    const foreignEx = await createExercise(other.userId, "Foreign");

    asUser(cookie);
    const res = await createPOST(
      req("http://localhost/api/lessons", {
        method: "POST",
        body: JSON.stringify({
          classId: klass.id,
          title: "Lesson 2",
          level: "BEGINNER",
          unit: 1,
          order: 0,
          exerciseIds: [foreignEx.id],
        }),
      })
    );
    expect(res.status).toBe(400);
    expect(await db.lesson.findMany({ where: { classId: klass.id } })).toHaveLength(0);
  });

  it("rejects an unknown exerciseId with 400", async () => {
    const { cookie, klass } = await setupTeacherWithClass("lesson-owner2b@test.local");

    asUser(cookie);
    const res = await createPOST(
      req("http://localhost/api/lessons", {
        method: "POST",
        body: JSON.stringify({
          classId: klass.id,
          title: "Lesson 2b",
          level: "BEGINNER",
          unit: 1,
          order: 0,
          exerciseIds: ["does-not-exist"],
        }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("accepts a list with duplicate owned exerciseIds and connects each distinct id once", async () => {
    const { cookie, userId, klass } = await setupTeacherWithClass("lesson-dup1@test.local");
    const ex1 = await createExercise(userId, "Ex1");

    asUser(cookie);
    const res = await createPOST(
      req("http://localhost/api/lessons", {
        method: "POST",
        body: JSON.stringify({
          classId: klass.id,
          title: "Lesson with Duplicate",
          level: "BEGINNER",
          unit: 1,
          order: 0,
          exerciseIds: [ex1.id, ex1.id],
        }),
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.exercises.map((e: { id: string }) => e.id)).toEqual([ex1.id]);

    const row = await db.lesson.findUnique({ where: { id: body.id }, include: { exercises: true } });
    expect(row?.exercises).toHaveLength(1);
    expect(row?.exercises[0].id).toBe(ex1.id);
  });

  it("rejects a list with one owned + one foreign exerciseId with 400", async () => {
    const { cookie, userId, klass } = await setupTeacherWithClass("lesson-mixed1@test.local");
    const other = await signUp("lesson-mixed-other1@test.local", "TEACHER");
    const ownEx = await createExercise(userId, "Own");
    const foreignEx = await createExercise(other.userId, "Foreign");

    asUser(cookie);
    const res = await createPOST(
      req("http://localhost/api/lessons", {
        method: "POST",
        body: JSON.stringify({
          classId: klass.id,
          title: "Lesson Mixed",
          level: "BEGINNER",
          unit: 1,
          order: 0,
          exerciseIds: [ownEx.id, foreignEx.id],
        }),
      })
    );
    expect(res.status).toBe(400);
    expect(await db.lesson.findMany({ where: { classId: klass.id } })).toHaveLength(0);
  });

  it("rejects classId: null with 400 (seeded curriculum is read-only via this API)", async () => {
    const { cookie } = await setupTeacherWithClass("lesson-owner3@test.local");

    asUser(cookie);
    const res = await createPOST(
      req("http://localhost/api/lessons", {
        method: "POST",
        body: JSON.stringify({ classId: null, title: "Lesson", level: "BEGINNER", unit: 1, order: 0 }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when the teacher does not own the target class", async () => {
    const owner = await setupTeacherWithClass("lesson-owner4@test.local");
    const intruder = await signUp("lesson-intruder1@test.local", "TEACHER");

    asUser(intruder.cookie);
    const res = await createPOST(
      req("http://localhost/api/lessons", {
        method: "POST",
        body: JSON.stringify({ classId: owner.klass.id, title: "Lesson", level: "BEGINNER", unit: 1, order: 0 }),
      })
    );
    expect(res.status).toBe(404);
  });
});

describe("GET /api/lessons?classId= (integration)", () => {
  it("lists the class's lessons ordered by unit,order, each with exercises and a count", async () => {
    const { cookie, userId, klass } = await setupTeacherWithClass("lesson-list1@test.local");
    const ex = await createExercise(userId, "ExA");
    const lessonUnit2 = await db.lesson.create({
      data: { classId: klass.id, createdById: userId, title: "Unit2", level: "BEGINNER", unit: 2, order: 0 },
    });
    const lessonUnit1Second = await db.lesson.create({
      data: { classId: klass.id, createdById: userId, title: "Unit1-Second", level: "BEGINNER", unit: 1, order: 1 },
    });
    const lessonUnit1First = await db.lesson.create({
      data: {
        classId: klass.id,
        createdById: userId,
        title: "Unit1-First",
        level: "BEGINNER",
        unit: 1,
        order: 0,
        exercises: { connect: [{ id: ex.id }] },
      },
    });

    asUser(cookie);
    const res = await listGET(req(`http://localhost/api/lessons?classId=${klass.id}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.map((l: { id: string }) => l.id)).toEqual([
      lessonUnit1First.id,
      lessonUnit1Second.id,
      lessonUnit2.id,
    ]);
    expect(body[0].exercises).toEqual([{ id: ex.id, title: "ExA", type: "GRAMMAR", difficulty: "BEGINNER" }]);
    expect(body[0].exerciseCount).toBe(1);
    expect(body[1].exerciseCount).toBe(0);
  });

  it("400s when classId is missing", async () => {
    const { cookie } = await setupTeacherWithClass("lesson-list2@test.local");
    asUser(cookie);
    const res = await listGET(req("http://localhost/api/lessons"));
    expect(res.status).toBe(400);
  });

  it("404s when the teacher does not own the class", async () => {
    const owner = await setupTeacherWithClass("lesson-list3@test.local");
    const intruder = await signUp("lesson-list-intruder1@test.local", "TEACHER");
    asUser(intruder.cookie);
    const res = await listGET(req(`http://localhost/api/lessons?classId=${owner.klass.id}`));
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/lessons/[id] (integration)", () => {
  it("reorders (unit/order) and reassigns exercises (re-connect set)", async () => {
    const { cookie, userId, klass } = await setupTeacherWithClass("lesson-patch1@test.local");
    const ex1 = await createExercise(userId, "Ex1");
    const ex2 = await createExercise(userId, "Ex2");
    const lesson = await db.lesson.create({
      data: {
        classId: klass.id,
        createdById: userId,
        title: "L",
        level: "BEGINNER",
        unit: 1,
        order: 0,
        exercises: { connect: [{ id: ex1.id }] },
      },
    });

    asUser(cookie);
    const res = await PATCH(
      req(`http://localhost/api/lessons/${lesson.id}`, {
        method: "PATCH",
        body: JSON.stringify({ unit: 2, order: 5, exerciseIds: [ex2.id] }),
      }),
      { params: Promise.resolve({ id: lesson.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.unit).toBe(2);
    expect(body.order).toBe(5);
    expect(body.exercises.map((e: { id: string }) => e.id)).toEqual([ex2.id]);

    const row = await db.lesson.findUnique({ where: { id: lesson.id }, include: { exercises: true } });
    expect(row?.exercises.map((e) => e.id)).toEqual([ex2.id]);
  });

  it("rejects a foreign exerciseId with 400 and leaves the lesson's exercises untouched", async () => {
    const { cookie, userId, klass } = await setupTeacherWithClass("lesson-patch2@test.local");
    const other = await signUp("lesson-patch-other1@test.local", "TEACHER");
    const foreignEx = await createExercise(other.userId, "Foreign");
    const ownEx = await createExercise(userId, "Own");
    const lesson = await db.lesson.create({
      data: {
        classId: klass.id,
        createdById: userId,
        title: "L",
        level: "BEGINNER",
        unit: 1,
        order: 0,
        exercises: { connect: [{ id: ownEx.id }] },
      },
    });

    asUser(cookie);
    const res = await PATCH(
      req(`http://localhost/api/lessons/${lesson.id}`, {
        method: "PATCH",
        body: JSON.stringify({ exerciseIds: [foreignEx.id] }),
      }),
      { params: Promise.resolve({ id: lesson.id }) }
    );
    expect(res.status).toBe(400);

    const row = await db.lesson.findUnique({ where: { id: lesson.id }, include: { exercises: true } });
    expect(row?.exercises.map((e) => e.id)).toEqual([ownEx.id]);
  });

  it("non-owner PATCH returns 404 and leaves the lesson untouched", async () => {
    const owner = await setupTeacherWithClass("lesson-patch-owner1@test.local");
    const intruder = await signUp("lesson-patch-intruder1@test.local", "TEACHER");
    const lesson = await db.lesson.create({
      data: { classId: owner.klass.id, createdById: owner.userId, title: "Original", level: "BEGINNER", unit: 1, order: 0 },
    });

    asUser(intruder.cookie);
    const res = await PATCH(
      req(`http://localhost/api/lessons/${lesson.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: "Hijacked" }),
      }),
      { params: Promise.resolve({ id: lesson.id }) }
    );
    expect(res.status).toBe(404);

    const row = await db.lesson.findUnique({ where: { id: lesson.id } });
    expect(row?.title).toBe("Original");
  });

  it("accepts duplicate owned exerciseIds in PATCH and connects each distinct id once", async () => {
    const { cookie, userId, klass } = await setupTeacherWithClass("lesson-patch-dup1@test.local");
    const ex1 = await createExercise(userId, "Ex1");
    const lesson = await db.lesson.create({
      data: { classId: klass.id, createdById: userId, title: "L", level: "BEGINNER", unit: 1, order: 0 },
    });

    asUser(cookie);
    const res = await PATCH(
      req(`http://localhost/api/lessons/${lesson.id}`, {
        method: "PATCH",
        body: JSON.stringify({ exerciseIds: [ex1.id, ex1.id] }),
      }),
      { params: Promise.resolve({ id: lesson.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.exercises.map((e: { id: string }) => e.id)).toEqual([ex1.id]);

    const row = await db.lesson.findUnique({ where: { id: lesson.id }, include: { exercises: true } });
    expect(row?.exercises).toHaveLength(1);
    expect(row?.exercises[0].id).toBe(ex1.id);
  });

  it("400s on a classId:null (seeded curriculum) lesson, even when 'created by' the caller", async () => {
    const { cookie, userId } = await setupTeacherWithClass("lesson-patch-curric1@test.local");
    // classId: null mimics a seeded-curriculum row. tests/curriculum.test.ts
    // asserts an exact global count of classId:null lessons, and this DB is
    // shared across the whole `npm test` run (fileParallelism: false, one
    // sqlite file, no reset between files) — so this fixture is cleaned up
    // below rather than left to leak into that other file's assertions.
    const seeded = await db.lesson.create({
      data: { classId: null, createdById: userId, title: "Seeded", level: "BEGINNER", unit: 1, order: 0 },
    });

    try {
      asUser(cookie);
      const res = await PATCH(
        req(`http://localhost/api/lessons/${seeded.id}`, {
          method: "PATCH",
          body: JSON.stringify({ title: "Edited" }),
        }),
        { params: Promise.resolve({ id: seeded.id }) }
      );
      expect(res.status).toBe(400);

      const row = await db.lesson.findUnique({ where: { id: seeded.id } });
      expect(row?.title).toBe("Seeded");
    } finally {
      await db.lesson.delete({ where: { id: seeded.id } });
    }
  });
});

describe("DELETE /api/lessons/[id] (integration)", () => {
  it("deletes the lesson and sets its exercises' lessonId to null (exercises are NOT deleted)", async () => {
    const { cookie, userId, klass } = await setupTeacherWithClass("lesson-delete1@test.local");
    const ex = await createExercise(userId, "ExToOrphan");
    const lesson = await db.lesson.create({
      data: {
        classId: klass.id,
        createdById: userId,
        title: "L",
        level: "BEGINNER",
        unit: 1,
        order: 0,
        exercises: { connect: [{ id: ex.id }] },
      },
    });

    asUser(cookie);
    const res = await DELETE(req(`http://localhost/api/lessons/${lesson.id}`, { method: "DELETE" }), {
      params: Promise.resolve({ id: lesson.id }),
    });
    expect(res.status).toBe(200);

    expect(await db.lesson.findUnique({ where: { id: lesson.id } })).toBeNull();

    const exRow = await db.exercise.findUnique({ where: { id: ex.id } });
    expect(exRow).not.toBeNull();
    expect(exRow?.lessonId).toBeNull();
  });

  it("non-owner DELETE returns 404 and leaves the lesson untouched", async () => {
    const owner = await setupTeacherWithClass("lesson-delete-owner1@test.local");
    const intruder = await signUp("lesson-delete-intruder1@test.local", "TEACHER");
    const lesson = await db.lesson.create({
      data: { classId: owner.klass.id, createdById: owner.userId, title: "L", level: "BEGINNER", unit: 1, order: 0 },
    });

    asUser(intruder.cookie);
    const res = await DELETE(req(`http://localhost/api/lessons/${lesson.id}`, { method: "DELETE" }), {
      params: Promise.resolve({ id: lesson.id }),
    });
    expect(res.status).toBe(404);
    expect(await db.lesson.findUnique({ where: { id: lesson.id } })).not.toBeNull();
  });

  it("400s deleting a classId:null (seeded curriculum) lesson", async () => {
    const { cookie, userId } = await setupTeacherWithClass("lesson-delete-curric1@test.local");
    // See the PATCH equivalent above for why this fixture is cleaned up in a
    // `finally`: the DB is shared across the whole `npm test` run and
    // tests/curriculum.test.ts asserts an exact global count of classId:null
    // lessons.
    const seeded = await db.lesson.create({
      data: { classId: null, createdById: userId, title: "Seeded", level: "BEGINNER", unit: 1, order: 0 },
    });

    try {
      asUser(cookie);
      const res = await DELETE(req(`http://localhost/api/lessons/${seeded.id}`, { method: "DELETE" }), {
        params: Promise.resolve({ id: seeded.id }),
      });
      expect(res.status).toBe(400);
      expect(await db.lesson.findUnique({ where: { id: seeded.id } })).not.toBeNull();
    } finally {
      await db.lesson.delete({ where: { id: seeded.id } });
    }
  });
});
