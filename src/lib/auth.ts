import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "./db";
import { sendEmail } from "./email";
import { resetEmailContent } from "./reset-email";

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
    sendResetPassword: async ({ user, url }) => {
      // `locale` is a registered additionalField (defaults "ar"), so it rides on
      // the better-auth user object; fall back to English if it's ever absent.
      const locale = (user as { locale?: string }).locale ?? "en";
      const { subject, text } = resetEmailContent(locale, url);
      await sendEmail({ to: user.email, subject, text });
    },
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
      // role is assigned atomically at signup by the databaseHooks.user.create
      // hook below (read server-side from the sign-up request's query string,
      // never from the request body); level is written only by the placement
      // scorer and gamification. Both still default/return normally.
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
      locale: {
        type: "string",
        required: false,
        defaultValue: "ar",
        input: true,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user, ctx) => {
          // The ONLY write path for role at signup. Reads from the sign-up
          // request's query string (never the body, which additionalFields
          // input:false already strips) so a client can never self-promote by
          // stuffing `role` into the JSON payload. Any value other than the
          // literal "TEACHER" coerces to "STUDENT" — unknown/garbage input
          // fails closed, not open.
          const q = (ctx?.query ?? {}) as Record<string, string | undefined>;
          const role = q.role === "TEACHER" ? "TEACHER" : "STUDENT";
          const locale = q.locale === "en" ? "en" : "ar";
          return { data: { ...user, role, locale } };
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
