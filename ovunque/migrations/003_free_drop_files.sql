-- Free drops: audio + cover caricati (non solo URL)
alter table free_drops add column if not exists audio_bytes bytea;
alter table free_drops add column if not exists audio_mime text;
alter table free_drops add column if not exists cover_bytes bytea;
alter table free_drops add column if not exists cover_mime text;
