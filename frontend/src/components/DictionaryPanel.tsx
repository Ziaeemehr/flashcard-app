import { useState } from "react";
import { X, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AudioControls } from "@/components/AudioControls";
import type { DictionaryEntry } from "@/api";

interface DictionaryPanelProps {
  word: string;
  entry: DictionaryEntry | null;
  loading: boolean;
  onClose: () => void;
  onAddToFlashcards: () => Promise<void>;
  added: boolean;
}

export function DictionaryPanel({
  word,
  entry,
  loading,
  onClose,
  onAddToFlashcards,
  added,
}: DictionaryPanelProps) {
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    setAdding(true);
    try {
      await onAddToFlashcards();
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="w-full max-w-xl rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">{word}</h2>
          {entry?.type && (
            <span className="text-sm text-muted-foreground italic">{entry.type}</span>
          )}
          <AudioControls text={word} />
        </div>
        <div className="flex items-center gap-1">
          {!loading && entry && (
            <Button variant="outline" size="sm" onClick={handleAdd} disabled={adding || added}>
              {added ? (
                <>
                  <Check className="size-4" /> Added
                </>
              ) : (
                <>
                  <Plus className="size-4" /> Add to Flashcards
                </>
              )}
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Looking up…</p>}

      {!loading && !entry && (
        <p className="text-sm text-muted-foreground">No definition found.</p>
      )}

      {!loading && entry && (
        <div className="mt-2 flex flex-col gap-2 text-left">
          {entry.definition && <p>{entry.definition}</p>}
          {entry.examples.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Examples</h3>
              <ul className="list-inside list-disc">
                {entry.examples.map((ex, i) => (
                  <li key={i}>{ex}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
