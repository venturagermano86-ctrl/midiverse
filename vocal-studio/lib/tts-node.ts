import { promises as fs } from "fs";
import path from "path";
import os from "os";

/**
 * Free-first melodic vocal synthesis (sistema nostro).
 * 1) Edge TTS neural (best free human cadence)
 * 2) Optional ElevenLabs if key present (not required)
 * 3) Google TTS last-resort
 */

export type VocalEngine = "edge" | "elevenlabs" | "demo";

export async function ttsElevenLabsSung(
  text: string,
  voiceId: string,
  dest: string
): Promise<boolean> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey || !voiceId) return false;

  const sung = text.trim().startsWith("[")
    ? text.trim()
    : `[sings][softly][drawn out] ${text.trim()}`;

  const models = ["eleven_v3", "eleven_multilingual_v2"] as const;
  for (const model_id of models) {
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
            text: model_id === "eleven_v3" ? sung : text.trim(),
            model_id,
            voice_settings: {
              stability: model_id === "eleven_v3" ? 0.25 : 0.3,
              similarity_boost: 0.85,
              style: 0.75,
              use_speaker_boost: true,
            },
          }),
          signal: AbortSignal.timeout(28000),
        }
      );
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 400) continue;
      await fs.writeFile(dest, buf);
      return true;
    } catch {
      /* try next model */
    }
  }
  return false;
}

async function ttsGoogleChunk(text: string): Promise<Buffer> {
  const url =
    "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=" +
    encodeURIComponent(text);
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; VocalStudio/1.0; +https://vocal-studio.apps.grok.bot)",
      Accept: "audio/mpeg,audio/*;q=0.9,*/*;q=0.8",
      Referer: "https://translate.google.com/",
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`google_tts_${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 200) throw new Error("google_tts_empty");
  return buf;
}

async function ttsGoogle(text: string, dest: string): Promise<void> {
  const clean = text.replace(/\s+/g, " ").trim().slice(0, 160);
  await fs.writeFile(dest, await ttsGoogleChunk(clean));
}

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

/** Edge neural voices — primary free engine. */
export async function ttsEdgeBestEffort(
  text: string,
  voiceKey: string,
  dest: string
): Promise<boolean> {
  try {
    const { MsEdgeTTS, OUTPUT_FORMAT } = await import("msedge-tts");
    const voice = EDGE_MAP[voiceKey] || EDGE_MAP.jenny;
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "edge-mel-"));
    try {
      const result = (await Promise.race([
        tts.toFile(dir, text, {
          rate: "-22%",
          pitch: "+1Hz",
        } as never),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("edge_timeout")), 10000)
        ),
      ])) as { audioFilePath?: string };
      const produced = result.audioFilePath || path.join(dir, "audio.mp3");
      await fs.copyFile(produced, dest);
      const st = await fs.stat(dest);
      return st.size > 400;
    } finally {
      fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  } catch {
    return false;
  }
}

export async function renderPhrase(opts: {
  text: string;
  dest: string;
  edgeVoice: string;
  elevenVoiceId?: string;
}): Promise<VocalEngine> {
  // Free-first: Edge before ElevenLabs (sistema nostro senza pagare)
  if (await ttsEdgeBestEffort(opts.text, opts.edgeVoice, opts.dest)) {
    return "edge";
  }
  if (
    opts.elevenVoiceId &&
    (await ttsElevenLabsSung(opts.text, opts.elevenVoiceId, opts.dest))
  ) {
    return "elevenlabs";
  }
  await ttsGoogle(opts.text, opts.dest);
  return "demo";
}

function concatMp3(parts: Buffer[]): Buffer {
  return Buffer.concat(parts);
}

/** Legacy single-file mix (no stems). */
export async function synthesizeVocalMp3(opts: {
  dry: string[];
  wet: string[];
  lengthSec: number;
  dest: string;
  elevenVoiceId?: string;
  edgeVoice?: string;
}): Promise<VocalEngine> {
  const rounds = Math.max(2, Math.min(5, Math.floor(opts.lengthSec / 8)));
  const lines: string[] = [];
  for (let i = 0; i < rounds; i++) {
    lines.push(opts.dry[i % opts.dry.length]);
    lines.push(opts.wet[i % opts.wet.length]);
  }

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "vs-sung-"));
  const buffers: Buffer[] = [];
  let engine: VocalEngine = "demo";

  try {
    for (let i = 0; i < lines.length; i++) {
      const dest = path.join(tmp, `line${i}.mp3`);
      const used = await renderPhrase({
        text: lines[i],
        dest,
        elevenVoiceId: opts.elevenVoiceId,
        edgeVoice: opts.edgeVoice || "jenny",
      });
      if (used === "elevenlabs") engine = "elevenlabs";
      else if (used === "edge" && engine !== "elevenlabs") engine = "edge";
      buffers.push(await fs.readFile(dest));
    }
    await fs.writeFile(opts.dest, concatMp3(buffers));
  } finally {
    fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
  return engine;
}
