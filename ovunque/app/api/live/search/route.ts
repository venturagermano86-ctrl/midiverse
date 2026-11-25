import { NextResponse } from "next/server";
import { itunesSearch } from "@/lib/live/itunes";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "house techno").trim();
  const limit = Math.min(40, Number(searchParams.get("limit") || 24));

  try {
    const tracks = await itunesSearch(q, limit);
    return NextResponse.json({
      source: "itunes",
      query: q,
      count: tracks.length,
      tracks,
      note: "Risultati reali. I bottoni store aprono Beatport / Bandcamp / Juno / … sulla stessa traccia.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err), tracks: [] },
      { status: 502 },
    );
  }
}
