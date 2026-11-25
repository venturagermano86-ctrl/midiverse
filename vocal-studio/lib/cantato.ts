import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { spawn } from "child_process";

/**
 * Cantato free engine — turns short Edge phrases into melodic hooks.
 * Speech TTS alone = parlato. Here each word lands on a scale note,
 * stretched + light vibrato, so it reads as sung club topline.
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

function run(
  bin: string,
  args: string[],
  timeoutMs = 16000
): Promise<void> {
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

async function ffmpegBin(): Promise<string | null> {
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
      return b;
    } catch {
      /* next */
    }
  }
  return null;
}

async function pitchAndSing(
  src: string,
  dest: string,
  semitones: number,
  stretch = 0.72
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
  // Mild vibrato = human sung wobble
  filters.push("vibrato=f=5.2:d=0.42");
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

async function concatMp3Files(files: string[], dest: string): Promise<void> {
  const bin = await ffmpegBin();
  if (bin) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "cat-"));
    try {
      const list = path.join(dir, "list.txt");
      await fs.writeFile(
        list,
        files.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n")
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
      /* buffer fallback */
    } finally {
      fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }
  const parts = await Promise.all(files.map((f) => fs.readFile(f)));
  await fs.writeFile(dest, Buffer.concat(parts));
}

type EdgeHandle = {
  toFile: (
    dir: string,
    text: string,
    opts?: { rate?: string; pitch?: string }
  ) => Promise<{ audioFilePath?: string }>;
};

let sharedTts: EdgeHandle | null = null;
let sharedVoice = "";

async function getEdge(voiceKey: string): Promise<{
  tts: EdgeHandle;
  voiceName: string;
} | null> {
  try {
    const { MsEdgeTTS, OUTPUT_FORMAT } = await import("msedge-tts");
    const voiceName = EDGE_MAP[voiceKey] || EDGE_MAP.aria;
    if (sharedTts && sharedVoice === voiceName) {
      return { tts: sharedTts, voiceName };
    }
    const tts = new MsEdgeTTS();
    await tts.setMetadata(
      voiceName,
      OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
    );
    sharedTts = tts as unknown as EdgeHandle;
    sharedVoice = voiceName;
    return { tts: sharedTts, voiceName };
  } catch {
    return null;
  }
}

async function edgeWord(
  tts: EdgeHandle,
  word: string,
  dest: string
): Promise<boolean> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ew-"));
  try {
    const result = (await Promise.race([
      tts.toFile(dir, word, { rate: "-45%", pitch: "+0Hz" }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 9000)
      ),
    ])) as { audioFilePath?: string };
    const src = result.audioFilePath || path.join(dir, "audio.mp3");
    await fs.copyFile(src, dest);
    const st = await fs.stat(dest);
    return st.size > 200;
  } catch {
    return false;
  } finally {
    fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Render one short hook as cantato: each word on a scale degree.
 * Returns true if Edge path succeeded.
 */
export async function renderCantatoPhrase(opts: {
  text: string;
  dest: string;
  edgeVoice: string;
  /** Absolute scale degrees (semitone offsets from A); relative used */
  notes: number[];
}): Promise<boolean> {
  const words = opts.text
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 5); // keep short — cantabile
  if (!words.length) return false;

  const edge = await getEdge(opts.edgeVoice);
  if (!edge) return false;

  const root = opts.notes[0] ?? 0;
  // Strong hook contour if notes thin
  const contour =
    opts.notes.length >= words.length
      ? opts.notes
      : [0, 3, 5, 7, 5, 3, 0].map((s) => root + s);

  const work = await fs.mkdtemp(path.join(os.tmpdir(), "cantato-"));
  try {
    const pitched: string[] = [];
    for (let i = 0; i < words.length; i++) {
      const raw = path.join(work, `w${i}.mp3`);
      const ok = await edgeWord(edge.tts, words[i], raw);
      if (!ok) return false;
      const semi = (contour[i % contour.length] ?? root) - root;
      // Last word: hold longer (more stretch)
      const stretch = i === words.length - 1 ? 0.65 : 0.74;
      const out = path.join(work, `p${i}.mp3`);
      await pitchAndSing(raw, out, semi, stretch);
      pitched.push(out);
    }
    await concatMp3Files(pitched, opts.dest);
    const st = await fs.stat(opts.dest);
    return st.size > 400;
  } finally {
    fs.rm(work, { recursive: true, force: true }).catch(() => {});
  }
}
