/** Estrae artisti/titoli da testo OCR di uno screenshot chart/wishlist. */

const NOISE =
  /^(play|pause|buy|save|wishlist|chart|charts|tracks|genres|account|search|go|free|digi|vinyl|bpm|key|minimal|techno|house|preview|station|short|long|list|followers|release|album|ep|single|\d+[,.]?\d*\s*€?|€\s*\d+|wav|mp3|flac|ago|hours?|days?|weeks?)$/i;

export type ScreenshotLine = {
  /** Query completa per search */
  query: string;
  artist?: string;
  title?: string;
};

function normKey(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function cleanToken(s: string): string {
  return s
    .replace(/^[\d.#)\-\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isNoise(s: string): boolean {
  const c = cleanToken(s);
  if (c.length < 2 || c.length > 80) return true;
  if (NOISE.test(c)) return true;
  if (/^[\d\s:./%-]+$/.test(c)) return true;
  if (/^https?:/i.test(c)) return true;
  return false;
}

/**
 * Parsa OCR → linee strutturate artista+titolo.
 * Preferisce "Artist - Title" e coppie di righe consecutive.
 */
export function parseScreenshotLines(
  ocrText: string,
  max = 8,
): ScreenshotLine[] {
  const lines = ocrText
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length >= 2 && l.length <= 100);

  const out: ScreenshotLine[] = [];
  const seen = new Set<string>();

  function push(artist: string | undefined, title: string | undefined) {
    const a = artist ? cleanToken(artist) : undefined;
    const t = title ? cleanToken(title) : undefined;
    if (a && isNoise(a) && !t) return;
    if (t && isNoise(t) && !a) return;
    if (!a && !t) return;
    if (a && isNoise(a) && t && isNoise(t)) return;

    const query = [a, t].filter(Boolean).join(" ").trim();
    if (query.length < 4) return;
    const key = normKey(query);
    if (seen.has(key)) return;
    // Evita duplicati solo-artista se già abbiamo artist+title
    if (a && !t) {
      for (const k of Array.from(seen)) {
        if (k.startsWith(normKey(a) + " ")) return;
      }
    }
    seen.add(key);
    out.push({
      query,
      artist: a && !isNoise(a) ? a : undefined,
      title: t && !isNoise(t) ? t : undefined,
    });
  }

  const usedPair = new Set<number>();

  function consumeTrailingLabel(i: number) {
    // Dopo Artist — Title spesso c’è solo la label (una parola) → non usarla come artista
    const next = lines[i + 1];
    if (!next || usedPair.has(i + 1)) return;
    const words = cleanToken(next).split(/\s+/).length;
    if (words === 1 && !isNoise(next)) usedPair.add(i + 1);
  }

  for (let i = 0; i < lines.length && out.length < max; i++) {
    const line = lines[i];
    if (isNoise(line)) continue;

    // "Artist - Title" / en/em dash
    const dash = line.match(/^(.{2,45}?)\s[-–—]\s(.{2,55})$/);
    if (dash) {
      push(dash[1], dash[2]);
      usedPair.add(i);
      consumeTrailingLabel(i);
      continue;
    }

    // "Title by Artist"
    const by = line.match(/^(.{2,55}?)\s+by\s+(.{2,45})$/i);
    if (by) {
      push(by[2], by[1]);
      usedPair.add(i);
      consumeTrailingLabel(i);
      continue;
    }

    // "Artist: Title"
    const colon = line.match(/^(.{2,45}?)\s*:\s+(.{2,55})$/);
    if (colon && !/^\d/.test(colon[1])) {
      push(colon[1], colon[2]);
      usedPair.add(i);
      consumeTrailingLabel(i);
      continue;
    }
  }

  // Coppie consecutive: riga artista + riga titolo (layout Beatport / chart)
  // Salta terze righe “label only” (es. Perlon sotto Artist/Title già preso).
  for (let i = 0; i < lines.length - 1 && out.length < max; i++) {
    if (usedPair.has(i) || usedPair.has(i + 1)) continue;
    const a = lines[i];
    const b = lines[i + 1];
    if (isNoise(a) || isNoise(b)) continue;
    if (a.length > 45 || b.length > 55) continue;
    if (NOISE.test(a) || NOISE.test(b)) continue;
    const aWords = cleanToken(a).split(/\s+/).length;
    const bWords = cleanToken(b).split(/\s+/).length;
    // Riga a 1 parola dopo altri hit → tipicamente label sotto il brano precedente
    if (out.length > 0 && aWords === 1) {
      usedPair.add(i); // consuma label, riprova dal prossimo
      continue;
    }
    // Serve almeno una riga “carnosa” (2+ parole) altrimenti è rumore UI
    if (aWords < 2 && bWords < 2) continue;
    push(a, b);
    usedPair.add(i);
    usedPair.add(i + 1);
    // Label sotto la coppia appena presa
    consumeTrailingLabel(i + 1);
  }

  // Righe singole residue solo se ancora poche (titolo o artista+titolo già sulla stessa riga)
  if (out.length < 2) {
    for (let i = 0; i < lines.length && out.length < max; i++) {
      if (usedPair.has(i)) continue;
      const line = lines[i];
      if (isNoise(line)) continue;
      if (!/[a-zA-ZÀ-ÿ]{3,}/.test(line)) continue;
      push(undefined, line);
    }
  }

  return out.slice(0, max);
}

/** Compat: solo stringhe query (usato dove non serve struttura). */
export function parseScreenshotQueries(ocrText: string, max = 8): string[] {
  return parseScreenshotLines(ocrText, max).map((l) => l.query);
}
