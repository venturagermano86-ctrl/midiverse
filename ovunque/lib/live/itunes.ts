import type { Track } from "../types";
import { buildStoreOffers, sampleVinylListings } from "./storeLinks";

type ItunesSong = {
  trackId?: number;
  collectionId?: number;
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  primaryGenreName?: string;
  releaseDate?: string;
  trackPrice?: number;
  currency?: string;
  trackViewUrl?: string;
  artworkUrl100?: string;
  artworkUrl600?: string;
  previewUrl?: string;
  isrc?: string;
};

function hueFromId(id: number): number {
  return id % 360;
}

function toTrack(song: ItunesSong): Track | null {
  if (!song.trackName || !song.artistName || !song.trackId) return null;
  const year = song.releaseDate ? new Date(song.releaseDate).getFullYear() : new Date().getFullYear();
  const price = typeof song.trackPrice === "number" ? song.trackPrice : null;
  const offers = buildStoreOffers(song.artistName, song.trackName, {
    appleUrl: song.trackViewUrl,
    applePriceUsd: price,
    seed: song.trackId,
    vinylListings: sampleVinylListings(song.artistName, song.trackName, song.trackId),
  });

  return {
    id: `itunes-${song.trackId}`,
    title: song.trackName,
    artist: song.artistName,
    label: song.collectionName ?? "—",
    genre: song.primaryGenreName ?? "Electronic",
    year,
    mood: "live catalog",
    coverHue: hueFromId(song.trackId),
    suggested: true,
    rails: ["live", "per-te", "novita"],
    isrc: song.isrc,
    hasVinyl: true,
    offers,
    artworkUrl: (song.artworkUrl600 || song.artworkUrl100 || "").replace(
      "100x100bb",
      "600x600bb",
    ),
    previewUrl: song.previewUrl,
    source: "itunes",
  };
}

export async function itunesSearch(
  term: string,
  limit = 24,
): Promise<Track[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=${limit}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`iTunes search ${res.status}`);
  const data = (await res.json()) as { results?: ItunesSong[] };
  return (data.results ?? []).map(toTrack).filter((t): t is Track => t != null);
}

/** Chart Electronic/Dance (genre 7) — top songs reali. */
export async function itunesElectronicChart(limit = 20): Promise<Track[]> {
  const url = `https://itunes.apple.com/us/rss/topsongs/limit=${limit}/genre=7/json`;
  const res = await fetch(url, { next: { revalidate: 600 } });
  if (!res.ok) throw new Error(`iTunes chart ${res.status}`);
  const data = (await res.json()) as {
    feed?: {
      entry?: Array<{
        id?: { attributes?: { "im:id"?: string }; label?: string };
        "im:name"?: { label?: string };
        "im:artist"?: { label?: string };
        "im:collection"?: { label?: string };
        "im:price"?: { label?: string; attributes?: { amount?: string } };
        "im:image"?: Array<{ label?: string }>;
        link?: Array<{ attributes?: { href?: string; rel?: string } }> | { attributes?: { href?: string } };
        category?: { attributes?: { label?: string } };
      }>;
    };
  };

  const entries = data.feed?.entry ?? [];
  const tracks: Track[] = [];

  for (const e of entries) {
    const title = e["im:name"]?.label;
    const artist = e["im:artist"]?.label;
    const id = e.id?.attributes?.["im:id"];
    if (!title || !artist || !id) continue;

    let appleUrl = "";
    const link = e.link;
    if (Array.isArray(link)) {
      appleUrl = link.find((l) => l.attributes?.rel === "alternate")?.attributes?.href
        ?? link[0]?.attributes?.href
        ?? "";
    } else if (link?.attributes?.href) {
      appleUrl = link.attributes.href;
    }

    const amountStr = e["im:price"]?.attributes?.amount;
    const amount = amountStr ? Number(amountStr) : null;
    const art = e["im:image"]?.at(-1)?.label;

    const offers = buildStoreOffers(artist, title, {
      appleUrl: appleUrl || undefined,
      applePriceUsd: amount,
      seed: Number(id) || 0,
      vinylListings: sampleVinylListings(artist, title, Number(id) || 0),
    });

    tracks.push({
      id: `itunes-chart-${id}`,
      title,
      artist,
      label: e["im:collection"]?.label ?? "—",
      genre: e.category?.attributes?.label ?? "Electronic",
      year: new Date().getFullYear(),
      mood: "chart",
      coverHue: Number(id) % 360,
      suggested: true,
      rails: ["live", "novita"],
      hasVinyl: true,
      offers,
      artworkUrl: art,
      source: "itunes",
    });
  }

  return tracks;
}

export async function itunesLookup(trackId: string): Promise<Track | null> {
  const numeric = trackId.replace(/^itunes-(chart-)?/, "");
  if (!/^\d+$/.test(numeric)) return null;
  const url = `https://itunes.apple.com/lookup?id=${numeric}&entity=song`;
  const res = await fetch(url, { next: { revalidate: 600 } });
  if (!res.ok) return null;
  const data = (await res.json()) as { results?: ItunesSong[] };
  const song = (data.results ?? []).find((r) => r.trackId === Number(numeric))
    ?? data.results?.[0];
  return song ? toTrack(song) : null;
}
