/**
 * Scouting Diglist via Discogs (grafo reale digger):
 * traccia → release → etichette dove è uscita → roster label
 * → altre release stesso artista → stili condivisi → croce multi-seed.
 * Bandcamp supporters bloccati da CF lato server; Discogs è la rete accurata.
 */

import type { Track } from "../types";
import { resolveGenre } from "../genres";

const UA = "OvunqueDiglist/1.0 +https://ovunque.apps.grok.bot";

type DiscogsSearchHit = {
  id: number;
  title?: string;
  label?: string[];
  style?: string[];
  genre?: string[];
  year?: string;
  country?: string;
  master_id?: number;
  type?: string;
  thumb?: string;
  cover_image?: string;
  uri?: string;
};

type ScoutNode = {
  discogsId: number;
  title: string;
  artist: string;
  labels: string[];
  styles: string[];
  year?: number;
  artworkUrl?: string;
  /** seed indices that linked here */
  seedLinks: Set<number>;
  via: Set<string>;
  score: number;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function discogsGet<T>(path: string, params: Record<string, string>): Promise<T | null> {
  const q = new URLSearchParams(params);
  const url = `https://api.discogs.com${path}?${q}`;
  try {
    const res = await fetch(url, {
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

function styleOverlap(a: string[], b: string[]): number {
  const nb = new Set(b.map((s) => s.toLowerCase()));
  let n = 0;
  for (const s of a) if (nb.has(s.toLowerCase())) n++;
  return n;
}

function stylesToGenre(styles: string[]): string {
  if (!styles.length) return "Electronic";
  // prefer first electronic dance style
  for (const s of styles) {
    const g = resolveGenre(s);
    if (g.slug !== "electronic" && g.name) return g.name;
  }
  return resolveGenre(styles[0]).name;
}

function toTrack(node: ScoutNode): Track {
  const genre = stylesToGenre(node.styles);
  const label = node.labels[0] ?? "—";
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
  if (!hit.id || hit.type === "artist" || hit.type === "label") return;
  const { artist, title } = parseTitleArtist(hit.title ?? "");
  if (!title || title.length < 2) return;
  const styles = hit.style ?? [];
  const overlap = styleOverlap(styles, seedStyles);
  // Hard: se Discogs ha styles e zero overlap con i pick → scarta
  if (seedStyles.length && styles.length && overlap === 0) return;

  let row = map.get(hit.id);
  if (!row) {
    row = {
      discogsId: hit.id,
      title,
      artist,
      labels: hit.label ?? [],
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
  row.score += pts + overlap * 20;
  if (row.seedLinks.size >= 2) row.score += 90;
}

/**
 * Scouting accurato: per ogni seed cerca su Discogs,
 * espande label + artista, tiene solo stili affini, pesa le croci.
 */
export async function scoutDiscogsGraph(
  seeds: Track[],
  limit = 24,
): Promise<{ tracks: Track[]; note: string; nodes: number }> {
  const picked = seeds.slice(0, 6);
  if (!picked.length) return { tracks: [], note: "no seeds", nodes: 0 };

  const acc = new Map<number, ScoutNode>();
  const seedMeta: { styles: string[]; labels: string[]; artists: string[] }[] =
    [];

  for (let i = 0; i < picked.length; i++) {
    const seed = picked[i];
    const data = await discogsGet<{ results?: DiscogsSearchHit[] }>(
      "/database/search",
      {
        q: `${seed.artist} ${seed.title}`,
        type: "release",
        per_page: "5",
      },
    );
    await sleep(220);

    const hits = data?.results ?? [];
    const styles = new Set<string>();
    const labels = new Set<string>();
    const artists = new Set<string>([seed.artist]);

    // seed genre as style hint
    if (seed.genre) styles.add(seed.genre);

    for (const h of hits.slice(0, 3)) {
      (h.style ?? []).forEach((s) => styles.add(s));
      (h.label ?? []).forEach((l) => labels.add(l));
      const parsed = parseTitleArtist(h.title ?? "");
      if (parsed.artist) artists.add(parsed.artist);
      // match diretto release ≈ seed (non in lista consigli)
      bump(acc, h, i, 5, "seed-hit", Array.from(styles));
    }

    // se Discogs non dà styles, usa genere seed
    if (styles.size === 0 && seed.genre) styles.add(seed.genre);
    if (seed.label && seed.label !== "—") labels.add(seed.label);

    seedMeta.push({
      styles: Array.from(styles),
      labels: Array.from(labels).slice(0, 4),
      artists: Array.from(artists).slice(0, 3),
    });
  }

  // Espandi ragnatela: label roster + artist discography
  for (let i = 0; i < seedMeta.length; i++) {
    const meta = seedMeta[i];
    const styleList = meta.styles;

    for (const label of meta.labels.slice(0, 2)) {
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
        bump(acc, h, i, 55, `label:${label}`, styleList);
      }
    }

    for (const artist of meta.artists.slice(0, 2)) {
      const data = await discogsGet<{ results?: DiscogsSearchHit[] }>(
        "/database/search",
        {
          artist,
          type: releaseType(),
          per_page: "10",
        },
      );
      await sleep(220);
      for (const h of data?.results ?? []) {
        bump(acc, h, i, 75, `artist:${artist}`, styleList);
      }
    }

    // stile preciso (es. Tech House) — scouting stretto
    for (const style of styleList.slice(0, 2)) {
      const data = await discogsGet<{ results?: DiscogsSearchHit[] }>(
        "/database/search",
        {
          style,
          type: "release",
          per_page: "8",
          genre: "Electronic",
        },
      );
      await sleep(220);
      // peso basso: solo se anche label o artist match arriverà alto; qui filtro overlap
      for (const h of data?.results ?? []) {
        const labs = h.label ?? [];
        const sharesLabel = labs.some((l) => meta.labels.includes(l));
        if (!sharesLabel) continue; // niente dump genere: solo stesso stile E label seed
        bump(acc, h, i, 40, `style+label:${style}`, styleList);
      }
    }
  }

  // Escludi release che sono i seed stessi (titolo troppo simile)
  const seedTitles = new Set(
    picked.map((s) => `${s.artist} ${s.title}`.toLowerCase()),
  );

  const ranked = Array.from(acc.values())
    .filter((n) => {
      const key = `${n.artist} ${n.title}`.toLowerCase();
      for (const s of Array.from(seedTitles)) {
        if (key.includes(s.slice(0, Math.min(12, s.length))) && s.length > 8)
          return false;
      }
      // almeno un filo forte
      const vias = Array.from(n.via);
      const strong = vias.some(
        (v) =>
          v.startsWith("label:") ||
          v.startsWith("artist:") ||
          v.startsWith("style+label:") ||
          n.seedLinks.size >= 2,
      );
      return strong && n.score >= 40;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const tracks = ranked.map(toTrack);
  const croci = ranked.filter((n) => n.seedLinks.size >= 2).length;

  return {
    tracks,
    nodes: ranked.length,
    note: `Discogs scout · ${ranked.length} dig (label/artist/style) · ${croci} a croce`,
  };
}

function releaseType(): string {
  return "release";
}
