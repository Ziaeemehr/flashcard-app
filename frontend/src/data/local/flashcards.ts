import { getDb, generateId } from "./db";
import { applyReview } from "./sm2";
import { getSettings } from "./settings";
import { lookupWord, fetchExampleSentences } from "./dictionary";
import { parseImport, toCsv, toAnkiTsv, type ExportableCard } from "./exportImport";
import { downloadBlob } from "../../lib/downloadBlob";
import type { Flashcard, NewFlashcard, ReviewRating, ReviewStats } from "../../types";
import type { ImportExportFormat } from "../remote";

const MAX_BULK_IMPORT = 300;

// Expands a deckId into itself plus all descendant deck ids, mirroring the
// backend's deckFilter BFS over the deck hierarchy.
async function resolveDeckIds(deckId?: string | null): Promise<Set<string> | null | undefined> {
  if (deckId === undefined) return undefined; // no filter
  if (deckId === null) return null; // unassigned: deckId === null

  const db = await getDb();
  const decks = await db.getAll("decks");
  const ids = new Set<string>([deckId]);
  let added = true;
  while (added) {
    added = false;
    for (const d of decks) {
      if (d.parentId && ids.has(d.parentId) && !ids.has(d.id)) {
        ids.add(d.id);
        added = true;
      }
    }
  }
  return ids;
}

function matchesDeck(card: Flashcard, deckIds: Set<string> | null | undefined): boolean {
  if (deckIds === undefined) return true;
  if (deckIds === null) return card.deckId === null;
  return card.deckId !== null && deckIds.has(card.deckId);
}

async function filteredCards(deckId?: string | null): Promise<Flashcard[]> {
  const db = await getDb();
  const deckIds = await resolveDeckIds(deckId);
  const all = await db.getAll("flashcards");
  return all.filter((c) => matchesDeck(c, deckIds));
}

function newCard(card: NewFlashcard): Flashcard {
  const now = new Date().toISOString();
  return {
    ...card,
    id: generateId(),
    createdAt: now,
    easeFactor: 2.5,
    interval: 0,
    reviewCount: 0,
    lapses: 0,
    nextReviewDate: now,
  };
}

const EXPORT_EXTENSIONS: Record<ImportExportFormat, string> = {
  json: "json",
  csv: "csv",
  anki: "txt",
};

function toExportable(card: Flashcard): ExportableCard {
  return {
    word: card.word,
    phonetic: card.phonetic,
    type: card.type,
    definition: card.definition,
    examples: card.examples,
    audioUrl: card.audioUrl,
  };
}

// Strips a leading line number such as "1.", "1)" or "1\t" from a pasted word list line.
function stripLineNumber(line: string): string {
  return line.replace(/^\s*\d+[.)]?\s*/, "").trim();
}

export const flashcardsApi = {
  list: async (deckId?: string | null): Promise<Flashcard[]> => {
    const cards = await filteredCards(deckId);
    return cards.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  create: async (card: NewFlashcard): Promise<Flashcard> => {
    const db = await getDb();
    const created = newCard(card);
    await db.put("flashcards", created);
    return created;
  },

  update: async (id: string, card: Partial<NewFlashcard>): Promise<Flashcard> => {
    const db = await getDb();
    const existing = await db.get("flashcards", id);
    if (!existing) throw new Error("Not found");
    const updated: Flashcard = { ...existing, ...card };
    await db.put("flashcards", updated);
    return updated;
  },

  remove: async (id: string): Promise<void> => {
    const db = await getDb();
    await db.delete("flashcards", id);
  },

  due: async (deckId?: string | null): Promise<Flashcard[]> => {
    const cards = await filteredCards(deckId);
    const settings = await getSettings();
    const now = Date.now();

    const dueReview = cards
      .filter((c) => c.reviewCount > 0 && new Date(c.nextReviewDate).getTime() <= now)
      .sort((a, b) => new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime());

    const newCards = cards
      .filter((c) => c.reviewCount === 0)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, settings.newCardsPerDay);

    return [...dueReview, ...newCards];
  },

  stats: async (deckId?: string | null): Promise<ReviewStats> => {
    const cards = await filteredCards(deckId);
    const settings = await getSettings();
    const now = Date.now();

    const dueReviewCount = cards.filter(
      (c) => c.reviewCount > 0 && new Date(c.nextReviewDate).getTime() <= now,
    ).length;
    const newWords = cards.filter((c) => c.reviewCount === 0).length;
    const learned = cards.filter((c) => c.reviewCount > 0).length;

    const totalReviews = cards.reduce((sum, c) => sum + c.reviewCount, 0);
    const totalLapses = cards.reduce((sum, c) => sum + c.lapses, 0);
    const retentionRate = totalReviews > 0 ? ((totalReviews - totalLapses) / totalReviews) * 100 : null;

    const dueToday = dueReviewCount + Math.min(settings.newCardsPerDay, newWords);

    return { dueToday, newWords, learned, retentionRate };
  },

  review: async (id: string, rating: ReviewRating): Promise<Flashcard> => {
    const db = await getDb();
    const existing = await db.get("flashcards", id);
    if (!existing) throw new Error("Not found");

    const result = applyReview(
      {
        easeFactor: existing.easeFactor,
        interval: existing.interval,
        reviewCount: existing.reviewCount,
        lapses: existing.lapses,
      },
      rating,
    );

    const updated: Flashcard = {
      ...existing,
      easeFactor: result.easeFactor,
      interval: result.interval,
      reviewCount: result.reviewCount,
      lapses: result.lapses,
      nextReviewDate: result.nextReviewDate.toISOString(),
    };
    await db.put("flashcards", updated);
    return updated;
  },

  import: async (
    format: ImportExportFormat,
    content: string,
    deckId?: string | null,
  ): Promise<{ imported: number }> => {
    const parsed = parseImport(format, content);
    if (parsed.length === 0) throw new Error("No valid cards found in file");

    const db = await getDb();
    const tx = db.transaction("flashcards", "readwrite");
    for (const card of parsed) {
      await tx.store.put(newCard({ ...card, deckId: deckId ?? null }));
    }
    await tx.done;

    return { imported: parsed.length };
  },

  bulkImport: async (
    words: string[],
    deckId: string | null,
  ): Promise<{ created: number; results: { word: string; found: boolean }[] }> => {
    const db = await getDb();
    const limited = words.slice(0, MAX_BULK_IMPORT);
    const results: { word: string; found: boolean }[] = [];

    for (const raw of limited) {
      const word = stripLineNumber(raw);
      if (!word) continue;

      const entry = await lookupWord(word);
      const examples = entry?.examples.length ? entry.examples : await fetchExampleSentences(word);
      const card = newCard({
        word,
        definition: entry?.definition ?? "",
        phonetic: entry?.phonetic ?? "",
        type: entry?.type ?? "",
        examples,
        audioUrl: "",
        deckId: deckId ?? null,
      });
      await db.put("flashcards", card);
      results.push({ word, found: entry !== null });
    }

    return { created: results.length, results };
  },
};

export async function exportFlashcards(format: ImportExportFormat, deckId?: string | null): Promise<void> {
  const cards = await filteredCards(deckId);
  const sorted = cards.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const exportable = sorted.map(toExportable);

  let content: string;
  let type: string;
  switch (format) {
    case "csv":
      content = toCsv(exportable);
      type = "text/csv";
      break;
    case "anki":
      content = toAnkiTsv(exportable);
      type = "text/tab-separated-values";
      break;
    case "json":
      content = JSON.stringify(exportable, null, 2);
      type = "application/json";
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }

  downloadBlob(new Blob([content], { type }), `flashcards.${EXPORT_EXTENSIONS[format]}`);
}
