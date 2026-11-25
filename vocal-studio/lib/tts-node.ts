import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { renderCantatoPhrase } from "./cantato";

/**
 * Free-first cantato path (sistema nostro).
 * 1) Edge word-by-word on scale notes + stretch/vibrato (= sung feel)
 * 2) Edge whole-phrase slow fallback
 * 3) Google last-resort (still stretched) — avoid when possible
 */

export type VocalEngine = "edge" | "elevenlabs" | "demo";

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
          text: sung,
          model_id: "eleven_v3",
          voice_settings: {
            stability: 0.25,
            similarity_boost: 0.85,
            style: 0.85,
            use_speaker_boost: true,
          },
        }),
        signal: AbortSignal.timeout(28000),
      }
    );
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 400) return false;
    await fs.writeFile(dest, buf);
    return true;
  } catch {
    return false;
  }
}

async function ttsGoogle(text: string, dest: string): Promise<void> {
  const clean = text.replace(/\s+/g, " ").trim().slice(0, 120);
  const url =
    "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=" +
    encodeURIComponent(clean);
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; VocalStudio/1.0; +https://vocal-studio.apps.grok.bot)",
      Accept: "audio/mpeg",
      Referer: "https://translate.google.com/",
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`google_tts_${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 200) throw new Error("google_tts_empty");
  await fs.writeFile(dest, buf);
}

/** Slow whole-phrase Edge (backup if word-melody fails). */
async function ttsEdgePhrase(
  text: string,
  voiceKey: string,
  dest: string
): Promise<boolean> {
  try {
    const { MsEdgeTTS, OUTPUT_FORMAT } = await import("msedge-tts");
    const voice = EDGE_MAP[voiceKey] || EDGE_MAP.aria;
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "edge-ph-"));
    try {
      const result = (await Promise.race([
        tts.toFile(dir, text, { rate: "-42%", pitch: "+2Hz" } as never),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("edge_timeout")), 12000)
        ),
      ])) as { audioFilePath?: string };
      const produced = result.audioFilePath || path.join(dir, "audio.mp3");
      await fs.copyFile(produced, dest);
      return (await fs.stat(dest)).size > 400;
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
  notes?: number[];
}): Promise<VocalEngine> {
  // 1) True-ish cantato: word-on-notes
  if (
    await renderCantatoPhrase({
      text: opts.text,
      dest: opts.dest,
      edgeVoice: opts.edgeVoice,
      notes: opts.notes || [0, 3, 5, 7, 5],
    })
  ) {
    return "edge";
  }
  // 2) Optional ElevenLabs (user declined key — skipped)
  if (
    opts.elevenVoiceId &&
    (await ttsElevenLabsSung(opts.text, opts.elevenVoiceId, opts.dest))
  ) {
    return "elevenlabs";
  }
  // 3) Slow Edge phrase
  if (await ttsEdgePhrase(opts.text, opts.edgeVoice, opts.dest)) {
    return "edge";
  }
  await ttsGoogle(opts.text, opts.dest);
  return "demo";
}
