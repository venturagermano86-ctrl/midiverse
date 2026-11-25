import type { Track } from "../types";
import { itunesSearch } from "./itunes";

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Per i dig consigliati senza preview: attacca previewUrl (+ artwork) da iTunes.
 */
export async function enrichPreviews(tracks: Track[], concurrency = 4): Promise<Track[]> {
  const out = [...tracks];
  const need = out
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => !t.previewUrl && t.title && t.artist);

  for (let n = 0; n < need.length; n += concurrency) {
    const batch = need.slice(n, n + concurrency);
    await Promise.all(
      batch.map(async ({ t, i }) => {
        try {
          const hits = await itunesSearch(`${t.artist} ${t.title}`, 5);
          const nt = norm(t.title);
          const na = norm(t.artist);
          let match =
            hits.find(
              (h) =>
                norm(h.title) === nt &&
                (norm(h.artist) === na ||
                  norm(h.artist).includes(na) ||
                  na.includes(norm(h.artist))),
            ) ||
            hits.find((h) => norm(h.title).includes(nt) || nt.includes(norm(h.title))) ||
            hits.find((h) => !!h.previewUrl);

          // Catalogo curato demo: niente match → preview del genere (sempre ▶)
          if (!match?.previewUrl) {
            const genreQ = `${t.genre || "electronic"} ${t.mood || "house"}`.trim();
            const genreHits = await itunesSearch(genreQ, 8);
            match = genreHits.find((h) => !!h.previewUrl) ?? genreHits[0];
          }
          if (!match?.previewUrl) return;
          out[i] = {
            ...t,
            previewUrl: match.previewUrl,
            artworkUrl: t.artworkUrl || match.artworkUrl,
          };
        } catch {
          /* leave without preview */
        }
      }),
    );
  }

  return out;
}

/** Singola traccia: artist + title → preview iTunes. */
export async function lookupPreview(
  artist: string,
  title: string,
): Promise<{ previewUrl?: string; artworkUrl?: string } | null> {
  if (!artist || !title) return null;
  try {
    const hits = await itunesSearch(`${artist} ${title}`, 5);
    const nt = norm(title);
    const na = norm(artist);
    let match =
      hits.find((h) => norm(h.title) === nt && norm(h.artist).includes(na)) ||
      hits.find((h) => norm(h.title).includes(nt)) ||
      hits.find((h) => !!h.previewUrl);

    if (!match?.previewUrl) {
      const genreHits = await itunesSearch(`electronic ${artist}`.slice(0, 80), 8);
      match = genreHits.find((h) => !!h.previewUrl) ?? genreHits[0];
    }
    if (!match?.previewUrl) {
      const fallback = await itunesSearch("deep house techno", 6);
      match = fallback.find((h) => !!h.previewUrl) || match;
    }
    if (!match?.previewUrl) return null;
    return { previewUrl: match.previewUrl, artworkUrl: match.artworkUrl };
  } catch {
    return null;
  }
}
