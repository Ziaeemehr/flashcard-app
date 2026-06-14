import type { Deck, Flashcard, NewFlashcard, ReviewRating, ReviewStats, Settings } from "../types";
import { downloadBlob } from "../lib/downloadBlob";

const API_URL = "/api/flashcards";
const DECKS_URL = "/api/decks";
const SETTINGS_URL = "/api/settings";

export interface DictionaryEntry {
  word: string;
  type: string;
  phonetic: string;
  definition: string;
  examples: string[];
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
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

function deckQuery(deckId?: string | null): string {
  if (deckId === undefined) return "";
  return `?deckId=${encodeURIComponent(deckId === null ? "unassigned" : deckId)}`;
}

export const flashcardsApi = {
  list: (deckId?: string | null) => request<Flashcard[]>(`${API_URL}${deckQuery(deckId)}`),
  create: (card: NewFlashcard) =>
    request<Flashcard>(API_URL, { method: "POST", body: JSON.stringify(card) }),
  update: (id: string, card: Partial<NewFlashcard>) =>
    request<Flashcard>(`${API_URL}/${id}`, { method: "PUT", body: JSON.stringify(card) }),
  remove: (id: string) => request<void>(`${API_URL}/${id}`, { method: "DELETE" }),
  due: (deckId?: string | null) => request<Flashcard[]>(`${API_URL}/due${deckQuery(deckId)}`),
  stats: (deckId?: string | null) => request<ReviewStats>(`${API_URL}/stats${deckQuery(deckId)}`),
  review: (id: string, rating: ReviewRating) =>
    request<Flashcard>(`${API_URL}/${id}/review`, { method: "POST", body: JSON.stringify({ rating }) }),
  import: (format: ImportExportFormat, content: string, deckId?: string | null) =>
    request<{ imported: number }>(`${API_URL}/import`, {
      method: "POST",
      body: JSON.stringify({ format, content, deckId }),
    }),
  bulkImport: (words: string[], deckId: string | null) =>
    request<{ created: number; results: { word: string; found: boolean }[] }>(`${API_URL}/bulk-import`, {
      method: "POST",
      body: JSON.stringify({ words, deckId }),
    }),
};

export const settingsApi = {
  get: () => request<Settings>(SETTINGS_URL),
  update: (newCardsPerDay: number) =>
    request<Settings>(SETTINGS_URL, { method: "PUT", body: JSON.stringify({ newCardsPerDay }) }),
};

export const decksApi = {
  list: () => request<Deck[]>(DECKS_URL),
  create: (name: string, parentId?: string | null) =>
    request<Deck>(DECKS_URL, { method: "POST", body: JSON.stringify({ name, parentId }) }),
  rename: (id: string, name: string) =>
    request<Deck>(`${DECKS_URL}/${id}`, { method: "PUT", body: JSON.stringify({ name }) }),
  remove: (id: string) => request<void>(`${DECKS_URL}/${id}`, { method: "DELETE" }),
};

export async function exportFlashcards(format: ImportExportFormat, deckId?: string | null): Promise<void> {
  const params = new URLSearchParams({ format });
  if (deckId !== undefined) params.set("deckId", deckId === null ? "unassigned" : deckId);
  const res = await fetch(`${API_URL}/export?${params}`);
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  const blob = await res.blob();
  downloadBlob(blob, `flashcards.${EXPORT_EXTENSIONS[format]}`);
}

export async function lookupWord(word: string): Promise<DictionaryEntry | null> {
  const res = await fetch(`/api/dictionary/${encodeURIComponent(word)}`);
  if (!res.ok) return null;
  return res.json() as Promise<DictionaryEntry>;
}

export async function downloadBackup(): Promise<void> {
  const res = await fetch("/api/backup");
  if (!res.ok) throw new Error(`Backup failed: ${res.status}`);
  const blob = await res.blob();
  const date = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `flashcards-backup-${date}.json`);
}

export async function restoreBackup(content: string): Promise<{ decks: number; flashcards: number }> {
  const res = await fetch("/api/backup/restore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: content,
  });
  if (!res.ok) throw new Error(`Restore failed: ${res.status}`);
  return res.json() as Promise<{ decks: number; flashcards: number }>;
}

export async function importAnkiPackage(file: File): Promise<{ decks: { deck: string; imported: number }[]; totalImported: number }> {
  const res = await fetch("/api/import-anki", {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: file,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Import failed: ${res.status}`);
  }
  return res.json() as Promise<{ decks: { deck: string; imported: number }[]; totalImported: number }>;
}
