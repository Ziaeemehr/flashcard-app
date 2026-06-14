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
import type { Deck, Flashcard } from "@/types";

interface EditCardFormProps {
  card: Flashcard;
  decks: Deck[];
  onSaved: (card: Flashcard) => void;
  onCancel: () => void;
}

export function EditCardForm({ card, decks, onSaved, onCancel }: EditCardFormProps) {
  const [word, setWord] = useState(card.word);
  const [type, setType] = useState(card.type);
  const [phonetic, setPhonetic] = useState(card.phonetic);
  const [definition, setDefinition] = useState(card.definition);
  const [examples, setExamples] = useState(card.examples.join("\n"));
  const [deckId, setDeckId] = useState<string>(card.deckId ?? UNASSIGNED_DECK);
  const [saving, setSaving] = useState(false);

  const deckOptions = buildDeckOptions(decks);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim()) return;
    setSaving(true);
    try {
      const updated = await flashcardsApi.update(card.id, {
        word: word.trim(),
        type: type.trim(),
        phonetic: phonetic.trim(),
        definition: definition.trim(),
        examples: examples.split("\n").map((line) => line.trim()).filter(Boolean),
        deckId: deckId === UNASSIGNED_DECK ? null : deckId,
      });
      onSaved(updated);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xl flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Edit card</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="French word"
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
        />
        <input
          value={type}
          onChange={(e) => setType(e.target.value)}
          placeholder="Word type (e.g. verb, noun)"
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
        />
        <input
          value={phonetic}
          onChange={(e) => setPhonetic(e.target.value)}
          placeholder="Phonetic (e.g. /a.bɔʁ.de/)"
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>
      <textarea
        value={definition}
        onChange={(e) => setDefinition(e.target.value)}
        placeholder="Definition"
        rows={2}
        className="rounded-md border bg-background px-3 py-2 text-sm"
      />
      <textarea
        value={examples}
        onChange={(e) => setExamples(e.target.value)}
        placeholder={"Examples, one per line"}
        rows={3}
        className="rounded-md border bg-background px-3 py-2 font-mono text-sm"
      />
      <div className="flex items-center gap-2">
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
        <Button type="submit" disabled={saving || !word.trim()}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
