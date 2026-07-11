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
