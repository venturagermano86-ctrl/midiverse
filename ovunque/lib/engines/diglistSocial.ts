/**
 * Diglist a croce — vedi diglistRoadmap.ts (Fase 1 label / Fase 2 utenti).
 *
 * ORA (Fase 1): pick → label → artisti → altre label → hop (Discogs).
 * DOPO (Fase 2): 4 tracce in comune con un altro → consigli le sue altre
 *   (wishlist/collezioni/Bandcamp). Il codice croce wishlist c’è già;
 *   si alza di priorità quando c’è utenza.
 *
 * Niente dump genere. Niente Topolino.
 */

import { TRACKS } from "../catalog";
import { resolveGenre } from "../genres";
import type { Track } from "../types";
import { isClubDig, isHardOffLane } from "./clubFilter";
import {
  loadBandcampProfile,
  loadFanLibrary,
  type BcItem,
  type BcProfile,
} from "../live/bandcampDiglist";
import { scoutDiscogsGraph } from "../live/discogsScout";
import { scoutItunesArtists } from "../live/itunesArtistScout";
import { fallbackLabelNetwork } from "../live/labelNetworkFallback";
import { buyerCollectionsForSeeds, coWishlistedWithSeeds } from "../wishlist";
import {
  DIGLIST_PHASE,
  USER_CROCE_MIN_SHARED,
  USER_CROCE_STRONG_SHARED,
  diglistPhaseNote,
} from "./diglistRoadmap";

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

function isSeedArtistName(artist: string, seedArtists: Set<string>): boolean {
  const a = artist.toLowerCase();
  for (const s of Array.from(seedArtists)) {
    if (!s || s.length < 2) continue;
    if (a === s || a.includes(s) || s.includes(a)) return true;
    const head = s.split(/\s+/)[0] || s;
    if (head.length > 3 && a.includes(head)) return true;
  }
  return false;
}

/**
 * Pick Villalobos → qualche Villalobos in cima, poi altri artisti (Perlon roster…).
 * Max 3 del seed artist, max 2 per tutti gli altri.
 */
function diversify(
  hits: DigSocialHit[],
  limit: number,
  seedArtists: Set<string> = new Set(),
): DigSocialHit[] {
  const perArtist = new Map<string, number>();
  const perLabel = new Map<string, number>();
  const seen = new Set<string>();
  const out: DigSocialHit[] = [];

  const tryPush = (h: DigSocialHit, maxForArtist: number) => {
    if (out.length >= limit) return false;
    const key = itemKey(h.track.artist, h.track.title);
    if (seen.has(key)) return false;
    const a = h.track.artist.toLowerCase();
    const l = (h.track.label || "").toLowerCase();
    if ((perArtist.get(a) ?? 0) >= maxForArtist) return false;
    if (l && l !== "—" && (perLabel.get(l) ?? 0) >= 6) return false;
    out.push(h);
    seen.add(key);
    perArtist.set(a, (perArtist.get(a) ?? 0) + 1);
    if (l) perLabel.set(l, (perLabel.get(l) ?? 0) + 1);
    return true;
  };

  // 1) Prima: fino a 3 pezzi del pick artist (Villalobos…)
  for (const h of hits) {
    if (!isSeedArtistName(h.track.artist, seedArtists)) continue;
    tryPush(h, 3);
    if (out.length >= Math.min(3, limit)) break;
  }

  // 2) Poi: altri artisti della rete (max 2 ciascuno)
  for (const h of hits) {
    if (isSeedArtistName(h.track.artist, seedArtists)) {
      tryPush(h, 3); // eventuale 2°/3° se manca
    } else {
      tryPush(h, 2);
    }
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
  if (isHardOffLane(track)) return; // reggae / fuori lane sempre fuori
  // Rete label: ancora club check (evita reggae/jazz su hop larghi)
  const fromNetwork = /rete:|rete curata|label mate|network/i.test(reason);
  if (!isClubDig(track, seedHints) && !fromNetwork) return;
  if (fromNetwork && !isClubDig(track, seedHints) && !/rete curata/i.test(reason)) {
    // Discogs hop: se non club, scarta (curata All Inn/Perlon resta)
    return;
  }
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

  // ——— Croce utenti (Fase 2): già agganciata — sale di peso con l’utenza ———
  // Esempio: 4 tracce in comune con un altro → consigli le sue altre.
  let userCroceHits = 0;
  try {
    const co = await coWishlistedWithSeeds(
      seeds.map((s) => s.id),
      mode === "long" ? 48 : 24,
    );
    for (const row of co) {
      const croce = row.seed_hits;
      if (croce < USER_CROCE_MIN_SHARED) continue;
      userCroceHits += 1;
      const strong = croce >= USER_CROCE_STRONG_SHARED;
      // Liste digger ora visibili (/liste) → croce wishlist conta già in Fase 1
      const score =
        (DIGLIST_PHASE === 2 ? 200 : 140) * croce +
        row.shared_fans * 30 +
        (strong ? 160 : 80);
      bump(
        row.track,
        score,
        strong
          ? `croce×${croce} wishlist (autostrada)`
          : `croce×${croce} wishlist`,
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
    for (const col of cols
      .filter((c) => c.seedHits >= USER_CROCE_MIN_SHARED)
      .slice(0, cfg.buyers)) {
      Array.from(col.trackIds).forEach((tid) => {
        const t = TRACKS.find((x) => x.id === tid);
        if (!t) return;
        const strong = col.seedHits >= USER_CROCE_STRONG_SHARED;
        bump(
          t,
          (DIGLIST_PHASE === 2 ? 160 : 110) + col.seedHits * 28,
          strong
            ? `buyer croce×${col.seedHits} (autostrada)`
            : `buyer croce×${col.seedHits}`,
          1,
          col.seedHits,
        );
      });
    }
  } catch {
    /* ignore */
  }

  void userCroceHits;

  if (bandcampLive && profile) {
    void loadFanLibrary;
  }

  // ——— Discogs RETE: artista → label → roster → altre label (All Inn→Perlon…) ———
  let networkNote = "";
  let discogsNodes = 0;
  try {
    const dg = await scoutDiscogsGraph(
      seeds,
      mode === "long" ? 80 : mode === "station" ? 28 : 48,
      mode,
    );
    networkNote = dg.note;
    discogsNodes = dg.nodes;
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
    networkNote = "Discogs timeout";
  }

  // Se Discogs è vuoto/429 → stessa croce da rete curata (mai 0 dig su All Inn/Perlon)
  if (discogsNodes === 0 || hits.size < 8) {
    const fb = fallbackLabelNetwork(
      seeds,
      mode === "long" ? 40 : mode === "station" ? 18 : 28,
    );
    fb.forEach((t, i) => {
      bump(t, 95 - i, `rete curata: ${t.label}`, 2, 2);
    });
    if (fb.length && discogsNodes === 0) {
      networkNote = `rete curata All Inn↔Perlon · ${fb.length} dig (Discogs vuoto)`;
    }
  }

  // iTunes: solo Long (Short deve chiudere veloce)
  if (mode === "long") {
    try {
      const it = await scoutItunesArtists(seeds, 12);
      it.tracks.forEach((t) => bump(t, 110, "iTunes discografia artista", 1, 1));
    } catch {
      /* ignore */
    }
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
  const minDigs = mode === "long" ? 36 : mode === "station" ? 16 : 24;

  let ranked = Array.from(hits.values())
    .filter((h) => h.score >= 70)
    .filter((h) => isCorrelated(seeds, h.track, h.reasons.join(" ")))
    .filter((h) => !isHardOffLane(h.track)) // no reggae / fuori lane
    .filter((h) => {
      const reason = h.reasons.join(" ");
      const fromCurated = /rete curata/i.test(reason);
      if (fromCurated) return isClubDig(h.track, seedHints) || !isHardOffLane(h.track);
      return isClubDig(h.track, seedHints);
    })
    .filter((h) => {
      const g = resolveGenre(h.track.genre);
      if (g.slug === "dance-electro-pop") {
        return /rete curata|perlon|all\s*inn|rawax|cadenza/i.test(
          `${h.reasons.join(" ")} ${h.track.label}`,
        );
      }
      return true;
    })
    .filter((h) => !/mickey|topolino|disney/i.test(`${h.track.title} ${h.track.artist}`))
    .sort((a, b) => b.score - a.score || b.croceBuyers - a.croceBuyers);

  const seedArtistSet = new Set(
    seeds.flatMap((s) =>
      s.artist
        .toLowerCase()
        .split(/\s*(?:&|,|feat\.?|ft\.?|x)\s*/)
        .map((p) => p.trim())
        .filter((p) => p.length > 1),
    ),
  );

  ranked = diversify(ranked, cfg.out, seedArtistSet);

  // Mai 1 dig: se la rete è magra, riempi All Inn↔Perlon (anche se Discogs ha dato poco)
  if (ranked.length < minDigs) {
    const fb = fallbackLabelNetwork(seeds, minDigs - ranked.length + 8);
    const have = new Set(ranked.map((h) => itemKey(h.track.artist, h.track.title)));
    for (const t of fb) {
      const k = itemKey(t.artist, t.title);
      if (have.has(k) || isSeedOrOwned(t, seeds, ownedKeys)) continue;
      ranked.push({
        track: t,
        score: 88,
        croceBuyers: 2,
        reasons: [`rete curata: ${t.label}`],
        genre: resolveGenre(t.genre).name,
        seedLinks: 2,
      });
      have.add(k);
      if (ranked.length >= minDigs) break;
    }
    if (!networkNote.includes("curata") && fb.length) {
      networkNote = `${networkNote || "rete label"} · +curata ${fb.length}`;
    }
    ranked = diversify(ranked, cfg.out, seedArtistSet);
  }

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
    ? `Bandcamp live · ${networkNote || "rete label"}`
    : networkNote || "rete Discogs artista→label→artisti→label";

  return {
    tracks: ranked,
    bandcampLive,
    audioActive,
    method:
      DIGLIST_PHASE === 2 ? "diglist-user-croce+label" : "diglist-label-network",
    note: `${mode} · ${ranked.length} dig · ${diglistPhaseNote()} · ${src}${audioActive ? "" : " · audio off"}`,
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
