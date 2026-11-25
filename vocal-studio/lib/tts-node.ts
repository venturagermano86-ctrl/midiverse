import { promises as fs } from "fs";
import path from "path";
import os from "os";

/**
 * Melodic / human vocal synthesis.
 * 1) ElevenLabs eleven_v3 with [sings] tags (release-ready when paid key set)
 * 2) Optional Edge TTS (more human than Google; may fail on some hosts)
 * 3) Google TTS last-resort demo only
 */

export async function ttsElevenLabsSung(
  text: string,
  voiceId: string,
  dest: string
): Promise<boolean> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey || !voiceId) return false;

  // Short sung lines hold melody better than long spoken blocks
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

function concatMp3(parts: Buffer[]): Buffer {
  return Buffer.concat(parts);
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

/** Edge neural voices — more human cadence than Google (best-effort). */
async function ttsEdgeBestEffort(
  text: string,
  voiceKey: string,
  dest: string
): Promise<boolean> {
  try {
    const { MsEdgeTTS, OUTPUT_FORMAT } = await import("msedge-tts");
    const map: Record<string, string> = {
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
    const voice = map[voiceKey] || map.jenny;
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

async function renderLine(opts: {
  text: string;
  dest: string;
  elevenVoiceId?: string;
  edgeVoice?: string;
}): Promise<"elevenlabs" | "edge" | "demo"> {
  if (
    opts.elevenVoiceId &&
    (await ttsElevenLabsSung(opts.text, opts.elevenVoiceId, opts.dest))
  ) {
    return "elevenlabs";
  }
  if (
    opts.edgeVoice &&
    (await ttsEdgeBestEffort(opts.text, opts.edgeVoice, opts.dest))
  ) {
    return "edge";
  }
  await ttsGoogle(opts.text, opts.dest);
  return "demo";
}

/**
 * Call/response as short melodic lines (sung when ElevenLabs is available).
 * Concat MP3s — no ffmpeg required.
 */
export async function synthesizeVocalMp3(opts: {
  dry: string[];
  wet: string[];
  lengthSec: number;
  dest: string;
  elevenVoiceId?: string;
  edgeVoice?: string;
}): Promise<"elevenlabs" | "edge" | "demo"> {
  const rounds = Math.max(2, Math.min(5, Math.floor(opts.lengthSec / 8)));
  const lines: string[] = [];
  for (let i = 0; i < rounds; i++) {
    lines.push(opts.dry[i % opts.dry.length]);
    lines.push(opts.wet[i % opts.wet.length]);
  }

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "vs-sung-"));
  const buffers: Buffer[] = [];
  let engine: "elevenlabs" | "edge" | "demo" = "demo";

  try {
    for (let i = 0; i < lines.length; i++) {
      const dest = path.join(tmp, `line${i}.mp3`);
      const used = await renderLine({
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

// Back-compat export used nowhere critical
export async function ttsPhrase(opts: {
  text: string;
  edgeVoice: string;
  rate: number;
  pitchHz: number;
  dest: string;
  elevenVoiceId?: string;
}): Promise<"elevenlabs" | "demo"> {
  const e = await renderLine({
    text: opts.text,
    dest: opts.dest,
    elevenVoiceId: opts.elevenVoiceId,
    edgeVoice: opts.edgeVoice,
  });
  return e === "elevenlabs" ? "elevenlabs" : "demo";
}
