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
