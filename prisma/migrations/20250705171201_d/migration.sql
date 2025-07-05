/*
  Warnings:

  - You are about to alter the column `siteId` on the `IndexJob` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `siteId` on the `NaverAccount` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `Site` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `Site` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_IndexJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "url" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "siteId" INTEGER NOT NULL,
    CONSTRAINT "IndexJob_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "IndexJob_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_IndexJob" ("createdAt", "id", "jobId", "provider", "siteId", "updatedAt", "url") SELECT "createdAt", "id", "jobId", "provider", "siteId", "updatedAt", "url" FROM "IndexJob";
DROP TABLE "IndexJob";
ALTER TABLE "new_IndexJob" RENAME TO "IndexJob";
CREATE UNIQUE INDEX "IndexJob_jobId_key" ON "IndexJob"("jobId");
CREATE INDEX "IndexJob_siteId_idx" ON "IndexJob"("siteId");
CREATE TABLE "new_NaverAccount" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "naverId" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isLoggedIn" BOOLEAN NOT NULL DEFAULT false,
    "lastLogin" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "siteId" INTEGER NOT NULL,
    "accessToken" TEXT,
    CONSTRAINT "NaverAccount_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_NaverAccount" ("accessToken", "createdAt", "id", "isActive", "isLoggedIn", "lastLogin", "name", "naverId", "password", "siteId", "updatedAt") SELECT "accessToken", "createdAt", "id", "isActive", "isLoggedIn", "lastLogin", "name", "naverId", "password", "siteId", "updatedAt" FROM "NaverAccount";
DROP TABLE "NaverAccount";
ALTER TABLE "new_NaverAccount" RENAME TO "NaverAccount";
CREATE UNIQUE INDEX "NaverAccount_naverId_key" ON "NaverAccount"("naverId");
CREATE TABLE "new_Site" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Site" ("createdAt", "description", "domain", "id", "isActive", "name", "updatedAt") SELECT "createdAt", "description", "domain", "id", "isActive", "name", "updatedAt" FROM "Site";
DROP TABLE "Site";
ALTER TABLE "new_Site" RENAME TO "Site";
CREATE UNIQUE INDEX "Site_domain_key" ON "Site"("domain");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
