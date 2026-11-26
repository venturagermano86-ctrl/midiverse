/**
 * Scout iTunes: altre tracce dello STESSO artista dei pick (discografia).
 * Mai search per genere.
 */

import { itunesSearch } from "./itunes";
import type { Track } from "../types";
import { resolveGenre } from "../genres";
import { isClubDig } from "../engines/clubFilter";

function norm(s: string): string {
  return s.toLowerCase().trim();
}

function sameArtistFamily(seedArtist: string, candidateArtist: string): boolean {
  const a = norm(seedArtist);
  const b = norm(candidateArtist);
  if (!a || !b) return false;
  if (a === b) return true;
  // feat / & splits
  const parts = a.split(/\s*(?:&|,|feat\.?|ft\.?|x)\s*/i);
  return parts.some((p) => p.length > 2 && (b.includes(p) || p.includes(b)));
}

function familyOk(seedGenre: string, t: Track): boolean {
  const sf = resolveGenre(seedGenre).familySlug;
  const tf = resolveGenre(t.genre).familySlug;
  if (sf === tf) return true;
  // house ↔ tech-house ok
  if (
    (sf === "house" || sf === "techno") &&
    (tf === "house" || tf === "techno")
  ) {
    return resolveGenre(t.genre).slug.includes("house") || sf === tf;
  }
  return false;
}

export async function scoutItunesArtists(
  seeds: Track[],
  limit = 16,
): Promise<{ tracks: Track[]; note: string }> {
  const picked = seeds.slice(0, 6);
  const artists = Array.from(new Set(picked.map((s) => s.artist))).slice(0, 4);
  const seedKeys = new Set(
    picked.map((s) => `${norm(s.artist)}|${norm(s.title)}`),
  );
  const out: Track[] = [];
  const seen = new Set<string>();

  for (const artist of artists) {
    try {
      const hits = await itunesSearch(artist, 12);
      for (const t of hits) {
        if (!sameArtistFamily(artist, t.artist)) continue;
        const key = `${norm(t.artist)}|${norm(t.title)}`;
        if (seedKeys.has(key) || seen.has(key)) continue;
        // genere: almeno un seed nella stessa family + club only
        const ok = picked.some((s) => familyOk(s.genre, t));
        if (!ok) continue;
        if (!isClubDig(t, artists)) continue;
        seen.add(key);
        out.push(t);
        if (out.length >= limit) break;
      }
    } catch {
      /* ignore */
    }
    if (out.length >= limit) break;
  }

  return {
    tracks: out.slice(0, limit),
    note:
      out.length > 0
        ? `iTunes discografia · ${out.length} dello stesso artista`
        : "iTunes: nessuna discografia artista",
  };
}
