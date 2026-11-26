import { NextResponse } from "next/server";
import {
  runDiglistSocial,
  type DigSocialMode,
} from "@/lib/engines/diglistSocial";
import { enrichPreviews } from "@/lib/live/enrichPreview";
import { sanitizeTrack } from "@/lib/sanitizeTrack";
import type { Track } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

/** Diglist Short/Long — croce buyer×collezioni (genere solo filtri). */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    seeds?: Track[];
    owned?: Track[];
    mode?: DigSocialMode;
    bandcampUser?: string;
    audioCompare?: boolean;
  };

  const seeds = (body.seeds ?? [])
    .map((t) => sanitizeTrack(t))
    .filter((t): t is Track => !!t?.id && !!t?.title)
    .slice(0, 6);

  const owned = (body.owned ?? [])
    .map((t) => sanitizeTrack(t))
    .filter((t): t is Track => !!t?.id && !!t?.title)
    .slice(0, 400);

  const mode: DigSocialMode =
    body.mode === "long" ? "long" : body.mode === "station" ? "station" : "short";

  if (seeds.length === 0 && owned.length === 0) {
    return NextResponse.json({ error: "pick_required" }, { status: 400 });
  }

  const bandcampUser =
    typeof body.bandcampUser === "string"
      ? body.bandcampUser.replace(/^@/, "").trim().slice(0, 40)
      : undefined;

  try {
    const result = await runDiglistSocial({
      mode,
      seeds,
      ownedLocal: owned,
      bandcampUser: bandcampUser || undefined,
      audioCompare: body.audioCompare === true,
    });

    const tracks = await enrichPreviews(
      result.tracks.map((h) => h.track),
      mode === "long" ? 8 : 5,
    );

    const genres = Array.from(
      new Set(result.tracks.map((h) => h.genre).filter(Boolean)),
    ).sort();

    return NextResponse.json(
      {
        mode,
        tracks,
        hits: result.tracks.map((h) => ({
          id: h.track.id,
          score: h.score,
          croceBuyers: h.croceBuyers,
          reasons: h.reasons,
          genre: h.genre,
        })),
        genres,
        note: result.note,
        method: result.method,
        bandcampLive: result.bandcampLive,
        audioActive: result.audioActive,
        stats: result.stats,
        seeds: seeds.map((t) => ({
          id: t.id,
          title: t.title,
          artist: t.artist,
          label: t.label,
        })),
      },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "diglist_failed" }, { status: 500 });
  }
}
