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
