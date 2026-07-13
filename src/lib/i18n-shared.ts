export type Locale = "en" | "ar";
export type Messages = Record<string, string>;

export const LOCALES = ["en", "ar"] as const satisfies readonly Locale[];
export const LOCALE_COOKIE = "sp_locale";

export function dirFor(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

/**
 * Wrap a value in Unicode directional isolates (U+2068 FSI … U+2069 PDI) so a
 * possibly-opposite-direction run — e.g. a Latin name interpolated into an
 * Arabic sentence — can't reorder the surrounding neutrals. Use at `t()` call
 * sites for user / class / teacher names (flat-string interpolation); for
 * rendered nodes prefer a `<bdi>` element instead.
 */
export function bidiIsolate(value: string): string {
  return `⁨${value}⁩`;
}

/**
 * Parses an `Accept-Language` header into (tag, q) pairs, honoring RFC 7231
 * quality values: entries with q=0 are unacceptable and dropped, entries
 * without an explicit q default to 1, and the remaining tags are ranked
 * highest-q-first (ties keep their original left-to-right order).
 */
function parseAcceptLanguage(acceptLanguage: string): { tag: string; q: number }[] {
  return acceptLanguage
    .split(",")
    .map((part) => {
      const [rawTag, ...params] = part.trim().split(";");
      const tag = rawTag.trim().toLowerCase();
      let q = 1;
      for (const param of params) {
        const [key, value] = param.trim().split("=");
        if (key === "q") {
          const parsed = Number(value);
          q = Number.isFinite(parsed) ? parsed : 0;
        }
      }
      return { tag, q };
    })
    .filter((c) => c.tag && c.q > 0)
    .sort((a, b) => b.q - a.q);
}

export function pickLocale(
  cookieValue: string | undefined,
  acceptLanguage: string | null,
): Locale {
  if (cookieValue === "en" || cookieValue === "ar") return cookieValue;
  if (!acceptLanguage) return "en";

  for (const { tag } of parseAcceptLanguage(acceptLanguage)) {
    if (tag === "ar" || tag.startsWith("ar-")) return "ar";
    if (tag === "en" || tag.startsWith("en-")) return "en";
  }
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
