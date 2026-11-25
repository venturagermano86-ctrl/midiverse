import { NextResponse } from "next/server";
import { buildDigList, digSearchQuery, type DigMode } from "@/lib/engines/diglist";
import type { BuyerCollection } from "@/lib/engines/diglistBuyers";
import { scoutBandcampBuyers } from "@/lib/live/bandcampScout";
import { scoutDiscogsGraph } from "@/lib/live/discogsScout";
import { enrichPreviews } from "@/lib/live/enrichPreview";
import { sanitizeTrack } from "@/lib/sanitizeTrack";
import { buyerCollectionsForSeeds } from "@/lib/wishlist";
import type { Track } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    seeds?: Track[];
    mode?: DigMode;
  };

  // Niente fallback su payload raw: se sanitize fallisce, scarta
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

  // 1) Bandcamp: chi ha comprato × collezione (se CF lascia passare)
  let bcNote = "";
  let bcTracks: Track[] = [];
  try {
    const bc = await scoutBandcampBuyers(seeds, mode === "long" ? 24 : 12);
    bcTracks = bc.tracks;
    bcNote = bc.note;
  } catch {
    bcNote = "Bandcamp scout error";
  }

  // 2) Discogs: dove è uscito → label roster → artista → stile (accurato)
  let discogsTracks: Track[] = [];
  let discogsNote = "";
  try {
    const dg = await scoutDiscogsGraph(seeds, mode === "long" ? 28 : 14);
    discogsTracks = dg.tracks;
    discogsNote = dg.note;
  } catch {
    discogsNote = "Discogs scout error";
  }

  const scoutTracks = [...bcTracks, ...discogsTracks];
  const result = buildDigList(seeds, [], mode, realBuyers, scoutTracks);
  const tracks = await enrichPreviews(result.tracks, mode === "long" ? 8 : 5);

  return NextResponse.json(
    {
      mode: result.mode,
      tracks,
      note: [result.note, discogsNote, bcNote].filter(Boolean).join(" · "),
      method: result.method,
      scout: {
        bandcamp: bcTracks.length,
        discogs: discogsTracks.length,
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
