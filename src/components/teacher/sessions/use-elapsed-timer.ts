"use client";

import { useEffect, useState } from "react";

function format(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hours = Math.floor(minutes / 60);
  if (hours > 0) {
    return `${hours}:${String(minutes % 60).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * @param startedAt Server-clock ISO timestamp the session went ACTIVE, or null while not running.
 * @param clockOffsetMs Server-vs-client clock skew (`Date.parse(serverTime) - Date.now()`), computed
 *   by the caller from the latest poll response. Added to `Date.now()` so the tick reads in server time
 *   instead of assuming the client's clock matches the server's.
 */
export function useElapsedTimer(startedAt: string | null, clockOffsetMs = 0): string {
  const [elapsed, setElapsed] = useState("0:00");

  useEffect(() => {
    if (!startedAt) return;
    const startMs = new Date(startedAt).getTime();
    function tick() {
      setElapsed(format(Date.now() + clockOffsetMs - startMs));
    }
    queueMicrotask(tick);
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt, clockOffsetMs]);

  return elapsed;
}
