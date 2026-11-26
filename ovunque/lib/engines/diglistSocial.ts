/**
 * Diglist a croce — metodo stretto (no pool digger / no dump corde)
 *
 * Dai pick:
 * 1) Discogs discografia stesso artista
 * 2) Discogs roster delle LABEL reali trovate su quei release (Perlon, Cadenza…)
 * 3) iTunes stesso artista
 * 4) co-wishlist community se c’è croce
 *
 * Niente lista classici house a caso. Niente cover Topolino (enrich stretto).
 */

import { TRACKS } from "../catalog";
import { resolveGenre } from "../genres";
import type { Track } from "../types";
import { isClubDig } from "./clubFilter";
import {
  loadBandcampProfile,
  loadFanLibrary,
  type BcItem,
  type BcProfile,
} from "../live/bandcampDiglist";
import { scoutDiscogsGraph } from "../live/discogsScout";
import { scoutItunesArtists } from "../live/itunesArtistScout";
import { buyerCollectionsForSeeds, coWishlistedWithSeeds } from "../wishlist";

export type DigSocialMode = "short" | "long" | "station";

export type DigSocialOptions = {
  mode: DigSocialMode;
  seeds: Track[];
  bandcampUser?: string;
  ownedLocal?: Track[];
  audioCompare?: boolean;
};

export type DigSocialHit = {
  track: Track;
  score: number;
  croceBuyers: number;
  reasons: string[];
  genre: string;
  seedLinks: number;
};

export type DigSocialResult = {
  tracks: DigSocialHit[];
  note: string;
  method: string;
  bandcampLive: boolean;
  audioActive: boolean;
  stats: { owned: number; buyersUsed: number; candidates: number };
};

const LIMITS = {
  short: { buyers: 16, out: 48 },
  long: { buyers: 56, out: 90 },
  station: { buyers: 16, out: 36 },
} as const;

function itemKey(artist: string, title: string): string {
  return `${artist.toLowerCase().trim()}|${title.toLowerCase().trim()}`;
}

function trackToItem(t: Track, purchased: boolean): BcItem {
  return {
    key: itemKey(t.artist, t.title),
    itemId: 0,
    itemType: "a",
    title: t.title,
    artist: t.artist,
    label: t.label,
    url: t.offers?.find((o) => o.storeId === "bandcamp")?.url,
    artworkUrl: t.artworkUrl,
    purchased,
  };
}

function isJunk(artist: string, title: string): boolean {
  const s = `${artist} ${title}`;
  const latin = (s.match(/[A-Za-z0-9]/g) || []).length;
  if (latin < 4) return true;
  if (/пиздец|какашк|topolino|mickey/i.test(s)) return true;
  return false;
}

/** Hard gate: entra solo se correlato ai pick (niente topolino). */
function isCorrelated(seeds: Track[], candidate: Track, reason: string): boolean {
  const ca = candidate.artist.toLowerCase();
  const cl = (candidate.label || "").toLowerCase();

  // 1) stesso artista (anche feat / & )
  for (const s of seeds) {
    const sa = s.artist.toLowerCase();
    if (ca === sa) return true;
    if (ca.includes(sa) || sa.includes(ca)) return true;
    const parts = sa.split(/\s*(?:&|,|feat\.?|ft\.?|x)\s*/i).filter((p) => p.length > 2);
    if (parts.some((p) => ca.includes(p))) return true;
  }

  // 2) stessa label reale
  for (const s of seeds) {
    const sl = (s.label || "").toLowerCase();
    if (sl && sl !== "—" && sl !== "x" && sl.length >= 3 && sl === cl) return true;
  }

  // 3) co-wishlist / buyer croce forte
  if (/croce×|co-wishlist|buyer croce/i.test(reason)) return true;

  // 4) Discogs rete artista→label→artisti / iTunes stesso artista
  if (
    /Discogs|iTunes discografia|stesso artista|stessa label|label mate|artist mate|rete|network/i.test(
      reason,
    )
  ) {
    return true;
  }

  return false;
}

function diversify(hits: DigSocialHit[], limit: number): DigSocialHit[] {
  const perArtist = new Map<string, number>();
  const perLabel = new Map<string, number>();
  const seen = new Set<string>();
  const out: DigSocialHit[] = [];
  for (const h of hits) {
    const key = itemKey(h.track.artist, h.track.title);
    if (seen.has(key)) continue;
    const a = h.track.artist.toLowerCase();
    const l = (h.track.label || "").toLowerCase();
    // Reti dense (All Inn / Perlon…): più pezzi per label, non un dump genere
    if ((perArtist.get(a) ?? 0) >= 5) continue;
    if (l && l !== "—" && (perLabel.get(l) ?? 0) >= 8) continue;
    out.push(h);
    seen.add(key);
    perArtist.set(a, (perArtist.get(a) ?? 0) + 1);
    if (l) perLabel.set(l, (perLabel.get(l) ?? 0) + 1);
    if (out.length >= limit) break;
  }
  return out;
}

function isSeedOrOwned(
  track: Track,
  seeds: Track[],
  ownedKeys: Set<string>,
): boolean {
  if (ownedKeys.has(itemKey(track.artist, track.title))) return true;
  const title = track.title.toLowerCase();
  const artist = track.artist.toLowerCase();
  return seeds.some((s) => {
    const st = s.title.toLowerCase();
    const sa = s.artist.toLowerCase();
    if (itemKey(s.artist, s.title) === itemKey(track.artist, track.title))
      return true;
    // stesso titolo (o contenuto) + artista correlato
    if (title.includes(st) || st.includes(title)) {
      if (artist.includes(sa.split(/\s+/)[0] || sa) || sa.includes(artist.split(/\s+/)[0] || artist))
        return true;
    }
    return false;
  });
}

function bumpHit(
  map: Map<string, DigSocialHit>,
  track: Track,
  addScore: number,
  reason: string,
  croce = 0,
  seedLinks = 0,
  seeds: Track[] = [],
  ownedKeys: Set<string> = new Set(),
) {
  if (isJunk(track.artist, track.title)) return;
  if (seeds.length && isSeedOrOwned(track, seeds, ownedKeys)) return;
  if (seeds.length && !isCorrelated(seeds, track, reason)) return;
  const seedHints = seeds.map((s) => s.artist);
  if (!isClubDig(track, seedHints)) return;
  const key = itemKey(track.artist, track.title);
  const prev = map.get(key);
  if (!prev) {
    map.set(key, {
      track,
      score: addScore,
      croceBuyers: croce,
      reasons: [reason],
      genre: resolveGenre(track.genre).name,
      seedLinks,
    });
    return;
  }
  prev.score += addScore;
  prev.croceBuyers = Math.max(prev.croceBuyers, croce);
  prev.seedLinks = Math.max(prev.seedLinks, seedLinks);
  if (!prev.reasons.includes(reason) && prev.reasons.length < 3) {
    prev.reasons.push(reason);
  }
}

export async function runDiglistSocial(
  options: DigSocialOptions,
): Promise<DigSocialResult> {
  const mode = options.mode;
  const cfg = LIMITS[mode];
  const picks = options.seeds.slice(0, 6);

  // ——— 1–2 Bandcamp profilo ———
  let profile: BcProfile | null = null;
  let bandcampLive = false;
  if (options.bandcampUser) {
    const loaded = await loadBandcampProfile(options.bandcampUser);
    if (loaded.ok) {
      profile = loaded.profile;
      bandcampLive = true;
    }
  }

  const ownedKeys = new Set<string>();
  const markOwned = (artist: string, title: string) => {
    ownedKeys.add(itemKey(artist, title));
  };

  if (profile) {
    profile.collection.forEach((i) => markOwned(i.artist, i.title));
    profile.wishlist.forEach((i) => markOwned(i.artist, i.title));
  }
  (options.ownedLocal ?? []).forEach((t) => markOwned(t.artist, t.title));
  picks.forEach((t) => markOwned(t.artist, t.title));

  // ——— 3 seed ———
  let seeds = picks;
  if (seeds.length === 0 && profile?.collection.length) {
    seeds = profile.collection.slice(0, 6).map((it) => ({
      id: `bc-${it.key}`,
      title: it.title,
      artist: it.artist,
      label: it.label || "—",
      genre: "Electronic",
      year: new Date().getFullYear(),
      mood: "club",
      coverHue: 200,
      suggested: true,
      rails: ["per-te"],
      offers: [],
      artworkUrl: it.artworkUrl,
      source: "live" as const,
    }));
    seeds.forEach((t) => markOwned(t.artist, t.title));
  }

  if (seeds.length === 0) {
    return {
      tracks: [],
      note: "Servono pick (fino a 6) o profilo Bandcamp pubblico con collezione",
      method: "diglist-social",
      bandcampLive,
      audioActive: false,
      stats: { owned: ownedKeys.size, buyersUsed: 0, candidates: 0 },
    };
  }

  const hits = new Map<string, DigSocialHit>();
  let buyersUsed = 0;
  const bump = (
    track: Track,
    addScore: number,
    reason: string,
    croce = 0,
    seedLinks = 0,
  ) => bumpHit(hits, track, addScore, reason, croce, seedLinks, seeds, ownedKeys);

  // ——— 4–6 community wishlist = supporters proxy ———
  try {
    const co = await coWishlistedWithSeeds(
      seeds.map((s) => s.id),
      mode === "long" ? 48 : 24,
    );
    for (const row of co) {
      const croce = row.seed_hits;
      const score =
        croce * 80 + row.shared_fans * 25 + (croce >= 2 ? 60 : 0);
      bump(
        row.track,
        score,
        croce >= 2 ? `croce×${croce} wishlist` : "co-wishlist",
        row.shared_fans,
        croce,
      );
    }
    buyersUsed = Math.max(
      buyersUsed,
      co.reduce((n, r) => n + r.shared_fans, 0),
    );
  } catch {
    /* no db */
  }

  try {
    const cols = await buyerCollectionsForSeeds(seeds.map((s) => s.id));
    buyersUsed = Math.max(buyersUsed, cols.length);
    for (const col of cols.filter((c) => c.seedHits >= 2).slice(0, cfg.buyers)) {
      Array.from(col.trackIds).forEach((tid) => {
        const t = TRACKS.find((x) => x.id === tid);
        if (!t) return;
        bump(t, 70 + col.seedHits * 20, `buyer croce×${col.seedHits}`, 1, col.seedHits);
      });
    }
  } catch {
    /* ignore */
  }

  if (bandcampLive && profile) {
    void loadFanLibrary;
  }

  // ——— Discogs RETE: artista → label → roster → altre label (All Inn→Perlon…) ———
  let networkNote = "";
  try {
    const dg = await scoutDiscogsGraph(
      seeds,
      mode === "long" ? 80 : mode === "station" ? 28 : 48,
      mode,
    );
    networkNote = dg.note;
    dg.tracks.forEach((t, i) => {
      const sameArtist = seeds.some((s) => {
        const names = s.artist
          .toLowerCase()
          .split(/\s*(?:&|,|feat\.?|ft\.?|x)\s*/);
        const ca = t.artist.toLowerCase();
        return names.some(
          (sa) => sa.length > 2 && (ca === sa || ca.includes(sa) || sa.includes(ca)),
        );
      });
      bump(
        t,
        (sameArtist ? 145 : 110) - i,
        sameArtist
          ? "rete: stesso artista"
          : `rete: label ${t.label}`,
        2,
        2,
      );
    });
  } catch {
    /* ignore */
  }

  // iTunes: SOLO stesso artista
  try {
    const it = await scoutItunesArtists(seeds, mode === "long" ? 14 : 10);
    it.tracks.forEach((t) => bump(t, 110, "iTunes discografia artista", 1, 1));
  } catch {
    /* ignore */
  }

  // Catalogo: SOLO stesso artista o stessa label (mai dump genere)
  const seedArtists = new Set(seeds.map((s) => s.artist.toLowerCase()));
  const seedLabels = new Set(
    seeds
      .map((s) => s.label)
      .filter((l) => l && l !== "—" && l.length >= 3 && l.toLowerCase() !== "x")
      .map((l) => l.toLowerCase()),
  );
  for (const t of TRACKS) {
    if (seedArtists.has(t.artist.toLowerCase())) {
      bump(t, 130, "stesso artista catalogo", 2, 2);
    } else if (seedLabels.has(t.label.toLowerCase())) {
      bump(t, 100, `stessa label ${t.label}`, 2, 1);
    }
  }

  const seedHints = seeds.map((s) => s.artist);
  let ranked = Array.from(hits.values())
    .filter((h) => h.score >= 70)
    .filter((h) => isCorrelated(seeds, h.track, h.reasons.join(" ")))
    .filter((h) => isClubDig(h.track, seedHints))
    .filter((h) => !/mickey|topolino|disney/i.test(`${h.track.title} ${h.track.artist}`))
    .sort((a, b) => b.score - a.score || b.croceBuyers - a.croceBuyers);

  ranked = diversify(ranked, cfg.out);

  ranked.forEach((h) => {
    h.genre = resolveGenre(h.track.genre).name;
    if (
      h.track.artworkUrl &&
      /mickey|topolino|disney|clubhouse/i.test(h.track.artworkUrl)
    ) {
      h.track = { ...h.track, artworkUrl: undefined };
    }
  });

  const audioActive = options.audioCompare === true;
  const src = bandcampLive
    ? "Bandcamp live"
    : networkNote || "rete Discogs artista→label→artisti→label";

  return {
    tracks: ranked,
    bandcampLive,
    audioActive,
    method: "diglist-label-network",
    note: `${mode} · ${ranked.length} dig · ${src}${audioActive ? "" : " · audio off"}`,
    stats: {
      owned: ownedKeys.size,
      buyersUsed: Math.min(buyersUsed, cfg.buyers) || buyersUsed,
      candidates: hits.size,
    },
  };
}

export async function runStationSocial(
  seed: Track,
  opts?: { bandcampUser?: string; ownedLocal?: Track[] },
): Promise<DigSocialResult> {
  return runDiglistSocial({
    mode: "station",
    seeds: [seed],
    bandcampUser: opts?.bandcampUser,
    ownedLocal: opts?.ownedLocal,
  });
}
