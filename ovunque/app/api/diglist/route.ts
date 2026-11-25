import { NextResponse } from "next/server";
import { buildDigList, digSearchQuery, type DigMode } from "@/lib/engines/diglist";
import type { BuyerCollection } from "@/lib/engines/diglistBuyers";
import { enrichPreviews } from "@/lib/live/enrichPreview";
import { itunesSearch } from "@/lib/live/itunes";
import { sanitizeTrack } from "@/lib/sanitizeTrack";
import { buyerCollectionsForSeeds } from "@/lib/wishlist";
import type { Track } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    seeds?: Track[];
    mode?: DigMode;
  };
  const seeds = (body.seeds ?? [])
    .map((t) => sanitizeTrack(t) ?? t)
    .filter((t) => t?.id && t?.title)
    .slice(0, 6) as Track[];
  const mode: DigMode = body.mode === "long" ? "long" : "short";

  if (seeds.length === 0) {
    return NextResponse.json({ error: "pick_required" }, { status: 400 });
  }

  // Diglist: acquirenti (wishlist owners) × collezioni
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

  // Live solo per arricchire metadati/preview di candidati già affini — query per titolo seed
  let live: Track[] = [];
  try {
    const batches = await Promise.all(
      seeds.slice(0, 3).map((s) => itunesSearch(`${s.artist} ${s.title}`, 4)),
    );
    const seen = new Set<string>();
    for (const batch of batches) {
      for (const t of batch) {
        if (seen.has(t.id)) continue;
        seen.add(t.id);
        live.push(t);
      }
    }
  } catch {
    live = [];
  }

  const result = buildDigList(seeds, live, mode, realBuyers);
  const tracks = await enrichPreviews(result.tracks, mode === "long" ? 6 : 4);

  return NextResponse.json(
    {
      mode: result.mode,
      tracks,
      note: result.note,
      method: result.method,
      croci: result.croci.slice(0, 12).map((c) => ({
        trackId: c.trackId,
        buyers: c.buyers,
        seedLinks: c.seedLinks,
        multiSeedBuyers: c.multiSeedBuyers,
        score: c.score,
      })),
      seeds: seeds.map((t) => ({ id: t.id, title: t.title, artist: t.artist })),
      queryHint: digSearchQuery(seeds),
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}
