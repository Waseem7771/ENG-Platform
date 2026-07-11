// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { Sidebar } from "./sidebar";
import en from "../../../messages/en.json";
import ar from "../../../messages/ar.json";

vi.mock("next/navigation", () => ({
  usePathname: () => "/student",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/app/actions/set-locale", () => ({ setLocale: vi.fn() }));
vi.mock("@/lib/auth-client", () => ({ signOut: vi.fn() }));

describe("Sidebar", () => {
  it("renders localized student nav in Arabic", () => {
    render(
      <LocaleProvider locale="ar" messages={ar}>
        <Sidebar role="STUDENT" />
      </LocaleProvider>,
    );
    expect(screen.getByText("التمارين")).toBeTruthy();
    expect(screen.queryByText("📊")).toBeNull();
  });
  it("renders localized teacher nav in English", () => {
    render(
      <LocaleProvider locale="en" messages={en}>
        <Sidebar role="TEACHER" />
      </LocaleProvider>,
    );
    expect(screen.getByText("Students")).toBeTruthy();
  });
});
