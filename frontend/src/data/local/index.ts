export { decksApi } from "./decks";
export { settingsApi } from "./settings";
export { lookupWord } from "./dictionary";
export type { DictionaryEntry } from "./dictionary";
export { flashcardsApi, exportFlashcards } from "./flashcards";
export { downloadBackup, restoreBackup } from "./backup";

export async function importAnkiPackage(): Promise<{ decks: { deck: string; imported: number }[]; totalImported: number }> {
  throw new Error("Anki package import is not available in standalone mode");
}
