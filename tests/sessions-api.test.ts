import { describe, it, expect, vi } from "vitest";

// Same rationale as tests/exercise-patch.test.ts / tests/lessons-api.test.ts:
// `requireTeacher`/`requireOwnedClass`-backed handlers all go through
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
import { POST as createSessionPOST, buildSessionCreate } from "@/app/api/sessions/route";
import { POST as pushPOST } from "@/app/api/sessions/[id]/push/route";
import { GET as sessionDetailGET, PATCH as sessionPATCH } from "@/app/api/sessions/[id]/route";
import { POST as joinPOST } from "@/app/api/sessions/[id]/join/route";
import { POST as messagePOST } from "@/app/api/sessions/[id]/messages/route";
import { GET as scoreboardGET } from "@/app/api/sessions/[id]/scoreboard/route";
import { GET as liveGET } from "@/app/api/sessions/live/route";

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

// ==================== Unit tests: buildSessionCreate (pure) ====================

describe("buildSessionCreate", () => {
  const now = new Date("2026-07-13T12:00:00Z");
  const validBody = { classId: "class1", title: "Live Class" };

  it("mode:'now' builds ACTIVE fields with startedAt=now and no scheduledAt", () => {
    const fields = buildSessionCreate({ ...validBody, mode: "now" }, now);
    expect(fields).toEqual({
      classId: "class1",
      title: "Live Class",
      status: "ACTIVE",
      startedAt: now,
      scheduledAt: null,
    });
  });

  it("defaults to mode:'now' (ACTIVE) when mode is omitted", () => {
    const fields = buildSessionCreate(validBody, now);
    expect(fields.status).toBe("ACTIVE");
    expect(fields.startedAt).toEqual(now);
    expect(fields.scheduledAt).toBeNull();
  });

  it("mode:'schedule' with a future ISO scheduledAt builds WAITING fields", () => {
    const fields = buildSessionCreate(
      { ...validBody, mode: "schedule", scheduledAt: "2026-07-13T13:00:00Z" },
      now
    );
    expect(fields.status).toBe("WAITING");
    expect(fields.startedAt).toBeNull();
    expect(fields.scheduledAt).toEqual(new Date("2026-07-13T13:00:00Z"));
  });

  it("mode:'schedule' with a missing scheduledAt throws 400", () => {
    expect(() => buildSessionCreate({ ...validBody, mode: "schedule" }, now)).toThrow(ApiError);
  });

  it("mode:'schedule' with a past scheduledAt throws 400", () => {
    expect(() =>
      buildSessionCreate({ ...validBody, mode: "schedule", scheduledAt: "2026-07-13T11:00:00Z" }, now)
    ).toThrow(ApiError);
  });

  it("mode:'schedule' with an invalid date string throws 400", () => {
    expect(() =>
      buildSessionCreate({ ...validBody, mode: "schedule", scheduledAt: "not-a-date" }, now)
    ).toThrow(ApiError);
  });

  it("rejects an invalid mode", () => {
    expect(() => buildSessionCreate({ ...validBody, mode: "later" }, now)).toThrow(ApiError);
  });

  it("rejects a missing/empty classId", () => {
    expect(() => buildSessionCreate({ title: "T" }, now)).toThrow(ApiError);
    expect(() => buildSessionCreate({ classId: "", title: "T" }, now)).toThrow(ApiError);
  });

  it.each(["", "   ", "a".repeat(101)])("rejects an invalid title %p", (bad) => {
    expect(() => buildSessionCreate({ classId: "class1", title: bad }, now)).toThrow(ApiError);
  });

  it("accepts a 1-char and a 100-char title", () => {
    expect(buildSessionCreate({ classId: "class1", title: "A" }, now).title).toBe("A");
    expect(buildSessionCreate({ classId: "class1", title: "A".repeat(100) }, now).title).toBe("A".repeat(100));
  });

  it("trims title", () => {
    expect(buildSessionCreate({ classId: "class1", title: "  Live  " }, now).title).toBe("Live");
  });

  it.each([null, "nope", 42, ["array"]])("rejects a non-object body %p", (bad) => {
    expect(() => buildSessionCreate(bad, now)).toThrow(ApiError);
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
      code: `SESS-${classCounter}-${Date.now()}`,
      teacherId: userId,
    },
  });
  return { cookie, userId, klass };
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

describe("POST /api/sessions (integration)", () => {
  it("mode:'now' creates an ACTIVE session with startedAt set, in one call, and writes the 'Session started' SYSTEM message", async () => {
    const { cookie, userId, klass } = await setupTeacherWithClass("sess-now1@test.local");
    asUser(cookie);

    const res = await createSessionPOST(
      req("http://localhost/api/sessions", {
        method: "POST",
        body: JSON.stringify({ classId: klass.id, title: "Go Live Now", mode: "now" }),
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.session.status).toBe("ACTIVE");
    expect(body.session.startedAt).not.toBeNull();
    expect(body.session.scheduledAt ?? null).toBeNull();

    const row = await db.liveSession.findUnique({ where: { id: body.session.id } });
    expect(row?.status).toBe("ACTIVE");
    expect(row?.startedAt).not.toBeNull();

    const messages = await db.sessionMessage.findMany({ where: { sessionId: body.session.id } });
    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe("SYSTEM");
    expect(messages[0].content).toBe("Session started");
    expect(messages[0].userId).toBe(userId);
  });

  it("default (no mode given) also creates an ACTIVE session", async () => {
    const { cookie, klass } = await setupTeacherWithClass("sess-default1@test.local");
    asUser(cookie);

    const res = await createSessionPOST(
      req("http://localhost/api/sessions", {
        method: "POST",
        body: JSON.stringify({ classId: klass.id, title: "No Mode Given" }),
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.session.status).toBe("ACTIVE");
    expect(body.session.startedAt).not.toBeNull();
  });

  it("mode:'schedule' with a future scheduledAt creates a WAITING session with scheduledAt set", async () => {
    const { cookie, klass } = await setupTeacherWithClass("sess-sched1@test.local");
    asUser(cookie);

    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const res = await createSessionPOST(
      req("http://localhost/api/sessions", {
        method: "POST",
        body: JSON.stringify({ classId: klass.id, title: "Scheduled", mode: "schedule", scheduledAt: future }),
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.session.status).toBe("WAITING");
    expect(body.session.startedAt).toBeNull();
    expect(new Date(body.session.scheduledAt).toISOString()).toBe(future);

    const messages = await db.sessionMessage.findMany({ where: { sessionId: body.session.id } });
    expect(messages).toHaveLength(0);
  });

  it("mode:'schedule' with a missing scheduledAt returns 400", async () => {
    const { cookie, klass } = await setupTeacherWithClass("sess-sched-missing1@test.local");
    asUser(cookie);

    const res = await createSessionPOST(
      req("http://localhost/api/sessions", {
        method: "POST",
        body: JSON.stringify({ classId: klass.id, title: "Scheduled", mode: "schedule" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("mode:'schedule' with a past scheduledAt returns 400", async () => {
    const { cookie, klass } = await setupTeacherWithClass("sess-sched-past1@test.local");
    asUser(cookie);

    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const res = await createSessionPOST(
      req("http://localhost/api/sessions", {
        method: "POST",
        body: JSON.stringify({ classId: klass.id, title: "Scheduled", mode: "schedule", scheduledAt: past }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("a non-owner teacher creating a session on someone else's class gets 404", async () => {
    const owner = await setupTeacherWithClass("sess-owner1@test.local");
    const intruder = await signUp("sess-intruder1@test.local", "TEACHER");
    asUser(intruder.cookie);

    const res = await createSessionPOST(
      req("http://localhost/api/sessions", {
        method: "POST",
        body: JSON.stringify({ classId: owner.klass.id, title: "Hijack", mode: "now" }),
      })
    );
    expect(res.status).toBe(404);
  });
});

describe("POST /api/sessions/[id]/push (integration)", () => {
  it("pushing a DRAFT exercise (even if owned) returns 404", async () => {
    const { cookie, userId, klass } = await setupTeacherWithClass("push-draft1@test.local");
    const draftEx = await createExercise(userId, "DRAFT");

    asUser(cookie);
    const sessionRes = await createSessionPOST(
      req("http://localhost/api/sessions", {
        method: "POST",
        body: JSON.stringify({ classId: klass.id, title: "Live", mode: "now" }),
      })
    );
    const session = (await sessionRes.json()).session;

    const res = await pushPOST(
      req(`http://localhost/api/sessions/${session.id}/push`, {
        method: "POST",
        body: JSON.stringify({ exerciseId: draftEx.id }),
      }),
      { params: Promise.resolve({ id: session.id }) }
    );
    expect(res.status).toBe(404);
  });

  it("pushing a PUBLISHED own exercise into an ACTIVE session returns 201/200 and records it", async () => {
    const { cookie, userId, klass } = await setupTeacherWithClass("push-pub1@test.local");
    const publishedEx = await createExercise(userId, "PUBLISHED");

    asUser(cookie);
    const sessionRes = await createSessionPOST(
      req("http://localhost/api/sessions", {
        method: "POST",
        body: JSON.stringify({ classId: klass.id, title: "Live", mode: "now" }),
      })
    );
    const session = (await sessionRes.json()).session;
    expect(session.status).toBe("ACTIVE");

    const res = await pushPOST(
      req(`http://localhost/api/sessions/${session.id}/push`, {
        method: "POST",
        body: JSON.stringify({ exerciseId: publishedEx.id }),
      }),
      { params: Promise.resolve({ id: session.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pushed).toBe(true);
    expect(body.exercise.id).toBe(publishedEx.id);

    const messages = await db.sessionMessage.findMany({
      where: { sessionId: session.id, type: "EXERCISE" },
    });
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe(publishedEx.id);
  });
});

// ==================== Task 4: detail GET roster/results/phase; lobby chat ====================

async function enroll(classId: string, studentId: string) {
  await db.classStudent.create({ data: { classId, studentId } });
}

describe("GET /api/sessions/[id] (integration) — roster/results/phase", () => {
  it("unions the class's 3 enrolled students with 1 joined into `roster`, and sets `phase`", async () => {
    const { cookie: teacherCookie, klass } = await setupTeacherWithClass("detail-roster1@test.local");
    const s1 = await signUp("detail-roster-s1@test.local");
    const s2 = await signUp("detail-roster-s2@test.local");
    const s3 = await signUp("detail-roster-s3@test.local");
    await enroll(klass.id, s1.userId);
    await enroll(klass.id, s2.userId);
    await enroll(klass.id, s3.userId);

    asUser(teacherCookie);
    const sessionRes = await createSessionPOST(
      req("http://localhost/api/sessions", {
        method: "POST",
        body: JSON.stringify({ classId: klass.id, title: "Live", mode: "now" }),
      })
    );
    const session = (await sessionRes.json()).session;

    // Only s2 actually joins the session.
    asUser(s2.cookie);
    const joinRes = await joinPOST(
      req(`http://localhost/api/sessions/${session.id}/join`, { method: "POST" }),
      { params: Promise.resolve({ id: session.id }) }
    );
    expect(joinRes.status).toBe(200);

    asUser(teacherCookie);
    const res = await sessionDetailGET(req(`http://localhost/api/sessions/${session.id}`), {
      params: Promise.resolve({ id: session.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.roster).toHaveLength(3);
    const joinedEntries = body.roster.filter((r: { joined: boolean }) => r.joined);
    expect(joinedEntries).toHaveLength(1);
    expect(joinedEntries[0].studentId).toBe(s2.userId);
    expect(body.phase).toBe("LIVE");
  });

  it("an ENDED session with 2 pushed exercises + results shapes `results` for anyone with access", async () => {
    const { cookie: teacherCookie, userId: teacherId, klass } = await setupTeacherWithClass(
      "detail-results1@test.local"
    );
    const student = await signUp("detail-results-s1@test.local");
    await enroll(klass.id, student.userId);

    const ex1 = await createExercise(teacherId);
    const ex2 = await createExercise(teacherId);

    asUser(teacherCookie);
    const sessionRes = await createSessionPOST(
      req("http://localhost/api/sessions", {
        method: "POST",
        body: JSON.stringify({ classId: klass.id, title: "Live", mode: "now" }),
      })
    );
    const session = (await sessionRes.json()).session;

    await pushPOST(
      req(`http://localhost/api/sessions/${session.id}/push`, {
        method: "POST",
        body: JSON.stringify({ exerciseId: ex1.id }),
      }),
      { params: Promise.resolve({ id: session.id }) }
    );
    await pushPOST(
      req(`http://localhost/api/sessions/${session.id}/push`, {
        method: "POST",
        body: JSON.stringify({ exerciseId: ex2.id }),
      }),
      { params: Promise.resolve({ id: session.id }) }
    );

    await db.exerciseResult.create({
      data: { exerciseId: ex1.id, studentId: student.userId, score: 80, sessionId: session.id },
    });
    await db.exerciseResult.create({
      data: { exerciseId: ex2.id, studentId: student.userId, score: 60, sessionId: session.id },
    });

    // End the session.
    const endRes = await sessionPATCH(
      req(`http://localhost/api/sessions/${session.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "end" }),
      }),
      { params: Promise.resolve({ id: session.id }) }
    );
    expect(endRes.status).toBe(200);

    // Student (not owner) can still see results, since the session is ENDED.
    asUser(student.cookie);
    const res = await sessionDetailGET(req(`http://localhost/api/sessions/${session.id}`), {
      params: Promise.resolve({ id: session.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.phase).toBe("ENDED");
    expect(body.results).toHaveLength(2);
    const shapedEx1 = body.results.find((r: { exerciseId: string }) => r.exerciseId === ex1.id);
    expect(shapedEx1.completedCount).toBe(1);
    expect(shapedEx1.averageScore).toBe(80);
    expect(shapedEx1.entries[0].studentId).toBe(student.userId);
  });

  it("includes `results` for the owning teacher on a live (non-ENDED) session, but omits/empties it for a non-owner student", async () => {
    const { cookie: teacherCookie, userId: teacherId, klass } = await setupTeacherWithClass(
      "detail-live-results1@test.local"
    );
    const student = await signUp("detail-live-results-s1@test.local");
    await enroll(klass.id, student.userId);
    const ex = await createExercise(teacherId);

    asUser(teacherCookie);
    const sessionRes = await createSessionPOST(
      req("http://localhost/api/sessions", {
        method: "POST",
        body: JSON.stringify({ classId: klass.id, title: "Live", mode: "now" }),
      })
    );
    const session = (await sessionRes.json()).session;

    await pushPOST(
      req(`http://localhost/api/sessions/${session.id}/push`, {
        method: "POST",
        body: JSON.stringify({ exerciseId: ex.id }),
      }),
      { params: Promise.resolve({ id: session.id }) }
    );
    await db.exerciseResult.create({
      data: { exerciseId: ex.id, studentId: student.userId, score: 70, sessionId: session.id },
    });

    // Teacher (owner) sees live results.
    asUser(teacherCookie);
    const teacherRes = await sessionDetailGET(req(`http://localhost/api/sessions/${session.id}`), {
      params: Promise.resolve({ id: session.id }),
    });
    const teacherBody = await teacherRes.json();
    expect(teacherBody.results).toHaveLength(1);
    expect(teacherBody.results[0].completedCount).toBe(1);

    // Student (non-owner) on the same still-ACTIVE session gets results omitted or empty.
    asUser(student.cookie);
    const studentRes = await sessionDetailGET(req(`http://localhost/api/sessions/${session.id}`), {
      params: Promise.resolve({ id: session.id }),
    });
    const studentBody = await studentRes.json();
    expect(studentBody.results === undefined || studentBody.results.length === 0).toBe(true);
  });

  it("dedupes re-pushed exercise in session results: same exercise pushed twice yields 1 result entry, not 2", async () => {
    const { cookie: teacherCookie, userId: teacherId, klass } = await setupTeacherWithClass(
      "detail-dedupe-repush@test.local"
    );
    const student = await signUp("detail-dedupe-repush-s1@test.local");
    await enroll(klass.id, student.userId);
    const ex = await createExercise(teacherId);

    asUser(teacherCookie);
    const sessionRes = await createSessionPOST(
      req("http://localhost/api/sessions", {
        method: "POST",
        body: JSON.stringify({ classId: klass.id, title: "Live", mode: "now" }),
      })
    );
    const session = (await sessionRes.json()).session;

    // Push the same exercise twice.
    await pushPOST(
      req(`http://localhost/api/sessions/${session.id}/push`, {
        method: "POST",
        body: JSON.stringify({ exerciseId: ex.id }),
      }),
      { params: Promise.resolve({ id: session.id }) }
    );
    await pushPOST(
      req(`http://localhost/api/sessions/${session.id}/push`, {
        method: "POST",
        body: JSON.stringify({ exerciseId: ex.id }),
      }),
      { params: Promise.resolve({ id: session.id }) }
    );

    // Record one result.
    await db.exerciseResult.create({
      data: { exerciseId: ex.id, studentId: student.userId, score: 75, sessionId: session.id },
    });

    // End the session.
    await sessionPATCH(
      req(`http://localhost/api/sessions/${session.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "end" }),
      }),
      { params: Promise.resolve({ id: session.id }) }
    );

    // Teacher GETs the ended session and checks results are deduped.
    const res = await sessionDetailGET(req(`http://localhost/api/sessions/${session.id}`), {
      params: Promise.resolve({ id: session.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.results).toHaveLength(1);
    expect(body.results[0].exerciseId).toBe(ex.id);
  });
});

describe("PATCH /api/sessions/[id] action:start (integration) — scheduled sessions", () => {
  it("starts a SCHEDULED (WAITING) session early, regardless of scheduledAt being in the future", async () => {
    const { cookie, klass } = await setupTeacherWithClass("start-early1@test.local");
    asUser(cookie);

    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const sessionRes = await createSessionPOST(
      req("http://localhost/api/sessions", {
        method: "POST",
        body: JSON.stringify({ classId: klass.id, title: "Scheduled", mode: "schedule", scheduledAt: future }),
      })
    );
    const session = (await sessionRes.json()).session;
    expect(session.status).toBe("WAITING");

    const res = await sessionPATCH(
      req(`http://localhost/api/sessions/${session.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "start" }),
      }),
      { params: Promise.resolve({ id: session.id }) }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.session.status).toBe("ACTIVE");
    expect(body.session.startedAt).not.toBeNull();
  });
});

describe("POST /api/sessions/[id]/messages (integration) — lobby chat gate", () => {
  it("allows posting a message while WAITING (pre-start lobby chat) -> 201", async () => {
    const { cookie: teacherCookie, klass } = await setupTeacherWithClass("msg-waiting1@test.local");
    const student = await signUp("msg-waiting-s1@test.local");
    await enroll(klass.id, student.userId);

    asUser(teacherCookie);
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const sessionRes = await createSessionPOST(
      req("http://localhost/api/sessions", {
        method: "POST",
        body: JSON.stringify({ classId: klass.id, title: "Scheduled", mode: "schedule", scheduledAt: future }),
      })
    );
    const session = (await sessionRes.json()).session;
    expect(session.status).toBe("WAITING");

    // Teacher can chat pre-start.
    const teacherMsgRes = await messagePOST(
      req(`http://localhost/api/sessions/${session.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: "Hello, we'll start soon" }),
      }),
      { params: Promise.resolve({ id: session.id }) }
    );
    expect(teacherMsgRes.status).toBe(201);

    // A student who joined the lobby can chat pre-start too.
    asUser(student.cookie);
    await joinPOST(req(`http://localhost/api/sessions/${session.id}/join`, { method: "POST" }), {
      params: Promise.resolve({ id: session.id }),
    });
    const studentMsgRes = await messagePOST(
      req(`http://localhost/api/sessions/${session.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: "Hi teacher!" }),
      }),
      { params: Promise.resolve({ id: session.id }) }
    );
    expect(studentMsgRes.status).toBe(201);
  });

  it("rejects posting a message once the session has ENDED -> 403", async () => {
    const { cookie, klass } = await setupTeacherWithClass("msg-ended1@test.local");
    asUser(cookie);

    const sessionRes = await createSessionPOST(
      req("http://localhost/api/sessions", {
        method: "POST",
        body: JSON.stringify({ classId: klass.id, title: "Live", mode: "now" }),
      })
    );
    const session = (await sessionRes.json()).session;

    await sessionPATCH(
      req(`http://localhost/api/sessions/${session.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "end" }),
      }),
      { params: Promise.resolve({ id: session.id }) }
    );

    const res = await messagePOST(
      req(`http://localhost/api/sessions/${session.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: "Can I still post?" }),
      }),
      { params: Promise.resolve({ id: session.id }) }
    );
    expect(res.status).toBe(403);
  });
});

// ==================== Task 6: live scoreboard endpoint ====================

describe("GET /api/sessions/[id]/scoreboard (integration)", () => {
  it("teacher-owner gets a scoreboard reflecting a student's in-session completion", async () => {
    const { cookie: teacherCookie, userId: teacherId, klass } = await setupTeacherWithClass(
      "scoreboard-owner1@test.local"
    );
    const student = await signUp("scoreboard-owner-s1@test.local");
    await enroll(klass.id, student.userId);
    const ex = await createExercise(teacherId);

    asUser(teacherCookie);
    const sessionRes = await createSessionPOST(
      req("http://localhost/api/sessions", {
        method: "POST",
        body: JSON.stringify({ classId: klass.id, title: "Live", mode: "now" }),
      })
    );
    const session = (await sessionRes.json()).session;

    await pushPOST(
      req(`http://localhost/api/sessions/${session.id}/push`, {
        method: "POST",
        body: JSON.stringify({ exerciseId: ex.id }),
      }),
      { params: Promise.resolve({ id: session.id }) }
    );

    // A result recorded WITH sessionId set, as the submit route would after
    // an in-session completion (Task 5).
    await db.exerciseResult.create({
      data: { exerciseId: ex.id, studentId: student.userId, score: 85, sessionId: session.id },
    });

    const res = await scoreboardGET(req(`http://localhost/api/sessions/${session.id}/scoreboard`), {
      params: Promise.resolve({ id: session.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(typeof body.serverTime).toBe("string");
    expect(body.scoreboard).toHaveLength(1);
    expect(body.scoreboard[0].exerciseId).toBe(ex.id);
    expect(body.scoreboard[0].completedCount).toBe(1);
    expect(body.scoreboard[0].averageScore).toBe(85);
    expect(body.scoreboard[0].entries[0].studentId).toBe(student.userId);
    expect(body.scoreboard[0].entries[0].name).toBe("Test User");
  });

  it("a non-owner teacher hitting another teacher's session scoreboard gets 404", async () => {
    const owner = await setupTeacherWithClass("scoreboard-nonowner1@test.local");
    asUser(owner.cookie);
    const sessionRes = await createSessionPOST(
      req("http://localhost/api/sessions", {
        method: "POST",
        body: JSON.stringify({ classId: owner.klass.id, title: "Live", mode: "now" }),
      })
    );
    const session = (await sessionRes.json()).session;

    const intruder = await signUp("scoreboard-intruder1@test.local", "TEACHER");
    asUser(intruder.cookie);
    const res = await scoreboardGET(req(`http://localhost/api/sessions/${session.id}/scoreboard`), {
      params: Promise.resolve({ id: session.id }),
    });
    expect(res.status).toBe(404);
  });

  it("a student hitting the scoreboard endpoint gets 403 (requireTeacher)", async () => {
    const { cookie: teacherCookie, klass } = await setupTeacherWithClass("scoreboard-student1@test.local");
    const student = await signUp("scoreboard-student-s1@test.local");
    await enroll(klass.id, student.userId);

    asUser(teacherCookie);
    const sessionRes = await createSessionPOST(
      req("http://localhost/api/sessions", {
        method: "POST",
        body: JSON.stringify({ classId: klass.id, title: "Live", mode: "now" }),
      })
    );
    const session = (await sessionRes.json()).session;

    asUser(student.cookie);
    const res = await scoreboardGET(req(`http://localhost/api/sessions/${session.id}/scoreboard`), {
      params: Promise.resolve({ id: session.id }),
    });
    expect(res.status).toBe(403);
  });

  it("dedupes a re-pushed exercise into a single scoreboard entry", async () => {
    const { cookie: teacherCookie, userId: teacherId, klass } = await setupTeacherWithClass(
      "scoreboard-dedupe1@test.local"
    );
    const student = await signUp("scoreboard-dedupe-s1@test.local");
    await enroll(klass.id, student.userId);
    const ex = await createExercise(teacherId);

    asUser(teacherCookie);
    const sessionRes = await createSessionPOST(
      req("http://localhost/api/sessions", {
        method: "POST",
        body: JSON.stringify({ classId: klass.id, title: "Live", mode: "now" }),
      })
    );
    const session = (await sessionRes.json()).session;

    // Push the same exercise twice.
    await pushPOST(
      req(`http://localhost/api/sessions/${session.id}/push`, {
        method: "POST",
        body: JSON.stringify({ exerciseId: ex.id }),
      }),
      { params: Promise.resolve({ id: session.id }) }
    );
    await pushPOST(
      req(`http://localhost/api/sessions/${session.id}/push`, {
        method: "POST",
        body: JSON.stringify({ exerciseId: ex.id }),
      }),
      { params: Promise.resolve({ id: session.id }) }
    );

    await db.exerciseResult.create({
      data: { exerciseId: ex.id, studentId: student.userId, score: 50, sessionId: session.id },
    });

    const res = await scoreboardGET(req(`http://localhost/api/sessions/${session.id}/scoreboard`), {
      params: Promise.resolve({ id: session.id }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.scoreboard).toHaveLength(1);
    expect(body.scoreboard[0].exerciseId).toBe(ex.id);
  });
});

// ==================== Task 7: student live-discovery endpoint ====================

describe("GET /api/sessions/live (integration)", () => {
  it("returns the single ACTIVE session in the student's enrolled class as {id,title,className}", async () => {
    const { cookie: teacherCookie, klass } = await setupTeacherWithClass("live-hit1@test.local");
    const student = await signUp("live-hit-s1@test.local");
    await enroll(klass.id, student.userId);

    asUser(teacherCookie);
    const sessionRes = await createSessionPOST(
      req("http://localhost/api/sessions", {
        method: "POST",
        body: JSON.stringify({ classId: klass.id, title: "Live Now", mode: "now" }),
      })
    );
    const session = (await sessionRes.json()).session;
    expect(session.status).toBe("ACTIVE");

    asUser(student.cookie);
    const res = await liveGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.live).toEqual({
      id: session.id,
      title: "Live Now",
      className: "Test Class",
    });
  });

  it("returns null when the student's enrolled class has only a WAITING (scheduled) session, not ACTIVE", async () => {
    const { cookie: teacherCookie, klass } = await setupTeacherWithClass("live-null1@test.local");
    const student = await signUp("live-null-s1@test.local");
    await enroll(klass.id, student.userId);

    asUser(teacherCookie);
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const sessionRes = await createSessionPOST(
      req("http://localhost/api/sessions", {
        method: "POST",
        body: JSON.stringify({ classId: klass.id, title: "Later", mode: "schedule", scheduledAt: future }),
      })
    );
    expect((await sessionRes.json()).session.status).toBe("WAITING");

    asUser(student.cookie);
    const res = await liveGET();
    expect(res.status).toBe(200);
    expect((await res.json()).live).toBeNull();
  });

  it("does NOT leak an ACTIVE session from a class the student is not enrolled in", async () => {
    // classA has a live session; the student is enrolled only in classB.
    const { cookie: teacherACookie, klass: classA } = await setupTeacherWithClass("live-leak-a1@test.local");
    const { klass: classB } = await setupTeacherWithClass("live-leak-b1@test.local");
    const student = await signUp("live-leak-s1@test.local");
    await enroll(classB.id, student.userId);

    asUser(teacherACookie);
    const sessionRes = await createSessionPOST(
      req("http://localhost/api/sessions", {
        method: "POST",
        body: JSON.stringify({ classId: classA.id, title: "Secret Live", mode: "now" }),
      })
    );
    expect((await sessionRes.json()).session.status).toBe("ACTIVE");

    asUser(student.cookie);
    const res = await liveGET();
    expect(res.status).toBe(200);
    expect((await res.json()).live).toBeNull();
  });

  it("picks the MOST-RECENT active session when the student is live in two enrolled classes", async () => {
    const teacherA = await setupTeacherWithClass("live-recent-a1@test.local");
    const teacherB = await setupTeacherWithClass("live-recent-b1@test.local");
    const student = await signUp("live-recent-s1@test.local");
    await enroll(teacherA.klass.id, student.userId);
    await enroll(teacherB.klass.id, student.userId);

    // Go live on classA first (older).
    asUser(teacherA.cookie);
    await createSessionPOST(
      req("http://localhost/api/sessions", {
        method: "POST",
        body: JSON.stringify({ classId: teacherA.klass.id, title: "Older Live", mode: "now" }),
      })
    );

    // Then go live on classB (newer) as its owning teacher.
    asUser(teacherB.cookie);
    const newer = await createSessionPOST(
      req("http://localhost/api/sessions", {
        method: "POST",
        body: JSON.stringify({ classId: teacherB.klass.id, title: "Newer Live", mode: "now" }),
      })
    );
    const newerSession = (await newer.json()).session;

    asUser(student.cookie);
    const res = await liveGET();
    const body = await res.json();
    expect(body.live.id).toBe(newerSession.id);
    expect(body.live.title).toBe("Newer Live");
  });

  it("rejects a teacher with 403 (students only)", async () => {
    const { cookie: teacherCookie } = await setupTeacherWithClass("live-teacher1@test.local");
    asUser(teacherCookie);
    const res = await liveGET();
    expect(res.status).toBe(403);
  });
});
