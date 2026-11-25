import { NextResponse } from "next/server";
import { getIdentity, requireIdentity } from "../../../cursor/identity";
import { submitFreeDrop, topFreeChart } from "@/lib/freeDrops";
import { TRACKS, hasFreeOffer } from "@/lib/catalog";
import { safeHttpsUrl } from "@/lib/sanitizeTrack";

export const dynamic = "force-dynamic";

const MAX_BODY = 8_000;

/** Lettura Free chart: pubblica (anche senza login). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(40, Math.max(1, Number(searchParams.get("limit") || 28) || 28));
  try {
    const hits = await topFreeChart(limit);
    const tracks =
      hits.length > 0
        ? hits.map((h) => ({ ...h.track, wishlistSaves: h.bumps }))
        : TRACKS.filter(hasFreeOffer).slice(0, limit);
    return NextResponse.json(
      {
        count: tracks.length,
        tracks,
        note:
          hits.length > 0
            ? "Free chart · download gratis reali"
            : "Curated free — login per aggiungere il tuo drop",
      },
      { headers: { "cache-control": "public, max-age=30" } },
    );
  } catch {
    return NextResponse.json(
      { error: "free_chart_unavailable", tracks: TRACKS.filter(hasFreeOffer).slice(0, limit) },
      { status: 200 },
    );
  }
}

/** Invia / bump free drop → serve login (cronologia community). */
export async function POST(request: Request) {
  const identity = await requireIdentity(request);
  if (identity instanceof Response) return identity;
  if (identity.kind !== "person") {
    return NextResponse.json({ error: "person_required" }, { status: 403 });
  }
  if (identity.stage === "preview") {
    return NextResponse.json({ error: "preview_stage_blocked" }, { status: 403 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY) {
    return NextResponse.json({ error: "body_too_large" }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const downloadUrl = safeHttpsUrl(body.downloadUrl ?? body.url);
  if (!downloadUrl) {
    return NextResponse.json({ error: "download_https_required" }, { status: 400 });
  }

  try {
    const track = await submitFreeDrop(identity.sub, {
      title: String(body.title || ""),
      artist: String(body.artist || ""),
      label: body.label ? String(body.label) : undefined,
      genre: body.genre ? String(body.genre) : undefined,
      downloadUrl,
      artworkUrl: body.artworkUrl ? String(body.artworkUrl) : undefined,
      previewUrl: body.previewUrl ? String(body.previewUrl) : undefined,
      trackId: body.trackId ? String(body.trackId).slice(0, 120) : undefined,
    });
    return NextResponse.json(
      { ok: true, track },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "invalid_free_drop" }, { status: 400 });
  }
}

/** Helper: check login without failing the page. */
export async function HEAD(request: Request) {
  const identity = await getIdentity(request);
  return new NextResponse(null, {
    status: identity.verified && identity.kind === "person" ? 204 : 401,
  });
}
