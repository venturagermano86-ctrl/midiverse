import { promises as fs } from "fs";
import path from "path";
import { spawn } from "child_process";
import os from "os";

const EDGE_VOICES: Record<string, string> = {
  jenny: "en-US-JennyNeural",
  aria: "en-US-AriaNeural",
  sonia: "en-GB-SoniaNeural",
  guy: "en-US-GuyNeural",
  brian: "en-US-BrianNeural",
  michelle: "en-US-MichelleNeural",
  emma: "en-US-EmmaNeural",
  natasha: "en-AU-NatashaNeural",
  libby: "en-GB-LibbyNeural",
};

export async function ttsElevenLabs(
  text: string,
  voiceId: string,
  dest: string
): Promise<boolean> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey || !voiceId) return false;
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.35,
            similarity_boost: 0.8,
            style: 0.55,
            use_speaker_boost: true,
          },
        }),
        signal: AbortSignal.timeout(60000),
      }
    );
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 500) return false;
    await fs.writeFile(dest, buf);
    return true;
  } catch {
    return false;
  }
}

export async function ttsEdge(
  text: string,
  voiceKey: string,
  rate: number,
  pitchHz: number,
  dest: string
): Promise<void> {
  const { MsEdgeTTS, OUTPUT_FORMAT } = await import("msedge-tts");
  const voice = EDGE_VOICES[voiceKey] || EDGE_VOICES.jenny;
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const rateStr = `${rate >= 0 ? "+" : ""}${rate}%`;
  const pitchStr = `${pitchHz >= 0 ? "+" : ""}${pitchHz}Hz`;

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "edge-tts-"));
  try {
    const result = await tts.toFile(dir, text, {
      rate: rateStr,
      pitch: pitchStr,
    } as never);
    const produced =
      (result as { audioFilePath?: string })?.audioFilePath ||
      path.join(dir, "audio.mp3");
    await fs.copyFile(produced, dest);
  } finally {
    fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
  const st = await fs.stat(dest).catch(() => null);
  if (!st || st.size < 200) throw new Error("TTS edge fallito");
}

export async function ttsPhrase(opts: {
  text: string;
  edgeVoice: string;
  rate: number;
  pitchHz: number;
  dest: string;
  elevenVoiceId?: string;
}): Promise<"elevenlabs" | "edge"> {
  if (
    opts.elevenVoiceId &&
    (await ttsElevenLabs(opts.text, opts.elevenVoiceId, opts.dest))
  ) {
    return "elevenlabs";
  }
  await ttsEdge(opts.text, opts.edgeVoice, opts.rate, opts.pitchHz, opts.dest);
  return "edge";
}

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => (err += d.toString()));
    p.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg ${code}`));
    });
  });
}

function ffmpegBin(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const staticPath = require("ffmpeg-static") as string | null;
    if (staticPath) return staticPath;
  } catch {
    /* system */
  }
  return "ffmpeg";
}

export async function mixPhrasesToMp3(opts: {
  dryFiles: string[];
  wetFiles: string[];
  bpm: number;
  lengthSec: number;
  outMp3: string;
}): Promise<void> {
  const ffmpeg = ffmpegBin();
  const beat = 60 / opts.bpm;
  const bar = beat * 4;
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "vs-mix-"));

  try {
    const inputs: string[] = [];
    const filters: string[] = [];
    let idx = 0;
    const mixLabels: string[] = [];

    const place = (file: string, tSec: number, label: string) => {
      inputs.push("-i", file);
      const delayMs = Math.max(0, Math.round(tSec * 1000));
      filters.push(`[${idx}]adelay=${delayMs}|${delayMs},volume=0.95[${label}]`);
      mixLabels.push(`[${label}]`);
      idx++;
    };

    const slots = Math.max(2, Math.floor(opts.lengthSec / 7));
    for (let s = 0; s < slots; s++) {
      const t0 = 0.8 + s * 1.8 * bar;
      if (t0 > opts.lengthSec - 2) break;
      place(opts.dryFiles[s % opts.dryFiles.length], t0, `d${s}`);
      place(opts.wetFiles[s % opts.wetFiles.length], t0 + bar * 0.9, `w${s}`);
    }

    if (idx === 0) {
      await fs.copyFile(opts.dryFiles[0], opts.outMp3);
      return;
    }

    filters.push(
      `${mixLabels.join("")}amix=inputs=${idx}:duration=longest:dropout_transition=0,afade=t=out:st=${Math.max(0, opts.lengthSec - 1.2)}:d=1.2[out]`
    );

    await run(ffmpeg, [
      "-y",
      ...inputs,
      "-filter_complex",
      filters.join(";"),
      "-map",
      "[out]",
      "-t",
      String(opts.lengthSec),
      "-codec:a",
      "libmp3lame",
      "-q:a",
      "3",
      opts.outMp3,
    ]);
  } catch {
    // Concat fallback
    const listPath = path.join(tmp, "list.txt");
    const silence = path.join(tmp, "sil.mp3");
    await run(ffmpeg, [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "anullsrc=r=24000:cl=mono",
      "-t",
      "0.55",
      "-q:a",
      "9",
      silence,
    ]).catch(() => undefined);

    const lines: string[] = [];
    for (let i = 0; i < 4; i++) {
      const f =
        i % 2 === 0
          ? opts.dryFiles[i % opts.dryFiles.length]
          : opts.wetFiles[i % opts.wetFiles.length];
      lines.push(`file '${f.replace(/'/g, "'\\''")}'`);
      lines.push(`file '${silence.replace(/'/g, "'\\''")}'`);
    }
    await fs.writeFile(listPath, lines.join("\n"));
    await run(ffmpeg, [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listPath,
      "-codec:a",
      "libmp3lame",
      "-q:a",
      "3",
      opts.outMp3,
    ]);
  } finally {
    fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}
