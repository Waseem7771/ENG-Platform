import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    globalSetup: ["./tests/global-setup.ts"],
    setupFiles: ["./tests/setup.ts"],
    environment: "node",
    // All test files share one on-disk SQLite db (tests/global-setup.ts).
    // Running files in parallel opens multiple concurrent connections against
    // it and write-heavy suites (e.g. tests/curriculum.test.ts) can trip
    // SQLITE_BUSY on the others. Serialize file execution instead.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "tests/server-only-stub.ts"),
    },
  },
});
