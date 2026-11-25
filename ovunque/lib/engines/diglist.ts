import type { Track } from "../types";
import { TRACKS } from "../catalog";
import { resolveGenre } from "../genres";
import { walkDigWeb, inSeedTerritory, type WebHit } from "./digWeb";
import { rankByAffinity } from "./affinity";
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

function isJunkTrack(t: Track): boolean {
  const s = `${t.artist} ${t.title}`;
  const latin = (s.match(/[A-Za-z0-9]/g) || []).length;
  if (latin < 4) return true;
  if (/пиздец|какашк|lyсина/i.test(s)) return true;
  return false;
}

/**
 * Short / Long Diglist:
 * priorità 1) stesso artista / stessa label / affinity cluster catalogo
 * 2) Discogs artist+label reali
 * 3) iTunes discografia artista
 * 4) wishlist croci
 * Mai dump genere / label fake.
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
  const seedArtists = new Set(picked.map((s) => s.artist.toLowerCase()));
  const seedLabels = new Set(
    picked
      .map((s) => s.label)
      .filter((l) => l && l !== "—" && l.length >= 3 && l.toLowerCase() !== "x"),
  );

  const scored = new Map<string, { track: Track; score: number; why: string }>();

  function add(t: Track, score: number, why: string) {
    if (seedIds.has(t.id)) return;
    if (isJunkTrack(t)) return;
    if (!inSeedTerritory(picked, t)) return;
    const key = `${t.artist.toLowerCase()}|${t.title.toLowerCase()}`;
    const prev = scored.get(key);
    if (!prev || score > prev.score) scored.set(key, { track: t, score, why });
  }

  // 1) Affinity cluster catalogo (Diglist croci curate)
  const affinity = rankByAffinity(picked, [], limit * 2);
  affinity.forEach((h, i) => add(h.track, 300 - i, `cluster:${h.croce}`));

  // 2) Stesso artista / stessa label nel catalogo (sempre prioritario)
  for (const t of TRACKS) {
    if (seedIds.has(t.id)) continue;
    if (!inSeedTerritory(picked, t)) continue;
    if (seedArtists.has(t.artist.toLowerCase())) add(t, 280, "same-artist");
    else if (seedLabels.has(t.label)) add(t, 240, "same-label");
  }

  // 3) Ragnatela catalogo (BPM + rails strette)
  const web = walkDigWeb(picked, extras, limit);
  web.forEach((h) => {
    const strong = h.paths.some(
      (p) =>
        p.startsWith("artista:") ||
        p.startsWith("label:") ||
        p.startsWith("croce") ||
        p.startsWith("roster:"),
    );
    if (!strong) return;
    // croce/web: stesso genere o stessa label/artista
    const okGenre = seedArtists.has(h.track.artist.toLowerCase()) ||
      seedLabels.has(h.track.label) ||
      picked.some((s) => s.genre.toLowerCase() === h.track.genre.toLowerCase());
    if (okGenre) add(h.track, h.score, h.paths[0] ?? "web");
  });

  // 4) Scout live (Discogs / iTunes) — già filtrati a monte
  const scoutOk = scoutTracks.filter(
    (t) => !seedIds.has(t.id) && !isJunkTrack(t) && inSeedTerritory(picked, t),
  );
  scoutOk.forEach((t, i) => {
    const sameA = seedArtists.has(t.artist.toLowerCase());
    const sameL = seedLabels.has(t.label);
    add(t, (sameA ? 260 : sameL ? 220 : 180) - i, sameA ? "scout-artist" : "scout");
  });

  // 5) Wishlist / synth croci — solo se artista, label, o stesso genere dei pick
  const croci = crossBuyersCollections(picked, realBuyers);
  const wishTracks = resolveTracksById(
    croci.slice(0, limit).map((c) => c.trackId),
    extras,
  ).filter((t) => inSeedTerritory(picked, t) && !isJunkTrack(t));
  const seedGenresExact = new Set(picked.map((s) => s.genre.toLowerCase()));
  croci.forEach((c) => {
    const t = wishTracks.find((x) => x.id === c.trackId);
    if (!t) return;
    const tight =
      seedArtists.has(t.artist.toLowerCase()) ||
      seedLabels.has(t.label) ||
      seedGenresExact.has(t.genre.toLowerCase()) ||
      c.seedLinks >= 2;
    if (!tight) return;
    add(t, 160 + c.score / 10, "wishlist-croce");
  });

  let tracks = Array.from(scored.values())
    .sort((a, b) => b.score - a.score)
    .map((x) => x.track);

  tracks = dedupeTracks(tracks).slice(0, limit);

  // Se ancora pochi: stesso genere dei pick (o deep/tech house se seed house) + BPM
  if (tracks.length < Math.min(8, limit)) {
    const have = new Set(tracks.map((t) => t.id));
    const bpmSeed = picked.map((s) => s.bpm).filter((b): b is number => !!b);
    const avgBpm =
      bpmSeed.length > 0
        ? bpmSeed.reduce((a, b) => a + b, 0) / bpmSeed.length
        : null;
    const seedGenres = new Set(picked.map((s) => s.genre.toLowerCase()));
    const seedFamily = resolveGenre(picked[0]?.genre).familySlug;

    const pool = TRACKS.filter((t) => {
      if (have.has(t.id) || seedIds.has(t.id) || isJunkTrack(t)) return false;
      const g = t.genre.toLowerCase();
      const exact = seedGenres.has(g);
      const houseLane =
        seedFamily === "house" &&
        (seedGenres.has("tech house")
          ? /^(house|deep house|tech house)$/i.test(t.genre)
          : /^(house|deep house|afro house|organic house|soulful house)$/i.test(
              t.genre,
            ));
      if (!exact && !houseLane) return false;
      if (avgBpm != null && t.bpm != null && Math.abs(t.bpm - avgBpm) > 5)
        return false;
      return true;
    }).slice(0, limit - tracks.length);

    pool.forEach((t) => tracks.push(t));
  }

  tracks = dedupeTracks(tracks).slice(0, limit);
  const croceForte = croci.filter((c) => c.multiSeedBuyers > 0 || c.seedLinks >= 2)
    .length;
  const sameArtistN = tracks.filter((t) =>
    seedArtists.has(t.artist.toLowerCase()),
  ).length;

  return {
    mode,
    tracks,
    croci: croci.slice(0, limit),
    web: web.slice(0, 12),
    method: "diglist-artist-label-first",
    note:
      mode === "short"
        ? `Short · ${tracks.length} dig · ${sameArtistN} stesso artista · scout artist/label${croceForte ? ` · ${croceForte} croci` : ""}`
        : `Long · ${tracks.length} dig (artista/label first, non genere random)`,
  };
}

export function digSearchQuery(seeds: Track[]): string {
  const first = seeds[0];
  if (!first) return "underground house";
  return `${first.artist} ${first.title}`;
}
