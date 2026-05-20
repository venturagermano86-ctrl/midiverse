"""
Costruisce segnali di conditioning dalla Source Reference e dal StructuralLock.
Usati dagli engine timbrici (DSP e AudioLDM-2) — nessuna generazione casuale.
"""

from __future__ import annotations

from dataclasses import dataclass

import librosa
import numpy as np

from midiverse.analysis import AudioTemplate, HarmonicEvent, Section, StructuralLock


@dataclass
class TimbreConditioning:
    """Bundle di conditioning per la fase di variazione timbrica."""

    lock: AudioTemplate | StructuralLock
    chroma_envelope: np.ndarray
    beat_envelope: np.ndarray
    section_gains: np.ndarray
    timbre_prompt: str
    harmony_timeline: list[HarmonicEvent]
    sections: list[Section]


def _beat_synchronous_envelope(
    length: int,
    sr: int,
    beat_times: list[float],
    bpm: float,
    depth: float,
) -> np.ndarray:
    """Inviluppo ritmico legato al BPM (per modulazioni timbriche, non per spostare onset)."""
    t = np.arange(length) / sr
    env = np.ones(length, dtype=np.float32)
    if beat_times:
        for bt in beat_times:
            idx = int(bt * sr)
            if 0 <= idx < length:
                tail = min(length - idx, int(0.15 * sr))
                if tail > 0:
                    ramp = np.linspace(0.85, 1.0, tail, dtype=np.float32)
                    env[idx : idx + tail] *= ramp
    else:
        period = 60.0 / bpm
        phase = (t % period) / period
        env = (1.0 - depth * np.exp(-phase * 12.0)).astype(np.float32)
    return env


def _section_gain_curve(length: int, sr: int, sections: list[Section]) -> np.ndarray:
    gains = np.ones(length, dtype=np.float32)
    for i, sec in enumerate(sections):
        s0 = int(sec.start * sr)
        s1 = int(sec.end * sr)
        # Profilo timbrico leggermente diverso per sezione (indice normalizzato)
        profile = 0.92 + 0.08 * (i / max(len(sections) - 1, 1))
        gains[s0:s1] = profile
    return gains


def build_timbre_prompt(lock: AudioTemplate | StructuralLock, style: str) -> str:
    """Prompt testuale per AudioLDM-2: solo timbro, non nuova composizione."""
    section_hint = ", ".join(f"{s.label}@{s.start:.0f}s" for s in lock.sections[:6])
    chords = [h.chord for h in lock.harmony if h.chord != "N"]
    unique = []
    for c in chords:
        if not unique or unique[-1] != c:
            unique.append(c)
    prog = " ".join(unique[:8]) if unique else "tonal"
    ts = getattr(lock, "time_signature", (4, 4))
    return (
        f"Same musical structure and tempo at {lock.bpm:.0f} BPM, "
        f"time signature {ts[0]}/{ts[1]}, sections {section_hint}, "
        f"harmonic progression {prog}, "
        f"{style} timbral color only, no new melody, instrumental"
    )


def build_conditioning(
    y: np.ndarray,
    sr: int,
    lock: AudioTemplate | StructuralLock,
    style: str = "warm analog synthesizer",
    beat_mod_depth: float = 0.12,
) -> TimbreConditioning:
    hop = 512
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=hop)
    chroma_sync = librosa.util.fix_length(
        librosa.util.normalize(chroma, axis=0), size=int(np.ceil(len(y) / hop)), axis=1
    )
    chroma_env = np.mean(chroma_sync, axis=0).astype(np.float32)

    beat_env = _beat_synchronous_envelope(
        len(y), sr, lock.beat_times, lock.bpm, beat_mod_depth
    )
    section_gains = _section_gain_curve(len(y), sr, lock.sections)

    return TimbreConditioning(
        lock=lock,
        chroma_envelope=chroma_env,
        beat_envelope=beat_env,
        section_gains=section_gains,
        timbre_prompt=build_timbre_prompt(lock, style),
        harmony_timeline=lock.harmony,
        sections=lock.sections,
    )
