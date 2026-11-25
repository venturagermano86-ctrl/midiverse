create table if not exists wishlist (
  owner_sub text not null,
  track_id text not null,
  title text not null,
  artist text not null,
  label text not null default '—',
  genre text not null default 'Electronic',
  artwork_url text,
  preview_url text,
  best_price_eur double precision,
  best_store text,
  track_json jsonb not null,
  saved_at timestamptz not null default now(),
  primary key (owner_sub, track_id)
);

create index if not exists wishlist_owner_saved_idx
  on wishlist (owner_sub, saved_at desc);
