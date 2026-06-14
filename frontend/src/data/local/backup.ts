import { getDb, type LocalDeck } from "./db";
import { downloadBlob } from "../../lib/downloadBlob";
import type { Flashcard } from "../../types";

const BACKUP_VERSION = 1;

export async function downloadBackup(): Promise<void> {
  const db = await getDb();
  const [decks, flashcards] = await Promise.all([db.getAll("decks"), db.getAll("flashcards")]);

  const backup = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    decks: decks.map((d) => ({ id: d.id, name: d.name, parentId: d.parentId, createdAt: d.createdAt })),
    flashcards,
  };

  const date = new Date().toISOString().slice(0, 10);
  downloadBlob(
    new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }),
    `flashcards-backup-${date}.json`,
  );
}

interface BackupDeck {
  id: string;
  name: string;
  parentId?: string | null;
  createdAt?: string;
}

interface BackupFlashcard {
  id: string;
  word: string;
  phonetic?: string;
  type?: string;
  definition?: string;
  examples?: string[];
  audioUrl?: string;
  deckId?: string | null;
  createdAt?: string;
  easeFactor?: number;
  interval?: number;
  reviewCount?: number;
  lapses?: number;
  nextReviewDate?: string;
}

interface BackupData {
  version: number;
  decks: BackupDeck[];
  flashcards: BackupFlashcard[];
}

function sortDecksParentFirst(decks: BackupDeck[]): BackupDeck[] {
  const sorted: BackupDeck[] = [];
  const remaining = new Map(decks.map((d) => [d.id, d]));
  while (remaining.size > 0) {
    let progressed = false;
    for (const [id, deck] of remaining) {
      if (!deck.parentId || !remaining.has(deck.parentId)) {
        sorted.push(deck);
        remaining.delete(id);
        progressed = true;
      }
    }
    if (!progressed) {
      sorted.push(...remaining.values());
      break;
    }
  }
  return sorted;
}

export async function restoreBackup(content: string): Promise<{ decks: number; flashcards: number }> {
  const data = JSON.parse(content) as BackupData;
  if (!Array.isArray(data.decks) || !Array.isArray(data.flashcards)) {
    throw new Error("Invalid backup file");
  }

  const now = new Date().toISOString();
  const sortedDecks = sortDecksParentFirst(data.decks);

  const localDecks: LocalDeck[] = sortedDecks.map((d) => ({
    id: d.id,
    name: d.name,
    parentId: d.parentId ?? null,
    createdAt: d.createdAt ?? now,
  }));

  const localCards: Flashcard[] = data.flashcards.map((c) => ({
    id: c.id,
    word: c.word,
    phonetic: c.phonetic ?? "",
    type: c.type ?? "",
    definition: c.definition ?? "",
    examples: c.examples ?? [],
    audioUrl: c.audioUrl ?? "",
    deckId: c.deckId ?? null,
    createdAt: c.createdAt ?? now,
    easeFactor: c.easeFactor ?? 2.5,
    interval: c.interval ?? 0,
    reviewCount: c.reviewCount ?? 0,
    lapses: c.lapses ?? 0,
    nextReviewDate: c.nextReviewDate ?? now,
  }));

  const db = await getDb();
  const tx = db.transaction(["decks", "flashcards"], "readwrite");
  await tx.objectStore("decks").clear();
  await tx.objectStore("flashcards").clear();
  for (const deck of localDecks) await tx.objectStore("decks").put(deck);
  for (const card of localCards) await tx.objectStore("flashcards").put(card);
  await tx.done;

  return { decks: localDecks.length, flashcards: localCards.length };
}
