import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UNASSIGNED_DECK } from "@/components/DeckPanel";
import { buildDeckOptions } from "@/deckOptions";
import { flashcardsApi } from "@/api";
import type { Deck } from "@/types";

interface BulkAddFormProps {
  decks: Deck[];
  defaultDeckId: string | null;
  onImported: () => void;
}

export function BulkAddForm({ decks, defaultDeckId, onImported }: BulkAddFormProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [deckId, setDeckId] = useState<string>(defaultDeckId ?? UNASSIGNED_DECK);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ created: number; notFound: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deckOptions = buildDeckOptions(decks);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setText(content);
    e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const words = text.split("\n").map((line) => line.trim()).filter(Boolean);
    if (words.length === 0) return;

    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await flashcardsApi.bulkImport(
        words,
        deckId === UNASSIGNED_DECK ? null : deckId,
      );
      setResult({
        created: res.created,
        notFound: res.results.filter((r) => !r.found).map((r) => r.word),
      });
      setText("");
      onImported();
    } catch {
      setError("Bulk add failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Add multiple words…
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2 rounded-lg border bg-background/50 p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Add multiple words</h3>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Close
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        One word or phrase per line. Definitions, type, phonetics, and examples are looked up automatically.
      </p>
      <div className="flex items-center gap-2">
        <label className="cursor-pointer text-xs text-muted-foreground underline">
          Upload .txt file
          <input type="file" accept=".txt,text/plain" onChange={handleFileChange} className="hidden" />
        </label>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"bord\ndedans\npain grillé"}
        rows={6}
        className="rounded-md border bg-background px-3 py-2 font-mono text-sm"
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={deckId} onValueChange={(v) => setDeckId(v ?? UNASSIGNED_DECK)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Unassigned">
              {(value: string) =>
                value === UNASSIGNED_DECK
                  ? "Unassigned"
                  : deckOptions.find((d) => d.id === value)?.label ?? "Unassigned"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED_DECK}>Unassigned</SelectItem>
            {deckOptions.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" disabled={submitting || !text.trim()}>
          {submitting ? "Looking up definitions…" : "Add cards"}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {result && (
        <p className="text-sm text-muted-foreground">
          Added {result.created} card(s).
          {result.notFound.length > 0 &&
            ` No definition found for: ${result.notFound.join(", ")}.`}
        </p>
      )}
    </form>
  );
}
