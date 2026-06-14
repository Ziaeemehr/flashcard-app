import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FlashcardView } from "@/components/FlashcardView";
import { AddCardForm } from "@/components/AddCardForm";
import { BulkAddForm } from "@/components/BulkAddForm";
import { DictionaryPanel } from "@/components/DictionaryPanel";
import { SearchBar } from "@/components/SearchBar";
import { Dashboard } from "@/components/Dashboard";
import { ReviewMode } from "@/components/ReviewMode";
import { SentenceExplorer } from "@/components/SentenceExplorer";
import { ImportExport } from "@/components/ImportExport";
import { DeckPanel, ALL_DECKS, UNASSIGNED_DECK } from "@/components/DeckPanel";
import { decksApi, flashcardsApi, lookupWord, type DictionaryEntry } from "@/api";
import type { Deck, Flashcard, NewFlashcard, SortOption } from "@/types";

type Mode = "browse" | "review" | "explore";

function App() {
  const [mode, setMode] = useState<Mode>("browse");
  const [statsVersion, setStatsVersion] = useState(0);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<string>(ALL_DECKS);
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

  const deckIdParam: string | null | undefined =
    selectedDeck === ALL_DECKS ? undefined : selectedDeck === UNASSIGNED_DECK ? null : selectedDeck;

  const loadDecks = () => decksApi.list().then(setDecks);

  useEffect(() => {
    loadDecks();
  }, []);

  useEffect(() => {
    setLoading(true);
    flashcardsApi
      .list(deckIdParam)
      .then(setCards)
      .catch(() => setError("Could not reach the backend API."))
      .finally(() => setLoading(false));
  }, [selectedDeck]);

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
    } else if (sortBy === "mostReviewed") {
      result = [...result].sort((a, b) => b.reviewCount - a.reviewCount);
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

  useEffect(() => {
    if (index >= filteredCards.length && filteredCards.length > 0) {
      setIndex(filteredCards.length - 1);
    }
  }, [filteredCards.length, index]);

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

  useEffect(() => {
    if (mode !== "browse" || !card) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          setFlipped((f) => !f);
          break;
        case "ArrowRight":
          handleNext();
          break;
        case "ArrowLeft":
          handlePrev();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, card, handleNext, handlePrev]);

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
    if (deckIdParam === undefined || created.deckId === deckIdParam) {
      setCards((prev) => [created, ...prev]);
      setIndex(0);
      setFlipped(false);
    }
    setStatsVersion((v) => v + 1);
  };

  const handleAddFromDictionary = async () => {
    if (!selectedWord || !dictionaryEntry) return;
    await handleAdd({
      word: selectedWord,
      phonetic: dictionaryEntry.phonetic,
      type: dictionaryEntry.type,
      definition: dictionaryEntry.definition,
      examples: dictionaryEntry.examples,
      audioUrl: "",
      deckId: deckIdParam ?? null,
    });
    setDictionaryAdded(true);
  };

  const handleDelete = async (id: string) => {
    await flashcardsApi.remove(id);
    setCards((prev) => prev.filter((c) => c.id !== id));
    setFlipped(false);
    setStatsVersion((v) => v + 1);
  };

  const handleImported = async () => {
    const updated = await flashcardsApi.list(deckIdParam);
    setCards(updated);
    setIndex(0);
    setFlipped(false);
    setStatsVersion((v) => v + 1);
    loadDecks();
  };

  const handleCreateDeck = async (name: string, parentId: string | null) => {
    await decksApi.create(name, parentId);
    await loadDecks();
  };

  const handleRenameDeck = async (id: string, name: string) => {
    await decksApi.rename(id, name);
    await loadDecks();
  };

  const handleDeleteDeck = async (id: string) => {
    await decksApi.remove(id);
    if (selectedDeck === id) setSelectedDeck(ALL_DECKS);
    await loadDecks();
  };

  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col items-center gap-6 p-6">
      <h1 className="text-3xl font-semibold">French Vocabulary Flashcards</h1>

      <Dashboard refreshKey={statsVersion} deckId={deckIdParam} />

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

      <DeckPanel
        decks={decks}
        selected={selectedDeck}
        onSelect={setSelectedDeck}
        onCreate={handleCreateDeck}
        onRename={handleRenameDeck}
        onDelete={handleDeleteDeck}
      />

      {mode === "review" && (
        <ReviewMode deckId={deckIdParam} onReviewed={() => setStatsVersion((v) => v + 1)} />
      )}

      {mode === "explore" && <SentenceExplorer defaultDeckId={deckIdParam ?? null} />}

      {mode === "browse" && (
        <>
          <AddCardForm
            decks={decks}
            defaultDeckId={deckIdParam ?? null}
            onAdd={handleAdd}
          />

          <BulkAddForm
            decks={decks}
            defaultDeckId={deckIdParam ?? null}
            onImported={handleImported}
          />

          <ImportExport
            decks={decks}
            currentDeckId={deckIdParam ?? null}
            onImported={handleImported}
          />

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
                onDelete={() => handleDelete(card.id)}
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
