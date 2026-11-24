import { NextResponse } from "next/server";
import { itunesElectronicChart } from "@/lib/live/itunes";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tracks = await itunesElectronicChart(25);
    return NextResponse.json({
      source: "itunes-electronic-top",
      updatedAt: new Date().toISOString(),
      count: tracks.length,
      tracks,
      note: "Chart live Electronic/Dance. Ogni traccia apre Beatport, Bandcamp, Traxsource, Juno e gli altri store reali.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err), tracks: [] },
      { status: 502 },
    );
  }
}
