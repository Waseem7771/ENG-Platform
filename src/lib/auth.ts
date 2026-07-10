import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "./db";

const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3000";

// Origins allowed for CSRF/redirect checks. baseURL (the public site URL) plus
// the app URL and local dev ports. De-duplicated.
const trustedOrigins = Array.from(
  new Set(
    [
      baseURL,
      process.env.NEXT_PUBLIC_APP_URL,
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
    ].filter((v): v is string => Boolean(v))
  )
);

export const auth = betterAuth({
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, {
    provider: "sqlite",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  session: {
    modelName: "authSession",
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  trustedOrigins,
  user: {
    additionalFields: {
      // input:false is a SECURITY boundary: it stops clients from setting
      // role/level through sign-up or the generic /api/auth/update-user route
      // (which would be privilege escalation + a placement-exam bypass).
      // role is assigned server-side via /api/auth/set-role during onboarding;
      // level is written only by the placement scorer and gamification. Both
      // still default/return normally.
      role: {
        type: "string",
        required: false,
        defaultValue: "STUDENT",
        input: false,
      },
      level: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
