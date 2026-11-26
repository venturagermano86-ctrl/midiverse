import { NextResponse } from "next/server";
import { getTrack } from "@/lib/catalog";
import { runStationSocial } from "@/lib/engines/diglistSocial";
import { enrichPreviews } from "@/lib/live/enrichPreview";
import { itunesLookup } from "@/lib/live/itunes";
import { sanitizeTrack } from "@/lib/sanitizeTrack";
import type { Track } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

type Ctx = { params: { id: string } };

async function resolveSeed(id: string, bodyTrack?: Track | null): Promise<Track | null> {
  if (bodyTrack?.id === id) return sanitizeTrack(bodyTrack) ?? bodyTrack;
  const curated = getTrack(id);
  if (curated) return curated;
  if (id.startsWith("itunes")) return itunesLookup(id);
  return null;
}

async function stationPayload(seed: Track, body: {
  owned?: Track[];
  bandcampUser?: string;
}) {
  const owned = (body.owned ?? [])
    .map((t) => sanitizeTrack(t))
    .filter((t): t is Track => !!t?.id && !!t?.title)
    .slice(0, 80);

  const bandcampUser =
    typeof body.bandcampUser === "string"
      ? body.bandcampUser.replace(/^@/, "").trim().slice(0, 40)
      : undefined;

  const result = await runStationSocial(seed, {
    bandcampUser: bandcampUser || undefined,
    ownedLocal: owned,
  });

  // Preview sulle copertine Station
  const tracks = await enrichPreviews(
    result.tracks.slice(0, 16).map((h) => h.track),
    4,
  );
  const byId = new Map(tracks.map((t) => [t.id, t]));
  const merged = result.tracks.map((h) => byId.get(h.track.id) ?? h.track);

  return {
    seedId: seed.id,
    count: merged.length,
    note: result.note,
    method: result.method,
    bandcampLive: result.bandcampLive,
    audioActive: result.audioActive,
    stats: result.stats,
    items: merged.map((track, i) => ({
      index: i,
      reason: result.tracks[i]?.reasons.join(" · ") || "Diglist croce",
      track,
      score: result.tracks[i]?.score,
      croceBuyers: result.tracks[i]?.croceBuyers,
    })),
  };
}

/** Station = stesso incrocio Diglist, 1 seed. */
export async function GET(_req: Request, { params }: Ctx) {
  const seed = await resolveSeed(params.id);
  if (!seed) {
    return NextResponse.json({ error: "track_not_found" }, { status: 404 });
  }
  try {
    const payload = await stationPayload(seed, {});
    return NextResponse.json(payload, {
      headers: { "cache-control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "station_failed" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: Ctx) {
  const body = (await req.json().catch(() => ({}))) as {
    track?: Track;
    owned?: Track[];
    bandcampUser?: string;
  };
  const seed = await resolveSeed(params.id, body.track ?? null);
  if (!seed) {
    return NextResponse.json({ error: "track_not_found" }, { status: 404 });
  }
  try {
    const payload = await stationPayload(seed, body);
    return NextResponse.json(payload, {
      headers: { "cache-control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "station_failed" }, { status: 500 });
  }
}
