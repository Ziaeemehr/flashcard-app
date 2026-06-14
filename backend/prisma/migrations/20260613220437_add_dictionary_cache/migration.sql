-- CreateTable
CREATE TABLE "DictionaryEntry" (
    "word" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT '',
    "definition" TEXT NOT NULL DEFAULT '',
    "examples" TEXT NOT NULL DEFAULT '[]',
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
