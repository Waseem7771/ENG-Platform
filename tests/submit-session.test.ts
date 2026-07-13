import { describe, it, expect, vi } from "vitest";

// Same rationale as tests/sessions-api.test.ts / tests/exercise-patch.test.ts:
// `requireStudent` (via guard.ts) calls next/headers' `headers()`, which
// throws outside a real Next.js request scope. Mock it via `vi.hoisted` so
// the *actual exported* route handler can run end-to-end against the real
// test DB with a real better-auth session cookie.
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
import { POST as submitPOST, resolveSubmitSessionId } from "@/app/api/exercises/[id]/submit/route";

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
async function setupClassWithTeacherAndStudent(prefix: string) {
  const teacher = await signUp(`${prefix}-teacher@test.local`, "TEACHER");
  const student = await signUp(`${prefix}-student@test.local`);
  classCounter += 1;
  const klass = await db.class.create({
    data: {
      name: "Test Class",
      level: "BEGINNER",
      code: `SUB-${classCounter}-${Date.now()}`,
      teacherId: teacher.userId,
    },
  });
  await db.classStudent.create({ data: { classId: klass.id, studentId: student.userId } });
  return { teacher, student, klass };
}

async function createExercise(ownerId: string, status: "DRAFT" | "PUBLISHED" = "PUBLISHED") {
  return db.exercise.create({
    data: {
      title: "Ex",
      type: "GRAMMAR",
      difficulty: "BEGINNER",
      data: JSON.stringify(GRAMMAR_DATA),
      points: 10,
      status,
      createdById: ownerId,
    },
  });
}

async function createSession(teacherId: string, classId: string, status: "WAITING" | "ACTIVE" | "ENDED") {
  return db.liveSession.create({
    data: {
      classId,
      teacherId,
      title: "Live",
      status,
      startedAt: status === "WAITING" ? null : new Date(),
      endedAt: status === "ENDED" ? new Date() : null,
    },
  });
}

async function pushExercise(sessionId: string, teacherId: string, exerciseId: string) {
  return db.sessionMessage.create({
    data: { sessionId, userId: teacherId, content: exerciseId, type: "EXERCISE" },
  });
}

async function joinSession(sessionId: string, studentId: string) {
  return db.sessionStudent.create({ data: { sessionId, studentId } });
}

// ==================== Unit/db tests: resolveSubmitSessionId ====================

describe("resolveSubmitSessionId (db-backed)", () => {
  it("returns the sessionId when ACTIVE + joined + pushed all hold", async () => {
    const { teacher, student, klass } = await setupClassWithTeacherAndStudent("resolve-valid");
    const exercise = await createExercise(teacher.userId);
    const session = await createSession(teacher.userId, klass.id, "ACTIVE");
    await pushExercise(session.id, teacher.userId, exercise.id);
    await joinSession(session.id, student.userId);

    const result = await resolveSubmitSessionId(session.id, exercise.id, student.userId);
    expect(result).toBe(session.id);
  });

  it("returns null when the exercise was NOT pushed into the session", async () => {
    const { teacher, student, klass } = await setupClassWithTeacherAndStudent("resolve-notpushed");
    const exercise = await createExercise(teacher.userId);
    const session = await createSession(teacher.userId, klass.id, "ACTIVE");
    // No pushExercise call — the exercise was never pushed.
    await joinSession(session.id, student.userId);

    const result = await resolveSubmitSessionId(session.id, exercise.id, student.userId);
    expect(result).toBeNull();
  });

  it("returns null when the student never joined the session", async () => {
    const { teacher, student, klass } = await setupClassWithTeacherAndStudent("resolve-notjoined");
    const exercise = await createExercise(teacher.userId);
    const session = await createSession(teacher.userId, klass.id, "ACTIVE");
    await pushExercise(session.id, teacher.userId, exercise.id);
    // No joinSession call — student is not a SessionStudent for this session.

    const result = await resolveSubmitSessionId(session.id, exercise.id, student.userId);
    expect(result).toBeNull();
  });

  it("returns null when the session is WAITING (not yet ACTIVE)", async () => {
    const { teacher, student, klass } = await setupClassWithTeacherAndStudent("resolve-waiting");
    const exercise = await createExercise(teacher.userId);
    const session = await createSession(teacher.userId, klass.id, "WAITING");
    await pushExercise(session.id, teacher.userId, exercise.id);
    await joinSession(session.id, student.userId);

    const result = await resolveSubmitSessionId(session.id, exercise.id, student.userId);
    expect(result).toBeNull();
  });

  it("returns null when the session has ENDED", async () => {
    const { teacher, student, klass } = await setupClassWithTeacherAndStudent("resolve-ended");
    const exercise = await createExercise(teacher.userId);
    const session = await createSession(teacher.userId, klass.id, "ENDED");
    await pushExercise(session.id, teacher.userId, exercise.id);
    await joinSession(session.id, student.userId);

    const result = await resolveSubmitSessionId(session.id, exercise.id, student.userId);
    expect(result).toBeNull();
  });

  it("returns null for a nonexistent sessionId", async () => {
    const { student } = await setupClassWithTeacherAndStudent("resolve-nonexistent");
    const result = await resolveSubmitSessionId("does-not-exist", "some-exercise", student.userId);
    expect(result).toBeNull();
  });

  it("returns null when sessionId is missing, empty, or a non-string forgery attempt", async () => {
    expect(await resolveSubmitSessionId(undefined, "ex1", "student1")).toBeNull();
    expect(await resolveSubmitSessionId("", "ex1", "student1")).toBeNull();
    expect(await resolveSubmitSessionId(123, "ex1", "student1")).toBeNull();
    expect(await resolveSubmitSessionId({ id: "hack" }, "ex1", "student1")).toBeNull();
  });

  it("a student who joined a DIFFERENT active session with the exercise pushed there still gets null (can't cross-attribute)", async () => {
    const { teacher, student, klass } = await setupClassWithTeacherAndStudent("resolve-cross");
    const exercise = await createExercise(teacher.userId);
    const realSession = await createSession(teacher.userId, klass.id, "ACTIVE");
    const otherSession = await createSession(teacher.userId, klass.id, "ACTIVE");
    await pushExercise(realSession.id, teacher.userId, exercise.id);
    await joinSession(otherSession.id, student.userId); // joined the wrong session

    const result = await resolveSubmitSessionId(realSession.id, exercise.id, student.userId);
    expect(result).toBeNull();
  });
});

// ==================== Integration touch: real submit route + DB ====================

describe("POST /api/exercises/[id]/submit (integration) — sessionId attribution", () => {
  it("submitting with a valid pushed sessionId stores it on the ExerciseResult", async () => {
    const { teacher, student, klass } = await setupClassWithTeacherAndStudent("submit-valid");
    const exercise = await createExercise(teacher.userId);
    const session = await createSession(teacher.userId, klass.id, "ACTIVE");
    await pushExercise(session.id, teacher.userId, exercise.id);
    await joinSession(session.id, student.userId);

    asUser(student.cookie);
    const res = await submitPOST(
      req(`http://localhost/api/exercises/${exercise.id}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers: { g1: "goes" }, sessionId: session.id }),
      }),
      { params: Promise.resolve({ id: exercise.id }) }
    );
    expect(res.status).toBe(200);

    const result = await db.exerciseResult.findFirst({
      where: { exerciseId: exercise.id, studentId: student.userId },
    });
    expect(result).not.toBeNull();
    expect(result!.sessionId).toBe(session.id);
  });

  it("submitting with a sessionId that fails validation (exercise not pushed there) still creates the result, with sessionId null", async () => {
    const { teacher, student, klass } = await setupClassWithTeacherAndStudent("submit-forge");
    const exercise = await createExercise(teacher.userId);
    const session = await createSession(teacher.userId, klass.id, "ACTIVE");
    // Exercise never pushed into this session — a forged/stale sessionId.
    await joinSession(session.id, student.userId);

    asUser(student.cookie);
    const res = await submitPOST(
      req(`http://localhost/api/exercises/${exercise.id}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers: { g1: "goes" }, sessionId: session.id }),
      }),
      { params: Promise.resolve({ id: exercise.id }) }
    );
    // Never a 400 for a bad sessionId — the completion still counts as normal practice.
    expect(res.status).toBe(200);

    const result = await db.exerciseResult.findFirst({
      where: { exerciseId: exercise.id, studentId: student.userId },
    });
    expect(result).not.toBeNull();
    expect(result!.sessionId).toBeNull();
  });

  it("submitting with no sessionId at all leaves it null (normal practice, unchanged)", async () => {
    const { teacher, student, klass } = await setupClassWithTeacherAndStudent("submit-none");
    const exercise = await createExercise(teacher.userId);
    void klass;

    asUser(student.cookie);
    const res = await submitPOST(
      req(`http://localhost/api/exercises/${exercise.id}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers: { g1: "goes" } }),
      }),
      { params: Promise.resolve({ id: exercise.id }) }
    );
    expect(res.status).toBe(200);

    const result = await db.exerciseResult.findFirst({
      where: { exerciseId: exercise.id, studentId: student.userId },
    });
    expect(result).not.toBeNull();
    expect(result!.sessionId).toBeNull();
  });
});
