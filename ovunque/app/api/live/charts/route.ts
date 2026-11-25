import { NextResponse } from "next/server";
import { undergroundChart, type LaneId } from "@/lib/live/underground";
import { topWishlisted } from "@/lib/wishlist";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lane = searchParams.get("lane") || "all";
  const limit = Math.min(40, Number(searchParams.get("limit") || 28));

  try {
    // Chart community: più wishlist = più alto in classifica
    if (lane === "wishlisted") {
      const hits = await topWishlisted(limit);
      return NextResponse.json({
        source: "wishlist-community",
        lane: "wishlisted",
        updatedAt: new Date().toISOString(),
        count: hits.length,
        tracks: hits.map((h) => h.track),
        note:
          hits.length > 0
            ? "Most wishlisted · i dischi più salvati dagli utenti salgono in chart"
            : "Ancora vuota — salva tracce in wishlist e diventano chart",
      });
    }

    const { tracks, note, lane: used } = await undergroundChart(
      lane as LaneId,
      limit,
    );
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
