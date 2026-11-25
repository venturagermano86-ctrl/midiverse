import { sql } from "./db";
import type { Track } from "./types";
import { cheapestOffer } from "./engines/price";

export type WishlistRow = {
  owner_sub: string;
  track_id: string;
  title: string;
  artist: string;
  label: string;
  genre: string;
  artwork_url: string | null;
  preview_url: string | null;
  best_price_eur: number | null;
  best_store: string | null;
  track_json: Track;
  saved_at: string;
};

export async function listWishlist(ownerSub: string): Promise<WishlistRow[]> {
  return sql<WishlistRow>(
    `select owner_sub, track_id, title, artist, label, genre, artwork_url, preview_url,
            best_price_eur, best_store, track_json, saved_at
     from wishlist
     where owner_sub = $1
     order by saved_at desc`,
    [ownerSub],
  );
}

export async function saveToWishlist(ownerSub: string, track: Track): Promise<void> {
  const best = cheapestOffer(track);
  await sql(
    `insert into wishlist (
       owner_sub, track_id, title, artist, label, genre,
       artwork_url, preview_url, best_price_eur, best_store, track_json
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
     on conflict (owner_sub, track_id) do update set
       title = excluded.title,
       artist = excluded.artist,
       label = excluded.label,
       genre = excluded.genre,
       artwork_url = excluded.artwork_url,
       preview_url = excluded.preview_url,
       best_price_eur = excluded.best_price_eur,
       best_store = excluded.best_store,
       track_json = excluded.track_json,
       saved_at = now()`,
    [
      ownerSub,
      track.id,
      track.title,
      track.artist,
      track.label,
      track.genre,
      track.artworkUrl ?? null,
      track.previewUrl ?? null,
      best?.priceEur ?? null,
      best?.storeId ?? null,
      JSON.stringify(track),
    ],
  );
}

export async function removeFromWishlist(ownerSub: string, trackId: string): Promise<void> {
  await sql(`delete from wishlist where owner_sub = $1 and track_id = $2`, [
    ownerSub,
    trackId,
  ]);
}

export async function wishlistIds(ownerSub: string): Promise<string[]> {
  const rows = await sql<{ track_id: string }>(
    `select track_id from wishlist where owner_sub = $1 order by saved_at desc`,
    [ownerSub],
  );
  return rows.map((r) => r.track_id);
}

export type WishlistChartHit = {
  track_id: string;
  saves: number;
  track: Track;
};

export type CoWishHit = {
  track_id: string;
  shared_fans: number;
  seed_hits: number;
  track: Track;
};

/**
 * Diglist "a croce": tracce spesso in wishlist insieme ai seed
 * (chi ha salvato i pick ha anche salvato queste).
 */
export async function coWishlistedWithSeeds(
  seedIds: string[],
  limit = 36,
): Promise<CoWishHit[]> {
  const seeds = seedIds.filter(Boolean).slice(0, 6);
  if (seeds.length === 0) return [];

  const rows = await sql<{
    track_id: string;
    shared_fans: string | number;
    seed_hits: string | number;
    track_json: Track | string;
  }>(
    `with seed_owners as (
       select distinct owner_sub, track_id as seed_id
       from wishlist
       where track_id = any($1::text[])
     ),
     co as (
       select w.track_id,
              count(distinct w.owner_sub)::int as shared_fans,
              count(distinct so.seed_id)::int as seed_hits,
              (array_agg(w.track_json order by w.saved_at desc))[1] as track_json
       from wishlist w
       join seed_owners so on so.owner_sub = w.owner_sub
       where w.track_id <> all($1::text[])
       group by w.track_id
     )
     select track_id, shared_fans, seed_hits, track_json
     from co
     order by seed_hits desc, shared_fans desc
     limit $2`,
    [seeds, limit],
  );

  return rows.map((r) => {
    const track =
      typeof r.track_json === "string"
        ? (JSON.parse(r.track_json) as Track)
        : r.track_json;
    return {
      track_id: r.track_id,
      shared_fans: Number(r.shared_fans) || 0,
      seed_hits: Number(r.seed_hits) || 0,
      track: {
        ...track,
        id: track.id || r.track_id,
        source: track.source ?? "live",
      },
    };
  });
}

/**
 * Chart community: più una traccia è in wishlist (utenti distinti), più sale.
 */
export async function topWishlisted(limit = 28): Promise<WishlistChartHit[]> {
  const rows = await sql<{
    track_id: string;
    saves: string | number;
    track_json: Track | string;
  }>(
    `select track_id,
            count(distinct owner_sub)::int as saves,
            (array_agg(track_json order by saved_at desc))[1] as track_json
     from wishlist
     group by track_id
     order by saves desc, max(saved_at) desc
     limit $1`,
    [limit],
  );

  return rows.map((r) => {
    const track =
      typeof r.track_json === "string"
        ? (JSON.parse(r.track_json) as Track)
        : r.track_json;
    const saves = Number(r.saves) || 0;
    return {
      track_id: r.track_id,
      saves,
      track: {
        ...track,
        id: track.id || r.track_id,
        wishlistSaves: saves,
        source: track.source ?? "live",
      },
    };
  });
}
