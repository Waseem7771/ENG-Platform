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
