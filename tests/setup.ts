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
