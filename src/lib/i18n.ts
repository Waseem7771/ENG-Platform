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
