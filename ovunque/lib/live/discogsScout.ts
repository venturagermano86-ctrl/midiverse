/**
 * Rete Diglist su Discogs (senza dump genere):
 *
 * 1) Artista del pick → discografia
 * 2) Label dove ha stampato
 * 3) Altri artisti su quelle label → loro release
 * 4) Hop: label nuove di quei label-mates → ancora release
 *
 * Club filter: niente jazz/pop/alternative. Distro fake fuori.
 */

import type { Track } from "../types";
import { resolveGenre } from "../genres";
import { rejectNonClubStyles } from "../engines/clubFilter";

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

type ArtistRelease = {
  id: number;
  title: string;
  artist: string;
  label?: string;
  year?: number;
  thumb?: string;
  type?: string;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const artistIdCache = new Map<string, number | null>();
const labelIdCache = new Map<string, number | null>();

async function discogsGet<T>(
  path: string,
  params: Record<string, string> = {},
): Promise<T | null> {
  const q = new URLSearchParams(params);
  const url = q.toString()
    ? `https://api.discogs.com${path}?${q}`
    : `https://api.discogs.com${path}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      next: { revalidate: 0 },
    });
    if (res.status === 429) {
      await sleep(1200);
      return null;
    }
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
  if (/^not on label/i.test(l)) return false;
  if (/^[\d\W]+$/.test(l)) return false;
  if (/distribution|distro\b|sue.?tunes|full of nothing|apollon records/i.test(l))
    return false;
  return true;
}

function looksLikeSpam(artist: string, title: string): boolean {
  const s = `${artist} ${title}`;
  const latin = (s.match(/[A-Za-z0-9]/g) || []).length;
  if (latin < 4) return true;
  if (/пиздец|какашк|lyсина|drone x heart/i.test(s)) return true;
  if (title.length < 2 || artist.length < 2) return true;
  if (/^various/i.test(artist)) return true;
  if (/^unknown\*?$/i.test(artist.trim())) return true;
  return false;
}

/** Da «Mari & Villalobos» → privilegi il nome club. */
function seedArtistNames(seedArtist: string): string[] {
  const parts = seedArtist
    .split(/\s*(?:&|,|feat\.?|ft\.?|x)\s*/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 1);
  const club = parts.filter((p) =>
    /villalobos|luciano|reboot|gtronic|cinelli|ludwig|mills|plastikman|moodymann|omar-?s|chandler|heard|huckaby/i.test(
      p,
    ),
  );
  return (club.length ? club : parts.length ? parts : [seedArtist]).slice(0, 3);
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
  opts: {
    id: number;
    artist: string;
    title: string;
    labels?: string[];
    styles?: string[];
    year?: number;
    artworkUrl?: string;
    seedIdx: number;
    pts: number;
    via: string;
    /** Label della rete del pick → fidati anche senza style */
    trustedLabel?: boolean;
  },
) {
  if (!opts.id) return;
  if (looksLikeSpam(opts.artist, opts.title)) return;
  const styles = opts.styles ?? [];
  // Senza style: ok solo se label trusted della rete O via artist seed
  if (!styles.length) {
    if (!opts.trustedLabel && !opts.via.startsWith("artist:")) return;
  } else if (rejectNonClubStyles(styles)) {
    return;
  }

  let row = map.get(opts.id);
  if (!row) {
    row = {
      discogsId: opts.id,
      title: opts.title,
      artist: opts.artist,
      labels: (opts.labels ?? []).filter(isRealLabel),
      styles,
      year: opts.year,
      artworkUrl: opts.artworkUrl,
      seedLinks: new Set(),
      via: new Set(),
      score: 0,
    };
    map.set(opts.id, row);
  }
  row.seedLinks.add(opts.seedIdx);
  row.via.add(opts.via);
  row.score += opts.pts;
  if (row.seedLinks.size >= 2) row.score += 80;
}

async function resolveArtistId(name: string): Promise<number | null> {
  const key = name.toLowerCase();
  if (artistIdCache.has(key)) return artistIdCache.get(key) ?? null;
  const data = await discogsGet<{
    results?: { id?: number; title?: string }[];
  }>("/database/search", { q: name, type: "artist", per_page: "5" });
  await sleep(160);
  const needle = name.toLowerCase();
  const hit = data?.results?.find(
    (r) =>
      r.id &&
      r.title &&
      (r.title.toLowerCase() === needle ||
        r.title.toLowerCase().includes(needle.slice(0, 10))),
  );
  const id = hit?.id ?? data?.results?.[0]?.id ?? null;
  artistIdCache.set(key, id);
  return id;
}

async function resolveLabelId(name: string): Promise<number | null> {
  if (!isRealLabel(name)) return null;
  const key = name.toLowerCase();
  if (labelIdCache.has(key)) return labelIdCache.get(key) ?? null;
  const data = await discogsGet<{
    results?: { id?: number; title?: string }[];
  }>("/database/search", { q: name, type: "label", per_page: "5" });
  await sleep(160);
  const needle = name.toLowerCase();
  const exact = data?.results?.find(
    (r) => r.id && r.title && r.title.toLowerCase() === needle,
  );
  const id = exact?.id ?? data?.results?.[0]?.id ?? null;
  labelIdCache.set(key, id);
  return id;
}

async function artistReleases(artistId: number): Promise<ArtistRelease[]> {
  const data = await discogsGet<{
    releases?: {
      id: number;
      title?: string;
      artist?: string;
      year?: number;
      thumb?: string;
      label?: string;
      type?: string;
      role?: string;
    }[];
  }>(`/artists/${artistId}/releases`, {
    per_page: "40",
    sort: "year",
    sort_order: "desc",
  });
  await sleep(160);
  const out: ArtistRelease[] = [];
  for (const r of data?.releases ?? []) {
    if (!r.id || r.type === "master") continue;
    if (r.role && /appearance|unofficial/i.test(r.role)) continue;
    const artist = (r.artist || "").trim();
    if (/^various/i.test(artist)) continue;
    out.push({
      id: r.id,
      title: (r.title || "").trim(),
      artist,
      label: r.label,
      year: r.year,
      thumb: r.thumb,
      type: r.type,
    });
  }
  return out;
}

async function labelReleases(labelId: number): Promise<ArtistRelease[]> {
  const data = await discogsGet<{
    releases?: {
      id: number;
      title?: string;
      artist?: string;
      year?: number;
      thumb?: string;
    }[];
  }>(`/labels/${labelId}/releases`, { per_page: "40" });
  await sleep(160);
  const out: ArtistRelease[] = [];
  for (const r of data?.releases ?? []) {
    if (!r.id) continue;
    const artist = (r.artist || "").trim();
    if (/^various/i.test(artist)) continue;
    out.push({
      id: r.id,
      title: (r.title || "").trim(),
      artist,
      year: r.year,
      thumb: r.thumb,
    });
  }
  return out;
}

/** Search release con style reali (quando serve raffinare). */
async function searchArtistReleases(
  artist: string,
): Promise<DiscogsSearchHit[]> {
  const data = await discogsGet<{ results?: DiscogsSearchHit[] }>(
    "/database/search",
    {
      artist,
      type: "release",
      per_page: "15",
      genre: "Electronic",
    },
  );
  await sleep(160);
  return data?.results ?? [];
}

export async function scoutDiscogsGraph(
  seeds: Track[],
  limit = 60,
): Promise<{ tracks: Track[]; note: string; nodes: number }> {
  const picked = seeds.slice(0, 6);
  if (!picked.length) return { tracks: [], note: "no seeds", nodes: 0 };

  const acc = new Map<number, ScoutNode>();
  /** Label dove i pick hanno davvero stampato */
  const trustedLabels = new Set<string>();
  /** Artisti emersi dal roster di quelle label */
  const networkArtists = new Map<string, number>();
  const seedArtistSet = new Set<string>();

  // ——— 1) Artisti seed → discografia → label ———
  for (let i = 0; i < picked.length; i++) {
    const seed = picked[i];
    const names = seedArtistNames(seed.artist);
    names.forEach((n) => seedArtistSet.add(n.toLowerCase()));

    for (const name of names) {
      const artistId = await resolveArtistId(name);
      if (!artistId) continue;

      const rels = await artistReleases(artistId);
      for (const r of rels) {
        if (r.label && isRealLabel(r.label)) {
          trustedLabels.add(r.label);
        }
        bump(acc, {
          id: r.id,
          artist: r.artist || name,
          title: r.title,
          labels: r.label ? [r.label] : [],
          styles: [],
          year: r.year,
          artworkUrl: r.thumb,
          seedIdx: i,
          pts: 140,
          via: `artist:${name}`,
          trustedLabel: true,
        });
      }

      // Search con style metadata
      const hits = await searchArtistReleases(name);
      for (const h of hits) {
        const { artist, title } = parseTitleArtist(h.title ?? "");
        (h.label ?? []).filter(isRealLabel).forEach((l) => trustedLabels.add(l));
        bump(acc, {
          id: h.id,
          artist,
          title,
          labels: h.label,
          styles: h.style,
          year: h.year ? parseInt(h.year, 10) : undefined,
          artworkUrl: h.cover_image || h.thumb,
          seedIdx: i,
          pts: 130,
          via: `artist:${name}`,
          trustedLabel: true,
        });
      }
    }

    // Label scritta sul pick (se reale)
    if (seed.label && isRealLabel(seed.label)) {
      trustedLabels.add(seed.label);
    }
  }

  const expandedLabels = new Set<string>();
  const exploredArtists = new Set<string>();

  /** Espande una label: roster + artisti (Perlon / Rawax / …). */
  async function expandLabel(
    labelName: string,
    seedIdx: number,
    pts: number,
    hop: number,
  ) {
    if (expandedLabels.has(labelName.toLowerCase())) return;
    const labelId = await resolveLabelId(labelName);
    if (!labelId) return;
    expandedLabels.add(labelName.toLowerCase());
    trustedLabels.add(labelName);

    const rels = await labelReleases(labelId);
    for (const r of rels) {
      const a = (r.artist || "").trim();
      if (!a || looksLikeSpam(a, r.title)) continue;
      const isSeedArtist = Array.from(seedArtistSet).some(
        (s) =>
          a.toLowerCase() === s ||
          a.toLowerCase().includes(s) ||
          s.includes(a.toLowerCase().split(/\s+/)[0] || ""),
      );
      if (!isSeedArtist) {
        networkArtists.set(
          a.toLowerCase(),
          (networkArtists.get(a.toLowerCase()) ?? 0) + 1,
        );
      }
      bump(acc, {
        id: r.id,
        artist: a,
        title: r.title,
        labels: [labelName],
        styles: [],
        year: r.year,
        artworkUrl: r.thumb,
        seedIdx,
        pts: isSeedArtist ? pts + 20 : pts,
        via: `label-h${hop}:${labelName}`,
        trustedLabel: true,
      });
    }

    const data = await discogsGet<{ results?: DiscogsSearchHit[] }>(
      "/database/search",
      {
        label: labelName,
        type: "release",
        per_page: "18",
        genre: "Electronic",
      },
    );
    await sleep(160);
    for (const h of data?.results ?? []) {
      const { artist, title } = parseTitleArtist(h.title ?? "");
      if (!artist || looksLikeSpam(artist, title)) continue;
      if (!seedArtistSet.has(artist.toLowerCase())) {
        networkArtists.set(
          artist.toLowerCase(),
          (networkArtists.get(artist.toLowerCase()) ?? 0) + 1,
        );
      }
      bump(acc, {
        id: h.id,
        artist,
        title,
        labels: h.label ?? [labelName],
        styles: h.style,
        year: h.year ? parseInt(h.year, 10) : undefined,
        artworkUrl: h.cover_image || h.thumb,
        seedIdx,
        pts: pts - 4,
        via: `label-h${hop}:${labelName}`,
        trustedLabel: true,
      });
    }
  }

  /** Artisti della rete → altre release → nuove label (Rawax → altri odì…). */
  async function expandArtists(
    names: string[],
    seedIdx: number,
    pts: number,
    discoverLabels: Set<string>,
  ) {
    for (const mate of names) {
      if (exploredArtists.has(mate)) continue;
      if (Array.from(seedArtistSet).some((s) => mate.includes(s) || s.includes(mate)))
        continue;
      exploredArtists.add(mate);
      const mateId = await resolveArtistId(mate);
      if (!mateId) continue;
      const rels = await artistReleases(mateId);
      for (const r of rels.slice(0, 16)) {
        if (r.label && isRealLabel(r.label)) {
          if (!expandedLabels.has(r.label.toLowerCase())) {
            discoverLabels.add(r.label);
          }
        }
        bump(acc, {
          id: r.id,
          artist: r.artist || mate,
          title: r.title,
          labels: r.label ? [r.label] : [],
          styles: [],
          year: r.year,
          artworkUrl: r.thumb,
          seedIdx,
          pts: r.label && trustedLabels.has(r.label) ? pts + 8 : pts,
          via: `mate:${mate}`,
          trustedLabel: !!(r.label && isRealLabel(r.label)),
        });
      }
    }
  }

  // ——— Rete densa: 3 hop label ↔ artisti ———
  // Hop1: Perlon/Playhouse… → artisti
  // Hop2: quegli artisti → Rawax… → roster Rawax
  // Hop3: artisti Rawax → altre label → ancora roster
  let frontierLabels = Array.from(trustedLabels).slice(0, 8);
  const hopPts = [105, 90, 78];
  const labelsPerHop = [8, 8, 7];
  const artistsPerHop = [10, 10, 8];

  for (let hop = 1; hop <= 3; hop++) {
    const pts = hopPts[hop - 1];
    const toExpand = frontierLabels
      .filter((l) => !expandedLabels.has(l.toLowerCase()))
      .slice(0, labelsPerHop[hop - 1]);

    for (let i = 0; i < picked.length; i++) {
      for (const labelName of toExpand) {
        await expandLabel(labelName, i, pts, hop);
      }
    }

    const mates = Array.from(networkArtists.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([n]) => n)
      .filter((n) => !exploredArtists.has(n))
      .slice(0, artistsPerHop[hop - 1]);

    const nextLabels = new Set<string>();
    for (let i = 0; i < picked.length; i++) {
      await expandArtists(mates, i, pts - 12, nextLabels);
    }
    frontierLabels = Array.from(nextLabels).slice(0, labelsPerHop[hop - 1]);
  }

  const seedKeys = new Set(
    picked.map((s) => `${s.artist} ${s.title}`.toLowerCase()),
  );
  const rawG = picked[0]?.genre || "";
  const genreFallback = /electronic|dance\s*\/\s*electro|pop/i.test(rawG)
    ? "Minimal"
    : rawG || "Minimal";

  const ranked = Array.from(acc.values())
    .filter((n) => {
      if (looksLikeSpam(n.artist, n.title)) return false;
      const key = `${n.artist} ${n.title}`.toLowerCase();
      for (const s of Array.from(seedKeys)) {
        if (s.length > 8 && key.includes(s.slice(0, 12))) return false;
      }
      return n.score >= 65;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    tracks: ranked.map((n) => toTrack(n, genreFallback)),
    nodes: ranked.length,
    note: `Rete densa · ${ranked.length} dig · ${expandedLabels.size} label · ${exploredArtists.size} artisti · 3 hop`,
  };
}
