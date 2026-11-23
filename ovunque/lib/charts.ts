import { TRACKS, cheapestOffer, hasFreeOffer } from "./catalog";
import type { Track } from "./types";

/** Chart stile Beatport: più portali + free + suggested in alto. */
export function topChart(limit = 12): Track[] {
  return [...TRACKS]
    .map((t) => {
      const best = cheapestOffer(t);
      let score = t.offers.length * 10;
      if (t.suggested) score += 8;
      if (hasFreeOffer(t)) score += 15;
      if (best && best.kind === "paid") score += Math.max(0, 5 - best.priceEur);
      if (t.year >= 2025) score += 5;
      return { t, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.t);
}

export function tracksByGenre(genre: string): Track[] {
  return TRACKS.filter((t) => t.genre.toLowerCase() === genre.toLowerCase());
}

export function genreCounts(): { genre: string; count: number }[] {
  const map = new Map<string, number>();
  for (const t of TRACKS) {
    map.set(t.genre, (map.get(t.genre) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre));
}
