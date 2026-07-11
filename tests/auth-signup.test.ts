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

  it("ignores role in the signup BODY (input:false stays enforced)", async () => {
    // better-auth's `input:false` fields are silently stripped from the body
    // by parseUserInput before the create hook ever sees them (confirmed in
    // node_modules/better-auth/dist/db/schema.mjs) — it does not throw. The
    // security invariant we actually care about is that a `role` smuggled
    // into the body can never produce a TEACHER account; only the query
    // channel (validated in the databaseHooks.user.create.before hook) can.
    await auth.api.signUpEmail({
      body: {
        email: "evil@test.local",
        password: "password-123",
        name: "Evil",
        role: "TEACHER",
      } as never,
    });
    const u = await db.user.findUnique({ where: { email: "evil@test.local" } });
    expect(u?.role).toBe("STUDENT");
  });
});
