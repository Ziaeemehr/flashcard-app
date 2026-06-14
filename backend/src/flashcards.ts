import { Router } from "express";
import { z } from "zod";
import { prisma } from "./db";
import { applyReview, type ReviewRating } from "./sm2";
import { toCsv, toAnkiTsv, parseImport } from "./importExport";

const router = Router();

const flashcardInput = z.object({
  word: z.string().min(1),
  phonetic: z.string().optional().default(""),
  type: z.string().optional().default(""),
  definition: z.string().optional().default(""),
  examples: z.array(z.string()).optional().default([]),
  audioUrl: z.string().optional().default(""),
});

function toApi(card: { examples: string; [key: string]: unknown }) {
  return { ...card, examples: JSON.parse(card.examples) as string[] };
}

router.get("/", async (_req, res) => {
  const cards = await prisma.flashcard.findMany({ orderBy: { createdAt: "desc" } });
  res.json(cards.map(toApi));
});

router.get("/due", async (_req, res) => {
  const now = new Date();
  const cards = await prisma.flashcard.findMany({
    where: { nextReviewDate: { lte: now } },
    orderBy: { nextReviewDate: "asc" },
  });
  res.json(cards.map(toApi));
});

router.get("/stats", async (_req, res) => {
  const now = new Date();
  const [dueToday, newWords, learned, totals] = await Promise.all([
    prisma.flashcard.count({ where: { nextReviewDate: { lte: now } } }),
    prisma.flashcard.count({ where: { reviewCount: 0 } }),
    prisma.flashcard.count({ where: { reviewCount: { gt: 0 } } }),
    prisma.flashcard.aggregate({
      _sum: { reviewCount: true, lapses: true },
    }),
  ]);

  const totalReviews = totals._sum.reviewCount ?? 0;
  const totalLapses = totals._sum.lapses ?? 0;
  const retentionRate =
    totalReviews > 0 ? ((totalReviews - totalLapses) / totalReviews) * 100 : null;

  res.json({ dueToday, newWords, learned, retentionRate });
});

router.get("/export", async (req, res) => {
  const format = String(req.query.format ?? "json");
  const cards = await prisma.flashcard.findMany({ orderBy: { createdAt: "desc" } });
  const exportable = cards.map((c) => ({
    word: c.word,
    phonetic: c.phonetic,
    type: c.type,
    definition: c.definition,
    examples: JSON.parse(c.examples) as string[],
    audioUrl: c.audioUrl,
  }));

  switch (format) {
    case "csv":
      res.type("text/csv").attachment("flashcards.csv").send(toCsv(exportable));
      return;
    case "anki":
      res.type("text/tab-separated-values").attachment("flashcards.txt").send(toAnkiTsv(exportable));
      return;
    case "json":
      res.type("application/json").attachment("flashcards.json").send(JSON.stringify(exportable, null, 2));
      return;
    default:
      res.status(400).json({ error: `Unsupported export format: ${format}` });
  }
});

const importInput = z.object({
  format: z.enum(["json", "csv", "anki"]),
  content: z.string().min(1),
});

router.post("/import", async (req, res) => {
  const parsed = importInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  let cards;
  try {
    cards = parseImport(parsed.data.format, parsed.data.content);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Invalid file" });
  }

  if (cards.length === 0) {
    return res.status(400).json({ error: "No valid cards found in file" });
  }

  await prisma.flashcard.createMany({
    data: cards.map((c) => ({ ...c, examples: JSON.stringify(c.examples) })),
  });

  res.status(201).json({ imported: cards.length });
});

router.get("/:id", async (req, res) => {
  const card = await prisma.flashcard.findUnique({ where: { id: req.params.id } });
  if (!card) return res.status(404).json({ error: "Not found" });
  res.json(toApi(card));
});

router.post("/", async (req, res) => {
  const parsed = flashcardInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { examples, ...rest } = parsed.data;
  const card = await prisma.flashcard.create({
    data: { ...rest, examples: JSON.stringify(examples) },
  });
  res.status(201).json(toApi(card));
});

router.put("/:id", async (req, res) => {
  const parsed = flashcardInput.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { examples, ...rest } = parsed.data;
  try {
    const card = await prisma.flashcard.update({
      where: { id: req.params.id },
      data: { ...rest, ...(examples ? { examples: JSON.stringify(examples) } : {}) },
    });
    res.json(toApi(card));
  } catch {
    res.status(404).json({ error: "Not found" });
  }
});

const reviewInput = z.object({
  rating: z.enum(["again", "hard", "good", "easy"]),
});

router.post("/:id/review", async (req, res) => {
  const parsed = reviewInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.flashcard.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Not found" });

  const result = applyReview(
    {
      easeFactor: existing.easeFactor,
      interval: existing.interval,
      reviewCount: existing.reviewCount,
      lapses: existing.lapses,
    },
    parsed.data.rating as ReviewRating,
  );

  const card = await prisma.flashcard.update({
    where: { id: req.params.id },
    data: result,
  });
  res.json(toApi(card));
});

router.delete("/:id", async (req, res) => {
  try {
    await prisma.flashcard.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "Not found" });
  }
});

export default router;
