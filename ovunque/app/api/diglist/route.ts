import { NextResponse } from "next/server";
import { buildDigList, digSearchQuery, type DigMode } from "@/lib/engines/diglist";
import type { BuyerCollection } from "@/lib/engines/diglistBuyers";
import { scoutBandcampBuyers } from "@/lib/live/bandcampScout";
import { scoutDiscogsGraph } from "@/lib/live/discogsScout";
import { scoutItunesArtists } from "@/lib/live/itunesArtistScout";
import { enrichPreviews } from "@/lib/live/enrichPreview";
import { sanitizeTrack } from "@/lib/sanitizeTrack";
import { buyerCollectionsForSeeds } from "@/lib/wishlist";
import type { Track } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    seeds?: Track[];
    mode?: DigMode;
  };

  const seeds = (body.seeds ?? [])
    .map((t) => sanitizeTrack(t))
    .filter((t): t is Track => !!t?.id && !!t?.title)
    .slice(0, 6);
  const mode: DigMode = body.mode === "long" ? "long" : "short";

  if (seeds.length === 0) {
    return NextResponse.json({ error: "pick_required" }, { status: 400 });
  }

  let realBuyers: BuyerCollection[] = [];
  try {
    const cols = await buyerCollectionsForSeeds(seeds.map((s) => s.id));
    realBuyers = cols.map((c) => ({
      buyerId: c.buyerId,
      trackIds: c.trackIds,
      seedHits: c.seedHits,
    }));
  } catch {
    realBuyers = [];
  }

  const hasBcUrl = seeds.some((s) =>
    s.offers?.some(
      (o) =>
        o.storeId === "bandcamp" &&
        typeof o.url === "string" &&
        /bandcamp\.com\//i.test(o.url) &&
        !/\/search\?/i.test(o.url),
    ),
  );

  let bcNote = "";
  let bcTracks: Track[] = [];
  if (hasBcUrl) {
    try {
      const bc = await scoutBandcampBuyers(seeds, mode === "long" ? 16 : 8);
      bcTracks = bc.tracks;
      bcNote = bc.note;
    } catch {
      bcNote = "Bandcamp scout error";
    }
  } else {
    bcNote = "Bandcamp: nessun URL diretto sui pick";
  }

  let discogsTracks: Track[] = [];
  let discogsNote = "";
  try {
    const dg = await scoutDiscogsGraph(seeds, mode === "long" ? 20 : 12);
    discogsTracks = dg.tracks;
    discogsNote = dg.note;
  } catch {
    discogsNote = "Discogs scout error";
  }

  let itunesTracks: Track[] = [];
  let itunesNote = "";
  try {
    const it = await scoutItunesArtists(seeds, mode === "long" ? 16 : 10);
    itunesTracks = it.tracks;
    itunesNote = it.note;
  } catch {
    itunesNote = "iTunes scout error";
  }

  const scoutTracks = [...bcTracks, ...discogsTracks, ...itunesTracks];
  const result = buildDigList(seeds, itunesTracks, mode, realBuyers, scoutTracks);
  const tracks = await enrichPreviews(result.tracks, mode === "long" ? 8 : 5);

  return NextResponse.json(
    {
      mode: result.mode,
      tracks,
      note: [result.note, discogsNote, itunesNote, bcNote]
        .filter(Boolean)
        .join(" · "),
      method: result.method,
      scout: {
        bandcamp: bcTracks.length,
        discogs: discogsTracks.length,
        itunes: itunesTracks.length,
        web: result.web.length,
      },
      croci: result.croci.slice(0, 8).map((c) => ({
        trackId: c.trackId,
        buyers: c.buyers,
        seedLinks: c.seedLinks,
        multiSeedBuyers: c.multiSeedBuyers,
        score: c.score,
      })),
      seeds: seeds.map((t) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        label: t.label,
        genre: t.genre,
      })),
      queryHint: digSearchQuery(seeds),
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}
