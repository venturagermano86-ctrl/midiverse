import { NextResponse } from "next/server";
import { undergroundChart, type LaneId } from "@/lib/live/underground";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lane = (searchParams.get("lane") || "all") as LaneId;
  const limit = Math.min(40, Number(searchParams.get("limit") || 28));

  try {
    const { tracks, note, lane: used } = await undergroundChart(lane, limit);
    return NextResponse.json({
      source: "underground-live",
      lane: used,
      updatedAt: new Date().toISOString(),
      count: tracks.length,
      tracks,
      note,
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err), tracks: [] },
      { status: 502 },
    );
  }
}
