# SpeakPath Redesign — Phase 2: Student Path Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give students a guided learning path (Units → Lessons → Exercises with one Continue action), 60-second onboarding via a 5-question mini-placement, a unified Practice area absorbing AI chat, a Progress page with mistake review, and results screens that always point to the next exercise.

**Architecture:** The dormant `Lesson` model becomes the curriculum spine: `classId` goes nullable so platform-wide starter curriculum (built from the existing 46 seeded exercises) lives beside future class lessons; path state (done/current/locked, checkpoint gating) is derived purely from `ExerciseResult` rows — no new state tables. New student IA: `/student` = Learn (path), `/student/practice` (URL-filtered library + conversations), `/student/classes`, `/student/progress`; old routes redirect. Server logic lands in small testable libs (`path.ts`, `recommend.ts`) behind thin route handlers.

**Tech Stack:** Next.js 16.2.1 (modified), React 19, Tailwind v4 tokens from Phase 1, better-auth 1.5.6, Prisma 7/SQLite, vitest (33 tests green at start).

**Spec:** `docs/superpowers/specs/2026-07-11-speakpath-redesign-design.md` §5 (+§8 data changes). Phase 1 foundation is complete on `redesign/v2` at `224f3bd`.

## Global Constraints

- **Next 16 (modified):** `cookies()`/`headers()`/`params`/`searchParams` are async — always `await` (client components read params via `useSearchParams()` inside a `<Suspense>`; copy the pattern from `src/app/(auth)/signup/page.tsx`). Middleware file is `src/proxy.ts` (`export const config`).
- **Design system (Phase 1, mandatory):** tokens only — `bg-card border-2 border-border rounded-card shadow-sticker` sticker cards, `Button` variants `brand|sun|ghost|outline` (`@/components/ui/button`), `Badge` variants `streak|xp|level`, text via `text-foreground`/`text-muted-foreground`. Lint bans `text-white/`, raw hex, physical direction utilities (`pl-/pr-/ml-/mr-/ml-auto/border-l/border-r/text-left/text-right/left-N/right-N`) — use logical (`ps-/pe-/ms-/me-/border-s/border-e/text-start/text-end/start-/end-`).
- **i18n (mandatory for every new/rebuilt page):** all UI strings via `useT()` from `@/components/providers/locale-provider` with keys added to BOTH `messages/en.json` and `messages/ar.json` (the key-parity test fails otherwise). Arabic values must be real Arabic. English exercise content is exempt and renders inside `dir="ltr"` islands (already handled by the player screen).
- **Client data fetching:** `useApi(() => api<T>("/path"), [deps])` from `@/hooks/use-api` + `@/lib/api` (throws `ApiClientError`). Server routes guard with `requireStudent()`/`requireUser()` from `@/lib/guard` and reply via the established `{ error }` JSON error shape (see `src/app/api/exercises/route.ts`).
- **Path constants:** `PASS_SCORE = 60` (a lesson exercise counts as passed at score ≥ 60). Mini-placement question ids: `["g1","g4","v1","v5","r1"]`. Mini-placement awards **no** XP bonus (the +50 stays exclusive to the full exam).
- **XP/streak logic is untouched** — `applyGamification`/`xpForScore` in `src/lib/gamification.ts` stay as-is.
- **URL is state:** practice filters live in `searchParams` (`?type=GRAMMAR&difficulty=BEGINNER`), never in bare `useState`.
- Work on branch `redesign/v2`. Commit after every task with the given message + trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`. Definition of done per task: its tests pass, `npm test` fully green, `npm run build` + `npx tsc --noEmit` succeed, `npm run lint` no new errors.

## File Structure (created/modified this phase)

```text
prisma/schema.prisma                       # Lesson.classId nullable + isCheckpoint
prisma/curriculum.ts                       # starter-curriculum definition + seedCurriculum(db) (new)
prisma/seed.ts                             # calls seedCurriculum
src/lib/path.ts + path.test.ts             # derivePath (pure) + buildPathForStudent (new)
src/app/api/path/route.ts                  # GET /api/path (new)
src/lib/recommend.ts + recommend.test.ts   # pickNextExercise (new)
src/app/api/exercises/recommend/route.ts   # GET (new)
src/app/api/exercises/route.ts             # student default difficulty = user.level
src/lib/placement-questions.ts             # MINI_QUESTION_IDS + scorePlacementSubset
src/app/api/placement/route.ts             # ?mode=mini handling
src/app/(dashboard)/student/onboarding/page.tsx        # mini-placement wizard (new)
src/app/(dashboard)/student/page.tsx       # REBUILT: Learn home (the Path)
src/app/(dashboard)/student/classes/page.tsx           # join + list (new, moved from dashboard)
src/app/(dashboard)/student/practice/page.tsx          # URL-filtered library + conversations (new)
src/app/(dashboard)/student/practice/conversation/[id]/page.tsx  # canonical AI-chat page (new)
src/app/(dashboard)/student/exercises/page.tsx         # redirect → /student/practice
src/app/(dashboard)/student/ai-chat/page.tsx           # redirect → /student/practice?type=CONVERSATION
src/app/(dashboard)/student/progress/page.tsx          # stats + history + mistake review (new)
src/app/api/results/route.ts               # GET attempt history (new)
src/app/api/results/[id]/review/route.ts   # GET per-item mistake review (new)
src/app/(dashboard)/student/placement/page.tsx         # persistence + review + refine framing
src/components/exercise/results-screen.tsx # springboard `next` prop
src/app/(dashboard)/student/exercises/[id]/exercise-player-screen.tsx  # next-CTA wiring
src/components/shared/sidebar.tsx          # student nav → Learn/Practice/Classes/Progress
src/app/(auth)/signup/page.tsx             # student redirect → /student/onboarding
messages/en.json + messages/ar.json        # new keys per task
```

---

### Task 1: Schema — nullable `Lesson.classId` + `isCheckpoint`

**Files:**
- Modify: `prisma/schema.prisma:165-181` (Lesson model)
- Create: migration via CLI

**Interfaces:**
- Produces: `Lesson.classId String?` (platform curriculum rows have `classId = null`), `Lesson.isCheckpoint Boolean @default(false)`. Relation becomes optional: `class Class? @relation(...)`.

- [ ] **Step 1: Edit the model**

In `prisma/schema.prisma` change the Lesson model lines:

```prisma
  classId     String?
  isCheckpoint Boolean @default(false) // unit checkpoint quiz — passing unlocks the next unit
```

and the relation line:

```prisma
  class     Class?     @relation(fields: [classId], references: [id], onDelete: Cascade)
```

(`onDelete: Cascade` on an optional relation is valid — null rows are unaffected.)

- [ ] **Step 2: Migrate**

Run: `npx prisma migrate dev --name lesson-curriculum-fields`
Expected: new migration folder; client regenerated.

- [ ] **Step 3: Verify build + tests**

Run: `npx tsc --noEmit && npm test`
Expected: clean, 33/33 (nothing reads these fields yet).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(path): nullable Lesson.classId + isCheckpoint for platform curriculum"
```

---

### Task 2: Starter curriculum seed (groups the existing 46 exercises)

**Files:**
- Create: `prisma/curriculum.ts`, `tests/curriculum.test.ts`
- Modify: `prisma/seed.ts` (call `seedCurriculum` at the end of `main()`)

**Interfaces:**
- Produces: `seedCurriculum(db: PrismaClient): Promise<void>` — idempotent; creates lessons with fixed ids `seed-path-{level}-u{unit}-l{order}` owned by `SYSTEM_TEACHER_ID = "seed-system-teacher"`, `classId: null`, and points existing seeded exercises' `lessonId` at them. Also exports `CURRICULUM` (the definition) for tests.

**Curriculum definition (exact — uses the existing seed exercise ids; verify each id exists in `prisma/seed.ts` and fix any typo against the real ids before coding):**

Per level (`BEGINNER`, `INTERMEDIATE`, `ADVANCED`), 2 units. Titles below; per-level exercise ids follow the seed naming convention `seed-{type}-{level}-{n}` (e.g. `seed-grammar-beginner-1`); conversation ids are scenario-named (`seed-conversation-restaurant` etc. — difficulty mapping: BEGINNER = restaurant, shopping, directions; INTERMEDIATE = doctor, airport, hotel, phone-call, free-talk; ADVANCED = job-interview, business-meeting).

```text
Unit 1 "Foundations" (unit: 1)
  L1 (order 1) "Grammar basics"      → the 2 GRAMMAR exercises of that level
  L2 (order 2) "Word power"          → the 2 VOCABULARY exercises
  L3 (order 3) "Real conversations"  → first 2 CONVERSATION exercises of that level (ADVANCED has exactly 2; BEGINNER uses restaurant+shopping; INTERMEDIATE uses doctor+airport)
  L4 (order 4) "Unit 1 Checkpoint"   → QUIZ exercise #1 of that level, isCheckpoint: true
Unit 2 "Skills builder" (unit: 2)
  L1 (order 1) "Translation lab"     → the 2 TRANSLATION exercises
  L2 (order 2) "Listen closely"      → the 2 LISTENING exercises
  L3 (order 3) "Express yourself"    → the PICTURE + STORY exercise of that level
  L4 (order 4) "Unit 2 Checkpoint"   → QUIZ exercise #2 of that level, isCheckpoint: true
```

Remaining conversation exercises (BEGINNER directions; INTERMEDIATE hotel/phone-call/free-talk) stay `lessonId: null` — free practice.

- [ ] **Step 1: Write the failing test**

`tests/curriculum.test.ts`:

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/lib/db";
import { seedCurriculum, CURRICULUM } from "../prisma/curriculum";

beforeAll(async () => {
  // Curriculum needs the exercise library; reuse the real seed (idempotent).
  const { seedLibrary } = await import("../prisma/seed");
  await seedLibrary(db);
  await seedCurriculum(db);
  await seedCurriculum(db); // idempotency: second run must not duplicate
});

describe("starter curriculum", () => {
  it("creates 8 lessons per level (2 units x 4), 24 total, classId null", async () => {
    const lessons = await db.lesson.findMany({ where: { classId: null } });
    expect(lessons).toHaveLength(24);
    for (const level of ["BEGINNER", "INTERMEDIATE", "ADVANCED"]) {
      expect(lessons.filter((l) => l.level === level)).toHaveLength(8);
    }
  });
  it("marks exactly one checkpoint per unit per level", async () => {
    const checkpoints = await db.lesson.findMany({ where: { classId: null, isCheckpoint: true } });
    expect(checkpoints).toHaveLength(6);
    for (const c of checkpoints) expect(c.order).toBe(4);
  });
  it("assigns every lesson at least one exercise of the lesson's level", async () => {
    const lessons = await db.lesson.findMany({
      where: { classId: null },
      include: { exercises: true },
    });
    for (const l of lessons) {
      expect(l.exercises.length, `${l.id} has no exercises`).toBeGreaterThan(0);
      for (const ex of l.exercises) expect(ex.difficulty).toBe(l.level);
    }
  });
  it("checkpoint lessons contain exactly one QUIZ", async () => {
    const cps = await db.lesson.findMany({ where: { isCheckpoint: true }, include: { exercises: true } });
    for (const c of cps) {
      expect(c.exercises).toHaveLength(1);
      expect(c.exercises[0].type).toBe("QUIZ");
    }
  });
});
```

Note: this requires `prisma/seed.ts` to export its library-seeding body as `export async function seedLibrary(db)` (currently inline in `main()`). Refactor: wrap the existing system-teacher + exercise upserts into `seedLibrary(db)`, and have `main()` call `seedLibrary(db)` then `seedCurriculum(db)`. Behavior of `npm run db:seed` is unchanged.

- [ ] **Step 2: Run test, verify fail**

Run: `npx vitest run tests/curriculum.test.ts`
Expected: FAIL — `prisma/curriculum` not found.

- [ ] **Step 3: Implement `prisma/curriculum.ts`**

```ts
import type { PrismaClient } from "../src/generated/prisma/client";

const SYSTEM_TEACHER_ID = "seed-system-teacher";
type Level = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

type LessonDef = {
  order: number;
  title: string;
  isCheckpoint?: boolean;
  exerciseIds: string[];
};
type UnitDef = { unit: number; lessons: LessonDef[] };

function level(l: string): Level {
  return l as Level;
}

const CONV: Record<Level, [string, string]> = {
  BEGINNER: ["seed-conversation-restaurant", "seed-conversation-shopping"],
  INTERMEDIATE: ["seed-conversation-doctor", "seed-conversation-airport"],
  ADVANCED: ["seed-conversation-job-interview", "seed-conversation-business-meeting"],
};

export function unitsFor(lvl: Level): UnitDef[] {
  const s = lvl.toLowerCase();
  return [
    {
      unit: 1,
      lessons: [
        { order: 1, title: "Grammar basics", exerciseIds: [`seed-grammar-${s}-1`, `seed-grammar-${s}-2`] },
        { order: 2, title: "Word power", exerciseIds: [`seed-vocabulary-${s}-1`, `seed-vocabulary-${s}-2`] },
        { order: 3, title: "Real conversations", exerciseIds: [...CONV[lvl]] },
        { order: 4, title: "Unit 1 Checkpoint", isCheckpoint: true, exerciseIds: [`seed-quiz-${s}-1`] },
      ],
    },
    {
      unit: 2,
      lessons: [
        { order: 1, title: "Translation lab", exerciseIds: [`seed-translation-${s}-1`, `seed-translation-${s}-2`] },
        { order: 2, title: "Listen closely", exerciseIds: [`seed-listening-${s}-1`, `seed-listening-${s}-2`] },
        { order: 3, title: "Express yourself", exerciseIds: [`seed-picture-${s}`, `seed-story-${s}`] },
        { order: 4, title: "Unit 2 Checkpoint", isCheckpoint: true, exerciseIds: [`seed-quiz-${s}-2`] },
      ],
    },
  ];
}

export const CURRICULUM: Record<Level, UnitDef[]> = {
  BEGINNER: unitsFor(level("BEGINNER")),
  INTERMEDIATE: unitsFor(level("INTERMEDIATE")),
  ADVANCED: unitsFor(level("ADVANCED")),
};

export async function seedCurriculum(db: PrismaClient): Promise<void> {
  for (const [lvl, units] of Object.entries(CURRICULUM)) {
    for (const u of units) {
      for (const l of u.lessons) {
        const id = `seed-path-${lvl.toLowerCase()}-u${u.unit}-l${l.order}`;
        await db.lesson.upsert({
          where: { id },
          create: {
            id,
            classId: null,
            createdById: SYSTEM_TEACHER_ID,
            title: l.title,
            level: lvl,
            unit: u.unit,
            order: l.order,
            isCheckpoint: l.isCheckpoint ?? false,
          },
          update: {
            title: l.title,
            level: lvl,
            unit: u.unit,
            order: l.order,
            isCheckpoint: l.isCheckpoint ?? false,
          },
        });
        for (const exId of l.exerciseIds) {
          await db.exercise.update({ where: { id: exId }, data: { lessonId: id } })
            .catch(() => {
              throw new Error(`curriculum references missing exercise id: ${exId}`);
            });
        }
      }
    }
  }
}
```

IMPORTANT: before finalizing, cross-check every generated id (`seed-grammar-beginner-1`, `seed-quiz-advanced-2`, `seed-picture-intermediate`, each CONV id, …) against the actual ids in `prisma/seed.ts`; the fail-loud catch surfaces any mismatch at seed time — fix the definition, not the catch.

- [ ] **Step 4: Wire into seed.ts and run tests**

Refactor `prisma/seed.ts` per the note in Step 1 (`export async function seedLibrary(db)`; `main()` = `seedLibrary` + `seedCurriculum`). Then:

Run: `npx vitest run tests/curriculum.test.ts && npm test && npm run db:seed`
Expected: all green; seed prints counts and exits 0 (run twice to confirm idempotency).

- [ ] **Step 5: Commit**

```bash
git add prisma/curriculum.ts prisma/seed.ts tests/curriculum.test.ts
git commit -m "feat(path): seed starter curriculum from existing exercise library"
```

---

### Task 3: Path derivation lib + GET /api/path — TDD

**Files:**
- Create: `src/lib/path.ts`, `src/lib/path.test.ts`, `src/app/api/path/route.ts`

**Interfaces:**
- Consumes: curriculum lessons (`classId: null`, ordered by `unit, order`), `ExerciseResult` best scores.
- Produces (exact):

```ts
export const PASS_SCORE = 60;
export type LessonStatus = "done" | "current" | "locked";
export interface PathExercise { id: string; title: string; type: string; completed: boolean; bestScore: number | null; }
export interface PathLesson { id: string; title: string; order: number; isCheckpoint: boolean; status: LessonStatus; exercises: PathExercise[]; }
export interface PathUnit { unit: number; lessons: PathLesson[]; unlocked: boolean; }
export interface PathResponse {
  placed: boolean;
  level: string | null;
  units: PathUnit[];                    // empty when !placed
  continue: { lessonId: string; exerciseId: string; exerciseTitle: string; lessonTitle: string; type: string } | null;
}
// pure — fully unit-testable:
export function derivePath(
  lessons: Array<{ id: string; title: string; unit: number; order: number; isCheckpoint: boolean;
    exercises: Array<{ id: string; title: string; type: string }> }>,
  bestScores: Map<string, number>,      // exerciseId -> best score
): { units: PathUnit[]; continue: PathResponse["continue"] };
// db-backed:
export async function buildPathForStudent(studentId: string, level: string | null): Promise<PathResponse>;
```

**Rules (encode exactly):** an exercise is passed when `bestScores.get(id) >= PASS_SCORE`. A lesson is `done` when ALL its exercises pass. Within a unit, the first non-done lesson is `current`, later ones `locked`. Unit 1 is always `unlocked`; unit N+1 unlocks only when unit N's checkpoint lesson is done; all lessons of a locked unit are `locked`. `continue` = first exercise not yet passed inside the first `current` lesson of the first unlocked unit (null when everything is done).

- [ ] **Step 1: Write the failing tests**

`src/lib/path.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { derivePath, PASS_SCORE } from "@/lib/path";

const lesson = (id: string, unit: number, order: number, exIds: string[], isCheckpoint = false) => ({
  id, title: id, unit, order, isCheckpoint,
  exercises: exIds.map((e) => ({ id: e, title: e, type: "GRAMMAR" })),
});

const LESSONS = [
  lesson("u1l1", 1, 1, ["a", "b"]),
  lesson("u1l2", 1, 2, ["c"]),
  lesson("u1cp", 1, 3, ["q1"], true),
  lesson("u2l1", 2, 1, ["d"]),
];

describe("derivePath", () => {
  it("fresh student: first lesson current, rest locked, unit 2 locked", () => {
    const { units, continue: cont } = derivePath(LESSONS, new Map());
    expect(units[0].lessons.map((l) => l.status)).toEqual(["current", "locked", "locked"]);
    expect(units[1].unlocked).toBe(false);
    expect(units[1].lessons[0].status).toBe("locked");
    expect(cont).toMatchObject({ lessonId: "u1l1", exerciseId: "a" });
  });
  it("passing threshold is PASS_SCORE inclusive", () => {
    const { units } = derivePath(LESSONS, new Map([["a", PASS_SCORE], ["b", PASS_SCORE - 1]]));
    expect(units[0].lessons[0].status).toBe("current");
    expect(units[0].lessons[0].exercises[0].completed).toBe(true);
    expect(units[0].lessons[0].exercises[1].completed).toBe(false);
  });
  it("finishing a lesson advances current; continue points into it", () => {
    const { units, continue: cont } = derivePath(LESSONS, new Map([["a", 80], ["b", 70]]));
    expect(units[0].lessons.map((l) => l.status)).toEqual(["done", "current", "locked"]);
    expect(cont).toMatchObject({ lessonId: "u1l2", exerciseId: "c" });
  });
  it("checkpoint pass unlocks unit 2", () => {
    const scores = new Map([["a", 80], ["b", 70], ["c", 90], ["q1", 65]]);
    const { units, continue: cont } = derivePath(LESSONS, scores);
    expect(units[1].unlocked).toBe(true);
    expect(units[1].lessons[0].status).toBe("current");
    expect(cont).toMatchObject({ lessonId: "u2l1", exerciseId: "d" });
  });
  it("all done → continue null", () => {
    const scores = new Map([["a", 80], ["b", 70], ["c", 90], ["q1", 65], ["d", 100]]);
    const { units, continue: cont } = derivePath(LESSONS, scores);
    expect(cont).toBeNull();
    expect(units.every((u) => u.lessons.every((l) => l.status === "done"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run, verify fail** — `npx vitest run src/lib/path.test.ts` → module not found.

- [ ] **Step 3: Implement `src/lib/path.ts`**

Implement `derivePath` per the rules (group lessons by unit, sort by `unit, order`; single pass computing statuses and the continue pointer), then:

```ts
import { db } from "@/lib/db";

export async function buildPathForStudent(studentId: string, level: string | null): Promise<PathResponse> {
  if (!level) return { placed: false, level: null, units: [], continue: null };
  const lessons = await db.lesson.findMany({
    where: { classId: null, level },
    orderBy: [{ unit: "asc" }, { order: "asc" }],
    include: { exercises: { select: { id: true, title: true, type: true } } },
  });
  const results = await db.exerciseResult.groupBy({
    by: ["exerciseId"],
    where: { studentId },
    _max: { score: true },
  });
  const best = new Map(results.map((r) => [r.exerciseId, r._max.score ?? 0]));
  const { units, continue: cont } = derivePath(lessons, best);
  return { placed: true, level, units, continue: cont };
}
```

`src/app/api/path/route.ts`:

```ts
import { requireStudent } from "@/lib/guard";
import { buildPathForStudent } from "@/lib/path";
import { handleApiError } from "@/lib/api-helpers"; // if no such helper exists, mirror the try/catch + NextResponse.json error pattern used in src/app/api/exercises/route.ts exactly

export async function GET() {
  try {
    const user = await requireStudent();
    const path = await buildPathForStudent(user.id, user.level ?? null);
    return Response.json(path);
  } catch (err) {
    /* mirror exercises/route.ts error handling (ApiError → status, else 500) */
  }
}
```

(Read `src/app/api/exercises/route.ts` first and copy its exact guard/error idiom — do not invent a new one; if it uses a shared helper, use that.)

- [ ] **Step 4: Run tests** — `npx vitest run src/lib/path.test.ts && npm test` → green. `npm run build` → success.

- [ ] **Step 5: Commit**

```bash
git add src/lib/path.ts src/lib/path.test.ts src/app/api/path
git commit -m "feat(path): derive lesson/unit progression and GET /api/path"
```

---

### Task 4: Level-default exercise listing

**Files:**
- Modify: `src/app/api/exercises/route.ts:171-244` (GET, student branch)
- Test: `tests/exercises-level-filter.test.ts`

**Interfaces:**
- Produces: for students, when NO `difficulty` query is given, the list is filtered to `difficulty = user.level` (if the user has a level). Explicit `difficulty=ALL` returns everything; explicit valid difficulty behaves as today. Teachers unaffected.

- [ ] **Step 1: Write the failing test**

`tests/exercises-level-filter.test.ts` — use the direct-lib style (route handlers are hard to invoke without HTTP; test the where-clause behavior through a small exported helper):

Refactor first: in `src/app/api/exercises/route.ts`, extract the student where-clause construction into an exported pure function:

```ts
export function studentExerciseWhere(params: { type?: string | null; difficulty?: string | null; userLevel?: string | null }) {
  const where: { type?: string; difficulty?: string } = {};
  if (params.type) where.type = params.type;
  if (params.difficulty && params.difficulty !== "ALL") where.difficulty = params.difficulty;
  else if (!params.difficulty && params.userLevel) where.difficulty = params.userLevel;
  return where;
}
```

Test:

```ts
import { describe, it, expect } from "vitest";
import { studentExerciseWhere } from "@/app/api/exercises/route";

describe("studentExerciseWhere", () => {
  it("defaults to the user's level when no difficulty given", () => {
    expect(studentExerciseWhere({ userLevel: "BEGINNER" })).toEqual({ difficulty: "BEGINNER" });
  });
  it("ALL bypasses the default", () => {
    expect(studentExerciseWhere({ difficulty: "ALL", userLevel: "BEGINNER" })).toEqual({});
  });
  it("explicit difficulty wins", () => {
    expect(studentExerciseWhere({ difficulty: "ADVANCED", userLevel: "BEGINNER" })).toEqual({ difficulty: "ADVANCED" });
  });
  it("unplaced user gets everything", () => {
    expect(studentExerciseWhere({})).toEqual({});
  });
  it("keeps the type filter", () => {
    expect(studentExerciseWhere({ type: "QUIZ", userLevel: "ADVANCED" })).toEqual({ type: "QUIZ", difficulty: "ADVANCED" });
  });
});
```

- [ ] **Step 2: Run, verify fail** (export doesn't exist yet).

- [ ] **Step 3: Implement** — add the helper, use it in the student branch (`studentExerciseWhere({ type, difficulty, userLevel: user.level })`; validate `difficulty` against `LEVELS ∪ {"ALL"}` — update the existing validation so `ALL` isn't rejected). Teacher branch unchanged.

- [ ] **Step 4: Run** — `npx vitest run tests/exercises-level-filter.test.ts && npm test && npm run build` → green.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/exercises/route.ts tests/exercises-level-filter.test.ts
git commit -m "feat(practice): student exercise list defaults to placement level"
```

---

### Task 5: Recommendation lib + endpoint — TDD

**Files:**
- Create: `src/lib/recommend.ts`, `src/lib/recommend.test.ts`, `src/app/api/exercises/recommend/route.ts`

**Interfaces:**
- Produces (exact):

```ts
export interface Recommendation { id: string; title: string; type: string; difficulty: string; }
// pure core:
export function pickNextExercise(opts: {
  candidates: Array<{ id: string; title: string; type: string; difficulty: string }>; // uncompleted, at user level, excluding current
  lastType: string | null;
  weakestCategory: string | null;   // lowest Progress skill category (GRAMMAR|VOCABULARY|TRANSLATION|LISTENING|SPEAKING)
}): Recommendation | null;
// db-backed:
export async function recommendForStudent(studentId: string, level: string | null, excludeId?: string): Promise<Recommendation | null>;
```

**Rules:** map `weakestCategory` to exercise types via the inverse of `categoriesForType` (GRAMMAR→GRAMMAR+QUIZ, VOCABULARY→VOCABULARY+QUIZ, TRANSLATION→TRANSLATION, LISTENING→LISTENING, SPEAKING→CONVERSATION+PICTURE+STORY). Priority: (1) a candidate whose type serves `weakestCategory`; (2) a candidate matching `lastType`; (3) any candidate. Within each bucket pick the first by stable input order. Return null when no candidates.

- [ ] **Step 1: Failing tests**

`src/lib/recommend.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { pickNextExercise } from "@/lib/recommend";

const c = (id: string, type: string) => ({ id, title: id, type, difficulty: "BEGINNER" });

describe("pickNextExercise", () => {
  it("prefers the weakest skill's types", () => {
    const out = pickNextExercise({
      candidates: [c("a", "GRAMMAR"), c("b", "LISTENING")],
      lastType: "GRAMMAR",
      weakestCategory: "LISTENING",
    });
    expect(out?.id).toBe("b");
  });
  it("falls back to same-type continuity", () => {
    const out = pickNextExercise({
      candidates: [c("a", "VOCABULARY"), c("b", "GRAMMAR")],
      lastType: "GRAMMAR",
      weakestCategory: null,
    });
    expect(out?.id).toBe("b");
  });
  it("QUIZ serves grammar weakness", () => {
    const out = pickNextExercise({
      candidates: [c("a", "STORY"), c("q", "QUIZ")],
      lastType: null,
      weakestCategory: "GRAMMAR",
    });
    expect(out?.id).toBe("q");
  });
  it("any candidate as last resort; null when none", () => {
    expect(pickNextExercise({ candidates: [c("x", "PICTURE")], lastType: null, weakestCategory: null })?.id).toBe("x");
    expect(pickNextExercise({ candidates: [], lastType: "QUIZ", weakestCategory: "GRAMMAR" })).toBeNull();
  });
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement** — pure function per rules; `recommendForStudent` loads: uncompleted-at-level candidates (exercises at `difficulty = level` — or all when level null — minus ids the student already passed at ≥ `PASS_SCORE`, minus `excludeId`; order `createdAt asc` for stability), student's lowest skill category from `Progress` (exclude OVERALL; null when no rows), and `lastType` from the student's most recent `ExerciseResult` (via its exercise). Route `src/app/api/exercises/recommend/route.ts`: `GET` with optional `?exclude=<id>`, `requireStudent()`, returns `{ recommendation: Recommendation | null }`, same error idiom as other routes.

- [ ] **Step 4: Run all gates.** `npm test && npm run build && npx tsc --noEmit` → green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/recommend.ts src/lib/recommend.test.ts src/app/api/exercises/recommend
git commit -m "feat(practice): weakest-skill exercise recommendation endpoint"
```

---

### Task 6: Results springboard (`Next:` CTA)

**Files:**
- Modify: `src/components/exercise/results-screen.tsx:14-30` (props), `src/app/(dashboard)/student/exercises/[id]/exercise-player-screen.tsx`
- Test: `src/components/exercise/results-screen.test.tsx`

**Interfaces:**
- Consumes: `Recommendation` (Task 5), `PathResponse.continue` (Task 3).
- Produces: `ResultsScreen` accepts a new optional prop `next?: { label: string; href: string } | null`. When present it renders the PRIMARY action (Button `brand` wrapped in a Link, `nativeButton={false}` — copy the marketing-page composition pattern) above/before retry & back (both stay `ghost`).

- [ ] **Step 1: Failing component test**

`src/components/exercise/results-screen.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { ResultsScreen } from "./results-screen";
import en from "../../../messages/en.json";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const result = {
  score: 80, xpEarned: 8,
  feedback: { overall: "Nice work" },
  gamification: { xp: 108, streak: 3, levelUp: false, level: "BEGINNER", skills: {} },
};

describe("ResultsScreen springboard", () => {
  it("renders the next CTA as a link when provided", () => {
    render(
      <LocaleProvider locale="en" messages={en}>
        <ResultsScreen result={result as never} next={{ label: "Next: Word power", href: "/student/exercises/x" }} />
      </LocaleProvider>,
    );
    const link = screen.getByRole("link", { name: /Next: Word power/ });
    expect(link.getAttribute("href")).toBe("/student/exercises/x");
  });
  it("renders no next CTA when absent", () => {
    render(
      <LocaleProvider locale="en" messages={en}>
        <ResultsScreen result={result as never} />
      </LocaleProvider>,
    );
    expect(screen.queryByRole("link", { name: /Next:/ })).toBeNull();
  });
});
```

- [ ] **Step 2: Run, verify fail.**

- [ ] **Step 3: Implement**

- `results-screen.tsx`: add `next` to the props type; render before the retry/back row:

```tsx
{next ? (
  <Button nativeButton={false} render={<Link href={next.href} />} className="w-full sm:w-auto">
    {next.label}
  </Button>
) : null}
```

(import `Link` from `next/link`; Button default variant is `brand` — the primary.)
- `exercise-player-screen.tsx`: after a successful submit, fetch the follow-up in parallel: if the exercise belongs to a curriculum lesson (add `lessonId` to what `/api/exercises/[id]` returns if absent — check the route; it returns the full row, so `lessonId` is already there), call `api<PathResponse>("/api/path")` and use `continue` (label `t("results.nextLesson", { title })` → "Next: {title}"); otherwise call `/api/exercises/recommend?exclude=<id>` and use the recommendation (label `t("results.nextPractice", { title })`). Store as `next` state; pass to `<ResultsScreen next={...}>`. When both return null, pass null. New catalog keys (BOTH files): `"results.nextLesson": "Next: {title}"` / `"التالي: {title}"`, `"results.nextPractice": "Next up: {title}"` / `"التالي: {title}"`.

- [ ] **Step 4: Run gates.** `npm test && npm run build` → green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(practice): results screens point to the next exercise"
```

---

### Task 7: Mini-placement scoring + `?mode=mini` — TDD

**Files:**
- Modify: `src/lib/placement-questions.ts`, `src/app/api/placement/route.ts`
- Test: `src/lib/placement-questions.test.ts`

**Interfaces:**
- Produces (exact):

```ts
export const MINI_QUESTION_IDS = ["g1", "g4", "v1", "v5", "r1"] as const;
export function miniQuestions(): PublicPlacementQuestion[];        // the 5, stripped of answer/weight
export function scorePlacementSubset(
  answers: Record<string, string>,
  ids: readonly string[],
): { score: number; level: Level };  // weighted % over ONLY the given ids; same thresholds (>=70 ADVANCED, >=40 INTERMEDIATE, else BEGINNER)
```

- API: `GET /api/placement?mode=mini` → `{ questions: miniQuestions(), taken, lastResult }`; `POST /api/placement` with body `{ answers, mode: "mini" }` → scores via `scorePlacementSubset`, sets `user.level`, creates a `PlacementExam` row with `answers: JSON.stringify({ mini: true, answers })`, does NOT touch Progress and awards NO XP bonus, returns `{ score, level, mini: true }`. Full-exam behavior unchanged.

- [ ] **Step 1: Failing tests**

`src/lib/placement-questions.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { MINI_QUESTION_IDS, miniQuestions, scorePlacementSubset, PLACEMENT_QUESTIONS } from "@/lib/placement-questions";

describe("mini placement", () => {
  it("serves exactly the 5 configured questions without answers", () => {
    const qs = miniQuestions();
    expect(qs.map((q) => q.id)).toEqual([...MINI_QUESTION_IDS]);
    for (const q of qs) expect("answer" in q).toBe(false);
  });
  it("all correct → ADVANCED, none correct → BEGINNER", () => {
    const byId = new Map(PLACEMENT_QUESTIONS.map((q) => [q.id, q]));
    const allRight: Record<string, string> = {};
    for (const id of MINI_QUESTION_IDS) allRight[id] = byId.get(id)!.answer;
    expect(scorePlacementSubset(allRight, MINI_QUESTION_IDS)).toMatchObject({ score: 100, level: "ADVANCED" });
    expect(scorePlacementSubset({}, MINI_QUESTION_IDS).level).toBe("BEGINNER");
  });
  it("scores over the subset only (unlisted answers ignored)", () => {
    const byId = new Map(PLACEMENT_QUESTIONS.map((q) => [q.id, q]));
    const answers = { g1: byId.get("g1")!.answer, g9: "whatever" };
    const { score } = scorePlacementSubset(answers, MINI_QUESTION_IDS);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });
});
```

(If `PLACEMENT_QUESTIONS` isn't currently exported, export it — read the file first and keep existing exports intact.)

- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement** lib additions (weighted scoring identical to `scorePlacement` but iterating only `ids`), then route changes per the interface (validate `mode` ∈ {undefined, "mini"}; mini POST validates that all answered ids ∈ MINI_QUESTION_IDS).
- [ ] **Step 4: Run gates** — `npm test && npm run build` → green.
- [ ] **Step 5: Commit**

```bash
git add src/lib/placement-questions.ts src/lib/placement-questions.test.ts src/app/api/placement/route.ts
git commit -m "feat(onboarding): 5-question mini-placement mode"
```

---

### Task 8: Onboarding wizard `/student/onboarding`

**Files:**
- Create: `src/app/(dashboard)/student/onboarding/page.tsx`
- Modify: `src/app/(auth)/signup/page.tsx` (student redirect), `messages/en.json` + `messages/ar.json`

**Interfaces:**
- Consumes: `GET /api/placement?mode=mini`, `POST /api/placement {answers, mode:"mini"}`, `GET /api/path` (for the first exercise).
- Produces: a client page with three stages — `welcome` (one card: what happens next, Start button, "skip for now" ghost link → `/student`), `quiz` (5 questions one-at-a-time, same option-button pattern as the placement page, no timer), `done` (level badge + primary Button "Start your first lesson" → `continue.exerciseId` from `/api/path`, ghost "Go to my path" → `/student`). Already-placed users are redirected to `/student` on mount.

- [ ] **Step 1: Add catalog keys (BOTH files)**

```json
"onboarding.title": "Let's find your level",
"onboarding.subtitle": "Answer 5 quick questions so your path fits you. It takes about a minute.",
"onboarding.start": "Start",
"onboarding.skip": "Skip for now",
"onboarding.doneTitle": "You're all set!",
"onboarding.yourLevel": "Your level",
"onboarding.firstLesson": "Start your first lesson",
"onboarding.goToPath": "Go to my path",
"onboarding.question": "Question {n} of {total}"
```

Arabic: `"لنحدد مستواك"`, `"أجب عن 5 أسئلة سريعة ليناسبك مسارك. يستغرق الأمر نحو دقيقة."`, `"ابدأ"`, `"تخطَّ الآن"`, `"أنت جاهز!"`, `"مستواك"`, `"ابدأ درسك الأول"`, `"اذهب إلى مساري"`, `"سؤال {n} من {total}"`.

- [ ] **Step 2: Build the page**

Client component; `useT()`; `useApi(() => api<PlacementGetResponse>("/api/placement?mode=mini"), [])`; local `stage/qIndex/answers` state; submit → `api("/api/placement", { method: "POST", body: JSON.stringify({ answers, mode: "mini" }) })`; then `api<PathResponse>("/api/path")` for the CTA target (`/student/exercises/${continue.exerciseId}` — fall back to `/student` when null). Redirect placed users: fetch `/api/me` (or reuse the placement GET's `taken`+`lastResult`)… simplest: `useApi(() => api<MeResponse>("/api/me"))`; `useEffect` → if `user.level` push `/student`. Styling: sticker card, `Button` brand for primary, progress dots like the exercise segments, everything through `t()`.

- [ ] **Step 3: Signup redirect**

In `src/app/(auth)/signup/page.tsx`, change the post-signup student redirect from `/student` to `/student/onboarding` (teacher redirect unchanged).

- [ ] **Step 4: Verify**

`npm run build && npx tsc --noEmit && npm test` green. Dev server: fresh student signup lands on onboarding; completing the 5 questions assigns a level (check toast/DB) and the CTA opens a real exercise. `grep -n "hardcoded" nothing — all strings via t()`; run `npx vitest run src/lib/i18n.test.ts` (key parity).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(onboarding): mini-placement wizard, students land there after signup"
```

---

### Task 9: Learn home — the Path replaces the dashboard

**Files:**
- Rewrite: `src/app/(dashboard)/student/page.tsx`
- Modify: `src/components/shared/sidebar.tsx:40-46` (studentNav), `src/components/shared/sidebar.test.tsx` (nav expectations), `messages/en.json` + `messages/ar.json`

**Interfaces:**
- Consumes: `GET /api/path` (`PathResponse`), `GET /api/me` (streak/xp for header chips).
- Produces: `/student` renders the Path. Old dashboard sections move out (stats → Task 13 Progress page; join-class → Task 10 Classes page) — this page must NOT keep them.

- [ ] **Step 1: Catalog keys (BOTH files)**

```json
"nav.learn": "Learn", "nav.practice": "Practice", "nav.myClasses": "Classes", "nav.progress": "Progress",
"path.greeting": "Welcome back, {name}!",
"path.continue": "Continue",
"path.start": "Start",
"path.unit": "Unit {n}",
"path.checkpoint": "Checkpoint",
"path.checkpointHint": "Pass to unlock the next unit",
"path.locked": "Locked",
"path.done": "Done",
"path.completeBanner": "You've finished your path — more units are coming. Keep practicing!",
"path.placementCardTitle": "Find your level",
"path.placementCardBody": "Answer 5 quick questions to unlock your personal path.",
"path.streakDays": "{n} day streak",
"path.xp": "{n} XP"
```

Arabic: `"تعلّم"`, `"تدرّب"`, `"صفوفي"`, `"تقدّمي"`, `"أهلاً بعودتك يا {name}!"`, `"أكمل"`, `"ابدأ"`, `"الوحدة {n}"`, `"اختبار الوحدة"`, `"اجتَزْه لفتح الوحدة التالية"`, `"مقفل"`, `"مكتمل"`, `"أنهيت مسارك — وحدات جديدة قادمة. واصل التدريب!"`, `"حدد مستواك"`, `"أجب عن 5 أسئلة سريعة لفتح مسارك الشخصي."`, `"سلسلة {n} يوم"`, `"{n} نقطة"`.

- [ ] **Step 2: Rebuild the page**

Structure (all tokens, all `t()`, framer-motion stagger like the old page):
1. Header row: `path.greeting` (+ first name from `/api/me`) + `Badge variant="streak"` (flame lucide + `path.streakDays`) + `Badge variant="xp"`.
2. **Unplaced state** (`!path.placed`): one sticker card = `path.placementCardTitle/Body` + brand Button → `/student/onboarding`. Below it, a preview of Unit 1 rendered fully locked. Nothing else.
3. **Continue card** (when `path.continue`): `bg-primary text-primary-foreground rounded-card shadow-press-brand p-6` — eyebrow `path.continue`, exercise title (English content — wrap title span in `dir="ltr"`), lesson title as meta, `Button variant="sun"` `path.start` → `/student/exercises/${continue.exerciseId}`.
4. **Units**: for each `PathUnit` — heading `path.unit` + title-less (unit titles aren't in the API; heading is `t("path.unit", {n})`), then a vertical node list per lesson: 44px round node (done = `bg-primary text-primary-foreground` + Check icon; current = `bg-card border-2 border-primary text-primary` + Star icon; locked = `bg-muted text-muted-foreground` + Lock icon; checkpoint nodes are `rounded-btn bg-sun-soft border-sun text-sun-deep` + Flag icon), connecting 4px stem (`bg-primary/50` above done nodes, `bg-border` otherwise), lesson title + per-exercise chips (each exercise: small pill with title `dir="ltr"`, leaf check when completed; current lesson's uncompleted exercises link to the player, locked lessons don't link).
5. All-done state: `path.completeBanner` card when `placed && !continue`.
6. Skeleton while loading (reuse the existing skeleton pattern).

- [ ] **Step 3: Sidebar nav swap**

```ts
const studentNav: NavItem[] = [
  { key: "nav.learn", href: "/student", icon: Route },
  { key: "nav.practice", href: "/student/practice", icon: PencilLine },
  { key: "nav.myClasses", href: "/student/classes", icon: BookOpen },
  { key: "nav.progress", href: "/student/progress", icon: LineChart },
];
```

(import `Route`, `LineChart` from lucide-react; remove now-unused student icons.) Update `sidebar.test.tsx`: the Arabic student-nav assertion changes from `التمارين` to `تدرّب` (and the English teacher test stays). Active-state logic: `/student` must only be active on exact match (it already is — `pathname === item.href`).

- [ ] **Step 4: Verify**

Gates green (`npm test` — sidebar + i18n parity tests updated). Dev server: placed student sees Continue card + nodes; unplaced sees the placement card; RTL pass — toggle to Arabic, node stems/labels flip correctly, exercise titles stay LTR.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(path)!: /student home is the learning path; student nav becomes Learn/Practice/Classes/Progress"
```

---

### Task 10: `/student/classes` (join + list, moved off the dashboard)

**Files:**
- Create: `src/app/(dashboard)/student/classes/page.tsx`
- Modify: `messages/en.json` + `messages/ar.json`

**Interfaces:**
- Consumes: `GET /api/classes` (`ClassSummary[]`), `POST /api/classes/join {code}` — both exist; reuse the old dashboard's join handler logic (`src/app/(dashboard)/student/page.tsx` pre-rewrite; recover it from git history `git show 224f3bd:src/app/\(dashboard\)/student/page.tsx` if already rewritten).
- Produces: page with (1) join-by-code sticker card (6-char uppercase input, brand Button, toast on success + refetch), (2) class list (name, teacher, level Badge, link to `/student/sessions`), (3) empty state inviting the student to ask their teacher for a code.

- [ ] **Step 1: Catalog keys (BOTH files)**

```json
"classes.title": "My classes",
"classes.joinTitle": "Join a class",
"classes.joinBody": "Enter the 6-character code from your teacher.",
"classes.codePlaceholder": "ABC123",
"classes.join": "Join",
"classes.joined": "You joined {name}!",
"classes.empty": "No classes yet. Ask your teacher for a join code.",
"classes.teacherLabel": "Teacher: {name}",
"classes.viewSessions": "Live sessions"
```

Arabic: `"صفوفي"`, `"انضم إلى صف"`, `"أدخل الرمز المكوّن من 6 أحرف من معلمك."`, `"ABC123"`, `"انضم"`, `"انضممت إلى {name}!"`, `"لا صفوف بعد. اطلب رمز الانضمام من معلمك."`, `"المعلم: {name}"`, `"الجلسات المباشرة"`.

- [ ] **Step 2: Build the page** (client; useApi + useT; sticker cards; all strings via t()).

- [ ] **Step 3: Verify + commit**

Gates green; dev-server: join flow works end-to-end with a teacher-created class.

```bash
git add -A
git commit -m "feat(student): classes page with join-by-code, moved off the dashboard"
```

---

### Task 11: `/student/practice` — URL-filtered library + redirects

**Files:**
- Create: `src/app/(dashboard)/student/practice/page.tsx`
- Rewrite as redirects: `src/app/(dashboard)/student/exercises/page.tsx`, `src/app/(dashboard)/student/ai-chat/page.tsx`
- Modify: `messages/en.json` + `messages/ar.json`

**Interfaces:**
- Consumes: `GET /api/exercises?type=&difficulty=` (Task 4 defaults), old library card patterns from `src/app/(dashboard)/student/exercises/page.tsx` (reuse `EXERCISE_TYPE_META`, counts logic — move them here).
- Produces: `/student/practice` with filters in the URL: `?type=GRAMMAR|...|CONVERSATION|ALL` and `?difficulty=BEGINNER|INTERMEDIATE|ADVANCED|ALL` (absent difficulty = server default to user level). Filter chips update via `router.replace` with new searchParams (no full navigation); back button restores filters. CONVERSATION cards link to `/student/practice/conversation/[id]` (Task 12); all other cards to `/student/exercises/[id]`.

- [ ] **Step 1: Catalog keys (BOTH files)**

```json
"practice.title": "Practice",
"practice.subtitle": "Pick any exercise — your level is selected for you.",
"practice.all": "All",
"practice.myLevel": "My level",
"practice.allLevels": "All levels",
"practice.completed": "Completed",
"practice.best": "Best {score}%",
"practice.empty": "No exercises match these filters."
```

Arabic: `"تدرّب"`, `"اختر أي تمرين — مستواك محدد تلقائيًا."`, `"الكل"`, `"مستواي"`, `"كل المستويات"`, `"مكتمل"`, `"أفضل نتيجة {score}%"`, `"لا تمارين تطابق هذه التصفية."`.

- [ ] **Step 2: Build the page**

Client component wrapped in `<Suspense>` (uses `useSearchParams` — copy the signup pattern). Read `type`/`difficulty` from searchParams; fetch `useApi(() => api(`/api/exercises?${qs}`), [type, difficulty])` where `qs` omits absent params (server default kicks in) and passes `difficulty=ALL` when the user picks "All levels". Type filter chips row (the 8 types + All; localized labels can stay the existing English type names — they are content-ish; use the `EXERCISE_TYPE_META` titles as-is) + a level toggle (`practice.myLevel` / `practice.allLevels`). Exercise cards: existing card treatment (title `dir="ltr"`, type + difficulty badges, completed check/best score via `practice.best`).

- [ ] **Step 3: Redirects**

`src/app/(dashboard)/student/exercises/page.tsx` becomes a server component:

```tsx
import { redirect } from "next/navigation";
export default function ExercisesRedirect() {
  redirect("/student/practice");
}
```

`src/app/(dashboard)/student/ai-chat/page.tsx` likewise → `redirect("/student/practice?type=CONVERSATION")`. (`/student/exercises/[id]` player pages remain untouched.)

- [ ] **Step 4: Verify + commit**

Gates green. Dev: filters round-trip through the URL (copy URL → same view; browser back restores previous filter); default list = user level only; ALL shows everything.

```bash
git add -A
git commit -m "feat(practice): unified practice library with URL filters; old routes redirect"
```

---

### Task 12: Canonical conversation page + transcript persistence

**Files:**
- Create: `src/app/(dashboard)/student/practice/conversation/[id]/page.tsx`
- Modify: `src/components/exercise/conversation-chat.tsx` (persistence hooks), `messages/en.json` + `messages/ar.json`

**Interfaces:**
- Consumes: `GET /api/exercises/[id]` (`ExerciseFull` with `data.scenario`), `POST /api/exercises/[id]/submit`, ConversationChat's existing props `{exercise, data, onSubmit, submitting}`.
- Produces: a routed page per scenario (linkable/refresh-safe). ConversationChat gains OPTIONAL persistence: new prop `persistKey?: string`; when set, messages initialize from `sessionStorage.getItem(persistKey)` (JSON `LocalMsg[]`, fall back to the scenario opening on parse failure) and every message change writes back; on successful submit the key is cleared. Also a `beforeunload` guard while `messages.length > 1 && !submitted`.

- [ ] **Step 1: Catalog keys (BOTH files)**

```json
"conversation.back": "All scenarios",
"conversation.leaveWarning": "You have an unfinished conversation."
```

Arabic: `"كل السيناريوهات"`, `"لديك محادثة غير مكتملة."`.

- [ ] **Step 2: Build the page**

Server component awaits `params` → renders a client screen (mirror `exercise-player-screen.tsx`'s load/submit/results structure but conversation-only): loads the exercise, renders `<ConversationChat exercise={...} data={...} onSubmit={...} persistKey={`sp-conv-${id}-${userId}`} />` (get userId from `/api/me`; or key on exercise id only — acceptable: `sp-conv-${id}`; choose exercise-id-only for simplicity), on result `<ResultsScreen compact next={...}>` using the recommend endpoint (Task 6 pattern), back link → `/student/practice?type=CONVERSATION`.

- [ ] **Step 3: Persistence in ConversationChat**

Implement `persistKey` exactly as specified (lazy `useState` initializer reading sessionStorage; `useEffect` on `messages` writing; clear on submit success — the parent signals success by unmounting or via the existing `submitting`→result flow; simplest: clear inside `onSubmit` wrapper on the PAGE after the api call resolves). `beforeunload`: register when dirty, message value doesn't matter (browsers show generic text) — still gate on the flag.

- [ ] **Step 4: Verify + commit**

Gates green. Dev: mid-conversation refresh restores the transcript; finishing clears it; deep link works; old ai-chat URL redirects.

```bash
git add -A
git commit -m "feat(practice): routed conversation scenarios with refresh-safe transcripts"
```

---

### Task 13: `/student/progress` + attempt history + mistake review APIs

**Files:**
- Create: `src/app/api/results/route.ts`, `src/app/api/results/[id]/review/route.ts`, `src/app/(dashboard)/student/progress/page.tsx`
- Test: `tests/results-review.test.ts`
- Modify: `messages/en.json` + `messages/ar.json`

**Interfaces:**
- Produces:
  - `GET /api/results?limit=20` (requireStudent) → `{ results: Array<{ id, exerciseId, exerciseTitle, type, score, xpEarned: null, completedAt }> }` ordered `completedAt desc` (join exercise for title/type; cap limit at 50).
  - `GET /api/results/[id]/review` (requireStudent; 404 unless the result belongs to the caller) → `{ score, exerciseTitle, type, items: Array<{ prompt: string; given: string; expected: string | null; correct: boolean; note: string | null }> | null }`. Items are recomputed server-side for objective types (GRAMMAR/LISTENING/QUIZ: re-run the same normalization/compare used by submit — extract the existing `scoreObjectiveItems` comparison into a reusable helper in the submit route's module or a shared lib so review and submit cannot drift; VOCABULARY and AI types return `items: null`).
- Page: stats (the old dashboard's StatCards + SkillBars — recover markup from `git show 224f3bd:...student/page.tsx`), time-aware streak nudge, attempt history list, expandable mistake review per attempt, "Try again" link per attempt, "Refine my level" card linking to `/student/placement`.

- [ ] **Step 1: Failing API test**

`tests/results-review.test.ts` — direct db + handler-logic style: extract the review computation into `export function buildReviewItems(type: string, data: unknown, answers: unknown)` in a new `src/lib/review.ts` and test THAT (pure):

```ts
import { describe, it, expect } from "vitest";
import { buildReviewItems } from "@/lib/review";

const grammarData = {
  items: [
    { id: "i1", kind: "fill-blank", prompt: "She ___ to school.", answer: "goes", explanation: "3rd person -s" },
    { id: "i2", kind: "fill-blank", prompt: "I ___ tea.", answer: "drink" },
  ],
};

describe("buildReviewItems", () => {
  it("marks correct and wrong answers with expected + note", () => {
    const items = buildReviewItems("GRAMMAR", grammarData, { answers: { i1: "goes", i2: "drank" } });
    expect(items).toHaveLength(2);
    expect(items![0]).toMatchObject({ correct: true, given: "goes" });
    expect(items![1]).toMatchObject({ correct: false, given: "drank", expected: "drink" });
    expect(items![0].note).toBe("3rd person -s");
  });
  it("returns null for AI-scored types", () => {
    expect(buildReviewItems("CONVERSATION", {}, {})).toBeNull();
    expect(buildReviewItems("PICTURE", {}, {})).toBeNull();
  });
});
```

BEFORE writing `review.ts`, read `src/app/api/exercises/[id]/submit/route.ts`'s objective-scoring code and reuse its exact normalization (case/trim rules) — the stored `answers` JSON is the raw submit body; mirror how submit reads per-item answers (shape `{ answers: Record<itemId, string> }` for objective types — verify against the actual code and adapt the test fixture to the real shape).

- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement** `src/lib/review.ts`, both routes (review route: load result + exercise, parse JSONs defensively — corrupt rows return `items: null`, never 500), then the page.

Catalog keys (BOTH files):

```json
"progress.title": "My progress",
"progress.streakNudge": "Practice today to keep your {n}-day streak!",
"progress.streakSafe": "Streak safe for today — day {n}.",
"progress.history": "Recent attempts",
"progress.review": "Review mistakes",
"progress.tryAgain": "Try again",
"progress.refineTitle": "Refine my level",
"progress.refineBody": "Take the full placement exam for a more precise level.",
"progress.noHistory": "No attempts yet — start with your path!",
"progress.expected": "Correct answer",
"progress.yourAnswer": "Your answer"
```

Arabic: `"تقدّمي"`, `"تدرّب اليوم لتحافظ على سلسلة {n} يوم!"`, `"سلسلتك آمنة اليوم — اليوم {n}."`, `"المحاولات الأخيرة"`, `"راجع الأخطاء"`, `"حاول مجددًا"`, `"حسّن تحديد مستواك"`, `"خض الاختبار الكامل لتحديد أدق لمستواك."`, `"لا محاولات بعد — ابدأ بمسارك!"`, `"الإجابة الصحيحة"`, `"إجابتك"`.

Streak nudge logic: `GET /api/me` progress OVERALL row's `updatedAt` — if not today (compare local date strings), show `progress.streakNudge` with the current streak, else `progress.streakSafe`. English exercise text in review rows renders `dir="ltr"`.

- [ ] **Step 4: Run gates + verify** (dev: complete an exercise with one wrong answer → progress page shows the attempt → review reveals given vs expected).
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(progress): progress page with attempt history and mistake review"
```

---

### Task 14: Full placement upgrades (persistence, review step, refine framing)

**Files:**
- Modify: `src/app/(dashboard)/student/placement/page.tsx`, `messages/en.json` + `messages/ar.json`

**Interfaces:**
- Consumes: existing `GET/POST /api/placement` (full mode unchanged).
- Produces: (1) per-question persistence — `answers` + `qIndex` mirrored to `localStorage` key `sp-placement-draft` (lazy init from storage; cleared on submit success and on explicit restart); (2) a `review` stage between the last question and submit — grid of all 25 numbers, answered = `bg-secondary text-secondary-foreground`, unanswered = `bg-card border-2 border-line-strong`, click jumps to that question, submit button labeled with unanswered count when > 0; (3) leave-confirmation (`beforeunload` while in `exam` stage with ≥1 answer); (4) framing — when `taken`, the intro headline uses a "refine" key and shows the previous level; (5) distraction-free mode — during `exam` and `review` stages the exam renders inside a `fixed inset-0 z-50 bg-background overflow-y-auto` overlay (covers the sidebar), with an X close button (top corner, `end-4 top-4`, ghost icon Button) that `confirm()`s before returning to intro (draft persists either way).

- [ ] **Step 1: Catalog keys (BOTH files)**

```json
"placement.reviewTitle": "Review your answers",
"placement.unanswered": "{n} unanswered",
"placement.submit": "Submit exam",
"placement.refineTitle": "Refine your level",
"placement.refineBody": "Your current level is {level}. Retaking the full exam updates it.",
"placement.resume": "Resume where you left off"
```

Arabic: `"راجع إجاباتك"`, `"{n} بلا إجابة"`, `"سلّم الاختبار"`, `"حسّن تحديد مستواك"`, `"مستواك الحالي {level}. إعادة الاختبار الكامل تحدّثه."`, `"تابع من حيث توقفت"`.

- [ ] **Step 2: Implement** the four changes in the existing page (small, surgical — the stage machine gains one stage; storage read/write in a `useEffect` pair; intro shows `placement.resume` button when a draft exists).

- [ ] **Step 3: Verify + commit**

Gates green. Dev: answer 3 questions → refresh → resume restores position; review grid navigates; submit clears the draft.

```bash
git add -A
git commit -m "feat(placement): draft persistence, review step, refine-level framing"
```

---

### Task 15: Phase 2 verification

**Files:** none (verify + fix regressions inline).

- [ ] **Step 1: Full gate** — `npm run lint && npx tsc --noEmit && npm run build && npm test` → zero errors, all tests pass.

- [ ] **Step 2: Smoke checklist (dev server; headless-adapt like Phase 1's Task 15 — kill orphan dev servers first, kill yours after)**

1. Fresh student signup → lands on `/student/onboarding` → 5 questions → level assigned → "Start your first lesson" opens a real exercise.
2. `/student` shows the Path: Continue card targets the same exercise; nodes render done/current/locked; Unit 2 locked until Unit 1 checkpoint passed (verify by completing Unit 1's lessons via API submits with score ≥ 60 for a test user, then re-fetch `/api/path`).
3. Completing an in-lesson exercise → results screen primary CTA "Next: …" points to the next path exercise; a free-practice exercise gets a recommendation CTA.
4. `/student/practice?type=QUIZ&difficulty=ALL` round-trips through the URL; default (no params) lists only the student's level.
5. Conversation deep link `/student/practice/conversation/<seed-conversation-restaurant>` loads; mid-chat refresh restores transcript; old `/student/ai-chat` redirects.
6. `/student/progress` shows stats, history, and a working mistake review for a deliberately-wrong grammar attempt.
7. `/student/classes` join-by-code works.
8. Arabic pass: toggle to ar on `/student`, `/student/practice`, `/student/progress`, `/student/onboarding` — full RTL, no hardcoded English chrome (exercise titles/content legitimately English inside LTR islands).
9. `/api/auth/set-role` still 404; placement full exam still works end-to-end (+50 XP once).

- [ ] **Step 3: Fix regressions found, commit** (`fix(path): phase 2 verification fixes` — skip if none).
