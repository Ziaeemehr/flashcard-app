import { Router } from "express";
import express from "express";
import os from "os";
import path from "path";
import fs from "fs";
import zlib from "zlib";
import AdmZip from "adm-zip";
import Database from "better-sqlite3";
import { prisma } from "./db";

const router = Router();

function readDeckNames(db: Database.Database): Map<string, string> {
  const map = new Map<string, string>();

  const col = db.prepare("SELECT decks FROM col LIMIT 1").get() as { decks: string } | undefined;
  if (col?.decks) {
    try {
      const parsed = JSON.parse(col.decks) as Record<string, { name: string }>;
      for (const [id, info] of Object.entries(parsed)) {
        map.set(id, info.name);
      }
    } catch {
      // fall through to the decks table (newer Anki schema)
    }
  }

  if (map.size === 0) {
    const rows = db.prepare("SELECT id, name FROM decks").all() as { id: number; name: string }[];
    for (const row of rows) {
      map.set(String(row.id), row.name.split(String.fromCharCode(0x1f)).join("::"));
    }
  }

  return map;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// Strips HTML while turning block-level boundaries (<br>, <div>, <p>, <li>) into
// line breaks, so card fields with rich layouts don't get squished into one run-on string.
function htmlToLines(html: string): string[] {
  const withBreaks = html
    .replace(/\[sound:[^\]]*\]/gi, "")
    .replace(/<\s*(br|\/div|\/p|\/li|\/tr)\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(withBreaks)
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line) => line.length > 0);
}

interface ParsedNote {
  word: string;
  type: string;
  definition: string;
  examples: string[];
}

const BULLET_RE = /^[•\-*]\s*/;
const TYPE_LINE_RE = /^(?:type|nature|word\s*type)\s*:\s*(.+)$/i;
const EXAMPLES_HEADER_RE = /^(?:exemples?|examples?|usage)\s*:?\s*$/i;

// Parses common "Type : ... / Exemples : ... / definition" deck layouts into
// separate word/type/definition/examples, falling back to plain text for other formats.
function parseNote(frontHtml: string, backHtml: string): ParsedNote {
  const frontLines = htmlToLines(frontHtml);
  const backLines = htmlToLines(backHtml);

  let word = frontLines[0] ?? "";
  let type = "";

  const parenMatch = word.match(/^(.*)\(([^()]+)\)\s*$/);
  if (parenMatch && parenMatch[1].trim()) {
    word = parenMatch[1].trim();
    type = parenMatch[2].trim();
  }

  const examples: string[] = [];
  const definitionLines: string[] = [];
  let inExamples = false;

  for (const line of backLines) {
    const typeMatch = line.match(TYPE_LINE_RE);
    if (typeMatch) {
      if (!type) type = typeMatch[1].trim();
      inExamples = false;
      continue;
    }
    if (EXAMPLES_HEADER_RE.test(line)) {
      inExamples = true;
      continue;
    }
    if (inExamples && BULLET_RE.test(line)) {
      examples.push(line.replace(BULLET_RE, "").trim());
      continue;
    }
    inExamples = false;
    definitionLines.push(line.replace(BULLET_RE, "").trim());
  }

  return { word, type, definition: definitionLines.join(" ").trim(), examples };
}

async function findOrCreateDeckPath(deckName: string): Promise<{ id: string; name: string }> {
  const parts = deckName.split("::").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) parts.push("Imported");

  let parentId: string | null = null;
  let deck: { id: string; name: string } | null = null;

  for (const part of parts) {
    deck = await prisma.deck.findFirst({ where: { name: part, parentId } });
    deck ??= await prisma.deck.create({ data: { name: part, parentId } });
    parentId = deck.id;
  }

  return deck!;
}

function extractCollectionDb(zip: AdmZip): Buffer {
  const anki21b = zip.getEntry("collection.anki21b");
  if (anki21b) {
    const zstdDecompressSync = (zlib as unknown as { zstdDecompressSync?: (b: Buffer) => Buffer })
      .zstdDecompressSync;
    if (!zstdDecompressSync) {
      throw new Error(
        "This .apkg uses Anki's newer zstd-compressed format, which this server's Node version can't decompress. Re-export from Anki with 'Support older Anki versions' enabled.",
      );
    }
    return zstdDecompressSync(anki21b.getData());
  }

  const anki21 = zip.getEntry("collection.anki21");
  if (anki21) return anki21.getData();

  const anki2 = zip.getEntry("collection.anki2");
  if (anki2) return anki2.getData();

  throw new Error("No Anki collection database found in this file");
}

router.post("/", express.raw({ type: "*/*", limit: "100mb" }), async (req, res) => {
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  let zip: AdmZip;
  try {
    zip = new AdmZip(req.body);
  } catch {
    return res.status(400).json({ error: "Not a valid .apkg file" });
  }

  let dbBuffer: Buffer;
  try {
    dbBuffer = extractCollectionDb(zip);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Invalid .apkg file" });
  }

  const tmpPath = path.join(os.tmpdir(), `anki-import-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
  fs.writeFileSync(tmpPath, dbBuffer);

  try {
    const db = new Database(tmpPath, { readonly: true });
    try {
      const decks = readDeckNames(db);

      const rows = db
        .prepare(
          `SELECT n.id as id, n.flds as flds, c.did as did
           FROM notes n
           JOIN cards c ON c.nid = n.id
           GROUP BY n.id`,
        )
        .all() as { id: number; flds: string; did: number }[];

      const byDeck = new Map<string, ParsedNote[]>();

      for (const row of rows) {
        const fields = row.flds.split(String.fromCharCode(0x1f));
        const note = parseNote(fields[0] ?? "", fields[1] ?? "");
        if (!note.word) continue;

        const deckName = decks.get(String(row.did)) ?? "Imported";
        const list = byDeck.get(deckName) ?? [];
        list.push(note);
        byDeck.set(deckName, list);
      }

      if (byDeck.size === 0) {
        return res.status(400).json({ error: "No cards found in this .apkg file" });
      }

      const summary: { deck: string; imported: number }[] = [];

      for (const [deckName, cards] of byDeck) {
        const deck = await findOrCreateDeckPath(deckName);

        await prisma.flashcard.createMany({
          data: cards.map((c) => ({
            word: c.word,
            definition: c.definition,
            phonetic: "",
            type: c.type,
            examples: JSON.stringify(c.examples),
            audioUrl: "",
            deckId: deck.id,
          })),
        });

        summary.push({ deck: deckName, imported: cards.length });
      }

      res.status(201).json({ decks: summary, totalImported: summary.reduce((n, d) => n + d.imported, 0) });
    } finally {
      db.close();
    }
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Failed to read Anki collection" });
  } finally {
    fs.unlinkSync(tmpPath);
  }
});

export default router;
