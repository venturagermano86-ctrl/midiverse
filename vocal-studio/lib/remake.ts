import { createHash } from "crypto";
import { KEYS } from "./keys";

/**
 * Remake vocale "sistema nostro":
 * - parole diverse (stesso mood / stessa struttura sillabica)
 * - stessa durata target
 * - stesso schema di note (scala della chiave, pattern fisso)
 * - voce leggermente diversa (neighbor), stesso mood
 *
 * Non clona cantanti famosi né ricopia il testo del riferimento.
 */

const NEIGHBOR_VOICE: Record<string, string> = {
  jenny: "aria",
  aria: "jenny",
  sonia: "michelle",
  michelle: "sonia",
  emma: "aria",
  natasha: "libby",
  libby: "natasha",
  guy: "brian",
  brian: "guy",
};

/** Alternate hooks per mood bank — diverse parole, stesso feeling. */
/** Short open-vowel hooks (2–4 words) — cantabile, not spoken essays. */
const REMAKE_BANK: Record<string, { dry: string[]; wet: string[] }> = {
  celestial: {
    dry: ["hold me slow", "take me under", "fall with me", "breathe with me", "stay with me"],
    wet: ["oh feel you", "pull me close", "soft forever", "call my name", "open wide"],
  },
  soul: {
    dry: ["hold me closer", "love me slow", "bring me home", "don't leave me", "sing for me"],
    wet: ["through the night", "I need you", "hold on now", "take me higher", "never let go"],
  },
  club: {
    dry: ["take me higher", "feel the night", "move with me", "lose control", "hold the mark"],
    wet: ["don't let go", "all night long", "run with me", "burn it down", "keep me close"],
  },
  cold: {
    dry: ["into the dark", "hold the line", "no way back", "run the night", "cold light"],
    wet: ["out of time", "break the chain", "find the signal", "shadow call", "steel fire"],
  },
  warm: {
    dry: ["under the sun", "move with me", "sway with me", "love me now", "open your heart"],
    wet: ["gold in air", "spin with me", "fire tonight", "dance till dawn", "feel alright"],
  },
};

function digest(s: string): number {
  return createHash("sha256").update(s).digest().readUInt32BE(0);
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
  let x = seed || 1;
  const out: string[] = [];
  for (let i = 0; i < Math.min(n, copy.length); i++) {
    x = (x * 1664525 + 1013904223) >>> 0;
    const j = x % copy.length;
    out.push(copy.splice(j, 1)[0]);
  }
  return out;
}

function bankFromPack(packId: string, label: string): string {
  const blob = `${packId} ${label}`.toLowerCase();
  if (blob.includes("celestial") || blob.includes("airy") || blob.includes("minimal"))
    return "celestial";
  if (blob.includes("soul") || blob.includes("deep")) return "soul";
  if (blob.includes("cold") || blob.includes("techno")) return "cold";
  if (blob.includes("afro") || blob.includes("warm") || blob.includes("disco"))
    return "warm";
  return "club";
}

/** Minor/major scale intervals from root (semitones). */
export function scaleDegrees(keyId: string): number[] {
  const key = KEYS.find((k) => k.id === keyId) || KEYS[0];
  const intervals =
    key.mode === "minor"
      ? [0, 3, 5, 7, 10, 12] // natural minor / pent+oct
      : [0, 4, 5, 7, 11, 12];
  return intervals.map((i) => key.rootSemitone + i);
}

/**
 * Fixed melodic contour for remake — same notes every time for a given key+seed.
 * Pattern length = number of syllable slots across dry+wet calls.
 */
export function noteContour(keyId: string, seed: number, slots: number): number[] {
  const degrees = scaleDegrees(keyId);
  // Classic club hook contour: up – stay – down – lift
  const pattern = [0, 2, 1, 3, 2, 4, 3, 1, 0, 2, 4, 3];
  const out: number[] = [];
  let x = seed || 1;
  for (let i = 0; i < slots; i++) {
    x = (x * 1103515245 + 12345) >>> 0;
    const idx = pattern[i % pattern.length] % degrees.length;
    // micro neighbor ±1 rare
    const nudge = x % 17 === 0 ? (x % 2 === 0 ? 1 : -1) : 0;
    const di = Math.max(0, Math.min(degrees.length - 1, idx + nudge));
    out.push(degrees[di]);
  }
  return out;
}

export type RemakePlan = {
  dry: string[];
  wet: string[];
  dryVoice: string;
  wetVoice: string;
  notes: number[];
  bank: string;
  note:
    string;
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
  const seed = digest(`remake|${opts.seedKey}|${bank}|${opts.keyId}`);
  const dry = pickDifferent(pool.dry, opts.avoidDry || [], seed, 2);
  const wet = pickDifferent(
    pool.wet,
    opts.avoidWet || [],
    seed ^ 0x5f3759df,
    2
  );
  const dryVoice = NEIGHBOR_VOICE[opts.voice] || opts.voice;
  // wet: slightly different again from dry neighbor
  const wetBase = opts.wetVoice || opts.voice;
  const wetVoice =
    NEIGHBOR_VOICE[dryVoice] === wetBase
      ? dryVoice
      : NEIGHBOR_VOICE[wetBase] || dryVoice;

  const slots = [...dry, ...wet].join(" ").split(/\s+/).length;
  const notes = noteContour(opts.keyId, seed, Math.max(8, slots));

  return {
    dry,
    wet,
    dryVoice,
    wetVoice,
    notes,
    bank,
    note: `Remake · parole nuove · stesso mood (${bank}) · stesso schema note (${opts.keyId}) · voce leggermente diversa.`,
  };
}
