import { Router } from "express";
import { z } from "zod";
import { prisma } from "./db";

const router = Router();

router.get("/", async (_req, res) => {
  const decks = await prisma.deck.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { cards: true } } },
  });
  res.json(
    decks.map((d) => ({
      id: d.id,
      name: d.name,
      parentId: d.parentId,
      createdAt: d.createdAt,
      cardCount: d._count.cards,
    })),
  );
});

const deckInput = z.object({ name: z.string().min(1), parentId: z.string().nullable().optional() });

router.post("/", async (req, res) => {
  const parsed = deckInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const parentId = parsed.data.parentId ?? null;
  const existing = await prisma.deck.findFirst({ where: { name: parsed.data.name, parentId } });
  if (existing) return res.status(409).json({ error: "A deck with that name already exists at this level" });

  try {
    const deck = await prisma.deck.create({
      data: { name: parsed.data.name, parentId },
    });
    res.status(201).json({ ...deck, cardCount: 0 });
  } catch {
    res.status(409).json({ error: "A deck with that name already exists at this level" });
  }
});

const renameInput = z.object({ name: z.string().min(1) });

router.put("/:id", async (req, res) => {
  const parsed = renameInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const current = await prisma.deck.findUnique({ where: { id: req.params.id } });
  if (!current) return res.status(404).json({ error: "Not found" });

  const existing = await prisma.deck.findFirst({
    where: { name: parsed.data.name, parentId: current.parentId, id: { not: req.params.id } },
  });
  if (existing) return res.status(409).json({ error: "A deck with that name already exists at this level" });

  try {
    const deck = await prisma.deck.update({
      where: { id: req.params.id },
      data: { name: parsed.data.name },
    });
    res.json(deck);
  } catch {
    res.status(404).json({ error: "Not found" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await prisma.deck.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "Not found" });
  }
});

export default router;
