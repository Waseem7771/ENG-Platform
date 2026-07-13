-- AlterTable
ALTER TABLE "LiveSession" ADD COLUMN "scheduledAt" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ExerciseResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exerciseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "timeSpent" INTEGER,
    "answers" TEXT,
    "sessionId" TEXT,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExerciseResult_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExerciseResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExerciseResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "LiveSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ExerciseResult" ("answers", "completedAt", "exerciseId", "id", "score", "studentId", "timeSpent") SELECT "answers", "completedAt", "exerciseId", "id", "score", "studentId", "timeSpent" FROM "ExerciseResult";
DROP TABLE "ExerciseResult";
ALTER TABLE "new_ExerciseResult" RENAME TO "ExerciseResult";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
