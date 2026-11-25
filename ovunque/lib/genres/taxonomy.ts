/**
 * Tassonomia professionale stile Beatport charts + Discogs Electronic styles.
 * Ogni entry ha slug stabile, parent (family), alias per mapping iTunes/curated.
 */

export type GenreNode = {
  slug: string;
  name: string;
  /** Beatport-style short code */
  code: string;
  family: string;
  familySlug: string;
  blurb: string;
  /** iTunes Search / RSS genre id quando esiste */
  itunesGenreId?: number;
  /** Alias per normalizzare stringhe grezze (catalogo, iTunes, Discogs) */
  aliases: string[];
  /** BPM tipico (solo hint UI) */
  bpmHint?: string;
  hue: number;
};

export type GenreFamily = {
  slug: string;
  name: string;
  blurb: string;
  hue: number;
  genres: GenreNode[];
};

const G = (
  partial: Omit<GenreNode, "family" | "familySlug"> & { family: string; familySlug: string },
): GenreNode => partial;

/** Famiglie top-level come sezioni Beatport / Discogs. */
export const GENRE_FAMILIES: GenreFamily[] = [
  {
    slug: "house",
    name: "House",
    blurb: "4/4 groove — club, deep, afro, progressive",
    hue: 28,
    genres: [
      G({
        slug: "house",
        name: "House",
        code: "HOU",
        family: "House",
        familySlug: "house",
        blurb: "Classic & contemporary club house",
        itunesGenreId: 1048,
        aliases: ["house", "classic house", "chicago house", "funky house", "jackin house"],
        bpmHint: "120–128",
        hue: 28,
      }),
      G({
        slug: "deep-house",
        name: "Deep House",
        code: "DPH",
        family: "House",
        familySlug: "house",
        blurb: "Warm pads, late-night swing",
        aliases: ["deep house", "deephouse"],
        bpmHint: "118–124",
        hue: 210,
      }),
      G({
        slug: "tech-house",
        name: "Tech House",
        code: "TH",
        family: "House",
        familySlug: "house",
        blurb: "Warehouse bounce, clipped percussion",
        aliases: ["tech house", "tech-house", "techhouse"],
        bpmHint: "124–128",
        hue: 310,
      }),
      G({
        slug: "afro-house",
        name: "Afro House",
        code: "AFH",
        family: "House",
        familySlug: "house",
        blurb: "Percussion-led, organic club energy",
        aliases: ["afro house", "afrohouse", "afro"],
        bpmHint: "118–124",
        hue: 15,
      }),
      G({
        slug: "organic-house",
        name: "Organic House",
        code: "ORG",
        family: "House",
        familySlug: "house",
        blurb: "Downtempo-leaning, live textures",
        aliases: ["organic house", "organic"],
        bpmHint: "110–122",
        hue: 95,
      }),
      G({
        slug: "progressive-house",
        name: "Progressive House",
        code: "PH",
        family: "House",
        familySlug: "house",
        blurb: "Long builds, melodic journeys",
        aliases: ["progressive house", "prog house", "progressive"],
        bpmHint: "122–128",
        hue: 175,
      }),
      G({
        slug: "soulful-house",
        name: "Soulful House",
        code: "SFH",
        family: "House",
        familySlug: "house",
        blurb: "Vocals, gospel chords, Traxsource lane",
        aliases: ["soulful house", "soulful", "gospel house"],
        bpmHint: "118–124",
        hue: 40,
      }),
    ],
  },
  {
    slug: "techno",
    name: "Techno",
    blurb: "Peak time, raw, melodic, hard — Berlin to warehouse",
    hue: 265,
    genres: [
      G({
        slug: "techno",
        name: "Techno",
        code: "TEC",
        family: "Techno",
        familySlug: "techno",
        blurb: "Peak Time / Driving",
        itunesGenreId: 1050,
        aliases: ["techno", "peak time", "driving techno", "detroit techno"],
        bpmHint: "130–140",
        hue: 265,
      }),
      G({
        slug: "melodic-techno",
        name: "Melodic Techno",
        code: "MT",
        family: "Techno",
        familySlug: "techno",
        blurb: "Wide leads, emotional arcs",
        aliases: ["melodic techno", "melodic house & techno", "melodic"],
        bpmHint: "120–126",
        hue: 25,
      }),
      G({
        slug: "minimal-deep-tech",
        name: "Minimal / Deep Tech",
        code: "MIN",
        family: "Techno",
        familySlug: "techno",
        blurb: "Sparse grooves, micro-detail",
        aliases: ["minimal", "minimal techno", "deep tech", "microhouse"],
        bpmHint: "124–130",
        hue: 200,
      }),
      G({
        slug: "hard-techno",
        name: "Hard Techno",
        code: "HT",
        family: "Techno",
        familySlug: "techno",
        blurb: "Industrial pressure, high BPM",
        aliases: ["hard techno", "schranz", "industrial techno"],
        bpmHint: "145–160",
        hue: 350,
      }),
      G({
        slug: "raw-hypnotic",
        name: "Raw / Hypnotic Techno",
        code: "RAW",
        family: "Techno",
        familySlug: "techno",
        blurb: "Loop-driven, dark rooms",
        aliases: ["raw techno", "hypnotic techno", "hypnotic", "raw / deep / hypnotic"],
        bpmHint: "132–138",
        hue: 280,
      }),
      G({
        slug: "acid",
        name: "Acid",
        code: "ACD",
        family: "Techno",
        familySlug: "techno",
        blurb: "303 lines, wet squelch",
        aliases: ["acid", "acid techno", "acid house"],
        bpmHint: "125–135",
        hue: 95,
      }),
    ],
  },
  {
    slug: "disco-dance",
    name: "Disco / Dance",
    blurb: "Nu disco, indie dance, electro-pop floor",
    hue: 330,
    genres: [
      G({
        slug: "nu-disco",
        name: "Nu Disco",
        code: "ND",
        family: "Disco / Dance",
        familySlug: "disco-dance",
        blurb: "Glossy basslines, disco DNA",
        aliases: ["nu disco", "nudisco", "disco", "disco house"],
        bpmHint: "110–120",
        hue: 330,
      }),
      G({
        slug: "indie-dance",
        name: "Indie Dance",
        code: "IND",
        family: "Disco / Dance",
        familySlug: "disco-dance",
        blurb: "Cross-over indie + club",
        aliases: ["indie dance", "indie dance / nu disco", "alt dance"],
        bpmHint: "115–125",
        hue: 300,
      }),
      G({
        slug: "dance-electro-pop",
        name: "Dance / Electro Pop",
        code: "DEP",
        family: "Disco / Dance",
        familySlug: "disco-dance",
        blurb: "Radio-ready dance edits",
        itunesGenreId: 17,
        aliases: ["dance", "dance & electronic", "electro pop", "edm", "electronic"],
        bpmHint: "118–128",
        hue: 195,
      }),
    ],
  },
  {
    slug: "bass-breaks",
    name: "Bass / Breaks",
    blurb: "Electro, breaks, UK bass pressure",
    hue: 185,
    genres: [
      G({
        slug: "electro",
        name: "Electro",
        code: "ELC",
        family: "Bass / Breaks",
        familySlug: "bass-breaks",
        blurb: "Classic electro & electro-house edge",
        aliases: ["electro", "electro house", "detroit electro"],
        bpmHint: "125–135",
        hue: 185,
      }),
      G({
        slug: "breaks",
        name: "Breaks / Breakbeat",
        code: "BRK",
        family: "Bass / Breaks",
        familySlug: "bass-breaks",
        blurb: "Broken drums, UK lineage",
        aliases: ["breaks", "breakbeat", "break beat", "uk breaks"],
        bpmHint: "130–140",
        hue: 160,
      }),
      G({
        slug: "uk-garage",
        name: "UK Garage / Bassline",
        code: "UKG",
        family: "Bass / Breaks",
        familySlug: "bass-breaks",
        blurb: "2-step, shuffle, bassline",
        aliases: ["uk garage", "garage", "2-step", "bassline", "speed garage"],
        bpmHint: "128–138",
        hue: 50,
      }),
      G({
        slug: "dubstep",
        name: "Dubstep",
        code: "DUB",
        family: "Bass / Breaks",
        familySlug: "bass-breaks",
        blurb: "Half-time weight",
        aliases: ["dubstep", "brostep"],
        bpmHint: "138–142",
        hue: 220,
      }),
    ],
  },
  {
    slug: "drum-bass",
    name: "Drum & Bass",
    blurb: "Jungle to liquid to neuro",
    hue: 145,
    genres: [
      G({
        slug: "drum-and-bass",
        name: "Drum & Bass",
        code: "DNB",
        family: "Drum & Bass",
        familySlug: "drum-bass",
        blurb: "Full spectrum DnB",
        itunesGenreId: 1066,
        aliases: ["drum & bass", "drum and bass", "dnb", "d&b", "jungle"],
        bpmHint: "170–176",
        hue: 145,
      }),
      G({
        slug: "liquid-dnb",
        name: "Liquid DnB",
        code: "LIQ",
        family: "Drum & Bass",
        familySlug: "drum-bass",
        blurb: "Melodic, rolling liquid",
        aliases: ["liquid", "liquid dnb", "liquid drum & bass"],
        bpmHint: "170–174",
        hue: 170,
      }),
    ],
  },
  {
    slug: "trance-psy",
    name: "Trance / Psy",
    blurb: "Uplifting, progressive, psychedelic",
    hue: 255,
    genres: [
      G({
        slug: "trance",
        name: "Trance",
        code: "TRN",
        family: "Trance / Psy",
        familySlug: "trance-psy",
        blurb: "Uplifting & progressive trance",
        itunesGenreId: 1051,
        aliases: ["trance", "uplifting trance", "progressive trance"],
        bpmHint: "132–140",
        hue: 255,
      }),
      G({
        slug: "psy-trance",
        name: "Psy-Trance",
        code: "PSY",
        family: "Trance / Psy",
        familySlug: "trance-psy",
        blurb: "Full-on, progressive psychedelic",
        aliases: ["psy-trance", "psytrance", "goa", "psy"],
        bpmHint: "138–148",
        hue: 290,
      }),
    ],
  },
  {
    slug: "leftfield",
    name: "Leftfield / Ambient",
    blurb: "IDM, ambient, experimental — Boomkat / Bleep lane",
    hue: 160,
    genres: [
      G({
        slug: "ambient",
        name: "Ambient",
        code: "AMB",
        family: "Leftfield / Ambient",
        familySlug: "leftfield",
        blurb: "Atmosphere-first listening",
        aliases: ["ambient", "drone", "soundscape"],
        bpmHint: "—",
        hue: 160,
      }),
      G({
        slug: "idm",
        name: "IDM / Electronica",
        code: "IDM",
        family: "Leftfield / Ambient",
        familySlug: "leftfield",
        blurb: "Broken rhythms, studio craft",
        aliases: ["idm", "electronica", "intelligent dance music", "experimental"],
        bpmHint: "variable",
        hue: 220,
      }),
      G({
        slug: "downtempo",
        name: "Downtempo / Trip-Hop",
        code: "DT",
        family: "Leftfield / Ambient",
        familySlug: "leftfield",
        blurb: "Slow pulse, cinematic",
        aliases: ["downtempo", "trip-hop", "trip hop", "chillout", "lounge"],
        bpmHint: "70–100",
        hue: 45,
      }),
      G({
        slug: "synthwave",
        name: "Synthwave / Retrowave",
        code: "SW",
        family: "Leftfield / Ambient",
        familySlug: "leftfield",
        blurb: "Neon dusk, 80s circuitry",
        aliases: ["synthwave", "retrowave", "outrun", "darksynth"],
        bpmHint: "100–120",
        hue: 300,
      }),
    ],
  },
  {
    slug: "hard-dance",
    name: "Hard Dance / Hardcore",
    blurb: "Hardstyle, hardcore, mainstage pressure",
    hue: 5,
    genres: [
      G({
        slug: "hardstyle",
        name: "Hardstyle",
        code: "HS",
        family: "Hard Dance / Hardcore",
        familySlug: "hard-dance",
        blurb: "Reverse bass, festival energy",
        aliases: ["hardstyle", "rawstyle", "hard dance"],
        bpmHint: "150–160",
        hue: 5,
      }),
      G({
        slug: "hardcore",
        name: "Hardcore",
        code: "HC",
        family: "Hard Dance / Hardcore",
        familySlug: "hard-dance",
        blurb: "Gabber to UK hardcore",
        aliases: ["hardcore", "gabber", "happy hardcore"],
        bpmHint: "160–200",
        hue: 355,
      }),
    ],
  },
];

/** Flat list of every leaf genre (Beatport-style chart lanes). */
export const ALL_GENRES: GenreNode[] = GENRE_FAMILIES.flatMap((f) => f.genres);

const bySlug = new Map(ALL_GENRES.map((g) => [g.slug, g]));
const byAlias = new Map<string, GenreNode>();
for (const g of ALL_GENRES) {
  byAlias.set(norm(g.name), g);
  byAlias.set(norm(g.slug.replace(/-/g, " ")), g);
  for (const a of g.aliases) byAlias.set(norm(a), g);
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[&/]/g, " ")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getGenre(slug: string): GenreNode | undefined {
  return bySlug.get(slug);
}

export function getFamily(slug: string): GenreFamily | undefined {
  return GENRE_FAMILIES.find((f) => f.slug === slug);
}

/** Mappa stringa grezza (iTunes / curated / Discogs) → nodo canonico. */
export function resolveGenre(raw: string | undefined | null): GenreNode {
  if (!raw) return bySlug.get("dance-electro-pop")!;
  const n = norm(raw);
  const direct = byAlias.get(n);
  if (direct) return direct;

  // Partial / contains match (longest alias wins)
  let best: GenreNode | undefined;
  let bestLen = 0;
  for (const [alias, node] of Array.from(byAlias.entries())) {
    if (alias.length < 3) continue;
    if (n.includes(alias) || alias.includes(n)) {
      if (alias.length > bestLen) {
        best = node;
        bestLen = alias.length;
      }
    }
  }
  return best ?? bySlug.get("dance-electro-pop")!;
}

export function genreSearchTerm(genre: GenreNode): string {
  return genre.aliases[0] ?? genre.name;
}

export function familyOf(genre: GenreNode): GenreFamily | undefined {
  return getFamily(genre.familySlug);
}
