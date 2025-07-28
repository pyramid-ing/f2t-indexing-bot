/*
  Warnings:

  - Added the required column `sitemapType` to the `SitemapConfig` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SitemapConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sitemapType" TEXT NOT NULL,
    "sitemapUrl" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastParsed" DATETIME,
    "siteId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SitemapConfig_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SitemapConfig" ("createdAt", "id", "isEnabled", "lastParsed", "name", "siteId", "sitemapUrl", "updatedAt") SELECT "createdAt", "id", "isEnabled", "lastParsed", "name", "siteId", "sitemapUrl", "updatedAt" FROM "SitemapConfig";
DROP TABLE "SitemapConfig";
ALTER TABLE "new_SitemapConfig" RENAME TO "SitemapConfig";
CREATE INDEX "SitemapConfig_siteId_idx" ON "SitemapConfig"("siteId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
