import "server-only";
import { cookies, headers } from "next/headers";
import en from "../../messages/en.json";
import ar from "../../messages/ar.json";

// Re-export pure parts from shared module
export {
  type Locale,
  type Messages,
  LOCALES,
  LOCALE_COOKIE,
  dirFor,
  pickLocale,
  translate,
} from "./i18n-shared";

import type { Locale, Messages } from "./i18n-shared";
import { pickLocale, LOCALE_COOKIE } from "./i18n-shared";

const CATALOGS: Record<Locale, Messages> = { en, ar };

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
