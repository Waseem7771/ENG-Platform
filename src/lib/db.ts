import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  // Enforce only when actually serving in production, never during `next build`
  // (which runs with NODE_ENV=production but does no DB I/O and may still see
  // the local dev DATABASE_URL).
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
  if (process.env.NODE_ENV === "production" && !isBuildPhase) {
    // A relative file: path resolves against each process's cwd, so the
    // migrator and the app would silently use DIFFERENT databases. Refuse to
    // boot rather than serve an empty/ephemeral DB that looks healthy.
    if (!url) {
      throw new Error("DATABASE_URL must be set in production.");
    }
    if (url.startsWith("file:")) {
      const filePath = url.slice("file:".length);
      // Absolute = POSIX "/..." or Windows "C:/...". Anything else (./x, x.db)
      // is relative and resolves against cwd, so migrator and app would diverge.
      const isAbsolute = filePath.startsWith("/") || /^[A-Za-z]:[/\\]/.test(filePath);
      if (!isAbsolute) {
        throw new Error(
          `DATABASE_URL must be an absolute path in production (got "${url}"). ` +
            `Use e.g. file:/app/data/speakpath.db`
        );
      }
    }
    return url;
  }
  return url ?? "file:./dev.db";
}

const adapter = new PrismaLibSql({
  url: resolveDatabaseUrl(),
});

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
