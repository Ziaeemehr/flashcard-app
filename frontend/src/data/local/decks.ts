import { getDb, generateId, type LocalDeck } from "./db";
import type { Deck } from "../../types";

const DUPLICATE_ERROR = "A deck with that name already exists at this level";

async function withCardCounts(decks: LocalDeck[]): Promise<Deck[]> {
  const db = await getDb();
  const allCards = await db.getAll("flashcards");
  return decks
    .map((d) => ({
      ...d,
      cardCount: allCards.filter((c) => c.deckId === d.id).length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function collectDescendantIds(db: Awaited<ReturnType<typeof getDb>>, rootId: string): Promise<string[]> {
  const allDecks = await db.getAll("decks");
  const ids = new Set<string>([rootId]);
  let added = true;
  while (added) {
    added = false;
    for (const d of allDecks) {
      if (d.parentId && ids.has(d.parentId) && !ids.has(d.id)) {
        ids.add(d.id);
        added = true;
      }
    }
  }
  ids.delete(rootId);
  return [...ids];
}

export const decksApi = {
  list: async (): Promise<Deck[]> => {
    const db = await getDb();
    const decks = await db.getAll("decks");
    return withCardCounts(decks);
  },

  create: async (name: string, parentId?: string | null): Promise<Deck> => {
    const db = await getDb();
    const normalizedParentId = parentId ?? null;
    const allDecks = await db.getAll("decks");
    const existing = allDecks.find(
      (d) => d.parentId === normalizedParentId && d.name === name,
    );
    if (existing) throw new Error(DUPLICATE_ERROR);

    const deck: LocalDeck = {
      id: generateId(),
      name,
      parentId: normalizedParentId,
      createdAt: new Date().toISOString(),
    };
    await db.put("decks", deck);
    return { ...deck, cardCount: 0 };
  },

  rename: async (id: string, name: string): Promise<Deck> => {
    const db = await getDb();
    const current = await db.get("decks", id);
    if (!current) throw new Error("Not found");

    const allDecks = await db.getAll("decks");
    const existing = allDecks.find(
      (d) => d.parentId === current.parentId && d.name === name && d.id !== id,
    );
    if (existing) throw new Error(DUPLICATE_ERROR);

    const updated: LocalDeck = { ...current, name };
    await db.put("decks", updated);
    const allCards = await db.getAll("flashcards");
    const cardCount = allCards.filter((c) => c.deckId === id).length;
    return { ...updated, cardCount };
  },

  remove: async (id: string): Promise<void> => {
    const db = await getDb();
    const idsToDelete = [id, ...(await collectDescendantIds(db, id))];

    const tx = db.transaction(["decks", "flashcards"], "readwrite");
    const allCards = await tx.objectStore("flashcards").getAll();
    for (const deckId of idsToDelete) {
      await tx.objectStore("decks").delete(deckId);
      for (const card of allCards.filter((c) => c.deckId === deckId)) {
        await tx.objectStore("flashcards").put({ ...card, deckId: null });
      }
    }
    await tx.done;
  },
};
