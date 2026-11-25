import { NextResponse } from "next/server";
import { TRACKS, hasFreeOffer } from "@/lib/catalog";
import { topFreeChart } from "@/lib/freeDrops";
import { undergroundChart, type LaneId } from "@/lib/live/underground";
import { sanitizeTrack } from "@/lib/sanitizeTrack";
import { topWishlisted } from "@/lib/wishlist";

export const dynamic = "force-dynamic";

/**
 * Chart pubbliche (lettura senza login):
 * - wishlisted · community
 * - free · free download bumps
 * - underground lanes
 * Login serve solo per salvare wishlist / inviare free drop.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lane = searchParams.get("lane") || "all";
  const limit = Math.min(40, Math.max(1, Number(searchParams.get("limit") || 28) || 28));

  try {
    if (lane === "wishlisted") {
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
            ? "Most wishlisted · i dischi più salvati salgono in chart (pubblica)"
            : "Ancora vuota — salva in wishlist (login per cronologia cloud)",
      });
    }

    if (lane === "free") {
      let hits: Awaited<ReturnType<typeof topFreeChart>> = [];
      try {
        hits = await topFreeChart(limit);
      } catch {
        hits = [];
      }

      // Fallback curated free se DB vuoto
      const curated = TRACKS.filter(hasFreeOffer).slice(0, limit);
      const tracks =
        hits.length > 0
          ? hits.map((h) => ({ ...h.track, wishlistSaves: h.bumps }))
          : curated;

      return NextResponse.json({
        source: hits.length > 0 ? "free-community" : "free-curated",
        lane: "free",
        updatedAt: new Date().toISOString(),
        count: tracks.length,
        tracks,
        note:
          hits.length > 0
            ? "Free download chart · più bump = più alto"
            : "Free curated — invia un drop gratis (serve login) per entrare in chart",
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
  } catch {
    return NextResponse.json(
      { error: "charts_unavailable", tracks: [] },
      { status: 502 },
    );
  }
}
