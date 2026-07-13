import { describe, it, expect, vi } from "vitest";

// Same rationale as tests/exercise-patch.test.ts (Task 5): the route handlers
// under test call requireStudent()/requireTeacher() -> getSessionUser() ->
// headers() from next/headers, which throws outside a real Next.js request
// scope. Mock it via vi.hoisted (avoids the TDZ footgun of a hoisted factory
// closing over a `let`) so the *actual exported* route handlers can run
// end-to-end against the real test DB with a real better-auth session cookie.
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
import { POST as submitPOST } from "@/app/api/exercises/[id]/submit/route";
import { POST as chatPOST } from "@/app/api/ai/chat/route";
import { POST as storyPOST } from "@/app/api/ai/story/route";
import { POST as pushPOST } from "@/app/api/sessions/[id]/push/route";

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

const CONVERSATION_DATA = {
  scenario: {
    key: "cafe",
    title: "At the Cafe",
    emoji: "☕",
    description: "Order a coffee",
    aiRole: "barista",
    userRole: "customer",
    opening: "Hi, what can I get you?",
    objectives: ["order a drink"],
  },
};

const STORY_DATA = {
  story: { title: "A Walk", genre: "adventure", opening: "It was a sunny day.", minTurns: 2 },
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

describe("DRAFT exercises 404 on the other student-reachable, id-addressable paths (Phase 3 fix wave A)", () => {
  it("POST /api/exercises/[id]/submit 404s for a DRAFT exercise id and records no ExerciseResult", async () => {
    const teacher = await signUp("draft-submit-teacher1@test.local", "TEACHER");
    const student = await signUp("draft-submit-student1@test.local");
    const draft = await db.exercise.create({
      data: {
        title: "Draft Grammar",
        type: "GRAMMAR",
        difficulty: "BEGINNER",
        data: JSON.stringify(GRAMMAR_DATA),
        points: 10,
        status: "DRAFT",
        createdById: teacher.userId,
      },
    });

    asUser(student.cookie);
    const res = await submitPOST(
      req(`http://localhost/api/exercises/${draft.id}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers: { g1: "goes" } }),
      }),
      { params: Promise.resolve({ id: draft.id }) }
    );
    expect(res.status).toBe(404);

    const results = await db.exerciseResult.findMany({ where: { exerciseId: draft.id } });
    expect(results).toHaveLength(0);
  });

  it("POST /api/ai/chat 404s for a DRAFT conversation exercise id (no AI call, no reply leaked)", async () => {
    const teacher = await signUp("draft-chat-teacher1@test.local", "TEACHER");
    const student = await signUp("draft-chat-student1@test.local");
    const draft = await db.exercise.create({
      data: {
        title: "Draft Conversation",
        type: "CONVERSATION",
        difficulty: "BEGINNER",
        data: JSON.stringify(CONVERSATION_DATA),
        points: 10,
        status: "DRAFT",
        createdById: teacher.userId,
      },
    });

    asUser(student.cookie);
    const res = await chatPOST(
      req("http://localhost/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ exerciseId: draft.id, messages: [{ role: "user", content: "Hi" }] }),
      })
    );
    expect(res.status).toBe(404);
  });

  it("POST /api/ai/story 404s for a DRAFT story exercise id (no AI call, no reply leaked)", async () => {
    const teacher = await signUp("draft-story-teacher1@test.local", "TEACHER");
    const student = await signUp("draft-story-student1@test.local");
    const draft = await db.exercise.create({
      data: {
        title: "Draft Story",
        type: "STORY",
        difficulty: "BEGINNER",
        data: JSON.stringify(STORY_DATA),
        points: 10,
        status: "DRAFT",
        createdById: teacher.userId,
      },
    });

    asUser(student.cookie);
    const res = await storyPOST(
      req("http://localhost/api/ai/story", {
        method: "POST",
        body: JSON.stringify({ exerciseId: draft.id, turns: [{ role: "user", content: "I walk forward." }] }),
      })
    );
    expect(res.status).toBe(404);
  });
});

let pushClassCounter = 0;
async function setupTeacherWithClass(email: string) {
  const { cookie, userId } = await signUp(email, "TEACHER");
  pushClassCounter += 1;
  const klass = await db.class.create({
    data: {
      name: "Test Class",
      level: "BEGINNER",
      code: `PUSH-${pushClassCounter}-${Date.now()}`,
      teacherId: userId,
    },
  });
  return { cookie, userId, klass };
}

describe("POST /api/sessions/[id]/push scopes to the acting teacher's own exercises (Phase 3 fix wave A)", () => {
  it("404s when pushing another teacher's exercise, and creates no SessionMessage (existence oracle closed)", async () => {
    const teacherA = await setupTeacherWithClass("push-teachera1@test.local");
    const teacherB = await signUp("push-teacherb1@test.local", "TEACHER");
    const foreignExercise = await db.exercise.create({
      data: {
        title: "Foreign Exercise",
        type: "GRAMMAR",
        difficulty: "BEGINNER",
        data: JSON.stringify(GRAMMAR_DATA),
        points: 10,
        status: "PUBLISHED",
        createdById: teacherB.userId,
      },
    });
    const session = await db.liveSession.create({
      data: {
        classId: teacherA.klass.id,
        teacherId: teacherA.userId,
        title: "Live Class",
        status: "ACTIVE",
      },
    });

    asUser(teacherA.cookie);
    const res = await pushPOST(
      req(`http://localhost/api/sessions/${session.id}/push`, {
        method: "POST",
        body: JSON.stringify({ exerciseId: foreignExercise.id }),
      }),
      { params: Promise.resolve({ id: session.id }) }
    );
    expect(res.status).toBe(404);

    const messages = await db.sessionMessage.findMany({ where: { sessionId: session.id } });
    expect(messages).toHaveLength(0);
  });

  it("404s when pushing another teacher's DRAFT exercise (also closes the draft-leak path)", async () => {
    const teacherA = await setupTeacherWithClass("push-teachera-draft1@test.local");
    const teacherB = await signUp("push-teacherb-draft1@test.local", "TEACHER");
    const foreignDraft = await db.exercise.create({
      data: {
        title: "Foreign Draft",
        type: "GRAMMAR",
        difficulty: "BEGINNER",
        data: JSON.stringify(GRAMMAR_DATA),
        points: 10,
        status: "DRAFT",
        createdById: teacherB.userId,
      },
    });
    const session = await db.liveSession.create({
      data: {
        classId: teacherA.klass.id,
        teacherId: teacherA.userId,
        title: "Live Class",
        status: "ACTIVE",
      },
    });

    asUser(teacherA.cookie);
    const res = await pushPOST(
      req(`http://localhost/api/sessions/${session.id}/push`, {
        method: "POST",
        body: JSON.stringify({ exerciseId: foreignDraft.id }),
      }),
      { params: Promise.resolve({ id: session.id }) }
    );
    expect(res.status).toBe(404);
  });

  it("still allows a teacher to push their own PUBLISHED exercise (200, unchanged behavior)", async () => {
    const teacherA = await setupTeacherWithClass("push-teachera2@test.local");
    const ownExercise = await db.exercise.create({
      data: {
        title: "Own Exercise",
        type: "GRAMMAR",
        difficulty: "BEGINNER",
        data: JSON.stringify(GRAMMAR_DATA),
        points: 10,
        status: "PUBLISHED",
        createdById: teacherA.userId,
      },
    });
    const session = await db.liveSession.create({
      data: {
        classId: teacherA.klass.id,
        teacherId: teacherA.userId,
        title: "Live Class",
        status: "ACTIVE",
      },
    });

    asUser(teacherA.cookie);
    const res = await pushPOST(
      req(`http://localhost/api/sessions/${session.id}/push`, {
        method: "POST",
        body: JSON.stringify({ exerciseId: ownExercise.id }),
      }),
      { params: Promise.resolve({ id: session.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pushed).toBe(true);
    expect(body.exercise.id).toBe(ownExercise.id);
  });
});
