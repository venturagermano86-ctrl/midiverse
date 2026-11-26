/**
 * Scout Diglist via Discogs — SOLO fili forti:
 * artist discography + label roster (label reale da match Discogs).
 * Niente dump stile, niente label fake ("X", "—").
 */

import type { Track } from "../types";
import { resolveGenre } from "../genres";

const UA = "OvunqueDiglist/1.0 +https://ovunque.apps.grok.bot";

const BAD_LABELS = new Set([
  "x",
  "-",
  "—",
  "unknown",
  "not on label",
  "self-released",
  "self released",
  "n/a",
  "na",
  "none",
  "free drop",
  "various",
  "not on label (nol)",
]);

type DiscogsSearchHit = {
  id: number;
  title?: string;
  label?: string[];
  style?: string[];
  genre?: string[];
  year?: string;
  type?: string;
  thumb?: string;
  cover_image?: string;
};

type ScoutNode = {
  discogsId: number;
  title: string;
  artist: string;
  labels: string[];
  styles: string[];
  year?: number;
  artworkUrl?: string;
  seedLinks: Set<number>;
  via: Set<string>;
  score: number;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function discogsGet<T>(
  path: string,
  params: Record<string, string>,
): Promise<T | null> {
  const q = new URLSearchParams(params);
  try {
    const res = await fetch(`https://api.discogs.com${path}?${q}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function parseTitleArtist(raw: string): { artist: string; title: string } {
  const parts = raw.split(" - ");
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), title: parts.slice(1).join(" - ").trim() };
  }
  return { artist: "Unknown", title: raw.trim() };
}

function isRealLabel(label: string): boolean {
  const l = label.trim().toLowerCase();
  if (l.length < 3) return false;
  if (BAD_LABELS.has(l)) return false;
  if (/^[\d\W]+$/.test(l)) return false;
  // scarta meme / spam corti
  if (l.length <= 2) return false;
  return true;
}

function looksLikeSpam(artist: string, title: string): boolean {
  const s = `${artist} ${title}`;
  // troppi caratteri non-latini → spesso junk Discogs
  const latin = (s.match(/[A-Za-z0-9]/g) || []).length;
  if (latin < 4) return true;
  if (/пиздец|какашк|lyсина|drone x heart/i.test(s)) return true;
  if (title.length < 2 || artist.length < 2) return true;
  if (/^various/i.test(artist)) return true;
  return false;
}

function styleOverlap(a: string[], b: string[]): number {
  const nb = new Set(b.map((x) => x.toLowerCase()));
  let n = 0;
  for (const s of a) if (nb.has(s.toLowerCase())) n++;
  return n;
}

/** Stili compatibili house/techno family — soft. */
function stylesCompatible(seedStyles: string[], hitStyles: string[]): boolean {
  if (!seedStyles.length) return true;
  if (!hitStyles.length) return true; // Discogs a volte senza style
  if (styleOverlap(seedStyles, hitStyles) > 0) return true;
  const seed = seedStyles.map((s) => s.toLowerCase()).join(" ");
  const hit = hitStyles.map((s) => s.toLowerCase()).join(" ");
  const housey = /house|tech house|deep house|afro|disco/;
  const technoy = /techno|minimal|acid|industrial/;
  if (housey.test(seed) && housey.test(hit)) return true;
  if (technoy.test(seed) && technoy.test(hit)) return true;
  if (housey.test(seed) && technoy.test(hit)) return false;
  if (technoy.test(seed) && housey.test(hit) && !/tech house/.test(hit))
    return false;
  return false;
}

function stylesToGenre(styles: string[], fallback: string): string {
  if (!styles.length) return fallback;
  for (const s of styles) {
    const g = resolveGenre(s);
    if (g.slug !== "dance-electro-pop") return g.name;
  }
  return resolveGenre(styles[0]).name;
}

function toTrack(node: ScoutNode, genreFallback: string): Track {
  const genre = stylesToGenre(node.styles, genreFallback);
  const label = node.labels.find(isRealLabel) ?? node.labels[0] ?? "—";
  const q = encodeURIComponent(`${node.artist} ${node.title}`);
  return {
    id: `discogs-${node.discogsId}`,
    title: node.title.slice(0, 120),
    artist: node.artist.slice(0, 120),
    label: label.slice(0, 80),
    genre,
    year: node.year ?? new Date().getFullYear(),
    mood: "club",
    coverHue: (node.discogsId * 37) % 360,
    suggested: true,
    rails: ["per-te"],
    offers: [
      {
        storeId: "discogs",
        kind: "paid",
        priceEur: null,
        priceFrom: true,
        currency: "EUR",
        format: "Vinyl / Digi",
        url: `https://www.discogs.com/release/${node.discogsId}`,
        media: "vinyl",
      },
      {
        storeId: "bandcamp",
        kind: "paid",
        priceEur: null,
        priceFrom: true,
        currency: "EUR",
        format: "FLAC / MP3",
        url: `https://bandcamp.com/search?q=${q}`,
        media: "digital",
      },
    ],
    artworkUrl: node.artworkUrl,
    source: "live",
  };
}

function bump(
  map: Map<number, ScoutNode>,
  hit: DiscogsSearchHit,
  seedIdx: number,
  pts: number,
  via: string,
  seedStyles: string[],
) {
  if (!hit.id) return;
  const { artist, title } = parseTitleArtist(hit.title ?? "");
  if (looksLikeSpam(artist, title)) return;
  const styles = hit.style ?? [];
  if (!stylesCompatible(seedStyles, styles)) return;

  let row = map.get(hit.id);
  if (!row) {
    row = {
      discogsId: hit.id,
      title,
      artist,
      labels: (hit.label ?? []).filter(isRealLabel),
      styles,
      year: hit.year ? parseInt(hit.year, 10) : undefined,
      artworkUrl: hit.cover_image || hit.thumb,
      seedLinks: new Set(),
      via: new Set(),
      score: 0,
    };
    map.set(hit.id, row);
  }
  row.seedLinks.add(seedIdx);
  row.via.add(via);
  row.score += pts + styleOverlap(styles, seedStyles) * 15;
  if (row.seedLinks.size >= 2) row.score += 100;
}

export async function scoutDiscogsGraph(
  seeds: Track[],
  limit = 24,
): Promise<{ tracks: Track[]; note: string; nodes: number }> {
  const picked = seeds.slice(0, 6);
  if (!picked.length) return { tracks: [], note: "no seeds", nodes: 0 };

  const acc = new Map<number, ScoutNode>();
  const seedMeta: {
    styles: string[];
    labels: string[];
    artists: string[];
    seedIds: string[];
  }[] = [];

  for (let i = 0; i < picked.length; i++) {
    const seed = picked[i];
    // query stretta: artista + titolo
    const data = await discogsGet<{ results?: DiscogsSearchHit[] }>(
      "/database/search",
      {
        artist: seed.artist,
        track: seed.title,
        type: "release",
        per_page: "8",
      },
    );
    await sleep(250);

    let hits = data?.results ?? [];
    if (hits.length === 0) {
      const fallback = await discogsGet<{ results?: DiscogsSearchHit[] }>(
        "/database/search",
        {
          q: `"${seed.artist}" "${seed.title}"`,
          type: "release",
          per_page: "5",
        },
      );
      await sleep(250);
      hits = fallback?.results ?? [];
    }

    const styles = new Set<string>();
    const labels = new Set<string>();
    const artists = new Set<string>([seed.artist]);
    if (seed.genre) styles.add(seed.genre);

    for (const h of hits.slice(0, 4)) {
      (h.style ?? []).forEach((s) => styles.add(s));
      (h.label ?? []).filter(isRealLabel).forEach((l) => labels.add(l));
      const parsed = parseTitleArtist(h.title ?? "");
      if (parsed.artist && !looksLikeSpam(parsed.artist, parsed.title)) {
        artists.add(parsed.artist);
      }
    }

    // label seed solo se reale (mai "X")
    if (seed.label && isRealLabel(seed.label)) labels.add(seed.label);

    seedMeta.push({
      styles: Array.from(styles),
      labels: Array.from(labels).slice(0, 3),
      artists: Array.from(artists).slice(0, 2),
      seedIds: [seed.id],
    });
  }

  // Artista: resolve ID → /artists/{id}/releases (musica che comprerebbe dello stesso nome)
  for (let i = 0; i < seedMeta.length; i++) {
    const meta = seedMeta[i];

    for (const artist of meta.artists) {
      const artistHits = await discogsGet<{
        results?: { id?: number; title?: string; type?: string }[];
      }>("/database/search", {
        q: artist,
        type: "artist",
        per_page: "3",
      });
      await sleep(220);
      const artistId = artistHits?.results?.find(
        (r) =>
          r.id &&
          r.title &&
          r.title.toLowerCase().includes(artist.toLowerCase().slice(0, 8)),
      )?.id;

      if (artistId) {
        const rels = await discogsGet<{
          releases?: {
            id: number;
            title?: string;
            artist?: string;
            year?: number;
            thumb?: string;
            label?: string;
            type?: string;
          }[];
        }>(`/artists/${artistId}/releases`, {
          per_page: "20",
          sort: "year",
          sort_order: "desc",
        });
        await sleep(220);
        for (const r of rels?.releases ?? []) {
          if (!r.id || r.type === "master") continue;
          // skip Various / DJ mix oddities with weak artist match
          const a = (r.artist || artist).trim();
          if (/^various/i.test(a)) continue;
          bump(
            acc,
            {
              id: r.id,
              title: `${a} - ${r.title ?? ""}`,
              label: r.label ? [r.label] : [],
              year: r.year ? String(r.year) : undefined,
              thumb: r.thumb,
              style: meta.styles,
              genre: ["Electronic"],
            },
            i,
            95,
            `artist:${artist}`,
            meta.styles,
          );
        }
      }

      // fallback search by artist name
      const data = await discogsGet<{ results?: DiscogsSearchHit[] }>(
        "/database/search",
        {
          artist,
          type: "release",
          per_page: "12",
          genre: "Electronic",
        },
      );
      await sleep(220);
      for (const h of data?.results ?? []) {
        bump(acc, h, i, 80, `artist:${artist}`, meta.styles);
      }
    }

    for (const label of meta.labels) {
      if (!isRealLabel(label)) continue;
      const labelHits = await discogsGet<{
        results?: { id?: number; title?: string }[];
      }>("/database/search", {
        q: label,
        type: "label",
        per_page: "3",
      });
      await sleep(220);
      const labelId = labelHits?.results?.find(
        (r) =>
          r.id &&
          r.title &&
          r.title.toLowerCase() === label.toLowerCase(),
      )?.id;

      if (labelId) {
        const rels = await discogsGet<{
          releases?: {
            id: number;
            title?: string;
            artist?: string;
            year?: number;
            thumb?: string;
          }[];
        }>(`/labels/${labelId}/releases`, { per_page: "18" });
        await sleep(220);
        for (const r of rels?.releases ?? []) {
          if (!r.id) continue;
          const a = (r.artist || "Unknown").trim();
          if (/^various/i.test(a)) continue;
          bump(
            acc,
            {
              id: r.id,
              title: `${a} - ${r.title ?? ""}`,
              label: [label],
              year: r.year ? String(r.year) : undefined,
              thumb: r.thumb,
              style: meta.styles,
              genre: ["Electronic"],
            },
            i,
            70,
            `label:${label}`,
            meta.styles,
          );
        }
      }

      const data = await discogsGet<{ results?: DiscogsSearchHit[] }>(
        "/database/search",
        {
          label,
          type: "release",
          per_page: "12",
          genre: "Electronic",
        },
      );
      await sleep(220);
      for (const h of data?.results ?? []) {
        bump(acc, h, i, 60, `label:${label}`, meta.styles);
      }
    }
  }

  const seedKeys = new Set(
    picked.map((s) => `${s.artist} ${s.title}`.toLowerCase()),
  );
  const genreFallback = picked[0]?.genre || "Electronic";

  const ranked = Array.from(acc.values())
    .filter((n) => {
      if (looksLikeSpam(n.artist, n.title)) return false;
      const key = `${n.artist} ${n.title}`.toLowerCase();
      for (const s of Array.from(seedKeys)) {
        if (s.length > 6 && key.includes(s.slice(0, 10))) return false;
      }
      const vias = Array.from(n.via);
      const strong = vias.some(
        (v) => v.startsWith("artist:") || v.startsWith("label:"),
      );
      return strong && n.score >= 55;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    tracks: ranked.map((n) => toTrack(n, genreFallback)),
    nodes: ranked.length,
    note: `Discogs · ${ranked.length} dig (solo artist/label reali)`,
  };
}
