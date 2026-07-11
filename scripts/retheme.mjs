// Mechanical dark→light class mapping (spec §3.1 / audit remediation).
// Usage: node scripts/retheme.mjs <file-or-dir> [...more]
import { readFileSync, writeFileSync, statSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";

const REPLACEMENTS = [
  // Hover-specific rules MUST precede their generic counterparts below — otherwise
  // the generic regex (no hover: awareness) matches first and clobbers the class,
  // leaving the dedicated hover:* rule with nothing left to match (dead hover state).
  [/hover:bg-white\/(?:5|10)\b/g, "hover:bg-muted"],
  [/hover:border-white\/(?:10|15|20|30)\b/g, "hover:border-line-strong"],
  // text: 3-token system
  [/text-white\/(?:90|80|70)\b/g, "text-foreground"],
  [/text-white\/(?:60|50|40|30|25|20|15|10)\b/g, "text-muted-foreground"],
  [/(?<![\w/-])text-white(?![\w/-])/g, "text-foreground"],
  // surfaces
  [/bg-white\/\[0\.0[2-9]\]/g, "bg-card"],
  [/bg-white\/(?:5|10)\b/g, "bg-muted"],
  [/border-white\/(?:5|10|15|20)\b/g, "border-border"],
  [/divide-white\/(?:5|10)\b/g, "divide-border"],
  [/placeholder:text-white\/(?:20|25|30|40)\b/g, "placeholder:text-muted-foreground/70"],
  // glass + glow leftovers
  [/\s?backdrop-blur(?:-\w+)?\b/g, ""],
  [/\s?(?:glow-violet|glow-blue|glow-cyan|text-glow|border-glow|noise)\b/g, ""],
  // gradient text -> solid primary
  [
    /bg-gradient-to-r from-\w+-\d+ (?:via-\w+-\d+ )?to-\w+-\d+ bg-clip-text text-transparent/g,
    "text-primary",
  ],
  // gradient fills -> primary
  [/bg-gradient-to-(?:r|br|b) from-violet-\d+ to-blue-\d+/g, "bg-primary"],
  [/bg-gradient-to-(?:r|br|b) from-emerald-\d+ to-cyan-\d+/g, "bg-primary"],
  // hardcoded accents used on dark
  [/text-violet-[34]00\b/g, "text-primary"],
  [/text-emerald-[34]00\b/g, "text-leaf-text"],
  [/text-amber-[34]00\b/g, "text-sun-deep"],
  [/text-red-400\b/g, "text-destructive"],
  [/bg-violet-500\/10\b/g, "bg-secondary"],
  [/border-violet-500\/20\b/g, "border-primary/25"],
];

function processFile(file) {
  const before = readFileSync(file, "utf8");
  let after = before;
  for (const [re, to] of REPLACEMENTS) after = after.replace(re, to);
  if (after !== before) {
    writeFileSync(file, after);
    console.log("rethemed", file);
  }
}

function walk(target) {
  const st = statSync(target);
  if (st.isDirectory()) {
    for (const entry of readdirSync(target)) walk(join(target, entry));
  } else if ([".tsx", ".ts"].includes(extname(target))) {
    processFile(target);
  }
}

for (const target of process.argv.slice(2)) walk(target);
