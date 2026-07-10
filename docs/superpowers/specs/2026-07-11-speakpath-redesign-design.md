# SpeakPath Full Redesign — Design Spec

**Date:** 2026-07-11
**Status:** Approved by owner (direction, palette, and interactive preview all sign-off'd)
**Preview artifact:** <https://claude.ai/code/artifact/3e8b31ca-81f8-4b83-a9f4-57397520d0e0>

---

## 1. Context

The owner rejected the current design and workflow outright. A 10-agent code audit (7 area maps + 3 lens audits: visual taste, workflow UX, information architecture) confirmed and grounded that judgment:

- **Visual**: stock "AI glow" template (self-described in `globals.css:51` as "inspired by Oryzo + Obsidian Assembly"). Particles/spotlights/gradients on every screen including teacher data tables. Body font never applied (self-referential `--font-sans`). No Arabic typeface in a product for Arabic speakers. 270 `text-white/NN` utilities failing WCAG AA. Emoji nav icons. The shadcn `ui/` layer is dead code (`ui/button` imported by 1 file; `ui/card`, `ui/badge` by 0).
- **Workflow**: no learning path — the `Lesson` model (units, order, class relation) has zero routes/UI. Every flow dead-ends (results screens, placement, teacher actions). Placement (25 questions) changes nothing: exercises are never filtered by `user.level`. Live sessions eject students from the room to play a pushed exercise; results never reach the teacher. Teacher authoring is a ~75-input modal that wipes on Esc, with no PATCH endpoint.
- **Security/robustness**: `/api/auth/set-role` lets any signed-in user self-promote to TEACHER. Sessions list never refreshes (a session started after page load is undiscoverable). No forgot-password flow.

## 2. Locked decisions (owner-selected)

| Decision | Choice |
| --- | --- |
| Visual direction | **Bold & playful** — light, bright, chunky/tactile; energetic without being childish |
| Palette | **Violet + sunshine** — playful violet brand, amber for XP/streaks, green correct, coral mistakes, ink on warm paper |
| Interface language | **Bilingual Arabic/English UI** with full RTL; learning content stays English |
| Gamification | **Motivating but calm** — streak/XP visible, one genuine celebration moment, time-aware nudges; no quests/leaderboards |
| Scope | Full redesign: design system + IA + workflows. Five shippable phases. |

## 3. Design system

### 3.1 Color tokens (light-first)

| Token | Value | Role |
| --- | --- | --- |
| `paper` | `#FBF8F1` | Page background (warm off-white) |
| `panel` | `#FFFFFF` | Cards, surfaces |
| `ink` | `#2B2440` | Primary text (violet-biased near-black) |
| `ink-soft` | `#625B7A` | Secondary text (AA on paper) |
| `line` / `line-strong` | `#E5DFF0` / `#D5CDE8` | Borders, card shadows |
| `violet` / `violet-deep` / `violet-soft` | `#6C4CF1` / `#4F35C4` / `#EFEAFE` | Brand: actions, path, links / pressed edge / tinted fills |
| `sun` / `sun-deep` / `sun-soft` | `#FFB424` / `#D98F00` / `#FFF3D6` | XP, streaks, checkpoints, celebration |
| `leaf` / `leaf-soft` | `#2EA86B` (text `#23935C`) / `#E3F6EC` | Correct, complete |
| `coral` / `coral-soft` | `#E05252` / `#FDEAE9` | Mistakes (kind, not punitive), destructive |

Rules: exactly **three text tokens** (`ink`, `ink-soft`, plus white-on-brand) — `text-white/NN` opacity stepping is banned. All combinations ≥ 4.5:1 (body) / 3:1 (large). Semantic colors (leaf/coral) are never used as accents. Gradients are banned on text and buttons. Colors live only in CSS variables via Tailwind v4 `@theme` — no raw hex in components (ScoreRing, ClickSpark-style hardcoding must not recur). Dark mode is **out of scope now** and returns later as a properly wired theme.

### 3.2 Typography

- **One family, two scripts**: Rubik variable (400–900), Latin + Arabic subsets, loaded via `next/font`. Fixes the broken `--font-sans: var(--font-sans)` self-reference.
- Headings 700–800, tight tracking (Latin only — Arabic gets no letter-spacing and no uppercase treatment). Body 400–500. Uppercase micro-labels are replaced by sentence-case 13px captions in Arabic contexts.
- Arabic body/exercise text: larger optical size, `line-height ≥ 1.7`.
- Numbers: `tabular-nums` wherever digits align (XP, scores, timers).

### 3.3 Components (all rebuilt on the existing shadcn `ui/` primitives)

- **Buttons**: 3 sizes (36/44/52px). Variants: `brand` (violet fill, `box-shadow: 0 4px 0 violet-deep`, presses down 4px on `:active`), `sun` (amber, for start/celebrate moments), `ghost` (white, 2px line border, same press physics), `destructive` (coral). One button system everywhere — `GlowButton`/`ShimmerButton` die.
- **Cards**: white panel, 2px `line` border, `radius 20px`, solid offset shadow (`0 4px 0 line`) — the "sticker" look. One Card primitive; the ~40 hand-rolled `rounded-2xl border-white/5` divs migrate to it.
- **Chips**: pill, 2px tinted border, tinted bg — streak (sun), XP (violet), level (neutral).
- **Path node**: 54px circle; done = violet fill + check; current = white + violet ring + pulsing halo; locked = neutral + lock; checkpoint = rounded-square amber + flag.
- **Icons**: lucide-react only, 20px, stroke 2, `currentColor`. All emoji icons and letter-tiles are replaced.
- **Progress**: segmented bars in exercises (per-question), fat rounded track on paths.

### 3.4 Motion rules

- Micro: button/card press (translate 4px, ≤80ms), option select, segment fill.
- One celebration: lesson complete / level-up / streak milestone → confetti burst + score pop. Nothing ambient, ever, on authenticated screens.
- Everything gated behind `prefers-reduced-motion`. All 15+ decorative effect components are deleted (§9).
- Marketing may keep exactly one signature treatment (the drawn path line), also motion-gated.

## 4. Bilingual architecture (Arabic/English, RTL)

- `User.locale` (`ar` | `en`), toggle in the app header/sidebar; unauthenticated default from `Accept-Language` (Arabic-locale browsers get Arabic), stored in a cookie.
- `<html lang dir>` set **server-side** per request — no flash, no client patching.
- All UI strings in `messages/en.json` + `messages/ar.json` catalogs (navigation, buttons, feedback, empty states, errors, marketing). Exercise/learning **content stays English**; exercise *instructions* and AI feedback explanations are bilingual where pedagogically valuable (grammar explanations in Arabic help A1–B1 learners).
- Layout uses **logical properties exclusively** (`ps-`/`pe-`, `border-s`/`border-e`, `inset-inline`) so RTL is native. English exercise sentences render in forced-LTR islands (`dir="ltr"` on the sentence/options block).
- Library choice (next-intl vs. minimal homegrown catalog) is an implementation-plan decision — must be validated against Next 16 docs in `node_modules/next/dist/docs/` first (AGENTS.md warning).

## 5. Student experience

### 5.1 Sitemap

```text
/student            → Learn (home): the Path
/student/practice   → free practice library + AI conversation scenarios (absorbs /student/ai-chat)
/student/practice/conversation/[id] → canonical AI-chat surface (routed, persisted)
/student/classes    → my classes, join by code/link, per-class assignments & sessions
/student/classes/[id]/live/[sessionId] → session room
/student/progress   → streak, XP ladder, skills, attempt history, mistake review
/student/placement  → full exam (reached from Learn node or Progress; NOT a permanent nav item)
```

Sidebar: **Learn · Practice · Classes · Progress** + language toggle + user chip.

### 5.2 The Path (Learn home)

- Activates the existing `Lesson` model: Units (1–6 per level) → Lessons (ordered) → Exercises. Ships with a **seeded starter curriculum** for Beginner/Intermediate/Advanced so the path is never empty; teacher-authored lessons slot into class-assigned paths.
- Layout: greeting + streak/XP chips → one dominant **Continue card** (next incomplete lesson) → current unit's node path (done/current/locked/checkpoint) → locked next-unit teaser.
- Unit checkpoint = short mixed quiz; passing unlocks the next unit.
- Placement in the path: students normally arrive placed by the onboarding mini-placement (§5.3). If a student skipped it (or an existing account predates it), the mini-placement appears as **node #1 of the path** until completed. The old banner, permanent sidebar item, and duplicate quick-action all die.

### 5.3 Onboarding (target: playable content in 60 seconds)

1. Signup with role set **atomically and server-side** (delete `/api/auth/set-role`). Constraint: `role`/`level` are deliberately `input:false` in better-auth so clients can never set them via sign-up/update-user — keep that. The mechanism (signup database hook reading a server-validated intent, or a one-time-only server action that refuses if role is already set) is decided at plan time against better-auth docs. "I'm a Teacher" on marketing links to `/signup?role=teacher` preselected.
2. Student → 5-question mini-placement (one per screen, instant level estimate).
3. Auto-start the first level-matched exercise immediately.
4. Then reveal the Path home, already populated.
5. Full 25-question exam becomes optional "Refine my level" in Progress — with per-question persistence (refresh-safe), a review step before submit, and a distraction-free full-screen mode with leave confirmation.

### 5.4 Learning loop

- **Exercise player**: segmented progress, chunky option buttons, instant kind feedback (correct = leaf + explanation; wrong = coral + correct answer + explanation, never punitive), consistent across all 8 exercise types.
- **Results screen = springboard**: celebration (if earned), score, +XP, streak state, then primary CTA **"Next: ‹exercise›"** (same-type-next-difficulty or weakest-skill pick), secondary Try again / Back. No dead ends anywhere.
- **Practice library**: defaults to `user.level` (fix: include level in the `/api/exercises` where-clause), filters live in URL `searchParams`, back-navigation preserves context.
- **AI conversation**: routed (`/practice/conversation/[id]`), transcript persisted server-side (resume-safe), end-of-conversation summary with vocabulary/grammar takeaways.
- **Progress**: time-aware streak ("practice today to keep day 7"), XP-to-next-level ladder, per-skill drill-down, attempt history, and **mistake review** (reads the already-stored `ExerciseResult.answers` JSON; "redo the ones you missed" flow).

## 6. Teacher experience

### 6.1 Sitemap

```text
/teacher                     → dashboard: today's sessions, recent activity, one-click actions (open real dialogs/pages directly)
/teacher/classes             → class list
/teacher/classes/[id]        → HUB with tabs: Overview | Students | Lessons & Assignments | Sessions | Settings
/teacher/students            → cross-class index
/teacher/students/[id]       → full student page (replaces the trapped dialog): level, skills, history, attendance
/teacher/content             → exercises + lessons
/teacher/content/exercises/new | [id]/edit → full-page authoring
/teacher/content/lessons/...  → lesson/unit authoring, assignable to classes
/teacher/sessions            → cross-class session index
/teacher/sessions/[id]       → control room
```

### 6.2 Authoring

- Full pages, not modals. **Draft autosave** (server-side draft state), inline per-item validation, `PATCH /api/exercises/[id]` for editing (today: create/delete only).
- **Generate with AI**: topic + type + level → drafted items (questions, distractors, explanations, conversation fallback replies) for review-and-tweak. Teachers never hand-write 10 items from scratch on an OpenAI-powered platform.
- Class invites: shareable `/join?code=XYZ` link + QR alongside the code. Class `PATCH` and remove-student endpoints (today classes are create-or-destroy only).

## 7. Live sessions

- **One "Go live"** action (kills the double-start); optional "schedule for later" (`LiveSession.scheduledAt`).
- **Real lobby**: roster with join status, chat enabled pre-start for both sides, "waiting for ‹teacher› to start".
- **Students stay in the room**: pushed exercises render in a split pane with chat docked (no more ejection to `/student/exercises/[id]`).
- **Completions close the loop**: `ExerciseResult.sessionId` → live teacher scoreboard (who finished, scores) → post-session recap for both roles; ended sessions get a read-only transcript + results view.
- **Discovery**: "class is live" banner across all student pages — polling with refetch-on-focus (SSE optional later; polling interval ~10s in-session, ~30s ambient).

## 8. Data & API changes

Schema (additive + one migration):

- `User.locale String @default("ar")`
- `ExerciseResult.sessionId String?` (+ relation)
- `LiveSession.scheduledAt DateTime?`
- `Exercise.status` (`DRAFT` | `PUBLISHED`) for autosave
- Seed: starter curriculum (Units/Lessons/Exercises × 3 levels), idempotent.

API:

- Delete `/api/auth/set-role`; role assigned server-side at signup (see §5.3 constraint — `input:false` stays).
- Add forgot-password/reset (better-auth built-in) — and evaluate Google OAuth as a stretch item.
- `PATCH /api/exercises/[id]`, `PATCH /api/classes/[id]`, `DELETE /api/classes/[id]/students/[studentId]`.
- `/api/exercises` GET: include `user.level` for students by default.
- Lessons/path endpoints: `GET /api/path` (student's units/lessons/completion), lesson CRUD for teachers.
- Session events: completion events + scoreboard aggregation.

## 9. Deletions

- `src/components/shared/`: aurora-background, floating-particles, spotlight-beam, grid-background, glow-card, spotlight-card, tilted-card, click-spark, shimmer-button, glow-button, animated-gradient-text, rotating-text, blur-text, split-text, text-reveal (count-up and score-ring are rebuilt as token-driven, calm equivalents).
- `globals.css`: `.glow-*`, `.text-glow`, `.border-glow`, `.noise`, violet scrollbar/selection styling.
- `/student/ai-chat` route (content moves to Practice), placement sidebar item, `set-role` endpoint, dead `dark:` variants (until dark returns properly).

## 10. Error handling & resilience principles

- No stranded states: any multi-step server flow either completes atomically or leaves a recoverable UI (the signup role-failure dead-end must be impossible).
- Work is never silently lost: authoring autosaves; placement persists per question; AI transcripts persist; leave-confirmations guard full-screen flows.
- Errors say what happened and what to do next, in the user's UI language; empty states are invitations to act (one clear CTA), not mood copy.
- All list surfaces that can change remotely (sessions) revalidate on focus.

## 11. Testing

- **Unit**: gamification math (XP/levels/streak windows), level-filtering, placement scoring, path unlock logic.
- **Integration**: API routes (auth/role, exercises CRUD+PATCH, path, session events) against a test SQLite db.
- **E2E (Playwright)**: the two golden journeys — student signup → mini-placement → first exercise → results → next; teacher create class → author exercise (with autosave) → go live → push → see scoreboard. Run once per phase in both `en` (LTR) and `ar` (RTL).
- **Design guardrails**: ESLint rule banning `text-white/`, raw hex in `className`, and physical directional utilities (`pl-`/`pr-`/`border-l`/`border-r`) in app code.

## 12. Phasing (each independently shippable)

1. **Foundation**: design tokens + typography (Rubik Latin/Arabic) + rebuilt `ui/` primitives + i18n/RTL infrastructure + auth fixes (atomic role, forgot password, delete set-role) + effects-kit deletion + app shell (sidebar/nav).
2. **Student core**: Path home + seeded curriculum + onboarding (mini-placement → first exercise) + exercise player/results redesign + Practice (library + AI conversation routes) + Progress + full placement rework.
3. **Teacher core**: class hub + student pages + full-page authoring with autosave/PATCH + AI generation + invites.
4. **Live sessions**: lobby, in-room split pane, scoreboard, live banner, recap.
5. **Marketing**: landing/auth pages in the new brand (bilingual), honest content (real product shots, no particle hero).

Phase 1+2 form the first implementation plan; later phases get their own plan documents when reached.

## 13. Non-goals (now)

Dark mode (returns later, properly wired), voice input/speech scoring, leaderboards/quests/badges beyond streak+XP, native mobile apps, PostgreSQL migration, payments.

## 14. Technical constraints

- **Next.js 16.2.1 has breaking changes** — read the relevant guide in `node_modules/next/dist/docs/` before writing any code (per AGENTS.md). Applies especially to routing/layout/i18n/server-action conventions.
- Tailwind v4 CSS-first tokens (`@theme`), React 19, better-auth 1.5, Prisma 7 on SQLite/libsql.
- Framer Motion stays for the few sanctioned moments; GSAP is expected to become removable — verify no remaining use after Phase 5 and drop the dependency.
