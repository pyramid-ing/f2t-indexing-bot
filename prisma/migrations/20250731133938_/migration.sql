/*
  Warnings:

  - The primary key for the `SitemapConfig` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `SitemapConfig` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Site" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "siteUrl" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "googleConfig" TEXT NOT NULL DEFAULT '{}',
    "naverConfig" TEXT NOT NULL DEFAULT '{}',
    "daumConfig" TEXT NOT NULL DEFAULT '{}',
    "bingConfig" TEXT NOT NULL DEFAULT '{}',
    "indexingConfig" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Site" ("bingConfig", "createdAt", "daumConfig", "description", "domain", "googleConfig", "id", "isActive", "name", "naverConfig", "siteUrl", "updatedAt") SELECT "bingConfig", "createdAt", "daumConfig", "description", "domain", "googleConfig", "id", "isActive", "name", "naverConfig", "siteUrl", "updatedAt" FROM "Site";
DROP TABLE "Site";
ALTER TABLE "new_Site" RENAME TO "Site";
CREATE UNIQUE INDEX "Site_domain_key" ON "Site"("domain");
CREATE TABLE "new_SitemapConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "siteId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sitemapType" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastParsed" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SitemapConfig_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SitemapConfig" ("createdAt", "id", "isEnabled", "lastParsed", "name", "siteId", "sitemapType", "updatedAt") SELECT "createdAt", "id", "isEnabled", "lastParsed", "name", "siteId", "sitemapType", "updatedAt" FROM "SitemapConfig";
DROP TABLE "SitemapConfig";
ALTER TABLE "new_SitemapConfig" RENAME TO "SitemapConfig";
CREATE INDEX "SitemapConfig_siteId_idx" ON "SitemapConfig"("siteId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
