import { promises as fs } from "fs";

/**
 * Production-safe TTS: HTTPS only (no WebSocket, no ffmpeg spawn).
 * ElevenLabs when keyed; otherwise Google Translate TTS HTTP (demo).
 */

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
        signal: AbortSignal.timeout(25000),
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

/** Chunk text for Google TTS (hard limit ~180–200 chars). */
function chunksForGoogle(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= 160) return [clean];
  const parts: string[] = [];
  let rest = clean;
  while (rest.length > 160) {
    let cut = rest.lastIndexOf(" ", 160);
    if (cut < 40) cut = 160;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts;
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
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`google_tts_${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 200) throw new Error("google_tts_empty");
  return buf;
}

/** Naive MP3 frame concat — ok for same-source CBR demo chunks. */
function concatMp3(parts: Buffer[]): Buffer {
  return Buffer.concat(parts);
}

export async function ttsGoogle(text: string, dest: string): Promise<void> {
  const chunks = chunksForGoogle(text);
  const buffers: Buffer[] = [];
  for (const c of chunks) {
    buffers.push(await ttsGoogleChunk(c));
  }
  await fs.writeFile(dest, concatMp3(buffers));
}

export async function ttsPhrase(opts: {
  text: string;
  edgeVoice: string;
  rate: number;
  pitchHz: number;
  dest: string;
  elevenVoiceId?: string;
}): Promise<"elevenlabs" | "demo"> {
  if (
    opts.elevenVoiceId &&
    (await ttsElevenLabs(opts.text, opts.elevenVoiceId, opts.dest))
  ) {
    return "elevenlabs";
  }
  await ttsGoogle(opts.text, opts.dest);
  return "demo";
}

/**
 * Build one spoken script (call/response) and synthesize a single MP3.
 * No ffmpeg — avoids 502 on hosts that can't spawn binaries / WebSockets.
 */
export async function synthesizeVocalMp3(opts: {
  dry: string[];
  wet: string[];
  lengthSec: number;
  dest: string;
  elevenVoiceId?: string;
  edgeVoice?: string;
}): Promise<"elevenlabs" | "demo"> {
  const rounds = Math.max(2, Math.min(4, Math.floor(opts.lengthSec / 10)));
  const lines: string[] = [];
  for (let i = 0; i < rounds; i++) {
    lines.push(opts.dry[i % opts.dry.length]);
    lines.push(opts.wet[i % opts.wet.length]);
  }
  // Periods create natural pauses in TTS
  const script = lines.join(". ") + ".";

  if (
    opts.elevenVoiceId &&
    (await ttsElevenLabs(script, opts.elevenVoiceId, opts.dest))
  ) {
    return "elevenlabs";
  }
  await ttsGoogle(script, opts.dest);
  return "demo";
}
