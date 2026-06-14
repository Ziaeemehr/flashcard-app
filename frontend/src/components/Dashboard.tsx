import { useEffect, useState } from "react";
import { flashcardsApi, settingsApi } from "@/api";
import type { ReviewStats } from "@/types";

interface DashboardProps {
  refreshKey?: unknown;
  deckId?: string | null;
}

export function Dashboard({ refreshKey, deckId }: DashboardProps) {
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [newCardsPerDay, setNewCardsPerDay] = useState<number | null>(null);

  useEffect(() => {
    flashcardsApi.stats(deckId).then(setStats);
  }, [refreshKey, deckId]);

  useEffect(() => {
    settingsApi.get().then((s) => setNewCardsPerDay(s.newCardsPerDay));
  }, []);

  const handleNewCardsPerDayChange = async (value: number) => {
    if (Number.isNaN(value) || value < 0) return;
    setNewCardsPerDay(value);
    const updated = await settingsApi.update(value);
    setNewCardsPerDay(updated.newCardsPerDay);
    flashcardsApi.stats(deckId).then(setStats);
  };

  if (!stats) {
    return <p className="text-muted-foreground">Loading stats…</p>;
  }

  const cards = [
    { label: "Due today", value: stats.dueToday },
    { label: "New words", value: stats.newWords },
    { label: "Learned", value: stats.learned },
    {
      label: "Retention rate",
      value: stats.retentionRate === null ? "—" : `${Math.round(stats.retentionRate)}%`,
    },
  ];

  return (
    <div className="flex w-full max-w-xl flex-col gap-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="flex flex-col items-center gap-1 rounded-xl border bg-card p-4 shadow-sm">
            <span className="text-2xl font-semibold">{c.value}</span>
            <span className="text-center text-xs text-muted-foreground">{c.label}</span>
          </div>
        ))}
      </div>
      <label className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
        New cards per day
        <input
          type="number"
          min={0}
          value={newCardsPerDay ?? ""}
          onChange={(e) => handleNewCardsPerDayChange(Number(e.target.value))}
          className="w-16 rounded-md border bg-background px-2 py-1 text-right text-sm"
        />
      </label>
    </div>
  );
}
