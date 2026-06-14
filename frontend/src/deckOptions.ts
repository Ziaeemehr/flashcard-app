import type { Deck } from "@/types";

export interface DeckOption {
  id: string;
  label: string;
}

export function buildDeckOptions(decks: Deck[]): DeckOption[] {
  const byParent = new Map<string | null, Deck[]>();
  for (const deck of decks) {
    const siblings = byParent.get(deck.parentId) ?? [];
    siblings.push(deck);
    byParent.set(deck.parentId, siblings);
  }
  const options: DeckOption[] = [];
  const visit = (parentId: string | null, depth: number) => {
    const siblings = (byParent.get(parentId) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
    for (const deck of siblings) {
      options.push({ id: deck.id, label: `${"— ".repeat(depth)}${deck.name}` });
      visit(deck.id, depth + 1);
    }
  };
  visit(null, 0);
  return options;
}
