# SpeakPath Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Process note:** This project has no test infrastructure. Verification per task = `npx tsc --noEmit` + `npm run build` + curl/API smoke tests against a dev server, not unit-test TDD. This is a conscious deviation recorded here.

**Goal:** Turn the existing auth-only SpeakPath skeleton into the fully functional MVP described in SpeakPath-PRD.md, deployable on a VPS via Docker.

**Architecture:** Keep the existing Prisma schema unchanged (it already covers every feature — no new migrations). Build the product API layer as Next.js Route Handlers, wire all existing mock pages to real data, add the two missing pages (exercise player, class detail), unify Better Auth onto the Prisma/libsql client, and ship standalone-output Docker artifacts.

**Tech Stack:** Next.js 16.2.1 (App Router, Turbopack), TypeScript, Prisma 7 + @prisma/adapter-libsql (SQLite), Better Auth 1.5 (Prisma adapter), OpenAI SDK v6, Tailwind 4 + shadcn/ui + framer-motion.

## Global Constraints

- Next 16: `middleware.ts` is deprecated → file must be `src/proxy.ts` exporting `proxy()` + `proxyConfig`.
- Next 16: `params`/`searchParams`/`cookies()`/`headers()` are async — always `await`.
- Prisma client is generated to `src/generated/prisma` — import `PrismaClient` from `@/generated/prisma/client`. NEVER from `@prisma/client`.
- All DB access goes through `db` from `@/lib/db`. Better Auth also uses this client (Prisma adapter).
- NO Prisma schema changes. NO new migrations. Existing models cover everything.
- Roles are strings: `"STUDENT" | "TEACHER"`. Levels: `"BEGINNER" | "INTERMEDIATE" | "ADVANCED"`.
- Exercise types (8): `GRAMMAR | VOCABULARY | TRANSLATION | LISTENING | QUIZ | CONVERSATION | PICTURE | STORY` (the `PUZZLE` value in src/types is legacy — do not use).
- Progress categories: `GRAMMAR | VOCABULARY | LISTENING | TRANSLATION | SPEAKING | OVERALL`.
- Every API route: authenticate via `requireUser`/`requireTeacher`/`requireStudent` from `@/lib/guard`; return `Response.json({ error }, { status })` on failure. Status codes: 401 unauthenticated, 403 wrong role/not owner, 404 missing, 400 bad input.
- AI calls only through helpers in `@/lib/ai.ts` — never import `openai` directly in routes. Every AI feature must work (degraded) without an API key.
- Dark premium theme per SpeakPath-Design-Brief.md: bg #0F0D1A, violet #7C3AED / blue #3B82F6 / cyan #22D3EE accents, glassmorphism cards, framer-motion entrances. Reuse components from `src/components/shared/` and `src/components/ui/`.
- UI copy is English-only. Content (translation exercises) includes Arabic source strings.

---

## Data Contracts (authoritative)

### Exercise.data JSON by type

```ts
// GRAMMAR — items answered one at a time
{ items: Array<{ id: string; kind: "fill-blank" | "reorder" | "error-correction";
    prompt: string;            // instruction shown to student
    text?: string;             // sentence with ___ for fill-blank; sentence with error for error-correction
    options?: string[];        // choices for fill-blank/error-correction
    words?: string[];          // shuffled words for reorder
    answer: string;            // correct option, or the correctly ordered sentence, or corrected word
    explanation: string } > }

// VOCABULARY — match pairs game
{ pairs: Array<{ word: string; meaning: string }> }   // 6-8 pairs

// TRANSLATION — AI-scored free text
{ items: Array<{ id: string; direction: "ar-en" | "en-ar"; source: string; reference: string }> }

// LISTENING — client plays transcript via SpeechSynthesis (browser TTS), then answers
{ items: Array<{ id: string; transcript: string; question: string; options: string[]; answer: string }> }

// QUIZ (Speed Quiz) — timed MCQ
{ timePerQuestion: number /* seconds */; items: Array<{ id: string; question: string; options: string[]; answer: string }> }

// CONVERSATION — AI roleplay scenario (10 seeded, one per PRD scenario)
{ scenario: { key: string; title: string; emoji: string; description: string;
    aiRole: string; userRole: string; opening: string; objectives: string[] } }

// PICTURE — describe an emoji-composed scene, AI-scored
{ scene: { emojis: string; title: string; description: string /* ground truth, not shown */; hints: string[]; minWords: number } }

// STORY — collaborative storytelling with AI
{ story: { title: string; genre: string; opening: string; minTurns: number } }
```

### Submit / scoring flow

`POST /api/exercises/[id]/submit` body varies by type:
- Objective types (GRAMMAR, VOCABULARY, LISTENING, QUIZ): `{ answers: Record<itemId, string>, timeSpent?: number }` — server scores against `answer` fields. VOCABULARY: `{ answers: { matchedPairs: number, totalPairs: number, mistakes: number }, timeSpent }` → score = max(0, round(100 * matched/total) - mistakes*5).
- TRANSLATION: `{ answers: Record<itemId, string>, timeSpent? }` — server calls `scoreTranslation()` per item.
- PICTURE: `{ text: string, timeSpent? }` — server calls `scorePicture()`.
- CONVERSATION: `{ messages: Array<{role:"user"|"assistant", content:string}>, timeSpent? }` — server calls `scoreConversation()`.
- STORY: `{ turns: Array<{role:"user"|"assistant", content:string}>, timeSpent? }` — server calls `scoreStory()`.

Response (all types): `{ score: number /*0-100*/; xpEarned: number; feedback: { overall: string; perItem?: Record<itemId, { correct: boolean; expected?: string; note?: string }>; strengths?: string[]; improvements?: string[] }; gamification: GamificationUpdate }`

`GamificationUpdate = { xp: number; streak: number; levelUp: boolean; level: string; skills: Record<category, number> }`

### Gamification rules (implemented once in `@/lib/gamification.ts`)

- `xpEarned = round(exercise.points * score / 100)` (min 1 if attempted, score>0).
- Skill mapping: GRAMMAR→GRAMMAR, VOCABULARY→VOCABULARY, LISTENING→LISTENING, TRANSLATION→TRANSLATION, QUIZ→split GRAMMAR+VOCABULARY (half XP each, score to both), CONVERSATION/PICTURE/STORY→SPEAKING.
- Category score EMA: `new = round(0.7 * old + 0.3 * score)` (first result: `score`).
- OVERALL row: `xp += xpEarned` (total XP lives here), `score = round(avg of the 5 categories)`, `streak`: if last activity (OVERALL.updatedAt) was yesterday → +1; today → unchanged; older → 1.
- All 6 Progress rows upserted via `@@unique([studentId, category])`.

### Placement

- 25 static questions in `src/lib/placement-questions.ts`: 10 GRAMMAR, 8 VOCABULARY, 7 READING (reading has `passage` field). Each: `{ id, category: "GRAMMAR"|"VOCABULARY"|"READING", passage?: string, question: string, options: string[4], answer: string, weight: 1|2|3 }` (weight = difficulty band the question probes).
- `GET /api/placement` → questions **without** `answer` + `{ taken: boolean, lastResult? }`.
- `POST /api/placement` `{ answers: Record<qid, string> }` → weighted score 0-100, level: `<40 BEGINNER, 40-69 INTERMEDIATE, >=70 ADVANCED`, breakdown per category; creates PlacementExam row, sets `user.level`, seeds Progress rows (category score = category %, OVERALL score = avg, xp += 50 completion bonus). Retakes allowed; level updates.

### API inventory

| Route | Methods | Who | Purpose |
|---|---|---|---|
| `/api/health` | GET | public | `{ status: "ok" }` + DB ping |
| `/api/me` | GET | any | `{ user: { id,name,email,role,level }, progress: Progress[] }` |
| `/api/placement` | GET, POST | student | above |
| `/api/exercises` | GET, POST | GET any / POST teacher | GET: `?type=&difficulty=` list (no `data.answer` stripping needed — list returns metadata only: id,title,type,difficulty,points,timeLimit,counts). POST: create with type-validated `data` |
| `/api/exercises/[id]` | GET, DELETE | GET any / DELETE creating teacher | full exercise incl. data (answers included — client shows instant feedback; server still authoritative on submit) |
| `/api/exercises/[id]/submit` | POST | student | above |
| `/api/classes` | GET, POST | teacher: own; student: enrolled | POST teacher `{ name, description?, level }` → auto 6-char join code (A-Z0-9, retry on collision) |
| `/api/classes/join` | POST | student | `{ code }` → enroll (idempotent) |
| `/api/classes/[id]` | GET, DELETE | teacher owner / enrolled student (GET) | detail: class + students(with level, OVERALL progress) + sessions |
| `/api/students` | GET | teacher | distinct students across teacher's classes, each: user + OVERALL progress + resultsCount + avgScore |
| `/api/students/[id]` | GET | teacher (must share a class) | full progress + last 20 ExerciseResults + placement history + session attendance count |
| `/api/sessions` | GET, POST | teacher: own; student: sessions of enrolled classes (status != ENDED first, then recent) | POST teacher `{ classId, title }` → status WAITING |
| `/api/sessions/[id]` | GET, PATCH | participants | GET `?after=<ISO>` → `{ session, participants: [{id,name,role}], messages(after), pushedExercise: Exercise\|null }`. pushedExercise = latest message `type=="EXERCISE"` (content = exerciseId), resolved. PATCH teacher `{ action: "start"\|"end" }` → sets status/startedAt/endedAt |
| `/api/sessions/[id]/join` | POST | student in class | upsert SessionStudent; system message "X joined" |
| `/api/sessions/[id]/messages` | POST | participants | `{ content }` → TEXT message (max 1000 chars) |
| `/api/sessions/[id]/push` | POST | owning teacher | `{ exerciseId }` → creates message type EXERCISE, content=exerciseId |
| `/api/ai/chat` | POST | student | `{ exerciseId, messages }` → `{ reply, feedback: { hasIssues, corrections: [{original, corrected, note}], tip? } \| null, aiAvailable }` |
| `/api/ai/story` | POST | student | `{ exerciseId, turns }` → `{ reply, aiAvailable }` |

Realtime = polling: session room polls `GET /api/sessions/[id]?after=` every 2.5s. AI chat is request/response.

### `@/lib/ai.ts` (single AI gateway)

- `aiAvailable()` — false if no/placeholder `OPENAI_API_KEY`.
- Model: `process.env.OPENAI_MODEL ?? "gpt-4o-mini"`; JSON via `response_format: { type: "json_object" }`; system prompts specialized for Arabic-speaking English learners (contrastive feedback: articles, p/b, prepositions, verb tense — common Arabic-speaker errors); adapt register to student level.
- Exports: `chatReply(scenario, level, messages)`, `chatFeedback(level, lastUserMsg)`, `storyReply(story, level, turns)`, `scoreTranslation(item, answer, level)`, `scorePicture(scene, text, level)`, `scoreConversation(scenario, messages, level)`, `scoreStory(story, turns, level)`.
- Fallbacks (no key / API error): translation → token-overlap similarity vs reference (0-100); picture/story → length+vocabulary-diversity heuristic with generic feedback; conversation scoring → message count + avg length heuristic; chatReply → scripted scenario responses (each seeded scenario includes 3 canned lines) + note that AI is offline; feedback → null. Responses always include `aiAvailable` so UI can show an "AI offline — using basic scoring" notice.

---

## File Map

**Foundation (Task 1-2, done inline by lead):** `src/lib/db.ts` (env URL), `src/lib/auth.ts` (Prisma adapter), `src/proxy.ts` (new, delete `src/middleware.ts`), `next.config.ts` (standalone), `src/app/api/health/route.ts`, `src/lib/guard.ts`, `src/lib/gamification.ts`, `src/lib/ai.ts`, `src/lib/placement-questions.ts`, `src/types/index.ts` (extend with contracts), `src/components/shared/glow-button.tsx` (fix nesting), `src/app/(auth)/login/page.tsx` (role redirect + callbackUrl), dashboard layouts (server-side role guard), `package.json` (drop better-sqlite3, add tsx + seed script, postinstall prisma generate).

**Backend A (agent):** `src/app/api/placement/route.ts`, `src/app/api/me/route.ts`, `src/app/api/exercises/route.ts`, `src/app/api/exercises/[id]/route.ts`, `src/app/api/exercises/[id]/submit/route.ts`, `src/app/api/classes/route.ts`, `src/app/api/classes/join/route.ts`, `src/app/api/classes/[id]/route.ts`, `src/app/api/students/route.ts`, `src/app/api/students/[id]/route.ts`, `prisma/seed.ts` (idempotent upserts; system user; ~30 exercises + 10 conversation scenarios + 3 story + 3 picture).

**Backend B (agent):** `src/app/api/sessions/route.ts`, `src/app/api/sessions/[id]/route.ts`, `src/app/api/sessions/[id]/join/route.ts`, `src/app/api/sessions/[id]/messages/route.ts`, `src/app/api/sessions/[id]/push/route.ts`, `src/app/api/ai/chat/route.ts`, `src/app/api/ai/story/route.ts`.

**Frontend Student (agent):** rewrite `src/app/(dashboard)/student/page.tsx` (live stats), `placement/page.tsx` (3-phase exam flow), `exercises/page.tsx` (real list + links), new `exercises/[id]/page.tsx` + players in `src/components/exercise/` (grammar-player, vocab-match, translation, listening [SpeechSynthesis], speed-quiz, conversation-chat [voice input via webkitSpeechRecognition when available], picture, story, results-screen), `ai-chat/page.tsx` (scenario grid → chat), `sessions/page.tsx` (list/join) + new `sessions/[id]/page.tsx` (student room: chat + pushed exercise banner→link), plus student "join class by code" card on dashboard.

**Frontend Teacher (agent):** rewrite `src/app/(dashboard)/teacher/page.tsx` (live stats), `classes/page.tsx` (list + create dialog + codes), new `classes/[id]/page.tsx` (roster, sessions, code), `exercises/page.tsx` (list + create dialog with per-type editors), `sessions/page.tsx` (list + create) + new `sessions/[id]/page.tsx` (teacher room: start/end, chat, push exercise picker, presence), `students/page.tsx` (roster + detail dialog).

**Deployment (lead):** `Dockerfile` (multi-stage, standalone), `docker-compose.yml` (app + migrate init service, volume for /app/data), `Caddyfile` (auto-HTTPS reverse proxy), `.env.example`, `.dockerignore`, `README.md` (rewrite with setup + VPS deploy runbook), `scripts/` as needed.

---

## Tasks

### Task 1: Core infra fixes — [lead, inline]
- [ ] db.ts env-driven URL; auth.ts → Prisma adapter (`better-auth/adapters/prisma`, provider "sqlite", `session.modelName: "authSession"`), trustedOrigins from env; delete middleware.ts → proxy.ts using `getSessionCookie` (handles `__Secure-` prefix in prod); next.config `output: "standalone"`; health route; GlowButton anchor fix; login role-aware redirect + callbackUrl; server-side role guards in both dashboard layouts (getSession → redirect wrong role/unauthed); package.json cleanup.
- [ ] Verify: `npm run build` passes; signup/login/signout still work against dev server.

### Task 2: Shared foundation — [lead, inline]
- [ ] `guard.ts`, `gamification.ts`, `ai.ts`, `placement-questions.ts`, extended `types/index.ts` exactly per contracts above.
- [ ] Verify: `npx tsc --noEmit`.

### Task 3-4: Backend A + B — [parallel agents]
- [ ] All routes per API inventory; validate inputs; role guards; seed content (exercises must be pedagogically real, Arabic-speaker-targeted, not lorem ipsum).
- [ ] Verify: build + curl smoke tests (documented in task prompt).

### Task 5-6: Frontend student + teacher — [parallel agents, after 3-4 land]
- [ ] Per file map; match design system; loading/error/empty states everywhere; mobile responsive.
- [ ] Verify: build + manual route walk on dev server.

### Task 7: Deployment artifacts — [lead]
- [ ] Dockerfile/compose/Caddyfile/.env.example/README runbook; migrate+seed on boot via init service.
- [ ] Verify: full production build; (Docker build if daemon available, else static review).

### Task 8: Integration verification — [lead]
- [ ] Fresh DB → migrate → seed → dev server → scripted smoke: signup teacher & student, create class, join by code, placement exam, exercise submit (objective + AI-fallback types), session create/join/chat/push, dashboards show real numbers.

## Self-Review (against PRD)
- FR-01 auth ✓ (Task 1) · FR-02 placement ✓ (T2/T3/T5) · FR-03 8 exercise types ✓ (T3/T5) · FR-04 AI conversation + feedback + summary ✓ (T2/T4/T5) · FR-05 live sessions ✓ (T4/T5/T6) · FR-06 XP/streak/skills ✓ (T2/T3) · FR-07 classes ✓ (T3/T6) · NFR graceful AI fallback ✓ (T2) · Deploy VPS ✓ (T7). Page inventory 15/15 + 2 session room pages beyond PRD table (required by FR-05 UX).
