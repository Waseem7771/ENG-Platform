# SpeakPath Redesign — Phase 5: Marketing & Public Surfaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the public/pre-login surfaces (landing page + auth pages + password-reset email) up to the new brand — on-brand tokens, bilingual AR/EN with full RTL, honest content, lucide icons — and retire the last redesign debt (GSAP dependency, hardcoded-English residuals, wordmark duplication).

**Architecture:** The authenticated app was fully rebuilt in Phases 1–4; only the anonymous surfaces lag. This phase is UI + i18n + one server-side email tweak — **no schema, no new API, no security surface** like sessions had. Extract the repeated logo into a shared `<Wordmark/>`, move all landing copy into a `marketing.*` catalog namespace, rebuild the single landing page against the design system (tokens, lucide icons, logical props, motion gated to reduced-motion), add an anonymous language toggle, localize the reset email off `User.locale`, and drop GSAP.

**Tech Stack:** Next.js 16.2.1 (modified), React 19, Tailwind v4 tokens, better-auth 1.5.6, Prisma 7/SQLite, framer-motion (kept — the one sanctioned marketing motion), vitest (425 tests green at start).

**Spec:** `docs/superpowers/specs/2026-07-11-speakpath-redesign-design.md` §3 (design system), §3.4 (motion — "Marketing may keep exactly one signature treatment … also motion-gated"), §5/§12.5 (Marketing: honest content, real product shots, no particle hero, bilingual), §14 (drop GSAP). Phases 1–4 complete on `redesign/v2` at `a44dfd1`.

## Global Constraints

- **Next 16 (modified):** `cookies()`/`headers()`/`params`/`searchParams` async — always `await`; client components read params via `useSearchParams()` under `<Suspense>` (the signup page already does this). Middleware is `src/proxy.ts` (`export const config`) — never create `middleware.ts`. Read `node_modules/next/dist/docs/` before Next-specific APIs.
- **Design system (mandatory):** tokens only — `bg-card border-2 border-border rounded-card shadow-sticker` cards, `Button` variants `brand|sun|ghost|outline|destructive` from `@/components/ui/button`. Lint bans `text-white/`, raw hex, and physical-direction utilities (`pl-/pr-/ml-/mr-/ml-auto/mr-auto/border-l/border-r/text-left/text-right/left-N/right-N/rounded-l/rounded-r`) — use logical (`ps-/pe-/ms-/me-/text-start/text-end/border-s/border-e/start-/end-`). **The lint hex/color rule only covers `bg-/text-/border-` prefixes** — so `shadow-violet-*`, `from-/to-/via-*`, `ring-*`, `fill-*` with raw color names are NOT caught by lint but STILL violate "tokens only" and MUST be replaced this phase.
- **Colour tokens (spec §3.1):** `primary` (violet) + `primary-foreground`; `secondary`/`secondary-foreground` (violet tint surface); `sun`/`sun-soft`/`sun-deep` (amber — start/celebrate); `leaf`/`leaf-soft` + `coral`/`coral-soft` (semantic success/error — **never used as decorative accents**); `muted`/`muted-foreground`, `card`, `background`, `foreground`, `border`, `line-strong`. Gradients are banned on text and buttons. Emoji icons and letter-tiles are replaced by **lucide-react** icons (20–24px, stroke 2, `currentColor`).
- **Bilingual (mandatory):** all visible chrome via `useT()` from `@/components/providers/locale-provider`; every new key in BOTH `messages/en.json` + `messages/ar.json` (parity test `src/lib/i18n.test.ts` fails otherwise; Arabic must be real Arabic). RTL: the page must mirror — no physical-direction utilities, no raw `←/→` glyphs baked into copy (use a lucide arrow that flips, or omit). Interpolated names/class-names that may be Latin are isolated (`<bdi>` for nodes, or `⁨…⁩` FSI/PDI for flat-string interpolation) so they don't reorder inside Arabic.
- **Motion (spec §3.4):** marketing may keep tasteful entrance/scroll-reveal motion, but everything is gated behind `prefers-reduced-motion` (framer-motion honours `useReducedMotion()` / `MotionConfig reducedMotion="user"`), and ambient/looping decoration (infinite ping dots, perpetual scroll indicator) is trimmed. GSAP is removed entirely (§14) — verify no `gsap`/`@gsap/react` import remains, then drop both from `package.json`.
- **Data-fetch conventions:** client `useT()`/`useLocale()`; better-auth via `@/lib/auth-client`. Reset email built server-side in `src/lib/auth.ts`.
- Work on branch `redesign/v2`. Commit after every task with the given message + trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`. Per-task done = its tests pass, `npm test` fully green, `npm run build` + `npx tsc --noEmit` succeed, `npm run lint` no new errors, `npx vitest run src/lib/i18n.test.ts` parity green.
- **Brief-file hazard (learned in prior phases):** `.superpowers/sdd/task-N-brief.md` collides across phases — the controller regenerates each brief from THIS plan before dispatch.

## File Structure (created/modified this phase)

```text
src/components/shared/wordmark.tsx + wordmark.test.tsx   # shared logo badge + "SpeakPath" (new) — kills 5x duplication + the raw shadow
src/components/shared/language-toggle.tsx                # anonymous AR/EN toggle for landing + auth (new or extracted)
src/app/(marketing)/page.tsx                             # landing rebuild: i18n + RTL + tokens + lucide + honest preview + gated motion
src/app/(auth)/login/page.tsx                            # swap logo -> <Wordmark/>; add <LanguageToggle/>
src/app/(auth)/signup/page.tsx                           # <Wordmark/> + <LanguageToggle/> + preserve ?code for /join
src/app/(auth)/forgot-password/page.tsx                  # <Wordmark/> + <LanguageToggle/> + localize the one raw placeholder
src/app/(auth)/reset-password/page.tsx                   # <Wordmark/> + <LanguageToggle/>
src/lib/auth.ts                                          # localize sendResetPassword off User.locale
src/lib/reset-email.ts + reset-email.test.ts            # pure resetEmailContent(locale, url) (new)
messages/en.json + messages/ar.json                      # marketing.* keys + any missing auth.* + reset-email keys
package.json                                             # drop gsap + @gsap/react
README.md                                                # refresh to the redesigned product
```

Phasing: Task 1 (Wordmark) unblocks the auth+landing swaps; Task 2 (keys) unblocks the landing rebuild (Task 4); Tasks 5–8 are independent cleanups; Task 9 verifies.

---

### Task 1: Shared `<Wordmark/>` (kills logo duplication + the raw violet shadow)

**Files:** Create `src/components/shared/wordmark.tsx`, `src/components/shared/wordmark.test.tsx`; Modify the 4 auth pages' logo block.

**Interfaces:**
- Produces: `export function Wordmark({ size?: "sm" | "md" }): JSX` — a `<Link href="/">` wrapping a rounded token badge with the app initial + `Speak<span className="text-primary">Path</span>` where "SpeakPath" comes from `t("common.appName")` (already exists). Uses a **token** shadow (`shadow-sticker` or none) — NEVER `shadow-violet-500/20`. `size` controls the badge dimensions (sm = h-6/w-6 footer, md = h-9/w-9 auth/nav).

- [ ] **Step 1: Write the failing test** `src/components/shared/wordmark.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocaleProvider } from "@/components/providers/locale-provider";
import en from "@/../messages/en.json";
import { Wordmark } from "./wordmark";

describe("Wordmark", () => {
  it("renders the localized app name and links home", () => {
    render(
      <LocaleProvider locale="en" messages={en}>
        <Wordmark />
      </LocaleProvider>
    );
    // "SpeakPath" is split across spans; assert the accessible link name contains it.
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/");
    expect(link.textContent).toContain("SpeakPath");
  });
});
```

- [ ] **Step 2: Run, verify fail** — `npx vitest run src/components/shared/wordmark.test.tsx` (module not found). Confirm the `LocaleProvider` prop shape first by reading `src/components/providers/locale-provider.tsx` — if its props differ (e.g. it reads a context differently), adapt the test wrapper to the real provider API rather than inventing one.
- [ ] **Step 3: Implement** `wordmark.tsx` ("use client"): the badge + wordmark, token shadow, `t("common.appName")` split so "Speak" is `text-foreground` and "Path" is `text-primary` (keep the existing visual). Accept `size`.
- [ ] **Step 4: Swap into the 4 auth pages** — replace each inline `<Link href="/">…S…SpeakPath…</Link>` logo block (login ~74-81, signup ~65-72, forgot ~46-53, reset — same block) with `<Wordmark />`. This deletes every `shadow-violet-500/20` in the auth tree.
- [ ] **Step 5: Run** — `npx vitest run src/components/shared/wordmark.test.tsx` green; `npx tsc --noEmit`; grep `shadow-violet` across `src/app/(auth)` returns nothing.
- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(brand): shared Wordmark component; drop raw violet logo shadow from auth"
```

---

### Task 2: Marketing i18n keys

**Files:** Modify `messages/en.json`, `messages/ar.json`.

**Interfaces:**
- Produces: a `marketing.*` namespace consumed by the landing rebuild (Task 4). Add to BOTH catalogs; parity test enforced.

- [ ] **Step 1: Add these keys to BOTH files** (English shown; add real Arabic for each — samples given, refine for tone):

```json
"marketing.navLogin": "Log in",
"marketing.navGetStarted": "Get started",
"marketing.heroBadge": "Interactive English learning",
"marketing.heroTitleLead": "Your path to",
"marketing.heroTitleEmph": "speaking English",
"marketing.heroSubtitle": "AI conversations, live teacher sessions, and interactive games — built for Arabic speakers learning English.",
"marketing.ctaStart": "Start learning free",
"marketing.ctaTeacher": "I'm a teacher",
"marketing.statExerciseTypes": "Exercise types",
"marketing.statScenarios": "AI scenarios",
"marketing.statSkills": "Skill categories",
"marketing.statLevels": "CEFR levels",
"marketing.whyEyebrow": "Why SpeakPath",
"marketing.whyTitle": "Everything you need to go from beginner to fluent.",
"marketing.featureConvTitle": "AI conversations",
"marketing.featureConvDesc": "Practice real scenarios — restaurants, interviews, doctor visits — with an AI that adapts to your level.",
"marketing.featureLiveTitle": "Live sessions",
"marketing.featureLiveDesc": "Learn in real time with your teacher and classmates. Interactive group sessions, not passive lectures.",
"marketing.featureGamesTitle": "Games & puzzles",
"marketing.featureGamesDesc": "Grammar puzzles, vocabulary matching, word builders, speed quizzes — learn while having fun.",
"marketing.featurePlacementTitle": "Smart placement",
"marketing.featurePlacementDesc": "An AI placement exam maps your strengths and gaps across grammar, vocabulary, and comprehension.",
"marketing.featureProgressTitle": "Progress tracking",
"marketing.featureProgressDesc": "XP, streaks, and skill breakdowns — see exactly where you stand and how far you've come.",
"marketing.featureArabicTitle": "Built for Arabic speakers",
"marketing.featureArabicDesc": "A fully bilingual interface with translation exercises and culturally relevant scenarios.",
"marketing.previewEyebrow": "See it in action",
"marketing.previewTitle": "A learning path that actually fits you.",
"marketing.howEyebrow": "How it works",
"marketing.howTitle": "Three steps to fluency.",
"marketing.step1Title": "Take the placement exam",
"marketing.step1Desc": "The AI assesses your grammar, vocabulary, and comprehension to place you at the right level.",
"marketing.step2Title": "Join live sessions",
"marketing.step2Desc": "Your teacher leads interactive group sessions with exercises, games, and AI conversation practice.",
"marketing.step3Title": "Practice & level up",
"marketing.step3Desc": "Complete exercises, earn XP, keep your streak, and watch your skills grow day by day.",
"marketing.finalTitle": "Ready to speak with confidence?",
"marketing.finalSubtitle": "Start your English journey today — no credit card, no commitment, just learning.",
"marketing.finalCta": "Create a free account",
"marketing.footerRights": "© 2026 SpeakPath",
"marketing.footerPrivacy": "Privacy",
"marketing.footerTerms": "Terms",
"marketing.langToggle": "العربية"
```

Arabic sample values (refine): `"تسجيل الدخول"`, `"ابدأ الآن"`, `"تعلّم إنجليزي تفاعلي"`, `"طريقك إلى"`, `"إتقان الإنجليزية"`, `"محادثات بالذكاء الاصطناعي، جلسات مباشرة مع معلمك، وألعاب تفاعلية — مصمّمة للناطقين بالعربية."`, `"ابدأ التعلم مجانًا"`, `"أنا معلم"`, `"أنواع التمارين"`, `"سيناريوهات ذكية"`, `"فئات المهارات"`, `"مستويات CEFR"`, `"لماذا SpeakPath"`, `"كل ما تحتاجه للانتقال من مبتدئ إلى طليق."`, feature titles/descs in Arabic, `"شاهدها أثناء العمل"`, `"مسار تعلّم يناسبك فعلًا."`, `"كيف يعمل"`, `"ثلاث خطوات نحو الطلاقة."`, the three steps, `"جاهز لتتحدث بثقة؟"`, `"ابدأ رحلتك مع الإنجليزية اليوم — دون بطاقة ائتمان ودون التزام."`, `"أنشئ حسابًا مجانيًا"`, `"© 2026 SpeakPath"`, `"الخصوصية"`, `"الشروط"`, and `marketing.langToggle` = `"English"` (the toggle shows the OTHER language's name, mirroring `common.language`).

- [ ] **Step 2: Parity** — `npx vitest run src/lib/i18n.test.ts` green.
- [ ] **Step 3: Commit**

```bash
git add messages/en.json messages/ar.json
git commit -m "feat(i18n): marketing landing keys"
```

---

### Task 3: Anonymous language toggle (landing + auth)

**Files:** Create `src/components/shared/language-toggle.tsx`; Modify the 4 auth pages (mount it) — landing mounts it in Task 4.

**Interfaces:**
- Consumes: `useLocale()` + whatever the authenticated sidebar toggle uses to switch locale (find it — read the sidebar language-toggle code from Phase 1). Reuse that mechanism (cookie write + `router.refresh()`), do NOT invent a new one.
- Produces: `<LanguageToggle className?: string />` — a compact button showing the OTHER language's name (`t("common.language")` already flips: en catalog value is "العربية", ar catalog is "English") that switches locale and refreshes. Works for an anonymous visitor (no auth). SSR-safe.

- [ ] **Step 1: Read** the existing sidebar toggle (grep `useLocale`/`setLocale`/`common.language` in `src/components`) to learn the exact switch mechanism, then extract/reuse it. If Phase 1 already exposed a reusable `setLocale`, wrap it; if the logic was inline in the sidebar, lift the shared part into this component and have the sidebar reuse it (DRY).
- [ ] **Step 2: Implement** `language-toggle.tsx` ("use client") — a small `<Button variant="ghost" size="sm">` (or a plain token-styled button matching the sidebar) with a `Languages` lucide icon + `t("common.language")`. Guard against double-click during the pending switch (Phase 1 sidebar had this guard — reuse it).
- [ ] **Step 3: Mount** in the 4 auth pages — top-end corner of the card container (logical `end-` positioning, absolute within the `relative` wrapper), so a visitor can switch before signing in.
- [ ] **Step 4: Run** — `npx tsc --noEmit`, `npm run build`, `npm run lint` clean; headless/code-trace: toggling flips `common.language` and the visible chrome.
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(i18n): anonymous language toggle on landing + auth"
```

---

### Task 4: Landing page rebuild (honest content, tokens, RTL, i18n, lucide, gated motion)

**Files:** Modify `src/app/(marketing)/page.tsx`.

**Interfaces:**
- Consumes: `Wordmark` (Task 1), `LanguageToggle` (Task 3), `marketing.*` keys (Task 2), `Button`, lucide icons, framer-motion.
- Produces: the rebuilt landing — same section flow (nav, hero+stats, features, product preview, how-it-works, final CTA, footer) but fully localized, RTL-safe, token-only, lucide-iconed, with a truthful product preview and reduced-motion-gated animation.

- [ ] **Step 1: Localize + tokenize all chrome.** Replace every hardcoded string with `t("marketing.*")`. Nav: `<Wordmark size="md"/>` + `<LanguageToggle/>` + `t("marketing.navLogin")` link + `<Button … href="/signup">{t("marketing.navGetStarted")}</Button>`. Hero: badge `t("marketing.heroBadge")`, title two-line (`heroTitleLead` foreground + `heroTitleEmph` primary), subtitle, CTAs `t("marketing.ctaStart")` (brand) + `t("marketing.ctaTeacher")` (ghost, `href="/signup?role=teacher"`). Stats: keep the 4-tile grid but labels via keys (`statExerciseTypes` etc.); keep the numeric values (10+, 10+, 6, A1–C2) — those are honest facts.

- [ ] **Step 2: Kill the raw-violet utilities** (enumerated — lint won't catch these):
  - Hero badge `bg-violet-500/5` → `bg-secondary`; keep `border-primary/25`.
  - Ping dot `bg-violet-400` (hero badge + scroll indicator) → `bg-primary` — OR remove the infinite ping/scroll-indicator entirely (ambient; §3.4 favours calm). **Remove the perpetual scroll indicator** (lines ~183-201) and the badge's infinite ping; a static dot is fine.
  - Feature `accent` gradients (`from-violet-500/20 to-purple-500/20`, `from-blue-…`, `from-amber-…`, etc.) → delete the `accent` field; render each feature icon in a uniform `bg-secondary text-primary` rounded tile (no gradients, no rainbow — §3.1 bans gradient accents and forbids leaf/coral as accents).
  - Step-number hover `group-hover:text-violet-500/50` → `group-hover:text-primary/50`.

- [ ] **Step 3: Replace emoji icons with lucide** (§3.3). Feature icons: `MessageCircle` (conversations), `Users` (live), `Gamepad2` (games), `ClipboardList` (placement), `BarChart3` (progress), `Globe` (Arabic). 24px, `text-primary`. Remove the `icon` emoji field.

- [ ] **Step 4: RTL-safe.** No physical-direction utilities (audit for `left-`/`right-`/`ml-`/`mr-`/`pl-`/`pr-` — the scroll indicator's `left-1/2 -translate-x-1/2` is removed with it; if any centered absolute remains use `start-1/2` + logical translate or a flex wrapper). Remove raw `→`/`←` glyphs from CTA copy (they're now in keys without arrows); if a directional affordance is wanted, use a lucide `ArrowRight` with `className="rtl:-scale-x-100"` so it mirrors. The section layouts are centered/flex and mirror naturally.

- [ ] **Step 5: Honest product preview** (replaces "no particle hero" intent with real substance). Add a preview section (`marketing.previewEyebrow`/`previewTitle`) rendering a **browser-frame mock built from real tokens** — a `rounded-card border-2 border-border shadow-sticker` panel with a faux top bar (three `bg-muted` dots) framing a small, static representation of the Path (a few sticker "unit" cards + a progress track using `bg-primary`) so the preview is truthful (the real design), needs no external image, and is fully token/RTL-safe. (If a real screenshot is later provided, it can be dropped into this frame — but do NOT ship a placeholder photo or a faked particle hero.)

- [ ] **Step 6: Gate motion.** Wrap the page (or the animated subtree) in framer-motion's `<MotionConfig reducedMotion="user">`, or use `useReducedMotion()` to disable the entrance transforms when the user prefers reduced motion. Keep the entrance fade/slide (tasteful, one-shot) but ensure nothing loops ambiently (the ping + scroll indicator were removed in Step 2).

- [ ] **Step 7: Verify** — `npx tsc --noEmit`, `npm run build`, `npm run lint` clean; `npx vitest run src/lib/i18n.test.ts` green; grep the file for `violet-`, `purple-`, `blue-`, `amber-`, `emerald-`, `pink-`, `cyan-`, `rose-` → none; grep for emoji → none; grep for `→`/`←` → none. Manually read the file to confirm every visible string is `t()`.
- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(marketing)!: rebuild landing in-brand — bilingual, tokens, lucide, honest preview, gated motion"
```

---

### Task 5: Localized password-reset email

**Files:** Create `src/lib/reset-email.ts`, `src/lib/reset-email.test.ts`; Modify `src/lib/auth.ts` (`sendResetPassword` ~31-37); add reset-email keys to catalogs (or keep them as a small in-module map — see Step 1).

**Interfaces:**
- Produces: `export function resetEmailContent(locale: string, url: string): { subject: string; text: string }` — returns EN or AR (default EN for any non-"ar" locale) subject + body with the reset `url` interpolated. The reset email is sent OUTSIDE React (no `useT()`), so keep the two small templates in this pure module (not the JSON catalogs — those feed the client `t()`), keyed by locale.

- [ ] **Step 1: Write the failing test** `src/lib/reset-email.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { resetEmailContent } from "@/lib/reset-email";

describe("resetEmailContent", () => {
  it("returns Arabic content for locale 'ar' with the url embedded", () => {
    const { subject, text } = resetEmailContent("ar", "https://x/reset?token=abc");
    expect(subject).toMatch(/[؀-ۿ]/); // contains Arabic
    expect(text).toContain("https://x/reset?token=abc");
  });
  it("defaults to English for an unknown/absent locale", () => {
    expect(resetEmailContent("en", "u").subject).toBe(resetEmailContent("xx", "u").subject);
    expect(resetEmailContent("en", "u").subject).toMatch(/reset/i);
  });
  it("never omits the url", () => {
    expect(resetEmailContent("ar", "URL").text).toContain("URL");
  });
});
```

- [ ] **Step 2: Run, verify fail** — `npx vitest run src/lib/reset-email.test.ts`.
- [ ] **Step 3: Implement** `reset-email.ts` — a `locale === "ar" ? {ar} : {en}` map. EN keeps the current copy (`subject: "Reset your SpeakPath password"`, `text: "Reset your password: {url}\nIf you didn't ask for this, ignore this email."`); AR is the real-Arabic equivalent.
- [ ] **Step 4: Wire into `auth.ts`** — `sendResetPassword: async ({ user, url }) => { const locale = (user as { locale?: string }).locale ?? "en"; const { subject, text } = resetEmailContent(locale, url); await sendEmail({ to: user.email, subject, text }); }`. (Confirm `user.locale` is present on the better-auth user object; if not, look it up via `db.user.findUnique({ where: { id: user.id }, select: { locale: true } })` — the field exists from Phase 1.)
- [ ] **Step 5: Run** — `npm test` green (new tests + no regressions), `npx tsc --noEmit`, `npm run build`.
- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(auth): localize the password-reset email off the user's locale"
```

---

### Task 6: Signup preserves the `/join` class code

**Files:** Modify `src/app/(auth)/signup/page.tsx`.

**Interfaces:**
- Consumes: `useSearchParams()` (already used for `role`).
- Produces: signup now also reads `?code=` and, after a successful STUDENT signup, redirects to `/join?code=<code>` (so a student who arrived from a class invite lands back on the join flow) instead of the generic `/student/onboarding`. TEACHER path and the no-code path are unchanged. Closes the P3-deferred gap where the invite code was dropped through signup.

- [ ] **Step 1** — In `SignupForm`, read `const code = searchParams.get("code")` (sanitize: keep only if it matches the 6-char code shape the join flow expects — trim, `A-Z0-9`, length check; else ignore). On success with `role === "STUDENT"` and a valid `code`, `router.push('/join?code=' + encodeURIComponent(code))`; else keep the existing `role === "TEACHER" ? "/teacher" : "/student/onboarding"`.
- [ ] **Step 2** — If a `login` link on this page should also preserve the code, thread it (the landing/`/join` already send `?code` to signup — confirm the `/join` page's "create account" CTA passes `?code`, and that this redirect closes the loop). Keep the change minimal.
- [ ] **Step 3: Verify** — `npx tsc --noEmit`, `npm run build`, `npm run lint` clean. Code-trace: `/signup?code=ABC123&role=student` → after signup → `/join?code=ABC123`.
- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(auth): preserve the class join code through signup"
```

---

### Task 7: Cleanup — drop GSAP, refresh README, isolate remaining interpolated names

**Files:** Modify `package.json`; Modify `README.md`; Modify the highest-value name-interpolation sites.

- [ ] **Step 1: Confirm GSAP is dead** — `grep -rn "gsap\|@gsap/react" src/` returns nothing (verified at plan time). Remove `"gsap"` and `"@gsap/react"` from `package.json` dependencies. Run `npm install` to update the lockfile.
- [ ] **Step 2: Verify build without GSAP** — `npm run build` + `npx tsc --noEmit` succeed (nothing imported it).
- [ ] **Step 3: Interpolated-name bidi (bounded).** Isolate the interpolated NAME in the highest-visibility flat-string messages so a Latin name doesn't reorder in Arabic — same technique as the live banner (`⁨<value>⁩` FSI/PDI at the `t()` call site, since `t()` returns a flat string). Apply to: `path.greeting` `{name}` (student home), `classes.joined` `{name}` (toast), `session.waitingForTeacher` `{teacher}` and `session.scheduledFor` — wherever a person/class name is interpolated. Grep `t("[a-z.]*", {` across `src` for `{ name:`/`{ teacher:`/`{ className:` call sites; wrap the value. Do NOT change the catalog strings — only the interpolated values at the call sites. (This is polish; keep it to the name-bearing sites, not every interpolation.)
- [ ] **Step 4: README** — rewrite `README.md` to describe the redesigned product: SpeakPath (bilingual AR/EN English-learning platform for Arabic speakers), the stack (Next.js 16 modified / React 19 / Tailwind v4 tokens / better-auth / Prisma-SQLite / OpenAI-with-offline-fallbacks), the design system (violet+sunshine, sticker/pressable, RTL), the feature set (Path, placement, practice, live sessions), and the dev/deploy commands (`npm run dev`, `npm test`, Docker/Caddy VPS deploy per the existing compose). Keep it honest and current — no aspirational features that don't exist.
- [ ] **Step 5: Verify** — `npm test` green, `npm run build`, `npx tsc --noEmit`, `npm run lint`, parity green.
- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: drop unused GSAP dependency; refresh README; bidi-isolate interpolated names"
```

---

### Task 8: Phase 5 verification

**Files:** none (verify + fix regressions inline).

- [ ] **Step 1: Full gate** — `npm run lint && npx tsc --noEmit && npm run build && npm test` — zero errors, all pass (≥ the Task-1/5 additions above the 425 baseline).
- [ ] **Step 2: Anti-regression greps** — across `src/app/(marketing)` + `src/app/(auth)`: no `shadow-violet`/`from-violet`/`to-violet`/`bg-violet`/`text-violet`/`purple-`/`blue-500`/`amber-500`/`emerald-`/`pink-`/`rose-`/`cyan-` raw-color utilities; no emoji; no raw `←`/`→`; no physical-direction utilities. `grep -rn "gsap" package.json src` → nothing. Every landing/auth visible string resolves through `t()`.
- [ ] **Step 3: Arabic pass (code-trace + headless where possible)** — landing, login, signup, forgot, reset render with `dir="rtl"` under the Arabic locale with no hardcoded English chrome and no mis-ordered names; the language toggle flips locale; product-preview frame mirrors; motion respects `prefers-reduced-motion`. Reset email sends Arabic content for an `ar` user (Task 5 test covers the pure content).
- [ ] **Step 4: Fix regressions inline; commit** (`fix(marketing): phase 5 verification fixes` — skip if none).
- [ ] **Step 5: Phase 5 final review** — dispatch a 2-lens whole-branch review (design-system/i18n completeness + behaviour/gates) over the Phase 5 diff; apply any fix wave; then the redesign is complete.
