import { useState } from "react";
import { ClickableText } from "@/components/ClickableText";
import { DictionaryPanel } from "@/components/DictionaryPanel";
import { AudioControls } from "@/components/AudioControls";
import { flashcardsApi, lookupWord, type DictionaryEntry } from "@/api";

interface SentenceExplorerProps {
  defaultDeckId?: string | null;
}

export function SentenceExplorer({ defaultDeckId = null }: SentenceExplorerProps) {
  const [sentence, setSentence] = useState("");

  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [dictionaryEntry, setDictionaryEntry] = useState<DictionaryEntry | null>(null);
  const [dictionaryLoading, setDictionaryLoading] = useState(false);
  const [dictionaryAdded, setDictionaryAdded] = useState(false);

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
      phonetic: dictionaryEntry.phonetic,
      type: dictionaryEntry.type,
      definition: dictionaryEntry.definition,
      examples: dictionaryEntry.examples,
      audioUrl: "",
      deckId: defaultDeckId,
    });
    setDictionaryAdded(true);
  };

  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      <textarea
        value={sentence}
        onChange={(e) => setSentence(e.target.value)}
        placeholder="Paste or type a French sentence…"
        rows={3}
        className="rounded-md border bg-background px-3 py-2 text-sm"
      />

      {sentence.trim() && (
        <div className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="text-lg leading-relaxed">
              <ClickableText text={sentence} onWordClick={handleWordClick} />
            </p>
            <AudioControls text={sentence} />
          </div>
          <p className="text-xs text-muted-foreground">
            Click any word to look up its definition.
          </p>
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
