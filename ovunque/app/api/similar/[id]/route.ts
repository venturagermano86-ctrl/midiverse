import { NextResponse } from "next/server";
import { getTrack } from "@/lib/catalog";
import { findSimilar } from "@/lib/engines/similar";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const track = getTrack(params.id);
  if (!track) {
    return NextResponse.json({ error: "Traccia non trovata" }, { status: 404 });
  }
  const hits = findSimilar(params.id, 12);
  return NextResponse.json({
    trackId: params.id,
    similar: hits.map((h) => ({
      id: h.track.id,
      title: h.track.title,
      artist: h.track.artist,
      score: h.score,
      reasons: h.reasons,
    })),
  });
}
