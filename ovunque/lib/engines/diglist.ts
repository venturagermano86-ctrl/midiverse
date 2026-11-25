import type { Track } from "../types";
import { TRACKS } from "../catalog";
import { resolveGenre } from "../genres";
import { walkDigWeb, inSeedTerritory, type WebHit } from "./digWeb";
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

function dedupeTracks(list: Track[]): Track[] {
  const seen = new Set<string>();
  const out: Track[] = [];
  list.forEach((t) => {
    const key = `${t.artist.toLowerCase()}|${t.title.toLowerCase()}`;
    if (seen.has(key) || seen.has(t.id)) return;
    seen.add(key);
    seen.add(t.id);
    out.push(t);
  });
  return out;
}

/**
 * Short / Long Diglist accurato:
 * 1) Bandcamp buyers×collezioni (se raggiungibile)
 * 2) Discogs ragnatela label/artista/stile (dove è uscito)
 * 3) Wishlist croci community
 * 4) Catalogo ragnatela artista/label/BPM — mai random
 */
export function buildDigList(
  seeds: Track[],
  extras: Track[],
  mode: DigMode,
  realBuyers: BuyerCollection[] = [],
  scoutTracks: Track[] = [],
): {
  mode: DigMode;
  tracks: Track[];
  note: string;
  croci: CroceHit[];
  method: string;
  web: WebHit[];
} {
  const picked = seeds.slice(0, 6);
  const limit = LIMITS[mode];
  const seedIds = new Set(picked.map((s) => s.id));

  // Scout live (Discogs/BC) — solo territorio dei seed
  const scoutOk = scoutTracks.filter(
    (t) => !seedIds.has(t.id) && inSeedTerritory(picked, t),
  );

  // Wishlist buyers × collections
  const croci = crossBuyersCollections(picked, realBuyers);
  const wishTracks = resolveTracksById(
    croci.slice(0, limit).map((c) => c.trackId),
    extras,
  ).filter((t) => inSeedTerritory(picked, t));

  // Ragnatela catalogo: artista → label → roster → BPM
  const web = walkDigWeb(picked, [...extras, ...scoutOk], limit);

  // Merge ranking: scout (live digger) > croce wishlist > web
  const scored = new Map<string, { track: Track; score: number; why: string }>();

  function add(t: Track, score: number, why: string) {
    if (seedIds.has(t.id)) return;
    if (!inSeedTerritory(picked, t)) return;
    const key = `${t.artist.toLowerCase()}|${t.title.toLowerCase()}`;
    const prev = scored.get(key);
    if (!prev || score > prev.score) scored.set(key, { track: t, score, why });
  }

  scoutOk.forEach((t, i) => add(t, 200 - i, "scout"));
  croci.forEach((c) => {
    const t = wishTracks.find((x) => x.id === c.trackId);
    if (t) add(t, 150 + c.score / 10, "wishlist-croce");
  });
  web.forEach((h) => add(h.track, h.score, h.paths[0] ?? "web"));

  let tracks = Array.from(scored.values())
    .sort((a, b) => b.score - a.score)
    .map((x) => x.track);

  tracks = dedupeTracks(tracks).slice(0, limit);

  // Riempimento stretto: SOLO stesso artista o stessa label dei pick
  if (tracks.length < Math.min(6, limit)) {
    const artists = new Set(picked.map((s) => s.artist.toLowerCase()));
    const labels = new Set(
      picked.map((s) => s.label).filter((l) => l && l !== "—"),
    );
    const have = new Set(tracks.map((t) => t.id));
    for (const t of [...scoutOk, ...TRACKS, ...extras]) {
      if (have.has(t.id) || seedIds.has(t.id)) continue;
      if (!inSeedTerritory(picked, t)) continue;
      const sameArtist = artists.has(t.artist.toLowerCase());
      const sameLabel = labels.has(t.label);
      if (!sameArtist && !sameLabel) continue;
      tracks.push(t);
      have.add(t.id);
      if (tracks.length >= limit) break;
    }
  }

  tracks = tracks.slice(0, limit);
  const croceForte = croci.filter((c) => c.multiSeedBuyers > 0 || c.seedLinks >= 2)
    .length;

  return {
    mode,
    tracks,
    croci: croci.slice(0, limit),
    web: web.slice(0, 12),
    method: "diglist-web-scout-croce",
    note:
      mode === "short"
        ? `Short · ${tracks.length} dig (scout+ragnatela+croci${croceForte ? ` · ${croceForte} croci` : ""})`
        : `Long · ${tracks.length} dig accurati (label/artist/stile, non random)`,
  };
}

export function digSearchQuery(seeds: Track[]): string {
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
