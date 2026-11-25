import { TRACKS } from "../catalog";
import { resolveGenre } from "../genres";
import type { Track } from "../types";
import { findSimilarToCollection } from "./similar";

export type DigMode = "short" | "long";

const LIMITS: Record<DigMode, number> = {
  short: 12,
  long: 36,
};

function scoreVsSeeds(seeds: Track[], candidate: Track): number {
  let best = 0;
  for (const seed of seeds) {
    let s = 0;
    if (seed.artist === candidate.artist) s += 40;
    const sg = resolveGenre(seed.genre);
    const cg = resolveGenre(candidate.genre);
    if (sg.slug === cg.slug) s += 34;
    else if (sg.familySlug === cg.familySlug) s += 20;
    if (seed.label && seed.label === candidate.label) s += 12;
    if (seed.bpm && candidate.bpm) {
      const d = Math.abs(seed.bpm - candidate.bpm);
      if (d <= 3) s += 14;
      else if (d <= 7) s += 7;
    }
    best = Math.max(best, s);
  }
  return best;
}

/**
 * Short / Long list stile diglist.midivrs.com:
 * seed selezionati (max 6) → lista dig consigliati.
 */
export function buildDigList(
  seeds: Track[],
  extras: Track[],
  mode: DigMode,
): { mode: DigMode; tracks: Track[]; note: string } {
  const picked = seeds.slice(0, 6);
  const exclude = new Set(picked.map((t) => t.id));
  const limit = LIMITS[mode];

  const fromCollection = findSimilarToCollection(
    picked.map((t) => t.id),
    limit,
  ).map((h) => h.track);

  const pool = new Map<string, Track>();
  for (const t of [...fromCollection, ...extras, ...TRACKS]) {
    if (exclude.has(t.id)) continue;
    if (scoreVsSeeds(picked, t) < 16 && !fromCollection.some((x) => x.id === t.id)) {
      continue;
    }
    pool.set(t.id, t);
  }

  const ranked = Array.from(pool.values())
    .sort((a, b) => scoreVsSeeds(picked, b) - scoreVsSeeds(picked, a))
    .slice(0, limit);

  return {
    mode,
    tracks: ranked,
    note:
      mode === "short"
        ? `Short list · ${ranked.length} dig vicini ai ${picked.length} pick`
        : `Long list · ${ranked.length} dig (più profondità) dai ${picked.length} pick`,
  };
}

export function digSearchQuery(seeds: Track[]): string {
  const first = seeds[0];
  if (!first) return "house techno";
  const g = resolveGenre(first.genre);
  return `${first.artist} ${g.aliases[0] ?? g.name}`;
}
