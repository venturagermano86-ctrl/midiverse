import { TRACKS } from "../catalog";
import type { Track } from "../types";

/**
 * Diglist-style affinity ("a croce"):
 * Non basta lo stesso genere — i dig devono condividere acquirenti / gusto
 * (su Diglist: chi ha comprato A su Bandcamp ha anche B).
 *
 * Qui:
 * 1) grafo di fan-cluster curato (proxy Bandcamp collectors)
 * 2) co-occorrenza multi-seed (stesso cluster di ≥2 pick = croce forte)
 * 3) segnale secondario label/artist/BPM (mai solo genere)
 */

/** Cluster di gusto: tracce che "si crociano" come fan Bandcamp. */
export const TASTE_CLUSTERS: string[][] = [
  // Germano / Closed Edition house diggers (croce forte)
  ["hold-the-mark", "spin-the-gate", "river-cut", "open-roof"],
  // deep / late night
  ["harbour-bell", "soft-clamp", "late-ferry", "red-room-loop", "salt-line"],
  // peak / warehouse techno-leaning
  [
    "glass-corridor",
    "chrome-prayer",
    "acid-dock",
    "dry-ice",
    "copper-wire",
    "neon-pallet",
    "grid-manners",
    "beatport-exclusive",
  ],
  // disco / nu / warm
  ["velvet-runway", "static-kiss", "only-on-bandcamp"],
  // electro / leftfield
  ["low-voltage", "midnight-relay"],
];

const clusterOf = new Map<string, number>();
TASTE_CLUSTERS.forEach((cluster, i) => {
  for (const id of cluster) clusterOf.set(id, i);
});

export type AffinityHit = {
  track: Track;
  score: number;
  croce: number;
  reasons: string[];
};

function bpmClose(a?: number, b?: number): number {
  if (a == null || b == null) return 0;
  const d = Math.abs(a - b);
  if (d <= 2) return 16;
  if (d <= 5) return 10;
  if (d <= 8) return 5;
  return 0;
}

/**
 * Affinità Diglist: croce di cluster + overlap multi-seed.
 * Genere da solo NON basta (cap basso).
 */
export function affinityVsSeeds(seeds: Track[], candidate: Track): AffinityHit | null {
  if (seeds.some((s) => s.id === candidate.id)) return null;

  let score = 0;
  let croce = 0;
  const reasons: string[] = [];
  const candCluster = clusterOf.get(candidate.id);

  // Quanti seed condividono lo stesso fan-cluster del candidate
  const seedClusters = seeds
    .map((s) => clusterOf.get(s.id))
    .filter((c): c is number => c != null);

  if (candCluster != null) {
    const shared = seedClusters.filter((c) => c === candCluster).length;
    if (shared >= 2) {
      croce = shared;
      score += 90 + shared * 28;
      reasons.push(`croce Diglist · ${shared} pick stesso gusto Bandcamp`);
    } else if (shared === 1) {
      croce = 1;
      score += 48;
      reasons.push("stesso cluster di collector Bandcamp");
    }
  }

  // Stesso artista di un seed (forte, non genere)
  for (const seed of seeds) {
    if (seed.artist && seed.artist === candidate.artist) {
      score += 42;
      reasons.push(`stesso artista di «${seed.title}»`);
      break;
    }
  }

  // Stessa label di ≥1 seed
  for (const seed of seeds) {
    if (seed.label && seed.label !== "—" && seed.label === candidate.label) {
      score += 26;
      reasons.push(`stessa label (${candidate.label})`);
      break;
    }
  }

  // BPM vicino a un seed (segnali da digger, non tag)
  let bestBpm = 0;
  for (const seed of seeds) {
    bestBpm = Math.max(bestBpm, bpmClose(seed.bpm, candidate.bpm));
  }
  if (bestBpm) {
    score += bestBpm;
    reasons.push("BPM affine ai pick");
  }

  // Genere: solo boost MINORE se c'è già affinità reale
  const sameGenre = seeds.some((s) => s.genre && s.genre === candidate.genre);
  if (sameGenre && score >= 40) {
    score += 8;
    reasons.push("genere allineato (secondario)");
  } else if (sameGenre && score < 40) {
    // Genere alone: punteggio debole — non entra in short list
    score += 12;
  }

  // Rails condivisi con i pick (zona catalogo / free / ecc.)
  const seedRails = new Set(seeds.flatMap((s) => s.rails));
  const sharedRails = candidate.rails.filter((r) => seedRails.has(r) && r !== "novita");
  if (sharedRails.length && score >= 30) {
    score += 4 * sharedRails.length;
  }

  // Soglia Diglist: senza croce/artista/label serve score alto
  const minScore = croce >= 2 ? 50 : croce === 1 ? 44 : 55;
  if (score < minScore) return null;

  return {
    track: candidate,
    score,
    croce,
    reasons: reasons.slice(0, 3),
  };
}

/** Rank Diglist-style su catalogo + extras (live). */
export function rankByAffinity(
  seeds: Track[],
  extras: Track[],
  limit: number,
): AffinityHit[] {
  const picked = seeds.slice(0, 6);
  if (picked.length === 0) return [];

  const exclude = new Set(picked.map((t) => t.id));
  const pool = new Map<string, Track>();
  for (const t of [...extras, ...TRACKS]) {
    if (!exclude.has(t.id)) pool.set(t.id, t);
  }

  const hits: AffinityHit[] = [];
  Array.from(pool.values()).forEach((t) => {
    const hit = affinityVsSeeds(picked, t);
    if (hit) hits.push(hit);
  });

  return hits
    .sort((a, b) => b.croce - a.croce || b.score - a.score)
    .slice(0, limit);
}
