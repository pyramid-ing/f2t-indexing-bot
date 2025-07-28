-- CreateTable
CREATE TABLE "SitemapUrl" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "lastmod" DATETIME,
    "siteId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SitemapUrl_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "sitemapEnabled" BOOLEAN NOT NULL DEFAULT false,
    "sitemapUrl" TEXT,
    "sitemapLastParsed" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Site" ("bingConfig", "createdAt", "daumConfig", "description", "domain", "googleConfig", "id", "isActive", "name", "naverConfig", "siteUrl", "updatedAt") SELECT "bingConfig", "createdAt", "daumConfig", "description", "domain", "googleConfig", "id", "isActive", "name", "naverConfig", "siteUrl", "updatedAt" FROM "Site";
DROP TABLE "Site";
ALTER TABLE "new_Site" RENAME TO "Site";
CREATE UNIQUE INDEX "Site_domain_key" ON "Site"("domain");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "SitemapUrl_siteId_idx" ON "SitemapUrl"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "SitemapUrl_url_siteId_key" ON "SitemapUrl"("url", "siteId");
