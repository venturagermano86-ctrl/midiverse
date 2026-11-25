import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";

/**
 * Vocal stems for the remake pipeline:
 * - dry.mp3  (call, fixed)
 * - wet.mp3  (response, lightly pitched / delayed feel)
 * - mix.mp3  (dry+wet interleaved, duration-locked)
 *
 * Pitch-follows note contour (semitone offsets) via ffmpeg asetrate.
 */

function run(
  bin: string,
  args: string[],
  timeoutMs = 25000
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

function ff(): string {
  return (ffmpegPath as string | null) || "ffmpeg";
}

/** Stretch/pad/trim to exact duration (seconds). */
export async function lockDuration(
  src: string,
  dest: string,
  lengthSec: number
): Promise<void> {
  const bin = ff();
  // atempo only accepts 0.5–2.0; chain if needed after measuring is heavy —
  // use apad + atrim for hard lock (club stem length).
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
}

/** Pitch shift by N semitones (asetrate), keep duration with atempo. */
export async function pitchShiftSemitones(
  src: string,
  dest: string,
  semitones: number
): Promise<void> {
  const bin = ff();
  const ratio = Math.pow(2, semitones / 12);
  // asetrate changes pitch+speed; atempo restores duration
  let tempo = 1 / ratio;
  const filters: string[] = [`asetrate=24000*${ratio.toFixed(6)}`, "aresample=24000"];
  // atempo must be 0.5–2.0
  while (tempo > 2.0) {
    filters.push("atempo=2.0");
    tempo /= 2;
  }
  while (tempo < 0.5) {
    filters.push("atempo=0.5");
    tempo /= 0.5;
  }
  filters.push(`atempo=${tempo.toFixed(6)}`);
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
}

/** Light wet character: slight pitch + delay echo (Delay Designer–ish, free). */
export async function wetCharacter(src: string, dest: string): Promise<void> {
  const bin = ff();
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
}

export async function concatAudio(files: string[], dest: string): Promise<void> {
  const bin = ff();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "vs-concat-"));
  try {
    const list = path.join(dir, "list.txt");
    const body = files.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n");
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
  } finally {
    fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Apply note contour across sequential phrase files:
 * each file gets pitched to notes[i] relative to notes[0] (root).
 */
export async function applyNoteContour(
  phraseFiles: string[],
  notes: number[],
  outDir: string
): Promise<string[]> {
  const root = notes[0] ?? 0;
  const pitched: string[] = [];
  for (let i = 0; i < phraseFiles.length; i++) {
    const semi = (notes[i % notes.length] ?? root) - root;
    const dest = path.join(outDir, `pitched${i}.mp3`);
    if (Math.abs(semi) < 0.01) {
      await fs.copyFile(phraseFiles[i], dest);
    } else {
      try {
        await pitchShiftSemitones(phraseFiles[i], dest, semi);
      } catch {
        await fs.copyFile(phraseFiles[i], dest);
      }
    }
    pitched.push(dest);
  }
  return pitched;
}

export type StemBundle = {
  dryPath: string;
  wetPath: string;
  mixPath: string;
  lengthSec: number;
};

/** Build dry / wet / mix stems locked to lengthSec. */
export async function buildStemBundle(opts: {
  dryPhrases: string[];
  wetPhrases: string[];
  lengthSec: number;
  workDir: string;
  renderPhrase: (text: string, dest: string, voice: string) => Promise<void>;
  dryVoice: string;
  wetVoice: string;
  notes: number[];
}): Promise<StemBundle> {
  const rawDir = path.join(opts.workDir, "raw");
  const pitDir = path.join(opts.workDir, "pit");
  await fs.mkdir(rawDir, { recursive: true });
  await fs.mkdir(pitDir, { recursive: true });

  const rounds = Math.max(2, Math.min(5, Math.floor(opts.lengthSec / 8)));
  const dryRaws: string[] = [];
  const wetRaws: string[] = [];

  for (let i = 0; i < rounds; i++) {
    const dText = opts.dryPhrases[i % opts.dryPhrases.length];
    const wText = opts.wetPhrases[i % opts.wetPhrases.length];
    const dPath = path.join(rawDir, `dry${i}.mp3`);
    const wPath = path.join(rawDir, `wet${i}.mp3`);
    await opts.renderPhrase(dText, dPath, opts.dryVoice);
    await opts.renderPhrase(wText, wPath, opts.wetVoice);
    dryRaws.push(dPath);
    wetRaws.push(wPath);
  }

  const dryPitched = await applyNoteContour(dryRaws, opts.notes, pitDir);
  const wetPitDir = path.join(opts.workDir, "wetpit");
  await fs.mkdir(wetPitDir, { recursive: true });
  const wetNotes = opts.notes.map((n, i) => n + (i % 2 === 0 ? 0 : 3)); // response a third up-ish
  const wetPitchedBase = await applyNoteContour(wetRaws, wetNotes, wetPitDir);

  const wetChar: string[] = [];
  for (let i = 0; i < wetPitchedBase.length; i++) {
    const dest = path.join(opts.workDir, `wetchar${i}.mp3`);
    try {
      await wetCharacter(wetPitchedBase[i], dest);
    } catch {
      await fs.copyFile(wetPitchedBase[i], dest);
    }
    wetChar.push(dest);
  }

  const dryJoined = path.join(opts.workDir, "dry-joined.mp3");
  const wetJoined = path.join(opts.workDir, "wet-joined.mp3");
  const mixJoined = path.join(opts.workDir, "mix-joined.mp3");

  await concatAudio(dryPitched, dryJoined);
  await concatAudio(wetChar, wetJoined);

  // Interleave dry/wet for mix
  const interleaved: string[] = [];
  for (let i = 0; i < Math.max(dryPitched.length, wetChar.length); i++) {
    if (dryPitched[i]) interleaved.push(dryPitched[i]);
    if (wetChar[i]) interleaved.push(wetChar[i]);
  }
  await concatAudio(interleaved, mixJoined);

  const dryPath = path.join(opts.workDir, "stem-dry.mp3");
  const wetPath = path.join(opts.workDir, "stem-wet.mp3");
  const mixPath = path.join(opts.workDir, "stem-mix.mp3");

  await lockDuration(dryJoined, dryPath, opts.lengthSec);
  await lockDuration(wetJoined, wetPath, opts.lengthSec);
  await lockDuration(mixJoined, mixPath, opts.lengthSec);

  return { dryPath, wetPath, mixPath, lengthSec: opts.lengthSec };
}
