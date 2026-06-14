import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Deck, Flashcard, Settings } from "../../types";
import type { DictionaryEntry } from "./dictionary";

export const DB_NAME = "flashcards-local";
export const DB_VERSION = 1;

export type LocalDeck = Omit<Deck, "cardCount">;

interface FlashcardDB extends DBSchema {
  decks: {
    key: string;
    value: LocalDeck;
  };
  flashcards: {
    key: string;
    value: Flashcard;
  };
  settings: {
    key: string;
    value: Settings;
  };
  dictionaryCache: {
    key: string;
    value: DictionaryEntry & { fetchedAt: string };
  };
}

let dbPromise: Promise<IDBPDatabase<FlashcardDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<FlashcardDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FlashcardDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore("decks", { keyPath: "id" });
          db.createObjectStore("flashcards", { keyPath: "id" });
          db.createObjectStore("settings", { keyPath: "id" });
          db.createObjectStore("dictionaryCache", { keyPath: "word" });
        }
      },
    });
  }
  return dbPromise;
}

export function generateId(): string {
  return crypto.randomUUID();
}
