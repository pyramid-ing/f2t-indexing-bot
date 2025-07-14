/*
  Warnings:

  - You are about to drop the column `data` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `errorMsg` on the `Job` table. All the data in the column will be lost.
  - Added the required column `desc` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subject` to the `Job` table without a default value. This is not possible if the table is not empty.
  - Made the column `scheduledAt` on table `Job` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_IndexJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "jobId" TEXT NOT NULL,
    "siteId" INTEGER NOT NULL,
    CONSTRAINT "IndexJob_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "IndexJob_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_IndexJob" ("createdAt", "id", "jobId", "provider", "siteId", "updatedAt", "url") SELECT "createdAt", "id", "jobId", "provider", "siteId", "updatedAt", "url" FROM "IndexJob";
DROP TABLE "IndexJob";
ALTER TABLE "new_IndexJob" RENAME TO "IndexJob";
CREATE UNIQUE INDEX "IndexJob_jobId_key" ON "IndexJob"("jobId");
CREATE TABLE "new_Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 1,
    "scheduledAt" DATETIME NOT NULL,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "resultMsg" TEXT,
    "resultUrl" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Job" ("completedAt", "createdAt", "id", "resultMsg", "scheduledAt", "startedAt", "status", "type", "updatedAt") SELECT "completedAt", "createdAt", "id", "resultMsg", "scheduledAt", "startedAt", "status", "type", "updatedAt" FROM "Job";
DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";
CREATE TABLE "new_JobLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'info',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_JobLog" ("createdAt", "id", "jobId", "level", "message") SELECT "createdAt", "id", "jobId", "level", "message" FROM "JobLog";
DROP TABLE "JobLog";
ALTER TABLE "new_JobLog" RENAME TO "JobLog";
CREATE INDEX "JobLog_jobId_idx" ON "JobLog"("jobId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
