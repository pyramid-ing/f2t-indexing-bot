/*
  Warnings:

  - You are about to drop the column `siteUrl` on the `IndexingLog` table. All the data in the column will be lost.
  - Added the required column `siteId` to the `IndexingLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `domain` to the `Site` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Site` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_IndexingLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "siteId" INTEGER NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "responseData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "IndexingLog_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_IndexingLog" ("completedAt", "createdAt", "id", "message", "provider", "responseData", "status", "targetUrl") SELECT "completedAt", "createdAt", "id", "message", "provider", "responseData", "status", "targetUrl" FROM "IndexingLog";
DROP TABLE "IndexingLog";
ALTER TABLE "new_IndexingLog" RENAME TO "IndexingLog";
CREATE INDEX "IndexingLog_siteId_idx" ON "IndexingLog"("siteId");
CREATE INDEX "IndexingLog_provider_idx" ON "IndexingLog"("provider");
CREATE INDEX "IndexingLog_status_idx" ON "IndexingLog"("status");
CREATE TABLE "new_Site" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "domain" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "siteUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "googleConfig" TEXT NOT NULL DEFAULT '{}',
    "naverConfig" TEXT NOT NULL DEFAULT '{}',
    "daumConfig" TEXT NOT NULL DEFAULT '{}',
    "bingConfig" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Site" ("createdAt", "id", "siteUrl", "updatedAt") SELECT "createdAt", "id", "siteUrl", "updatedAt" FROM "Site";
DROP TABLE "Site";
ALTER TABLE "new_Site" RENAME TO "Site";
CREATE UNIQUE INDEX "Site_domain_key" ON "Site"("domain");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
