"""
Variazione timbrica structure-preserving (default, senza GPU).

Separa armonia/percussione, modifica solo il contenuto timbrico mantenendo
fase e timing del segnale originale; la progressione cromatica guida l'EQ.
"""

from __future__ import annotations

import librosa
import numpy as np
from scipy import signal

from midiverse.conditioning import TimbreConditioning

_PRESETS: dict[str, dict[str, float]] = {
    "warm_analog": {"drive": 1.25, "low_boost": 0.22, "air": 0.08, "mod_depth": 0.18},
    "bright_digital": {"drive": 1.1, "low_boost": 0.05, "air": 0.28, "mod_depth": 0.12},
    "lofi": {"drive": 1.45, "low_boost": 0.15, "air": -0.12, "mod_depth": 0.25},
    "filter_house": {"drive": 1.2, "low_boost": 0.1, "air": 0.15, "mod_depth": 0.35},
}


def _to_stereo(y: np.ndarray) -> np.ndarray:
    if y.ndim == 1:
        return np.stack([y, y], axis=1)
    return y


def _biquad_sos(y: np.ndarray, sr: int, low: float | None, high: float | None) -> np.ndarray:
    nyq = sr / 2
    out = y.astype(np.float64)
    if low is not None:
        sos = signal.butter(2, low / nyq, btype="low", output="sos")
        out = signal.sosfilt(sos, out)
    if high is not None:
        sos = signal.butter(2, high / nyq, btype="high", output="sos")
        out = signal.sosfilt(sos, out)
    return out


def _chroma_guided_eq(
    harmonic: np.ndarray,
    sr: int,
    conditioning: TimbreConditioning,
    preset: dict[str, float],
) -> np.ndarray:
    """EQ per banda guidato dall'envelope cromatico (non sposta le note)."""
    n = len(harmonic)
    chroma = conditioning.chroma_envelope.astype(np.float64)
    if len(chroma) < 2:
        chroma = np.ones(2, dtype=np.float64)
    x_old = np.linspace(0, 1, len(chroma))
    x_new = np.linspace(0, 1, n)
    chroma_curve = np.interp(x_new, x_old, chroma)

    bands = [
        (80, 250),
        (250, 800),
        (800, 2500),
        (2500, 6000),
        (6000, min(12000, sr // 2 - 100)),
    ]
    out = np.zeros_like(harmonic)
    for bi, (f_lo, f_hi) in enumerate(bands):
        nyq = sr / 2
        if f_hi >= nyq:
            continue
        sos = signal.butter(2, [f_lo / nyq, f_hi / nyq], btype="band", output="sos")
        band = signal.sosfilt(sos, harmonic)
        weight = 1.0 + preset["low_boost"] * (float(np.mean(chroma_curve)) - 0.5)
        band_weight = weight * (0.95 + 0.05 * (bi + 1) / len(bands))
        out += band * band_weight
    return out if np.max(np.abs(out)) > 1e-8 else harmonic


def apply_timbre_dsp(
    y: np.ndarray,
    sr: int,
    conditioning: TimbreConditioning,
    preset_name: str = "warm_analog",
    intensity: float = 0.65,
) -> np.ndarray:
    """
    Applica variazione timbrica mantenendo timing, BPM e armonia.

    intensity: 0 = identico, 1 = massima colorazione timbrica.
    """
    intensity = float(np.clip(intensity, 0.0, 1.0))
    preset = _PRESETS.get(preset_name, _PRESETS["warm_analog"])

    stereo = _to_stereo(y.astype(np.float32))
    left = stereo[:, 0].astype(np.float64)
    right = stereo[:, 1].astype(np.float64)
    mono = (left + right) / 2.0
    dry = stereo.copy()
    n = len(mono)

    def _fit_envelope(env: np.ndarray) -> np.ndarray:
        if len(env) == n:
            return env
        if len(env) < 2:
            return np.ones(n, dtype=np.float32)
        x_old = np.linspace(0, 1, len(env))
        x_new = np.linspace(0, 1, n)
        return np.interp(x_new, x_old, env).astype(np.float32)

    beat_env = _fit_envelope(conditioning.beat_envelope)
    section_env = _fit_envelope(conditioning.section_gains)

    harmonic, percussive = librosa.effects.hpss(mono, margin=2.5)

    # Modulazione filtro legata al beat (solo timbro, stessi onset)
    mod = 1.0 + preset["mod_depth"] * intensity * (beat_env - 1.0)
    mod *= section_env
    harmonic_mod = harmonic * mod

    colored_h = _chroma_guided_eq(harmonic_mod, sr, conditioning, preset)
    drive = 1.0 + (preset["drive"] - 1.0) * intensity
    colored_h = np.tanh(colored_h * drive) / np.tanh(drive)

    # Percussivo: transient shaping, no pitch shift
    perc_drive = 1.0 + 0.2 * intensity
    colored_p = np.tanh(percussive * perc_drive) / np.tanh(perc_drive)
    colored_p = _biquad_sos(colored_p, sr, 40, None)

    wet_mono = colored_h + colored_p
    wet_mono = _biquad_sos(wet_mono, sr, None, 120 + preset["air"] * 4000 * intensity)

    # Mix wet/dry preservando stereo width originale
    wet_stereo = dry.copy()
    wet_stereo[:, 0] = wet_mono
    wet_stereo[:, 1] = wet_mono
    # Mantieni componente side originale
    mid = (dry[:, 0] + dry[:, 1]) / 2
    side = (dry[:, 1] - dry[:, 0]) / 2
    wet_mid = wet_mono
    wet_stereo[:, 0] = wet_mid + side * 0.85
    wet_stereo[:, 1] = wet_mid - side * 0.85

    out = (1.0 - intensity) * dry + intensity * wet_stereo

    peak = np.max(np.abs(out))
    if peak > 1e-6:
        out = out / peak * 0.97
    return out.astype(np.float32)
