-- Free download drops submitted by users → Free chart
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
);

create index if not exists free_drops_bumped_idx
  on free_drops (bumped_at desc);

create index if not exists free_drops_track_idx
  on free_drops (track_id);
