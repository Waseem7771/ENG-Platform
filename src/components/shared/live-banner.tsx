"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { api } from "@/lib/api";
import { usePoll } from "@/hooks/use-poll";
import { useT } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { shouldShowBanner, type LiveInfo } from "./live-banner-logic";

// The banner is a discovery nudge, not a live transcript — a calm ~15s poll is
// plenty. usePoll also refetches on focus/visibility, so a class that goes live
// while the tab was backgrounded appears the moment the student returns.
const POLL_MS = 15_000;

/**
 * Cross-page "your class is live now" banner. Mounted once in the student
 * layout so it rides above every /student/* page. Polls GET /api/sessions/live
 * (student-scoped) and, when a class is live, offers a one-tap Join link into
 * the room.
 *
 * Suppression (see shouldShowBanner): hidden with no live session, hidden once
 * the student dismisses THIS session (per-session-id, in-memory), and hidden on
 * any session-room route so it never nags a student already inside a room.
 */
export function LiveBanner() {
  const t = useT();
  const pathname = usePathname();
  const { data } = usePoll(
    () => api<{ live: LiveInfo | null }>("/api/sessions/live"),
    POLL_MS,
  );
  // Per-session-id dismissal, in-memory only: remembering the dismissed live id
  // (not a boolean) means dismissing session A never hides a later session B,
  // and a fresh page load starts clean — acceptable for a best-effort nudge.
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  const live = data?.live ?? null;
  if (!live) return null;
  if (!shouldShowBanner(live, pathname, dismissedId)) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border bg-secondary px-6 py-2.5 sm:px-8">
      <div className="flex min-w-0 items-center gap-2.5">
        <LivePulse />
        <p className="truncate text-sm font-medium text-secondary-foreground">
          {t("session.liveBanner", { className: live.className })}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          size="sm"
          render={<Link href={`/student/sessions/${live.id}`} />}
          nativeButton={false}
          role="link"
        >
          {t("session.joinLive")}
        </Button>
        <button
          type="button"
          onClick={() => setDismissedId(live.id)}
          aria-label={t("common.close")}
          className="grid size-8 shrink-0 place-items-center rounded-btn text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Calm live indicator: a solid leaf-green dot with a soft expanding ring. The
 * ring is decorative and disabled under prefers-reduced-motion; the steady dot
 * remains. Positioned with inset-0 only — RTL-safe, no physical insets.
 */
function LivePulse() {
  return (
    <span className="relative flex size-2.5 shrink-0" aria-hidden="true">
      <span className="absolute inset-0 inline-flex animate-ping rounded-full bg-leaf/50 motion-reduce:hidden" />
      <span className="relative inline-flex size-2.5 rounded-full bg-leaf" />
    </span>
  );
}
