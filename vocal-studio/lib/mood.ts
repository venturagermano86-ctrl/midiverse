import { createHash } from "crypto";

export type MoodAnalysis = {
  packId: string;
  bank: string;
  label: string;
  voice: string;
  wetVoice: string;
  rate: number;
  pitchHz: number;
  dsp: string;
  bpm: number;
  dry: string[];
  wet: string[];
  sourceTitle?: string;
  sourceAuthor?: string;
  sourceUrl?: string;
  sourceMode: "meta" | "audio";
  note: string;
};

type Pack = {
  id: string;
  label: string;
  tags: string[];
  voice: string;
  wetVoice: string;
  rate: number;
  pitchHz: number;
  dsp: string;
  bpm: number;
  dry: string[];
  wet: string[];
};

const PACKS: Pack[] = [
  {
    id: "celestial-jenny",
    label: "Celestial airy · Jenny",
    tags: ["celestial", "airy", "ambient", "villalobos", "soft", "float", "glow", "dream", "ethereal", "whisper", "space", "minimal"],
    voice: "jenny",
    wetVoice: "aria",
    rate: -28,
    pitchHz: 3,
    dsp: "airy",
    bpm: 120,
    dry: ["sooooft throuuugh the niiight", "keeep the liiight clooose", "spiiin it sllooow"],
    wet: ["staaay in the gloooow", "faaall into meeee", "ooopen the gaaate"],
  },
  {
    id: "celestial-aria",
    label: "Celestial lift · Aria",
    tags: ["celestial", "voice", "resurrection", "easy lee", "hypnotic", "lee"],
    voice: "aria",
    wetVoice: "jenny",
    rate: -26,
    pitchHz: 6,
    dsp: "airy",
    bpm: 121,
    dry: ["hooold the liiight", "sliiide into quiiiet", "breeeathe with meeee"],
    wet: ["dooown in the gloooow", "caaall me soooftly", "waaait for the waaave"],
  },
  {
    id: "soul-sonia",
    label: "Soul deep · Sonia",
    tags: ["soul", "nina", "gospel", "deep house", "blues", "heart", "ballad", "motown"],
    voice: "sonia",
    wetVoice: "michelle",
    rate: -30,
    pitchHz: -8,
    dsp: "chest",
    bpm: 112,
    dry: ["hooold me cloooser", "caaarry me hooome", "dooon't you leeeave"],
    wet: ["throoough the niiight", "I neeeed you sooo", "hooold me stiiill"],
  },
  {
    id: "club-aria",
    label: "Club hook · Aria",
    tags: ["tech house", "club", "peak", "groove", "bassline", "festival", "house", "mix"],
    voice: "aria",
    wetVoice: "emma",
    rate: -12,
    pitchHz: 2,
    dsp: "punch",
    bpm: 125,
    dry: ["hold the mark", "spin the gate", "feel the bass"],
    wet: ["don't let go", "open it wide", "keep it rolling"],
  },
  {
    id: "cold-guy",
    label: "Cold techno · Guy",
    tags: ["techno", "industrial", "berghain", "cold", "acid", "warehouse", "detroit"],
    voice: "guy",
    wetVoice: "brian",
    rate: -8,
    pitchHz: -3,
    dsp: "cold",
    bpm: 132,
    dry: ["into the machine", "hold the line", "no way back"],
    wet: ["run the circuit", "find the signal", "out of time"],
  },
  {
    id: "warm-aria",
    label: "Warm afro · Aria",
    tags: ["afro", "disco", "nu-disco", "sunshine", "tropical", "organic", "latin", "balearic"],
    voice: "aria",
    wetVoice: "natasha",
    rate: -16,
    pitchHz: 4,
    dsp: "warm",
    bpm: 122,
    dry: ["under the suuun", "mooove with the druum", "looove on the flooor"],
    wet: ["daaance until daaawn", "fiiire in the niiight", "feeel alriiight"],
  },
];

function digestInt(s: string): number {
  const h = createHash("sha256").update(s).digest();
  return h.readUInt32BE(0);
}

function pick<T>(arr: T[], seed: number, n: number): T[] {
  const copy = [...arr];
  let x = seed || 1;
  const out: T[] = [];
  for (let i = 0; i < Math.min(n, copy.length); i++) {
    x = (x * 1664525 + 1013904223) >>> 0;
    const j = x % copy.length;
    out.push(copy.splice(j, 1)[0]);
  }
  return out;
}

function scorePack(pack: Pack, blob: string): number {
  let score = 0;
  for (const t of pack.tags) {
    if (blob.includes(t)) score += 3 + (t.length > 7 ? 2 : 0);
  }
  return score;
}

export function analyzeFromMeta(opts: {
  title?: string;
  author?: string;
  url?: string;
  bpmHint?: number;
}): MoodAnalysis {
  const title = opts.title || "";
  const author = opts.author || "";
  const url = opts.url || "";
  const blob = `${title} ${author}`
    .toLowerCase()
    .replace(/\b(official|video|audio|hq|hd|full|track)\b/g, " ");

  const scored = PACKS.map((p, i) => ({ p, i, s: scorePack(p, blob) })).sort(
    (a, b) => b.s - a.s || a.i - b.i
  );
  const top = scored[0].s;
  const candidates =
    top > 0 ? scored.filter((x) => x.s >= Math.max(1, top - 2)).map((x) => x.p) : PACKS;

  const seed = digestInt(`${url}|${title}|${author}|pack`);
  const pack = candidates[seed % candidates.length];
  const phrSeed = digestInt(`${url}|${title}|phr|${pack.id}`);
  const dry = pick(pack.dry, phrSeed, 2);
  const wet = pick(pack.wet, phrSeed ^ 0x9e3779b9, 2);
  const rate = pack.rate + ((phrSeed >> 3) % 7) - 3;
  const pitchHz = pack.pitchHz + ((phrSeed >> 7) % 7) - 3;
  const bpm = opts.bpmHint ?? pack.bpm + (((phrSeed >> 11) % 5) - 2);

  return {
    packId: pack.id,
    bank: pack.id.split("-")[0],
    label: pack.label,
    voice: pack.voice,
    wetVoice: pack.wetVoice,
    rate,
    pitchHz,
    dsp: pack.dsp,
    bpm,
    dry,
    wet,
    sourceTitle: title,
    sourceAuthor: author,
    sourceUrl: url,
    sourceMode: "meta",
    note: `Voce: ${pack.voice} + ${pack.wetVoice} · pack ${pack.id}. Mood dal link — frasi originali.`,
  };
}
