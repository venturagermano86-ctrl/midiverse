/** Estrae query artist/title da testo OCR di uno screenshot chart/wishlist. */

const NOISE =
  /^(play|pause|buy|save|wishlist|chart|charts|tracks|genres|account|search|go|free|digi|vinyl|bpm|key|minimal|techno|house|preview|station|short|long|list|\d+[,.]?\d*\s*€?|€\s*\d+|wav|mp3|flac)$/i;

export function parseScreenshotQueries(ocrText: string, max = 8): string[] {
  const lines = ocrText
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length >= 3 && l.length <= 90);

  const queries: string[] = [];
  const seen = new Set<string>();

  function push(q: string) {
    const clean = q.replace(/^[\d.#)\-\s]+/, "").trim();
    if (clean.length < 4 || clean.length > 80) return;
    if (NOISE.test(clean)) return;
    const key = clean.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    queries.push(clean);
  }

  for (const line of lines) {
    // "Artist - Title" / "Artist – Title" / "Artist — Title"
    const dash = line.match(/^(.{2,40}?)\s[-–—]\s(.{2,50})$/);
    if (dash) {
      push(`${dash[1]} ${dash[2]}`);
      continue;
    }
    // "Title by Artist"
    const by = line.match(/^(.{2,50}?)\s+by\s+(.{2,40})$/i);
    if (by) {
      push(`${by[2]} ${by[1]}`);
      continue;
    }
    // Skip pure numbers / UI chrome
    if (/^[\d\s:./%-]+$/.test(line)) continue;
    if (NOISE.test(line)) continue;
    // Keep meaty lines (likely title or artist)
    if (/[a-zA-ZÀ-ÿ]{3,}/.test(line) && !/^https?:/i.test(line)) {
      push(line);
    }
  }

  // Pair consecutive short lines as artist + title
  if (queries.length < 3) {
    for (let i = 0; i < lines.length - 1 && queries.length < max; i++) {
      const a = lines[i];
      const b = lines[i + 1];
      if (
        a.length >= 3 &&
        a.length <= 40 &&
        b.length >= 3 &&
        b.length <= 50 &&
        !NOISE.test(a) &&
        !NOISE.test(b)
      ) {
        push(`${a} ${b}`);
      }
    }
  }

  return queries.slice(0, max);
}
