// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./button";

describe("Button", () => {
  it("defaults to the brand variant with press shadow", () => {
    render(<Button>Go</Button>);
    const btn = screen.getByRole("button", { name: "Go" });
    expect(btn.className).toContain("bg-primary");
    expect(btn.className).toContain("shadow-press-brand");
    expect(btn.className).toContain("rounded-btn");
  });
  it("renders the sun variant", () => {
    render(<Button variant="sun">Start</Button>);
    expect(screen.getByRole("button").className).toContain("bg-sun");
  });
  it("renders the ghost variant with line shadow", () => {
    render(<Button variant="ghost">Later</Button>);
    expect(screen.getByRole("button").className).toContain("shadow-press-line");
  });
});
