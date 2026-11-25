import { createHash } from "crypto";
import { KEYS } from "./keys";

/**
 * Remake plan — every generate must feel different:
 * unique phrases, unique contour, unique voices, unique sung style.
 */

const VOICE_POOL_F = ["aria", "jenny", "sonia", "michelle", "emma", "natasha", "libby"];
const VOICE_POOL_M = ["guy", "brian"];

/** Big phrase banks — EN + IT open vowels, 2–4 words. */
const REMAKE_BANK: Record<string, { dry: string[]; wet: string[] }> = {
  celestial: {
    dry: [
      "hold me slow",
      "take me under",
      "fall with me",
      "breathe with me",
      "drift in blue",
      "resta con me",
      "portami via",
      "soft forever",
      "slide into quiet",
      "glow with me",
    ],
    wet: [
      "oh feel you",
      "pull me close",
      "call my name",
      "open wide",
      "non lasciarmi",
      "solo tu",
      "echo forever",
      "whisper my name",
      "fall into light",
      "stay in glow",
    ],
  },
  soul: {
    dry: [
      "hold me closer",
      "love me slow",
      "bring me home",
      "don't leave me",
      "sing for me",
      "amami ancora",
      "resta qui",
      "cry with me",
      "need you now",
      "wrap me warm",
    ],
    wet: [
      "through the night",
      "I need you",
      "take me higher",
      "never let go",
      "ti sento",
      "hold on baby",
      "love me true",
      "don't walk away",
      "keep this heart",
      "sing it soft",
    ],
  },
  club: {
    dry: [
      "take me higher",
      "feel the night",
      "move with me",
      "lose control",
      "hold the mark",
      "spin the gate",
      "ride this wave",
      "push it up",
      "body on fire",
      "keep me moving",
    ],
    wet: [
      "don't let go",
      "all night long",
      "run with me",
      "burn it down",
      "keep me close",
      "turn it loud",
      "shake the floor",
      "never stop",
      "feel the bass",
      "dance with me",
    ],
  },
  cold: {
    dry: [
      "into the dark",
      "hold the line",
      "no way back",
      "run the night",
      "cold light",
      "steel and fire",
      "break the grid",
      "pulse alone",
      "frozen heart",
      "shadow walk",
    ],
    wet: [
      "out of time",
      "break the chain",
      "find the signal",
      "shadow call",
      "wire to core",
      "no warmth left",
      "cut the line",
      "empty room",
      "cold forever",
      "run alone",
    ],
  },
  warm: {
    dry: [
      "under the sun",
      "move with me",
      "sway with me",
      "love me now",
      "open your heart",
      "sole sulla pelle",
      "balla con me",
      "heat of night",
      "gold forever",
      "touch the sky",
    ],
    wet: [
      "gold in air",
      "spin with me",
      "fire tonight",
      "dance till dawn",
      "feel alright",
      "kiss the sun",
      "warm forever",
      "night of color",
      "hold this heat",
      "rise with me",
    ],
  },
};

/** Melodic shapes — big intervals so it feels sung, not spoken. */
const CONTOURS: number[][] = [
  [0, 3, 5, 7, 5], // rise-fall
  [0, 5, 3, 7, 5], // call
  [7, 5, 3, 0, 3], // descend
  [0, 4, 7, 4, 2], // major leap
  [0, 3, 7, 10, 7], // minor climb
  [5, 3, 0, 3, 5], // valley
  [0, 7, 5, 3, 0], // octave drop
  [3, 5, 7, 5, 3], // arch mid
  [0, 2, 5, 9, 7], // stretch
  [0, 3, 2, 5, 0], // soul turn
];

export type SungStyle = {
  stretchBase: number;
  stretchHold: number;
  vibF: number;
  vibD: number;
  gapMs: number;
  edgeRate: string;
  harmony: boolean;
  volume: number;
};

function digest(s: string): number {
  return createHash("sha256").update(s).digest().readUInt32BE(0);
}

function rng(seed: number): () => number {
  let x = seed || 1;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x;
  };
}

function pickDifferent(
  pool: string[],
  avoid: string[],
  seed: number,
  n: number
): string[] {
  const avoidSet = new Set(avoid.map((a) => a.toLowerCase()));
  const filtered = pool.filter((p) => !avoidSet.has(p.toLowerCase()));
  const src = filtered.length >= n ? filtered : pool;
  const copy = [...src];
  const next = rng(seed);
  const out: string[] = [];
  for (let i = 0; i < Math.min(n, copy.length); i++) {
    const j = next() % copy.length;
    out.push(copy.splice(j, 1)[0]);
  }
  return out;
}

function bankFromPack(packId: string, label: string): string {
  const blob = `${packId} ${label}`.toLowerCase();
  if (blob.includes("celestial") || blob.includes("airy") || blob.includes("minimal"))
    return "celestial";
  if (blob.includes("soul") || blob.includes("deep") || blob.includes("nina"))
    return "soul";
  if (blob.includes("cold") || blob.includes("techno")) return "cold";
  if (blob.includes("afro") || blob.includes("warm") || blob.includes("disco"))
    return "warm";
  return "club";
}

export function scaleDegrees(keyId: string): number[] {
  const key = KEYS.find((k) => k.id === keyId) || KEYS[0];
  const intervals =
    key.mode === "minor" ? [0, 3, 5, 7, 10, 12] : [0, 4, 5, 7, 11, 12];
  return intervals.map((i) => key.rootSemitone + i);
}

export function noteContour(keyId: string, seed: number, slots: number): number[] {
  const degrees = scaleDegrees(keyId);
  const next = rng(seed);
  const pattern = CONTOURS[next() % CONTOURS.length];
  const out: number[] = [];
  for (let i = 0; i < slots; i++) {
    const idx = pattern[i % pattern.length] % degrees.length;
    // occasional neighbor color
    const nudge = next() % 11 === 0 ? (next() % 2 === 0 ? 1 : -1) : 0;
    const di = Math.max(0, Math.min(degrees.length - 1, idx + nudge));
    out.push(degrees[di]);
  }
  return out;
}

function pickVoice(seed: number, preferMale: boolean, avoid?: string): string {
  const pool = preferMale ? VOICE_POOL_M : VOICE_POOL_F;
  const next = rng(seed);
  let v = pool[next() % pool.length];
  if (avoid && v === avoid && pool.length > 1) {
    v = pool[(pool.indexOf(v) + 1 + (next() % (pool.length - 1))) % pool.length];
  }
  return v;
}

function sungStyle(seed: number): SungStyle {
  const next = rng(seed);
  const stretchBase = 0.62 + (next() % 18) / 100; // 0.62–0.79
  const stretchHold = Math.max(0.52, stretchBase - 0.1 - (next() % 8) / 100);
  return {
    stretchBase,
    stretchHold,
    vibF: 4.2 + (next() % 25) / 10, // 4.2–6.6
    vibD: 0.35 + (next() % 25) / 100, // 0.35–0.59
    gapMs: 90 + (next() % 140), // 90–229
    edgeRate: `-${38 + (next() % 12)}%`, // -38 to -49
    harmony: next() % 3 !== 0, // often on for wet
    volume: 0.85 + (next() % 15) / 100,
  };
}

export type RemakePlan = {
  dry: string[];
  wet: string[];
  dryVoice: string;
  wetVoice: string;
  notes: number[];
  bank: string;
  style: SungStyle;
  wetStyle: SungStyle;
  note: string;
};

export function planRemake(opts: {
  packId?: string;
  label?: string;
  voice: string;
  wetVoice?: string;
  keyId: string;
  avoidDry?: string[];
  avoidWet?: string[];
  seedKey: string;
}): RemakePlan {
  const bank = bankFromPack(opts.packId || "", opts.label || "");
  const pool = REMAKE_BANK[bank] || REMAKE_BANK.club;
  const seed = digest(`remake|${opts.seedKey}|${bank}|${opts.keyId}|v3`);
  const next = rng(seed);

  const dry = pickDifferent(pool.dry, opts.avoidDry || [], seed, 2);
  const wet = pickDifferent(pool.wet, opts.avoidWet || [], seed ^ 0x5f3759df, 2);

  const male = opts.voice === "guy" || opts.voice === "brian";
  const dryVoice = pickVoice(seed ^ 0xabc, male);
  const wetVoice = pickVoice(seed ^ 0xdef, male, dryVoice);

  const slots = [...dry, ...wet].join(" ").split(/\s+/).length;
  const notes = noteContour(opts.keyId, seed ^ next(), Math.max(10, slots + 2));
  const style = sungStyle(seed ^ 0x111);
  const wetStyle = {
    ...sungStyle(seed ^ 0x222),
    harmony: true,
    stretchHold: Math.max(0.5, style.stretchHold - 0.05),
    gapMs: style.gapMs + 40,
  };

  return {
    dry,
    wet,
    dryVoice,
    wetVoice,
    notes,
    bank,
    style,
    wetStyle,
    note: `Cantato unico · ${bank} · voci ${dryVoice}/${wetVoice} · contorno melodico diverso ogni generate.`,
  };
}
