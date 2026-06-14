import { useEffect, useState } from "react";
import { flashcardsApi } from "@/api";
import type { ReviewStats } from "@/types";

interface DashboardProps {
  refreshKey?: unknown;
}

export function Dashboard({ refreshKey }: DashboardProps) {
  const [stats, setStats] = useState<ReviewStats | null>(null);

  useEffect(() => {
    flashcardsApi.stats().then(setStats);
  }, [refreshKey]);

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
    <div className="grid w-full max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="flex flex-col items-center gap-1 rounded-xl border bg-card p-4 shadow-sm">
          <span className="text-2xl font-semibold">{c.value}</span>
          <span className="text-center text-xs text-muted-foreground">{c.label}</span>
        </div>
      ))}
    </div>
  );
}
