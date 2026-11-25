import type { Track } from "./types";

const PREFIX = "dig.pick.bag.";
const LAST_KEY = "dig.pick.last";

export type DigPickBag = {
  id: string;
  mode: "short" | "long";
  seeds: Track[];
  savedAt: number;
};

function bagId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 10);
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Salva i pick in localStorage (condiviso tra schede) e restituisce l'id URL. */
export function stashDigPicks(mode: "short" | "long", seeds: Track[]): string {
  const id = bagId();
  const bag: DigPickBag = { id, mode, seeds, savedAt: Date.now() };
  const raw = JSON.stringify(bag);
  try {
    localStorage.setItem(PREFIX + id, raw);
    localStorage.setItem(LAST_KEY, raw);
  } catch {
    /* quota / private mode */
  }
  return id;
}

export function loadDigPicks(bag: string | null): DigPickBag | null {
  try {
    if (bag) {
      const raw = localStorage.getItem(PREFIX + bag);
      if (raw) return JSON.parse(raw) as DigPickBag;
    }
    const last = localStorage.getItem(LAST_KEY);
    if (last) return JSON.parse(last) as DigPickBag;
  } catch {
    /* ignore */
  }
  return null;
}
