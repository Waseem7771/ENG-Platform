import { describe, it, expect } from "vitest";
import { pickLocale, dirFor, translate } from "@/lib/i18n-shared";
import { getMessages } from "@/lib/i18n";
import en from "../../messages/en.json";
import ar from "../../messages/ar.json";

describe("pickLocale", () => {
  it("prefers a valid cookie", () => {
    expect(pickLocale("en", "ar,en;q=0.5")).toBe("en");
    expect(pickLocale("ar", "en-US")).toBe("ar");
  });
  it("ignores an invalid cookie", () => {
    expect(pickLocale("fr", "en-US")).toBe("en");
  });
  it("falls back to Accept-Language: arabic browsers get ar", () => {
    expect(pickLocale(undefined, "ar-SA,ar;q=0.9,en;q=0.8")).toBe("ar");
    expect(pickLocale(undefined, "en-US,en;q=0.9")).toBe("en");
  });
  it("defaults to en with no signals", () => {
    expect(pickLocale(undefined, null)).toBe("en");
  });
});

describe("dirFor", () => {
  it("maps ar to rtl and en to ltr", () => {
    expect(dirFor("ar")).toBe("rtl");
    expect(dirFor("en")).toBe("ltr");
  });
});

describe("catalogs", () => {
  it("en and ar have identical key sets", () => {
    expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort());
  });
  it("no empty values", () => {
    for (const cat of [en, ar]) {
      for (const [k, v] of Object.entries(cat)) {
        expect(v, `empty value for ${k}`).not.toBe("");
      }
    }
  });
});

describe("translate", () => {
  it("returns the message for a key", () => {
    expect(translate(getMessages("en"), "common.cancel")).toBe("Cancel");
  });
  it("interpolates {vars}", () => {
    expect(translate({ greet: "Hi {name}" }, "greet", { name: "Sara" })).toBe("Hi Sara");
  });
  it("returns the key itself when missing (never crashes)", () => {
    expect(translate(getMessages("en"), "nope.missing")).toBe("nope.missing");
  });
});
