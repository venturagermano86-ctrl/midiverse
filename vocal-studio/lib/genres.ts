export type VocalVariation = {
  id: string;
  label: string;
  mood: string;
  /** Phrase seeds for TTS mock generation */
  phrases: { dry: string[]; wet: string[] };
  voice: "jenny" | "aria" | "sonia" | "guy";
  rate: number;
  pitchHz: number;
};

export type Genre = {
  id: string;
  label: string;
  blurb: string;
  bpmHint: [number, number];
  variations: VocalVariation[];
};

export const GENRES: Genre[] = [
  {
    id: "deep-house",
    label: "Deep House",
    blurb: "Caldo, notte, call-response soft",
    bpmHint: [118, 124],
    variations: [
      {
        id: "dh-soft",
        label: "Soft call",
        mood: "intimate dry + delayed answer",
        voice: "jenny",
        rate: -22,
        pitchHz: 1,
        phrases: {
          dry: ["hold me closer", "keep it soft now"],
          wet: ["through the night", "let it open"],
        },
      },
      {
        id: "dh-soul",
        label: "Soulful",
        mood: "Nina-leaning warmth",
        voice: "sonia",
        rate: -26,
        pitchHz: -4,
        phrases: {
          dry: ["carry me home", "don't you leave me"],
          wet: ["I need you so", "hold me still"],
        },
      },
    ],
  },
  {
    id: "tech-house",
    label: "Tech House",
    blurb: "Hook corti, groove, energia da club",
    bpmHint: [124, 128],
    variations: [
      {
        id: "th-hook",
        label: "Club hook",
        mood: "short punchy phrases",
        voice: "aria",
        rate: -14,
        pitchHz: 2,
        phrases: {
          dry: ["spin the gate", "hold the mark"],
          wet: ["open it wide", "don't let go"],
        },
      },
      {
        id: "th-chant",
        label: "Chant",
        mood: "rhythmic mantra",
        voice: "guy",
        rate: -12,
        pitchHz: -1,
        phrases: {
          dry: ["move your body", "feel the bass"],
          wet: ["take it higher", "keep it rolling"],
        },
      },
    ],
  },
  {
    id: "minimal",
    label: "Minimal / Villalobos",
    blurb: "Mantra rarefatti, delay lunghi, aria",
    bpmHint: [118, 126],
    variations: [
      {
        id: "min-celestial",
        label: "Celestial",
        mood: "ethereal floating vocal",
        voice: "jenny",
        rate: -24,
        pitchHz: 2,
        phrases: {
          dry: ["soft through the night", "keep the light"],
          wet: ["stay in the glow", "fall into me"],
        },
      },
      {
        id: "min-easy",
        label: "Easy Lee mood",
        mood: "hypnotic stretched syllables",
        voice: "aria",
        rate: -20,
        pitchHz: 1,
        phrases: {
          dry: ["easy and soft", "keep it slow"],
          wet: ["don't push hard", "let it slide"],
        },
      },
    ],
  },
  {
    id: "techno",
    label: "Techno",
    blurb: "Freddo, preciso, poche parole",
    bpmHint: [128, 135],
    variations: [
      {
        id: "tec-cold",
        label: "Cold phrase",
        mood: "dry, distant",
        voice: "guy",
        rate: -10,
        pitchHz: -2,
        phrases: {
          dry: ["into the machine", "no way back"],
          wet: ["run the circuit", "hold the line"],
        },
      },
      {
        id: "tec-melodic",
        label: "Melodic techno",
        mood: "sung pad-friendly",
        voice: "sonia",
        rate: -18,
        pitchHz: 0,
        phrases: {
          dry: ["we are drifting", "out of time"],
          wet: ["find the signal", "bring me home"],
        },
      },
    ],
  },
  {
    id: "afro-house",
    label: "Afro House",
    blurb: "Organico, percussivo, voce presente",
    bpmHint: [118, 124],
    variations: [
      {
        id: "af-sun",
        label: "Sun chant",
        mood: "warm open vowels",
        voice: "aria",
        rate: -16,
        pitchHz: 3,
        phrases: {
          dry: ["under the sun", "move with the drum"],
          wet: ["fire in the night", "dance until dawn"],
        },
      },
    ],
  },
  {
    id: "progressive",
    label: "Progressive",
    blurb: "Linee lunghe, build emotivo",
    bpmHint: [122, 128],
    variations: [
      {
        id: "pg-lift",
        label: "Lift",
        mood: "sung emotional arc",
        voice: "jenny",
        rate: -20,
        pitchHz: 1,
        phrases: {
          dry: ["take me higher", "into the light"],
          wet: ["never looking back", "we rise again"],
        },
      },
    ],
  },
  {
    id: "disco",
    label: "Nu-Disco / Disco",
    blurb: "Fun, funky, hook da radio",
    bpmHint: [110, 120],
    variations: [
      {
        id: "dc-fun",
        label: "Disco hook",
        mood: "bright soul",
        voice: "sonia",
        rate: -12,
        pitchHz: 2,
        phrases: {
          dry: ["get down tonight", "love on the floor"],
          wet: ["don't stop the music", "feel alright"],
        },
      },
    ],
  },
  {
    id: "trance",
    label: "Trance",
    blurb: "Euforico, vocali aperte",
    bpmHint: [132, 140],
    variations: [
      {
        id: "tr-euphoria",
        label: "Euphoria",
        mood: "big open vowels",
        voice: "aria",
        rate: -18,
        pitchHz: 4,
        phrases: {
          dry: ["forever with you", "in this moment"],
          wet: ["we fly away", "into the sky"],
        },
      },
    ],
  },
];

export function getGenre(id: string) {
  return GENRES.find((g) => g.id === id);
}

export function getVariation(genreId: string, variationId: string) {
  const g = getGenre(genreId);
  return g?.variations.find((v) => v.id === variationId);
}
