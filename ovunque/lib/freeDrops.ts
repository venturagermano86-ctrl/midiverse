import { sql } from "./db";
import { hasFreeOffer } from "./catalog";
import { sanitizeTrack, safeHttpsUrl, safeMediaRef } from "./sanitizeTrack";
import type { Offer, Track } from "./types";

export type FreeDropInput = {
  title: string;
  artist: string;
  label?: string;
  genre?: string;
  /** Relative media path or https — prefer uploaded /api/free/media/... */
  downloadUrl: string;
  artworkUrl?: string;
  previewUrl?: string;
  trackId?: string;
};

export type FreeDropFiles = {
  audio: Buffer;
  audioMime: string;
  cover: Buffer;
  coverMime: string;
};

let schemaReady: Promise<void> | null = null;

export async function ensureFreeDropSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql(`
        create table if not exists free_drops (
          track_id text not null,
          owner_sub text not null,
          title text not null,
          artist text not null,
          label text not null default '—',
          genre text not null default 'Electronic',
          download_url text not null,
          artwork_url text,
          preview_url text,
          track_json jsonb not null,
          bumped_at timestamptz not null default now(),
          primary key (track_id, owner_sub)
        )`);
      await sql(
        `create index if not exists free_drops_bumped_idx on free_drops (bumped_at desc)`,
      );
      await sql(
        `create index if not exists free_drops_track_idx on free_drops (track_id)`,
      );
      await sql(`alter table free_drops add column if not exists audio_bytes bytea`);
      await sql(`alter table free_drops add column if not exists audio_mime text`);
      await sql(`alter table free_drops add column if not exists cover_bytes bytea`);
      await sql(`alter table free_drops add column if not exists cover_mime text`);
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  await schemaReady;
}

function slugId(artist: string, title: string): string {
  const base = `${artist}-${title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
  return `free-${base || "drop"}-${Date.now().toString(36)}`;
}

export function buildFreeTrack(input: FreeDropInput): Track | null {
  const downloadUrl = safeMediaRef(input.downloadUrl) || safeHttpsUrl(input.downloadUrl);
  if (!downloadUrl) return null;
  const title = (input.title || "").trim().slice(0, 200);
  const artist = (input.artist || "").trim().slice(0, 200);
  if (!title || !artist) return null;

  const freeOffer: Offer = {
    storeId: "freesound",
    kind: "free",
    priceEur: 0,
    currency: "EUR",
    format: "Free download",
    url: downloadUrl,
    access: "download",
    live: true,
    media: "digital",
  };

  const artwork =
    safeMediaRef(input.artworkUrl) || safeHttpsUrl(input.artworkUrl);
  const preview =
    safeMediaRef(input.previewUrl) ||
    safeHttpsUrl(input.previewUrl) ||
    downloadUrl;

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
    artworkUrl: artwork,
    previewUrl: preview,
    source: "live",
    hasVinyl: false,
  };

  return sanitizeTrack(raw) ?? raw;
}

export async function submitFreeDropWithFiles(
  ownerSub: string,
  input: Omit<FreeDropInput, "downloadUrl" | "artworkUrl" | "previewUrl">,
  files: FreeDropFiles,
): Promise<Track> {
  await ensureFreeDropSchema();

  const trackId = (input.trackId || slugId(input.artist, input.title)).slice(0, 120);
  const downloadUrl = `/api/free/media/${encodeURIComponent(trackId)}/audio`;
  const artworkUrl = `/api/free/media/${encodeURIComponent(trackId)}/cover`;

  const track = buildFreeTrack({
    ...input,
    trackId,
    downloadUrl,
    artworkUrl,
    previewUrl: downloadUrl,
  });
  if (!track || !hasFreeOffer(track)) {
    throw new Error("invalid_free_drop");
  }

  await sql(
    `insert into free_drops (
       track_id, owner_sub, title, artist, label, genre,
       download_url, artwork_url, preview_url, track_json,
       audio_bytes, audio_mime, cover_bytes, cover_mime, bumped_at
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14, now())
     on conflict (track_id, owner_sub) do update set
       title = excluded.title,
       artist = excluded.artist,
       label = excluded.label,
       genre = excluded.genre,
       download_url = excluded.download_url,
       artwork_url = excluded.artwork_url,
       preview_url = excluded.preview_url,
       track_json = excluded.track_json,
       audio_bytes = excluded.audio_bytes,
       audio_mime = excluded.audio_mime,
       cover_bytes = excluded.cover_bytes,
       cover_mime = excluded.cover_mime,
       bumped_at = now()`,
    [
      track.id,
      ownerSub,
      track.title,
      track.artist,
      track.label,
      track.genre,
      downloadUrl,
      artworkUrl,
      downloadUrl,
      JSON.stringify(track),
      files.audio,
      files.audioMime,
      files.cover,
      files.coverMime,
    ],
  );

  return track;
}

/** @deprecated URL-only submit — prefer submitFreeDropWithFiles */
export async function submitFreeDrop(
  ownerSub: string,
  input: FreeDropInput,
): Promise<Track> {
  await ensureFreeDropSchema();
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

export async function getFreeMedia(
  trackId: string,
  kind: "audio" | "cover",
): Promise<{ bytes: Buffer; mime: string } | null> {
  await ensureFreeDropSchema();
  const col = kind === "audio" ? "audio_bytes" : "cover_bytes";
  const mimeCol = kind === "audio" ? "audio_mime" : "cover_mime";
  const rows = await sql<Record<string, unknown>>(
    `select ${col} as bytes, ${mimeCol} as mime
     from free_drops
     where track_id = $1 and ${col} is not null
     order by bumped_at desc
     limit 1`,
    [trackId],
  );
  const row = rows[0];
  if (!row?.bytes) return null;
  const bytes = Buffer.isBuffer(row.bytes)
    ? row.bytes
    : Buffer.from(row.bytes as ArrayBuffer);
  const mime =
    typeof row.mime === "string" && row.mime.includes("/")
      ? row.mime
      : kind === "audio"
        ? "audio/mpeg"
        : "image/jpeg";
  return { bytes, mime };
}

export type FreeChartHit = {
  track_id: string;
  bumps: number;
  track: Track;
};

/** Chart Free: più bump / utenti distinti → più alto. */
export async function topFreeChart(limit = 28): Promise<FreeChartHit[]> {
  await ensureFreeDropSchema();
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
