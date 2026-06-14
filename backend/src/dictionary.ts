import { Router } from "express";
import { prisma } from "./db";

const router = Router();

interface WiktionaryDefinition {
  definition: string;
  examples?: string[];
}

interface WiktionarySense {
  partOfSpeech: string;
  language: string;
  definitions: WiktionaryDefinition[];
}

type WiktionaryResponse = Record<string, WiktionarySense[]>;

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

router.get("/:word", async (req, res) => {
  const word = req.params.word;

  const cached = await prisma.dictionaryEntry.findUnique({ where: { word } });
  if (cached) {
    return res.json({
      word: cached.word,
      type: cached.type,
      definition: cached.definition,
      examples: JSON.parse(cached.examples) as string[],
    });
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`,
    );
  } catch {
    return res.status(503).json({ error: "Dictionary service unreachable and no cached entry" });
  }

  if (!upstream.ok) {
    return res.status(404).json({ error: "No definitions found" });
  }

  const data = (await upstream.json()) as WiktionaryResponse;
  const frenchSenses = data.fr;

  if (!frenchSenses || frenchSenses.length === 0) {
    return res.status(404).json({ error: "No French definitions found" });
  }

  const examples: string[] = [];
  const definitions: string[] = [];

  for (const sense of frenchSenses) {
    for (const def of sense.definitions) {
      definitions.push(stripHtml(def.definition));
      for (const example of def.examples ?? []) {
        examples.push(stripHtml(example));
      }
    }
  }

  const entry = {
    word,
    type: frenchSenses[0].partOfSpeech.toLowerCase(),
    definition: definitions.slice(0, 3).join(" "),
    examples: examples.slice(0, 3),
  };

  await prisma.dictionaryEntry.create({
    data: { ...entry, examples: JSON.stringify(entry.examples) },
  });

  res.json(entry);
});

export default router;
