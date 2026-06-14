import { Router } from "express";
import { z } from "zod";
import { prisma } from "./db";

const router = Router();

const BACKUP_VERSION = 1;

router.get("/", async (_req, res) => {
  const [decks, cards] = await Promise.all([
    prisma.deck.findMany(),
    prisma.flashcard.findMany(),
  ]);

  const backup = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    decks: decks.map((d) => ({ id: d.id, name: d.name, parentId: d.parentId, createdAt: d.createdAt })),
    flashcards: cards.map((c) => ({ ...c, examples: JSON.parse(c.examples) as string[] })),
  };

  const date = new Date().toISOString().slice(0, 10);
  res
    .type("application/json")
    .attachment(`flashcards-backup-${date}.json`)
    .send(JSON.stringify(backup, null, 2));
});

const backupSchema = z.object({
  version: z.number(),
  decks: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      parentId: z.string().nullable().optional(),
      createdAt: z.coerce.date().optional(),
    }),
  ),
  flashcards: z.array(
    z.object({
      id: z.string(),
      word: z.string(),
      phonetic: z.string().optional().default(""),
      type: z.string().optional().default(""),
      definition: z.string().optional().default(""),
      examples: z.array(z.string()).optional().default([]),
      audioUrl: z.string().optional().default(""),
      deckId: z.string().nullable().optional(),
      createdAt: z.coerce.date().optional(),
      easeFactor: z.number().optional().default(2.5),
      interval: z.number().optional().default(0),
      reviewCount: z.number().optional().default(0),
      lapses: z.number().optional().default(0),
      nextReviewDate: z.coerce.date().optional(),
    }),
  ),
});

router.post("/restore", async (req, res) => {
  const parsed = backupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { decks, flashcards } = parsed.data;

  // Order decks so parents are created before their children (FK constraint).
  const sortedDecks: typeof decks = [];
  const remaining = new Map(decks.map((d) => [d.id, d]));
  while (remaining.size > 0) {
    let progressed = false;
    for (const [id, deck] of remaining) {
      if (!deck.parentId || !remaining.has(deck.parentId)) {
        sortedDecks.push(deck);
        remaining.delete(id);
        progressed = true;
      }
    }
    if (!progressed) {
      // Cycle (shouldn't happen) - append the rest as-is.
      sortedDecks.push(...remaining.values());
      break;
    }
  }

  await prisma.$transaction([
    prisma.flashcard.deleteMany(),
    prisma.deck.deleteMany(),
    prisma.deck.createMany({
      data: sortedDecks.map((d) => ({
        id: d.id,
        name: d.name,
        parentId: d.parentId ?? null,
        createdAt: d.createdAt ?? new Date(),
      })),
    }),
    prisma.flashcard.createMany({
      data: flashcards.map((c) => ({
        ...c,
        examples: JSON.stringify(c.examples),
        createdAt: c.createdAt ?? new Date(),
        nextReviewDate: c.nextReviewDate ?? new Date(),
      })),
    }),
  ]);

  res.json({ decks: decks.length, flashcards: flashcards.length });
});

export default router;
