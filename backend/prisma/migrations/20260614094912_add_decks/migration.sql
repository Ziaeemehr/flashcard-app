-- CreateTable
CREATE TABLE "Deck" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Flashcard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "word" TEXT NOT NULL,
    "phonetic" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT '',
    "definition" TEXT NOT NULL DEFAULT '',
    "examples" TEXT NOT NULL DEFAULT '[]',
    "audioUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deckId" TEXT,
    "easeFactor" REAL NOT NULL DEFAULT 2.5,
    "interval" INTEGER NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "nextReviewDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Flashcard_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Flashcard" ("audioUrl", "createdAt", "definition", "easeFactor", "examples", "id", "interval", "lapses", "nextReviewDate", "phonetic", "reviewCount", "type", "word") SELECT "audioUrl", "createdAt", "definition", "easeFactor", "examples", "id", "interval", "lapses", "nextReviewDate", "phonetic", "reviewCount", "type", "word" FROM "Flashcard";
DROP TABLE "Flashcard";
ALTER TABLE "new_Flashcard" RENAME TO "Flashcard";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Deck_name_key" ON "Deck"("name");
