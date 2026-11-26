import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { spawn } from "child_process";
import type { SungStyle } from "./remake";

/**
 * Human / melodic cantato from free Edge TTS.
 * Each word → scale note + unique stretch/vibrato/gaps.
 * Wet can add a quiet harmony third.
 */

const EDGE_MAP: Record<string, string> = {
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

function run(bin: string, args: string[], timeoutMs = 16000): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    const t = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("ff_timeout"));
    }, timeoutMs);
    child.on("error", (e) => {
      clearTimeout(t);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(t);
      if (code === 0) resolve();
      else reject(new Error(`ff_${code}`));
    });
  });
}

let ffCached: string | null | undefined;
async function ffmpegBin(): Promise<string | null> {
  if (ffCached !== undefined) return ffCached;
  const cands: string[] = [];
  try {
    const mod = await import("ffmpeg-static");
    const p = (mod as { default?: string }).default;
    if (p) cands.push(p);
  } catch {
    /* optional */
  }
  cands.push("ffmpeg", "/usr/bin/ffmpeg");
  for (const b of cands) {
    try {
      await run(b, ["-version"], 3000);
      ffCached = b;
      return b;
    } catch {
      /* next */
    }
  }
  ffCached = null;
  return null;
}

async function silenceMp3(dest: string, ms: number): Promise<void> {
  const bin = await ffmpegBin();
  const dur = Math.max(0.05, ms / 1000);
  if (!bin) {
    await fs.writeFile(dest, Buffer.alloc(0));
    return;
  }
  try {
    await run(bin, [
      "-y",
      "-f",
      "lavfi",
      "-i",
      `anullsrc=r=24000:cl=mono`,
      "-t",
      String(dur),
      "-c:a",
      "libmp3lame",
      "-b:a",
      "64k",
      dest,
    ]);
  } catch {
    await fs.writeFile(dest, Buffer.alloc(0));
  }
}

async function pitchAndSing(
  src: string,
  dest: string,
  semitones: number,
  stretch: number,
  style: SungStyle
): Promise<void> {
  const bin = await ffmpegBin();
  if (!bin) {
    await fs.copyFile(src, dest);
    return;
  }
  const ratio = Math.pow(2, semitones / 12);
  let tempo = (1 / ratio) * stretch;
  const filters: string[] = [
    `asetrate=24000*${ratio.toFixed(6)}`,
    "aresample=24000",
  ];
  while (tempo > 2.0) {
    filters.push("atempo=2.0");
    tempo /= 2;
  }
  while (tempo < 0.5) {
    filters.push("atempo=0.5");
    tempo /= 0.5;
  }
  filters.push(`atempo=${tempo.toFixed(6)}`);
  filters.push(
    `vibrato=f=${style.vibF.toFixed(2)}:d=${style.vibD.toFixed(2)}`
  );
  filters.push(`volume=${style.volume.toFixed(2)}`);
  try {
    await run(bin, [
      "-y",
      "-i",
      src,
      "-af",
      filters.join(","),
      "-c:a",
      "libmp3lame",
      "-b:a",
      "128k",
      "-ar",
      "24000",
      "-ac",
      "1",
      dest,
    ]);
  } catch {
    await fs.copyFile(src, dest);
  }
}

async function mixHarmony(main: string, harmony: string, dest: string): Promise<void> {
  const bin = await ffmpegBin();
  if (!bin) {
    await fs.copyFile(main, dest);
    return;
  }
  try {
    await run(bin, [
      "-y",
      "-i",
      main,
      "-i",
      harmony,
      "-filter_complex",
      "[1:a]volume=0.28[h];[0:a][h]amix=inputs=2:duration=first:dropout_transition=0",
      "-c:a",
      "libmp3lame",
      "-b:a",
      "128k",
      dest,
    ]);
  } catch {
    await fs.copyFile(main, dest);
  }
}

async function concatMp3Files(files: string[], dest: string): Promise<void> {
  const nonempty: string[] = [];
  for (const f of files) {
    try {
      if ((await fs.stat(f)).size > 32) nonempty.push(f);
    } catch {
      /* skip */
    }
  }
  if (!nonempty.length) throw new Error("empty_concat");
  const bin = await ffmpegBin();
  if (bin) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "cat-"));
    try {
      const list = path.join(dir, "list.txt");
      await fs.writeFile(
        list,
        nonempty.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n")
      );
      await run(bin, [
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        list,
        "-c:a",
        "libmp3lame",
        "-b:a",
        "128k",
        dest,
      ]);
      return;
    } catch {
      /* buffer */
    } finally {
      fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }
  const parts = await Promise.all(nonempty.map((f) => fs.readFile(f)));
  await fs.writeFile(dest, Buffer.concat(parts));
}

type EdgeHandle = {
  toFile: (
    dir: string,
    text: string,
    opts?: { rate?: string; pitch?: string }
  ) => Promise<{ audioFilePath?: string }>;
};

const ttsCache = new Map<string, EdgeHandle>();

async function getEdge(voiceKey: string): Promise<EdgeHandle | null> {
  const voiceName = EDGE_MAP[voiceKey] || EDGE_MAP.aria;
  if (ttsCache.has(voiceName)) return ttsCache.get(voiceName)!;
  try {
    const { MsEdgeTTS, OUTPUT_FORMAT } = await import("msedge-tts");
    const tts = new MsEdgeTTS();
    await tts.setMetadata(
      voiceName,
      OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
    );
    ttsCache.set(voiceName, tts as unknown as EdgeHandle);
    return ttsCache.get(voiceName)!;
  } catch {
    return null;
  }
}

async function edgeWord(
  tts: EdgeHandle,
  word: string,
  dest: string,
  rate: string
): Promise<boolean> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ew-"));
  try {
    const result = (await Promise.race([
      tts.toFile(dir, word, { rate, pitch: "+0Hz" }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 9000)
      ),
    ])) as { audioFilePath?: string };
    const src = result.audioFilePath || path.join(dir, "audio.mp3");
    await fs.copyFile(src, dest);
    return (await fs.stat(dest)).size > 200;
  } catch {
    return false;
  } finally {
    fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

const DEFAULT_STYLE: SungStyle = {
  stretchBase: 0.7,
  stretchHold: 0.58,
  vibF: 5.2,
  vibD: 0.45,
  gapMs: 140,
  edgeRate: "-42%",
  harmony: false,
  volume: 0.95,
};

export async function renderCantatoPhrase(opts: {
  text: string;
  dest: string;
  edgeVoice: string;
  notes: number[];
  style?: SungStyle;
}): Promise<boolean> {
  const style = opts.style || DEFAULT_STYLE;
  const words = opts.text
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 5);
  if (!words.length) return false;

  const tts = await getEdge(opts.edgeVoice);
  if (!tts) return false;

  const root = opts.notes[0] ?? 0;
  const contour =
    opts.notes.length >= words.length
      ? opts.notes
      : [0, 3, 5, 7, 5].map((s) => root + s);

  const work = await fs.mkdtemp(path.join(os.tmpdir(), "cantato-"));
  try {
    const parts: string[] = [];
    for (let i = 0; i < words.length; i++) {
      if (i > 0) {
        const gap = path.join(work, `g${i}.mp3`);
        // humanize gap ±30ms
        const jitter = ((i * 37) % 61) - 30;
        await silenceMp3(gap, Math.max(60, style.gapMs + jitter));
        parts.push(gap);
      }
      const raw = path.join(work, `w${i}.mp3`);
      // Vary speaking rate slightly per word
      const rateN = parseInt(style.edgeRate.replace("%", ""), 10) || -42;
      const wordRate = `${rateN - (i % 3)}%`;
      const ok = await edgeWord(tts, words[i], raw, wordRate);
      if (!ok) return false;

      const semi = (contour[i % contour.length] ?? root) - root;
      const stretch =
        i === words.length - 1 ? style.stretchHold : style.stretchBase;
      const sung = path.join(work, `p${i}.mp3`);
      await pitchAndSing(raw, sung, semi, stretch, style);

      if (style.harmony && i === words.length - 1) {
        const harm = path.join(work, `h${i}.mp3`);
        await pitchAndSing(raw, harm, semi + 3, stretch * 0.95, {
          ...style,
          volume: style.volume * 0.5,
          vibD: style.vibD * 0.8,
        });
        const mixed = path.join(work, `m${i}.mp3`);
        await mixHarmony(sung, harm, mixed);
        parts.push(mixed);
      } else {
        parts.push(sung);
      }
    }
    await concatMp3Files(parts, opts.dest);
    return (await fs.stat(opts.dest)).size > 400;
  } finally {
    fs.rm(work, { recursive: true, force: true }).catch(() => {});
  }
}
