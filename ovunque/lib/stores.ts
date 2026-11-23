import type { StoreMeta } from "./types";

export const STORES: Record<string, StoreMeta> = {
  beatport: { id: "beatport", name: "Beatport", short: "BP" },
  bandcamp: { id: "bandcamp", name: "Bandcamp", short: "BC" },
  traxsource: { id: "traxsource", name: "Traxsource", short: "TX" },
  juno: { id: "juno", name: "Juno Download", short: "JN" },
  whatpeopleplay: { id: "whatpeopleplay", name: "WhatPeoplePlay", short: "WPP" },
  boomkat: { id: "boomkat", name: "Boomkat", short: "BK" },
  apple: { id: "apple", name: "Apple Music", short: "AM" },
  amazon: { id: "amazon", name: "Amazon Digital", short: "AZ" },
};

export function storeName(id: string): string {
  return STORES[id]?.name ?? id;
}
