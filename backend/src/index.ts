import path from "node:path";
import express from "express";
import cors from "cors";
import flashcards from "./flashcards";
import dictionary from "./dictionary";
import tts from "./tts";
import decks from "./decks";
import backup from "./backup";
import ankiImport from "./ankiImport";
import settings from "./settings";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.use("/api/flashcards", flashcards);
app.use("/api/dictionary", dictionary);
app.use("/api/tts", tts);
app.use("/api/decks", decks);
app.use("/api/backup", backup);
app.use("/api/import-anki", ankiImport);
app.use("/api/settings", settings);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Standalone offline PWA build (frontend/dist-standalone), served for one-time
// LAN install on a phone. Build it with `npm run build:standalone` in frontend/.
const STANDALONE_DIR = path.join(__dirname, "../../frontend/dist-standalone");
app.use("/standalone", express.static(STANDALONE_DIR));
app.get(["/standalone", "/standalone/*splat"], (_req, res) => {
  res.sendFile(path.join(STANDALONE_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
