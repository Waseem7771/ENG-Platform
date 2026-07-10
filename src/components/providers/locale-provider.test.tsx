// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocaleProvider, useT, useLocale } from "./locale-provider";

function Probe() {
  const t = useT();
  const locale = useLocale();
  return (
    <div>
      <span data-testid="msg">{t("common.cancel")}</span>
      <span data-testid="missing">{t("nope.missing")}</span>
      <span data-testid="loc">{locale}</span>
    </div>
  );
}

describe("LocaleProvider", () => {
  it("provides translations and locale", () => {
    render(
      <LocaleProvider locale="ar" messages={{ "common.cancel": "إلغاء" }}>
        <Probe />
      </LocaleProvider>,
    );
    expect(screen.getByTestId("msg").textContent).toBe("إلغاء");
    expect(screen.getByTestId("missing").textContent).toBe("nope.missing");
    expect(screen.getByTestId("loc").textContent).toBe("ar");
  });
});
