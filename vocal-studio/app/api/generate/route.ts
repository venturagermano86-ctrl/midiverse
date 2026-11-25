import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { getGenre, getVariation } from "@/lib/genres";
import { clampBpm, pitchNudgeForKey } from "@/lib/keys";
import { getSinger } from "@/lib/singers";

export const runtime = "nodejs";
export const maxDuration = 180;

type PyResult = { wav: string; mp3: string; analysis?: Record<string, unknown> };

function runPython(configPath: string, outWav: string, bedWav: string) {
  return new Promise<PyResult>((resolve, reject) => {
    const script = path.join(process.cwd(), "scripts", "generate_vocal.py");
    const proc = spawn(
      "python3",
      [script, "--config", configPath, "--out", outWav, "--bed-out", bedWav],
      {
        env: {
          ...process.env,
          PATH: `${process.env.HOME}/.local/bin:${process.env.HOME}/.deno/bin:${process.env.PATH || ""}`,
        },
        cwd: path.join(process.cwd(), "scripts"),
      }
    );
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `python exited ${code}`));
        return;
      }
      try {
        const line = stdout.trim().split("\n").filter(Boolean).pop() || "{}";
        resolve(JSON.parse(line));
      } catch {
        resolve({ wav: outWav, mp3: outWav.replace(/\.wav$/, ".mp3") });
      }
    });
  });
}

type FetchResult = {
  ok: boolean;
  trackPath?: string;
  analysis?: Record<string, unknown>;
  meta?: { title?: string; author?: string };
  error?: string;
  fallback?: string;
};

function fetchReferenceUrl(url: string, outDir: string) {
  return new Promise<FetchResult>((resolve, reject) => {
    const script = path.join(process.cwd(), "scripts", "fetch_reference_url.py");
    const proc = spawn(
      "python3",
      [script, "--url", url, "--out-dir", outDir],
      {
        env: {
          ...process.env,
          PATH: `${process.env.HOME}/.local/bin:${process.env.HOME}/.deno/bin:${process.env.PATH || ""}`,
        },
        cwd: path.join(process.cwd(), "scripts"),
      }
    );
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => {
      try {
        const line = stdout.trim().split("\n").filter(Boolean).pop() || "{}";
        const data = JSON.parse(line) as FetchResult;
        if (!data.ok && code !== 0) {
          reject(new Error(data.error || stderr || "Fetch URL fallito"));
          return;
        }
        resolve(data);
      } catch {
        reject(new Error(stderr || "Fetch URL fallito"));
      }
    });
  });
}

function looksLikeMediaUrl(raw: string) {
  try {
    const u = new URL(raw.trim().startsWith("http") ? raw.trim() : `https://${raw.trim()}`);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    return (
      host.includes("youtube.com") ||
      host === "youtu.be" ||
      host.includes("soundcloud.com") ||
      host.includes("youtu.be")
    );
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const genreId = String(form.get("genreId") || "");
    const variationId = String(form.get("variationId") || "");
    const lengthSec = Number(form.get("lengthSec") || 32);
    const mode = String(form.get("mode") || "generate");
    const sourceUrl = String(form.get("sourceUrl") || "").trim();
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
      return NextResponse.json({ error: "Genere o variazione non validi" }, { status: 400 });
    }

    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "vocal-studio-"));
    let trackPath = "";
    let analysisFromUrl: Record<string, unknown> | undefined;

    const file = form.get("track");
    if ((mode === "overlay" || mode === "reference") && file && typeof file !== "string") {
      const bytes = Buffer.from(await file.arrayBuffer());
      const safe = (file.name || "track.wav").replace(/[^\w.\-]+/g, "_");
      trackPath = path.join(tmp, safe);
      await fs.writeFile(trackPath, bytes);
    }

    // YouTube / SoundCloud link (reference or overlay)
    if (sourceUrl && (mode === "reference" || mode === "overlay") && !trackPath) {
      if (!looksLikeMediaUrl(sourceUrl)) {
        return NextResponse.json(
          { error: "Incolla un link YouTube o SoundCloud valido." },
          { status: 400 }
        );
      }
      const fetched = await fetchReferenceUrl(sourceUrl, path.join(tmp, "urlref"));
      if (!fetched.ok && !fetched.analysis) {
        return NextResponse.json(
          {
            error:
              fetched.error ||
              "Non riesco a leggere quel link. Prova a caricare l'MP3 della traccia.",
          },
          { status: 400 }
        );
      }
      if (fetched.trackPath) trackPath = fetched.trackPath;
      if (fetched.analysis) analysisFromUrl = fetched.analysis;
    }

    if (mode === "reference" && !trackPath && !analysisFromUrl) {
      return NextResponse.json(
        {
          error:
            "Incolla un link YouTube (o SoundCloud), oppure carica la traccia col vocal che ti piace.",
        },
        { status: 400 }
      );
    }

    if (mode === "overlay" && !trackPath) {
      return NextResponse.json(
        { error: "Carica la tua traccia (o un link se scaricabile) per aggiungere il vocal." },
        { status: 400 }
      );
    }

    // Prefer user BPM; else analysis; else genre mid hint; else 124
    const genre = getGenre(genreId);
    const genreMid = genre
      ? Math.round((genre.bpmHint[0] + genre.bpmHint[1]) / 2)
      : 124;
    const defaultBpm =
      userBpm ??
      (typeof analysisFromUrl?.bpm === "number"
        ? clampBpm(analysisFromUrl.bpm as number)
        : genreMid);

    // Singer preset drives voice; genre variation still supplies phrases when not reference
    const baseRate =
      (mode === "reference"
        ? Number(analysisFromUrl?.rate ?? singer.rate)
        : singer.rate) + keyNudge.rateNudge;
    const basePitch =
      (mode === "reference"
        ? Number(analysisFromUrl?.pitchHz ?? singer.pitchHz)
        : singer.pitchHz) + keyNudge.pitchHz;

    if (analysisFromUrl) {
      analysisFromUrl = {
        ...analysisFromUrl,
        key: keyId,
        ...(userBpm ? { bpm: userBpm } : {}),
        pitchHz: Number(analysisFromUrl.pitchHz ?? singer.pitchHz) + keyNudge.pitchHz,
        rate: Number(analysisFromUrl.rate ?? singer.rate) + keyNudge.rateNudge,
        dsp: analysisFromUrl.dsp || singer.dsp,
        singerId: singer.id,
      };
    }

    const config = {
      mode,
      lengthSec: Math.min(90, Math.max(12, lengthSec)),
      bpm: defaultBpm,
      userBpm: userBpm ?? undefined,
      key: keyId,
      voice: singer.edgeVoice || variation?.voice || "jenny",
      wetVoice: variation?.voice || singer.edgeVoice,
      rate: baseRate,
      pitchHz: basePitch,
      dsp: singer.dsp,
      dry: variation?.phrases.dry || ["hold the mark"],
      wet: variation?.phrases.wet || ["don't let go"],
      elevenVoiceId: singer.elevenVoiceId,
      elevenWetVoiceId: singer.elevenVoiceId,
      singerLabel: singer.label,
      singerId: singer.id,
      trackPath,
      analysis: analysisFromUrl || undefined,
    };
    const configPath = path.join(tmp, "config.json");
    const outWav = path.join(tmp, "mix.wav");
    const bedWav = path.join(tmp, "vocal.wav");
    await fs.writeFile(configPath, JSON.stringify(config));

    const result = await runPython(configPath, outWav, bedWav);
    const mp3Path = result.mp3 || outWav.replace(/\.wav$/, ".mp3");
    const mp3 = await fs.readFile(mp3Path);

    const analysis = result.analysis || analysisFromUrl || null;
    fs.rm(tmp, { recursive: true, force: true }).catch(() => {});

    return new NextResponse(mp3, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="vocal-studio-${mode}.mp3"`,
        "X-Vocal-Analysis": analysis
          ? encodeURIComponent(JSON.stringify(analysis))
          : "",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generazione fallita";
    return NextResponse.json(
      {
        error: message,
        hint: "Incolla un link YouTube o carica un file. Mood dal riferimento, frasi originali.",
      },
      { status: 500 }
    );
  }
}
