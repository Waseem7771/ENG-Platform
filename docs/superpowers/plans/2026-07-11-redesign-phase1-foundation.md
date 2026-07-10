# SpeakPath Redesign — Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dark glow/particles theme with the approved violet+sunshine light design system, add bilingual (en/ar) UI with RTL, and fix the auth flow (atomic role at signup, forgot-password) — leaving every existing screen functional in the new theme.

**Architecture:** Design tokens move to Tailwind v4 `@theme` variables in `globals.css` (light-first, spec §3.1); Rubik (Latin+Arabic) replaces broken Geist wiring; a minimal homegrown i18n layer (JSON catalogs + server `getLocale` from cookie/Accept-Language + client `LocaleProvider`) sets `<html lang dir>` server-side; the shadcn `ui/` primitives are restyled and become the only button/card system; existing screens are mechanically re-themed via a codemod sweep; better-auth `databaseHooks.user.create.before` assigns role server-side, killing `/api/auth/set-role`.

**Tech Stack:** Next.js 16.2.1 (modified — see Global Constraints), React 19, Tailwind v4, better-auth 1.5.6, Prisma 7 (SQLite/libsql), Vitest (new), @testing-library/react (new), nodemailer (new).

**Spec:** `docs/superpowers/specs/2026-07-11-speakpath-redesign-design.md` (sections 3, 4, 8, 9 govern this phase).

## Global Constraints

- **This Next.js 16.2.1 differs from public Next** (AGENTS.md). Verified conventions: `cookies()`/`headers()`/`params`/`searchParams` are **async — always `await`**; middleware is renamed — the file is `src/proxy.ts` exporting `proxy` (do NOT create `middleware.ts`); route-handler `context.params` is a Promise. When unsure, read `node_modules/next/dist/docs/`.
- `src/proxy.ts` currently exports `proxyConfig`; docs use `config`. **Do not rename** — it works; out of scope.
- better-auth: `role` and `level` additionalFields keep **`input: false`** — clients must never be able to set them via sign-up body or update-user. This is a hard security invariant.
- Palette (spec §3.1, exact): paper `#FBF8F1`, panel `#FFFFFF`, ink `#2B2440`, ink-soft `#625B7A`, line `#E5DFF0`, line-strong `#D5CDE8`, violet `#6C4CF1`, violet-deep `#4F35C4`, violet-soft `#EFEAFE`, sun `#FFB424`, sun-deep `#D98F00`, sun-soft `#FFF3D6`, leaf `#2EA86B` (text `#23935C`), leaf-soft `#E3F6EC`, coral `#E05252`, coral-soft `#FDEAE9`.
- Radii: buttons 14px (`rounded-btn`), cards 20px (`rounded-card`). Light theme ONLY this phase (no `.dark`, no next-themes).
- Banned in app code (enforced by Task 14 lint rules): `text-white/NN` opacity classes, raw hex colors in `className`, physical direction utilities `pl-`/`pr-`/`ml-`/`mr-`/`border-l`/`border-r`/`left-`/`right-`/`text-left`/`text-right` (use logical: `ps-`/`pe-`/`ms-`/`me-`/`border-s`/`border-e`/`start-`/`end-`/`text-start`/`text-end`).
- All user-visible UI strings go through the i18n catalog (`t("...")`) — no hardcoded English in components touched by this plan. English exercise *content* is exempt.
- Arabic text: never uppercase, never letter-spacing; `lang`/`dir` come from the root layout only; English sentence islands get explicit `dir="ltr"`.
- Commands are cross-platform npm/npx (environment is Windows; avoid bash-isms in scripts).
- Work happens on branch `redesign/v2`. Commit after every task with the message given in the task.
- Definition of done per task: its tests pass, `npm run build` succeeds, `npm run lint` has no NEW errors.

## File Structure (created/modified this phase)

```text
messages/en.json, messages/ar.json          # i18n catalogs (new)
src/lib/i18n.ts                             # server: locales, getLocale, dirFor, getMessages, translate (new)
src/lib/i18n.test.ts                        # (new)
src/components/providers/locale-provider.tsx # client context: useT, useLocale (new)
src/components/providers/locale-provider.test.tsx # (new)
src/app/actions/set-locale.ts               # server action: cookie + User.locale (new)
src/lib/email.ts                            # sendEmail: SMTP or console fallback (new)
src/app/(auth)/forgot-password/page.tsx     # (new)
src/app/(auth)/reset-password/page.tsx      # (new)
scripts/retheme.mjs                         # class-mapping codemod (new)
vitest.config.ts, tests/global-setup.ts     # test infra (new)
src/app/globals.css                         # tokens rewritten
src/app/layout.tsx                          # Rubik, lang/dir, LocaleProvider
src/lib/auth.ts                             # databaseHooks + sendResetPassword + locale field
src/app/(auth)/signup/page.tsx              # single-request signup
src/app/(auth)/login/page.tsx               # retheme + forgot link
src/components/ui/button.tsx                # new variants/sizes
src/components/ui/card.tsx, badge.tsx, progress.tsx # restyle
src/components/shared/sidebar.tsx           # lucide, i18n, RTL, lang toggle
src/components/shared/score-ring.tsx        # tokens instead of hex
src/components/ui/sonner.tsx                # light theme, drop next-themes
eslint.config.mjs                           # guardrail rules
prisma/schema.prisma                        # User.locale
DELETED: src/app/api/auth/set-role/route.ts and 15 shared effect components (Task 6/7/8/14)
```

---

### Task 1: Vitest test infrastructure

**Files:**
- Create: `vitest.config.ts`, `tests/global-setup.ts`, `src/lib/gamification.test.ts`
- Modify: `package.json` (devDeps + `test` script), `.gitignore` (test db)

**Interfaces:**
- Produces: `npm test` (= `vitest run`), `npx vitest run <file>` for single files. Test DB at `prisma/test.db` with `DATABASE_URL`/`BETTER_AUTH_SECRET` set by `tests/global-setup.ts` — later tasks' integration tests rely on this.

- [ ] **Step 1: Install dev dependencies**

Run: `npm install -D vitest @testing-library/react @testing-library/dom jsdom @vitejs/plugin-react`
Expected: added to devDependencies, no peer errors (React 19 is supported by @testing-library/react ≥16).

- [ ] **Step 2: Create vitest config and global setup**

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    globalSetup: ["./tests/global-setup.ts"],
    environment: "node",
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
```

`tests/global-setup.ts`:

```ts
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";

export default function setup() {
  const dbPath = path.resolve(process.cwd(), "prisma/test.db");
  rmSync(dbPath, { force: true });
  process.env.DATABASE_URL = `file:${dbPath}`;
  process.env.BETTER_AUTH_SECRET = "vitest-secret-0123456789-0123456789-01";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
  });
}
```

Add to `package.json` scripts: `"test": "vitest run"`. Add `prisma/test.db*` to `.gitignore`.

- [ ] **Step 3: Write a real test against existing code to prove the harness**

`src/lib/gamification.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { xpForScore, categoriesForType } from "@/lib/gamification";

describe("xpForScore", () => {
  it("scales points by score percentage", () => {
    expect(xpForScore(10, 100)).toBe(10);
    expect(xpForScore(10, 50)).toBe(5);
  });
  it("awards minimum 1 XP for any positive score", () => {
    expect(xpForScore(10, 1)).toBe(1);
  });
  it("awards 0 XP for zero score", () => {
    expect(xpForScore(10, 0)).toBe(0);
  });
});

describe("categoriesForType", () => {
  it("maps QUIZ to grammar+vocabulary", () => {
    expect(categoriesForType("QUIZ")).toEqual(["GRAMMAR", "VOCABULARY"]);
  });
  it("maps CONVERSATION to speaking", () => {
    expect(categoriesForType("CONVERSATION")).toEqual(["SPEAKING"]);
  });
});
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test`
Expected: 5 tests pass. (If `categoriesForType` returns different arrays, read `src/lib/gamification.ts` and fix the EXPECTATIONS to match actual behavior — this task characterizes existing code, it does not change it.)

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts tests/global-setup.ts src/lib/gamification.test.ts package.json package-lock.json .gitignore
git commit -m "test: add vitest infrastructure with migrated sqlite test db"
```

---

### Task 2: `User.locale` migration + better-auth field

**Files:**
- Modify: `prisma/schema.prisma:12-40` (User model), `src/lib/auth.ts` (additionalFields)
- Create: migration via CLI

**Interfaces:**
- Produces: `User.locale: string` (default `"ar"`, values `"ar" | "en"`); better-auth additionalField `locale` with `input: true` (user-settable — harmless, unlike role).

- [ ] **Step 1: Add the field to the Prisma User model**

In `prisma/schema.prisma`, after the `level` line in `model User`:

```prisma
  locale        String    @default("ar") // ar | en — UI language
```

- [ ] **Step 2: Create the migration**

Run: `npx prisma migrate dev --name add-user-locale`
Expected: new folder under `prisma/migrations/`, client regenerated. (Dev DATABASE_URL comes from `.env` as today.)

- [ ] **Step 3: Register the field with better-auth**

In `src/lib/auth.ts`, inside `user.additionalFields` after the `level` entry:

```ts
      locale: {
        type: "string",
        required: false,
        defaultValue: "ar",
        input: true,
      },
```

`role` and `level` stay exactly as they are (`input: false`).

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/auth.ts
git commit -m "feat(i18n): add User.locale with better-auth field"
```

---

### Task 3: Server i18n core (catalogs + getLocale) — TDD

**Files:**
- Create: `messages/en.json`, `messages/ar.json`, `src/lib/i18n.ts`, `src/lib/i18n.test.ts`

**Interfaces:**
- Produces (exact, later tasks import these):

```ts
export type Locale = "en" | "ar";
export const LOCALES: readonly Locale[];
export const LOCALE_COOKIE = "sp_locale";
export function dirFor(locale: Locale): "ltr" | "rtl";
export function pickLocale(cookieValue: string | undefined, acceptLanguage: string | null): Locale;
export function getLocale(): Promise<Locale>;              // server-only: cookies() + headers()
export function getMessages(locale: Locale): Messages;      // Messages = Record<string, string>
export function translate(messages: Messages, key: string, vars?: Record<string, string | number>): string;
```

- [ ] **Step 1: Write the failing tests**

`src/lib/i18n.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { pickLocale, dirFor, getMessages, translate } from "@/lib/i18n";
import en from "../../messages/en.json";
import ar from "../../messages/ar.json";

describe("pickLocale", () => {
  it("prefers a valid cookie", () => {
    expect(pickLocale("en", "ar,en;q=0.5")).toBe("en");
    expect(pickLocale("ar", "en-US")).toBe("ar");
  });
  it("ignores an invalid cookie", () => {
    expect(pickLocale("fr", "en-US")).toBe("en");
  });
  it("falls back to Accept-Language: arabic browsers get ar", () => {
    expect(pickLocale(undefined, "ar-SA,ar;q=0.9,en;q=0.8")).toBe("ar");
    expect(pickLocale(undefined, "en-US,en;q=0.9")).toBe("en");
  });
  it("defaults to en with no signals", () => {
    expect(pickLocale(undefined, null)).toBe("en");
  });
});

describe("dirFor", () => {
  it("maps ar to rtl and en to ltr", () => {
    expect(dirFor("ar")).toBe("rtl");
    expect(dirFor("en")).toBe("ltr");
  });
});

describe("catalogs", () => {
  it("en and ar have identical key sets", () => {
    expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort());
  });
  it("no empty values", () => {
    for (const cat of [en, ar]) {
      for (const [k, v] of Object.entries(cat)) {
        expect(v, `empty value for ${k}`).not.toBe("");
      }
    }
  });
});

describe("translate", () => {
  it("returns the message for a key", () => {
    expect(translate(getMessages("en"), "common.cancel")).toBe("Cancel");
  });
  it("interpolates {vars}", () => {
    expect(translate({ greet: "Hi {name}" }, "greet", { name: "Sara" })).toBe("Hi Sara");
  });
  it("returns the key itself when missing (never crashes)", () => {
    expect(translate(getMessages("en"), "nope.missing")).toBe("nope.missing");
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npx vitest run src/lib/i18n.test.ts`
Expected: FAIL — cannot resolve `@/lib/i18n` / `messages/en.json`.

- [ ] **Step 3: Create the catalogs**

`messages/en.json` (flat keys, dot-namespaced — the initial catalog; later tasks add keys to BOTH files):

```json
{
  "common.appName": "SpeakPath",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.loading": "Loading...",
  "common.error": "Something went wrong. Please try again.",
  "common.back": "Back",
  "common.signOut": "Sign out",
  "common.language": "العربية",
  "nav.dashboard": "Dashboard",
  "nav.classes": "Classes",
  "nav.sessions": "Sessions",
  "nav.exercises": "Exercises",
  "nav.students": "Students",
  "nav.aiChat": "AI Chat",
  "nav.placement": "Placement",
  "nav.teacherDashboard": "Teacher Dashboard",
  "nav.studentDashboard": "Student Dashboard",
  "auth.signIn": "Sign in",
  "auth.signUp": "Create account",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.name": "Name",
  "auth.iAmStudent": "Student",
  "auth.iAmTeacher": "Teacher",
  "auth.haveAccount": "Already have an account?",
  "auth.noAccount": "New to SpeakPath?",
  "auth.forgotPassword": "Forgot your password?",
  "auth.resetPassword": "Reset password",
  "auth.newPassword": "New password",
  "auth.sendResetLink": "Send reset link",
  "auth.resetLinkSent": "If that email exists, a reset link is on its way.",
  "auth.passwordUpdated": "Password updated. Sign in with your new password.",
  "auth.signupRoleQuestion": "I'm joining as a"
}
```

`messages/ar.json` (same keys, Arabic values):

```json
{
  "common.appName": "SpeakPath",
  "common.cancel": "إلغاء",
  "common.save": "حفظ",
  "common.loading": "جارٍ التحميل...",
  "common.error": "حدث خطأ ما. حاول مرة أخرى.",
  "common.back": "رجوع",
  "common.signOut": "تسجيل الخروج",
  "common.language": "English",
  "nav.dashboard": "الرئيسية",
  "nav.classes": "الصفوف",
  "nav.sessions": "الجلسات",
  "nav.exercises": "التمارين",
  "nav.students": "الطلاب",
  "nav.aiChat": "محادثة الذكاء الاصطناعي",
  "nav.placement": "اختبار المستوى",
  "nav.teacherDashboard": "لوحة المعلم",
  "nav.studentDashboard": "لوحة الطالب",
  "auth.signIn": "تسجيل الدخول",
  "auth.signUp": "إنشاء حساب",
  "auth.email": "البريد الإلكتروني",
  "auth.password": "كلمة المرور",
  "auth.name": "الاسم",
  "auth.iAmStudent": "طالب",
  "auth.iAmTeacher": "معلم",
  "auth.haveAccount": "لديك حساب بالفعل؟",
  "auth.noAccount": "جديد على SpeakPath؟",
  "auth.forgotPassword": "نسيت كلمة المرور؟",
  "auth.resetPassword": "إعادة تعيين كلمة المرور",
  "auth.newPassword": "كلمة المرور الجديدة",
  "auth.sendResetLink": "إرسال رابط إعادة التعيين",
  "auth.resetLinkSent": "إذا كان البريد موجودًا، فسيصلك رابط إعادة التعيين.",
  "auth.passwordUpdated": "تم تحديث كلمة المرور. سجّل الدخول بكلمتك الجديدة.",
  "auth.signupRoleQuestion": "أنضم بصفتي"
}
```

- [ ] **Step 4: Implement `src/lib/i18n.ts`**

```ts
import "server-only";
import { cookies, headers } from "next/headers";
import en from "../../messages/en.json";
import ar from "../../messages/ar.json";

export type Locale = "en" | "ar";
export type Messages = Record<string, string>;

export const LOCALES = ["en", "ar"] as const satisfies readonly Locale[];
export const LOCALE_COOKIE = "sp_locale";

const CATALOGS: Record<Locale, Messages> = { en, ar };

export function dirFor(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function pickLocale(
  cookieValue: string | undefined,
  acceptLanguage: string | null,
): Locale {
  if (cookieValue === "en" || cookieValue === "ar") return cookieValue;
  if (acceptLanguage && /(^|,|;|\s)ar\b/i.test(acceptLanguage)) return "ar";
  return "en";
}

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  return pickLocale(
    cookieStore.get(LOCALE_COOKIE)?.value,
    headerStore.get("accept-language"),
  );
}

export function getMessages(locale: Locale): Messages {
  return CATALOGS[locale];
}

export function translate(
  messages: Messages,
  key: string,
  vars?: Record<string, string | number>,
): string {
  let msg = messages[key];
  if (msg === undefined) return key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      msg = msg.replaceAll(`{${k}}`, String(v));
    }
  }
  return msg;
}
```

Note: `server-only` blocks client imports; the test file imports only pure functions — if `import "server-only"` breaks vitest, install the no-op stub: `npm i -D server-only` is NOT needed (it ships with Next). If vitest errors on it, add to `vitest.config.ts` `resolve.alias`: `{ "server-only": path.resolve(__dirname, "tests/server-only-stub.ts") }` with a stub file containing `export {}`.

- [ ] **Step 5: Run tests, verify pass**

Run: `npx vitest run src/lib/i18n.test.ts`
Expected: all pass. `resolveJsonModule` — if TS complains about JSON imports, add `"resolveJsonModule": true` to `tsconfig.json` compilerOptions.

- [ ] **Step 6: Commit**

```bash
git add messages src/lib/i18n.ts src/lib/i18n.test.ts tsconfig.json vitest.config.ts tests
git commit -m "feat(i18n): en/ar catalogs + server locale resolution"
```

---

### Task 4: Client i18n (LocaleProvider, useT) + setLocale action — TDD

**Files:**
- Create: `src/components/providers/locale-provider.tsx`, `src/components/providers/locale-provider.test.tsx`, `src/app/actions/set-locale.ts`

**Interfaces:**
- Consumes: `Locale`, `Messages`, `translate`, `LOCALE_COOKIE`, `dirFor` from `@/lib/i18n` (pure parts only in the client file — import types and `translate` via a client-safe path, see Step 3).
- Produces:

```tsx
<LocaleProvider locale={locale} messages={messages}>...</LocaleProvider>
useT(): (key: string, vars?: Record<string, string | number>) => string
useLocale(): Locale
setLocale(locale: Locale): Promise<void>   // server action: cookie + User.locale + refresh
```

- [ ] **Step 1: Write the failing component test**

`src/components/providers/locale-provider.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocaleProvider, useT, useLocale } from "./locale-provider";

function Probe() {
  const t = useT();
  const locale = useLocale();
  return (
    <div>
      <span data-testid="msg">{t("common.cancel")}</span>
      <span data-testid="missing">{t("nope.missing")}</span>
      <span data-testid="loc">{locale}</span>
    </div>
  );
}

describe("LocaleProvider", () => {
  it("provides translations and locale", () => {
    render(
      <LocaleProvider locale="ar" messages={{ "common.cancel": "إلغاء" }}>
        <Probe />
      </LocaleProvider>,
    );
    expect(screen.getByTestId("msg").textContent).toBe("إلغاء");
    expect(screen.getByTestId("missing").textContent).toBe("nope.missing");
    expect(screen.getByTestId("loc").textContent).toBe("ar");
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run src/components/providers/locale-provider.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Split client-safe pure code, then implement the provider**

Move the PURE parts of i18n into `src/lib/i18n-shared.ts` (no `server-only`, no next imports): `Locale`, `Messages`, `LOCALES`, `LOCALE_COOKIE`, `dirFor`, `pickLocale`, `translate`. Re-export all of them from `src/lib/i18n.ts` (which keeps `server-only`, `getLocale`, `getMessages`). Update `src/lib/i18n.test.ts` imports to `@/lib/i18n-shared` for pure functions and keep catalog tests importing the JSON directly.

`src/components/providers/locale-provider.tsx`:

```tsx
"use client";

import { createContext, useContext, useCallback } from "react";
import { translate, type Locale, type Messages } from "@/lib/i18n-shared";

const LocaleContext = createContext<{ locale: Locale; messages: Messages }>({
  locale: "en",
  messages: {},
});

export function LocaleProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
}) {
  return (
    <LocaleContext.Provider value={{ locale, messages }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): Locale {
  return useContext(LocaleContext).locale;
}

export function useT() {
  const { messages } = useContext(LocaleContext);
  return useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      translate(messages, key, vars),
    [messages],
  );
}
```

`src/app/actions/set-locale.ts`:

```ts
"use server";

import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, LOCALES, type Locale } from "@/lib/i18n-shared";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function setLocale(locale: Locale): Promise<void> {
  if (!LOCALES.includes(locale)) return;
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) {
    await db.user.update({
      where: { id: session.user.id },
      data: { locale },
    });
  }
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test`
Expected: all pass (i18n tests still green after the split).

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n-shared.ts src/lib/i18n.ts src/lib/i18n.test.ts src/components/providers src/app/actions/set-locale.ts
git commit -m "feat(i18n): client LocaleProvider + setLocale server action"
```

---

### Task 5: Design tokens, Rubik fonts, root layout lang/dir

**Files:**
- Modify: `src/app/globals.css` (rewrite theme section), `src/app/layout.tsx`, `src/components/ui/sonner.tsx`

**Interfaces:**
- Produces: Tailwind utilities used by ALL later tasks — semantic (`bg-background`, `text-foreground`, `text-muted-foreground`, `bg-card`, `border-border`, `bg-primary`, `text-primary`, `bg-secondary`, `bg-muted`, `text-destructive`…) plus brand extras: `bg-sun`, `text-sun-deep`, `bg-sun-soft`, `bg-leaf`, `text-leaf-text`, `bg-leaf-soft`, `bg-coral-soft`, `border-line-strong`, `bg-brand-deep`; radii `rounded-btn` (14px), `rounded-card` (20px); shadows `shadow-press-brand`, `shadow-press-sun`, `shadow-press-line`, `shadow-sticker`. Root layout renders `<html lang={locale} dir={dirFor(locale)}>` and wraps children in `LocaleProvider`.

- [ ] **Step 1: Rewrite the token block in `globals.css`**

Replace everything from `:root {` (line 52) through the end of the glow utilities layer (line 142) AND delete the `.noise` block (lines 144-154). Keep lines 1-49 (`@import`s, `@custom-variant`, `@theme inline`) but fix the font wiring inside `@theme inline`: change `--font-sans: var(--font-sans);` to `--font-sans: var(--font-rubik);` and `--font-heading: var(--font-sans);` to `--font-heading: var(--font-rubik);`. Add to the SAME `@theme inline` block:

```css
  --color-sun: var(--sun);
  --color-sun-deep: var(--sun-deep);
  --color-sun-soft: var(--sun-soft);
  --color-leaf: var(--leaf);
  --color-leaf-text: var(--leaf-text);
  --color-leaf-soft: var(--leaf-soft);
  --color-coral-soft: var(--coral-soft);
  --color-line-strong: var(--line-strong);
  --color-brand-deep: var(--brand-deep);
  --radius-btn: 14px;
  --radius-card: 20px;
  --shadow-press-brand: 0 4px 0 0 var(--brand-deep);
  --shadow-press-sun: 0 4px 0 0 var(--sun-deep);
  --shadow-press-line: 0 4px 0 0 var(--line-strong);
  --shadow-sticker: 0 4px 0 0 var(--border);
```

New `:root` (replaces the old dark palette entirely):

```css
/* SpeakPath light-first theme — violet + sunshine (spec §3.1) */
:root {
  --background: #FBF8F1;
  --foreground: #2B2440;
  --card: #FFFFFF;
  --card-foreground: #2B2440;
  --popover: #FFFFFF;
  --popover-foreground: #2B2440;
  --primary: #6C4CF1;
  --primary-foreground: #FFFFFF;
  --secondary: #EFEAFE;
  --secondary-foreground: #4F35C4;
  --muted: #F3F0E9;
  --muted-foreground: #625B7A;
  --accent: #FFF3D6;
  --accent-foreground: #8A5B00;
  --destructive: #E05252;
  --border: #E5DFF0;
  --input: #D5CDE8;
  --ring: #6C4CF1;
  --chart-1: #6C4CF1;
  --chart-2: #FFB424;
  --chart-3: #2EA86B;
  --chart-4: #E05252;
  --chart-5: #625B7A;
  --radius: 0.75rem;
  --sidebar: #FFFFFF;
  --sidebar-foreground: #2B2440;
  --sidebar-primary: #6C4CF1;
  --sidebar-primary-foreground: #FFFFFF;
  --sidebar-accent: #EFEAFE;
  --sidebar-accent-foreground: #4F35C4;
  --sidebar-border: #E5DFF0;
  --sidebar-ring: #6C4CF1;
  --sun: #FFB424;
  --sun-deep: #D98F00;
  --sun-soft: #FFF3D6;
  --leaf: #2EA86B;
  --leaf-text: #23935C;
  --leaf-soft: #E3F6EC;
  --coral-soft: #FDEAE9;
  --line-strong: #D5CDE8;
  --brand-deep: #4F35C4;
}
```

Keep the `@layer base` block but: keep `* { @apply border-border outline-ring/50; }` and `body`/`html` rules; REPLACE the scrollbar colors with neutral (`oklch(0.85 0.01 290)` thumb, hover `oklch(0.75 0.02 290)`); REPLACE `::selection` with `background: var(--secondary); color: var(--secondary-foreground);`. Add Arabic line-height support at the end of `@layer base`:

```css
  :lang(ar) {
    line-height: 1.7;
    letter-spacing: 0;
  }
```

- [ ] **Step 2: Rewrite `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Rubik, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { getLocale, getMessages } from "@/lib/i18n";
import { dirFor } from "@/lib/i18n-shared";
import "./globals.css";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin", "arabic"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SpeakPath — Your Path to Speaking English",
  description:
    "Interactive English learning for Arabic speakers — AI conversations, live sessions, and a path that fits your level.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = getMessages(locale);
  return (
    <html
      lang={locale}
      dir={dirFor(locale)}
      className={`${rubik.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LocaleProvider locale={locale} messages={messages}>
          {children}
          <Toaster />
        </LocaleProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Pin sonner to light theme**

In `src/components/ui/sonner.tsx`: remove the `useTheme` import/usage (next-themes has no provider — it silently misbehaves) and pass `theme="light"` to the `<Sonner>` component. Keep everything else.

- [ ] **Step 4: Verify build + visual smoke**

Run: `npm run build`
Expected: success. Then `npm run dev`, open `http://localhost:3000`: page background must be warm paper (`#FBF8F1`) and text dark ink; the marketing page will look wrong/ugly (light bg under white text) — that is EXPECTED until Tasks 8-10 sweep it. Verify in devtools that `<html>` has `lang="en" dir="ltr"` (or `ar`/`rtl` if your browser prefers Arabic), and computed `font-family` on `body` starts with `Rubik`.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx src/components/ui/sonner.tsx
git commit -m "feat(design): violet+sunshine light tokens, Rubik ar+latin, lang/dir from locale"
```

---

### Task 6: Rebuild `ui/button` + replace GlowButton everywhere

**Files:**
- Modify: `src/components/ui/button.tsx`, then the 6 GlowButton consumers: `src/app/(auth)/signup/page.tsx`, `src/app/(auth)/login/page.tsx`, `src/components/exercise/results-screen.tsx`, `src/app/(marketing)/page.tsx`, `src/app/(dashboard)/student/page.tsx`, `src/app/(dashboard)/student/placement/page.tsx`
- Delete: `src/components/shared/glow-button.tsx`, `src/components/shared/shimmer-button.tsx` (0 importers)
- Test: `src/components/ui/button.test.tsx`

**Interfaces:**
- Produces: `<Button>` variants `brand` (default) | `sun` | `ghost` | `outline` | `destructive` | `link`; sizes `sm` (h-9) | `default` (h-11) | `lg` (h-13) | `icon` (size-11). ALL later tasks use these exact names. `brand`, `sun`, `ghost` have press physics (solid offset shadow, translate-y on active).

- [ ] **Step 1: Write the failing test**

`src/components/ui/button.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./button";

describe("Button", () => {
  it("defaults to the brand variant with press shadow", () => {
    render(<Button>Go</Button>);
    const btn = screen.getByRole("button", { name: "Go" });
    expect(btn.className).toContain("bg-primary");
    expect(btn.className).toContain("shadow-press-brand");
    expect(btn.className).toContain("rounded-btn");
  });
  it("renders the sun variant", () => {
    render(<Button variant="sun">Start</Button>);
    expect(screen.getByRole("button").className).toContain("bg-sun");
  });
  it("renders the ghost variant with line shadow", () => {
    render(<Button variant="ghost">Later</Button>);
    expect(screen.getByRole("button").className).toContain("shadow-press-line");
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `npx vitest run src/components/ui/button.test.tsx`
Expected: FAIL — current default variant has no `shadow-press-brand`.

- [ ] **Step 3: Restyle the CVA config**

In `src/components/ui/button.tsx`, keep the base-ui `Button` import, `cn`, CVA structure, and `data-slot`/icon conventions. Replace `buttonVariants` with:

```ts
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-btn border-2 border-transparent font-semibold whitespace-nowrap transition-[transform,box-shadow] duration-75 outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        brand:
          "bg-primary text-primary-foreground shadow-press-brand active:translate-y-1 active:shadow-none",
        sun: "bg-sun text-[#4A3200] shadow-press-sun active:translate-y-1 active:shadow-none",
        ghost:
          "bg-card text-foreground border-line-strong shadow-press-line active:translate-y-1 active:shadow-none",
        outline:
          "bg-transparent text-foreground border-line-strong hover:bg-muted",
        destructive:
          "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/15",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        default: "h-11 px-6 text-[15px]",
        lg: "h-13 px-8 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "brand", size: "default" },
  },
);
```

Note: `text-[#4A3200]` on `sun` is the ONE sanctioned hex-in-class (dark amber text token isn't worth a variable) — add it to the lint rule's allowlist in Task 14. Keep the component wrapper unchanged apart from the new variants type.

- [ ] **Step 4: Run test, verify pass**

Run: `npx vitest run src/components/ui/button.test.tsx`
Expected: PASS.

- [ ] **Step 5: Replace every GlowButton usage**

In each of the 6 consumer files: replace `import { GlowButton } from "@/components/shared/glow-button"` (exact import name may vary — check each file) with `import { Button } from "@/components/ui/button"`, and each `<GlowButton variant="primary" ...>` with `<Button ...>` / secondary-looking ones with `<Button variant="ghost" ...>`. GlowButton renders a `<button>`, so props (`onClick`, `disabled`, `type`, `className`) carry over; delete `className` gradient/glow overrides. Primary CTAs like "Start Exam"/submit → `variant="brand"`; "Try again"/back actions → `variant="ghost"`.

Then delete `src/components/shared/glow-button.tsx` and `src/components/shared/shimmer-button.tsx`.

- [ ] **Step 6: Verify build + tests**

Run: `npm run build && npm test`
Expected: build succeeds (no dangling imports — grep `glow-button` and `shimmer-button` in `src/` must return nothing), tests pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(design): pressable Button system replaces GlowButton"
```

---

### Task 7: Restyle Card/Badge/Progress + replace SpotlightCard

**Files:**
- Modify: `src/components/ui/card.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/progress.tsx`, and the 7 SpotlightCard consumers: `src/app/(marketing)/page.tsx`, `src/app/(dashboard)/teacher/students/page.tsx`, `src/app/(dashboard)/teacher/page.tsx`, `src/app/(dashboard)/teacher/exercises/page.tsx`, `src/app/(dashboard)/teacher/sessions/page.tsx`, `src/app/(dashboard)/teacher/classes/page.tsx`, `src/app/(dashboard)/student/page.tsx`
- Delete: `src/components/shared/spotlight-card.tsx`, plus dead files `src/components/shared/glow-card.tsx`, `tilted-card.tsx`, `aurora-background.tsx`, `click-spark.tsx`, `animated-gradient-text.tsx`, `blur-text.tsx`, `split-text.tsx` (all 0 importers)
- Test: `src/components/ui/card.test.tsx`

**Interfaces:**
- Consumes: tokens from Task 5.
- Produces: `Card` with sticker style (`rounded-card border-2 border-border bg-card shadow-sticker`); `Badge` gains variants `streak` | `xp` | `level` (chip styles); `Progress` with `bg-muted` track and `bg-primary` fill. Names/exports unchanged otherwise.

- [ ] **Step 1: Write the failing test**

`src/components/ui/card.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Card } from "./card";
import { Badge } from "./badge";

describe("sticker Card", () => {
  it("has 2px border, card radius, offset shadow", () => {
    const { container } = render(<Card>hi</Card>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("rounded-card");
    expect(el.className).toContain("border-2");
    expect(el.className).toContain("shadow-sticker");
  });
});

describe("Badge chips", () => {
  it("streak variant uses sun tokens", () => {
    const { container } = render(<Badge variant="streak">7</Badge>);
    expect((container.firstElementChild as HTMLElement).className).toContain("bg-sun-soft");
  });
  it("xp variant uses secondary tokens", () => {
    const { container } = render(<Badge variant="xp">450 XP</Badge>);
    expect((container.firstElementChild as HTMLElement).className).toContain("bg-secondary");
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `npx vitest run src/components/ui/card.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Restyle**

`card.tsx` — in the `Card` component's base class string, replace `rounded-xl bg-card ... ring-1 ring-foreground/10` with `rounded-card border-2 border-border bg-card shadow-sticker` (keep the flex/gap/padding/data-size machinery and all subcomponents; delete the `ring-1 ring-foreground/10`).

`badge.tsx` — in `badgeVariants`, adjust the base to `h-6 rounded-full border px-2.5 text-xs font-bold` (chips are slightly larger than the current h-5) and ADD to `variant`:

```ts
        streak: "bg-sun-soft text-accent-foreground border-sun/50 tabular-nums",
        xp: "bg-secondary text-secondary-foreground border-primary/25 tabular-nums",
        level: "bg-card text-muted-foreground border-line-strong",
```

`progress.tsx` — track `bg-muted h-3 rounded-full`, indicator `bg-primary rounded-full`; keep the component API as-is.

- [ ] **Step 4: Run test, verify pass**

Run: `npx vitest run src/components/ui/card.test.tsx`
Expected: PASS (fix the streak assertion if you used `text-accent-foreground` — assert on `bg-sun-soft` only, as written).

- [ ] **Step 5: Replace SpotlightCard usages and delete dead components**

In the 7 consumer files: `SpotlightCard` is a styled wrapper div — replace `<SpotlightCard className="...">` with `<div className="rounded-card border-2 border-border bg-card shadow-sticker ...">` (merge any layout classes like padding from the original usage; drop glow/spotlight-specific classes) and remove the import. Do NOT use `<Card>` here (it imposes flex-col/gap/padding that would shift these layouts — the sweep tasks keep pages functional, not redesigned).

Delete the 8 files listed in **Files → Delete**.

- [ ] **Step 6: Verify + commit**

Run: `npm run build && npm test` — expected: success; grep `spotlight-card|glow-card|tilted-card|aurora-background|click-spark|animated-gradient-text|blur-text|split-text` in `src/` returns nothing.

```bash
git add -A
git commit -m "feat(design): sticker Card, chip Badges, token Progress; delete dead effect components"
```

---

### Task 8: Retheme sweep A — codemod script + marketing & auth pages

**Files:**
- Create: `scripts/retheme.mjs`
- Modify: `src/app/(marketing)/page.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx`
- Delete: `src/components/shared/floating-particles.tsx` usages in these files (file deleted in Task 10 when last usage goes), `src/components/shared/text-reveal.tsx`, `src/components/shared/rotating-text.tsx` (marketing is their only importer)

**Interfaces:**
- Produces: `scripts/retheme.mjs` — reused verbatim by Tasks 9 and 10. Usage: `node scripts/retheme.mjs <file-or-dir> [...more]`.

- [ ] **Step 1: Create the codemod**

`scripts/retheme.mjs`:

```js
// Mechanical dark→light class mapping (spec §3.1 / audit remediation).
// Usage: node scripts/retheme.mjs <file-or-dir> [...more]
import { readFileSync, writeFileSync, statSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";

const REPLACEMENTS = [
  // text: 3-token system
  [/text-white\/(?:90|80|70)\b/g, "text-foreground"],
  [/text-white\/(?:60|50|40|30|25|20|15|10)\b/g, "text-muted-foreground"],
  [/(?<![\w/-])text-white(?![\w/-])/g, "text-foreground"],
  // surfaces
  [/bg-white\/\[0\.0[2-9]\]/g, "bg-card"],
  [/bg-white\/(?:5|10)\b/g, "bg-muted"],
  [/hover:bg-white\/(?:5|10)\b/g, "hover:bg-muted"],
  [/border-white\/(?:5|10|15|20)\b/g, "border-border"],
  [/hover:border-white\/(?:10|15|20|30)\b/g, "hover:border-line-strong"],
  [/divide-white\/(?:5|10)\b/g, "divide-border"],
  [/placeholder:text-white\/(?:20|25|30|40)\b/g, "placeholder:text-muted-foreground/70"],
  // glass + glow leftovers
  [/\s?backdrop-blur(?:-\w+)?\b/g, ""],
  [/\s?(?:glow-violet|glow-blue|glow-cyan|text-glow|border-glow|noise)\b/g, ""],
  // gradient text -> solid primary
  [
    /bg-gradient-to-r from-\w+-\d+ (?:via-\w+-\d+ )?to-\w+-\d+ bg-clip-text text-transparent/g,
    "text-primary",
  ],
  // gradient fills -> primary
  [/bg-gradient-to-(?:r|br|b) from-violet-\d+ to-blue-\d+/g, "bg-primary"],
  [/bg-gradient-to-(?:r|br|b) from-emerald-\d+ to-cyan-\d+/g, "bg-primary"],
  // hardcoded accents used on dark
  [/text-violet-[34]00\b/g, "text-primary"],
  [/text-emerald-[34]00\b/g, "text-leaf-text"],
  [/text-amber-[34]00\b/g, "text-sun-deep"],
  [/text-red-400\b/g, "text-destructive"],
  [/bg-violet-500\/10\b/g, "bg-secondary"],
  [/border-violet-500\/20\b/g, "border-primary/25"],
];

function processFile(file) {
  const before = readFileSync(file, "utf8");
  let after = before;
  for (const [re, to] of REPLACEMENTS) after = after.replace(re, to);
  if (after !== before) {
    writeFileSync(file, after);
    console.log("rethemed", file);
  }
}

function walk(target) {
  const st = statSync(target);
  if (st.isDirectory()) {
    for (const entry of readdirSync(target)) walk(join(target, entry));
  } else if ([".tsx", ".ts"].includes(extname(target))) {
    processFile(target);
  }
}

for (const target of process.argv.slice(2)) walk(target);
```

- [ ] **Step 2: Run it on marketing + auth**

Run:

```bash
node scripts/retheme.mjs "src/app/(marketing)" "src/app/(auth)"
```

Expected: all 3 page files reported as rethemed.

- [ ] **Step 3: Manual pass on the same files (things a regex can't do)**

In `(marketing)/page.tsx`: remove the `SpotlightBeam`, `FloatingParticles`, `GridBackground`, `TextReveal`, `RotatingText`, `CountUp` imports and their JSX. Replace `<RotatingText ... />` inside the h1 with the static word `English`. Replace `<TextReveal>` wrappers with plain `<span>`/`<p>` keeping children. Replace `<CountUp to={N} />` with the literal number text. Remove scroll-scrubbed opacity `useScroll`/`useTransform` hero effects if present (keep the page a plain server-renderable structure; simple `motion.div` fade-ins may stay). Marketing gets its REAL redesign in Phase 5 — this pass only makes it legible on light.

In `(auth)/login/page.tsx` and `(auth)/signup/page.tsx`: remove `SpotlightBeam`/`FloatingParticles`/`GridBackground` imports + JSX; the glass card div becomes `rounded-card border-2 border-border bg-card shadow-sticker p-8`; inputs lose the hardcoded `border-white/10 bg-white/5 ...` overrides (the restyled `ui/input` defaults are fine — if `ui/input` still looks dark-themed, strip its hardcoded overrides the same way). Role selector buttons (signup): replace emoji 🎓/👨‍🏫 with lucide `GraduationCap`/`Presentation` icons (import from `lucide-react`), active state `border-primary bg-secondary text-secondary-foreground`, inactive `border-line-strong bg-card`.

Delete `src/components/shared/text-reveal.tsx` and `src/components/shared/rotating-text.tsx`.

- [ ] **Step 4: Verify**

Run: `npm run build`, then `npm run dev` and eyeball `/`, `/login`, `/signup`: light paper background, ink text, readable, pressable buttons, no particles. Text contrast obviously OK.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(design): retheme codemod + light marketing/auth pages"
```

---

### Task 9: Retheme sweep B — student pages + exercise components

**Files:**
- Modify (codemod + manual): `src/app/(dashboard)/student/**` (all pages incl. `layout.tsx`, `page.tsx`, `exercises/`, `placement/`, `ai-chat/`, `sessions/`), `src/components/exercise/**`
- Modify: `src/components/shared/score-ring.tsx`, `src/components/shared/count-up.tsx` (keep, tokenize)

**Interfaces:**
- Consumes: `scripts/retheme.mjs` (Task 8), Button/Card/Badge (Tasks 6-7).

- [ ] **Step 1: Run the codemod**

```bash
node scripts/retheme.mjs "src/app/(dashboard)/student" src/components/exercise
```

- [ ] **Step 2: Manual pass**

- Remove `FloatingParticles` import + JSX from `src/app/(dashboard)/student/page.tsx` (and any other student page the grep finds: `grep -r "FloatingParticles" "src/app/(dashboard)/student"`).
- `src/components/shared/score-ring.tsx`: replace hardcoded `#7C3AED` / `#22D3EE` gradient stops with `var(--primary)` and `var(--sun)` (SVG accepts CSS vars in `stopColor`).
- `src/components/exercise/feedback-banner.tsx` + `option-button.tsx`: correct state → `bg-leaf-soft border-leaf text-leaf-text`; wrong state → `bg-coral-soft border-destructive text-destructive`; neutral option → `bg-card border-2 border-line-strong rounded-btn`. Keep all logic/props identical.
- `src/components/exercise/results-screen.tsx`: buttons already swapped in Task 6; ensure remaining chrome uses `bg-card`/`text-foreground`/`text-muted-foreground` only.
- Any leftover dark-only literals the codemod missed: `grep -rn "white/\|bg-\[#\|text-\[#\|from-violet\|from-emerald\|to-cyan" "src/app/(dashboard)/student" src/components/exercise` — fix each hit by hand using the same mappings (exercise-content strings are exempt; only classNames count).

- [ ] **Step 3: Verify**

Run: `npm run build && npm test`. Then dev server: log in as a student (seed teacher is not loginable — create a student via signup), check `/student`, `/student/exercises`, open one exercise, `/student/placement` intro: all legible on light, feedback states green/coral.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(design): retheme student surfaces + exercise feedback states"
```

---

### Task 10: Retheme sweep C — teacher pages + delete effect components

**Files:**
- Modify (codemod + manual): `src/app/(dashboard)/teacher/**`, `src/components/teacher/**`
- Delete: `src/components/shared/floating-particles.tsx`, `spotlight-beam.tsx`, `grid-background.tsx` (last usages die here)

**Interfaces:**
- Consumes: `scripts/retheme.mjs`, Button/Card/Badge.

- [ ] **Step 1: Run the codemod**

```bash
node scripts/retheme.mjs "src/app/(dashboard)/teacher" src/components/teacher
```

- [ ] **Step 2: Manual pass**

- Remove ALL `FloatingParticles`/`SpotlightBeam`/`GridBackground` imports + JSX: `grep -rn "FloatingParticles\|SpotlightBeam\|GridBackground" src/` and clear every remaining hit (teacher pages, session rooms, anywhere).
- Teacher dashboard `src/app/(dashboard)/teacher/page.tsx`: the emerald/cyan "Command Center" headline and emerald/teal/cyan/blue stat cards become token-based: headline `text-foreground` (plain, no gradient), stat cards all `bg-card border-2 border-border rounded-card shadow-sticker` with `text-primary` numerals. Spec §3.1: teacher surfaces use the SAME brand hue as student (the emerald identity dies).
- Dialogs (`src/components/teacher/**`): replace hardcoded dark backgrounds (`bg-[#15121f]` or similar — grep `bg-\[#` in src/components/teacher and src/app) with `bg-popover`; borders to `border-border`.
- Session overlay `src/app/(dashboard)/student/sessions/[id]/session-room.tsx` `#14111f` → `bg-background` (this file is student-side but its hex literal belongs to this cleanup — fix it now).
- Final leftovers check: `grep -rn "white/\|bg-\[#\|text-\[#" "src/app/(dashboard)" src/components` → zero classNames hits (string content exempt).

- [ ] **Step 3: Delete the last effect components**

Delete `floating-particles.tsx`, `spotlight-beam.tsx`, `grid-background.tsx`. Run `grep -rn "floating-particles\|spotlight-beam\|grid-background" src/` — must be empty.

- [ ] **Step 4: Verify + commit**

Run: `npm run build && npm test` — success. Dev server: check `/teacher`, `/teacher/classes`, one dialog opens light-themed.

```bash
git add -A
git commit -m "feat(design): retheme teacher surfaces, unify brand hue, delete effects kit"
```

---

### Task 11: Sidebar — lucide icons, i18n, RTL, language toggle

**Files:**
- Modify: `src/components/shared/sidebar.tsx`
- Test: `src/components/shared/sidebar.test.tsx`

**Interfaces:**
- Consumes: `useT`, `useLocale` (Task 4), `setLocale` action, Button (Task 6).
- Produces: same public signature `Sidebar({ role, user })` — no consumer changes needed. Nav items become `{ key: string; href: string; icon: LucideIcon }` with `key` = catalog key.

- [ ] **Step 1: Write the failing test**

`src/components/shared/sidebar.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { Sidebar } from "./sidebar";
import en from "../../../messages/en.json";
import ar from "../../../messages/ar.json";

vi.mock("next/navigation", () => ({
  usePathname: () => "/student",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/app/actions/set-locale", () => ({ setLocale: vi.fn() }));
vi.mock("@/lib/auth-client", () => ({ signOut: vi.fn() }));

describe("Sidebar", () => {
  it("renders localized student nav in Arabic", () => {
    render(
      <LocaleProvider locale="ar" messages={ar}>
        <Sidebar role="STUDENT" />
      </LocaleProvider>,
    );
    expect(screen.getByText("التمارين")).toBeTruthy();
    expect(screen.queryByText("📊")).toBeNull();
  });
  it("renders localized teacher nav in English", () => {
    render(
      <LocaleProvider locale="en" messages={en}>
        <Sidebar role="TEACHER" />
      </LocaleProvider>,
    );
    expect(screen.getByText("Students")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `npx vitest run src/components/shared/sidebar.test.tsx`
Expected: FAIL (emoji still present / labels hardcoded).

- [ ] **Step 3: Rewrite the sidebar internals**

Keep `"use client"`, the `Sidebar({ role, user })` signature, `usePathname` active logic, and `motion.div layoutId` highlight if desired (motion is sanctioned for micro-interactions). Changes:

```tsx
import {
  LayoutDashboard, BookOpen, Video, PencilLine, Users,
  MessageCircle, ClipboardList, Languages, LogOut, Route,
} from "lucide-react";

const teacherNav = [
  { key: "nav.dashboard", href: "/teacher", icon: LayoutDashboard },
  { key: "nav.classes", href: "/teacher/classes", icon: BookOpen },
  { key: "nav.sessions", href: "/teacher/sessions", icon: Video },
  { key: "nav.exercises", href: "/teacher/exercises", icon: PencilLine },
  { key: "nav.students", href: "/teacher/students", icon: Users },
];
const studentNav = [
  { key: "nav.dashboard", href: "/student", icon: LayoutDashboard },
  { key: "nav.sessions", href: "/student/sessions", icon: Video },
  { key: "nav.exercises", href: "/student/exercises", icon: PencilLine },
  { key: "nav.aiChat", href: "/student/ai-chat", icon: MessageCircle },
  { key: "nav.placement", href: "/student/placement", icon: ClipboardList },
];
```

(The Phase 2 IA will replace the student items; this phase only restyles.)

- Labels: `const t = useT();` … `{t(item.key)}`; subtitle `{t(role === "TEACHER" ? "nav.teacherDashboard" : "nav.studentDashboard")}`.
- Shell: `aside` → `h-screen w-64 border-e-2 border-sidebar-border bg-sidebar flex flex-col` (note `border-e-2`, logical). All internal `pl-/pr-/mr-/ml-` → `ps-/pe-/me-/ms-`; icon `<item.icon className="size-5 shrink-0" />`.
- Logo mark: `size-9 rounded-btn bg-primary text-primary-foreground grid place-items-center shadow-press-brand` containing `<Route className="size-5" />`; wordmark `font-extrabold tracking-tight text-foreground`.
- Active item: `bg-secondary text-secondary-foreground border-2 border-primary/25 rounded-btn`; inactive: `text-muted-foreground hover:bg-muted rounded-btn`.
- Language toggle above the user chip:

```tsx
const locale = useLocale();
const router = useRouter();
// ...
<Button
  variant="ghost"
  size="sm"
  className="w-full justify-start gap-2"
  onClick={async () => {
    await setLocale(locale === "en" ? "ar" : "en");
    router.refresh();
  }}
>
  <Languages className="size-4" />
  {t("common.language")}
</Button>
```

- Sign-out: replace 🚪 with `<LogOut className="size-4" />`, label `{t("common.signOut")}`, keep `signOut().then(() => (window.location.href = "/"))`.

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run src/components/shared/sidebar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Verify RTL end-to-end + commit**

Dev server: log in, click the language toggle — the whole app must flip to RTL (sidebar on the right, `dir="rtl"` on `<html>`), nav labels in Arabic, Rubik Arabic rendering.

```bash
git add -A
git commit -m "feat(shell): localized RTL sidebar with lucide icons and language toggle"
```

---

### Task 12: Atomic signup role (kill set-role) — TDD

**Files:**
- Modify: `src/lib/auth.ts`, `src/app/(auth)/signup/page.tsx`, `src/app/(marketing)/page.tsx` (teacher CTA)
- Delete: `src/app/api/auth/set-role/route.ts`
- Test: `tests/auth-signup.test.ts`

**Interfaces:**
- Consumes: test infra (Task 1: DATABASE_URL/BETTER_AUTH_SECRET set in global setup).
- Produces: signup accepts `?role=` (and `?locale=`) as **query params** on the sign-up request; `databaseHooks.user.create.before` in `auth.ts` validates and applies them. `role`/`level` remain `input: false`. `/signup?role=teacher` preselects the Teacher card.

- [ ] **Step 1: Write the failing integration test**

`tests/auth-signup.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function signUp(email: string, query?: Record<string, string>) {
  return auth.api.signUpEmail({
    body: { email, password: "password-123", name: "Test User" },
    query,
  });
}

describe("atomic signup role", () => {
  it("defaults to STUDENT with no role param", async () => {
    await signUp("s1@test.local");
    const u = await db.user.findUnique({ where: { email: "s1@test.local" } });
    expect(u?.role).toBe("STUDENT");
  });

  it("creates a TEACHER when role=TEACHER is passed as query", async () => {
    await signUp("t1@test.local", { role: "TEACHER" });
    const u = await db.user.findUnique({ where: { email: "t1@test.local" } });
    expect(u?.role).toBe("TEACHER");
  });

  it("coerces invalid roles to STUDENT", async () => {
    await signUp("h1@test.local", { role: "ADMIN" });
    const u = await db.user.findUnique({ where: { email: "h1@test.local" } });
    expect(u?.role).toBe("STUDENT");
  });

  it("applies locale from query", async () => {
    await signUp("l1@test.local", { locale: "en" });
    const u = await db.user.findUnique({ where: { email: "l1@test.local" } });
    expect(u?.locale).toBe("en");
  });

  it("rejects role in the signup BODY (input:false stays enforced)", async () => {
    await expect(
      auth.api.signUpEmail({
        body: {
          email: "evil@test.local",
          password: "password-123",
          name: "Evil",
          role: "TEACHER",
        } as never,
      }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `npx vitest run tests/auth-signup.test.ts`
Expected: the `role=TEACHER` test FAILS (role comes back STUDENT — no hook yet). The body-injection test may already pass (that's the existing `input:false` behavior — good).

- [ ] **Step 3: Add the database hook**

In `src/lib/auth.ts`, add to the `betterAuth({ ... })` options (top level, sibling of `user`):

```ts
  databaseHooks: {
    user: {
      create: {
        before: async (user, ctx) => {
          const q = (ctx?.query ?? {}) as Record<string, string | undefined>;
          const role = q.role === "TEACHER" ? "TEACHER" : "STUDENT";
          const locale = q.locale === "en" ? "en" : "ar";
          return { data: { ...user, role, locale } };
        },
      },
    },
  },
```

**If the `role=TEACHER` test still fails** because `ctx.query` is undefined in this better-auth version, use the header fallback — replace the `q` line with:

```ts
          const headerRole = ctx?.headers?.get("x-signup-role") ?? undefined;
          const headerLocale = ctx?.headers?.get("x-signup-locale") ?? undefined;
          const q = {
            role: (ctx?.query as Record<string, string> | undefined)?.role ?? headerRole,
            locale: (ctx?.query as Record<string, string> | undefined)?.locale ?? headerLocale,
          };
```

and in the test/client pass `headers: { "x-signup-role": "TEACHER" }` alongside/instead of `query`. Whichever channel works, BOTH the test and the signup page (Step 5) must use the same one.

- [ ] **Step 4: Run test, verify pass**

Run: `npx vitest run tests/auth-signup.test.ts`
Expected: all 5 pass.

- [ ] **Step 5: Single-request signup page + delete set-role**

In `src/app/(auth)/signup/page.tsx`:

- Read the preselect: the page is a client component — `useSearchParams()` from `next/navigation`; initialize `role` state to `searchParams.get("role") === "teacher" ? "TEACHER" : "STUDENT"`.
- Replace the two-request flow (signUp then fetch set-role) with ONE call:

```tsx
// at top of the file:
import { useLocale, useT } from "@/components/providers/locale-provider";

// inside the component:
const locale = useLocale();
const t = useT();

// in the submit handler:
const result = await signUp.email({
  email,
  password,
  name,
  fetchOptions: { query: { role, locale } },
});
if (result.error) {
  setError(result.error.message ?? t("common.error"));
} else {
  router.push(role === "TEACHER" ? "/teacher" : "/student");
  router.refresh();
}
```

(If Step 3 landed on the header fallback, use `fetchOptions: { headers: { "x-signup-role": role, "x-signup-locale": locale } }` instead.) Remove the whole set-role fetch and its stranded-error message. Localize labels/errors via `useT()` using the `auth.*` keys from Task 3.

- Delete `src/app/api/auth/set-role/route.ts` (the directory too).
- `src/app/(marketing)/page.tsx`: the "I'm a Teacher" CTA `href="/login"` → `href="/signup?role=teacher"`.

- [ ] **Step 6: Verify**

Run: `npm run build && npm test` — success; grep `set-role` in `src/` returns nothing. Dev server: sign up a fresh teacher via `/signup?role=teacher` → lands on `/teacher`; sign up a student → `/student`. One network request to `/api/auth/sign-up/email` (check devtools), zero to set-role.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(auth)!: assign role atomically at signup, delete set-role endpoint

Closes the self-promotion hole: role/level stay input:false and the
only write path is the server-side signup hook."
```

---

### Task 13: Forgot / reset password

**Files:**
- Create: `src/lib/email.ts`, `src/app/(auth)/forgot-password/page.tsx`, `src/app/(auth)/reset-password/page.tsx`
- Modify: `src/lib/auth.ts` (sendResetPassword), `src/lib/auth-client.ts` (export helpers), `src/app/(auth)/login/page.tsx` (link), `.env.example` (SMTP vars)
- Test: `tests/auth-reset.test.ts`

**Interfaces:**
- Produces: `sendEmail({ to, subject, text }): Promise<void>` (SMTP via `SMTP_URL` env or console fallback); `/forgot-password` and `/reset-password?token=...` pages; login page links to forgot-password.

- [ ] **Step 1: Write the failing test**

`tests/auth-reset.test.ts`:

```ts
import { describe, it, expect, vi, beforeAll } from "vitest";

vi.mock("@/lib/email", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));

import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

describe("password reset", () => {
  beforeAll(async () => {
    await auth.api.signUpEmail({
      body: { email: "reset@test.local", password: "password-123", name: "R" },
    });
  });

  it("requesting a reset triggers the email sender with a token link", async () => {
    await auth.api.requestPasswordReset({
      body: { email: "reset@test.local", redirectTo: "/reset-password" },
    });
    expect(sendEmail).toHaveBeenCalledOnce();
    const arg = vi.mocked(sendEmail).mock.calls[0][0];
    expect(arg.to).toBe("reset@test.local");
    expect(arg.text).toContain("/reset-password");
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `npx vitest run tests/auth-reset.test.ts`
Expected: FAIL (`@/lib/email` doesn't exist / `sendResetPassword` not configured so no email is attempted). Note: if `auth.api.requestPasswordReset` is not the method name in better-auth 1.5, check `node_modules/better-auth/dist` typings for the server API name (`requestPasswordReset` vs `forgetPassword`) and use the one that exists — better-auth 1.5 exposes `forgetPassword`; adjust the test accordingly.

- [ ] **Step 3: Implement email + config**

Run: `npm install nodemailer && npm install -D @types/nodemailer`

`src/lib/email.ts`:

```ts
import "server-only";
import nodemailer from "nodemailer";

type Mail = { to: string; subject: string; text: string };

export async function sendEmail({ to, subject, text }: Mail): Promise<void> {
  const smtpUrl = process.env.SMTP_URL;
  if (!smtpUrl) {
    // Dev/self-host fallback — same degradation philosophy as aiAvailable.
    console.info(`[email:console] to=${to} subject="${subject}"\n${text}`);
    return;
  }
  const transporter = nodemailer.createTransport(smtpUrl);
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "SpeakPath <no-reply@speakpath.local>",
    to,
    subject,
    text,
  });
}
```

In `src/lib/auth.ts`, extend `emailAndPassword`:

```ts
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your SpeakPath password",
        text: `Reset your password: ${url}\nIf you didn't ask for this, ignore this email.`,
      });
    },
  },
```

(`import { sendEmail } from "@/lib/email";` at top — if `server-only` breaks the vitest import chain here, the Task 3 stub alias already covers it.)

Add to `.env.example`:

```text
# Optional SMTP for password-reset emails (console fallback when unset)
SMTP_URL=
SMTP_FROM="SpeakPath <no-reply@yourdomain.com>"
```

In `src/lib/auth-client.ts` export the reset helpers: `export const { signIn, signUp, signOut, useSession, requestPasswordReset, resetPassword } = authClient;` — if those names don't exist on the client in 1.5, the client methods are `authClient.forgetPassword({ email, redirectTo })` and `authClient.resetPassword({ newPassword, token })`; export whatever exists and use those names in the pages.

- [ ] **Step 4: Run test, verify pass**

Run: `npx vitest run tests/auth-reset.test.ts`
Expected: PASS.

- [ ] **Step 5: Build the two pages**

`src/app/(auth)/forgot-password/page.tsx` — client component matching the login page's new light layout (Task 8): one email `Input`, submit `<Button>{t("auth.sendResetLink")}</Button>`, on submit call the client reset-request method with `redirectTo: "/reset-password"`, then ALWAYS show `t("auth.resetLinkSent")` (no user enumeration). Link back to `/login`.

`src/app/(auth)/reset-password/page.tsx` — client component: reads `token` via `useSearchParams()`, one password `Input` (min 8), submit calls the client reset method with `{ newPassword, token }`; success → toast `t("auth.passwordUpdated")` + `router.push("/login")`; error → `t("common.error")`.

`src/app/(auth)/login/page.tsx`: under the password field add `<Link href="/forgot-password" className="text-sm text-primary hover:underline">{t("auth.forgotPassword")}</Link>`.

- [ ] **Step 6: Verify end-to-end (console transport)**

Dev server, no SMTP_URL: `/forgot-password` → submit a real account's email → terminal prints the reset URL → open it → set new password → sign in with it. Confirm old password now fails.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(auth): forgot/reset password with SMTP-or-console email"
```

---

### Task 14: Lint guardrails + dependency cleanup

**Files:**
- Modify: `eslint.config.mjs`, `package.json` (remove next-themes)

**Interfaces:**
- Produces: lint errors on banned patterns in `src/**` going forward.

- [ ] **Step 1: Add guardrail rules**

In `eslint.config.mjs`, append a config object to the `defineConfig` array:

```js
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/generated/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/text-white\\u002F/]",
          message: "Use text-foreground / text-muted-foreground tokens (spec §3.1).",
        },
        {
          selector: "Literal[value=/(bg|text|border)-\\[#(?!4A3200)/]",
          message: "No raw hex in className — add a token to globals.css.",
        },
        {
          selector: "Literal[value=/\\b(pl|pr|ml|mr)-\\d/]",
          message: "Use logical spacing (ps-/pe-/ms-/me-) for RTL support.",
        },
        {
          selector: "Literal[value=/\\bborder-(l|r)(-|\\s|\")/]",
          message: "Use border-s / border-e for RTL support.",
        },
      ],
    },
  },
```

- [ ] **Step 2: Run lint, fix every hit**

Run: `npm run lint`
Expected: violations only where Tasks 8-10 missed something — fix each using the sweep mappings. Template literals aren't caught by `Literal` selectors; also grep as a backstop: `grep -rn "text-white/" src/ --include=*.tsx` → zero hits outside `src/generated`.

- [ ] **Step 3: Remove next-themes**

Run: `npm uninstall next-themes`
Verify: `grep -rn "next-themes" src/` → nothing (Task 5 already cleaned sonner.tsx).

- [ ] **Step 4: Verify + commit**

Run: `npm run lint && npm run build && npm test` — all clean.

```bash
git add -A
git commit -m "chore: lint guardrails for tokens/RTL, drop next-themes"
```

---

### Task 15: Phase 1 verification

**Files:** none (verification only; fix regressions found).

- [ ] **Step 1: Full gate**

Run: `npm run lint && npm run build && npm test`
Expected: zero errors, all tests pass.

- [ ] **Step 2: Manual smoke checklist (dev server)**

1. `/` marketing: light, legible, no particles; "I'm a Teacher" → `/signup?role=teacher` with Teacher preselected.
2. Sign up a student (fresh email): ONE request, lands on `/student`, sidebar light + lucide icons.
3. Language toggle: UI flips to Arabic RTL instantly (sidebar right side, Arabic labels, Rubik Arabic); reload keeps Arabic (cookie); toggle back.
4. Open an exercise from `/student/exercises`, answer wrong then right: coral / leaf feedback states, pressable buttons.
5. `/teacher` (sign up a teacher): stat cards violet-on-paper, no emerald gradient headline.
6. `/forgot-password` round-trip via console link.
7. Devtools console: no hydration warnings on `/`, `/student`, `/teacher`.
8. Attempt `fetch("/api/auth/set-role", {method:"POST"})` from devtools → 404.

- [ ] **Step 3: Commit any fixes, then mark phase done**

```bash
git add -A
git commit -m "fix(design): phase 1 verification fixes"
```

(Skip the commit if there were no fixes.)
