import type { Track } from "../types";
import { itunesSearch } from "./itunes";

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Togli rumore Discogs: EP, (3), *, Remixes… */
function cleanTitle(title: string): string {
  return title
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\b(e\.?p\.?|ep|lp|remixes?|rmx|edit|rework|vol\.?\s*\d+)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanArtist(artist: string): string {
  return (
    artist
      .replace(/\(\d+\)/g, " ")
      .replace(/\*/g, " ")
      .split(/\s*(?:&|,|feat\.?|ft\.?|\/| x )\s*/i)[0]
      ?.trim() || artist.trim()
  );
}

function tokens(s: string): string[] {
  return norm(s)
    .split(" ")
    .filter((t) => t.length >= 2);
}

/** Cover/spazzatura da scartare (Topolino, kids, cartoon…). */
function isJunkArt(url?: string, title?: string, artist?: string): boolean {
  const blob = `${url ?? ""} ${title ?? ""} ${artist ?? ""}`.toLowerCase();
  if (/mickey|topolino|disney|clubhouse|frozen|peppa|barbie|pokemon/i.test(blob))
    return true;
  return false;
}

/**
 * Score 0–100. Solo match forti: stesso artista + titolo (o quasi).
 * Mai “primo risultato a caso” dello stesso genere / artista solo.
 */
export function scorePreviewMatch(
  hit: { title: string; artist: string },
  artist: string,
  title: string,
): number {
  const wantA = norm(cleanArtist(artist));
  const wantT = norm(cleanTitle(title) || title);
  const hitA = norm(hit.artist);
  const hitT = norm(cleanTitle(hit.title) || hit.title);
  if (!wantA || !wantT || !hitA || !hitT) return 0;

  // Artista
  let artistScore = 0;
  if (hitA === wantA) artistScore = 50;
  else if (hitA.includes(wantA) || wantA.includes(hitA)) artistScore = 42;
  else {
    const wa = tokens(wantA);
    const ha = tokens(hitA);
    if (!wa.length || !ha.length) return 0;
    const overlap = wa.filter((t) => ha.some((h) => h === t || (t.length > 3 && (h.includes(t) || t.includes(h)))));
    const cov = overlap.length / wa.length;
    if (cov < 0.6) return 0; // artista diverso → stop
    artistScore = Math.round(cov * 40);
  }

  // Titolo — obbligatorio
  let titleScore = 0;
  if (hitT === wantT) titleScore = 50;
  else if (hitT.includes(wantT) || wantT.includes(hitT)) titleScore = 44;
  else {
    const wt = tokens(wantT);
    const ht = tokens(hitT);
    if (!wt.length) return 0;
    const overlap = wt.filter((t) =>
      ht.some((h) => h === t || (t.length > 3 && (h.includes(t) || t.includes(h)))),
    );
    const cov = overlap.length / wt.length;
    // Serve almeno metà dei token titolo (min 1 se titolo corto)
    const need = wt.length === 1 ? 1 : Math.ceil(wt.length * 0.6);
    if (overlap.length < need) return 0;
    titleScore = Math.round(cov * 45);
  }

  return artistScore + titleScore;
}

/** Accetta solo match ≥ soglia (niente audio “simile”). */
export const PREVIEW_MIN_SCORE = 78;

type PreviewHit = { previewUrl: string; artworkUrl?: string; title: string; artist: string };

async function deezerSearch(term: string, limit = 8): Promise<PreviewHit[]> {
  try {
    const url = `https://api.deezer.com/search?q=${encodeURIComponent(term)}&limit=${limit}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      data?: {
        title?: string;
        preview?: string;
        artist?: { name?: string };
        album?: { cover_medium?: string; cover_xl?: string };
      }[];
    };
    return (data.data ?? [])
      .filter((r) => r.preview && r.title && r.artist?.name)
      .map((r) => ({
        title: r.title!,
        artist: r.artist!.name!,
        previewUrl: r.preview!,
        artworkUrl: r.album?.cover_xl || r.album?.cover_medium,
      }));
  } catch {
    return [];
  }
}

async function searchBoth(term: string): Promise<PreviewHit[]> {
  const [itunes, deezer] = await Promise.all([
    itunesSearch(term, 8)
      .then((hits) =>
        hits
          .filter((h) => h.previewUrl)
          .map((h) => ({
            title: h.title,
            artist: h.artist,
            previewUrl: h.previewUrl!,
            artworkUrl: h.artworkUrl,
          })),
      )
      .catch(() => [] as PreviewHit[]),
    deezerSearch(term, 8),
  ]);
  return [...deezer, ...itunes];
}

/**
 * Preview iTunes/Deezer con match stretto artista+titolo.
 * Nessun fallback “qualsiasi pezzo dello stesso artista”.
 */
export async function enrichPreviews(
  tracks: Track[],
  concurrency = 4,
): Promise<Track[]> {
  const out = [...tracks];
  const need = out
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => !t.previewUrl && t.title && t.artist);

  for (let n = 0; n < need.length; n += concurrency) {
    const batch = need.slice(n, n + concurrency);
    await Promise.all(
      batch.map(async ({ t, i }) => {
        try {
          if (isJunkArt(t.artworkUrl, t.title, t.artist)) {
            out[i] = { ...t, artworkUrl: undefined };
          }
          const hit = await lookupPreview(t.artist, t.title);
          if (!hit?.previewUrl) return;
          out[i] = {
            ...out[i],
            previewUrl: hit.previewUrl,
            artworkUrl:
              out[i].artworkUrl ||
              (hit.artworkUrl && !isJunkArt(hit.artworkUrl)
                ? hit.artworkUrl
                : undefined),
          };
        } catch {
          /* leave without preview */
        }
      }),
    );
  }

  return out;
}

/** Singola traccia: artist + title → preview solo se è QUELLA traccia. */
export async function lookupPreview(
  artist: string,
  title: string,
): Promise<{ previewUrl?: string; artworkUrl?: string; score?: number } | null> {
  if (!artist || !title) return null;
  const a = cleanArtist(artist);
  const t = cleanTitle(title) || title;
  // Solo query con artista E titolo — mai artista da solo (attacca audio sbagliato)
  const queries = [`${a} ${t}`, `"${a}" "${t}"`];

  try {
    let best: PreviewHit | null = null;
    let bestScore = 0;

    for (const q of queries) {
      const hits = await searchBoth(q);
      for (const h of hits) {
        if (!h.previewUrl) continue;
        if (isJunkArt(h.artworkUrl, h.title, h.artist)) continue;
        const score = scorePreviewMatch(h, artist, title);
        if (score > bestScore) {
          bestScore = score;
          best = h;
        }
      }
      if (bestScore >= 95) break; // match praticamente esatto
    }

    if (!best || bestScore < PREVIEW_MIN_SCORE) return null;

    return {
      previewUrl: best.previewUrl,
      artworkUrl: isJunkArt(best.artworkUrl) ? undefined : best.artworkUrl,
      score: bestScore,
    };
  } catch {
    return null;
  }
}
