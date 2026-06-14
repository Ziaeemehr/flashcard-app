import { stringify } from "csv-stringify/browser/esm/sync";
import { parse } from "csv-parse/browser/esm/sync";

export type ExportFormat = "json" | "csv" | "anki";

export interface ExportableCard {
  word: string;
  phonetic: string;
  type: string;
  definition: string;
  examples: string[];
  audioUrl: string;
}

export interface ImportedCard {
  word: string;
  phonetic: string;
  type: string;
  definition: string;
  examples: string[];
  audioUrl: string;
}

const CSV_COLUMNS = ["word", "phonetic", "type", "definition", "examples", "audioUrl"];

export function toCsv(cards: ExportableCard[]): string {
  const rows = cards.map((c) => ({
    word: c.word,
    phonetic: c.phonetic,
    type: c.type,
    definition: c.definition,
    examples: JSON.stringify(c.examples),
    audioUrl: c.audioUrl,
  }));
  return stringify(rows, { header: true, columns: CSV_COLUMNS });
}

export function toAnkiTsv(cards: ExportableCard[]): string {
  const rows = cards.map((c) => {
    const front = c.phonetic ? `${c.word} ${c.phonetic}` : c.word;
    const backParts = [c.type, c.definition, ...c.examples].filter(Boolean);
    const back = backParts.join("<br>");
    return [front, back].join("\t");
  });
  return rows.join("\n");
}

export function fromJson(content: string): ImportedCard[] {
  const data = JSON.parse(content);
  if (!Array.isArray(data)) throw new Error("JSON import must be an array of cards");

  return data.map((item) => {
    if (typeof item !== "object" || item === null || typeof item.word !== "string") {
      throw new Error("Each card must be an object with a 'word' field");
    }
    return {
      word: item.word,
      phonetic: typeof item.phonetic === "string" ? item.phonetic : "",
      type: typeof item.type === "string" ? item.type : "",
      definition: typeof item.definition === "string" ? item.definition : "",
      examples: Array.isArray(item.examples) ? item.examples.filter((e: unknown) => typeof e === "string") : [],
      audioUrl: typeof item.audioUrl === "string" ? item.audioUrl : "",
    };
  });
}

export function fromCsv(content: string): ImportedCard[] {
  const rows = parse(content, { columns: true, skip_empty_lines: true, trim: true }) as Record<
    string,
    string
  >[];

  return rows
    .filter((row) => row.word && row.word.trim())
    .map((row) => {
      let examples: string[] = [];
      if (row.examples) {
        try {
          const parsed = JSON.parse(row.examples);
          if (Array.isArray(parsed)) examples = parsed.filter((e) => typeof e === "string");
        } catch {
          examples = row.examples
            .split("|")
            .map((e) => e.trim())
            .filter(Boolean);
        }
      }
      return {
        word: row.word.trim(),
        phonetic: row.phonetic ?? "",
        type: row.type ?? "",
        definition: row.definition ?? "",
        examples,
        audioUrl: row.audioUrl ?? "",
      };
    });
}

export function fromAnkiTsv(content: string): ImportedCard[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [front = "", back = ""] = line.split("\t");
      const word = front.split(" ")[0]?.trim() ?? front.trim();
      const phonetic = front.slice(word.length).trim();
      const definition = back.replace(/<br\s*\/?>/gi, " ").trim();
      return {
        word,
        phonetic,
        type: "",
        definition,
        examples: [],
        audioUrl: "",
      };
    })
    .filter((card) => card.word);
}

export function parseImport(format: string, content: string): ImportedCard[] {
  switch (format) {
    case "json":
      return fromJson(content);
    case "csv":
      return fromCsv(content);
    case "anki":
      return fromAnkiTsv(content);
    default:
      throw new Error(`Unsupported import format: ${format}`);
  }
}
