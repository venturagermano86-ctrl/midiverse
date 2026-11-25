import { NextResponse } from "next/server";
import { requireIdentity } from "../../../../cursor/identity";
import { undergroundChart, type LaneId } from "@/lib/live/underground";
import { sanitizeTrack } from "@/lib/sanitizeTrack";
import { topWishlisted } from "@/lib/wishlist";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lane = searchParams.get("lane") || "all";
  const limit = Math.min(40, Math.max(1, Number(searchParams.get("limit") || 28) || 28));

  try {
    // Chart community: legge Postgres → solo viewer autenticati
    if (lane === "wishlisted") {
      const identity = await requireIdentity(req);
      if (identity instanceof Response) return identity;
      if (identity.kind !== "person") {
        return NextResponse.json({ error: "person_required" }, { status: 403 });
      }

      const hits = await topWishlisted(limit);
      const tracks = hits
        .map((h) => {
          const track = sanitizeTrack(h.track);
          if (!track) return null;
          return { ...track, wishlistSaves: h.saves };
        })
        .filter((t): t is NonNullable<typeof t> => t != null);

      return NextResponse.json({
        source: "wishlist-community",
        lane: "wishlisted",
        updatedAt: new Date().toISOString(),
        count: tracks.length,
        tracks,
        note:
          tracks.length > 0
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
