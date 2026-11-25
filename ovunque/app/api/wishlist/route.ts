import { NextResponse } from "next/server";
import { requireIdentity } from "../../../cursor/identity";
import { sanitizeTrack } from "@/lib/sanitizeTrack";
import {
  listWishlist,
  removeFromWishlist,
  saveToWishlist,
  wishlistIds,
} from "@/lib/wishlist";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 32_000;

async function personSub(request: Request) {
  const identity = await requireIdentity(request);
  if (identity instanceof Response) return identity;
  if (identity.kind !== "person") {
    return NextResponse.json({ error: "person_required" }, { status: 403 });
  }
  // Preview host tokens stay out of production wishlist data
  if (identity.stage === "preview") {
    return NextResponse.json({ error: "preview_stage_blocked" }, { status: 403 });
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
      items: rows.map((r) => {
        const parsed =
          typeof r.track_json === "string"
            ? JSON.parse(r.track_json)
            : r.track_json;
        const track = sanitizeTrack(parsed);
        return {
          ...r,
          artwork_url: track?.artworkUrl ?? null,
          preview_url: track?.previewUrl ?? null,
          track,
        };
      }),
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  const identity = await personSub(request);
  if (identity instanceof Response) return identity;

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "body_too_large" }, { status: 413 });
  }

  let body: { track?: unknown };
  try {
    body = JSON.parse(raw) as { track?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const track = sanitizeTrack(body.track);
  if (!track) {
    return NextResponse.json({ error: "track_invalid" }, { status: 400 });
  }

  await saveToWishlist(identity.sub, track);
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
  if (!trackId || trackId.length > 120) {
    return NextResponse.json({ error: "trackId_required" }, { status: 400 });
  }
  await removeFromWishlist(identity.sub, trackId);
  const ids = await wishlistIds(identity.sub);
  return NextResponse.json(
    { ok: true, ids },
    { headers: { "cache-control": "private, no-store" } },
  );
}
