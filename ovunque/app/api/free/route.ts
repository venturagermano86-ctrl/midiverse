import { NextResponse } from "next/server";
import { getIdentity, requireIdentity } from "../../../cursor/identity";
import {
  ensureFreeDropSchema,
  submitFreeDropWithFiles,
  topFreeChart,
} from "@/lib/freeDrops";
import { TRACKS, hasFreeOffer } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_AUDIO = 25 * 1024 * 1024; // 25 MB
const MAX_COVER = 2 * 1024 * 1024; // 2 MB

const AUDIO_OK = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/flac",
  "audio/x-flac",
  "audio/mp4",
  "audio/aac",
  "audio/ogg",
  "audio/webm",
]);

const COVER_OK = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/** Lettura Free chart: pubblica (anche senza login). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(40, Math.max(1, Number(searchParams.get("limit") || 28) || 28));
  try {
    await ensureFreeDropSchema();
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
            ? "Free chart · upload audio + cover"
            : "Curated free — login e carica audio + copertina",
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

/** Upload free drop: multipart audio + cover (serve login). */
export async function POST(request: Request) {
  const identity = await requireIdentity(request);
  if (identity instanceof Response) return identity;
  if (identity.kind !== "person") {
    return NextResponse.json({ error: "person_required" }, { status: 403 });
  }
  if (identity.stage === "preview") {
    return NextResponse.json({ error: "preview_stage_blocked" }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "multipart_required", hint: "Carica audio + copertina (form-data)" },
      { status: 400 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const title = String(form.get("title") || "").trim();
  const artist = String(form.get("artist") || "").trim();
  const genre = String(form.get("genre") || "Electronic").trim();
  const label = String(form.get("label") || "Free drop").trim();
  const audioFile = form.get("audio");
  const coverFile = form.get("cover");

  if (!(audioFile instanceof File) || !(coverFile instanceof File)) {
    return NextResponse.json(
      { error: "audio_and_cover_required" },
      { status: 400 },
    );
  }

  const audioMime = (audioFile.type || "audio/mpeg").toLowerCase();
  const coverMime = (coverFile.type || "image/jpeg").toLowerCase();
  if (!AUDIO_OK.has(audioMime) && !audioMime.startsWith("audio/")) {
    return NextResponse.json({ error: "audio_type_unsupported" }, { status: 400 });
  }
  if (!COVER_OK.has(coverMime)) {
    return NextResponse.json({ error: "cover_type_unsupported" }, { status: 400 });
  }
  if (audioFile.size <= 0 || audioFile.size > MAX_AUDIO) {
    return NextResponse.json({ error: "audio_too_large" }, { status: 413 });
  }
  if (coverFile.size <= 0 || coverFile.size > MAX_COVER) {
    return NextResponse.json({ error: "cover_too_large" }, { status: 413 });
  }

  try {
    const audioBuf = Buffer.from(await audioFile.arrayBuffer());
    const coverBuf = Buffer.from(await coverFile.arrayBuffer());
    const track = await submitFreeDropWithFiles(
      identity.sub,
      { title, artist, genre, label },
      {
        audio: audioBuf,
        audioMime: AUDIO_OK.has(audioMime) ? audioMime : "audio/mpeg",
        cover: coverBuf,
        coverMime,
      },
    );
    return NextResponse.json(
      { ok: true, track },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "invalid_free_drop" }, { status: 400 });
  }
}

export async function HEAD(request: Request) {
  const identity = await getIdentity(request);
  return new NextResponse(null, {
    status: identity.verified && identity.kind === "person" ? 204 : 401,
  });
}
