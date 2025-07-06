/*
  Warnings:

  - You are about to drop the column `accessToken` on the `NaverAccount` table. All the data in the column will be lost.
  - You are about to drop the column `siteId` on the `NaverAccount` table. All the data in the column will be lost.

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
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_NaverAccount" ("createdAt", "id", "isActive", "isLoggedIn", "lastLogin", "name", "naverId", "password", "updatedAt") SELECT "createdAt", "id", "isActive", "isLoggedIn", "lastLogin", "name", "naverId", "password", "updatedAt" FROM "NaverAccount";
DROP TABLE "NaverAccount";
ALTER TABLE "new_NaverAccount" RENAME TO "NaverAccount";
CREATE UNIQUE INDEX "NaverAccount_naverId_key" ON "NaverAccount"("naverId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
