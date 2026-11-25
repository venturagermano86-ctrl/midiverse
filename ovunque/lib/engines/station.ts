import { TRACKS } from "../catalog";
import { resolveGenre } from "../genres";
import type { Track } from "../types";
import { findSimilar, type SimilarHit } from "./similar";

export type StationItem = {
  track: Track;
  reason: string;
};

function scoreAgainstSeed(seed: Track, candidate: Track): number {
  let score = 0;
  if (seed.artist && candidate.artist === seed.artist) score += 40;
  const sg = resolveGenre(seed.genre);
  const cg = resolveGenre(candidate.genre);
  if (sg.slug === cg.slug) score += 36;
  else if (sg.familySlug === cg.familySlug) score += 22;
  if (seed.label && candidate.label === seed.label) score += 14;
  if (seed.bpm && candidate.bpm) {
    const d = Math.abs(seed.bpm - candidate.bpm);
    if (d <= 3) score += 16;
    else if (d <= 6) score += 8;
  }
  return score;
}

/** Station Dig List / SoundCloud-style: coda di dischi molto simili. */
export function buildStationQueue(
  seed: Track,
  extras: Track[] = [],
  limit = 24,
): StationItem[] {
  const curatedHits: SimilarHit[] = findSimilar(seed.id, limit);
  const pool = new Map<string, StationItem>();

  pool.set(seed.id, { track: seed, reason: "Seed — la traccia che hai scelto" });

  for (const h of curatedHits) {
    pool.set(h.track.id, {
      track: h.track,
      reason: h.reasons[0] ?? "Simile",
    });
  }

  for (const t of extras) {
    if (pool.has(t.id)) continue;
    const score = scoreAgainstSeed(seed, t);
    if (score < 18 && t.artist !== seed.artist) continue;
    pool.set(t.id, {
      track: t,
      reason:
        t.artist === seed.artist
          ? "Stesso artista"
          : resolveGenre(t.genre).slug === resolveGenre(seed.genre).slug
            ? `Stesso lane · ${resolveGenre(t.genre).name}`
            : "Vicino al dig",
    });
  }

  // Fill from same-genre curated if thin
  if (pool.size < 8) {
    const genre = resolveGenre(seed.genre);
    for (const t of TRACKS) {
      if (pool.has(t.id)) continue;
      if (resolveGenre(t.genre).familySlug !== genre.familySlug) continue;
      pool.set(t.id, { track: t, reason: `Lane ${genre.family}` });
      if (pool.size >= limit) break;
    }
  }

  const items = Array.from(pool.values());
  const seedItem = items.find((i) => i.track.id === seed.id)!;
  const rest = items
    .filter((i) => i.track.id !== seed.id)
    .sort(
      (a, b) =>
        scoreAgainstSeed(seed, b.track) - scoreAgainstSeed(seed, a.track),
    );

  return [seedItem, ...rest].slice(0, limit);
}

export function stationSearchQuery(seed: Track): string {
  const genre = resolveGenre(seed.genre);
  return `${seed.artist} ${genre.aliases[0] ?? genre.name}`.trim();
}
