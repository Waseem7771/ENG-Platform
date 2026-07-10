// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Card } from "./card";
import { Badge } from "./badge";

describe("sticker Card", () => {
  it("has 2px border, card radius, offset shadow", () => {
    const { container } = render(<Card>hi</Card>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("rounded-card");
    expect(el.className).toContain("border-2");
    expect(el.className).toContain("shadow-sticker");
  });
});

describe("Badge chips", () => {
  it("streak variant uses sun tokens", () => {
    const { container } = render(<Badge variant="streak">7</Badge>);
    expect((container.firstElementChild as HTMLElement).className).toContain("bg-sun-soft");
  });
  it("xp variant uses secondary tokens", () => {
    const { container } = render(<Badge variant="xp">450 XP</Badge>);
    expect((container.firstElementChild as HTMLElement).className).toContain("bg-secondary");
  });
});
