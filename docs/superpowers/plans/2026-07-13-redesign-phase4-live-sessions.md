# SpeakPath Redesign — Phase 4: Live Sessions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make live sessions coherent — one "Go live" action (with optional scheduling), a real lobby with pre-start chat, pushed exercises that render IN the room (no ejection), completions that flow to a live teacher scoreboard and a post-session recap for both roles, and a cross-page "class is live" banner.

**Architecture:** Add `ExerciseResult.sessionId` + `LiveSession.scheduledAt` (the only schema gaps). Keep the existing HTTP-polling/cursor real-time model (2.5s, `?after=` cursor) — no SSE. The session-detail GET already returns messages + participants + `pushedExercise`; extend its shaping to include the FULL class roster (enrolled ∪ joined) and, for ENDED/teacher, a results breakdown. The centerpiece is an embedded, session-aware exercise player: reuse the 8 self-contained per-type players (uniform `{exercise,data,onSubmit,submitting,registerForceSubmit}` props) inside a split pane, with a submit that carries `sessionId` (server-validated against an actual push). Discovery is a lightweight `/api/sessions/live` endpoint polled from the student dashboard layout with refetch-on-focus.

**Tech Stack:** Next.js 16.2.1 (modified), React 19, Tailwind v4 tokens (Phases 1-3), better-auth 1.5.6, Prisma 7/SQLite, vitest (320 tests green at start).

**Spec:** `docs/superpowers/specs/2026-07-11-speakpath-redesign-design.md` §7 (+§8). Phases 1-3 complete on `redesign/v2` at `5aa9754`.

## Global Constraints

- **Next 16 (modified):** `cookies()`/`headers()`/`params`/`searchParams` async — always `await`; route `context.params` is a Promise; client components read params via `useParams()`/`useSearchParams()` under `<Suspense>` (copy `src/app/(dashboard)/student/onboarding/page.tsx`). Middleware is `src/proxy.ts` (`export const config`) — never create `middleware.ts`.
- **Design system (Phases 1-3, mandatory):** tokens only — `bg-card border-2 border-border rounded-card shadow-sticker` cards, `Button` variants `brand|sun|ghost|outline|destructive` from `@/components/ui/button`, `Badge` variants. Lint bans `text-white/`, raw hex, physical-direction utilities (`pl-/pr-/ml-/mr-/ml-auto/border-l/border-r/text-left/text-right/left-N/right-N`) — use logical (`ps-/pe-/ms-/me-/border-s/border-e/text-start/text-end/start-/end-`). `Button ... render={<Link/>}` compositions include `nativeButton={false}` and `role="link"`.
- **i18n (mandatory for every new/rebuilt session UI):** all chrome via `useT()` from `@/components/providers/locale-provider`, keys in BOTH `messages/en.json` + `messages/ar.json` (parity test `src/lib/i18n.test.ts` fails otherwise; Arabic must be real Arabic). English exercise CONTENT stays English inside `dir="ltr"` islands (the players already do this). Session status keys `session.waiting/active/ended` already exist.
- **Security invariants (carry from Phases 1-3):** `role`/`level` stay `input:false`. **DRAFT exercises are unreachable by students on every path** (Phase 3 fix wave A) — a pushed exercise MUST be PUBLISHED (Task 3 enforces at push time). The submit route already 404s a DRAFT for students; do not weaken it. Ownership/access: a teacher acts only on their own sessions; a student acts only on sessions of a class they're enrolled in — enforce server-side, never trust client-supplied session/student/exercise ids.
- **Real-time model:** HTTP polling, `POLL_MS = 2500`, cursor = the detail GET's `serverTime` (newest returned message `createdAt`), client echoes it as `?after=`, server uses `gte` + client de-dupes by id. Keep this; do NOT introduce SSE/WebSocket. List/banner polls may use a longer interval (see tasks).
- **Data-fetch conventions:** client `useApi(() => api<T>("/path"), [deps])` from `@/hooks/use-api` + `@/lib/api`; server routes guard with `require*()` from `@/lib/guard`, reply via `errorResponse(err)` + `{ error }` JSON. `assertOwned`/`requireOwned*` helpers exist (`src/lib/guard.ts`).
- Work on branch `redesign/v2`. Commit after every task with the given message + trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`. Per-task done = its tests pass, `npm test` fully green, `npm run build` + `npx tsc --noEmit` succeed, `npm run lint` no new errors.
- **Brief-file hazard (learned in Phase 3):** `.superpowers/sdd/task-N-brief.md` collides across phases — the controller regenerates each brief from THIS plan before dispatch.

## File Structure (created/modified this phase)

```text
prisma/schema.prisma                                   # ExerciseResult.sessionId + LiveSession.scheduledAt
src/lib/session.ts + session.test.ts                   # pure shaping: buildRoster, buildScoreboard, sessionPhase (new)
src/app/api/sessions/route.ts                          # POST: goLive|scheduledAt (single go-live)
src/app/api/sessions/[id]/route.ts                     # GET: full roster + results breakdown; PATCH start for scheduled
src/app/api/sessions/[id]/messages/route.ts            # allow chat in WAITING (pre-start), still block ENDED
src/app/api/sessions/[id]/push/route.ts                # require PUBLISHED exercise
src/app/api/exercises/[id]/submit/route.ts             # optional sessionId, server-validated against a real push
src/app/api/sessions/[id]/scoreboard/route.ts          # GET teacher live scoreboard (new)
src/app/api/sessions/live/route.ts                     # GET student "any class live?" (new, cheap)
src/components/exercise/embedded-exercise.tsx          # session-aware in-room player wrapper (new)
src/app/(dashboard)/student/sessions/[id]/session-room.tsx   # lobby + split-pane in-room exercise + recap (rewrite)
src/app/(dashboard)/teacher/sessions/[id]/page.tsx     # single go-live, lobby, live scoreboard panel, recap
src/components/teacher/sessions/start-session-dialog.tsx     # Go live now | Schedule
src/components/teacher/sessions/scoreboard.tsx         # live scoreboard component (new)
src/components/shared/session-recap.tsx                # shared recap (both roles) (new)
src/components/shared/live-banner.tsx                  # cross-page "class is live" banner (new)
src/hooks/use-poll.ts + use-poll.test.ts               # small polling+refocus hook for the banner (new)
src/app/(dashboard)/student/layout.tsx                 # mount <LiveBanner/>
messages/en.json + messages/ar.json                    # session.* lobby/scoreboard/recap/banner keys
tests/sessions-api.test.ts, tests/submit-session.test.ts   # (new)
```

Phasing: Tasks 1-8 = data/API (each TDD + reviewable); 9-14 = UI; 15 = verify.

---

### Task 1: Schema — `ExerciseResult.sessionId` + `LiveSession.scheduledAt`

**Files:** Modify `prisma/schema.prisma` (ExerciseResult ~203-214, LiveSession ~123-137); migration via CLI.

**Interfaces:**
- Produces: `ExerciseResult.sessionId String?` (+ relation to LiveSession, `onDelete: SetNull` — a result outlives its session) and `LiveSession.scheduledAt DateTime?`. Existing rows unaffected (both nullable, no default change).

- [ ] **Step 1: Edit models.** In `ExerciseResult` add after `answers`:

```prisma
  sessionId   String?
```

and add to its relations block:

```prisma
  session  LiveSession? @relation(fields: [sessionId], references: [id], onDelete: SetNull)
```

In `LiveSession` add after `endedAt`:

```prisma
  scheduledAt DateTime?
```

and add the back-relation to LiveSession's relations block:

```prisma
  results  ExerciseResult[]
```

- [ ] **Step 2: Migrate** — `npx prisma migrate dev --name session-results-and-scheduling`. Expected: new migration; existing rows backfill NULL. If drift is reported, STOP and report (do not reset).
- [ ] **Step 3: Verify** — `npx tsc --noEmit && npm test` (320) + `npm run build`. Green (nothing reads the new fields yet).
- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(sessions): ExerciseResult.sessionId + LiveSession.scheduledAt"
```

---

### Task 2: Session shaping lib — `sessionPhase`, `buildRoster`, `buildScoreboard` — TDD

**Files:** Create `src/lib/session.ts`, `src/lib/session.test.ts`.

**Interfaces:**
- Produces (exact — later tasks import these):

```ts
export type SessionPhase = "SCHEDULED" | "LOBBY" | "LIVE" | "ENDED";
// LOBBY = WAITING with no scheduledAt in the future; SCHEDULED = WAITING with scheduledAt in the future.
export function sessionPhase(s: { status: string; scheduledAt: Date | string | null }, now: Date): SessionPhase;

export interface RosterEntry { studentId: string; name: string; joined: boolean; joinedAt: string | null; }
// enrolled = the class's ClassStudent rows; joined = SessionStudent rows. Union: every enrolled student,
// joined flag true when a SessionStudent row exists. Sorted joined-first then name.
export function buildRoster(
  enrolled: Array<{ studentId: string; name: string }>,
  joined: Array<{ studentId: string; joinedAt: Date | string }>,
): RosterEntry[];

export interface ScoreEntry { studentId: string; name: string; exerciseId: string; score: number; completedAt: string; }
export interface ScoreboardExercise { exerciseId: string; title: string; type: string; entries: ScoreEntry[]; completedCount: number; averageScore: number | null; }
// Given the exercises pushed in a session (ordered) and the ExerciseResult rows with sessionId=this session,
// group results by exercise; per exercise list one BEST entry per student (max score), completedCount = distinct
// students, averageScore = mean of those best scores (null when none).
export function buildScoreboard(
  pushed: Array<{ exerciseId: string; title: string; type: string }>,
  results: Array<{ studentId: string; name: string; exerciseId: string; score: number; completedAt: Date | string }>,
): ScoreboardExercise[];
```

- [ ] **Step 1: Failing tests** `src/lib/session.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { sessionPhase, buildRoster, buildScoreboard } from "@/lib/session";

const now = new Date("2026-07-13T12:00:00Z");

describe("sessionPhase", () => {
  it("ACTIVE -> LIVE, ENDED -> ENDED", () => {
    expect(sessionPhase({ status: "ACTIVE", scheduledAt: null }, now)).toBe("LIVE");
    expect(sessionPhase({ status: "ENDED", scheduledAt: null }, now)).toBe("ENDED");
  });
  it("WAITING with future scheduledAt -> SCHEDULED, else LOBBY", () => {
    expect(sessionPhase({ status: "WAITING", scheduledAt: "2026-07-13T13:00:00Z" }, now)).toBe("SCHEDULED");
    expect(sessionPhase({ status: "WAITING", scheduledAt: "2026-07-13T11:00:00Z" }, now)).toBe("LOBBY");
    expect(sessionPhase({ status: "WAITING", scheduledAt: null }, now)).toBe("LOBBY");
  });
});

describe("buildRoster", () => {
  it("unions enrolled with joined, joined-first then name", () => {
    const r = buildRoster(
      [{ studentId: "a", name: "Ann" }, { studentId: "b", name: "Bob" }, { studentId: "c", name: "Cy" }],
      [{ studentId: "b", joinedAt: "2026-07-13T12:01:00Z" }],
    );
    expect(r.map((e) => [e.studentId, e.joined])).toEqual([["b", true], ["a", false], ["c", false]]);
    expect(r[0].joinedAt).toBe("2026-07-13T12:01:00.000Z");
    expect(r[1].joinedAt).toBeNull();
  });
});

describe("buildScoreboard", () => {
  it("one best entry per student per exercise; completedCount + average", () => {
    const board = buildScoreboard(
      [{ exerciseId: "e1", title: "Grammar", type: "GRAMMAR" }],
      [
        { studentId: "a", name: "Ann", exerciseId: "e1", score: 40, completedAt: "2026-07-13T12:02:00Z" },
        { studentId: "a", name: "Ann", exerciseId: "e1", score: 90, completedAt: "2026-07-13T12:05:00Z" },
        { studentId: "b", name: "Bob", exerciseId: "e1", score: 60, completedAt: "2026-07-13T12:03:00Z" },
      ],
    );
    expect(board).toHaveLength(1);
    expect(board[0].completedCount).toBe(2);
    expect(board[0].averageScore).toBe(75); // (90 + 60) / 2
    expect(board[0].entries.find((e) => e.studentId === "a")!.score).toBe(90);
  });
  it("exercise with no results -> empty entries, null average", () => {
    const board = buildScoreboard([{ exerciseId: "e2", title: "Quiz", type: "QUIZ" }], []);
    expect(board[0].entries).toEqual([]);
    expect(board[0].averageScore).toBeNull();
    expect(board[0].completedCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run, verify fail** — `npx vitest run src/lib/session.test.ts`.
- [ ] **Step 3: Implement** `src/lib/session.ts` per the interfaces (pure, no db). ISO strings via `new Date(x).toISOString()`.
- [ ] **Step 4: Run** — `npm test` green.
- [ ] **Step 5: Commit**

```bash
git add src/lib/session.ts src/lib/session.test.ts
git commit -m "feat(sessions): pure shaping — phase, roster union, scoreboard"
```

---

### Task 3: Single go-live + scheduling (POST) + push-requires-PUBLISHED — TDD

**Files:** Modify `src/app/api/sessions/route.ts` (POST), `src/app/api/sessions/[id]/push/route.ts`; Test `tests/sessions-api.test.ts`.

**Interfaces:**
- Consumes: `requireTeacher`, `requireOwnedClass` (Task-2-era guard).
- Produces:
  - `POST /api/sessions` body `{ classId, title, mode?: "now" | "schedule", scheduledAt? }`:
    - `mode:"now"` (DEFAULT when omitted) → create directly `status:"ACTIVE", startedAt: now` (SINGLE go-live; no second step). Writes the "Session started" SYSTEM message.
    - `mode:"schedule"` with a future ISO `scheduledAt` → create `status:"WAITING", scheduledAt`. (400 if scheduledAt missing/past.)
    - Class ownership required (teacher owns classId). Returns 201 with the created session incl. status/scheduledAt.
  - `push/route.ts`: after the existing own-exercise check (`createdById === user.id`), ALSO require `exercise.status === "PUBLISHED"` → else 404 (can't push a draft into a live session; closes the P3 edge). Keep the ACTIVE-session gate.

- [ ] **Step 1: Failing test** `tests/sessions-api.test.ts` — use the next/headers-mock + real-handler idiom from `tests/exercise-patch.test.ts`/`lessons-api.test.ts`. Cover: `POST {mode:"now"}` creates an ACTIVE session (status ACTIVE, startedAt set) in ONE call; default (no mode) also ACTIVE; `mode:"schedule"` future → WAITING+scheduledAt; `mode:"schedule"` past/missing → 400; non-owner class → 404/403 per requireOwnedClass; push of a DRAFT exercise → 404; push of a PUBLISHED own exercise into an ACTIVE session → 201. If direct handler invocation is awkward, extract pure cores (`buildSessionCreate(body, now)`) and unit-test those + one integration touch; state the choice.
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement.** Keep the existing WAITING path only for `mode:"schedule"`. The old two-step (create-WAITING-then-PATCH-start) is replaced by `mode:"now"`; PATCH `action:"start"` remains (Task 4) for starting a SCHEDULED session.
- [ ] **Step 4: Run** — `npm test && npm run build && npx tsc --noEmit` green.
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(sessions): single go-live + scheduling; push requires published exercise"
```

---

### Task 4: Session detail GET — full roster + results breakdown; pre-start chat — TDD

**Files:** Modify `src/app/api/sessions/[id]/route.ts` (GET shaping; PATCH unchanged except confirm start works from SCHEDULED), `src/app/api/sessions/[id]/messages/route.ts` (allow WAITING).

**Interfaces:**
- Consumes: `buildRoster` (Task 2), the class's `ClassStudent` enrollment, `SessionStudent` joins.
- Produces:
  - Session detail GET response GAINS `roster: RosterEntry[]` (Task 2 union of enrolled ∪ joined — so a lobby can show who's present vs waiting) and, when `status==="ENDED"` OR the requester is the owning teacher, `results: ScoreboardExercise[]` (Task 2 `buildScoreboard` over pushed exercises + this session's ExerciseResults). Keep existing `session/participants/messages/pushedExercise/serverTime`. `phase: sessionPhase(...)` added for the client.
  - `messages/route.ts`: allow posting a TEXT message when `status` is WAITING or ACTIVE (pre-start lobby chat for both teacher and students); keep the 403 for ENDED and the access/enrollment checks. (Students must still have joined — pre-start join is allowed; see Task 5 join relax.)
  - `PATCH action:"start"` must succeed from WAITING regardless of scheduledAt (teacher can start a scheduled session early) — confirm/adjust.

- [ ] **Step 1: Failing test** (add to `tests/sessions-api.test.ts`): detail GET for a session in a class with 3 enrolled, 1 joined → `roster` has 3 entries, 1 joined; an ENDED session with 2 pushed exercises + results → `results` shaped; posting a message in WAITING → 201 (was previously blocked in some paths — verify the messages route allows it), posting in ENDED → 403.
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement** — extend GET shaping (fetch `class.students` for the roster + `exerciseResult` where `sessionId=id` for results; reuse Task 2 pure fns); relax the messages route's status gate to `{WAITING, ACTIVE}`.
- [ ] **Step 4: Run** — gates green.
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(sessions): detail GET returns full roster + results; lobby chat enabled pre-start"
```

---

### Task 5: Submit records `sessionId` (server-validated) — TDD

**Files:** Modify `src/app/api/exercises/[id]/submit/route.ts`; Modify `src/app/api/sessions/[id]/join/route.ts` (allow join in WAITING for the lobby); Test `tests/submit-session.test.ts`.

**Interfaces:**
- Consumes: existing submit scoring/gamification; `SessionMessage` type=EXERCISE (the push record).
- Produces:
  - Submit accepts an OPTIONAL `sessionId` in the body. When present, the server VALIDATES before storing it on the ExerciseResult: (a) the session exists and is ACTIVE, (b) the student has a `SessionStudent` join row, (c) a `SessionMessage{type:"EXERCISE", content: exerciseId}` exists for that session (i.e. this exercise was actually pushed). If any check fails → ignore `sessionId` (store the result WITHOUT it — do NOT 400 the whole submit; the completion still counts as normal practice) OR 400 if you prefer strictness — CHOOSE ignore-and-store-null, and note it. The existing DRAFT-404 guard still runs first (a pushed exercise is PUBLISHED per Task 3, so this composes).
  - The stored `ExerciseResult.sessionId` is what the scoreboard/recap aggregate on.
  - `join/route.ts`: allow joining a WAITING session (currently rejects only ENDED — confirm it already allows WAITING; if it blocks non-ACTIVE, relax to allow WAITING so students can enter the lobby). Keep enrollment + ENDED checks.

- [ ] **Step 1: Failing test** `tests/submit-session.test.ts`: submit with a valid pushed sessionId (active session, joined student, exercise pushed) → ExerciseResult.sessionId set; submit with a sessionId where the exercise was NOT pushed → sessionId stored NULL (result still created); submit with a sessionId for a session the student didn't join → NULL; submit with no sessionId → NULL (normal practice, unchanged). Extract the validation into a tested pure/db helper (`resolveSubmitSessionId(sessionId, exerciseId, studentId): Promise<string | null>`) if that eases testing.
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — gates green.
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(sessions): submit records validated sessionId for pushed exercises"
```

---

### Task 6: Live scoreboard endpoint — TDD

**Files:** Create `src/app/api/sessions/[id]/scoreboard/route.ts`; Test (add to `tests/sessions-api.test.ts`).

**Interfaces:**
- Consumes: `buildScoreboard` (Task 2); session ownership.
- Produces: `GET /api/sessions/[id]/scoreboard` (teacher-owner only — 404 otherwise via the ownership convention) → `{ scoreboard: ScoreboardExercise[], serverTime: string }`. Aggregates pushed exercises (the session's EXERCISE messages, in push order) × ExerciseResults with `sessionId=id`. Cheap enough to poll every 2.5s alongside the room.

- [ ] **Step 1: Failing test:** teacher gets a scoreboard reflecting a student's in-session completion; a non-owner teacher → 404; a student → 403 (requireTeacher). 
- [ ] **Step 2-4: TDD + implement + gates green.**
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(sessions): live teacher scoreboard endpoint"
```

---

### Task 7: "Class is live" discovery endpoint + poll hook — TDD

**Files:** Create `src/app/api/sessions/live/route.ts`, `src/hooks/use-poll.ts`, `src/hooks/use-poll.test.ts`.

**Interfaces:**
- Produces:
  - `GET /api/sessions/live` (requireStudent) → `{ live: { id: string; title: string; className: string } | null }` — the single most-recent ACTIVE session across the student's enrolled classes (null when none). Deliberately tiny for a frequent poll.
  - `usePoll<T>(fetcher: () => Promise<T>, intervalMs: number): { data: T | null }` — a small hook that fetches on mount, on an interval, AND on window `focus`/`visibilitychange` (refetch-on-focus per spec). SSR-safe; clears the interval + listeners on unmount; skips overlapping fetches. Unit-test the pure interval/visibility bookkeeping where feasible (jsdom); if the timer logic is hard to test in jsdom, extract a pure `shouldRefetch(lastAt, now, intervalMs)` and test that.

- [ ] **Step 1: Failing tests** (the endpoint via the handler-mock idiom for at least the null and live cases; `use-poll` via jsdom fake timers or the extracted pure helper).
- [ ] **Step 2-4: TDD + implement + gates.**
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(sessions): student live-discovery endpoint + refetch-on-focus poll hook"
```

---

### Task 8: Session i18n keys

**Files:** Modify `messages/en.json`, `messages/ar.json`.

**Interfaces:**
- Produces: `session.*` keys for lobby / in-room exercise / scoreboard / recap / live-banner, present in BOTH catalogs (parity test enforced). Later UI tasks consume these and append any they still need (always to both files).

- [ ] **Step 1: Add keys to BOTH files** (English shown; add matching Arabic):

```json
"session.goLive": "Go live", "session.schedule": "Schedule for later", "session.scheduledFor": "Scheduled for {when}", "session.startNow": "Start now",
"session.lobbyTitle": "Waiting room", "session.waitingForTeacher": "Waiting for {teacher} to start the session…", "session.roster": "Students", "session.joined": "Here", "session.notJoined": "Not here yet", "session.startSession": "Start session",
"session.pushedTitle": "Exercise from your teacher", "session.startExercise": "Start", "session.submitAndReturn": "Submit", "session.completedInRoom": "Done — back to the session", "session.waitingForPush": "Your teacher will share exercises here.",
"session.scoreboard": "Live scoreboard", "session.completedCount": "{done} of {total} done", "session.avgScore": "Avg {score}%", "session.notCompleted": "—",
"session.recapTitle": "Session recap", "session.recapDuration": "Duration", "session.recapParticipants": "Participants", "session.recapExercises": "Exercises", "session.recapNoResults": "No exercises were completed this session.", "session.transcript": "Chat transcript", "session.backToSessions": "Back to sessions",
"session.liveBanner": "{className} is live now", "session.joinLive": "Join",
"session.leave": "Leave session", "session.you": "You", "session.teacher": "Teacher"
```

Arabic values (same keys): `"ابدأ البث"`, `"جدولة لاحقًا"`, `"مجدولة في {when}"`, `"ابدأ الآن"`, `"غرفة الانتظار"`, `"في انتظار {teacher} لبدء الجلسة…"`, `"الطلاب"`, `"حاضر"`, `"لم يحضر بعد"`, `"ابدأ الجلسة"`, `"تمرين من معلمك"`, `"ابدأ"`, `"إرسال"`, `"تم — عد إلى الجلسة"`, `"سيشارك معلمك التمارين هنا."`, `"لوحة النتائج المباشرة"`, `"{done} من {total} أنجزوا"`, `"المتوسط {score}%"`, `"—"`, `"ملخص الجلسة"`, `"المدة"`, `"المشاركون"`, `"التمارين"`, `"لم يُكمل أي تمرين في هذه الجلسة."`, `"سجل المحادثة"`, `"العودة إلى الجلسات"`, `"{className} مباشرة الآن"`, `"انضمّ"`, `"مغادرة الجلسة"`, `"أنت"`, `"المعلم"`.

- [ ] **Step 2: Parity** — `npx vitest run src/lib/i18n.test.ts` green.
- [ ] **Step 3: Commit**

```bash
git add messages/en.json messages/ar.json
git commit -m "feat(i18n): session lobby/scoreboard/recap/banner keys"
```

---

### Task 9: Single go-live UI (start dialog + kill the second Start button)

**Files:** Modify `src/components/teacher/sessions/start-session-dialog.tsx`, `src/app/(dashboard)/teacher/sessions/[id]/page.tsx`.

**Interfaces:**
- Consumes: `POST /api/sessions {mode}` (Task 3), `session.goLive/schedule/scheduledFor/startNow/startSession` keys.
- Produces: the dialog offers **Go live** (default, `mode:"now"` → creates ACTIVE → routes into the room already live) and **Schedule for later** (a datetime input → `mode:"schedule"`). The teacher room page no longer shows a mandatory second "Start Session" button for a just-created session; the "Start session" button appears ONLY for a SCHEDULED/WAITING session (starting it early). All chrome `t()`.

- [ ] **Step 1** — Dialog: radio/toggle Go-live-now vs Schedule; on schedule, a `datetime-local` input (send ISO). On submit route to the room. Remove the "Go live"-creates-WAITING behavior.
- [ ] **Step 2** — Room page: gate the "Start session" button on `phase === "SCHEDULED"` (or WAITING); a session created via Go-live arrives ACTIVE and shows the live room directly.
- [ ] **Step 3** — Gates green; headless: `POST {mode:"now"}` → GET shows ACTIVE immediately (one step). Commit:

```bash
git add -A
git commit -m "feat(sessions): one-click go-live; schedule option; drop the forced second start"
```

---

### Task 10: Lobby (both roles)

**Files:** Modify `src/app/(dashboard)/student/sessions/[id]/session-room.tsx` (lobby branch), `src/app/(dashboard)/teacher/sessions/[id]/page.tsx` (lobby branch); optionally a shared `src/components/shared/session-lobby.tsx`.

**Interfaces:**
- Consumes: detail GET `roster` + `phase` (Task 4); pre-start chat (Task 4 messages relax).
- Produces: when `phase` is LOBBY/SCHEDULED, both room views render a **waiting room**: the full roster (Task 2) showing who's `joined`/`session.notJoined`, a `session.waitingForTeacher` line for students (scheduled shows `session.scheduledFor`), the teacher's **Start session** button, and CHAT ENABLED for both sides (no more "Start the session to chat"). When `phase` becomes LIVE the view switches to the live room. Poll continues to drive the transition.

- [ ] **Step 1** — Student room: add a lobby branch; enable chat pre-start; roster with joined/waiting.
- [ ] **Step 2** — Teacher room: lobby branch with roster + Start button + enabled chat.
- [ ] **Step 3** — Gates green; headless/code-trace: a WAITING session shows the lobby with the roster; posting a message pre-start succeeds. Commit:

```bash
git add -A
git commit -m "feat(sessions): real lobby with full roster and pre-start chat"
```

---

### Task 11: In-room exercise (no ejection) — the centerpiece

**Files:** Create `src/components/exercise/embedded-exercise.tsx`; Modify `src/app/(dashboard)/student/sessions/[id]/session-room.tsx` (split pane).

**Interfaces:**
- Consumes: the detail GET `pushedExercise` (already redacted for students), the 8 self-contained players (`renderPlayer` logic in `exercise-player-screen.tsx` — reuse the players, not the page wrapper), `ResultsScreen` (embeddable, `compact`), submit with `sessionId` (Task 5).
- Produces: `<EmbeddedExercise pushed={ExerciseFull} sessionId={string} onDone={()=>void} />` — renders the matching per-type player INSIDE the room (a split pane: exercise pane + chat docked), submits via `POST /api/exercises/[id]/submit` WITH `sessionId`, then shows `<ResultsScreen compact>` in-pane with a `session.completedInRoom` "back to the session" action (`onDone` returns to the chat-only view). The student NEVER leaves the room — DELETE the `router.push('/student/exercises/'+id)` eject at `session-room.tsx:160`.
- Layout: on a new push while in LIVE, show the exercise pane (with a `session.startExercise` affordance or auto-open — auto-open is fine); chat stays visible/docked (side panel on desktop, collapsible on mobile). Content stays `dir="ltr"`.

- [ ] **Step 1** — Build `EmbeddedExercise` reusing the player switch; wire the session-aware submit + compact results.
- [ ] **Step 2** — Rewire `session-room.tsx`: replace the eject banner+button with the split pane rendering `<EmbeddedExercise>` when `pushedExercise` is present and phase LIVE; remove the `router.push` eject.
- [ ] **Step 3** — Gates green; headless: push an exercise → student detail GET returns it → completing it (submit with sessionId) records a result with sessionId (verify via the scoreboard endpoint) and the student stays in-room. Commit:

```bash
git add -A
git commit -m "feat(sessions)!: pushed exercises render in-room; students no longer ejected"
```

---

### Task 12: Live scoreboard panel (teacher)

**Files:** Create `src/components/teacher/sessions/scoreboard.tsx`; Modify `src/app/(dashboard)/teacher/sessions/[id]/page.tsx`.

**Interfaces:**
- Consumes: `GET /api/sessions/[id]/scoreboard` (Task 6), `session.scoreboard/completedCount/avgScore/notCompleted` keys.
- Produces: `<Scoreboard sessionId={string} />` polling the scoreboard endpoint (2.5s) — per pushed exercise: title, `session.completedCount` (done/total against the roster size), `session.avgScore`, and a per-student list (name + score, or `—` for not-yet-done). Rendered in the teacher room's right rail while LIVE. Student names LTR-safe; scores tabular-nums.

- [ ] **Step 1-2** — Build + mount in the teacher room (LIVE phase).
- [ ] **Step 3** — Gates green; headless: after a student completes a pushed exercise, the scoreboard endpoint reflects it. Commit:

```bash
git add -A
git commit -m "feat(sessions): live teacher scoreboard panel"
```

---

### Task 13: Session recap (both roles)

**Files:** Create `src/components/shared/session-recap.tsx`; Modify both room views to render it when ENDED.

**Interfaces:**
- Consumes: detail GET `results` (Task 4) + session duration/participants + messages (transcript); `session.recap*`/`session.transcript` keys.
- Produces: `<SessionRecap detail={...} role="TEACHER"|"STUDENT" />` replacing the 3-number ENDED summary. Shows: duration, participant count, per-exercise results (teacher: full scoreboard; student: their own scores + class average), and a read-only chat transcript. Both roles reach it by opening an ENDED session (the "View" path already exists). All `t()`, tokens, content `dir="ltr"`.

- [ ] **Step 1-2** — Build the recap; wire it into the ENDED branch of both room views (replacing the current 3-stat block / overlay).
- [ ] **Step 3** — Gates green; headless/code-trace: an ENDED session with results renders the recap for both roles. Commit:

```bash
git add -A
git commit -m "feat(sessions): post-session recap with results and transcript for both roles"
```

---

### Task 14: Cross-page "class is live" banner

**Files:** Create `src/components/shared/live-banner.tsx`; Modify `src/app/(dashboard)/student/layout.tsx` (mount it).

**Interfaces:**
- Consumes: `GET /api/sessions/live` (Task 7) via `usePoll` (Task 7, refetch-on-focus); `session.liveBanner/joinLive` keys.
- Produces: `<LiveBanner />` — a slim dismissible banner mounted in the student dashboard layout (so it shows on `/student`, `/student/practice`, `/student/progress`, etc.). When `usePoll` reports a live session, it shows `session.liveBanner` (with the class name) + a `session.joinLive` link into `/student/sessions/[id]`. Hidden when none, or when already ON that session's room page (don't nag in-room). Poll interval ~15s (banner doesn't need 2.5s). Tokens/logical props; RTL-safe.

- [ ] **Step 1-2** — Build the banner + mount in the student layout; suppress on the session room route.
- [ ] **Step 3** — Gates green; headless/code-trace: with an ACTIVE session in the student's class, `/api/sessions/live` returns it and the banner would render; on an unrelated page the banner shows, in the room it's suppressed. Commit:

```bash
git add -A
git commit -m "feat(sessions): cross-page class-is-live banner with refetch-on-focus"
```

---

### Task 15: Phase 4 verification

**Files:** none (verify + fix regressions inline).

- [ ] **Step 1: Full gate** — `npm run lint && npx tsc --noEmit && npm run build && npm test` — zero errors, all pass.
- [ ] **Step 2: Smoke checklist (headless — kill orphan dev servers first, kill yours after; curl + auth-API session cookies; a teacher + 2 students enrolled in one class):**
  1. Teacher "Go live" → session is ACTIVE in ONE step (GET shows ACTIVE, no second Start needed); "Schedule for later" creates a SCHEDULED session that the teacher can Start.
  2. Lobby: before start (a SCHEDULED session), both teacher and student see the waiting room with the full roster (joined/not-joined) and can post chat pre-start.
  3. Teacher pushes a PUBLISHED exercise; a DRAFT push → 404.
  4. Student completes the pushed exercise IN-ROOM (submit carries sessionId) — never navigates to /student/exercises/[id]; the result has sessionId (verify via scoreboard).
  5. Teacher scoreboard reflects the completion live (done/total, avg, per-student).
  6. Teacher ends the session → both roles see the recap (results breakdown + transcript), not just 3 numbers.
  7. Cross-page banner: with the session ACTIVE, `/api/sessions/live` returns it; the banner shows on `/student` and is suppressed inside the room.
  8. Security: a student submitting with a sessionId they didn't join / for a non-pushed exercise stores NULL (no false attribution); a non-owner teacher hitting the scoreboard → 404; pushing another teacher's exercise → 404; DRAFT still unreachable by students on all paths.
  9. Arabic pass: lobby, in-room exercise chrome, scoreboard, recap, banner render RTL with no hardcoded English chrome (exercise content English in dir=ltr).
- [ ] **Step 3: Fix regressions inline; commit** (`fix(sessions): phase 4 verification fixes` — skip if none).
