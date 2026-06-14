import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FlashcardView } from "@/components/FlashcardView";
import { DictionaryPanel } from "@/components/DictionaryPanel";
import { flashcardsApi, lookupWord, type DictionaryEntry } from "@/api";
import type { Flashcard, ReviewRating } from "@/types";

interface ReviewModeProps {
  onReviewed?: () => void;
}

export function ReviewMode({ onReviewed }: ReviewModeProps) {
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [dictionaryEntry, setDictionaryEntry] = useState<DictionaryEntry | null>(null);
  const [dictionaryLoading, setDictionaryLoading] = useState(false);
  const [dictionaryAdded, setDictionaryAdded] = useState(false);

  useEffect(() => {
    flashcardsApi
      .due()
      .then(setQueue)
      .finally(() => setLoading(false));
  }, []);

  const card = queue[0];

  const handleWordClick = (word: string) => {
    setSelectedWord(word);
    setDictionaryEntry(null);
    setDictionaryAdded(false);
    setDictionaryLoading(true);
    lookupWord(word)
      .then(setDictionaryEntry)
      .finally(() => setDictionaryLoading(false));
  };

  const handleAddFromDictionary = async () => {
    if (!selectedWord || !dictionaryEntry) return;
    await flashcardsApi.create({
      word: selectedWord,
      phonetic: "",
      type: dictionaryEntry.type,
      definition: dictionaryEntry.definition,
      examples: dictionaryEntry.examples,
      audioUrl: "",
    });
    setDictionaryAdded(true);
  };

  const handleRate = async (rating: ReviewRating) => {
    if (!card) return;
    setSubmitting(true);
    try {
      const updated = await flashcardsApi.review(card.id, rating);
      const stillDue = new Date(updated.nextReviewDate) <= new Date();
      setQueue((prev) => (stillDue ? [...prev.slice(1), updated] : prev.slice(1)));
      setFlipped(false);
      onReviewed?.();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading review queue…</p>;
  }

  if (!card) {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-xl font-medium">All caught up!</p>
        <p className="text-muted-foreground">No cards are due for review right now.</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <p className="text-sm text-muted-foreground">{queue.length} card(s) due</p>

      <FlashcardView
        card={card}
        flipped={flipped}
        onFlip={() => setFlipped((f) => !f)}
        onWordClick={handleWordClick}
      />

      {!flipped && (
        <Button variant="outline" onClick={() => setFlipped(true)}>
          Show answer
        </Button>
      )}

      {flipped && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="destructive"
            disabled={submitting}
            onClick={() => handleRate("again")}
          >
            Again
          </Button>
          <Button variant="outline" disabled={submitting} onClick={() => handleRate("hard")}>
            Hard
          </Button>
          <Button variant="default" disabled={submitting} onClick={() => handleRate("good")}>
            Good
          </Button>
          <Button variant="secondary" disabled={submitting} onClick={() => handleRate("easy")}>
            Easy
          </Button>
        </div>
      )}

      {selectedWord && (
        <DictionaryPanel
          word={selectedWord}
          entry={dictionaryEntry}
          loading={dictionaryLoading}
          onClose={() => setSelectedWord(null)}
          onAddToFlashcards={handleAddFromDictionary}
          added={dictionaryAdded}
        />
      )}
    </div>
  );
}
