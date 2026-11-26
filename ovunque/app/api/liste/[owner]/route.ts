import { NextResponse } from "next/server";
import { getIdentity } from "../../../../cursor/identity";
import { sanitizeTrack } from "@/lib/sanitizeTrack";
import { diggerLabel, listWishlist } from "@/lib/wishlist";

export const dynamic = "force-dynamic";

type Ctx = { params: { owner: string } };

/** Wishlist di un digger — visibile agli utenti loggati (croce). */
export async function GET(request: Request, { params }: Ctx) {
  const identity = await getIdentity(request);
  if (!identity.verified || identity.kind !== "person") {
    return NextResponse.json({ error: "sign_in_required" }, { status: 401 });
  }

  const ownerSub = decodeURIComponent(params.owner || "").slice(0, 200);
  if (!ownerSub || ownerSub.length < 3) {
    return NextResponse.json({ error: "owner_required" }, { status: 400 });
  }

  try {
    const rows = await listWishlist(ownerSub);
    const items = rows
      .map((r) => {
        const parsed =
          typeof r.track_json === "string"
            ? JSON.parse(r.track_json as unknown as string)
            : r.track_json;
        const track = sanitizeTrack(parsed);
        if (!track) return null;
        return {
          trackId: r.track_id,
          savedAt: r.saved_at,
          track: {
            ...track,
            artworkUrl: track.artworkUrl ?? r.artwork_url ?? undefined,
            previewUrl: track.previewUrl ?? r.preview_url ?? undefined,
          },
        };
      })
      .filter(Boolean);

    return NextResponse.json(
      {
        ownerSub,
        label: diggerLabel(ownerSub),
        mine: ownerSub === identity.sub,
        count: items.length,
        items,
      },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: "liste_unavailable",
        detail: err instanceof Error ? err.message.slice(0, 80) : "db",
      },
      { status: 502 },
    );
  }
}
