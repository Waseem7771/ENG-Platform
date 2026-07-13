import { describe, it, expect } from "vitest";
import { localValueToIso } from "@/lib/session-schedule";

describe("localValueToIso", () => {
  it("returns null for empty or whitespace input", () => {
    expect(localValueToIso("")).toBeNull();
    expect(localValueToIso("   ")).toBeNull();
  });

  it("returns null for unparseable input", () => {
    expect(localValueToIso("not-a-date")).toBeNull();
  });

  it("converts a datetime-local value to a round-trippable ISO string", () => {
    const iso = localValueToIso("2030-01-01T10:00");
    expect(iso).not.toBeNull();
    // Same instant as parsing the local value directly, normalized to UTC.
    expect(iso).toBe(new Date("2030-01-01T10:00").toISOString());
    // And the result itself round-trips.
    expect(new Date(iso as string).toISOString()).toBe(iso);
  });
});
