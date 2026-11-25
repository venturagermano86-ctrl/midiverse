import { NextResponse } from "next/server";
<<<<<<< HEAD
import { buildDigList, digSearchQuery, type DigMode } from "@/lib/engines/diglist";
import type { BuyerCollection } from "@/lib/engines/diglistBuyers";
import { scoutBandcampBuyers } from "@/lib/live/bandcampScout";
import { scoutDiscogsGraph } from "@/lib/live/discogsScout";
import { scoutItunesArtists } from "@/lib/live/itunesArtistScout";
=======
import {
  runDiglistSocial,
  type DigSocialMode,
} from "@/lib/engines/diglistSocial";
>>>>>>> d3a9c7d (Diglist social croce engine for Short/Long and Station)
import { enrichPreviews } from "@/lib/live/enrichPreview";
import { sanitizeTrack } from "@/lib/sanitizeTrack";
import type { Track } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

/**
 * Diglist Short/Long — motore sociale a croce (11 passi Diglist).
 * Genere solo per filtri finali, non decide l'ingresso.
 */
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

<<<<<<< HEAD
  const hasBcUrl = seeds.some((s) =>
    s.offers?.some(
      (o) =>
        o.storeId === "bandcamp" &&
        typeof o.url === "string" &&
        /bandcamp\.com\//i.test(o.url) &&
        !/\/search\?/i.test(o.url),
    ),
  );

  let bcNote = "";
  let bcTracks: Track[] = [];
  if (hasBcUrl) {
    try {
      const bc = await scoutBandcampBuyers(seeds, mode === "long" ? 16 : 8);
      bcTracks = bc.tracks;
      bcNote = bc.note;
    } catch {
      bcNote = "Bandcamp scout error";
    }
  } else {
    bcNote = "Bandcamp: nessun URL diretto sui pick";
  }

  let discogsTracks: Track[] = [];
  let discogsNote = "";
  try {
    const dg = await scoutDiscogsGraph(seeds, mode === "long" ? 20 : 12);
    discogsTracks = dg.tracks;
    discogsNote = dg.note;
  } catch {
    discogsNote = "Discogs scout error";
  }

  let itunesTracks: Track[] = [];
  let itunesNote = "";
  try {
    const it = await scoutItunesArtists(seeds, mode === "long" ? 16 : 10);
    itunesTracks = it.tracks;
    itunesNote = it.note;
  } catch {
    itunesNote = "iTunes scout error";
  }

  const scoutTracks = [...bcTracks, ...discogsTracks, ...itunesTracks];
  const result = buildDigList(seeds, itunesTracks, mode, realBuyers, scoutTracks);
  const tracks = await enrichPreviews(result.tracks, mode === "long" ? 8 : 5);

  return NextResponse.json(
    {
      mode: result.mode,
      tracks,
      note: [result.note, discogsNote, itunesNote, bcNote]
        .filter(Boolean)
        .join(" · "),
      method: result.method,
      scout: {
        bandcamp: bcTracks.length,
        discogs: discogsTracks.length,
        itunes: itunesTracks.length,
        web: result.web.length,
=======
    const tracks = await enrichPreviews(
      result.tracks.map((h) => h.track),
      mode === "long" ? 8 : 5,
    );

    // rimappa score/reasons
    const enriched = tracks.map((t, i) => {
      const hit = result.tracks[i];
      return {
        ...t,
        // keep track fields; client uses note
        _dig: hit
          ? {
              score: hit.score,
              croceBuyers: hit.croceBuyers,
              reasons: hit.reasons,
              genre: hit.genre,
            }
          : undefined,
      };
    });

    // generi per filtri (passo 11) — non usati per ranking
    const genres = Array.from(
      new Set(result.tracks.map((h) => h.genre).filter(Boolean)),
    ).sort();

    return NextResponse.json(
      {
        mode,
        tracks: enriched,
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
>>>>>>> d3a9c7d (Diglist social croce engine for Short/Long and Station)
      },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "diglist_failed" }, { status: 500 });
  }
}
