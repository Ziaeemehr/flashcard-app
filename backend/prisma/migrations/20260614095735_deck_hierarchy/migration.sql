-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Deck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parentId" TEXT,
    CONSTRAINT "Deck_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Deck" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Deck" ("createdAt", "id", "name") SELECT "createdAt", "id", "name" FROM "Deck";
DROP TABLE "Deck";
ALTER TABLE "new_Deck" RENAME TO "Deck";
CREATE UNIQUE INDEX "Deck_name_parentId_key" ON "Deck"("name", "parentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
