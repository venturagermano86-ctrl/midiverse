import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { getGenre, getVariation } from "@/lib/genres";
import { clampBpm, pitchNudgeForKey } from "@/lib/keys";
import { getSinger } from "@/lib/singers";
import {
  fetchOEmbed,
  isAllowedMediaUrl,
  normalizeMediaUrl,
} from "@/lib/youtube";
import { analyzeFromMeta } from "@/lib/mood";
import { synthesizeVocalMp3 } from "@/lib/tts-node";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_LENGTH_SEC = 32;
const ALLOWED_MODES = new Set(["generate", "overlay", "reference"]);

/** Tiny in-memory rate limit (per isolate). */
const hits = new Map<string, { n: number; reset: number }>();
function rateLimit(key: string, limit = 8, windowMs = 60_000): boolean {
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || now > cur.reset) {
    hits.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  if (cur.n >= limit) return false;
  cur.n += 1;
  return true;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "anon";
  if (!rateLimit(ip)) {
    return NextResponse.json(
      { error: "Troppe richieste — aspetta un minuto." },
      { status: 429 }
    );
  }

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "vocal-studio-"));
  try {
    const form = await req.formData();
    const genreId = String(form.get("genreId") || "");
    const variationId = String(form.get("variationId") || "");
    const lengthSec = Math.min(
      MAX_LENGTH_SEC,
      Math.max(12, Number(form.get("lengthSec") || 32) || 32)
    );
    const modeRaw = String(form.get("mode") || "generate");
    const mode = ALLOWED_MODES.has(modeRaw) ? modeRaw : "generate";
    const sourceUrlRaw = String(form.get("sourceUrl") || "").trim();
    const bpmRaw = form.get("bpm");
    const keyId = String(form.get("key") || "Am").trim() || "Am";
    const singerId = String(form.get("singerId") || "house-soul-f").trim();
    const singer = getSinger(singerId);
    const userBpm =
      bpmRaw !== null && String(bpmRaw).trim() !== ""
        ? clampBpm(Number(bpmRaw))
        : null;
    const keyNudge = pitchNudgeForKey(keyId);
    const variation = getVariation(genreId, variationId);

    if (mode !== "reference" && !variation) {
      return NextResponse.json(
        { error: "Genere o variazione non validi" },
        { status: 400 }
      );
    }

    let analysis: Record<string, unknown> | undefined;
    let hasUpload = false;

    const file = form.get("track");
    if (
      (mode === "overlay" || mode === "reference") &&
      file &&
      typeof file !== "string"
    ) {
      const bytes = Buffer.from(await file.arrayBuffer());
      if (bytes.length > MAX_UPLOAD_BYTES) {
        return NextResponse.json(
          { error: "File troppo grande (max 8 MB)." },
          { status: 400 }
        );
      }
      hasUpload = true;
      const safe = (file.name || "track.wav").replace(/[^\w.\-]+/g, "_");
      analysis = {
        ...analyzeFromMeta({
          title: file.name || "upload",
          author: "",
          url: `file://${safe}`,
          bpmHint: userBpm ?? undefined,
        }),
        sourceMode: "audio",
        note: "Mood dal file + cantante scelto — frasi originali.",
      };
    }

    if (
      sourceUrlRaw &&
      (mode === "reference" || mode === "overlay") &&
      !hasUpload
    ) {
      if (!isAllowedMediaUrl(sourceUrlRaw)) {
        return NextResponse.json(
          { error: "Incolla un link YouTube o SoundCloud valido." },
          { status: 400 }
        );
      }
      const normalized = normalizeMediaUrl(sourceUrlRaw)!;
      const meta = await fetchOEmbed(normalized);
      if (!meta?.title) {
        return NextResponse.json(
          {
            error:
              "Non riesco a leggere quel link YouTube. Controlla l’URL o carica un MP3.",
          },
          { status: 400 }
        );
      }
      analysis = analyzeFromMeta({
        title: meta.title,
        author: meta.author,
        url: normalized,
        bpmHint: userBpm ?? undefined,
      });
    }

    if (mode === "reference" && !analysis) {
      return NextResponse.json(
        {
          error:
            "Incolla un link YouTube (o SoundCloud), oppure carica la traccia.",
        },
        { status: 400 }
      );
    }

    if (mode === "overlay" && !hasUpload) {
      return NextResponse.json(
        { error: "Carica la tua traccia per aggiungere il vocal." },
        { status: 400 }
      );
    }

    const genre = getGenre(genreId);
    const genreMid = genre
      ? Math.round((genre.bpmHint[0] + genre.bpmHint[1]) / 2)
      : 124;
    const bpm =
      userBpm ??
      (typeof analysis?.bpm === "number"
        ? clampBpm(analysis.bpm as number)
        : genreMid);

    const dryPhrases =
      (analysis?.dry as string[] | undefined) ||
      variation?.phrases.dry ||
      ["hold the mark", "spin the gate"];
    const wetPhrases =
      (analysis?.wet as string[] | undefined) ||
      variation?.phrases.wet ||
      ["don't let go", "open it wide"];

    const clean = (s: string) =>
      s.replace(/(.)\1{2,}/g, "$1$1").replace(/\s+/g, " ").trim();
    const dry = dryPhrases.map(clean).slice(0, 2);
    const wet = wetPhrases.map(clean).slice(0, 2);

    void keyNudge;
    void bpm;

    const outMp3 = path.join(tmp, "mix.mp3");
    const engine = await synthesizeVocalMp3({
      dry,
      wet,
      lengthSec,
      dest: outMp3,
      elevenVoiceId: singer.elevenVoiceId,
      edgeVoice:
        (analysis?.voice as string | undefined) || singer.edgeVoice || "jenny",
    });

    const mp3 = await fs.readFile(outMp3);
    const payloadAnalysis = {
      ...(analysis || {}),
      bpm,
      key: keyId,
      label: (analysis?.label as string) || singer.label,
      singerId: singer.id,
      engine,
      dry,
      wet,
      note:
        engine === "elevenlabs"
          ? "Cantato ElevenLabs ([sings]) — usabile in release con piano a pagamento."
          : engine === "edge"
            ? "Anteprima neurale (più umana della demo Google) — per release serve ElevenLabs a pagamento."
            : "Anteprima demo — NON pubblicare. Aggiungi ELEVENLABS_API_KEY (piano a pagamento) per cantato reale.",
      releaseReady: engine === "elevenlabs",
    };

    return new NextResponse(mp3, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="vocal-studio-${mode}.mp3"`,
        "X-Vocal-Analysis": encodeURIComponent(JSON.stringify(payloadAnalysis)),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error(
      "[vocal-studio/generate]",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      {
        error:
          "Generazione fallita. Riprova col link YouTube o carica un MP3.",
      },
      { status: 500 }
    );
  } finally {
    fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}
