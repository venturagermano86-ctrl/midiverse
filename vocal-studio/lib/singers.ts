/**
 * AI singer styles for commercial track releases.
 * Uses ElevenLabs Voice Library IDs (generic/licensed voices) — NOT celebrity clones.
 * Commercial use requires a paid ElevenLabs plan (their ToS). Free/demo TTS is preview-only.
 */
export type SingerPreset = {
  id: string;
  label: string;
  blurb: string;
  /** ElevenLabs voice_id (public library / account) */
  elevenVoiceId: string;
  /** Fallback edge-tts key when no API key */
  edgeVoice: string;
  rate: number;
  pitchHz: number;
  dsp: "airy" | "chest" | "punch" | "warm" | "cold";
};

export const SINGERS: SingerPreset[] = [
  {
    id: "house-soul-f",
    label: "House soul · female",
    blurb: "Calda, call-response, club night",
    elevenVoiceId: "EXAVITQu4vr4xnSDxMaL", // Sarah (library)
    edgeVoice: "sonia",
    rate: -28,
    pitchHz: -4,
    dsp: "chest",
  },
  {
    id: "minimal-airy-f",
    label: "Minimal airy · female",
    blurb: "Villalobos-leaning soft float",
    elevenVoiceId: "XrExE9yKIg1WjnnlVkGX", // Matilda
    edgeVoice: "jenny",
    rate: -30,
    pitchHz: 2,
    dsp: "airy",
  },
  {
    id: "tech-hook-f",
    label: "Tech hook · female",
    blurb: "Dry punch + wet answer",
    elevenVoiceId: "pFZP5JQG7iQjIQuC4Bku", // Lily
    edgeVoice: "aria",
    rate: -14,
    pitchHz: 2,
    dsp: "punch",
  },
  {
    id: "deep-male",
    label: "Deep chant · male",
    blurb: "Low mantra / warehouse",
    elevenVoiceId: "TX3LPaxmHKxFdv7VOQHJ", // Liam
    edgeVoice: "brian",
    rate: -12,
    pitchHz: -3,
    dsp: "cold",
  },
  {
    id: "afro-warm-f",
    label: "Afro warm · female",
    blurb: "Sun, percussion, open vowel",
    elevenVoiceId: "jBpfuIE2acCO8z3wKNLl", // Gigi
    edgeVoice: "natasha",
    rate: -18,
    pitchHz: 3,
    dsp: "warm",
  },
  {
    id: "uk-garage-f",
    label: "UK soft · female",
    blurb: "Light, late-night UK feel",
    elevenVoiceId: "ThT5KcBeYPX3keUQqHPh", // Dorothy
    edgeVoice: "libby",
    rate: -22,
    pitchHz: 1,
    dsp: "airy",
  },
];

export function getSinger(id: string) {
  return SINGERS.find((s) => s.id === id) || SINGERS[0];
}
