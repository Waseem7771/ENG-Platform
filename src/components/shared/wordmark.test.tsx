// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocaleProvider } from "@/components/providers/locale-provider";
import en from "../../../messages/en.json";
import { Wordmark } from "./wordmark";

describe("Wordmark", () => {
  it("renders the localized app name and links home", () => {
    render(
      <LocaleProvider locale="en" messages={en}>
        <Wordmark />
      </LocaleProvider>,
    );
    // "SpeakPath" is split across spans; assert the accessible link name contains it.
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/");
    expect(link.textContent).toContain("SpeakPath");
  });
});
