import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { spawn } from "child_process";

/**
 * Vocal stems — dry / wet / mix.
 * Uses ffmpeg when available; otherwise pure MP3 concat (no subprocess).
 */

function run(
  bin: string,
  args: string[],
  timeoutMs = 20000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    const t = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("ffmpeg_timeout"));
    }, timeoutMs);
    child.stderr?.on("data", (d) => {
      err += String(d).slice(0, 400);
    });
    child.on("error", (e) => {
      clearTimeout(t);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(t);
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg_${code}:${err.slice(0, 120)}`));
    });
  });
}

let cachedBin: string | null | undefined;

async function resolveFfmpeg(): Promise<string | null> {
  if (cachedBin !== undefined) return cachedBin;
  const candidates: string[] = [];
  try {
    const mod = await import("ffmpeg-static");
    const p = (mod as { default?: string }).default || (mod as unknown as string);
    if (typeof p === "string" && p) candidates.push(p);
  } catch {
    /* optional */
  }
  candidates.push("ffmpeg", "/usr/bin/ffmpeg");
  for (const bin of candidates) {
    try {
      await run(bin, ["-version"], 5000);
      cachedBin = bin;
      return bin;
    } catch {
      /* try next */
    }
  }
  cachedBin = null;
  return null;
}

async function lockDuration(
  src: string,
  dest: string,
  lengthSec: number
): Promise<boolean> {
  const bin = await resolveFfmpeg();
  if (!bin) return false;
  try {
    await run(bin, [
      "-y",
      "-i",
      src,
      "-af",
      `apad=pad_dur=${lengthSec},atrim=0:${lengthSec}`,
      "-t",
      String(lengthSec),
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
    return true;
  } catch {
    return false;
  }
}

async function pitchShiftSemitones(
  src: string,
  dest: string,
  semitones: number
): Promise<boolean> {
  const bin = await resolveFfmpeg();
  if (!bin || Math.abs(semitones) < 0.01) {
    await fs.copyFile(src, dest);
    return !bin;
  }
  const ratio = Math.pow(2, semitones / 12);
  let tempo = 1 / ratio;
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
    return true;
  } catch {
    await fs.copyFile(src, dest);
    return false;
  }
}

async function wetCharacter(src: string, dest: string): Promise<void> {
  const bin = await resolveFfmpeg();
  if (!bin) {
    await fs.copyFile(src, dest);
    return;
  }
  try {
    await run(bin, [
      "-y",
      "-i",
      src,
      "-af",
      "asetrate=24000*1.02,aresample=24000,atempo=0.9804,aecho=0.8:0.88:180:0.22",
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

async function concatAudio(files: string[], dest: string): Promise<void> {
  const bin = await resolveFfmpeg();
  if (bin) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "vs-concat-"));
    try {
      const list = path.join(dir, "list.txt");
      const body = files
        .map((f) => `file '${f.replace(/'/g, "'\\''")}'`)
        .join("\n");
      await fs.writeFile(list, body);
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
      /* fall through to buffer concat */
    } finally {
      fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  }
  const parts = await Promise.all(files.map((f) => fs.readFile(f)));
  await fs.writeFile(dest, Buffer.concat(parts));
}

async function applyNoteContour(
  phraseFiles: string[],
  notes: number[],
  outDir: string
): Promise<string[]> {
  await fs.mkdir(outDir, { recursive: true });
  const root = notes[0] ?? 0;
  const pitched: string[] = [];
  for (let i = 0; i < phraseFiles.length; i++) {
    const semi = (notes[i % notes.length] ?? root) - root;
    const dest = path.join(outDir, `pitched${i}.mp3`);
    await pitchShiftSemitones(phraseFiles[i], dest, semi);
    pitched.push(dest);
  }
  return pitched;
}

export type StemBundle = {
  dryPath: string;
  wetPath: string;
  mixPath: string;
  lengthSec: number;
  usedFfmpeg: boolean;
};

/** Build dry / wet / mix stems; never throws if phrases render. */
export async function buildStemBundle(opts: {
  dryPhrases: string[];
  wetPhrases: string[];
  lengthSec: number;
  workDir: string;
  renderPhrase: (
    text: string,
    dest: string,
    voice: string,
    notes: number[],
    role: "dry" | "wet"
  ) => Promise<void>;
  dryVoice: string;
  wetVoice: string;
  notes: number[];
}): Promise<StemBundle> {
  const rawDir = path.join(opts.workDir, "raw");
  await fs.mkdir(rawDir, { recursive: true });

  // Cantato word-by-word is slower — keep rounds tight under host timeout
  const rounds = Math.max(2, Math.min(3, Math.floor(opts.lengthSec / 14)));
  const dryRaws: string[] = [];
  const wetRaws: string[] = [];

  for (let i = 0; i < rounds; i++) {
    const dText = opts.dryPhrases[i % opts.dryPhrases.length];
    const wText = opts.wetPhrases[i % opts.wetPhrases.length];
    const dPath = path.join(rawDir, `dry${i}.mp3`);
    const wPath = path.join(rawDir, `wet${i}.mp3`);
    // Rotate note window per phrase so each line has a melodic arc
    const offset = (i * 3) % Math.max(1, opts.notes.length);
    const slice = [
      ...opts.notes.slice(offset),
      ...opts.notes.slice(0, offset),
    ];
    await opts.renderPhrase(dText, dPath, opts.dryVoice, slice, "dry");
    await opts.renderPhrase(
      wText,
      wPath,
      opts.wetVoice,
      slice.map((n) => n + 4),
      "wet"
    );
    dryRaws.push(dPath);
    wetRaws.push(wPath);
  }

  const ff = await resolveFfmpeg();
  const dryPitched = await applyNoteContour(
    dryRaws,
    opts.notes,
    path.join(opts.workDir, "pit")
  );
  const wetNotes = opts.notes.map((n, i) => n + (i % 2 === 0 ? 0 : 3));
  const wetPitchedBase = await applyNoteContour(
    wetRaws,
    wetNotes,
    path.join(opts.workDir, "wetpit")
  );

  const wetChar: string[] = [];
  for (let i = 0; i < wetPitchedBase.length; i++) {
    const dest = path.join(opts.workDir, `wetchar${i}.mp3`);
    await wetCharacter(wetPitchedBase[i], dest);
    wetChar.push(dest);
  }

  const dryJoined = path.join(opts.workDir, "dry-joined.mp3");
  const wetJoined = path.join(opts.workDir, "wet-joined.mp3");
  const mixJoined = path.join(opts.workDir, "mix-joined.mp3");

  await concatAudio(dryPitched, dryJoined);
  await concatAudio(wetChar, wetJoined);

  const interleaved: string[] = [];
  for (let i = 0; i < Math.max(dryPitched.length, wetChar.length); i++) {
    if (dryPitched[i]) interleaved.push(dryPitched[i]);
    if (wetChar[i]) interleaved.push(wetChar[i]);
  }
  await concatAudio(interleaved, mixJoined);

  const dryPath = path.join(opts.workDir, "stem-dry.mp3");
  const wetPath = path.join(opts.workDir, "stem-wet.mp3");
  const mixPath = path.join(opts.workDir, "stem-mix.mp3");

  const locked =
    (await lockDuration(dryJoined, dryPath, opts.lengthSec)) &&
    (await lockDuration(wetJoined, wetPath, opts.lengthSec)) &&
    (await lockDuration(mixJoined, mixPath, opts.lengthSec));

  if (!locked) {
    await fs.copyFile(dryJoined, dryPath);
    await fs.copyFile(wetJoined, wetPath);
    await fs.copyFile(mixJoined, mixPath);
  }

  return {
    dryPath,
    wetPath,
    mixPath,
    lengthSec: opts.lengthSec,
    usedFfmpeg: Boolean(ff) && locked,
  };
}
