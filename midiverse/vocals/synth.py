"""Sintesi cantata formantica — voci dry musicali (no delay in-process)."""

from __future__ import annotations

import re
from dataclasses import dataclass

import numpy as np
from scipy.signal import butter, sosfilt

from midiverse.vocals.singers import Singer

# Formanti approssimate (F1, F2, F3) Hz per vocale
VOWEL_FORMANTS: dict[str, tuple[float, float, float]] = {
    "a": (800.0, 1200.0, 2600.0),
    "e": (500.0, 1800.0, 2500.0),
    "i": (300.0, 2300.0, 3000.0),
    "o": (500.0, 900.0, 2400.0),
    "u": (350.0, 700.0, 2200.0),
    "ə": (500.0, 1500.0, 2500.0),
}

# Mappa lettere grezze → vocale dominante
LETTER_VOWEL = {
    "a": "a",
    "e": "e",
    "i": "i",
    "o": "o",
    "u": "u",
    "y": "i",
}


@dataclass
class NoteEvent:
    f0: float
    dur: float
    vowel: str
    accent: float = 1.0


def _midi_to_hz(midi: float) -> float:
    return 440.0 * (2.0 ** ((midi - 69.0) / 12.0))


def _phrase_to_scale_degrees(n: int) -> list[int]:
    """Motivo house semplice (minore naturale relative): 0 2 3 5 7 8 10."""
    scale = [0, 2, 3, 5, 7, 8, 10, 12]
    out = []
    for i in range(n):
        out.append(scale[i % len(scale)] + 12 * (i // len(scale)))
    return out


def text_to_events(text: str, singer: Singer, bpm: float) -> list[NoteEvent]:
    """Ogni sillaba ~ 1/8 o 1/4 a tempo house."""
    words = [w for w in re.findall(r"[a-zA-Z']+", text.lower()) if w]
    syllables: list[str] = []
    for w in words:
        # Split grezzo: vocale = nucleo sillaba
        parts = re.findall(r"[^aeiouy]*[aeiouy]+[^aeiouy]*", w) or [w]
        syllables.extend(parts)

    if not syllables:
        syllables = ["ah", "oh"]

    beat = 60.0 / bpm
    # Call-response house: spesso 1/8 note
    step = beat * 0.5
    root_midi = 69 + 12 * np.log2(singer.f0_center / 440.0)
    degrees = _phrase_to_scale_degrees(len(syllables))

    events: list[NoteEvent] = []
    for i, syl in enumerate(syllables):
        vowel = "ə"
        for ch in syl:
            if ch in LETTER_VOWEL:
                vowel = LETTER_VOWEL[ch]
                break
        midi = root_midi + degrees[i]
        # Ultima sillaba un filo più lunga
        dur = step * (1.35 if i == len(syllables) - 1 else 1.0)
        accent = 1.15 if i % 2 == 0 else 0.92
        events.append(NoteEvent(f0=_midi_to_hz(midi), dur=dur, vowel=vowel, accent=accent))
    return events


def _buzz(f0: np.ndarray, sr: int) -> np.ndarray:
    """Segnale glottale a dente di sega con F0 variabile."""
    phase = np.cumsum(f0 / sr, dtype=np.float64)
    phase = phase - np.floor(phase)
    # Saw + soft pulse
    saw = 2.0 * phase - 1.0
    pulse = np.sign(np.sin(2 * np.pi * phase) + 0.35)
    return (0.7 * saw + 0.3 * pulse).astype(np.float32)


def _formant_filter(x: np.ndarray, sr: int, f1: float, f2: float, f3: float, bright: float) -> np.ndarray:
    y = x.astype(np.float64)
    out = np.zeros_like(y)
    for f, qgain in ((f1 * bright, 1.0), (f2 * bright, 0.7), (f3 * bright, 0.4)):
        f = float(np.clip(f, 80.0, sr * 0.45))
        # Banda stretta attorno al formante
        low = max(40.0, f * 0.85)
        high = min(sr * 0.49, f * 1.15)
        if high <= low:
            continue
        sos = butter(2, [low, high], btype="band", fs=sr, output="sos")
        out += qgain * sosfilt(sos, y)
    # Mix dry buzz basso
    return (0.25 * y + 0.75 * out).astype(np.float32)


def _adsr(n: int, sr: int, accent: float) -> np.ndarray:
    a = max(1, int(0.012 * sr))
    d = max(1, int(0.04 * sr))
    r = max(1, int(0.05 * sr))
    s_level = 0.72 * accent
    sustain_n = max(0, n - a - d - r)
    env = np.concatenate(
        [
            np.linspace(0.0, 1.0 * accent, a, endpoint=False),
            np.linspace(1.0 * accent, s_level, d, endpoint=False),
            np.full(sustain_n, s_level),
            np.linspace(s_level, 0.0, r, endpoint=True),
        ]
    )
    if len(env) < n:
        env = np.pad(env, (0, n - len(env)))
    return env[:n].astype(np.float32)


def render_phrase(
    text: str,
    singer: Singer,
    *,
    bpm: float = 124.0,
    sr: int = 44100,
    gap_beats: float = 0.25,
) -> np.ndarray:
    """Rende una frase cantata mono dry."""
    events = text_to_events(text, singer, bpm)
    gap = int((60.0 / bpm) * gap_beats * sr)
    chunks: list[np.ndarray] = []
    rng = np.random.default_rng(abs(hash((singer.id, text))) % (2**32))

    t_global = 0
    for ev in events:
        n = max(1, int(ev.dur * sr))
        t = (np.arange(n) + t_global) / sr
        # Vibrato
        vib = 1.0 + (singer.vibrato_cents / 1200.0) * np.sin(
            2 * np.pi * singer.vibrato_hz * t
        )
        f0 = np.full(n, ev.f0, dtype=np.float64) * vib
        buzz = _buzz(f0, sr)
        f1, f2, f3 = VOWEL_FORMANTS.get(ev.vowel, VOWEL_FORMANTS["ə"])
        voiced = _formant_filter(buzz, sr, f1, f2, f3, singer.brightness)
        env = _adsr(n, sr, ev.accent)
        breath = singer.breath * rng.normal(0, 1, n).astype(np.float32)
        # Highpass breath
        sos_hp = butter(1, 1500, btype="high", fs=sr, output="sos")
        breath = sosfilt(sos_hp, breath).astype(np.float32) * env
        note = (voiced * env + breath) * singer.gain
        chunks.append(note.astype(np.float32))
        if gap > 0:
            chunks.append(np.zeros(gap, dtype=np.float32))
        t_global += n + gap

    if not chunks:
        return np.zeros(sr, dtype=np.float32)

    audio = np.concatenate(chunks)
    # Soft limiter
    peak = float(np.max(np.abs(audio)) + 1e-9)
    audio = audio / peak * 0.89
    # Coda silenzio
    audio = np.concatenate([audio, np.zeros(int(0.15 * sr), dtype=np.float32)])
    return audio.astype(np.float32)
