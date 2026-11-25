import { NextResponse } from "next/server";
import { getTrack } from "@/lib/catalog";
import { buildStationQueue, stationSearchQuery } from "@/lib/engines/station";
import { itunesLookup, itunesSearch } from "@/lib/live/itunes";
import type { Track } from "@/lib/types";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

async function resolveSeed(id: string, bodyTrack?: Track | null): Promise<Track | null> {
  if (bodyTrack?.id === id) return bodyTrack;
  const curated = getTrack(id);
  if (curated) return curated;
  if (id.startsWith("itunes")) return itunesLookup(id);
  return null;
}

export async function GET(_req: Request, { params }: Ctx) {
  const seed = await resolveSeed(params.id);
  if (!seed) {
    return NextResponse.json({ error: "track_not_found" }, { status: 404 });
  }

  let live: Track[] = [];
  try {
    live = await itunesSearch(stationSearchQuery(seed), 20);
  } catch {
    live = [];
  }

  const queue = buildStationQueue(seed, live, 24);
  return NextResponse.json(
    {
      seedId: seed.id,
      count: queue.length,
      note: "Station · dischi molto simili (Dig List / SoundCloud style)",
      items: queue.map((item, i) => ({
        index: i,
        reason: item.reason,
        track: item.track,
      })),
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function POST(req: Request, { params }: Ctx) {
  const body = (await req.json().catch(() => ({}))) as { track?: Track };
  const seed = await resolveSeed(params.id, body.track ?? null);
  if (!seed) {
    return NextResponse.json({ error: "track_not_found" }, { status: 404 });
  }

  let live: Track[] = [];
  try {
    live = await itunesSearch(stationSearchQuery(seed), 20);
  } catch {
    live = [];
  }

  const queue = buildStationQueue(seed, live, 24);
  return NextResponse.json(
    {
      seedId: seed.id,
      count: queue.length,
      note: "Station · lista dig molto simili",
      items: queue.map((item, i) => ({
        index: i,
        reason: item.reason,
        track: item.track,
      })),
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}
