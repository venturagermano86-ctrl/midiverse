import { NextResponse } from "next/server";
import { buildDigList, digSearchQuery, type DigMode } from "@/lib/engines/diglist";
import { itunesSearch } from "@/lib/live/itunes";
import type { Track } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    seeds?: Track[];
    mode?: DigMode;
  };
  const seeds = (body.seeds ?? []).filter((t) => t?.id && t?.title).slice(0, 6);
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
  return NextResponse.json(
    {
      ...result,
      seeds: seeds.map((t) => ({ id: t.id, title: t.title, artist: t.artist })),
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}
