/**
 * Pool digger — musica che un utente COMPREREBBE dati i pick.
 *
 * Non è dump di genere: ogni disco è in una lane di gusto (corde).
 * Se i pick sono House 4/4 club → solo dig house/deep/tech-house affini.
 * Se i pick sono minimal/techno da label tipo alphahouse → solo quella corda.
 *
 * Proxy Diglist: chi compra A compra anche B nella stessa lane.
 */

import type { Track } from "../types";
import { resolveGenre } from "../genres";

export type DigLane =
  | "house-club"
  | "deep-house"
  | "tech-house"
  | "minimal-techno"
  | "peak-techno"
  | "disco-nu"
  | "afro-organic";

type DigEntry = {
  track: Track;
  lanes: DigLane[];
};

function dig(
  id: string,
  title: string,
  artist: string,
  label: string,
  genre: string,
  year: number,
  bpm: number,
  lanes: DigLane[],
  hue: number,
): DigEntry {
  const q = encodeURIComponent(`${artist} ${title}`);
  return {
    lanes,
    track: {
      id: `dig-${id}`,
      title,
      artist,
      label,
      genre,
      bpm,
      year,
      mood: "club",
      coverHue: hue,
      suggested: true,
      rails: ["per-te", "digger"],
      source: "curated",
      offers: [
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
        {
          storeId: "discogs",
          kind: "paid",
          priceEur: null,
          priceFrom: true,
          currency: "EUR",
          format: '12" Vinyl',
          url: `https://www.discogs.com/search/?q=${q}&type=release`,
          media: "vinyl",
        },
      ],
    },
  };
}

/** Dischi veri che un digger comprerebbe — organizzati per corde. */
export const DIGGER_POOL: DigEntry[] = [
  // ——— House club 4/4 (Closed Edition / Germano corda) ———
  dig("ht-mark-mate-1", "Never Gonna Leave You", "Delano Smith", "Sushitech", "House", 2012, 124, ["house-club"], 12),
  dig("ht-mark-mate-2", "Without", "DJ Qu", "Strength Music", "House", 2011, 123, ["house-club"], 18),
  dig("ht-mark-mate-3", "If", "Kerri Chandler", "Madhouse", "House", 1999, 124, ["house-club", "deep-house"], 24),
  dig("ht-mark-mate-4", "Caught Up", "Rick Wade", "Harmonie Park", "House", 2001, 122, ["house-club", "deep-house"], 30),
  dig("ht-mark-mate-5", "The Call", "Patrice Scott", "Sistrum", "House", 2010, 123, ["house-club"], 36),
  dig("ht-mark-mate-6", "There's A Way", "Norm Talley", "FXHE", "House", 2008, 122, ["house-club"], 42),
  dig("ht-mark-mate-7", "I Need You", "Mike Huckaby", "Deep Transportation", "House", 2007, 124, ["house-club", "deep-house"], 48),
  dig("ht-mark-mate-8", "Track 1", "Omar-S", "FXHE", "House", 2004, 121, ["house-club"], 54),
  dig("ht-mark-mate-9", "Sandman", "Larry Heard", "Track Mode", "Deep House", 1996, 120, ["deep-house", "house-club"], 60),
  dig("ht-mark-mate-10", "The Dance", "Theo Parrish", "Sound Signature", "House", 1997, 118, ["house-club", "deep-house"], 66),
  dig("ht-mark-mate-11", "Just A Lonely Trip", "Moodymann", "KDJ", "House", 1997, 120, ["house-club", "deep-house"], 72),
  dig("ht-mark-mate-12", "Falling Leaves", "Andres", "Mahogani Music", "House", 2012, 118, ["house-club", "deep-house"], 78),
  dig("ht-mark-mate-13", "Vibrate", "Fred P", "Soul People Music", "Deep House", 2011, 121, ["deep-house", "house-club"], 84),
  dig("ht-mark-mate-14", "Coast To Coast", "Linkwood", "Firecracker", "House", 2013, 122, ["house-club", "deep-house"], 90),
  dig("ht-mark-mate-15", "Raw Cuts #3", "Motor City Drum Ensemble", "MCDE", "House", 2008, 120, ["house-club"], 96),
  dig("ht-mark-mate-16", "Ruff Draft", "Black Loops", "Shall Not Fade", "House", 2018, 124, ["house-club", "tech-house"], 102),
  dig("ht-mark-mate-17", "Feel Free", "Chaos In The CBD", "Chaos In The CBD", "House", 2017, 122, ["house-club", "deep-house"], 108),
  dig("ht-mark-mate-18", "You Used To Hold Me", "Ralphi Rosario", "Hot Mix 5", "House", 1987, 124, ["house-club"], 114),

  // ——— Deep late night ———
  dig("deep-1", "Sandmann", "Move D", "Workshop", "Deep House", 2006, 118, ["deep-house"], 120),
  dig("deep-2", "My Hi-Matic", "Isolée", "Playhouse", "Deep House", 2000, 120, ["deep-house", "house-club"], 126),
  dig("deep-3", "As Long As There's Love Around", "Session Victim", "Delusions Of Grandeur", "Deep House", 2012, 118, ["deep-house", "house-club"], 132),
  dig("deep-4", "Pressure", "Floorplan", "M-Plant", "House", 2011, 126, ["house-club", "tech-house"], 138),
  // ——— Tech house warehouse ———
  dig("th-1", "Body Language", "Dennis Ferrer", "Objektivity", "Tech House", 2007, 126, ["tech-house", "house-club"], 150),
  dig("th-2", "Crazy", "Harry Romero", "Bambossa", "Tech House", 2005, 126, ["tech-house"], 156),
  dig("th-3", "Knights Of The Jaguar", "DJ Rolando", "UR", "Techno", 1999, 130, ["peak-techno", "tech-house"], 162),
  dig("th-4", "Acid Track", "Phuture", "Trax", "Acid", 1987, 124, ["house-club", "tech-house"], 168),
  dig("th-5", "Can You Feel It", "Mr. Fingers", "Trax", "House", 1986, 116, ["house-club", "deep-house"], 174),

  // ——— Minimal / alphahouse / Ric y Martin corda ———
  dig("min-1", "Dexter", "Ricardo Villalobos", "Perlon", "Minimal", 2003, 126, ["minimal-techno"], 180),
  dig("min-2", "Achso", "Ricardo Villalobos", "Playhouse", "Minimal", 2005, 125, ["minimal-techno"], 186),
  dig("min-3", "French Fries", "Luciano", "Cadenza", "Minimal", 2007, 124, ["minimal-techno", "tech-house"], 192),
  dig("min-4", "Macabre Reminiscence", "Ion Ludwig", "Cadenza", "Minimal", 2009, 124, ["minimal-techno"], 198),
  dig("min-5", "Mango", "Mathew Jonson", "Wagon Repair", "Minimal", 2005, 126, ["minimal-techno", "peak-techno"], 204),
  dig("min-6", "Berghain 03", "Len Faki", "Ostgut Ton", "Techno", 2009, 128, ["peak-techno", "minimal-techno"], 210),
  dig("min-7", "Panorama Bar 05", "Stefan Goldmann", "Ostgut Ton", "Minimal", 2011, 124, ["minimal-techno"], 216),
  dig("min-8", "Raoul", "Pépé Bradock", "Atavisme", "House", 2000, 122, ["house-club", "deep-house"], 222),
  dig("min-9", "The Bells", "Jeff Mills", "Purpose Maker", "Techno", 1996, 133, ["peak-techno"], 228),
  dig("min-10", "Spastik", "Plastikman", "Plus 8", "Techno", 1993, 128, ["peak-techno", "minimal-techno"], 234),
  dig("min-11", "Froebel 1792", "Ric Y Martin", "Episode", "Techno", 2000, 128, ["minimal-techno", "peak-techno"], 240),
  dig("min-12", "Cerro San Cristobal", "Ric Y Martin", "Episode", "Techno", 2000, 127, ["minimal-techno"], 246),
  dig("min-13", "Profundo Amor", "Franco Cinelli", "alphahouse", "Techno", 2014, 124, ["minimal-techno"], 252),
  dig("min-14", "Gaugamela Incode", "Ion Ludwig", "alphahouse", "Techno", 2015, 125, ["minimal-techno"], 258),
  dig("min-15", "Tessio", "Luomo", "Force Tracks", "Minimal", 2000, 124, ["minimal-techno"], 264),

  // ——— Disco / nu ———
  dig("dis-1", "Hangin' Out", "Boogie Down Production", "P&P", "Disco", 1980, 112, ["disco-nu"], 270),
  dig("dis-2", "I Specialize In Love", "Sharon Brown", "Profile", "Disco", 1982, 116, ["disco-nu"], 276),
  dig("dis-3", "Can't Fake The Feeling", "Geraldine Hunt", "Prism", "Disco", 1980, 118, ["disco-nu"], 282),

  // ——— Afro / organic ———
  dig("afro-1", "Yeke Yeke", "Mory Kanté", "Barclay", "Afro House", 1987, 122, ["afro-organic"], 288),
  dig("afro-2", "Ngeke", "Black Motion", "Soul Candi", "Afro House", 2015, 120, ["afro-organic"], 294),
];

function bpmOk(seedBpm: number | undefined, digBpm: number | undefined): boolean {
  if (seedBpm == null || digBpm == null) return true;
  return Math.abs(seedBpm - digBpm) <= 10;
}

/** Inferisci le corde dai pick selezionati. */
export function lanesFromSeeds(seeds: Track[]): DigLane[] {
  const lanes = new Set<DigLane>();
  for (const s of seeds) {
    const g = s.genre.toLowerCase();
    const fam = resolveGenre(s.genre).familySlug;
    if (/minimal/.test(g) || /alphahouse/i.test(s.label)) {
      lanes.add("minimal-techno");
    }
    if (fam === "techno" || /techno|acid/.test(g)) {
      if (/minimal/.test(g)) lanes.add("minimal-techno");
      else lanes.add("peak-techno");
      lanes.add("minimal-techno");
    }
    if (fam === "house" || /house/.test(g)) {
      if (/deep/.test(g)) lanes.add("deep-house");
      else if (/tech house/.test(g)) lanes.add("tech-house");
      else if (/afro/.test(g)) lanes.add("afro-organic");
      else lanes.add("house-club");
    }
    if (/disco|nu disco/.test(g)) lanes.add("disco-nu");
    if (/afro/.test(g)) lanes.add("afro-organic");
    // BPM hint
    if (s.bpm != null) {
      if (s.bpm >= 120 && s.bpm <= 126 && fam === "house") lanes.add("house-club");
      if (s.bpm >= 124 && s.bpm <= 130 && (fam === "techno" || /minimal|tech house/.test(g))) {
        lanes.add("minimal-techno");
      }
    }
  }
  if (lanes.size === 0) lanes.add("house-club");
  return Array.from(lanes);
}

/**
 * Dischi che l'utente comprerebbe: stessa corda dei pick + BPM vicino.
 * Esclude i pick stessi. Score alto se overlap lane multiplo.
 */
export function digsUserWouldBuy(
  seeds: Track[],
  limit = 28,
): { track: Track; score: number; lanes: DigLane[]; reason: string }[] {
  const picked = seeds.slice(0, 6);
  if (!picked.length) return [];

  const want = new Set(lanesFromSeeds(picked));
  const seedKeys = new Set(
    picked.map((s) => `${s.artist.toLowerCase()}|${s.title.toLowerCase()}`),
  );
  const seedArtists = new Set(picked.map((s) => s.artist.toLowerCase()));
  const seedLabels = new Set(
    picked
      .map((s) => s.label.toLowerCase())
      .filter((l) => l && l !== "—" && l !== "x" && l.length >= 3),
  );
  const avgBpm =
    picked.filter((s) => s.bpm != null).reduce((a, s) => a + (s.bpm ?? 0), 0) /
      Math.max(1, picked.filter((s) => s.bpm != null).length) || undefined;

  const hits: { track: Track; score: number; lanes: DigLane[]; reason: string }[] = [];

  for (const entry of DIGGER_POOL) {
    const key = `${entry.track.artist.toLowerCase()}|${entry.track.title.toLowerCase()}`;
    if (seedKeys.has(key)) continue;

    const overlap = entry.lanes.filter((l) => want.has(l));
    if (overlap.length === 0) continue;
    if (!bpmOk(avgBpm, entry.track.bpm)) continue;

    // Scarta ambient fuori tempo se seed club
    if (avgBpm && avgBpm >= 118 && (entry.track.bpm ?? 0) < 100) continue;

    let score = 70 + overlap.length * 35;
    let reason = `corde digger · ${overlap.join("+")}`;

    if (seedArtists.has(entry.track.artist.toLowerCase())) {
      score += 80;
      reason = "stesso artista (comprerebbe)";
    }
    if (seedLabels.has(entry.track.label.toLowerCase())) {
      score += 70;
      reason = `stessa label ${entry.track.label}`;
    }
    // BPM molto vicino = stessa pista
    if (avgBpm != null && entry.track.bpm != null) {
      const d = Math.abs(avgBpm - entry.track.bpm);
      if (d <= 2) score += 20;
      else if (d <= 5) score += 10;
    }

    hits.push({ track: entry.track, score, lanes: overlap, reason });
  }

  return hits
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
