"use client";

import Link from "next/link";
import { useT } from "@/components/providers/locale-provider";

const SIZES = {
  sm: { badge: "h-6 w-6 text-xs", text: "text-base" },
  md: { badge: "h-9 w-9 text-sm", text: "text-xl" },
} as const;

/**
 * The SpeakPath brand lockup: a token badge (app initial) + the wordmark.
 * The app name comes from `common.appName` and is split at its second capital
 * so the leading part stays `text-foreground` and the tail is `text-primary`
 * (the established "Speak" + "Path" treatment). Token shadow only — the raw
 * `shadow-violet-500/20` this replaces is exactly the debt this component drops.
 */
export function Wordmark({ size = "md" }: { size?: "sm" | "md" }) {
  const t = useT();
  const appName = t("common.appName");
  const initial = appName.charAt(0);
  const splitAt = appName.search(/(?<=.)[A-Z]/);
  const lead = splitAt > 0 ? appName.slice(0, splitAt) : appName;
  const emph = splitAt > 0 ? appName.slice(splitAt) : "";
  const s = SIZES[size];

  return (
    <Link href="/" className="inline-flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className={`flex ${s.badge} items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground shadow-sticker`}
      >
        {initial}
      </span>
      <span className={`${s.text} font-semibold tracking-tight`}>
        {lead}
        {emph && <span className="text-primary">{emph}</span>}
      </span>
    </Link>
  );
}
