import { describe, it, expect } from "vitest";
import { resetEmailContent } from "@/lib/reset-email";

describe("resetEmailContent", () => {
  it("returns Arabic content for locale 'ar' with the url embedded", () => {
    const { subject, text } = resetEmailContent("ar", "https://x/reset?token=abc");
    expect(subject).toMatch(/[؀-ۿ]/); // contains Arabic
    expect(text).toContain("https://x/reset?token=abc");
  });

  it("defaults to English for an unknown or absent locale", () => {
    expect(resetEmailContent("en", "u").subject).toBe(resetEmailContent("xx", "u").subject);
    expect(resetEmailContent("en", "u").subject).toMatch(/reset/i);
  });

  it("never omits the url from the body", () => {
    expect(resetEmailContent("ar", "URL-TOKEN").text).toContain("URL-TOKEN");
    expect(resetEmailContent("en", "URL-TOKEN").text).toContain("URL-TOKEN");
  });
});
