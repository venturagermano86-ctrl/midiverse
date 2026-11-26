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

const MAX_BODY = 450_000; // ~0.45MB — evita body enormi prima del parse

/** Diglist Short/Long — rete label/artista (incroci). */
export async function POST(req: Request) {
  const len = Number(req.headers.get("content-length") || 0);
  if (len > MAX_BODY) {
    return NextResponse.json({ error: "body_too_large" }, { status: 413 });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY) {
    return NextResponse.json({ error: "body_too_large" }, { status: 413 });
  }

  let body: {
    seeds?: Track[];
    owned?: Track[];
    mode?: DigSocialMode;
    bandcampUser?: string;
    audioCompare?: boolean;
  } = {};
  try {
    body = JSON.parse(raw || "{}") as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const seeds = (body.seeds ?? [])
    .map((t) => sanitizeTrack(t))
    .filter((t): t is Track => !!t?.id && !!t?.title)
    .slice(0, 6);

  const owned = (body.owned ?? [])
    .slice(0, 400)
    .map((t) => sanitizeTrack(t))
    .filter((t): t is Track => !!t?.id && !!t?.title);

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

    // Enrich minimo server-side — QuickPlay risolve ▶ al click (niente Offline)
    const enrichN = mode === "long" ? 8 : 3;
    const toEnrich = result.tracks.slice(0, enrichN).map((h) => h.track);
    const enriched = await enrichPreviews(toEnrich, 3);
    const enrichedById = new Map(enriched.map((t) => [t.id, t]));
    const tracks = result.tracks.map((h) => enrichedById.get(h.track.id) ?? h.track);

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
  } catch (err) {
    const msg = err instanceof Error ? err.message : "diglist_failed";
    return NextResponse.json(
      { error: "diglist_failed", detail: msg.slice(0, 120) },
      { status: 500 },
    );
  }
}
