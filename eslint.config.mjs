import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/generated/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/text-white\\u002F/]",
          message: "Use text-foreground / text-muted-foreground tokens (spec §3.1).",
        },
        {
          selector: "Literal[value=/(bg|text|border)-\\[#(?!4A3200)/]",
          message: "No raw hex in className — add a token to globals.css.",
        },
        {
          selector: "Literal[value=/\\b(pl|pr|ml|mr)-(\\d|auto)/]",
          message: "Use logical spacing (ps-/pe-/ms-/me-) for RTL support.",
        },
        {
          selector: "Literal[value=/\\bborder-(l|r)($|-|\\s)/]",
          message: "Use border-s / border-e for RTL support.",
        },
        {
          selector: "Literal[value=/\\btext-(left|right)\\b/]",
          message: "Use text-start / text-end for RTL support.",
        },
        {
          selector: "Literal[value=/(?<!from-)\\b(left|right)-\\d+(?!\\/)/]",
          message: "Use start- / end- logical insets for RTL support.",
        },
      ],
    },
  },
]);

export default eslintConfig;
