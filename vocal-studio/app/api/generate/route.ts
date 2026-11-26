import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { getVariation } from "@/lib/genres";

export const runtime = "nodejs";
export const maxDuration = 120;

type PyResult = { wav: string; mp3: string; analysis?: Record<string, unknown> };

function runPython(configPath: string, outWav: string, bedWav: string) {
  return new Promise<PyResult>((resolve, reject) => {
    const script = path.join(process.cwd(), "scripts", "generate_vocal.py");
    const proc = spawn(
      "python3",
      [script, "--config", configPath, "--out", outWav, "--bed-out", bedWav],
      {
        env: process.env,
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

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const genreId = String(form.get("genreId") || "");
    const variationId = String(form.get("variationId") || "");
    const lengthSec = Number(form.get("lengthSec") || 32);
    const mode = String(form.get("mode") || "generate");
    const variation = getVariation(genreId, variationId);

    if (mode !== "reference" && !variation) {
      return NextResponse.json({ error: "Genere o variazione non validi" }, { status: 400 });
    }

    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "vocal-studio-"));
    let trackPath = "";
    const file = form.get("track");
    if ((mode === "overlay" || mode === "reference") && file && typeof file !== "string") {
      const bytes = Buffer.from(await file.arrayBuffer());
      const safe = (file.name || "track.wav").replace(/[^\w.\-]+/g, "_");
      trackPath = path.join(tmp, safe);
      await fs.writeFile(trackPath, bytes);
    }

    if (mode === "reference" && !trackPath) {
      return NextResponse.json(
        { error: "Carica una traccia di riferimento col vocal che ti piace." },
        { status: 400 }
      );
    }

    const config = {
      mode,
      lengthSec: Math.min(90, Math.max(12, lengthSec)),
      bpm: 124,
      voice: variation?.voice || "jenny",
      rate: variation?.rate ?? -18,
      pitchHz: variation?.pitchHz ?? 0,
      dry: variation?.phrases.dry || ["hold the mark"],
      wet: variation?.phrases.wet || ["don't let go"],
      trackPath,
    };
    const configPath = path.join(tmp, "config.json");
    const outWav = path.join(tmp, "mix.wav");
    const bedWav = path.join(tmp, "vocal.wav");
    await fs.writeFile(configPath, JSON.stringify(config));

    const result = await runPython(configPath, outWav, bedWav);
    const mp3Path = result.mp3 || outWav.replace(/\.wav$/, ".mp3");
    const mp3 = await fs.readFile(mp3Path);

    // Persist analysis sidecar for the response header
    const analysis = result.analysis || null;
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
        hint: "Demo TTS: mood dal riferimento, frasi originali (non copia il testo).",
      },
      { status: 500 }
    );
  }
}
