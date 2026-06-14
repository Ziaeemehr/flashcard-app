import * as remote from "./remote";
import * as local from "./local";

const impl = import.meta.env.VITE_DATA_MODE === "local" ? local : remote;

export const flashcardsApi = impl.flashcardsApi;
export const decksApi = impl.decksApi;
export const settingsApi = impl.settingsApi;
export const lookupWord = impl.lookupWord;
export const exportFlashcards = impl.exportFlashcards;
export const downloadBackup = impl.downloadBackup;
export const restoreBackup = impl.restoreBackup;
export const importAnkiPackage = impl.importAnkiPackage;

export type { DictionaryEntry, ImportExportFormat } from "./remote";
