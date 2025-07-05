/*
  Warnings:

  - You are about to drop the column `bingConfig` on the `Site` table. All the data in the column will be lost.
  - You are about to drop the column `daumConfig` on the `Site` table. All the data in the column will be lost.
  - You are about to drop the column `googleConfig` on the `Site` table. All the data in the column will be lost.
  - You are about to drop the column `naverConfig` on the `Site` table. All the data in the column will be lost.
  - You are about to drop the column `siteUrl` on the `Site` table. All the data in the column will be lost.
  - Added the required column `siteId` to the `NaverAccount` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
INSERT INTO "new_NaverAccount" ("createdAt", "id", "isActive", "isLoggedIn", "lastLogin", "name", "naverId", "password", "updatedAt") SELECT "createdAt", "id", "isActive", "isLoggedIn", coalesce("lastLogin", CURRENT_TIMESTAMP) AS "lastLogin", "name", "naverId", "password", "updatedAt" FROM "NaverAccount";
DROP TABLE "NaverAccount";
ALTER TABLE "new_NaverAccount" RENAME TO "NaverAccount";
CREATE UNIQUE INDEX "NaverAccount_naverId_key" ON "NaverAccount"("naverId");
CREATE TABLE "new_Site" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Site" ("createdAt", "domain", "id", "isActive", "name", "updatedAt") SELECT "createdAt", "domain", "id", "isActive", "name", "updatedAt" FROM "Site";
DROP TABLE "Site";
ALTER TABLE "new_Site" RENAME TO "Site";
CREATE UNIQUE INDEX "Site_domain_key" ON "Site"("domain");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
