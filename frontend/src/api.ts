import type { Flashcard, NewFlashcard, ReviewRating, ReviewStats } from "./types";

const API_URL = "/api/flashcards";

export interface DictionaryEntry {
  word: string;
  type: string;
  definition: string;
  examples: string[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type ImportExportFormat = "json" | "csv" | "anki";

const EXPORT_EXTENSIONS: Record<ImportExportFormat, string> = {
  json: "json",
  csv: "csv",
  anki: "txt",
};

export const flashcardsApi = {
  list: () => request<Flashcard[]>(""),
  create: (card: NewFlashcard) =>
    request<Flashcard>("", { method: "POST", body: JSON.stringify(card) }),
  remove: (id: string) => request<void>(`/${id}`, { method: "DELETE" }),
  due: () => request<Flashcard[]>("/due"),
  stats: () => request<ReviewStats>("/stats"),
  review: (id: string, rating: ReviewRating) =>
    request<Flashcard>(`/${id}/review`, { method: "POST", body: JSON.stringify({ rating }) }),
  import: (format: ImportExportFormat, content: string) =>
    request<{ imported: number }>("/import", {
      method: "POST",
      body: JSON.stringify({ format, content }),
    }),
};

export async function exportFlashcards(format: ImportExportFormat): Promise<void> {
  const res = await fetch(`${API_URL}/export?format=${format}`);
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `flashcards.${EXPORT_EXTENSIONS[format]}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function lookupWord(word: string): Promise<DictionaryEntry | null> {
  const res = await fetch(`/api/dictionary/${encodeURIComponent(word)}`);
  if (!res.ok) return null;
  return res.json() as Promise<DictionaryEntry>;
}
