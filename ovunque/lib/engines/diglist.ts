import type { Track } from "../types";
import { resolveGenre } from "../genres";
import { rankByAffinity, type AffinityHit } from "./affinity";

export type DigMode = "short" | "long";

const LIMITS: Record<DigMode, number> = {
  short: 12,
  long: 36,
};

/**
 * Short / Long list stile diglist.midivrs.com:
 * affinità "a croce" (collector / co-wishlist), NON solo genere.
 */
export function buildDigList(
  seeds: Track[],
  extras: Track[],
  mode: DigMode,
  coWish: Track[] = [],
): { mode: DigMode; tracks: Track[]; note: string; affinity: AffinityHit[] } {
  const picked = seeds.slice(0, 6);
  const limit = LIMITS[mode];

  // Co-wishlist community = croci reali (chi ha i pick ha anche queste)
  const boostedExtras = [...coWish, ...extras];
  const affinity = rankByAffinity(picked, boostedExtras, limit);

  // Se co-wish ha seed_hits multipli, forza in cima
  const byId = new Map(affinity.map((h) => [h.track.id, h]));
  for (const t of coWish) {
    const prev = byId.get(t.id);
    if (prev) {
      prev.score += 60;
      prev.croce = Math.max(prev.croce, 2);
      prev.reasons = [
        "croce wishlist community",
        ...prev.reasons.filter((r) => !r.startsWith("croce")),
      ].slice(0, 3);
    }
  }

  const ranked = Array.from(byId.values())
    .sort((a, b) => b.croce - a.croce || b.score - a.score)
    .slice(0, limit);

  const croceN = ranked.filter((h) => h.croce >= 2).length;

  return {
    mode,
    tracks: ranked.map((h) => h.track),
    affinity: ranked,
    note:
      mode === "short"
        ? `Short list · ${ranked.length} dig affini (${croceN} a croce Diglist) da ${picked.length} pick`
        : `Long list · ${ranked.length} dig affini (${croceN} a croce) — non solo genere`,
  };
}

export function digSearchQuery(seeds: Track[]): string {
  // Query live: artisti dei pick (affinità), non solo tag genere
  const artists = Array.from(new Set(seeds.map((s) => s.artist).filter(Boolean))).slice(
    0,
    3,
  );
  if (artists.length) return artists.join(" ");
  const first = seeds[0];
  if (!first) return "house techno underground";
  const g = resolveGenre(first.genre);
  return `${first.artist} ${g.aliases[0] ?? g.name}`;
}
