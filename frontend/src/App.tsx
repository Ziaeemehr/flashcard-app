import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FlashcardView } from "@/components/FlashcardView";
import { AddCardForm } from "@/components/AddCardForm";
import { DictionaryPanel } from "@/components/DictionaryPanel";
import { SearchBar } from "@/components/SearchBar";
import { Dashboard } from "@/components/Dashboard";
import { ReviewMode } from "@/components/ReviewMode";
import { SentenceExplorer } from "@/components/SentenceExplorer";
import { ImportExport } from "@/components/ImportExport";
import { flashcardsApi, lookupWord, type DictionaryEntry } from "@/api";
import type { Flashcard, NewFlashcard, SortOption } from "@/types";

type Mode = "browse" | "review" | "explore";

function App() {
  const [mode, setMode] = useState<Mode>("browse");
  const [statsVersion, setStatsVersion] = useState(0);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [dictionaryEntry, setDictionaryEntry] = useState<DictionaryEntry | null>(null);
  const [dictionaryLoading, setDictionaryLoading] = useState(false);
  const [dictionaryAdded, setDictionaryAdded] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  useEffect(() => {
    flashcardsApi
      .list()
      .then(setCards)
      .catch(() => setError("Could not reach the backend API."))
      .finally(() => setLoading(false));
  }, []);

  const availableTypes = useMemo(
    () => Array.from(new Set(cards.map((c) => c.type).filter(Boolean))).sort(),
    [cards],
  );

  const filteredCards = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let result = cards.filter((c) => {
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      if (!query) return true;
      return (
        c.word.toLowerCase().includes(query) || c.definition.toLowerCase().includes(query)
      );
    });
    if (sortBy === "alphabetical") {
      result = [...result].sort((a, b) => a.word.localeCompare(b.word));
    } else {
      result = [...result].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    return result;
  }, [cards, searchQuery, typeFilter, sortBy]);

  useEffect(() => {
    setIndex(0);
    setFlipped(false);
  }, [searchQuery, typeFilter, sortBy]);

  const card = filteredCards[index];

  const goTo = (newIndex: number) => {
    setFlipped(false);
    setIndex(newIndex);
  };

  const handlePrev = () => goTo((index - 1 + filteredCards.length) % filteredCards.length);
  const handleNext = () => goTo((index + 1) % filteredCards.length);
  const handleRandom = () => {
    if (filteredCards.length <= 1) return;
    let next = index;
    while (next === index) next = Math.floor(Math.random() * filteredCards.length);
    goTo(next);
  };

  const handleWordClick = (word: string) => {
    setSelectedWord(word);
    setDictionaryEntry(null);
    setDictionaryAdded(false);
    setDictionaryLoading(true);
    lookupWord(word)
      .then(setDictionaryEntry)
      .finally(() => setDictionaryLoading(false));
  };

  const handleAdd = async (newCard: NewFlashcard) => {
    const created = await flashcardsApi.create(newCard);
    setCards((prev) => [created, ...prev]);
    setIndex(0);
    setFlipped(false);
  };

  const handleAddFromDictionary = async () => {
    if (!selectedWord || !dictionaryEntry) return;
    await handleAdd({
      word: selectedWord,
      phonetic: "",
      type: dictionaryEntry.type,
      definition: dictionaryEntry.definition,
      examples: dictionaryEntry.examples,
      audioUrl: "",
    });
    setDictionaryAdded(true);
  };

  const handleImported = async () => {
    const updated = await flashcardsApi.list();
    setCards(updated);
    setIndex(0);
    setFlipped(false);
    setStatsVersion((v) => v + 1);
  };

  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col items-center gap-6 p-6">
      <h1 className="text-3xl font-semibold">French Vocabulary Flashcards</h1>

      <Dashboard refreshKey={statsVersion} />

      <div className="flex items-center gap-2">
        <Button variant={mode === "browse" ? "default" : "outline"} onClick={() => setMode("browse")}>
          Browse
        </Button>
        <Button variant={mode === "review" ? "default" : "outline"} onClick={() => setMode("review")}>
          Review
        </Button>
        <Button variant={mode === "explore" ? "default" : "outline"} onClick={() => setMode("explore")}>
          Explore
        </Button>
      </div>

      {mode === "review" && <ReviewMode onReviewed={() => setStatsVersion((v) => v + 1)} />}

      {mode === "explore" && <SentenceExplorer />}

      {mode === "browse" && (
        <>
          <AddCardForm onAdd={handleAdd} />

          <ImportExport onImported={handleImported} />

          {loading && <p className="text-muted-foreground">Loading flashcards…</p>}
          {error && <p className="text-destructive">{error}</p>}

          {!loading && !error && cards.length === 0 && (
            <p className="text-muted-foreground">No flashcards yet. Add your first word above.</p>
          )}

          {!loading && !error && cards.length > 0 && (
            <SearchBar
              query={searchQuery}
              onQueryChange={setSearchQuery}
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
              types={availableTypes}
              sortBy={sortBy}
              onSortByChange={setSortBy}
            />
          )}

          {!loading && !error && cards.length > 0 && filteredCards.length === 0 && (
            <p className="text-muted-foreground">No flashcards match your search.</p>
          )}

          {!loading && !error && card && (
            <>
              <FlashcardView
                card={card}
                flipped={flipped}
                onFlip={() => setFlipped((f) => !f)}
                onWordClick={handleWordClick}
              />

              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={handlePrev} disabled={filteredCards.length <= 1}>
                  Previous
                </Button>
                <Button variant="outline" onClick={handleRandom} disabled={filteredCards.length <= 1}>
                  Random
                </Button>
                <Button variant="outline" onClick={handleNext} disabled={filteredCards.length <= 1}>
                  Next
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                Card {index + 1} of {filteredCards.length}
              </p>
            </>
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
        </>
      )}
    </div>
  );
}

export default App;
