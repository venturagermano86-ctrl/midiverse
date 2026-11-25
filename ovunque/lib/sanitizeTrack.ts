import type { Offer, StoreId, Track } from "./types";

const STORE_IDS = new Set<string>([
  "beatport",
  "bandcamp",
  "traxsource",
  "juno",
  "whatpeopleplay",
  "boomkat",
  "bleep",
  "clone",
  "hardwax",
  "decks",
  "deejay",
  "roughtrade",
  "discogs",
  "hhv",
  "juno_vinyl",
  "apple",
  "amazon",
  "soundcloud",
  "youtube",
  "freesound",
]);

const MAX_TRACK_JSON_BYTES = 24_000;
const MAX_STRING = 200;
const MAX_OFFERS = 24;
const MAX_RAILS = 12;

/** Solo https (niente javascript:/data:/http). */
export function safeHttpsUrl(value: unknown, maxLen = 2048): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, maxLen);
  if (!trimmed) return undefined;
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return undefined;
  }
  if (u.protocol !== "https:") return undefined;
  if (u.username || u.password) return undefined;
  return u.toString();
}

function clipStr(value: unknown, max = MAX_STRING): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function sanitizeOffer(raw: unknown): Offer | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const storeId = typeof o.storeId === "string" ? o.storeId : "";
  if (!STORE_IDS.has(storeId)) return null;
  const url = safeHttpsUrl(o.url);
  if (!url) return null;
  const kind = o.kind === "free" || o.kind === "paid" ? o.kind : "paid";
  const currency = o.currency === "USD" ? "USD" : "EUR";
  const priceEur =
    typeof o.priceEur === "number" && Number.isFinite(o.priceEur)
      ? Math.max(0, Math.min(o.priceEur, 99999))
      : o.priceEur === null
        ? null
        : null;
  const shippingEur =
    typeof o.shippingEur === "number" && Number.isFinite(o.shippingEur)
      ? Math.max(0, Math.min(o.shippingEur, 9999))
      : undefined;
  const media = o.media === "vinyl" || o.media === "digital" ? o.media : undefined;
  return {
    storeId: storeId as StoreId,
    kind,
    priceEur,
    shippingEur,
    priceFrom: o.priceFrom === true,
    choicesCount:
      typeof o.choicesCount === "number" && Number.isFinite(o.choicesCount)
        ? Math.max(0, Math.min(Math.floor(o.choicesCount), 9999))
        : undefined,
    currency,
    format: clipStr(o.format, 80) || "digital",
    url,
    access:
      o.access === "download" ||
      o.access === "name_your_price" ||
      o.access === "stream" ||
      o.access === "search"
        ? o.access
        : undefined,
    live: o.live === true,
    media,
  };
}

/**
 * Riduce un Track client a un oggetto sicuro da persistare / restituire.
 * URL non-https → droppati. Payload troppo grosso → null.
 */
export function sanitizeTrack(raw: unknown): Track | null {
  if (!raw || typeof raw !== "object") return null;
  const bytes = JSON.stringify(raw).length;
  if (bytes > MAX_TRACK_JSON_BYTES) return null;

  const t = raw as Record<string, unknown>;
  const id = clipStr(t.id, 120);
  const title = clipStr(t.title, MAX_STRING);
  const artist = clipStr(t.artist, MAX_STRING);
  if (!id || !title || !artist) return null;

  const offersIn = Array.isArray(t.offers) ? t.offers.slice(0, MAX_OFFERS) : [];
  const offers = offersIn
    .map(sanitizeOffer)
    .filter((o): o is Offer => o != null);

  const rails = Array.isArray(t.rails)
    ? t.rails
        .filter((r): r is string => typeof r === "string")
        .map((r) => r.slice(0, 64))
        .slice(0, MAX_RAILS)
    : [];

  const year =
    typeof t.year === "number" && Number.isFinite(t.year)
      ? Math.max(1900, Math.min(Math.floor(t.year), 2100))
      : new Date().getFullYear();

  const coverHue =
    typeof t.coverHue === "number" && Number.isFinite(t.coverHue)
      ? ((Math.floor(t.coverHue) % 360) + 360) % 360
      : 160;

  const source =
    t.source === "curated" || t.source === "itunes" || t.source === "live"
      ? t.source
      : "live";

  return {
    id,
    title,
    artist,
    label: clipStr(t.label, MAX_STRING) || "—",
    genre: clipStr(t.genre, 80) || "Electronic",
    bpm:
      typeof t.bpm === "number" && Number.isFinite(t.bpm)
        ? Math.max(1, Math.min(Math.floor(t.bpm), 300))
        : undefined,
    key: clipStr(t.key, 16) || undefined,
    year,
    mood: clipStr(t.mood, 80) || "dig",
    coverHue,
    suggested: t.suggested === true,
    rails,
    isrc: clipStr(t.isrc, 32) || undefined,
    offers,
    artworkUrl: safeHttpsUrl(t.artworkUrl),
    previewUrl: safeHttpsUrl(t.previewUrl),
    source,
    hasVinyl: t.hasVinyl === true,
    wishlistSaves:
      typeof t.wishlistSaves === "number" && Number.isFinite(t.wishlistSaves)
        ? Math.max(0, Math.min(Math.floor(t.wishlistSaves), 1_000_000))
        : undefined,
  };
}
