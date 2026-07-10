let counter = 0;

/** Stable client-side key for list rows — never sent to the server. */
export function clientId(): string {
  counter += 1;
  return `c${Date.now().toString(36)}${counter}`;
}

/** Sequential server-facing item ids, e.g. i1, i2, i3 — per the exercise data contract. */
export function sequentialIds(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `i${i + 1}`);
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `scenario-${clientId()}`;
}

function fisherYates<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Shuffles `items` into a different order than the input when possible.
 * Bounded — never recurses, so a sentence made of identical/near-identical
 * words (few distinct values) can't cause a stack overflow.
 */
export function shuffle<T>(items: T[]): T[] {
  if (items.length < 2 || new Set(items).size < 2) return [...items];

  let arr = fisherYates(items);
  for (let attempt = 0; attempt < 10 && arr.every((v, i) => v === items[i]); attempt += 1) {
    arr = fisherYates(items);
  }
  return arr;
}

export function linesToList(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export const DEFAULT_POINTS: Record<"BEGINNER" | "INTERMEDIATE" | "ADVANCED", number> = {
  BEGINNER: 10,
  INTERMEDIATE: 15,
  ADVANCED: 20,
};
