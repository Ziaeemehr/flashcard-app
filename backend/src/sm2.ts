export type ReviewRating = "again" | "hard" | "good" | "easy";

export interface SM2State {
  easeFactor: number;
  interval: number; // days
  reviewCount: number;
  lapses: number;
}

export interface SM2Result extends SM2State {
  nextReviewDate: Date;
}

const MIN_EASE_FACTOR = 1.3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function applyReview(state: SM2State, rating: ReviewRating, now = new Date()): SM2Result {
  const isNew = state.reviewCount === 0;
  let easeFactor = state.easeFactor;
  let interval = state.interval;
  let lapses = state.lapses;

  switch (rating) {
    case "again":
      easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.2);
      interval = 0;
      lapses += 1;
      break;
    case "hard":
      easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.15);
      interval = isNew ? 1 : Math.max(1, Math.round(interval * 1.2));
      break;
    case "good":
      interval = isNew ? 1 : Math.max(1, Math.round(interval * easeFactor));
      break;
    case "easy":
      easeFactor = easeFactor + 0.15;
      interval = isNew ? 4 : Math.max(1, Math.round(interval * easeFactor * 1.3));
      break;
  }

  const nextReviewDate = new Date(now.getTime() + interval * MS_PER_DAY);

  return {
    easeFactor,
    interval,
    reviewCount: state.reviewCount + 1,
    lapses,
    nextReviewDate,
  };
}
