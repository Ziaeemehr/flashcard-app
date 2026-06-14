-- CreateTable
CREATE TABLE "Flashcard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "word" TEXT NOT NULL,
    "phonetic" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT '',
    "definition" TEXT NOT NULL DEFAULT '',
    "examples" TEXT NOT NULL DEFAULT '[]',
    "audioUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
