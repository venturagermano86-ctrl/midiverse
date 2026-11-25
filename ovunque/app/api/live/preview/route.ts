import { NextResponse } from "next/server";
import { lookupPreview } from "@/lib/live/enrichPreview";

export const dynamic = "force-dynamic";

/** Risolve previewUrl iTunes per artist+title (consigliati senza preview). */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const artist = (searchParams.get("artist") || "").slice(0, 120);
  const title = (searchParams.get("title") || "").slice(0, 120);
  if (!artist || !title) {
    return NextResponse.json({ error: "artist_title_required" }, { status: 400 });
  }
  try {
    const hit = await lookupPreview(artist, title);
    return NextResponse.json(
      {
        ok: !!hit?.previewUrl,
        previewUrl: hit?.previewUrl ?? null,
        artworkUrl: hit?.artworkUrl ?? null,
      },
      { headers: { "cache-control": "public, max-age=600" } },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "preview_unavailable" },
      { status: 502 },
    );
  }
}
