import { NextResponse } from "next/server";
import { requireIdentity } from "../../../cursor/identity";
import type { Track } from "@/lib/types";
import {
  listWishlist,
  removeFromWishlist,
  saveToWishlist,
  wishlistIds,
} from "@/lib/wishlist";

export const dynamic = "force-dynamic";

async function personSub(request: Request) {
  const identity = await requireIdentity(request);
  if (identity instanceof Response) return identity;
  if (identity.kind !== "person") {
    return NextResponse.json({ error: "person_required" }, { status: 403 });
  }
  return identity;
}

export async function GET(request: Request) {
  const identity = await personSub(request);
  if (identity instanceof Response) return identity;

  const { searchParams } = new URL(request.url);
  if (searchParams.get("idsOnly") === "1") {
    const ids = await wishlistIds(identity.sub);
    return NextResponse.json(
      { ids },
      { headers: { "cache-control": "private, no-store" } },
    );
  }

  const rows = await listWishlist(identity.sub);
  return NextResponse.json(
    {
      count: rows.length,
      items: rows.map((r) => ({
        ...r,
        track:
          typeof r.track_json === "string"
            ? (JSON.parse(r.track_json) as Track)
            : r.track_json,
      })),
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  const identity = await personSub(request);
  if (identity instanceof Response) return identity;

  const body = (await request.json()) as { track?: Track };
  if (!body.track?.id || !body.track.title || !body.track.artist) {
    return NextResponse.json({ error: "track_required" }, { status: 400 });
  }
  await saveToWishlist(identity.sub, body.track);
  const ids = await wishlistIds(identity.sub);
  return NextResponse.json(
    { ok: true, ids },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function DELETE(request: Request) {
  const identity = await personSub(request);
  if (identity instanceof Response) return identity;

  const { searchParams } = new URL(request.url);
  const trackId = searchParams.get("trackId");
  if (!trackId) {
    return NextResponse.json({ error: "trackId_required" }, { status: 400 });
  }
  await removeFromWishlist(identity.sub, trackId);
  const ids = await wishlistIds(identity.sub);
  return NextResponse.json(
    { ok: true, ids },
    { headers: { "cache-control": "private, no-store" } },
  );
}
