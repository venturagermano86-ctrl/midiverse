import { sql } from "./db";
import { hasFreeOffer } from "./catalog";
import { sanitizeTrack, safeHttpsUrl } from "./sanitizeTrack";
import type { Offer, Track } from "./types";

export type FreeDropInput = {
  title: string;
  artist: string;
  label?: string;
  genre?: string;
  downloadUrl: string;
  artworkUrl?: string;
  previewUrl?: string;
  trackId?: string;
};

function slugId(artist: string, title: string): string {
  const base = `${artist}-${title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
  return `free-${base || "drop"}`;
}

export function buildFreeTrack(input: FreeDropInput): Track | null {
  const downloadUrl = safeHttpsUrl(input.downloadUrl);
  if (!downloadUrl) return null;
  const title = (input.title || "").trim().slice(0, 200);
  const artist = (input.artist || "").trim().slice(0, 200);
  if (!title || !artist) return null;

  const host = (() => {
    try {
      return new URL(downloadUrl).hostname.replace(/^www\./, "");
    } catch {
      return "free";
    }
  })();

  const storeId =
    host.includes("soundcloud")
      ? "soundcloud"
      : host.includes("bandcamp")
        ? "bandcamp"
        : host.includes("youtube") || host.includes("youtu.be")
          ? "youtube"
          : "freesound";

  const freeOffer: Offer = {
    storeId,
    kind: "free",
    priceEur: 0,
    currency: "EUR",
    format: "Free download",
    url: downloadUrl,
    access: "download",
    live: true,
    media: "digital",
  };

  const raw: Track = {
    id: (input.trackId || slugId(artist, title)).slice(0, 120),
    title,
    artist,
    label: (input.label || "Free drop").trim().slice(0, 200) || "Free drop",
    genre: (input.genre || "Electronic").trim().slice(0, 80) || "Electronic",
    year: new Date().getFullYear(),
    mood: "free",
    coverHue: (artist.length * 17 + title.length * 31) % 360,
    suggested: true,
    rails: ["gratis", "novita", "per-te"],
    offers: [freeOffer],
    artworkUrl: safeHttpsUrl(input.artworkUrl),
    previewUrl: safeHttpsUrl(input.previewUrl),
    source: "live",
    hasVinyl: false,
  };

  return sanitizeTrack(raw) ?? raw;
}

export async function submitFreeDrop(
  ownerSub: string,
  input: FreeDropInput,
): Promise<Track> {
  const track = buildFreeTrack(input);
  if (!track || !hasFreeOffer(track)) {
    throw new Error("invalid_free_drop");
  }
  const downloadUrl =
    track.offers.find((o) => o.kind === "free")?.url || input.downloadUrl;

  await sql(
    `insert into free_drops (
       track_id, owner_sub, title, artist, label, genre,
       download_url, artwork_url, preview_url, track_json, bumped_at
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb, now())
     on conflict (track_id, owner_sub) do update set
       title = excluded.title,
       artist = excluded.artist,
       label = excluded.label,
       genre = excluded.genre,
       download_url = excluded.download_url,
       artwork_url = excluded.artwork_url,
       preview_url = excluded.preview_url,
       track_json = excluded.track_json,
       bumped_at = now()`,
    [
      track.id,
      ownerSub,
      track.title,
      track.artist,
      track.label,
      track.genre,
      downloadUrl,
      track.artworkUrl ?? null,
      track.previewUrl ?? null,
      JSON.stringify(track),
    ],
  );

  return track;
}

export type FreeChartHit = {
  track_id: string;
  bumps: number;
  track: Track;
};

/** Chart Free: più bump / utenti distinti → più alto. */
export async function topFreeChart(limit = 28): Promise<FreeChartHit[]> {
  const rows = await sql<{
    track_id: string;
    bumps: string | number;
    track_json: Track | string;
  }>(
    `select track_id,
            count(distinct owner_sub)::int as bumps,
            (array_agg(track_json order by bumped_at desc))[1] as track_json
     from free_drops
     group by track_id
     order by bumps desc, max(bumped_at) desc
     limit $1`,
    [limit],
  );

  return rows.map((r) => {
    const parsed =
      typeof r.track_json === "string"
        ? (JSON.parse(r.track_json) as Track)
        : r.track_json;
    const track = sanitizeTrack(parsed) ?? parsed;
    const bumps = Number(r.bumps) || 0;
    return {
      track_id: r.track_id,
      bumps,
      track: {
        ...track,
        id: track.id || r.track_id,
        wishlistSaves: bumps,
        rails: Array.from(new Set([...(track.rails || []), "gratis"])),
        source: track.source ?? "live",
      },
    };
  });
}
