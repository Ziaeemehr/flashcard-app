export interface Flashcard {
  id: string;
  word: string;
  phonetic: string;
  type: string;
  definition: string;
  examples: string[];
  audioUrl: string;
  createdAt: string;
  easeFactor: number;
  interval: number;
  reviewCount: number;
  lapses: number;
  nextReviewDate: string;
}

export type NewFlashcard = Omit<
  Flashcard,
  "id" | "createdAt" | "easeFactor" | "interval" | "reviewCount" | "lapses" | "nextReviewDate"
>;

export type SortOption = "newest" | "alphabetical";

export type ReviewRating = "again" | "hard" | "good" | "easy";

export interface ReviewStats {
  dueToday: number;
  newWords: number;
  learned: number;
  retentionRate: number | null;
}
