import { NextResponse } from "next/server";
import { getTrack } from "@/lib/catalog";
import { itunesLookup } from "@/lib/live/itunes";

type Ctx = { params: { id: string } };

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: Ctx) {
  const curated = getTrack(params.id);
  if (curated) {
    return NextResponse.json({ track: curated, source: "curated" });
  }
  const live = await itunesLookup(params.id);
  if (!live) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ track: live, source: "itunes" });
}
