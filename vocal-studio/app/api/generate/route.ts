import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { getGenre, getVariation } from "@/lib/genres";
import { clampBpm, pitchNudgeForKey } from "@/lib/keys";
import { getSinger } from "@/lib/singers";
import { fetchOEmbed, isAllowedMediaUrl, normalizeMediaUrl } from "@/lib/youtube";
import { analyzeFromMeta } from "@/lib/mood";
import { mixPhrasesToMp3, ttsPhrase } from "@/lib/tts-node";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB
const MAX_LENGTH_SEC = 48;

function safeClientError(fallback: string): string {
  return fallback;
}

export async function POST(req: NextRequest) {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "vocal-studio-"));
  try {
    const form = await req.formData();
    const genreId = String(form.get("genreId") || "");
    const variationId = String(form.get("variationId") || "");
    const lengthSec = Math.min(
      MAX_LENGTH_SEC,
      Math.max(12, Number(form.get("lengthSec") || 32))
    );
    const mode = String(form.get("mode") || "generate");
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

    let trackPath = "";
    let analysis: Record<string, unknown> | undefined;

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
      const safe = (file.name || "track.wav").replace(/[^\w.\-]+/g, "_");
      trackPath = path.join(tmp, safe);
      await fs.writeFile(trackPath, bytes);
      // Uploaded audio: still use mood from singer + filename seed for phrases
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

    // YouTube / SoundCloud — Node oEmbed only (no yt-dlp / no SSRF)
    if (
      sourceUrlRaw &&
      (mode === "reference" || mode === "overlay") &&
      !trackPath
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

    if (mode === "overlay" && !trackPath) {
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

    const rate =
      (typeof analysis?.rate === "number" ? (analysis.rate as number) : singer.rate) +
      keyNudge.rateNudge;
    const pitchHz =
      (typeof analysis?.pitchHz === "number"
        ? (analysis.pitchHz as number)
        : singer.pitchHz) + keyNudge.pitchHz;
    const edgeDry =
      (analysis?.voice as string | undefined) || singer.edgeVoice || "jenny";
    const edgeWet =
      (analysis?.wetVoice as string | undefined) || singer.edgeVoice || "aria";

    const dryFiles: string[] = [];
    const wetFiles: string[] = [];
    let engine: "elevenlabs" | "edge" = "edge";

    for (let i = 0; i < Math.min(2, dryPhrases.length); i++) {
      const dest = path.join(tmp, `dry${i}.mp3`);
      const used = await ttsPhrase({
        text: dryPhrases[i],
        edgeVoice: edgeDry,
        rate,
        pitchHz,
        dest,
        elevenVoiceId: singer.elevenVoiceId,
      });
      if (used === "elevenlabs") engine = "elevenlabs";
      dryFiles.push(dest);
    }
    for (let i = 0; i < Math.min(2, wetPhrases.length); i++) {
      const dest = path.join(tmp, `wet${i}.mp3`);
      await ttsPhrase({
        text: wetPhrases[i],
        edgeVoice: edgeWet,
        rate: rate - 2,
        pitchHz: pitchHz - 3,
        dest,
        elevenVoiceId: singer.elevenVoiceId,
      });
      wetFiles.push(dest);
    }

    const outMp3 = path.join(tmp, "mix.mp3");
    await mixPhrasesToMp3({
      dryFiles,
      wetFiles,
      bpm,
      lengthSec,
      outMp3,
    });

    const mp3 = await fs.readFile(outMp3);
    const payloadAnalysis = {
      ...(analysis || {}),
      bpm,
      key: keyId,
      label: (analysis?.label as string) || singer.label,
      singerId: singer.id,
      engine,
      dry: dryPhrases,
      wet: wetPhrases,
      note:
        engine === "elevenlabs"
          ? "Motore cantante AI (ElevenLabs) — voci con licenza."
          : (analysis?.note as string) ||
            "Demo edge-tts. Aggiungi ELEVENLABS_API_KEY per voci cantante reali.",
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
    console.error("[vocal-studio/generate]", err instanceof Error ? err.message : err);
    return NextResponse.json(
      {
        error: safeClientError(
          "Generazione fallita. Riprova col link YouTube o carica un MP3."
        ),
      },
      { status: 500 }
    );
  } finally {
    fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}
