/*
  Warnings:

  - You are about to drop the `BingConfig` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DaumConfig` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GoogleConfig` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NaverConfig` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "BingConfig";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "DaumConfig";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "GoogleConfig";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "NaverConfig";
PRAGMA foreign_keys=on;
