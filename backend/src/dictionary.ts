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

async function fetchPhonetic(word: string): Promise<string> {
  try {
    const res = await fetch(`https://en.wiktionary.org/api/rest_v1/page/html/${encodeURIComponent(word)}`);
    if (!res.ok) return "";
    const html = await res.text();
    const match = html.match(/<span class="IPA[^"]*">([^<]+)<\/span>/);
    return match ? match[1] : "";
  } catch {
    return "";
  }
}

export interface DictionaryEntry {
  word: string;
  type: string;
  phonetic: string;
  definition: string;
  examples: string[];
}

export async function lookupDictionary(word: string): Promise<DictionaryEntry | null> {
  const cached = await prisma.dictionaryEntry.findUnique({ where: { word } });
  if (cached) {
    return {
      word: cached.word,
      type: cached.type,
      phonetic: cached.phonetic,
      definition: cached.definition,
      examples: JSON.parse(cached.examples) as string[],
    };
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`,
    );
  } catch {
    return null;
  }

  if (!upstream.ok) return null;

  const data = (await upstream.json()) as WiktionaryResponse;
  const frenchSenses = data.fr;

  if (!frenchSenses || frenchSenses.length === 0) return null;

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

  const entry: DictionaryEntry = {
    word,
    type: frenchSenses[0].partOfSpeech.toLowerCase(),
    phonetic: await fetchPhonetic(word),
    definition: definitions.slice(0, 3).join(" "),
    examples: examples.slice(0, 3),
  };

  await prisma.dictionaryEntry.create({
    data: { ...entry, examples: JSON.stringify(entry.examples) },
  });

  return entry;
}

router.get("/:word", async (req, res) => {
  const entry = await lookupDictionary(req.params.word);
  if (!entry) return res.status(404).json({ error: "No definitions found" });
  res.json(entry);
});

export default router;
