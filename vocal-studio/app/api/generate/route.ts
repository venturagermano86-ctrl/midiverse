import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { spawn } from "child_process";
import { getGenre, getVariation } from "@/lib/genres";
import { clampBpm, pitchNudgeForKey } from "@/lib/keys";
import { getSinger } from "@/lib/singers";
import {
  fetchOEmbed,
  isAllowedMediaUrl,
  normalizeMediaUrl,
} from "@/lib/youtube";
import { analyzeFromMeta } from "@/lib/mood";
import { renderPhrase, type VocalEngine } from "@/lib/tts-node";
import { planRemake } from "@/lib/remake";
import { buildStemBundle } from "@/lib/stems";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_LENGTH_SEC = 64;
const ALLOWED_MODES = new Set(["generate", "overlay", "reference", "remake"]);

const hits = new Map<string, { n: number; reset: number }>();
function rateLimit(key: string, limit = 6, windowMs = 60_000): boolean {
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

function zipFiles(
  cwd: string,
  zipName: string,
  files: string[]
): Promise<string> {
  return new Promise((resolve, reject) => {
    const out = path.join(cwd, zipName);
    const child = spawn("zip", ["-j", "-q", out, ...files], {
      cwd,
      stdio: ["ignore", "ignore", "pipe"],
    });
    let err = "";
    child.stderr?.on("data", (d) => {
      err += String(d);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(`zip_${code}:${err.slice(0, 80)}`));
    });
  });
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
    const modeRaw = String(form.get("mode") || "remake");
    const mode = ALLOWED_MODES.has(modeRaw) ? modeRaw : "remake";
    const sourceUrlRaw = String(form.get("sourceUrl") || "").trim();
    const bpmRaw = form.get("bpm");
    const keyId = String(form.get("key") || "Am").trim() || "Am";
    const singerId = String(form.get("singerId") || "house-soul-f").trim();
    const singer = getSinger(singerId);
    const wantStems = String(form.get("stems") || "1") !== "0";
    const format = String(form.get("format") || "zip").toLowerCase();
    const userBpm =
      bpmRaw !== null && String(bpmRaw).trim() !== ""
        ? clampBpm(Number(bpmRaw))
        : null;
    const keyNudge = pitchNudgeForKey(keyId);
    const variation = getVariation(genreId, variationId);

    if (mode !== "reference" && mode !== "remake" && !variation) {
      return NextResponse.json(
        { error: "Genere o variazione non validi" },
        { status: 400 }
      );
    }

    let analysis: Record<string, unknown> | undefined;
    let hasUpload = false;

    const file = form.get("track");
    if (
      (mode === "overlay" || mode === "reference" || mode === "remake") &&
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
        note: "Mood dal file — remake con parole nuove, stesse note/durata.",
      };
    }

    if (
      sourceUrlRaw &&
      (mode === "reference" || mode === "overlay" || mode === "remake") &&
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

    if ((mode === "reference" || mode === "remake") && !analysis) {
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

    const refDry =
      (analysis?.dry as string[] | undefined) ||
      variation?.phrases.dry ||
      ["hold the mark", "spin the gate"];
    const refWet =
      (analysis?.wet as string[] | undefined) ||
      variation?.phrases.wet ||
      ["don't let go", "open it wide"];

    const clean = (s: string) =>
      s.replace(/(.)\1{2,}/g, "$1$1").replace(/\s+/g, " ").trim();

    // Sistema nostro: remake = parole diverse, stesso mood, schema note, voce vicina
    const remake = planRemake({
      packId: String(analysis?.packId || analysis?.bank || ""),
      label: String(analysis?.label || singer.label),
      voice:
        (analysis?.voice as string | undefined) || singer.edgeVoice || "jenny",
      wetVoice: analysis?.wetVoice as string | undefined,
      keyId,
      avoidDry: refDry,
      avoidWet: refWet,
      seedKey: `${analysis?.sourceUrl || ""}|${analysis?.sourceTitle || ""}|${bpm}|${keyId}|${lengthSec}`,
    });

    const dry = remake.dry.map(clean);
    const wet = remake.wet.map(clean);

    void keyNudge;

    let engine: VocalEngine = "demo";
    const workDir = path.join(tmp, "stems");
    await fs.mkdir(workDir, { recursive: true });

    const bundle = await buildStemBundle({
      dryPhrases: dry,
      wetPhrases: wet,
      lengthSec,
      workDir,
      dryVoice: remake.dryVoice,
      wetVoice: remake.wetVoice,
      notes: remake.notes,
      renderPhrase: async (text, dest, voice) => {
        const used = await renderPhrase({
          text,
          dest,
          edgeVoice: voice,
          elevenVoiceId: singer.elevenVoiceId,
        });
        if (used === "elevenlabs") engine = "elevenlabs";
        else if (used === "edge" && engine !== "elevenlabs") engine = "edge";
      },
    });

    const payloadAnalysis = {
      ...(analysis || {}),
      bpm,
      key: keyId,
      label: (analysis?.label as string) || singer.label,
      singerId: singer.id,
      engine,
      dry,
      wet,
      refDry: refDry.map(clean),
      refWet: refWet.map(clean),
      dryVoice: remake.dryVoice,
      wetVoice: remake.wetVoice,
      notes: remake.notes,
      bank: remake.bank,
      lengthSec,
      stems: ["dry", "wet", "mix"],
      mode,
      note: remake.note,
      releaseReady: false,
      system: "midiverse-remake-v1",
    };

    if (wantStems && format === "json") {
      const [dryBuf, wetBuf, mixBuf] = await Promise.all([
        fs.readFile(bundle.dryPath),
        fs.readFile(bundle.wetPath),
        fs.readFile(bundle.mixPath),
      ]);
      return NextResponse.json({
        analysis: payloadAnalysis,
        stems: {
          dry: dryBuf.toString("base64"),
          wet: wetBuf.toString("base64"),
          mix: mixBuf.toString("base64"),
        },
      });
    }

    if (wantStems) {
      const zipPath = await zipFiles(tmp, "vocal-stems.zip", [
        bundle.dryPath,
        bundle.wetPath,
        bundle.mixPath,
      ]);
      const zipBuf = await fs.readFile(zipPath);
      return new NextResponse(zipBuf, {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="vocal-stems-remake.zip"`,
          "X-Vocal-Analysis": encodeURIComponent(
            JSON.stringify(payloadAnalysis)
          ),
          "Cache-Control": "no-store",
        },
      });
    }

    const mp3 = await fs.readFile(bundle.mixPath);
    return new NextResponse(mp3, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="vocal-studio-remake.mp3"`,
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
