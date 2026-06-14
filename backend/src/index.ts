import express from "express";
import cors from "cors";
import flashcards from "./flashcards";
import dictionary from "./dictionary";
import tts from "./tts";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

app.use("/api/flashcards", flashcards);
app.use("/api/dictionary", dictionary);
app.use("/api/tts", tts);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
