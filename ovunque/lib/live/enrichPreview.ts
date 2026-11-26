import type { Track } from "../types";
import { itunesSearch } from "./itunes";

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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
  const nt = norm(title);
  const na = norm(artist);
  const ht = norm(hit.title);
  const ha = norm(hit.artist);
  if (!nt || !na || !ht || !ha) return false;
  const titleOk = ht === nt || ht.includes(nt) || nt.includes(ht);
  const artistOk =
    ha === na || ha.includes(na) || na.includes(ha.split(" ")[0] || na);
  // titolo corto genérico ("coast to coast") → serve artista stretto
  if (nt.length <= 14) return ht === nt && artistOk;
  return titleOk && artistOk;
}

/**
 * Preview iTunes SOLO con match artista+titolo.
 * Mai fallback genere (attaccava Topolino / kids su dig underground).
 * Artwork solo se match stretto — mai copertina a caso.
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
          const hits = await itunesSearch(`${t.artist} ${t.title}`, 8);
          const match = hits.find(
            (h) =>
              !!h.previewUrl &&
              artistTitleMatch(h, t.artist, t.title) &&
              !isJunkArt(h.artworkUrl, h.title, h.artist),
          );
          if (!match?.previewUrl) return;
          out[i] = {
            ...out[i],
            previewUrl: match.previewUrl,
            artworkUrl:
              out[i].artworkUrl ||
              (match.artworkUrl && !isJunkArt(match.artworkUrl)
                ? match.artworkUrl
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

/** Singola traccia: artist + title → preview iTunes (match stretto). */
export async function lookupPreview(
  artist: string,
  title: string,
): Promise<{ previewUrl?: string; artworkUrl?: string } | null> {
  if (!artist || !title) return null;
  try {
    const hits = await itunesSearch(`${artist} ${title}`, 8);
    const match = hits.find(
      (h) =>
        !!h.previewUrl &&
        artistTitleMatch(h, artist, title) &&
        !isJunkArt(h.artworkUrl, h.title, h.artist),
    );
    if (!match?.previewUrl) return null;
    return {
      previewUrl: match.previewUrl,
      artworkUrl: isJunkArt(match.artworkUrl) ? undefined : match.artworkUrl,
    };
  } catch {
    return null;
  }
}
