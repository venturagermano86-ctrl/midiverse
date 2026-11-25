import { NextResponse } from "next/server";
import { buildDigList, digSearchQuery, type DigMode } from "@/lib/engines/diglist";
import { enrichPreviews } from "@/lib/live/enrichPreview";
import { itunesSearch } from "@/lib/live/itunes";
import { sanitizeTrack } from "@/lib/sanitizeTrack";
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

  let live: Track[] = [];
  try {
    live = await itunesSearch(digSearchQuery(seeds), mode === "long" ? 30 : 16);
  } catch {
    live = [];
  }

  const result = buildDigList(seeds, live, mode);
  // Consigliati curated spesso senza preview → attacca iTunes
  const tracks = await enrichPreviews(result.tracks, mode === "long" ? 6 : 4);

  return NextResponse.json(
    {
      ...result,
      tracks,
      seeds: seeds.map((t) => ({ id: t.id, title: t.title, artist: t.artist })),
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}
