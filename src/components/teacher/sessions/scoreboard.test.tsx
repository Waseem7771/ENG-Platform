// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { Scoreboard, formatAvg } from "./scoreboard";
import en from "../../../../messages/en.json";

describe("formatAvg", () => {
  it("returns null when nobody has completed (null average)", () => {
    expect(formatAvg(null)).toBeNull();
  });
  it("rounds an unrounded average to a whole-percent string", () => {
    expect(formatAvg(74.6)).toBe("75");
    expect(formatAvg(74.4)).toBe("74");
    expect(formatAvg(75)).toBe("75");
    expect(formatAvg(0)).toBe("0");
  });
});

describe("Scoreboard (poll wiring)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the empty state before the first poll resolves", () => {
    // Never-resolving fetch: data stays null, so the muted waiting line shows.
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    render(
      <LocaleProvider locale="en" messages={en}>
        <Scoreboard sessionId="s1" total={5} />
      </LocaleProvider>,
    );
    expect(screen.getByText(en["session.scoreboardEmpty"])).toBeTruthy();
  });
});
