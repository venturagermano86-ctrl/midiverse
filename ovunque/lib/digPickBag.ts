import type { Track } from "./types";

const PREFIX = "dig.pick.bag.";
const LAST_KEY = "dig.pick.last";

export type DigPickBag = {
  id: string;
  mode: "short" | "long";
  seeds: Track[];
  savedAt: number;
};

function bagId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 10);
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Campi minimi per Diglist (URL-safe, niente offers grosse). */
function slimSeed(t: Track): Track {
  return {
    id: t.id,
    title: t.title,
    artist: t.artist,
    label: t.label || "—",
    genre: t.genre || "Electronic",
    year: t.year || new Date().getFullYear(),
    mood: t.mood || "club",
    coverHue: t.coverHue ?? 200,
    suggested: !!t.suggested,
    rails: Array.isArray(t.rails) ? t.rails.slice(0, 4) : [],
    offers: [],
    bpm: t.bpm,
    artworkUrl: t.artworkUrl,
    previewUrl: t.previewUrl,
    source: t.source,
  };
}

function toBase64Url(json: string): string {
  const b64 =
    typeof btoa === "function"
      ? btoa(unescape(encodeURIComponent(json)))
      : Buffer.from(json, "utf8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(raw: string): string {
  const b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const full = b64 + pad;
  if (typeof atob === "function") {
    return decodeURIComponent(escape(atob(full)));
  }
  return Buffer.from(full, "base64").toString("utf8");
}

/** Payload seeds nell'URL — funziona anche se localStorage è vuoto / scheda nuova. */
export function encodeSeedsParam(
  mode: "short" | "long",
  seeds: Track[],
): string {
  const payload = {
    m: mode,
    s: seeds.slice(0, 6).map(slimSeed),
  };
  return toBase64Url(JSON.stringify(payload));
}

export function decodeSeedsParam(raw: string | null): DigPickBag | null {
  if (!raw || raw.length < 8 || raw.length > 12000) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(raw)) as {
      m?: string;
      s?: Track[];
    };
    const seeds = (parsed.s ?? []).filter((t) => t?.id && t?.title).slice(0, 6);
    if (seeds.length === 0) return null;
    return {
      id: "url",
      mode: parsed.m === "long" ? "long" : "short",
      seeds: seeds.map(slimSeed),
      savedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

/** Salva i pick in localStorage (condiviso tra schede) e restituisce l'id URL. */
export function stashDigPicks(mode: "short" | "long", seeds: Track[]): string {
  const id = bagId();
  const bag: DigPickBag = {
    id,
    mode,
    seeds: seeds.slice(0, 6).map(slimSeed),
    savedAt: Date.now(),
  };
  const raw = JSON.stringify(bag);
  try {
    localStorage.setItem(PREFIX + id, raw);
    localStorage.setItem(LAST_KEY, raw);
  } catch {
    /* quota / private mode */
  }
  return id;
}

export function loadDigPicks(
  bag: string | null,
  seedsParam?: string | null,
): DigPickBag | null {
  // 1) seeds nell'URL (affidabile cross-tab / privacy browsers)
  const fromUrl = decodeSeedsParam(seedsParam ?? null);
  if (fromUrl) return fromUrl;

  try {
    if (bag) {
      const raw = localStorage.getItem(PREFIX + bag);
      if (raw) return JSON.parse(raw) as DigPickBag;
    }
    const last = localStorage.getItem(LAST_KEY);
    if (last) return JSON.parse(last) as DigPickBag;
  } catch {
    /* ignore */
  }
  return null;
}
