import type { Track } from "../types";
import { TRACKS } from "../catalog";
import { resolveGenre } from "../genres";
import {
  crossBuyersCollections,
  resolveTracksById,
  type BuyerCollection,
  type CroceHit,
} from "./diglistBuyers";

export type DigMode = "short" | "long";

const LIMITS: Record<DigMode, number> = {
  short: 12,
  long: 36,
};

/**
 * Short / Long stile diglist.midivrs.com:
 * acquirenti dei pick × le loro collezioni → incrocio (croce).
 * NON ranking per genere.
 */
export function buildDigList(
  seeds: Track[],
  extras: Track[],
  mode: DigMode,
  realBuyers: BuyerCollection[] = [],
): {
  mode: DigMode;
  tracks: Track[];
  note: string;
  croci: CroceHit[];
  method: string;
} {
  const picked = seeds.slice(0, 6);
  const limit = LIMITS[mode];

  const croci = crossBuyersCollections(picked, realBuyers);
  const rankedIds = croci.slice(0, limit).map((c) => c.trackId);
  let tracks = resolveTracksById(rankedIds, extras);

  // Se pochi risultati catalogo, completa SOLO con extras che hanno stesso artista di un seed
  // (mai dump genere iTunes)
  if (tracks.length < limit) {
    const seedArtists = new Set(picked.map((s) => s.artist.toLowerCase()));
    const have = new Set(tracks.map((t) => t.id));
    for (const t of extras) {
      if (have.has(t.id)) continue;
      if (!seedArtists.has(t.artist.toLowerCase())) continue;
      tracks.push(t);
      have.add(t.id);
      if (tracks.length >= limit) break;
    }
  }

  // Ultimo riempimento: stessa label dei pick (segnale digger, non genere)
  if (tracks.length < Math.min(6, limit)) {
    const labels = new Set(
      picked.map((s) => s.label).filter((l) => l && l !== "—"),
    );
    const have = new Set(tracks.map((t) => t.id));
    for (const t of TRACKS) {
      if (have.has(t.id) || picked.some((s) => s.id === t.id)) continue;
      if (!labels.has(t.label)) continue;
      tracks.push(t);
      have.add(t.id);
      if (tracks.length >= limit) break;
    }
  }

  tracks = tracks.slice(0, limit);
  const croceForte = croci.filter((c) => c.multiSeedBuyers > 0 || c.seedLinks >= 2).length;

  return {
    mode,
    tracks,
    croci: croci.slice(0, limit),
    method: "diglist-buyers-x-collections",
    note:
      mode === "short"
        ? `Short list · ${tracks.length} dig da incrocio acquirenti×collezioni (${croceForte} a croce)`
        : `Long list · ${tracks.length} dig da collezioni di chi ha i pick (${croceForte} croci forti)`,
  };
}

export function digSearchQuery(seeds: Track[]): string {
  // Per live: titoli specifici dei pick, non genere
  const parts = seeds
    .slice(0, 3)
    .map((s) => `${s.artist} ${s.title}`)
    .filter(Boolean);
  if (parts.length) return parts[0];
  const first = seeds[0];
  if (!first) return "underground house";
  const g = resolveGenre(first.genre);
  return `${first.artist} ${g.aliases[0] ?? g.name}`;
}
