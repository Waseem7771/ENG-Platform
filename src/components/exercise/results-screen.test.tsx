// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { ResultsScreen } from "./results-screen";
import en from "../../../messages/en.json";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const result = {
  score: 80, xpEarned: 8,
  feedback: { overall: "Nice work" },
  gamification: { xp: 108, streak: 3, levelUp: false, level: "BEGINNER", skills: {} },
};

describe("ResultsScreen springboard", () => {
  it("renders the next CTA as a link when provided", () => {
    render(
      <LocaleProvider locale="en" messages={en}>
        <ResultsScreen result={result as never} next={{ label: "Next: Word power", href: "/student/exercises/x" }} />
      </LocaleProvider>,
    );
    const link = screen.getByRole("link", { name: /Next: Word power/ });
    expect(link.getAttribute("href")).toBe("/student/exercises/x");
  });
  it("renders no next CTA when absent", () => {
    render(
      <LocaleProvider locale="en" messages={en}>
        <ResultsScreen result={result as never} />
      </LocaleProvider>,
    );
    expect(screen.queryByRole("link", { name: /Next:/ })).toBeNull();
  });
});
