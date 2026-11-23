import { NextResponse } from "next/server";
import { getTrack } from "@/lib/catalog";
import { scanTrack } from "@/lib/scanners/engine";

type Ctx = { params: { id: string } };

/** GET /api/scan/:id — esegue il motore multi-portale (demo adapters). */
export async function GET(_req: Request, { params }: Ctx) {
  const track = getTrack(params.id);
  if (!track) {
    return NextResponse.json({ error: "Traccia non trovata" }, { status: 404 });
  }
  const report = scanTrack(track);
  return NextResponse.json(report);
}
