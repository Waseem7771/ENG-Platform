"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Pure, SSR-safe timing primitive: has at least `intervalMs` elapsed since the
 * last completed fetch at `lastAt`? Boundary is inclusive — `now - lastAt`
 * exactly equal to `intervalMs` counts as due. Extracted so the interval
 * decision can be unit-tested deterministically without wrestling fake timers
 * and async flushes inside jsdom (see use-poll.test.ts).
 */
export function shouldRefetch(lastAt: number, now: number, intervalMs: number): boolean {
  return now - lastAt >= intervalMs;
}

/**
 * Poll a `fetcher` on mount, on an interval, and — for freshness — whenever the
 * tab regains focus or becomes visible again (refetch-on-focus).
 *
 * Guarantees:
 * - SSR-safe: no `window`/`document` access during render or module load; all
 *   listener/timer wiring lives inside `useEffect` (client-only).
 * - No overlapping fetches: a ref-based in-flight guard means a new trigger
 *   while a fetch is running is dropped rather than starting a second request.
 * - Clean teardown: the interval is cleared and BOTH listeners removed on
 *   unmount, and `setData` is guarded so a fetch resolving after unmount is a
 *   no-op (no "state update on an unmounted component").
 *
 * `fetcher` is read through a ref, so an unstable fetcher identity across
 * renders does not tear down and re-arm the poll loop; only `intervalMs` does.
 */
export function usePoll<T>(fetcher: () => Promise<T>, intervalMs: number): { data: T | null } {
  const [data, setData] = useState<T | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const inFlightRef = useRef(false);
  const lastAtRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const runFetch = async () => {
      if (inFlightRef.current) return; // drop overlapping triggers
      inFlightRef.current = true;
      try {
        const result = await fetcherRef.current();
        if (mountedRef.current) setData(result);
      } catch {
        // Swallow — polling is best-effort; the next trigger retries.
      } finally {
        lastAtRef.current = Date.now();
        inFlightRef.current = false;
      }
    };

    // The interval trigger fetches only if the poll window has actually elapsed
    // since the last completed fetch. A focus/visibility refetch may have just
    // run, in which case `shouldRefetch` suppresses the redundant poll — one
    // fetch per `intervalMs` at most from the timer.
    const onInterval = () => {
      if (shouldRefetch(lastAtRef.current, Date.now(), intervalMs)) void runFetch();
    };

    const onFocus = () => void runFetch();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void runFetch();
    };

    // Fetch immediately on mount (lastAt starts at 0), then arm the loop.
    void runFetch();
    const intervalId = setInterval(onInterval, intervalMs);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs]);

  return { data };
}
