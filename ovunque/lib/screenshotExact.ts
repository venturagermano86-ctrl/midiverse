/**
 * Match esatto traccia da OCR screenshot — non “simili”.
 * Score alto solo se artista e/o titolo combaciano davvero.
 */

import type { Track } from "./types";
import type { ScreenshotLine } from "./screenshotParse";

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string): string[] {
  return norm(s)
    .split(" ")
    .filter((t) => t.length >= 2 && !STOP.has(t));
}

const STOP = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "feat",
  "ft",
  "featuring",
  "vs",
  "with",
  "remix",
  "mix",
  "edit",
  "original",
  "extended",
  "radio",
  "version",
]);

/** Quanti token di needle compaiono in haystack (0–1). */
function tokenCoverage(needle: string, haystack: string): number {
  const n = tokens(needle);
  if (!n.length) return 0;
  const h = norm(haystack);
  let hit = 0;
  for (const t of n) {
    if (h.includes(t)) hit++;
  }
  return hit / n.length;
}

function includesLoose(hay: string, needle: string): boolean {
  const h = norm(hay);
  const n = norm(needle);
  if (!n || n.length < 2) return false;
  if (h.includes(n) || n.includes(h)) return true;
  return tokenCoverage(needle, hay) >= 0.75;
}

export type ExactPick = {
  track: Track;
  score: number;
  line: ScreenshotLine;
};

/**
 * Score 0–100. Soglia tipica accettazione: ≥ 62 (artista+titolo) o ≥ 78 (solo titolo forte).
 */
export function scoreExactMatch(line: ScreenshotLine, track: Track): number {
  const artist = line.artist;
  const title = line.title;
  let score = 0;

  if (artist && title) {
    const a = tokenCoverage(artist, track.artist);
    const t = tokenCoverage(title, track.title);
    score = Math.round(a * 48 + t * 52);
    if (includesLoose(track.artist, artist) && includesLoose(track.title, title)) {
      score = Math.max(score, 88);
    }
    // Penalizza se artista OCR non c’entra
    if (a < 0.35) score = Math.min(score, 40);
    if (t < 0.35) score = Math.min(score, 45);
    return score;
  }

  if (artist && !title) {
    const a = tokenCoverage(artist, track.artist);
    score = Math.round(a * 70);
    // Senza titolo non accettiamo “simile” — serve quasi match artista pieno + titolo nella query
    const qTitle = tokenCoverage(line.query, `${track.artist} ${track.title}`);
    score = Math.round(score * 0.4 + qTitle * 60);
    return score;
  }

  if (title && !artist) {
    const t = tokenCoverage(title, track.title);
    score = Math.round(t * 85);
    if (includesLoose(track.title, title)) score = Math.max(score, 80);
    return score;
  }

  // Solo query libera: richiedi copertura alta su artist+title insieme
  const both = `${track.artist} ${track.title}`;
  const cov = tokenCoverage(line.query, both);
  score = Math.round(cov * 90);
  if (includesLoose(both, line.query)) score = Math.max(score, 75);
  return score;
}

/** Soglia minima per considerare “è quella traccia”. */
export const EXACT_MIN_SCORE = 62;

/**
 * Tra i candidati, tieni solo il miglior match esatto per quella riga OCR.
 * Se nessuno supera la soglia → null (non riempire con simili).
 */
export function pickExactTrack(
  line: ScreenshotLine,
  candidates: Track[],
  minScore = EXACT_MIN_SCORE,
): ExactPick | null {
  let best: ExactPick | null = null;
  for (const track of candidates) {
    const score = scoreExactMatch(line, track);
    if (score < minScore) continue;
    if (!best || score > best.score) best = { track, score, line };
  }
  return best;
}
