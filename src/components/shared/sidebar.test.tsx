// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { Sidebar, isNavItemActive } from "./sidebar";
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
    expect(screen.getByText("تدرّب")).toBeTruthy();
    expect(screen.queryByText("📊")).toBeNull();
  });
  it("renders localized teacher nav in English", () => {
    render(
      <LocaleProvider locale="en" messages={en}>
        <Sidebar role="TEACHER" />
      </LocaleProvider>,
    );
    expect(screen.getByText("Students")).toBeTruthy();
    expect(screen.getByText("Content")).toBeTruthy();
    expect(screen.queryByText("Exercises")).toBeNull();
  });
});

describe("isNavItemActive", () => {
  describe("Dashboard root exact match", () => {
    it("should match /teacher exactly at /teacher", () => {
      expect(isNavItemActive("/teacher", "/teacher")).toBe(true);
    });

    it("should NOT match /teacher at nested routes like /teacher/classes", () => {
      expect(isNavItemActive("/teacher/classes", "/teacher")).toBe(false);
    });

    it("should NOT match /teacher at deeply nested routes like /teacher/classes/abc123", () => {
      expect(isNavItemActive("/teacher/classes/abc123", "/teacher")).toBe(false);
    });

    it("should match /student exactly at /student", () => {
      expect(isNavItemActive("/student", "/student")).toBe(true);
    });

    it("should NOT match /student at nested routes like /student/practice", () => {
      expect(isNavItemActive("/student/practice", "/student")).toBe(false);
    });

    it("should NOT match /student at deeply nested routes like /student/classes/xyz", () => {
      expect(isNavItemActive("/student/classes/xyz", "/student")).toBe(false);
    });
  });

  describe("Nested prefix match (non-dashboard routes)", () => {
    it("should match /teacher/students at /teacher/students/abc123", () => {
      expect(isNavItemActive("/teacher/students/abc123", "/teacher/students")).toBe(true);
    });

    it("should match /teacher/classes at /teacher/classes/xyz", () => {
      expect(isNavItemActive("/teacher/classes/xyz", "/teacher/classes")).toBe(true);
    });

    it("should match /teacher/sessions at /teacher/sessions/live", () => {
      expect(isNavItemActive("/teacher/sessions/live", "/teacher/sessions")).toBe(true);
    });

    it("should match exact href without trailing slash", () => {
      expect(isNavItemActive("/teacher/students", "/teacher/students")).toBe(true);
    });

    it("should match student practice routes", () => {
      expect(isNavItemActive("/student/practice/lesson1", "/student/practice")).toBe(true);
    });

    it("should match student classes routes", () => {
      expect(isNavItemActive("/student/classes/abc", "/student/classes")).toBe(true);
    });
  });

  describe("Boundary safety (prefix isolation)", () => {
    it("should NOT match /teacher/classesX when href is /teacher/classes", () => {
      expect(isNavItemActive("/teacher/classesX", "/teacher/classes")).toBe(false);
    });

    it("should NOT match /teacher/classesExtra when href is /teacher/classes", () => {
      expect(isNavItemActive("/teacher/classesExtra", "/teacher/classes")).toBe(false);
    });

    it("should NOT match /teacher/studentsbatch when href is /teacher/students", () => {
      expect(isNavItemActive("/teacher/studentsbatch", "/teacher/students")).toBe(false);
    });

    it("should require slash separator for prefix match", () => {
      expect(isNavItemActive("/student/practiceX", "/student/practice")).toBe(false);
    });
  });

  describe("Special case: /teacher/exercises authoring routes", () => {
    it("should match /teacher/content/exercises/new for /teacher/exercises href", () => {
      expect(
        isNavItemActive("/teacher/content/exercises/new", "/teacher/exercises"),
      ).toBe(true);
    });

    it("should match /teacher/content/exercises/abc/edit for /teacher/exercises href", () => {
      expect(
        isNavItemActive("/teacher/content/exercises/abc/edit", "/teacher/exercises"),
      ).toBe(true);
    });

    it("should match /teacher/content exactly for /teacher/exercises href", () => {
      expect(isNavItemActive("/teacher/content", "/teacher/exercises")).toBe(true);
    });

    it("should match /teacher/content/anything/nested for /teacher/exercises href", () => {
      expect(
        isNavItemActive("/teacher/content/anything/nested", "/teacher/exercises"),
      ).toBe(true);
    });

    it("should match /teacher/exercises itself", () => {
      expect(isNavItemActive("/teacher/exercises", "/teacher/exercises")).toBe(true);
    });

    it("should NOT match /teacher/content for other hrefs like /teacher/classes", () => {
      expect(isNavItemActive("/teacher/content", "/teacher/classes")).toBe(false);
    });

    it("should NOT match /teacher/contentX for /teacher/exercises href (boundary safety)", () => {
      expect(isNavItemActive("/teacher/contentX", "/teacher/exercises")).toBe(false);
    });
  });
});
