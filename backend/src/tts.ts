import { Router } from "express";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const router = Router();

const CACHE_DIR = path.join(__dirname, "..", "cache", "audio");
fs.mkdirSync(CACHE_DIR, { recursive: true });

const VOICE = "fr-FR-DeniseNeural";
const GOOGLE_TTS_MAX_LENGTH = 200;

function cacheKey(text: string, slow: boolean): string {
  return crypto
    .createHash("sha256")
    .update(`${VOICE}|${slow ? "slow" : "normal"}|${text}`)
    .digest("hex");
}

async function synthesizeWithEdge(text: string, slow: boolean): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text, { rate: slow ? "slow" : "default" });
  const chunks: Buffer[] = [];
  for await (const chunk of audioStream) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

async function synthesizeWithGoogle(text: string): Promise<Buffer> {
  if (text.length > GOOGLE_TTS_MAX_LENGTH) {
    throw new Error("Text too long for Google Translate TTS fallback");
  }
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=fr&client=tw-ob`;
  const upstream = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; flashcard-app)" },
  });
  if (!upstream.ok) throw new Error(`Google TTS error ${upstream.status}`);
  return Buffer.from(await upstream.arrayBuffer());
}

router.get("/", async (req, res) => {
  const text = String(req.query.text ?? "").trim();
  const slow = req.query.rate === "slow";
  if (!text) return res.status(400).json({ error: "text query parameter is required" });

  const filePath = path.join(CACHE_DIR, `${cacheKey(text, slow)}.mp3`);

  if (fs.existsSync(filePath)) {
    res.type("audio/mpeg");
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  let buffer: Buffer;
  try {
    buffer = await synthesizeWithEdge(text, slow);
  } catch {
    try {
      buffer = await synthesizeWithGoogle(text);
    } catch {
      res.status(502).json({ error: "Text-to-speech is currently unavailable" });
      return;
    }
  }

  fs.writeFileSync(filePath, buffer);
  res.type("audio/mpeg");
  res.send(buffer);
});

export default router;
