import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { BulkAddForm } from "@/components/BulkAddForm";
import {
  flashcardsApi,
  exportFlashcards,
  downloadBackup,
  restoreBackup,
  importAnkiPackage,
  type ImportExportFormat,
} from "@/api";
import type { Deck } from "@/types";

interface ImportExportProps {
  decks: Deck[];
  currentDeckId: string | null;
  onImported: () => void;
}

const FORMAT_LABELS: Record<ImportExportFormat, string> = {
  json: "JSON",
  csv: "CSV",
  anki: "Anki (TSV)",
};

function extensionToFormat(filename: string): ImportExportFormat | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "json") return "json";
  if (ext === "csv") return "csv";
  if (ext === "txt" || ext === "tsv") return "anki";
  return null;
}

export function ImportExport({ decks, currentDeckId, onImported }: ImportExportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ankiFileInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (format: ImportExportFormat) => {
    try {
      await exportFlashcards(format, currentDeckId);
    } catch {
      setError("Export failed.");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const format = extensionToFormat(file.name);
    if (!format) {
      setError("Unsupported file type. Use .json, .csv, or .txt (Anki TSV).");
      e.target.value = "";
      return;
    }

    setImporting(true);
    setError(null);
    setMessage(null);
    try {
      const content = await file.text();
      const result = await flashcardsApi.import(format, content, currentDeckId);
      setMessage(`Imported ${result.imported} card(s).`);
      onImported();
    } catch {
      setError("Import failed. Check the file format and try again.");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const handleAnkiFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError(null);
    setMessage(null);
    try {
      const result = await importAnkiPackage(file);
      setMessage(`Imported ${result.totalImported} card(s) across ${result.decks.length} deck(s).`);
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Anki import failed.");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const handleBackup = async () => {
    try {
      await downloadBackup();
    } catch {
      setError("Backup failed.");
    }
  };

  const handleRestoreFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("Restoring will replace all existing decks and flashcards. Continue?")) {
      e.target.value = "";
      return;
    }

    setImporting(true);
    setError(null);
    setMessage(null);
    try {
      const content = await file.text();
      const result = await restoreBackup(content);
      setMessage(`Restored ${result.decks} deck(s) and ${result.flashcards} card(s).`);
      onImported();
    } catch {
      setError("Restore failed. Check the backup file and try again.");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex w-full max-w-xl flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-medium text-muted-foreground">Import &amp; Export</h2>
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(FORMAT_LABELS) as ImportExportFormat[]).map((format) => (
          <Button key={format} variant="outline" size="sm" onClick={() => handleExport(format)}>
            Export {FORMAT_LABELS[format]}
          </Button>
        ))}
        <Button
          variant="secondary"
          size="sm"
          disabled={importing}
          onClick={() => fileInputRef.current?.click()}
        >
          {importing ? "Importing…" : "Import file…"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.csv,.txt,.tsv"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          variant="secondary"
          size="sm"
          disabled={importing}
          onClick={() => ankiFileInputRef.current?.click()}
        >
          Import Anki (.apkg)…
        </Button>
        <input
          ref={ankiFileInputRef}
          type="file"
          accept=".apkg"
          className="hidden"
          onChange={handleAnkiFileChange}
        />
        <BulkAddForm decks={decks} defaultDeckId={currentDeckId} onImported={onImported} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleBackup}>
          Download backup
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={importing}
          onClick={() => restoreInputRef.current?.click()}
        >
          Restore from backup…
        </Button>
        <input
          ref={restoreInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleRestoreFileChange}
        />
      </div>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
