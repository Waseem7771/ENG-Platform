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
