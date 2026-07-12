# SpeakPath Redesign — Phase 3: Teacher Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give teachers a class hub with tabs, routed student-detail pages, full-page exercise authoring with draft autosave + editing + AI-generated question drafts, lesson authoring with class assignment, and shareable invite links.

**Architecture:** Add the missing write surface (`PATCH` for exercises/classes, full lesson CRUD) behind a new ownership helper; introduce `Exercise.status` (DRAFT/PUBLISHED) so authoring can autosave without exposing half-built exercises to students; move authoring from the wipe-on-close dialog to full pages backed by server-side draft rows; add one net-new AI helper (`generateExerciseDraft`) following the existing degrade-to-heuristic pattern; convert the student-detail dialog to a route and the class-detail page into a proper tabbed hub. All teacher UI strings move into a new `teacher.*` i18n namespace (greenfield — the teacher surface is currently hardcoded English).

**Tech Stack:** Next.js 16.2.1 (modified), React 19, Tailwind v4 tokens (Phases 1–2), better-auth 1.5.6, Prisma 7/SQLite, OpenAI, vitest (106 tests green at start).

**Spec:** `docs/superpowers/specs/2026-07-11-speakpath-redesign-design.md` §6 (+§8). Phases 1+2 complete on `redesign/v2` at `aa866e5`.

## Global Constraints

- **Next 16 (modified):** `cookies()`/`headers()`/`params`/`searchParams` are async — always `await`. Route-handler `context.params` is a Promise. Client components read params via `useSearchParams()`/`useParams()` inside `<Suspense>` (copy `src/app/(dashboard)/student/onboarding/page.tsx`). Middleware file is `src/proxy.ts` (`export const config`) — do not create `middleware.ts`.
- **Design system (Phases 1–2, mandatory):** tokens only — `bg-card border-2 border-border rounded-card shadow-sticker` cards, `Button` variants `brand|sun|ghost|outline|destructive` from `@/components/ui/button`, `Badge` variants, `text-foreground`/`text-muted-foreground`. Lint bans `text-white/`, raw hex, and physical-direction utilities (`pl-/pr-/ml-/mr-/ml-auto/border-l/border-r/text-left/text-right/left-N/right-N`) — use logical (`ps-/pe-/ms-/me-/border-s/border-e/text-start/text-end/start-/end-`). `Button ... render={<Link/>}` compositions MUST include `nativeButton={false}` and `role="link"`.
- **i18n (mandatory for every new/rebuilt teacher page):** all UI strings via `useT()` from `@/components/providers/locale-provider` with keys added to BOTH `messages/en.json` and `messages/ar.json` (the key-parity test in `src/lib/i18n.test.ts` fails otherwise; Arabic values must be real Arabic). Exercise *content* the teacher types (English learning material) is exempt and renders in `dir="ltr"` islands.
- **Security invariants:** `role`/`level` stay `input:false` in better-auth. Ownership: a teacher may only PATCH/DELETE/read-detail resources they own or (for students) share a class with — enforce via the new `requireOwnedExercise`/`requireOwnedClass` helpers (Task 2), never trust client-supplied ownership. Redaction: `GET /api/exercises/[id]` strips `TRANSLATION.items[].reference` and `PICTURE.scene.description` — the editor must load drafts through a NON-redacting owner path (Task 5) so edits round-trip.
- **Data-fetch conventions:** client `useApi(() => api<T>("/path"), [deps])` from `@/hooks/use-api` + `@/lib/api`; server routes guard with `require*()` from `@/lib/guard`, reply via `errorResponse(err)` and the `{ error }` JSON shape; success shapes mirror existing routes.
- **Exercise `data` shapes are fixed** (verbatim in `src/types/index.ts`): GrammarData/VocabularyData/TranslationData/ListeningData/QuizData/ConversationData/PictureData/StoryData. Server structural validation lives in `validateExerciseData` (`src/app/api/exercises/route.ts`) — reuse it for PATCH and AI-draft validation; do NOT fork it.
- **AI degradation:** `generateExerciseDraft` must follow `src/lib/ai.ts`'s pattern exactly — `aiAvailable()` gate, try/catch around the OpenAI call, `console.error("[ai.xxx]", err)` + deterministic fallback, and an `aiAvailable` boolean in the response. The platform must fully work with a placeholder key.
- Work on branch `redesign/v2`. Commit after every task with the given message + trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`. Per-task done = its tests pass, `npm test` fully green, `npm run build` + `npx tsc --noEmit` succeed, `npm run lint` no new errors.
- **Ledger carry-ins (fold in during the relevant task, not as separate work):** centralize the 4×-duplicated `EXERCISE_TYPE_META` (Task 12); add level-label i18n keys where teacher badges show raw enums (Task 3 seeds them, consumed as pages are built).

## File Structure (created/modified this phase)

```text
prisma/schema.prisma                                  # Exercise.status DRAFT|PUBLISHED
src/lib/guard.ts                                      # requireOwnedExercise / requireOwnedClass / requireSharedStudent
src/lib/guard.test.ts                                 # (new)
src/lib/exercise-meta.ts + exercise-meta.test.ts      # centralized EXERCISE_TYPE_META (new)
src/lib/ai.ts                                         # generateExerciseDraft (new export)
messages/en.json + messages/ar.json                   # teacher.* namespace + level.* labels
src/app/api/exercises/route.ts                        # POST accepts status; GET(teacher) can include drafts
src/app/api/exercises/[id]/route.ts                   # + PATCH; owner GET path (non-redacted) via ?edit=1
src/app/api/exercises/[id]/generate/route.ts          # POST AI draft (new)
src/app/api/classes/[id]/route.ts                     # + PATCH
src/app/api/lessons/route.ts + [id]/route.ts          # lesson CRUD (new)
src/app/api/students/[id]/route.ts                    # unchanged (already read + shared-class guarded); consumed by routed page
src/app/(dashboard)/teacher/students/[id]/page.tsx    # routed student detail (new)
src/app/(dashboard)/teacher/students/page.tsx         # rows link to the route (dialog removed)
src/app/(dashboard)/teacher/content/exercises/new/page.tsx        # (new)
src/app/(dashboard)/teacher/content/exercises/[id]/edit/page.tsx  # (new)
src/components/teacher/exercise-form/exercise-form.tsx            # extracted page form w/ autosave (new, from the dialog)
src/app/(dashboard)/teacher/exercises/page.tsx        # list links to new/edit pages; DRAFT badges
src/app/(dashboard)/teacher/classes/[id]/page.tsx     # hub tabs: Overview|Students|Lessons|Sessions|Settings
src/components/teacher/classes/lessons-tab.tsx        # (new) lesson list + assign
src/components/teacher/classes/class-settings.tsx     # (new) edit name/desc/level
src/components/shared/invite.tsx                      # shareable /join link + QR (new)
src/app/join/page.tsx                                 # public code-prefill join landing (new)
src/components/shared/sidebar.tsx                     # teacherNav + Content entry; i18n subtitle
src/app/(dashboard)/teacher/page.tsx                  # quick actions open real targets; teacher.* i18n
tests/lessons-api.test.ts, tests/exercise-patch.test.ts, tests/ai-draft.test.ts  # (new)
```

Phasing note: Tasks 1–7 are the data/API/i18n foundation; 8–13 are UI; 14 verifies. Each is independently reviewable.

---

### Task 1: `Exercise.status` migration (DRAFT | PUBLISHED)

**Files:** Modify `prisma/schema.prisma` (Exercise model); migration via CLI.

**Interfaces:**
- Produces: `Exercise.status String @default("PUBLISHED")` — existing rows and all current create paths stay PUBLISHED (zero behavior change for students); authoring introduces DRAFT in later tasks. Values: `DRAFT | PUBLISHED`.

- [ ] **Step 1: Edit model** — add after `points`:

```prisma
  status      String   @default("PUBLISHED") // DRAFT | PUBLISHED
```

- [ ] **Step 2: Migrate** — `npx prisma migrate dev --name exercise-status`. Expected: new migration; existing rows backfill to `PUBLISHED` via the column default. If drift is reported, STOP and report (do not reset).
- [ ] **Step 3: Verify** — `npx tsc --noEmit && npm test` (106) + `npm run build`. Green (nothing reads status yet).
- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(teacher): add Exercise.status for authoring drafts"
```

---

### Task 2: Ownership guard helpers — TDD

**Files:** Modify `src/lib/guard.ts`; Create `src/lib/guard.test.ts`.

**Interfaces:**
- Consumes: `db` from `@/lib/db`, existing `ApiError`, `requireTeacher`.
- Produces (exact):

```ts
export async function requireOwnedExercise(id: string): Promise<{ user: SessionUser; exercise: Exercise }>;
export async function requireOwnedClass(id: string): Promise<{ user: SessionUser; klass: Class }>;
```

Each calls `requireTeacher()`, loads the row, throws `ApiError(404, ...)` if missing OR not owned (`createdById`/`teacherId !== user.id`) — a 404 (not 403) so non-owners can't probe existence. `Exercise`/`Class` are the Prisma model types from `@/generated/prisma/client`.

- [ ] **Step 1: Failing test** `src/lib/guard.test.ts`:

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireOwnedExercise, requireOwnedClass } from "@/lib/guard";
import { headers as nextHeaders } from "next/headers";

// Helper: sign up a teacher, return a Cookie header for AsyncLocalStorage-based getSessionUser.
// NOTE: guard.ts reads the session via headers() — these tests must run the calls inside a
// request-like context. If that is not feasible in vitest (headers() has no store), the
// implementer MUST instead test the OWNERSHIP LOGIC by extracting a pure helper
// `assertOwned(row, userId, kind)` and unit-testing THAT, and cover the require* wrappers
// via the route integration tests in later tasks. Choose whichever runs; state the choice
// in the report. Do NOT weaken the ownership assertions to make a test pass.
```

Because `getSessionUser()` depends on `headers()` (no store in plain vitest), implement ownership as a pure, exported, directly-tested core plus thin `require*` wrappers:

```ts
export function assertOwned<T extends { } >(row: T | null, ownerField: keyof T & string, userId: string): T {
  if (!row || (row as Record<string, unknown>)[ownerField] !== userId) {
    throw new ApiError(404, "Not found");
  }
  return row;
}
```

Test `assertOwned` directly: owned row returns row; null → throws 404; wrong owner → throws 404 (assert `err.status === 404`).

- [ ] **Step 2: Run, verify fail** — `npx vitest run src/lib/guard.test.ts` → module/export missing.
- [ ] **Step 3: Implement** — add `assertOwned` and the two `require*` wrappers:

```ts
export async function requireOwnedExercise(id: string) {
  const user = await requireTeacher();
  const exercise = assertOwned(await db.exercise.findUnique({ where: { id } }), "createdById", user.id);
  return { user, exercise };
}
export async function requireOwnedClass(id: string) {
  const user = await requireTeacher();
  const klass = assertOwned(await db.class.findUnique({ where: { id } }), "teacherId", user.id);
  return { user, klass };
}
```

- [ ] **Step 4: Run** — `npm test` green.
- [ ] **Step 5: Commit**

```bash
git add src/lib/guard.ts src/lib/guard.test.ts
git commit -m "feat(teacher): ownership guard helpers (assertOwned + require* wrappers)"
```

---

### Task 3: `teacher.*` + `level.*` i18n namespace foundation

**Files:** Modify `messages/en.json`, `messages/ar.json`.

**Interfaces:**
- Produces: a `teacher.*` key namespace covering nav/dashboard/classes-hub/students/authoring/lessons/invite chrome and `level.beginner|intermediate|advanced` labels, present in BOTH catalogs (parity test enforces). Later UI tasks CONSUME these and add any they still need to both files.

- [ ] **Step 1: Add keys to BOTH files.** Seed this base set (each task may append more — always to both files):

```json
"level.beginner": "Beginner", "level.intermediate": "Intermediate", "level.advanced": "Advanced",
"teac.dashboardTitle": "Teacher dashboard",
"teacher.quickCreateClass": "Create a class",
"teacher.quickCreateExercise": "Create an exercise",
"teacher.quickStartSession": "Start a session",
"teacher.statStudents": "Students", "teacher.statClasses": "Classes", "teacher.statSessions": "Live sessions", "teacher.statExercises": "Exercises",
"teacher.recentActivity": "Recent activity", "teacher.noActivity": "No sessions yet.",
"teacher.tabOverview": "Overview", "teacher.tabStudents": "Students", "teacher.tabLessons": "Lessons", "teacher.tabSessions": "Sessions", "teacher.tabSettings": "Settings",
"teacher.roster": "Roster", "teacher.rosterEmpty": "No students yet — share the join code.",
"teacher.editClass": "Class settings", "teacher.className": "Class name", "teacher.classDescription": "Description", "teacher.classLevel": "Level", "teacher.saveChanges": "Save changes", "teacher.classUpdated": "Class updated",
"teacher.dangerZone": "Danger zone", "teacher.deleteClass": "Delete class",
"teacher.newExercise": "New exercise", "teacher.editExercise": "Edit exercise", "teacher.draft": "Draft", "teacher.published": "Published",
"teacher.saveDraft": "Save draft", "teacher.publish": "Publish", "teacher.draftSaved": "Draft saved", "teacher.published_toast": "Exercise published",
"teacher.generateAi": "Generate with AI", "teacher.aiTopic": "Topic", "teacher.aiGenerate": "Generate", "teacher.aiUnavailable": "AI is offline — a starter template was inserted.", "teacher.aiFilled": "Draft generated — review and edit.",
"teacher.lessons": "Lessons", "teacher.newLesson": "New lesson", "teacher.lessonTitle": "Lesson title", "teacher.lessonUnit": "Unit", "teacher.lessonOrder": "Order", "teacher.assignExercises": "Assigned exercises", "teacher.lessonSaved": "Lesson saved", "teacher.deleteLesson": "Delete lesson", "teacher.noLessons": "No lessons yet.",
"teacher.invite": "Invite students", "teacher.inviteLink": "Invite link", "teacher.copyLink": "Copy link", "teacher.linkCopied": "Invite link copied", "teacher.orCode": "or share the code",
"nav.content": "Content"
```

(Fix the obvious typo — use `teacher.dashboardTitle`, not `teac.`.) Arabic values (same keys): `"مبتدئ"`, `"متوسط"`, `"متقدّم"`, `"لوحة المعلم"`, `"أنشئ صفًا"`, `"أنشئ تمرينًا"`, `"ابدأ جلسة"`, `"الطلاب"`, `"الصفوف"`, `"الجلسات المباشرة"`, `"التمارين"`, `"النشاط الأخير"`, `"لا جلسات بعد."`, `"نظرة عامة"`, `"الطلاب"`, `"الدروس"`, `"الجلسات"`, `"الإعدادات"`, `"القائمة"`, `"لا طلاب بعد — شارك رمز الانضمام."`, `"إعدادات الصف"`, `"اسم الصف"`, `"الوصف"`, `"المستوى"`, `"حفظ التغييرات"`, `"تم تحديث الصف"`, `"منطقة الخطر"`, `"حذف الصف"`, `"تمرين جديد"`, `"تعديل التمرين"`, `"مسودة"`, `"منشور"`, `"حفظ المسودة"`, `"نشر"`, `"تم حفظ المسودة"`, `"تم نشر التمرين"`, `"إنشاء بالذكاء الاصطناعي"`, `"الموضوع"`, `"إنشاء"`, `"الذكاء الاصطناعي غير متاح — تم إدراج قالب مبدئي."`, `"تم إنشاء المسودة — راجعها وعدّلها."`, `"الدروس"`, `"درس جديد"`, `"عنوان الدرس"`, `"الوحدة"`, `"الترتيب"`, `"التمارين المسندة"`, `"تم حفظ الدرس"`, `"حذف الدرس"`, `"لا دروس بعد."`, `"ادعُ الطلاب"`, `"رابط الدعوة"`, `"انسخ الرابط"`, `"تم نسخ رابط الدعوة"`, `"أو شارك الرمز"`, `"المحتوى"`.

- [ ] **Step 2: Verify parity** — `npx vitest run src/lib/i18n.test.ts` green (identical key sets, no empties).
- [ ] **Step 3: Commit**

```bash
git add messages/en.json messages/ar.json
git commit -m "feat(i18n): teacher.* namespace + level labels"
```

---

### Task 4: Centralize `EXERCISE_TYPE_META` (ledger carry-in) — TDD

**Files:** Create `src/lib/exercise-meta.ts`, `src/lib/exercise-meta.test.ts`; modify the 4 current definers to re-export/import (`src/app/(dashboard)/teacher/exercises/page.tsx`, `src/components/teacher/badges.tsx`, `src/components/teacher/exercise-form/exercise-form-dialog.tsx`, `src/app/(dashboard)/student/practice/page.tsx`).

**Interfaces:**
- Produces: `export const EXERCISE_TYPE_META: Record<ExerciseType, { label: string; icon: LucideIcon; blurb: string }>` and `export const EXERCISE_TYPES: ExerciseType[]` in one module. (Read the 4 existing copies first; unify to the SUPERSET of fields they use — if they diverge, keep every field any copy needs. `label`/`blurb` are English content-ish strings, acceptable un-i18n'd like today.)

- [ ] **Step 1: Failing test** — assert the module exports all 8 types with non-empty label + a component icon:

```ts
import { describe, it, expect } from "vitest";
import { EXERCISE_TYPE_META, EXERCISE_TYPES } from "@/lib/exercise-meta";
describe("exercise-meta", () => {
  it("covers all 8 exercise types", () => {
    expect(EXERCISE_TYPES).toHaveLength(8);
    for (const t of EXERCISE_TYPES) {
      expect(EXERCISE_TYPE_META[t].label.length).toBeGreaterThan(0);
      expect(EXERCISE_TYPE_META[t].icon).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement** the module (copy the richest existing definition), then update the 4 files to `import { EXERCISE_TYPE_META, EXERCISE_TYPES } from "@/lib/exercise-meta"` and delete their local copies. Watch for per-file field differences — keep all fields.
- [ ] **Step 4: Run** — `npm test && npm run build && npx tsc --noEmit` green; grep confirms no duplicate `EXERCISE_TYPE_META =` definitions remain outside the new module.
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(teacher): centralize EXERCISE_TYPE_META in one module"
```

---

### Task 5: `PATCH /api/exercises/[id]` + non-redacted owner GET + status on POST — TDD

**Files:** Modify `src/app/api/exercises/[id]/route.ts`, `src/app/api/exercises/route.ts`; Create `tests/exercise-patch.test.ts`.

**Interfaces:**
- Consumes: `requireOwnedExercise` (Task 2), `validateExerciseData` (existing, export it from `exercises/route.ts` if not already), `Exercise.status` (Task 1).
- Produces:
  - `PATCH /api/exercises/[id]` (owner-only via `requireOwnedExercise`): accepts partial `{ title?, difficulty?, data?, points?, timeLimit?, status? }`; re-validates `data` with `validateExerciseData(type, data)` when `data` present (type is immutable — from the stored row); updates; returns the full updated row with parsed `data`. `status` may only be `DRAFT|PUBLISHED`.
  - `GET /api/exercises/[id]?edit=1` (owner-only): returns the row WITHOUT the redaction that the normal GET applies (so `TRANSLATION.reference` / `PICTURE.description` round-trip into the editor). Non-owner or missing `edit` → existing redacted behavior unchanged.
  - `POST /api/exercises` accepts optional `status` (default `PUBLISHED`); a DRAFT create skips nothing else.
  - Student-facing GET/list continues to exclude `status !== "PUBLISHED"` (add `status: "PUBLISHED"` to the student where-clause in `route.ts`; teacher list may include drafts and returns `status`).

- [ ] **Step 1: Failing integration test** `tests/exercise-patch.test.ts` — use the `auth.api` + `db` pattern from `tests/auth-signup.test.ts` to create a teacher, create an exercise via `db.exercise.create`, then call the route handlers directly (import the `PATCH`/`GET` functions, pass a `Request` + `{ params: Promise.resolve({ id }) }`). Cover: owner PATCH updates title + toggles status; PATCH with invalid `data` → 400; non-owner PATCH → 404; `?edit=1` returns unredacted reference/description; student list excludes DRAFT. If invoking route handlers directly is awkward, extract the mutation core into a tested pure function `buildExercisePatch(existing, body)` returning the validated update object (throws ApiError on bad data) and unit-test THAT, plus one integration touch. State the choice in the report.

- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement** PATCH + `?edit=1` branch + POST status + student where-clause `status:"PUBLISHED"`. Reuse `validateExerciseData` (do not fork). Type is read from the stored row, never from the PATCH body.
- [ ] **Step 4: Run** — `npm test && npm run build && npx tsc --noEmit` green.
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(teacher): PATCH exercises, unredacted owner GET, draft status filtering"
```

---

### Task 6: Lesson CRUD API — TDD

**Files:** Create `src/app/api/lessons/route.ts`, `src/app/api/lessons/[id]/route.ts`, `tests/lessons-api.test.ts`.

**Interfaces:**
- Consumes: `requireTeacher`, `requireOwnedClass` (for class-scoped lessons), `assertOwned`.
- Produces:
  - `GET /api/lessons?classId=<id>` (teacher owns the class): the class's lessons ordered `unit, order`, each with its exercises (`{id,title,type,difficulty}`) and counts.
  - `POST /api/lessons` `{ classId, title, description?, level, unit, order, isCheckpoint?, exerciseIds?[] }` (owner of class): creates the lesson owned by the teacher (`createdById`), connects exercises the teacher owns (skip/400 on foreign exercise ids). Platform-curriculum lessons (`classId: null`) are NOT writable via this API — reject `classId: null`.
  - `PATCH /api/lessons/[id]` (lesson's `createdById === user.id` AND lesson.classId owned): update title/description/unit/order/isCheckpoint/exerciseIds (re-connect set).
  - `DELETE /api/lessons/[id]` (same ownership): deletes the lesson; its exercises' `lessonId` sets null (schema `onDelete: SetNull`).
  - All reject operations on lessons with `classId: null` (seeded curriculum is read-only here).

- [ ] **Step 1: Failing test** `tests/lessons-api.test.ts` — teacher creates a class (`db.class.create`) + two exercises, then exercises the handlers (or a pure `buildLessonCreate`/`buildLessonPatch` core, same choice rationale as Task 5): create lesson with exerciseIds connects them; foreign exerciseId → 400; PATCH reorders/reassigns; non-owner → 404; `classId:null` target → 400; DELETE nulls exercise.lessonId not deletes the exercise.
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement** both routes with the guard/error idiom from `src/app/api/path/route.ts`.
- [ ] **Step 4: Run** — `npm test && npm run build && npx tsc --noEmit` green.
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(teacher): lesson CRUD API scoped to owned classes"
```

---

### Task 7: `generateExerciseDraft` AI helper + endpoint — TDD

**Files:** Modify `src/lib/ai.ts`; Create `src/app/api/exercises/generate/route.ts`, `tests/ai-draft.test.ts`.

**Interfaces:**
- Consumes: `aiAvailable`, `completeJson`, `TUTOR_CONTEXT`, `levelGuidance` (existing private helpers in `ai.ts` — you may need to widen access or add the function inside `ai.ts` so it can use them).
- Produces (exact):

```ts
export interface DraftResult { data: ExerciseData; aiAvailable: boolean; }
export async function generateExerciseDraft(
  type: ExerciseType, difficulty: Level, topic: string
): Promise<DraftResult>;
```

Behavior: when `aiAvailable()`, prompt the model (JSON mode) for the exact `data` shape of `type` and validate it with `validateExerciseData` (import from exercises route or a shared module) — on validation failure OR any throw, fall back. Fallback = a deterministic minimal-but-valid template for that type (e.g. GRAMMAR: 3 fill-blank items about `topic`; VOCABULARY: 4 pairs; QUIZ: 3 questions; etc.), `aiAvailable:false`. NEVER return invalid data — the caller drops it straight into the editor.
- Endpoint `POST /api/exercises/generate` `{ type, difficulty, topic }` (requireTeacher) → `{ data, aiAvailable }`.

- [ ] **Step 1: Failing test** `tests/ai-draft.test.ts` — with no real key (test env), assert `generateExerciseDraft("GRAMMAR","BEGINNER","daily routines")` resolves with `aiAvailable:false` and `data` that PASSES `validateExerciseData("GRAMMAR", data)` (import the validator). Repeat for VOCABULARY, QUIZ, TRANSLATION, LISTENING, PICTURE, STORY, CONVERSATION — every fallback must be structurally valid.
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement** the helper (mirror `scorePicture`/`chatReply` structure) + the deterministic fallbacks + the route.
- [ ] **Step 4: Run** — `npm test` green (fallbacks valid); `npm run build`.
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(teacher): AI exercise-draft generator with valid offline fallbacks"
```

---

### Task 8: Extract the exercise form into a page component with autosave

**Files:** Create `src/components/teacher/exercise-form/exercise-form.tsx`; modify `src/components/teacher/exercise-form/exercise-form-dialog.tsx` to render it (thin wrapper, or delete the dialog if unused after Task 9).

**Interfaces:**
- Consumes: the existing builders + `types.ts` validators/converters; `PATCH`/`POST` (Task 5); `generateExerciseDraft` endpoint (Task 7).
- Produces: `<ExerciseForm exerciseId?={string} initialData?={ExerciseFull} onSaved={(id)=>void} />` — a self-contained form (not a dialog) that: loads the draft via `GET /api/exercises/[id]?edit=1` when `exerciseId` given; renders title/type/difficulty/points/timeLimit + the matching builder; **autosaves** as a DRAFT (debounced ~1.2s after changes) via POST-then-PATCH (first save POSTs a DRAFT and captures the id; subsequent saves PATCH); shows a "Draft saved" indicator; has explicit "Save draft" and "Publish" (sets status PUBLISHED via PATCH) actions; an "Generate with AI" control (topic input → POST generate → fills the builder state, toast `teacher.aiFilled` or `teacher.aiUnavailable` on `aiAvailable:false`). Type is LOCKED when editing an existing exercise (data shape can't change under it).

- [ ] **Step 1** — Extract the dialog's field state + builders + validation into `exercise-form.tsx` (no `reset-on-close`; the page owns lifecycle). Keep all `validate*`/`*ToPayload` usage identical.
- [ ] **Step 2** — Add autosave: a `useEffect` debouncer keyed on the serialized form; guarded so it doesn't fire on the initial load of an existing exercise, and only autosaves once the title is non-empty (avoid empty drafts). Track `savedId`; POST first (status DRAFT) then PATCH. Surface a subtle status line via `teacher.draftSaved`.
- [ ] **Step 3** — Add the AI generate control; on success map the returned `data` into the builder-draft state (write the inverse of `*ToPayload` — a small `dataToDraft(type, data)` per type; keep it beside the existing converters in `types.ts`).
- [ ] **Step 4** — Verify: `npm test && npm run build && npx tsc --noEmit`; the old dialog still works (or is removed cleanly). All strings via `t()`; content inputs `dir="ltr"`.
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(teacher): page-ready exercise form with draft autosave and AI fill"
```

---

### Task 9: Authoring pages `/teacher/content/exercises/new` + `/[id]/edit`

**Files:** Create `src/app/(dashboard)/teacher/content/exercises/new/page.tsx`, `.../[id]/edit/page.tsx`; modify `src/app/(dashboard)/teacher/exercises/page.tsx` (rows link to edit; header "New exercise" → `/teacher/content/exercises/new`; DRAFT badge + draft rows visible to their owner).

**Interfaces:**
- Consumes: `<ExerciseForm>` (Task 8).
- Produces: `new` page renders `<ExerciseForm onSaved={(id)=>router.replace('/teacher/content/exercises/'+id+'/edit')}/>` (so autosave's first POST transitions the URL to the edit route without a full remount losing focus — replace AFTER first save, guard against loops). `edit` page awaits `params`, renders `<ExerciseForm exerciseId={id} onSaved={...}/>`; on Publish, toast + `router.push('/teacher/exercises')`.

- [ ] **Step 1** — Build both pages (server component awaits params → client form). Exercises list: link each row to `/teacher/content/exercises/${id}/edit`, show a `teacher.draft` badge when `status==="DRAFT"`, and keep Delete.
- [ ] **Step 2** — Verify headless: dev server + teacher session; POST-create via the form's autosave path leaves a DRAFT row (not visible to students — confirm via student `/api/exercises`); publish flips it; edit round-trips a TRANSLATION exercise's `reference` (proves `?edit=1` unredaction). Kill server.
- [ ] **Step 3** — Gates green; commit:

```bash
git add -A
git commit -m "feat(teacher): full-page exercise authoring with drafts and editing"
```

---

### Task 10: Routed student detail `/teacher/students/[id]`

**Files:** Create `src/app/(dashboard)/teacher/students/[id]/page.tsx`; modify `src/app/(dashboard)/teacher/students/page.tsx` (rows link to the route; remove `StudentDetailDialog` usage). Keep `student-detail-dialog.tsx` content but re-home its JSX into the page (or import a shared `<StudentDetailView detail={...}/>`).

**Interfaces:**
- Consumes: `GET /api/students/[id]` (exists, shared-class guarded).
- Produces: a routable, bookmarkable student page mirroring the dialog's content (header, XP/streak/sessions chips, 5 skill bars, placement history, recent results) in the sticker-card system, all strings `t()`, English result titles `dir="ltr"`. Rows on the list page become `Button render={<Link href={`/teacher/students/${id}`}/>} nativeButton={false} role="link"` (or a linked row).

- [ ] **Step 1** — Extract the dialog body into `<StudentDetailView>` and render it from the new page (server awaits params → client fetch). Delete the dialog wiring from the list page; make rows navigate.
- [ ] **Step 2** — Verify: `/teacher/students/<id>` 200 for an owned/shared student; a non-shared student → the API's existing guard (404/403) surfaces as an error card, not a crash. Gates green.
- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(teacher): routed student detail page replaces the modal"
```

---

### Task 11: `PATCH /api/classes/[id]` + remove-student + class settings + hub tabs

**Files:** Modify `src/app/api/classes/[id]/route.ts` (+PATCH), `src/app/(dashboard)/teacher/classes/[id]/page.tsx` (tabs); Create `src/app/api/classes/[id]/students/[studentId]/route.ts` (DELETE), `src/components/teacher/classes/class-settings.tsx`. Add roster keys to both catalogs (`teacher.removeStudent`: "Remove" / "إزالة", `teacher.studentRemoved`: "Student removed" / "تمت إزالة الطالب").

**Interfaces:**
- Consumes: `requireOwnedClass`.
- Produces:
  - `PATCH /api/classes/[id]` `{ name?, description?, level? }` (owner) → updated class.
  - `DELETE /api/classes/[id]/students/[studentId]` (owner of the class): removes the `ClassStudent` row (does not delete the user); 404 if the student isn't enrolled. So classes are no longer create-or-destroy only (spec §8).
  - Class hub tabs become **Overview | Students | Lessons | Sessions | Settings** (`@/components/ui/tabs` already used). Overview = header stats + join code + invite (Task 13). Students = existing RosterTable + a per-row Remove action (`ConfirmDialog` → the DELETE endpoint → refetch). Sessions = existing. Settings = `<ClassSettings>` (edit name/description/level via PATCH, toast `teacher.classUpdated`) + the existing danger-zone delete. Lessons tab lands in Task 12.

- [ ] **Step 1** — PATCH route + the remove-student DELETE route (both via `requireOwnedClass`). Optionally a tested `buildClassPatch(existing, body)` (validates level ∈ LEVELS, trims name non-empty) for unit coverage; plus one integration test for remove-student (enrolled → removed; non-enrolled → 404; non-owner → 404).
- [ ] **Step 2** — Restructure the page into the 5 tabs; move existing sections under the right tabs; add the roster Remove action + ClassSettings. All new strings `t()` (`teacher.tab*`, `teacher.editClass`, `teacher.removeStudent`, etc.).
- [ ] **Step 3** — Gates green; headless: PATCH updates name (reflected on reload); enroll a student then remove them (roster shrinks, the user still exists). Commit:

```bash
git add -A
git commit -m "feat(teacher): editable class settings, remove-student, 5-tab class hub"
```

---

### Task 12: Class hub "Lessons" tab — lesson list + authoring + assignment

**Files:** Create `src/components/teacher/classes/lessons-tab.tsx`; modify `classes/[id]/page.tsx` to render it in the Lessons tab.

**Interfaces:**
- Consumes: lesson CRUD API (Task 6); `EXERCISE_TYPE_META` (Task 4); the class's exercises pool (teacher's own PUBLISHED exercises via `GET /api/exercises`).
- Produces: a Lessons tab that lists the class's lessons grouped by unit (title, order, checkpoint badge, assigned-exercise chips), a "New lesson" inline form / small dialog (title, unit, order, isCheckpoint, multi-select of the teacher's exercises to assign), edit + delete per lesson, all via the Task 6 endpoints. Reordering can be simple order-number inputs (no drag lib). All strings `t()`.

- [ ] **Step 1** — Build the tab: fetch `GET /api/lessons?classId=`, render grouped list + create/edit/delete wired to the API; assignment via a checklist of the teacher's exercises.
- [ ] **Step 2** — Verify headless: create a lesson with 2 assigned exercises → GET reflects it → those exercises now show `lessonId` set; delete nulls them. Gates green.
- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(teacher): lessons tab with authoring and exercise assignment"
```

---

### Task 13: Shareable invite link + `/join` landing

**Files:** Create `src/components/shared/invite.tsx`, `src/app/join/page.tsx`; modify class hub Overview + `create-class-dialog.tsx` success step to use `<Invite>`; add `/join` to the proxy public allowlist (`src/proxy.ts`).

**Interfaces:**
- Produces:
  - `<Invite code={string} />` — shows the join URL `${origin}/join?code=CODE`, a "Copy link" button (toast `teacher.linkCopied`), the raw code fallback (`teacher.orCode` + existing `CopyCode`), and an inline QR (generate with a tiny dependency-free QR via a canvas — OR, to avoid a new dep, render the link + code only and note QR as a Phase-5 nicety; choose no-new-dep unless a pure-JS QR is already available). Keep it dependency-free.
  - `/join?code=` public page: reads `code` from `searchParams` (Suspense), shows a friendly "Join {className? or 'a class'}" card; if the visitor is an authenticated student, a "Join now" button POSTs `/api/classes/join`; if unauthenticated, links to `/signup?role=student&next=/join?code=CODE` (or /login) preserving the code. Bilingual.

- [ ] **Step 1** — Build `<Invite>` (link + copy + code; no new dependency) and swap it into the class Overview tab + create-class success. Add `/join` to `src/proxy.ts` public paths (mirror how `/forgot-password` was added).
- [ ] **Step 2** — Build `/join` page: student-authed join flow + unauth CTA carrying the code. Verify headless: `/join?code=XXXX` renders 200 unauthenticated; an authed student can join; old copy-code paths still work.
- [ ] **Step 3** — Gates green; commit:

```bash
git add -A
git commit -m "feat(teacher): shareable class invite links + /join landing"
```

---

### Task 14: Sidebar/dashboard wiring + Phase 3 verification

**Files:** Modify `src/components/shared/sidebar.tsx` (teacher nav + Content), `src/app/(dashboard)/teacher/page.tsx` (i18n + quick actions target real create flows). Then verify.

**Interfaces:**
- Produces: teacher nav gains a **Content** entry (`nav.content` → `/teacher/exercises`, icon `PencilLine`) and keeps Dashboard/Classes/Sessions/Students; dashboard quick actions point to real creation targets ("Create an exercise" → `/teacher/content/exercises/new`; "Create a class" opens the create dialog or `/teacher/classes`; "Start a session" → `/teacher/sessions`); the dashboard title + stat labels use `teacher.*`.

- [ ] **Step 1** — Sidebar + dashboard i18n/link updates; update `sidebar.test.tsx` if the teacher nav assertion changes.
- [ ] **Step 2 — Full gate:** `npm run lint && npx tsc --noEmit && npm run build && npm test` — zero errors, all tests pass.
- [ ] **Step 3 — Smoke checklist (headless, kill orphan dev servers first, kill yours after):**
  1. Teacher signs up → dashboard localized; quick "Create an exercise" opens `/teacher/content/exercises/new`.
  2. Author a GRAMMAR exercise: autosave creates a DRAFT (invisible to students — verify via a student `/api/exercises`), Publish makes it visible.
  3. Edit a TRANSLATION exercise → `reference` round-trips (unredacted owner GET).
  4. "Generate with AI" with a placeholder key → valid template inserted, toast `teacher.aiUnavailable`.
  5. Class hub: 5 tabs; Settings edits the name (PATCH); Lessons tab creates a lesson assigning 2 exercises; roster row opens `/teacher/students/[id]`.
  6. Invite link `/join?code=` renders and an authed student joins.
  7. Arabic pass on `/teacher`, class hub, authoring page, student detail — RTL, no hardcoded English chrome (exercise content stays English in `dir=ltr`).
  8. `/api/auth/set-role` still 404; non-owner PATCH on someone else's exercise/class → 404.
- [ ] **Step 4** — Fix regressions inline; commit (`fix(teacher): phase 3 verification fixes` — skip if none).

```bash
git add -A
git commit -m "feat(teacher): content nav + dashboard quick actions; phase 3 verification"
```
