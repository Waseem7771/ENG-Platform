// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { LanguageToggle } from "./language-toggle";
import en from "../../../messages/en.json";
import ar from "../../../messages/ar.json";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/app/actions/set-locale", () => ({ setLocale: vi.fn() }));

describe("LanguageToggle", () => {
  it("shows the OTHER language label in English locale", () => {
    render(
      <LocaleProvider locale="en" messages={en}>
        <LanguageToggle />
      </LocaleProvider>,
    );
    expect(screen.getByRole("button")).toBeTruthy();
    expect(screen.getByText("العربية")).toBeTruthy();
  });

  it("shows the OTHER language label in Arabic locale", () => {
    render(
      <LocaleProvider locale="ar" messages={ar}>
        <LanguageToggle />
      </LocaleProvider>,
    );
    expect(screen.getByText("English")).toBeTruthy();
  });
});
