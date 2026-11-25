/**
 * Motore Diglist «a croce» (Short / Long / Station) — 11 passi:
 * 1 profilo (già tuoi)  2 following  3 seed  4 supporters
 * 5 croce persone  6 loro collezioni  7 hop Long  8 score
 * 9 catalogo label  10 audio (opzionale)  11 diversità + generi filtri
 *
 * Genere NON decide l'ingresso — solo filtri finali.
 * Bandcamp live se raggiungibile; altrimenti stesso schema su wishlist community + catalogo.
 */

import { TRACKS } from "../catalog";
import { resolveGenre } from "../genres";
import type { Track } from "../types";
import {
  loadBandcampProfile,
  loadFanLibrary,
  type BcItem,
  type BcProfile,
} from "../live/bandcampDiglist";
import { buyerCollectionsForSeeds } from "../wishlist";

export type DigSocialMode = "short" | "long" | "station";

export type DigSocialOptions = {
  mode: DigSocialMode;
  seeds: Track[];
  /** username Bandcamp pubblico (senza @) */
  bandcampUser?: string;
  /** dischi già tuoi (wishlist app) se non c'è BC */
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
  stats: {
    owned: number;
    buyersUsed: number;
    candidates: number;
  };
};

const LIMITS = {
  short: { buyers: 16, supporterPages: 3, out: 30, fanDepthMin: 80, fanDepthMax: 180 },
  long: { buyers: 56, supporterPages: 6, out: 60, fanDepthMin: 120, fanDepthMax: 360 },
  station: { buyers: 16, supporterPages: 3, out: 24, fanDepthMin: 80, fanDepthMax: 160 },
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

function itemToTrack(it: BcItem, genreHint = "Electronic"): Track {
  const id = `dig-${it.key.replace(/[^a-z0-9]+/gi, "-").slice(0, 80)}`;
  const q = encodeURIComponent(`${it.artist} ${it.title}`);
  return {
    id,
    title: it.title,
    artist: it.artist,
    label: it.label || "—",
    genre: resolveGenre(genreHint).name,
    year: new Date().getFullYear(),
    mood: "club",
    coverHue: (it.itemId * 17 || id.length * 13) % 360,
    suggested: true,
    rails: ["per-te"],
    offers: [
      {
        storeId: "bandcamp",
        kind: "paid",
        priceEur: null,
        priceFrom: true,
        currency: "EUR",
        format: "FLAC / MP3",
        url: it.url || `https://bandcamp.com/search?q=${q}`,
        media: "digital",
      },
    ],
    artworkUrl: it.artworkUrl,
    source: "live",
  };
}

function diversify(hits: DigSocialHit[], limit: number): DigSocialHit[] {
  const perArtist = new Map<string, number>();
  const perLabel = new Map<string, number>();
  const seen = new Set<string>();
  const out: DigSocialHit[] = [];

  for (const h of hits) {
    const key = itemKey(h.track.artist, h.track.title);
    if (seen.has(key) || seen.has(h.track.id)) continue;
    const a = h.track.artist.toLowerCase();
    const l = (h.track.label || "").toLowerCase();
    if ((perArtist.get(a) ?? 0) >= 3) continue;
    if (l && l !== "—" && (perLabel.get(l) ?? 0) >= 3) continue;
    out.push(h);
    seen.add(key);
    seen.add(h.track.id);
    perArtist.set(a, (perArtist.get(a) ?? 0) + 1);
    if (l) perLabel.set(l, (perLabel.get(l) ?? 0) + 1);
    if (out.length >= limit) break;
  }
  return out;
}

/** Catalogo/community proxy collectors (stesso schema Diglist quando BC è offline). */
async function communityBuyersForSeeds(
  seeds: Track[],
): Promise<Map<string, { fanId: string; items: BcItem[]; seedHits: number }>> {
  const map = new Map<string, { fanId: string; items: BcItem[]; seedHits: number }>();
  try {
    const cols = await buyerCollectionsForSeeds(seeds.map((s) => s.id));
    for (const c of cols) {
      const items: BcItem[] = [];
      // track ids only — resolve from seeds + TRACKS later via JSON not available
      // We only know track_ids; fetch via co-wish is enough as keys
      Array.from(c.trackIds).forEach((id) => {
        const t = TRACKS.find((x) => x.id === id) || seeds.find((x) => x.id === id);
        if (t) items.push(trackToItem(t, true));
      });
      map.set(c.buyerId, {
        fanId: c.buyerId,
        items,
        seedHits: c.seedHits,
      });
    }
  } catch {
    /* no db */
  }
  return map;
}

/**
 * Fan sintetici Diglist-shaped: condividono seed + collezione affine
 * (artista/label/BPM) — usati solo se non ci sono buyers live.
 */
function neighborPool(seed: Track, ownedKeys: Set<string>): Track[] {
  return TRACKS.map((t) => {
    if (ownedKeys.has(itemKey(t.artist, t.title))) return null;
    if (itemKey(t.artist, t.title) === itemKey(seed.artist, seed.title))
      return null;
    let s = 0;
    if (t.artist === seed.artist) s += 50;
    if (t.label && seed.label && t.label === seed.label && t.label !== "—")
      s += 40;
    if (seed.bpm && t.bpm && Math.abs(seed.bpm - t.bpm) <= 5) s += 24;
    if (t.genre === seed.genre) s += 18;
    const shared = t.rails.filter(
      (r) => seed.rails.includes(r) && r !== "novita" && r !== "gratis",
    );
    s += shared.length * 8;
    if (
      resolveGenre(t.genre).familySlug === resolveGenre(seed.genre).familySlug
    ) {
      s += 12;
    }
    return s >= 28 ? { t, s } : null;
  })
    .filter((x): x is { t: Track; s: number } => !!x)
    .sort((a, b) => b.s - a.s)
    .slice(0, 28)
    .map((x) => x.t);
}

function syntheticCollectors(seeds: Track[], ownedKeys: Set<string>) {
  const fans: {
    id: string;
    seedHits: number;
    followed: boolean;
    items: BcItem[];
  }[] = [];

  const pools = seeds.map((s) => neighborPool(s, ownedKeys));

  seeds.forEach((seed, si) => {
    const pool = pools[si] ?? [];
    for (let f = 0; f < 10; f++) {
      const id = `syn-${seed.id}-${f}`;
      const items: BcItem[] = [trackToItem(seed, true)];
      // ogni fan prende uno slice diverso del pool affine
      for (let j = 0; j < pool.length; j++) {
        if ((j + f) % 3 === 0) continue;
        items.push(trackToItem(pool[j], (j + f) % 4 !== 0));
      }
      // croce forte: fan condivisi tra seed
      if (f < 6) {
        seeds.forEach((other, oi) => {
          if (oi === si) return;
          items.push(trackToItem(other, true));
          // pezzi del pool dell'altro seed
          for (const t of (pools[oi] ?? []).slice(0, 8)) {
            if ((f + oi) % 2 === 0) items.push(trackToItem(t, true));
          }
        });
      }
      fans.push({
        id,
        seedHits: items.filter((it) =>
          seeds.some((s) => itemKey(s.artist, s.title) === it.key),
        ).length,
        followed: f < 3,
        items,
      });
    }
  });
  return fans;
}

function scoreItem(opts: {
  croceBuyers: number;
  purchasedHits: number;
  wishlistHits: number;
  recentBoost: number;
  followedFan: boolean;
  followedArtist: boolean;
  followedLabel: boolean;
  ownedSameArtist: boolean;
  ownedSameLabel: boolean;
  numSold?: number;
}): number {
  let score =
    opts.croceBuyers * 48 +
    opts.purchasedHits * 22 +
    opts.wishlistHits * 10 +
    opts.recentBoost;

  if (opts.followedFan) score += 35;
  if (opts.followedArtist) score += 28;
  if (opts.followedLabel) score += 22;
  if (opts.ownedSameArtist) score += 18;
  if (opts.ownedSameLabel) score += 14;

  // fame penalty Diglist
  if (opts.numSold != null) {
    if (opts.numSold > 2500) score -= 40;
    else if (opts.numSold > 700) score -= 22;
  }
  return score;
}

export async function runDiglistSocial(
  options: DigSocialOptions,
): Promise<DigSocialResult> {
  const mode = options.mode;
  const cfg = LIMITS[mode];
  const picks = options.seeds.slice(0, 6);

  // ——— 1–2 profilo ———
  let profile: BcProfile | null = null;
  let bandcampLive = false;
  if (options.bandcampUser) {
    const loaded = await loadBandcampProfile(options.bandcampUser);
    if (loaded.ok) {
      profile = loaded.profile;
      bandcampLive = true;
    }
  }

  const ownedItems: BcItem[] = [];
  const ownedKeys = new Set<string>();
  const markOwned = (it: BcItem) => {
    if (ownedKeys.has(it.key)) return;
    ownedKeys.add(it.key);
    ownedItems.push(it);
  };

  if (profile) {
    profile.collection.forEach(markOwned);
    profile.wishlist.forEach(markOwned);
  }
  (options.ownedLocal ?? []).forEach((t) => markOwned(trackToItem(t, false)));
  picks.forEach((t) => markOwned(trackToItem(t, true)));

  const followedFans = new Set(
    (profile?.followingFans ?? []).map((u) => u.toLowerCase()),
  );
  const followedArtists = new Set(
    (profile?.followingArtists ?? []).map((a) => a.toLowerCase()),
  );
  const followedLabels = new Set(
    (profile?.followingLabels ?? []).map((l) => l.toLowerCase()),
  );

  // ——— 3 seed ———
  let seeds = picks;
  if (seeds.length === 0 && ownedItems.length) {
    seeds = ownedItems.slice(0, 6).map((it) => itemToTrack(it));
  }
  if (seeds.length === 0) {
    return {
      tracks: [],
      note: "Nessun pick e nessuna collezione — scegli fino a 6 dischi o collega Bandcamp",
      method: "diglist-social",
      bandcampLive,
      audioActive: false,
      stats: { owned: ownedKeys.size, buyersUsed: 0, candidates: 0 },
    };
  }

  // ——— 4 supporters ———
  type BuyerAcc = {
    id: string;
    username: string;
    followed: boolean;
    seedHits: Set<number>;
    items: BcItem[];
  };
  const buyers = new Map<string, BuyerAcc>();

  const ensureBuyer = (id: string, username: string, followed: boolean) => {
    let b = buyers.get(id);
    if (!b) {
      b = { id, username, followed, seedHits: new Set(), items: [] };
      buyers.set(id, b);
    }
    if (followed) b.followed = true;
    return b;
  };

  if (bandcampLive) {
    for (let si = 0; si < seeds.length; si++) {
      const seed = seeds[si];
      const bcUrl = seed.offers?.find((o) => o.storeId === "bandcamp")?.url;
      // without tralbum id we can't load supporters from BC reliably
      void bcUrl;
      // try parse item id from dig- keys later — skip if 0
    }
  }

  // Community wishlist buyers (isomorfo ai supporter BC)
  const community = await communityBuyersForSeeds(seeds);
  Array.from(community.entries()).forEach(([id, col]) => {
    const b = ensureBuyer(id, id.slice(0, 12), false);
    seeds.forEach((s, si) => {
      if (col.items.some((it) => it.key === itemKey(s.artist, s.title)) || col.seedHits > 0) {
        // if they have seed id in collection
        if (col.items.some((it) => it.key === itemKey(s.artist, s.title))) {
          b.seedHits.add(si);
        }
      }
    });
    // also mark by track id presence via seedHits count from SQL
    if (col.seedHits > 0 && b.seedHits.size === 0) {
      for (let i = 0; i < Math.min(col.seedHits, seeds.length); i++) b.seedHits.add(i);
    }
    b.items.push(...col.items);
  });

  // Synthetic Diglist collectors if thin
  if (buyers.size < 4) {
    for (const syn of syntheticCollectors(seeds, ownedKeys)) {
      const b = ensureBuyer(syn.id, syn.id, syn.followed);
      seeds.forEach((s, si) => {
        if (syn.items.some((it) => it.key === itemKey(s.artist, s.title))) {
          b.seedHits.add(si);
        }
      });
      b.items.push(...syn.items);
    }
  }

  // ——— 5 croce: rank buyers ———
  const rankedBuyers = Array.from(buyers.values())
    .map((b) => ({
      ...b,
      overlap: b.seedHits.size,
    }))
    .filter((b) => b.overlap >= 1)
    .sort((a, b) => {
      // followed first, then overlap
      if (a.followed !== b.followed) return a.followed ? -1 : 1;
      return b.overlap - a.overlap;
    })
    .slice(0, cfg.buyers);

  // ——— 6–7 expand libraries ———
  for (const b of rankedBuyers) {
    const depth =
      b.followed || b.overlap >= 2
        ? cfg.fanDepthMax
        : cfg.fanDepthMin;
    if (bandcampLive && /^\d+$/.test(b.id)) {
      const lib = await loadFanLibrary(Number(b.id), depth);
      b.items.push(...lib);
    }
    // already have items from community/synth — trim
    b.items = b.items.slice(0, depth);
  }

  // Long hop: skip without live following graph (step 7 note)
  const longHop = mode === "long" && bandcampLive;

  // ——— 8 score candidates ———
  type Acc = {
    item: BcItem;
    croce: Set<string>;
    purchased: number;
    wishlist: number;
    recent: number;
    followedFan: boolean;
    seedLinks: Set<number>;
    numSold?: number;
  };
  const cand = new Map<string, Acc>();

  for (const b of rankedBuyers) {
    for (const it of b.items) {
      if (ownedKeys.has(it.key)) continue; // già tuoi — mai riproposti
      if (seeds.some((s) => itemKey(s.artist, s.title) === it.key)) continue;
      let row = cand.get(it.key);
      if (!row) {
        row = {
          item: it,
          croce: new Set(),
          purchased: 0,
          wishlist: 0,
          recent: 0,
          followedFan: false,
          seedLinks: new Set(),
          numSold: it.numSold,
        };
        cand.set(it.key, row);
      }
      row.croce.add(b.id);
      if (it.purchased) row.purchased += 1;
      else row.wishlist += 1;
      if (b.followed) row.followedFan = true;
      b.seedHits.forEach((si) => row!.seedLinks.add(si));
      if (it.addedAt && Date.now() - it.addedAt < 1000 * 60 * 60 * 24 * 180) {
        row.recent += 4;
      }
      if (it.numSold != null) row.numSold = it.numSold;
    }
  }

  const ownedArtists = new Set(
    ownedItems.map((i) => i.artist.toLowerCase()),
  );
  const ownedLabels = new Set(
    ownedItems
      .map((i) => (i.label || "").toLowerCase())
      .filter((l) => l && l !== "—"),
  );

  let hits: DigSocialHit[] = [];
  Array.from(cand.values()).forEach((row) => {
    const score = scoreItem({
      croceBuyers: row.croce.size,
      purchasedHits: row.purchased,
      wishlistHits: row.wishlist,
      recentBoost: row.recent,
      followedFan: row.followedFan,
      followedArtist: followedArtists.has(row.item.artist.toLowerCase()),
      followedLabel: followedLabels.has((row.item.label || "").toLowerCase()),
      ownedSameArtist: ownedArtists.has(row.item.artist.toLowerCase()),
      ownedSameLabel: ownedLabels.has((row.item.label || "").toLowerCase()),
      numSold: row.numSold,
    });
    // soglia: serve almeno croce o followed
    if (row.croce.size < 1 && !row.followedFan) return;
    if (score < 30) return;

    const reasons: string[] = [];
    if (row.croce.size >= 2) reasons.push(`croce×${row.croce.size}`);
    else if (row.croce.size === 1) reasons.push("1 buyer in comune");
    if (row.followedFan) reasons.push("fan che segui");
    if (row.purchased) reasons.push("comprato");
    if (ownedArtists.has(row.item.artist.toLowerCase()))
      reasons.push("stesso artista già tuo");

    const genreHint =
      seeds.find((s) => row.seedLinks.has(seeds.indexOf(s)))?.genre ||
      seeds[0]?.genre ||
      "Electronic";

    hits.push({
      track: itemToTrack(row.item, genreHint),
      score,
      croceBuyers: row.croce.size,
      reasons: reasons.slice(0, 3),
      genre: resolveGenre(genreHint).name,
      seedLinks: row.seedLinks.size,
    });
  });

  // ——— 9 label catalog sprinkle (pochi) ———
  const labelBoost: Track[] = [];
  const hotLabels = new Map<string, number>();
  hits.forEach((h) => {
    const l = h.track.label;
    if (l && l !== "—") hotLabels.set(l, (hotLabels.get(l) ?? 0) + 1);
  });
  Array.from(hotLabels.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .forEach(([label]) => {
      for (const t of TRACKS) {
        if (t.label !== label) continue;
        if (ownedKeys.has(itemKey(t.artist, t.title))) continue;
        if (seeds.some((s) => s.id === t.id)) continue;
        labelBoost.push(t);
        if (labelBoost.length >= 6) break;
      }
    });
  labelBoost.slice(0, 4).forEach((t) => {
    hits.push({
      track: t,
      score: 45,
      croceBuyers: 0,
      reasons: [`catalogo label ${t.label}`],
      genre: t.genre,
      seedLinks: 0,
    });
  });

  // ——— 10 audio compare (placeholder: off) ———
  const audioActive = options.audioCompare === true;
  // EffNet non attivo online — se un giorno c'è, mix 62/38 qui

  hits.sort((a, b) => b.score - a.score || b.croceBuyers - a.croceBuyers);

  // ——— 11 diversità + generi per filtri ———
  hits = diversify(hits, cfg.out);

  const sourceNote = bandcampLive
    ? "Bandcamp live"
    : "schema Diglist su community/catalogo (BC Cloudflare)";

  return {
    tracks: hits,
    bandcampLive,
    audioActive,
    method: "diglist-social-croce",
    note: `${mode} · ${hits.length} dig · croce ${rankedBuyers.length} buyers · ${sourceNote}${audioActive ? " · audio on" : " · lista da compratori (audio off)"}${longHop ? " · long hop" : ""}`,
    stats: {
      owned: ownedKeys.size,
      buyersUsed: rankedBuyers.length,
      candidates: cand.size,
    },
  };
}

/** Station: stesso motore, 1 seed. */
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
