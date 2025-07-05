/*
  Warnings:

  - The primary key for the `IndexJob` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `publishedAt` on the `IndexJob` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `IndexJob` table. All the data in the column will be lost.
  - You are about to alter the column `id` on the `IndexJob` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `jobId` on the `IndexJob` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `Job` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `completedAt` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `desc` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `errorMessage` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `priority` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `resultMsg` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledAt` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `subject` on the `Job` table. All the data in the column will be lost.
  - You are about to alter the column `id` on the `Job` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `JobLog` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `JobLog` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `jobId` on the `JobLog` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - Added the required column `data` to the `Job` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Site" ADD COLUMN "description" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_IndexJob" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "url" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "jobId" INTEGER NOT NULL,
    "siteId" INTEGER NOT NULL,
    CONSTRAINT "IndexJob_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "IndexJob_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_IndexJob" ("createdAt", "id", "jobId", "provider", "siteId", "updatedAt", "url") SELECT "createdAt", "id", "jobId", "provider", "siteId", "updatedAt", "url" FROM "IndexJob";
DROP TABLE "IndexJob";
ALTER TABLE "new_IndexJob" RENAME TO "IndexJob";
CREATE UNIQUE INDEX "IndexJob_jobId_key" ON "IndexJob"("jobId");
CREATE INDEX "IndexJob_siteId_idx" ON "IndexJob"("siteId");
CREATE TABLE "new_Job" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "type" TEXT NOT NULL,
    "data" TEXT NOT NULL
);
INSERT INTO "new_Job" ("createdAt", "id", "status", "type", "updatedAt") SELECT "createdAt", "id", "status", "type", "updatedAt" FROM "Job";
DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";
CREATE TABLE "new_JobLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jobId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'info',
    CONSTRAINT "JobLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_JobLog" ("createdAt", "id", "jobId", "level", "message") SELECT "createdAt", "id", "jobId", "level", "message" FROM "JobLog";
DROP TABLE "JobLog";
ALTER TABLE "new_JobLog" RENAME TO "JobLog";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
