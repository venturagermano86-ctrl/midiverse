import type { Track } from "../types";
import { itunesSearch } from "./itunes";

function norm(s: string): string {
  return s
    .toLowerCase()
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
  return artist
    .replace(/\(\d+\)/g, " ")
    .replace(/\*/g, " ")
    .split(/\s*(?:&|,|feat\.?|ft\.?|\/|x)\s*/i)[0]
    ?.trim() || artist.trim();
}

/** Cover/spazzatura da scartare (Topolino, kids, cartoon…). */
function isJunkArt(url?: string, title?: string, artist?: string): boolean {
  const blob = `${url ?? ""} ${title ?? ""} ${artist ?? ""}`.toLowerCase();
  if (/mickey|topolino|disney|clubhouse|frozen|peppa|barbie|pokemon/i.test(blob))
    return true;
  return false;
}

function artistTitleMatch(
  hit: { title: string; artist: string },
  artist: string,
  title: string,
): boolean {
  const nt = norm(cleanTitle(title));
  const na = norm(cleanArtist(artist));
  const ht = norm(hit.title);
  const ha = norm(hit.artist);
  if (!nt || !na || !ht || !ha) return false;

  const artistOk =
    ha === na ||
    ha.includes(na) ||
    na.includes(ha) ||
    ha.split(" ").some((p) => p.length > 3 && na.includes(p)) ||
    na.split(" ").some((p) => p.length > 3 && ha.includes(p));

  if (!artistOk) return false;

  if (ht === nt || ht.includes(nt) || nt.includes(ht)) return true;

  // token overlap (Heike ↔ H.E.I.K.E.)
  const tTokens = nt.split(" ").filter((t) => t.length > 2);
  const hTokens = ht.split(" ").filter((t) => t.length > 2);
  if (tTokens.length === 0) return false;
  const hitCount = tTokens.filter((t) =>
    hTokens.some((h) => h.includes(t) || t.includes(h)),
  ).length;
  return hitCount >= Math.min(2, tTokens.length) || (tTokens.length === 1 && hitCount === 1);
}

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
 * Preview iTunes/Deezer con match artista+titolo (no fallback genere = niente Topolino).
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

/** Singola traccia: artist + title → preview (Deezer poi iTunes). */
export async function lookupPreview(
  artist: string,
  title: string,
): Promise<{ previewUrl?: string; artworkUrl?: string } | null> {
  if (!artist || !title) return null;
  const a = cleanArtist(artist);
  const t = cleanTitle(title) || title;
  const queries = [
    `${a} ${t}`,
    `artist:"${a}" track:"${t}"`,
    a,
  ];

  try {
    for (const q of queries) {
      const hits = await searchBoth(q);
      const match = hits.find(
        (h) =>
          !!h.previewUrl &&
          artistTitleMatch(h, artist, title) &&
          !isJunkArt(h.artworkUrl, h.title, h.artist),
      );
      if (match?.previewUrl) {
        return {
          previewUrl: match.previewUrl,
          artworkUrl: isJunkArt(match.artworkUrl) ? undefined : match.artworkUrl,
        };
      }
      // Ultimo tentativo sulla query artista: primo pezzo stesso artista
      if (q === a) {
        const same = hits.find(
          (h) =>
            !!h.previewUrl &&
            artistTitleMatch(
              { title: h.title, artist: h.artist },
              artist,
              h.title,
            ) &&
            !isJunkArt(h.artworkUrl, h.title, h.artist),
        );
        if (same?.previewUrl) {
          return {
            previewUrl: same.previewUrl,
            artworkUrl: isJunkArt(same.artworkUrl) ? undefined : same.artworkUrl,
          };
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}
