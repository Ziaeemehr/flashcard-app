import { getDb } from "./db";

export interface DictionaryEntry {
  word: string;
  type: string;
  phonetic: string;
  definition: string;
  examples: string[];
}

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

interface TatoebaTranslation {
  lang: string;
  text: string;
}

interface TatoebaResult {
  text: string;
  translations?: TatoebaTranslation[][];
}

export async function fetchExampleSentences(word: string, limit = 2): Promise<string[]> {
  try {
    const res = await fetch(
      `https://tatoeba.org/en/api_v0/search?from=fra&to=eng&query=${encodeURIComponent(word)}&trans_to=eng`,
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: TatoebaResult[] };

    const sentences: string[] = [];
    for (const result of data.results ?? []) {
      const translation = result.translations?.flat().find((t) => t.lang === "eng")?.text;
      sentences.push(translation ? `${result.text} (${translation})` : result.text);
      if (sentences.length >= limit) break;
    }
    return sentences;
  } catch {
    return [];
  }
}

export async function lookupWord(word: string): Promise<DictionaryEntry | null> {
  const db = await getDb();
  const cached = await db.get("dictionaryCache", word);
  if (cached) {
    let examples = cached.examples;
    if (examples.length === 0) {
      examples = await fetchExampleSentences(word);
      if (examples.length > 0) {
        await db.put("dictionaryCache", { ...cached, examples });
      }
    }
    return { word: cached.word, type: cached.type, phonetic: cached.phonetic, definition: cached.definition, examples };
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

  const trimmedExamples = examples.slice(0, 2);

  const entry: DictionaryEntry = {
    word,
    type: frenchSenses[0].partOfSpeech.toLowerCase(),
    phonetic: await fetchPhonetic(word),
    definition: definitions.slice(0, 3).join(" "),
    examples: trimmedExamples.length > 0 ? trimmedExamples : await fetchExampleSentences(word),
  };

  await db.put("dictionaryCache", { ...entry, fetchedAt: new Date().toISOString() });

  return entry;
}
