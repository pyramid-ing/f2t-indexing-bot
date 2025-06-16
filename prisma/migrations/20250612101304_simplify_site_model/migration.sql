/*
  Warnings:

  - You are about to drop the column `blogType` on the `Site` table. All the data in the column will be lost.
  - You are about to drop the column `indexingUrls` on the `Site` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Site" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "siteUrl" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Site" ("createdAt", "id", "siteUrl", "updatedAt") SELECT "createdAt", "id", "siteUrl", "updatedAt" FROM "Site";
DROP TABLE "Site";
ALTER TABLE "new_Site" RENAME TO "Site";
CREATE UNIQUE INDEX "Site_siteUrl_key" ON "Site"("siteUrl");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
