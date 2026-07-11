import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// React Testing Library only self-registers its afterEach(cleanup) hook when
// it detects a global `afterEach`. Vitest doesn't inject test globals unless
// `test.globals` is enabled, and this repo's test files import `describe`/
// `it`/`expect` explicitly instead — so we wire cleanup up here instead of
// flipping on globals for the whole suite.
afterEach(() => {
  cleanup();
});

// jsdom (the `@vitest-environment jsdom` test files) doesn't implement
// IntersectionObserver, which framer-motion's useInView (used by CountUp,
// ScoreRing, etc.) relies on. Stub it so any jsdom test that renders those
// components doesn't crash; `window` is absent under the default "node"
// environment, so this is a no-op there.
if (typeof window !== "undefined" && !window.IntersectionObserver) {
  class IntersectionObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  window.IntersectionObserver = IntersectionObserverStub as unknown as typeof IntersectionObserver;
}
