import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";

export default function setup() {
  const dbPath = path.resolve(process.cwd(), "prisma/test.db");
  rmSync(dbPath, { force: true });
  process.env.DATABASE_URL = `file:${dbPath}`;
  process.env.BETTER_AUTH_SECRET = "vitest-secret-0123456789-0123456789-01";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
  });
}
