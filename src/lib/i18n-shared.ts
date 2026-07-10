export type Locale = "en" | "ar";
export type Messages = Record<string, string>;

export const LOCALES = ["en", "ar"] as const satisfies readonly Locale[];
export const LOCALE_COOKIE = "sp_locale";

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
