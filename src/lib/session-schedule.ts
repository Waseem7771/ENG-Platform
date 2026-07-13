/**
 * Convert a `<input type="datetime-local">` value (local wall-clock, no zone)
 * into a UTC ISO string suitable for the sessions POST body.
 *
 * Returns null for empty or unparseable input so the caller can surface an
 * inline "pick a date" error instead of POSTing an `Invalid Date`. The server
 * remains authoritative on whether the instant is in the future — this helper
 * only guards against empty/garbage input.
 */
export function localValueToIso(localValue: string): string | null {
  const trimmed = localValue.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
