import { useState } from "react";
import { Button } from "@/components/ui/button";
import { lookupWord } from "@/api";
import type { NewFlashcard } from "@/types";

interface AddCardFormProps {
  onAdd: (card: NewFlashcard) => Promise<void>;
}

export function AddCardForm({ onAdd }: AddCardFormProps) {
  const [word, setWord] = useState("");
  const [type, setType] = useState("");
  const [definition, setDefinition] = useState("");
  const [examples, setExamples] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const handleLookup = async () => {
    if (!word.trim()) return;
    setLooking(true);
    setLookupError(null);
    try {
      const entry = await lookupWord(word.trim());
      if (!entry) {
        setLookupError("No definition found.");
        return;
      }
      setType(entry.type);
      setDefinition(entry.definition);
      setExamples(entry.examples);
    } finally {
      setLooking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim()) return;
    setSubmitting(true);
    try {
      await onAdd({
        word: word.trim(),
        definition: definition.trim(),
        phonetic: "",
        type: type.trim(),
        examples,
        audioUrl: "",
      });
      setWord("");
      setType("");
      setDefinition("");
      setExamples([]);
      setLookupError(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xl flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="French word"
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={handleLookup}
          disabled={looking || !word.trim()}
        >
          {looking ? "Looking up…" : "Lookup"}
        </Button>
        <Button type="submit" disabled={submitting || !word.trim()}>
          Add card
        </Button>
      </div>

      {lookupError && <p className="text-sm text-destructive">{lookupError}</p>}

      <input
        value={type}
        onChange={(e) => setType(e.target.value)}
        placeholder="Word type (e.g. verb, noun)"
        className="rounded-md border bg-background px-3 py-2 text-sm"
      />
      <textarea
        value={definition}
        onChange={(e) => setDefinition(e.target.value)}
        placeholder="Definition"
        rows={2}
        className="rounded-md border bg-background px-3 py-2 text-sm"
      />
      {examples.length > 0 && (
        <ul className="list-inside list-disc text-sm text-muted-foreground">
          {examples.map((ex, i) => (
            <li key={i}>{ex}</li>
          ))}
        </ul>
      )}
    </form>
  );
}
