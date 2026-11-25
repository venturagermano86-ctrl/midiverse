import { NextResponse } from "next/server";
import { getFreeMedia } from "@/lib/freeDrops";

export const dynamic = "force-dynamic";

type Ctx = { params: { trackId: string; kind: string } };

export async function GET(_req: Request, ctx: Ctx) {
  const trackId = decodeURIComponent(ctx.params.trackId || "").slice(0, 120);
  const kind = ctx.params.kind === "cover" ? "cover" : ctx.params.kind === "audio" ? "audio" : null;
  if (!trackId || !kind) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const file = await getFreeMedia(trackId, kind);
    if (!file) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(file.bytes), {
      status: 200,
      headers: {
        "content-type": file.mime,
        "cache-control": "public, max-age=3600",
        "content-disposition":
          kind === "audio"
            ? `attachment; filename="${trackId}.audio"`
            : `inline; filename="${trackId}.cover"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "media_unavailable" }, { status: 503 });
  }
}
