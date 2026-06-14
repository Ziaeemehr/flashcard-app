-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DictionaryEntry" (
    "word" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT '',
    "phonetic" TEXT NOT NULL DEFAULT '',
    "definition" TEXT NOT NULL DEFAULT '',
    "examples" TEXT NOT NULL DEFAULT '[]',
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_DictionaryEntry" ("definition", "examples", "fetchedAt", "type", "word") SELECT "definition", "examples", "fetchedAt", "type", "word" FROM "DictionaryEntry";
DROP TABLE "DictionaryEntry";
ALTER TABLE "new_DictionaryEntry" RENAME TO "DictionaryEntry";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
