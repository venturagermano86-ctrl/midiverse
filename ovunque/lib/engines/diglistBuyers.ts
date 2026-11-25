import { createHash } from "node:crypto";
import { TRACKS } from "../catalog";
import type { Track } from "../types";
import { inSeedTerritory } from "./digWeb";

/**
 * Motore Diglist reale:
 * 1) per ogni seed → acquirenti (buyers)
 * 2) per ogni acquirente → collezione
 * 3) incrocio: tracce che compaiono nelle collezioni di chi ha comprato i pick
 *    (soprattutto chi ha 2+ seed = "a croce")
 *
 * Buyers:
 * - reali: owner_sub da wishlist (chi ha salvato il seed)
 * - sintetici Bandcamp-style: fan deterministici per densità quando la community è vuota
 */

export type BuyerCollection = {
  buyerId: string;
  trackIds: Set<string>;
  /** quanti seed ha questo buyer (1 = ha un pick, ≥2 = croce) */
  seedHits: number;
};

function hashFan(seed: string, i: number): string {
  return createHash("sha1").update(`${seed}::fan::${i}`).digest("hex").slice(0, 12);
}

function trackKey(t: Track): string {
  return `${t.artist.toLowerCase().trim()}|${t.title.toLowerCase().trim()}`;
}

/** Fan sintetici: condividono cluster di catalogo come collector Bandcamp. */
function syntheticBuyersForSeed(seed: Track, fanCount = 14): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const pool = TRACKS.filter((t) => t.id !== seed.id);

  // Vicini digger: artista / label / genere+BPM — MAI pool random
  const neighbors = pool
    .filter((t) => inSeedTerritory([seed], t))
    .map((t) => {
      let s = 0;
      if (t.artist === seed.artist) s += 50;
      if (t.label && t.label === seed.label && t.label !== "—") s += 35;
      if (t.genre === seed.genre) s += 22;
      if (seed.bpm && t.bpm && Math.abs(seed.bpm - t.bpm) <= 4) s += 24;
      const sharedRails = t.rails.filter((r) => seed.rails.includes(r) && r !== "novita");
      s += sharedRails.length * 4;
      return { t, s };
    })
    .filter((x) => x.s >= 35)
    .sort((a, b) => b.s - a.s)
    .slice(0, 20)
    .map((x) => x.t);

  // Se pochi vicini: solo stessa famiglia già filtrata con score≥22
  const base =
    neighbors.length >= 3
      ? neighbors
      : pool
          .filter((t) => inSeedTerritory([seed], t) && t.genre === seed.genre)
          .slice(0, 12);

  for (let i = 0; i < fanCount; i++) {
    const buyerId = `bc-fan-${hashFan(seed.id, i)}`;
    const col = new Set<string>();
    col.add(seed.id);
    // ogni fan prende un sottoinsieme diverso della "collezione affine"
    for (let j = 0; j < base.length; j++) {
      const take = (parseInt(hashFan(seed.id + buyerId, j).slice(0, 2), 16) + i + j) % 5 !== 0;
      if (take) col.add(base[j].id);
    }
    // overlap forte: primi fan condividono il nucleo
    for (const t of base.slice(0, 6)) {
      if (i < 8) col.add(t.id);
    }
    out.set(buyerId, col);
  }
  return out;
}

export type CroceHit = {
  trackId: string;
  /** buyer distinti che hanno questa traccia */
  buyers: number;
  /** quanti seed diversi sono collegati via buyer (croce) */
  seedLinks: number;
  /** buyer che possiedono ≥2 seed (croce forte Diglist) */
  multiSeedBuyers: number;
  score: number;
};

/**
 * Incrocio Diglist: buyers(seed) × collections(buyer).
 * `realBuyerCollections`: da wishlist DB (owner → set track_id).
 */
export function crossBuyersCollections(
  seeds: Track[],
  realBuyerCollections: BuyerCollection[],
): CroceHit[] {
  const seedIds = new Set(seeds.map((s) => s.id));
  const picked = seeds.slice(0, 6);
  if (picked.length === 0) return [];

  // buyerId → { collection, seedsOwned }
  const buyers = new Map<string, { col: Set<string>; seedsOwned: Set<string> }>();

  function addBuyer(buyerId: string, col: Set<string>, seedId: string) {
    let row = buyers.get(buyerId);
    if (!row) {
      row = { col: new Set(), seedsOwned: new Set() };
      buyers.set(buyerId, row);
    }
    Array.from(col).forEach((id) => row!.col.add(id));
    row.seedsOwned.add(seedId);
  }

  // 1) buyers reali da wishlist
  realBuyerCollections.forEach((b) => {
    Array.from(b.trackIds)
      .filter((id) => seedIds.has(id))
      .forEach((seedId) => addBuyer(b.buyerId, b.trackIds, seedId));
  });

  // 2) buyers sintetici Bandcamp-style (sempre, per densità Diglist)
  picked.forEach((seed) => {
    const synth = syntheticBuyersForSeed(seed);
    Array.from(synth.entries()).forEach(([buyerId, col]) => {
      addBuyer(buyerId, col, seed.id);
    });
  });

  // 3) score ogni traccia candidata nelle collezioni
  const acc = new Map<
    string,
    { buyers: Set<string>; seedLinks: Set<string>; multi: Set<string> }
  >();

  Array.from(buyers.entries()).forEach(([buyerId, row]) => {
    const multi = row.seedsOwned.size >= 2;
    Array.from(row.col).forEach((trackId) => {
      if (seedIds.has(trackId)) return;
      let hit = acc.get(trackId);
      if (!hit) {
        hit = { buyers: new Set(), seedLinks: new Set(), multi: new Set() };
        acc.set(trackId, hit);
      }
      hit.buyers.add(buyerId);
      Array.from(row.seedsOwned).forEach((s) => hit!.seedLinks.add(s));
      if (multi) hit.multi.add(buyerId);
    });
  });

  const hits: CroceHit[] = [];
  Array.from(acc.entries()).forEach(([trackId, h]) => {
    const buyersN = h.buyers.size;
    const seedLinks = h.seedLinks.size;
    const multiSeedBuyers = h.multi.size;
    // Diglist: croce multi-seed pesa moltissimo
    const score =
      multiSeedBuyers * 120 +
      seedLinks * 55 +
      buyersN * 8 +
      (seedLinks >= 2 ? 80 : 0);
    if (score < 40 && multiSeedBuyers === 0 && seedLinks < 2) return;
    hits.push({ trackId, buyers: buyersN, seedLinks, multiSeedBuyers, score });
  });

  return hits.sort((a, b) => b.score - a.score);
}

export function resolveTracksById(
  ids: string[],
  extras: Track[],
): Track[] {
  const map = new Map<string, Track>();
  for (const t of [...extras, ...TRACKS]) map.set(t.id, t);
  // also by artist|title for live extras
  const byKey = new Map<string, Track>();
  for (const t of extras) byKey.set(trackKey(t), t);

  const out: Track[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    const t = map.get(id);
    if (t && !seen.has(t.id)) {
      seen.add(t.id);
      out.push(t);
    }
  }
  return out;
}
