import { Router } from "express";
import { z } from "zod";
import { prisma } from "./db";

const router = Router();

const SETTINGS_ID = "default";

export async function getSettings() {
  return prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: { id: SETTINGS_ID },
  });
}

router.get("/", async (_req, res) => {
  res.json(await getSettings());
});

const settingsInput = z.object({
  newCardsPerDay: z.number().int().min(0).max(1000),
});

router.put("/", async (req, res) => {
  const parsed = settingsInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const settings = await prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    update: parsed.data,
    create: { id: SETTINGS_ID, ...parsed.data },
  });
  res.json(settings);
});

export default router;
