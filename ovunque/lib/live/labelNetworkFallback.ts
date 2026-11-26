/**
 * Rete label curata — se Discogs è down/429, Short non torna 0 dig.
 * Stesso schema: All Inn ↔ Perlon ↔ Cadenza ↔ Rawax ↔ Playhouse.
 */

import type { Track } from "../types";

type NetRelease = {
  id: string;
  artist: string;
  title: string;
  label: string;
  year: number;
  genre: string;
};

/** Nucleo digger che chiedi tu — artisti/label già usciti su queste case. */
const NETWORK: NetRelease[] = [
  // All Inn
  { id: "fb-coldfish-revelation", artist: "Coldfish", title: "Revelation One Remixes", label: "All Inn Records", year: 2011, genre: "Minimal" },
  { id: "fb-arkajo-landslide", artist: "Arkajo", title: "Landslide EP", label: "All Inn Records", year: 2014, genre: "Minimal" },
  { id: "fb-traumer-mezon", artist: "Traumer", title: "Mezon EP", label: "All Inn Records", year: 2013, genre: "Minimal" },
  { id: "fb-jaffa-hauz", artist: "Jaffa Surfa", title: "Doin' Hauz EP", label: "All Inn Records", year: 2015, genre: "House" },
  { id: "fb-summed-pearl", artist: "Summed & Dot", title: "My Grey Pearl EP", label: "All Inn Records", year: 2010, genre: "Minimal" },
  { id: "fb-roustam-shape", artist: "Roustam", title: "The Shape Of Deep To Come", label: "All Inn Records", year: 2012, genre: "Minimal" },
  { id: "fb-verrina-terra", artist: "Verrina & Ventura", title: "La Terra Trema", label: "All Inn Black", year: 2016, genre: "Minimal" },
  { id: "fb-noha-eterno", artist: "Noha", title: "Eterno Ritorno", label: "All Inn Records", year: 2017, genre: "Minimal" },
  // Perlon (dove finiscono gli All Inn mates / Villalobos)
  { id: "fb-pantytec-glimpse", artist: "Pantytec", title: "A Glimpse", label: "Perlon", year: 2001, genre: "Minimal" },
  { id: "fb-rv-frank", artist: "Ricardo Villalobos", title: "Frank Mueller Melodram", label: "Perlon", year: 1999, genre: "Minimal" },
  { id: "fb-rv-bredow", artist: "Ricardo Villalobos", title: "Bredow / Damm3", label: "Perlon", year: 2005, genre: "Minimal" },
  { id: "fb-akufen-quebec", artist: "Akufen", title: "Quebec Nightclub", label: "Perlon", year: 2002, genre: "Minimal" },
  { id: "fb-dimbiman-eyeball", artist: "Dimbiman", title: "Good Morning, Eyeball", label: "Perlon", year: 2001, genre: "Minimal" },
  { id: "fb-ricymartin-froebel", artist: "Ric Y Martin", title: "Froebel 1792", label: "Perlon", year: 2000, genre: "Minimal" },
  { id: "fb-pile-perlipop", artist: "Pile", title: "Perlipop", label: "Perlon", year: 2004, genre: "Minimal" },
  { id: "fb-herbert-mistakes", artist: "Matthew Herbert", title: "Letsallmakemistakes", label: "Perlon", year: 2000, genre: "Minimal" },
  // Playhouse / Cadenza / Rawax — hop successivi
  { id: "fb-herbert-secondhand", artist: "Herbert", title: "Secondhand Sounds", label: "Playhouse", year: 2002, genre: "House" },
  { id: "fb-isoloe-beau", artist: "Isolée", title: "Beau Mot Plage", label: "Playhouse", year: 1998, genre: "Microhouse" },
  { id: "fb-luciano-cadenza", artist: "Luciano", title: "Cadenza", label: "Cadenza", year: 2003, genre: "Minimal" },
  { id: "fb-thomas-melchior", artist: "Thomas Melchior", title: "Moods / Enter.Again", label: "Cadenza", year: 2006, genre: "Minimal" },
  { id: "fb-rv-heike", artist: "Ricardo Villalobos", title: "Heike", label: "Rawax", year: 2024, genre: "Minimal" },
  { id: "fb-rv-808", artist: "Ricardo Villalobos", title: "808 The Bassqueen", label: "Rawax", year: 2024, genre: "Minimal" },
  { id: "fb-ali-metaphor", artist: "Ali Nasser", title: "Metaphor EP", label: "Rawax", year: 2023, genre: "Minimal" },
  { id: "fb-fresh-burnin", artist: "Fresh & Low", title: "Burnin Love", label: "Rawax", year: 2022, genre: "House" },
];

const LABEL_KEYS: Record<string, string[]> = {
  "all in record": ["all inn", "perlon", "rawax", "cadenza", "playhouse"],
  "all in records": ["all inn", "perlon", "rawax", "cadenza"],
  "all inn": ["all inn", "perlon", "rawax", "cadenza", "playhouse"],
  "all inn records": ["all inn", "perlon", "rawax", "cadenza", "playhouse"],
  "all inn black": ["all inn", "perlon", "rawax"],
  "closed edition": ["all inn", "perlon", "rawax"],
  perlon: ["perlon", "playhouse", "cadenza", "rawax", "all inn"],
  playhouse: ["playhouse", "perlon", "cadenza"],
  cadenza: ["cadenza", "perlon", "rawax", "cocoon"],
  rawax: ["rawax", "perlon", "all inn", "cadenza"],
};

function toTrack(r: NetRelease): Track {
  const q = encodeURIComponent(`${r.artist} ${r.title}`);
  return {
    id: r.id,
    title: r.title,
    artist: r.artist,
    label: r.label,
    genre: r.genre,
    year: r.year,
    mood: "club",
    coverHue: (r.id.length * 41) % 360,
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
        url: `https://www.discogs.com/search/?q=${q}&type=release`,
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
    source: "live",
  };
}

function labelBucket(label: string): string[] {
  const k = label.trim().toLowerCase();
  if (LABEL_KEYS[k]) return LABEL_KEYS[k];
  for (const [key, buckets] of Object.entries(LABEL_KEYS)) {
    if (k.includes(key) || key.includes(k)) return buckets;
  }
  return [];
}

/** Se Discogs è vuoto: stesso artista + label network (All Inn→Perlon…). */
export function fallbackLabelNetwork(seeds: Track[], limit = 36): Track[] {
  const out: Track[] = [];
  const seen = new Set<string>();
  const seedKeys = new Set(
    seeds.map((s) => `${s.artist}|${s.title}`.toLowerCase()),
  );

  const want = new Set<string>();
  for (const s of seeds) {
    labelBucket(s.label || "").forEach((b) => want.add(b));
    // Artista noto → apri la rete anche senza label sul pick
    if (/villalobos|ventura|luciano|traumer|arkajo|coldfish/i.test(s.artist)) {
      ["all inn", "perlon", "rawax", "cadenza", "playhouse"].forEach((b) =>
        want.add(b),
      );
    }
  }
  if (want.size === 0) {
    ["all inn", "perlon"].forEach((b) => want.add(b));
  }

  const score = (r: NetRelease) => {
    const lk = r.label.toLowerCase();
    let pts = 0;
    for (const b of Array.from(want)) {
      if (lk.includes(b)) pts += 10;
    }
    for (const s of seeds) {
      if (r.artist.toLowerCase().includes(s.artist.toLowerCase().split(/\s+/)[0] || ""))
        pts += 4;
    }
    return pts;
  };

  const ranked = [...NETWORK].sort((a, b) => score(b) - score(a));
  for (const r of ranked) {
    if (score(r) <= 0) continue;
    const key = `${r.artist}|${r.title}`.toLowerCase();
    if (seen.has(key) || seedKeys.has(key)) continue;
    seen.add(key);
    out.push(toTrack(r));
    if (out.length >= limit) break;
  }
  return out;
}
