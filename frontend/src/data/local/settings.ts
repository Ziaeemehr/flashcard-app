import { getDb } from "./db";
import type { Settings } from "../../types";

const SETTINGS_ID = "default";

export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  const existing = await db.get("settings", SETTINGS_ID);
  if (existing) return existing;

  const defaults: Settings = { id: SETTINGS_ID, newCardsPerDay: 20 };
  await db.put("settings", defaults);
  return defaults;
}

export const settingsApi = {
  get: () => getSettings(),
  update: async (newCardsPerDay: number): Promise<Settings> => {
    const clamped = Math.max(0, Math.min(1000, Math.round(newCardsPerDay)));
    const db = await getDb();
    const settings: Settings = { id: SETTINGS_ID, newCardsPerDay: clamped };
    await db.put("settings", settings);
    return settings;
  },
};
