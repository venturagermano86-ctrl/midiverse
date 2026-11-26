/** Musical keys for Vocal Studio — root + mode → TTS pitch nudge. */

export type MusicalKey = {
  id: string;
  label: string;
  /** Semitones from A (concert) for relative pitch nudge */
  rootSemitone: number;
  mode: "minor" | "major";
};

export const KEYS: MusicalKey[] = [
  { id: "Am", label: "Am", rootSemitone: 0, mode: "minor" },
  { id: "Bm", label: "Bm", rootSemitone: 2, mode: "minor" },
  { id: "Cm", label: "Cm", rootSemitone: 3, mode: "minor" },
  { id: "C#m", label: "C♯m", rootSemitone: 4, mode: "minor" },
  { id: "Dm", label: "Dm", rootSemitone: 5, mode: "minor" },
  { id: "Em", label: "Em", rootSemitone: 7, mode: "minor" },
  { id: "Fm", label: "Fm", rootSemitone: 8, mode: "minor" },
  { id: "F#m", label: "F♯m", rootSemitone: 9, mode: "minor" },
  { id: "Gm", label: "Gm", rootSemitone: 10, mode: "minor" },
  { id: "Bbm", label: "B♭m", rootSemitone: 1, mode: "minor" },
  { id: "C", label: "C", rootSemitone: 3, mode: "major" },
  { id: "D", label: "D", rootSemitone: 5, mode: "major" },
  { id: "Eb", label: "E♭", rootSemitone: 6, mode: "major" },
  { id: "F", label: "F", rootSemitone: 8, mode: "major" },
  { id: "G", label: "G", rootSemitone: 10, mode: "major" },
  { id: "A", label: "A", rootSemitone: 0, mode: "major" },
  { id: "Bb", label: "B♭", rootSemitone: 1, mode: "major" },
];

export const BPM_PRESETS = [118, 120, 122, 124, 126, 128, 130, 132] as const;

/** Rough speech pitch nudge from key (edge-tts uses Hz). Centered on Am. */
export function pitchNudgeForKey(keyId: string): { pitchHz: number; rateNudge: number } {
  const key = KEYS.find((k) => k.id === keyId) || KEYS[0];
  // ±1 semitone ≈ ±4 Hz on spoken TTS — keep subtle
  const pitchHz = Math.round((key.rootSemitone - 0) * 1.5) + (key.mode === "minor" ? -2 : 1);
  const rateNudge = key.mode === "minor" ? -2 : 0;
  return { pitchHz, rateNudge };
}

export function clampBpm(n: number): number {
  if (!Number.isFinite(n)) return 124;
  return Math.min(150, Math.max(90, Math.round(n)));
}
