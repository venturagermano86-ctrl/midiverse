import type { Track } from "../types";
import { TRACKS } from "../catalog";

const GENRE_NEIGHBORS: Record<string, string[]> = {
  House: ["Deep House", "Afro House", "Nu Disco", "Disco", "Minimal"],
  "Deep House": ["House", "Afro House", "Nu Disco", "Ambient"],
  "Afro House": ["House", "Deep House", "Disco"],
  Techno: ["Minimal", "Acid", "Electro", "IDM"],
  Minimal: ["Techno", "House", "Electro"],
  Acid: ["Techno", "Electro", "House"],
  Electro: ["Techno", "Acid", "Synthwave"],
  Disco: ["Nu Disco", "House", "Afro House"],
  "Nu Disco": ["Disco", "House", "Synthwave"],
  Ambient: ["IDM", "Deep House"],
  IDM: ["Ambient", "Techno", "Synthwave"],
  Synthwave: ["Electro", "Nu Disco", "IDM"],
};

export type SimilarHit = {
  track: Track;
  score: number;
  reasons: string[];
};

function bpmClose(a?: number, b?: number): number {
  if (a == null || b == null) return 0;
  const d = Math.abs(a - b);
  if (d <= 2) return 18;
  if (d <= 5) return 12;
  if (d <= 8) return 6;
  return 0;
}

function scorePair(seed: Track, candidate: Track): SimilarHit | null {
  if (seed.id === candidate.id) return null;
  let score = 0;
  const reasons: string[] = [];

  if (seed.artist === candidate.artist) {
    score += 28;
    reasons.push("stesso artista");
  }
  if (seed.label === candidate.label) {
    score += 14;
    reasons.push("stessa label");
  }
  if (seed.genre === candidate.genre) {
    score += 36;
    reasons.push(`stesso genere (${seed.genre})`);
  } else if ((GENRE_NEIGHBORS[seed.genre] ?? []).includes(candidate.genre)) {
    score += 22;
    reasons.push(`genere vicino (${candidate.genre})`);
  }

  const bpmPts = bpmClose(seed.bpm, candidate.bpm);
  if (bpmPts) {
    score += bpmPts;
    reasons.push(`BPM vicino (${candidate.bpm ?? "—"})`);
  }

  if (seed.key && candidate.key && seed.key === candidate.key) {
    score += 10;
    reasons.push(`stessa tonalità (${seed.key})`);
  }

  if (seed.mood && candidate.mood) {
    const a = seed.mood.toLowerCase().split(/\s+/);
    const b = new Set(candidate.mood.toLowerCase().split(/\s+/));
    const overlap = a.filter((w) => b.has(w));
    if (overlap.length) {
      score += 8 * overlap.length;
      reasons.push("mood simile");
    }
  }

  const sharedRails = seed.rails.filter((r) => candidate.rails.includes(r));
  if (sharedRails.length) {
    score += 4 * sharedRails.length;
    reasons.push("stessa zona catalogo");
  }

  if (score < 18) return null;
  return { track: candidate, score, reasons: reasons.slice(0, 3) };
}

/** Simili a una traccia (stile Diggleist / “chi ha preso questo…”). */
export function findSimilar(trackId: string, limit = 8): SimilarHit[] {
  const seed = TRACKS.find((t) => t.id === trackId);
  if (!seed) return [];
  return TRACKS.map((c) => scorePair(seed, c))
    .filter((h): h is SimilarHit => h != null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Simili a tutta la collezione: media pesata sui seed. */
export function findSimilarToCollection(
  trackIds: string[],
  limit = 12,
): SimilarHit[] {
  const seeds = TRACKS.filter((t) => trackIds.includes(t.id));
  if (seeds.length === 0) return [];

  const exclude = new Set(trackIds);
  const acc = new Map<string, SimilarHit>();

  for (const seed of seeds) {
    for (const c of TRACKS) {
      if (exclude.has(c.id)) continue;
      const hit = scorePair(seed, c);
      if (!hit) continue;
      const prev = acc.get(c.id);
      if (!prev || hit.score > prev.score) {
        acc.set(c.id, {
          ...hit,
          reasons: Array.from(
            new Set([`come ${seed.title}`, ...hit.reasons]),
          ).slice(0, 3),
        });
      } else if (prev) {
        prev.score += Math.round(hit.score * 0.35);
      }
    }
  }

  return Array.from(acc.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** “Spesso presi insieme” — co-occorrenza di genere/rail. */
export function frequentlyTogether(trackId: string, limit = 4): Track[] {
  return findSimilar(trackId, limit).map((h) => h.track);
}
