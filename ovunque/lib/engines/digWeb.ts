import { TRACKS } from "../catalog";
import { resolveGenre } from "../genres";
import type { Track } from "../types";

/**
 * Ragnatela Diglist:
 * seed → artista → altre release → label → roster label → artisti vicini → croci
 * Solo nodi collegati. Mai dump catalogo a caso.
 */

export type WebHit = {
  track: Track;
  score: number;
  paths: string[];
};

function norm(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

function familyOf(t: Track): string {
  return resolveGenre(t.genre).familySlug;
}

/** Stessa famiglia di genere di almeno un seed (hard gate). */
export function inSeedTerritory(seeds: Track[], t: Track): boolean {
  const families = new Set(seeds.map(familyOf));
  const genres = new Set(seeds.map((s) => norm(s.genre)));
  if (families.has(familyOf(t))) return true;
  if (genres.has(norm(t.genre))) return true;
  // BPM vicino + stessa famiglia allargata house↔techno solo se bpm tight
  const tFam = familyOf(t);
  const houseTechno =
    (tFam === "house" || tFam === "techno") &&
    seeds.some((s) => {
      const f = familyOf(s);
      return (
        (f === "house" || f === "techno") &&
        s.bpm != null &&
        t.bpm != null &&
        Math.abs(s.bpm - t.bpm) <= 4
      );
    });
  return houseTechno;
}

function bpmScore(seed: Track, t: Track): number {
  if (seed.bpm == null || t.bpm == null) return 0;
  const d = Math.abs(seed.bpm - t.bpm);
  if (d <= 2) return 28;
  if (d <= 4) return 18;
  if (d <= 6) return 8;
  return 0;
}

type EdgeAcc = Map<string, { score: number; paths: Set<string> }>;

function bump(acc: EdgeAcc, id: string, pts: number, path: string) {
  if (pts <= 0) return;
  let row = acc.get(id);
  if (!row) {
    row = { score: 0, paths: new Set() };
    acc.set(id, row);
  }
  row.score += pts;
  row.paths.add(path);
}

/**
 * Cammina la ragnatela partendo dai pick:
 * 1) stesso artista
 * 2) stessa etichetta (roster)
 * 3) artisti che condividono label con i pick
 * 4) release con genere+BPM nel territorio dei seed
 * 5) rails / mood condivisi (peso basso)
 */
export function walkDigWeb(
  seeds: Track[],
  extras: Track[],
  limit: number,
): WebHit[] {
  const picked = seeds.slice(0, 6);
  if (picked.length === 0) return [];

  const seedIds = new Set(picked.map((s) => s.id));
  const pool = [...TRACKS, ...extras].filter(
    (t) => !seedIds.has(t.id) && inSeedTerritory(picked, t),
  );

  const byArtist = new Map<string, Track[]>();
  const byLabel = new Map<string, Track[]>();
  pool.forEach((t) => {
    const a = norm(t.artist);
    const l = norm(t.label);
    if (!byArtist.has(a)) byArtist.set(a, []);
    byArtist.get(a)!.push(t);
    if (l && l !== "—" && l !== "-") {
      if (!byLabel.has(l)) byLabel.set(l, []);
      byLabel.get(l)!.push(t);
    }
  });

  const seedArtists = new Set(picked.map((s) => norm(s.artist)));
  const seedLabels = new Set(
    picked.map((s) => norm(s.label)).filter((l) => l && l !== "—" && l !== "-"),
  );
  const seedGenres = new Set(picked.map((s) => norm(s.genre)));
  const seedRails = new Set(
    picked.flatMap((s) => s.rails.filter((r) => r !== "novita" && r !== "gratis")),
  );

  // Label → artisti sul roster (per trovare artisti "vicini di etichetta")
  const rosterArtists = new Set<string>();
  seedLabels.forEach((lab) => {
    (byLabel.get(lab) ?? []).forEach((t) => rosterArtists.add(norm(t.artist)));
  });
  // anche artisti già nei seed restano
  seedArtists.forEach((a) => rosterArtists.add(a));

  const acc: EdgeAcc = new Map();

  picked.forEach((seed) => {
    const sa = norm(seed.artist);
    const sl = norm(seed.label);

    // --- filo artista ---
    (byArtist.get(sa) ?? []).forEach((t) => {
      bump(acc, t.id, 90 + bpmScore(seed, t), `artista:${seed.artist}`);
    });

    // --- filo etichetta (dove è uscito) ---
    if (sl && sl !== "—") {
      (byLabel.get(sl) ?? []).forEach((t) => {
        bump(acc, t.id, 70 + bpmScore(seed, t), `label:${seed.label}`);
      });
    }

    // --- filo roster: altri artisti della stessa label dei pick ---
    rosterArtists.forEach((artist) => {
      if (artist === sa) return;
      (byArtist.get(artist) ?? []).forEach((t) => {
        // solo se condivide label seed O stesso genere seed
        const sameLabel = sl && norm(t.label) === sl;
        const sameGenre = seedGenres.has(norm(t.genre));
        if (!sameLabel && !sameGenre) return;
        bump(
          acc,
          t.id,
          (sameLabel ? 45 : 25) + bpmScore(seed, t),
          `roster:${artist}`,
        );
      });
    });

    // --- filo territorio: stesso genere esatto + BPM ---
    pool.forEach((t) => {
      if (norm(t.genre) !== norm(seed.genre)) return;
      const b = bpmScore(seed, t);
      if (b < 18) return; // BPM stretto obbligatorio sul filo genere
      bump(acc, t.id, 35 + b, `genere+bpm:${seed.genre}`);
    });

    // --- filo rails (gusto scaffale) ---
    const seedR = new Set(seed.rails.filter((r) => seedRails.has(r)));
    if (seedR.size) {
      pool.forEach((t) => {
        const shared = t.rails.filter((r) => seedR.has(r)).length;
        if (shared === 0) return;
        if (norm(t.artist) === sa || (sl && norm(t.label) === sl)) return; // già pesati
        bump(acc, t.id, shared * 8, `rail×${shared}`);
      });
    }
  });

  // Multi-seed boost: traccia toccata da ≥2 pick (croce ragnatela)
  const trackHits = new Map<string, number>();
  picked.forEach((seed) => {
    const sa = norm(seed.artist);
    const sl = norm(seed.label);
    pool.forEach((t) => {
      let link = false;
      if (norm(t.artist) === sa) link = true;
      if (sl && sl !== "—" && norm(t.label) === sl) link = true;
      if (
        norm(t.genre) === norm(seed.genre) &&
        seed.bpm != null &&
        t.bpm != null &&
        Math.abs(seed.bpm - t.bpm) <= 4
      ) {
        link = true;
      }
      if (link) {
        trackHits.set(t.id, (trackHits.get(t.id) ?? 0) + 1);
      }
    });
  });
  trackHits.forEach((n, id) => {
    if (n >= 2) bump(acc, id, 80 * (n - 1), `croce×${n}-seed`);
  });

  const byId = new Map<string, Track>();
  pool.forEach((t) => byId.set(t.id, t));

  const hits: WebHit[] = [];
  Array.from(acc.entries()).forEach(([id, row]) => {
    const track = byId.get(id);
    if (!track) return;
    // soglia: almeno un filo forte (artista/label/croce) oppure score alto
    const paths = Array.from(row.paths);
    const strong = paths.some(
      (p) =>
        p.startsWith("artista:") ||
        p.startsWith("label:") ||
        p.startsWith("croce") ||
        p.startsWith("roster:"),
    );
    if (!strong && row.score < 55) return;
    if (row.score < 40) return;
    hits.push({ track, score: row.score, paths });
  });

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
