"""
Audio Morphing Strutturale — feature mapping per stem.

Neural Style Transfer spettrale + variazione timbrica/strumentale:
mantiene onset envelope, beat grid e phrasing della reference.
"""

from __future__ import annotations

from dataclasses import dataclass

import librosa
import numpy as np
from scipy import signal

from midiverse.analysis import AudioTemplate
from midiverse.conditioning import TimbreConditioning

N_FFT = 2048
HOP = 512


@dataclass
class MorphControls:
    """Controllo variazione: timbro/strumenti sì; quantizzazione/phrasing no."""

    intensity: float = 0.7
    drum_texture: str = "punchy_electronic"
    bass_instrument: str = "analog_synth_bass"
    other_instrument: str = "bright_synth_lead"
    vocal_preserve: float = 0.35  # max morph su voce


_STEM_PROFILES: dict[str, dict[str, float]] = {
    "drums": {"drive": 1.4, "hf": 0.35, "transient": 0.55, "noise_mix": 0.18},
    "bass": {"drive": 1.25, "low": 0.4, "mid": -0.1, "detune_cents": 0.0},
    "other": {"drive": 1.15, "low": 0.05, "hf": 0.25, "detune_cents": 0.0},
    "vocals": {"drive": 1.05, "low": 0.0, "hf": 0.08, "detune_cents": 0.0},
}


def _onset_envelope(y: np.ndarray, sr: int) -> np.ndarray:
    """Inviluppo degli attacchi — vincolo di quantizzazione/phrasing."""
    onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=HOP)
    times = librosa.frames_to_time(np.arange(len(onset_env)), sr=sr, hop_length=HOP)
    t = np.arange(len(y)) / sr
    env = np.interp(t, times, onset_env)
    env = env / (np.max(env) + 1e-8)
    return env.astype(np.float32)


def _beat_quantization_mask(
    y: np.ndarray,
    sr: int,
    template: AudioTemplate,
) -> np.ndarray:
    """Maschera che enfatizza i beat della griglia (phrasing invariato)."""
    n = len(y)
    mask = np.zeros(n, dtype=np.float32)
    for bt in template.beat_times:
        idx = int(bt * sr)
        w = int(0.04 * sr)
        s0 = max(0, idx - w)
        s1 = min(n, idx + w)
        mask[s0:s1] = 1.0
    if np.max(mask) < 1e-6:
        return np.ones(n, dtype=np.float32)
    mask = signal.medfilt(mask, kernel_size=max(3, int(0.01 * sr) | 1))
    return mask / (np.max(mask) + 1e-8)


def _spectral_nst(
    y: np.ndarray,
    sr: int,
    onset_env: np.ndarray,
    beat_mask: np.ndarray,
    profile: dict[str, float],
    intensity: float,
) -> np.ndarray:
    """NST spettrale: fase e timing originali, magnitudine timbricamente trasformata."""
    intensity = float(np.clip(intensity, 0.0, 1.0))
    stft = librosa.stft(y, n_fft=N_FFT, hop_length=HOP)
    mag, phase = np.abs(stft), np.angle(stft)

    # Timbre target: tilt EQ + saturazione sulla magnitudine
    freqs = librosa.fft_frequencies(sr=sr, n_fft=N_FFT)
    tilt = np.ones_like(freqs)
    tilt[freqs < 250] *= 1.0 + profile.get("low", 0) * intensity
    tilt[(freqs >= 250) & (freqs < 4000)] *= 1.0 + profile.get("mid", 0) * intensity
    tilt[freqs >= 4000] *= 1.0 + profile.get("hf", 0) * intensity
    target_mag = np.tanh(mag * profile.get("drive", 1.2)) * tilt[:, None]

    # Maschera onset per transitori (quantizzazione invariata)
    n_frames = mag.shape[1]
    t_frames = librosa.frames_to_time(np.arange(n_frames), sr=sr, hop_length=HOP)
    onset_frames = np.interp(t_frames, np.linspace(0, len(y) / sr, len(onset_env)), onset_env)
    beat_frames = np.interp(
        t_frames,
        np.linspace(0, len(y) / sr, len(beat_mask)),
        beat_mask,
    )
    lock = np.clip(0.65 * onset_frames + 0.35 * beat_frames, 0, 1)

    out_mag = (1.0 - intensity) * mag + intensity * (
        lock * mag + (1.0 - lock) * target_mag
    )
    out_stft = out_mag * np.exp(1j * phase)
    return librosa.istft(out_stft, hop_length=HOP, length=len(y))


def _morph_drums(
    y: np.ndarray,
    sr: int,
    onset_env: np.ndarray,
    profile: dict[str, float],
    intensity: float,
) -> np.ndarray:
    """Texture batteria: rumore filtrato modellato dagli onset originali."""
    intensity = float(np.clip(intensity, 0.0, 1.0))
    colored = _spectral_nst(y, sr, onset_env, onset_env, profile, intensity)

    noise = np.random.default_rng(42).standard_normal(len(y)).astype(np.float32)
    noise = librosa.effects.preemphasis(noise, coef=0.97)
    sos = signal.butter(2, [2000 / (sr / 2), 8000 / (sr / 2)], btype="band", output="sos")
    noise = signal.sosfilt(sos, noise)
    noise *= onset_env * profile.get("noise_mix", 0.15) * intensity

    out = colored * (1.0 - profile.get("transient", 0.5) * intensity)
    out += y * profile.get("transient", 0.5) * intensity
    out += noise
    return np.clip(out, -1, 1).astype(np.float32)


def _morph_bass(
    y: np.ndarray,
    sr: int,
    onset_env: np.ndarray,
    beat_mask: np.ndarray,
    profile: dict[str, float],
    intensity: float,
) -> np.ndarray:
    """Sostituzione timbrica basso/synth bass — pitch invariato (0 cents)."""
    morphed = _spectral_nst(y, sr, onset_env, beat_mask, profile, intensity)
    sos = signal.butter(2, 180 / (sr / 2), btype="low", output="sos")
    low = signal.sosfilt(sos, morphed)
    return (0.7 * morphed + 0.3 * low).astype(np.float32)


def _morph_other(
    y: np.ndarray,
    sr: int,
    onset_env: np.ndarray,
    beat_mask: np.ndarray,
    profile: dict[str, float],
    intensity: float,
) -> np.ndarray:
    """Lead/pad/synth: NST con più contenuto HF."""
    return _spectral_nst(y, sr, onset_env, beat_mask, profile, intensity)


def morph_stem(
    stem_name: str,
    y: np.ndarray,
    sr: int,
    template: AudioTemplate,
    conditioning: TimbreConditioning,
    controls: MorphControls,
) -> np.ndarray:
    """Applica morphing strutturale a un singolo stem."""
    onset_env = _onset_envelope(y, sr)
    beat_mask = _beat_quantization_mask(y, sr, template)
    profile = dict(_STEM_PROFILES.get(stem_name, _STEM_PROFILES["other"]))

    if stem_name == "drums":
        eff = controls.intensity
        return _morph_drums(y, sr, onset_env, profile, eff)
    if stem_name == "bass":
        return _morph_bass(y, sr, onset_env, beat_mask, profile, controls.intensity)
    if stem_name == "vocals":
        eff = controls.intensity * float(np.clip(controls.vocal_preserve, 0, 1))
        return _spectral_nst(y, sr, onset_env, beat_mask, profile, eff)
    return _morph_other(y, sr, onset_env, beat_mask, profile, controls.intensity)


def morph_all_stems(
    stems: dict[str, np.ndarray],
    sr: int,
    template: AudioTemplate,
    conditioning: TimbreConditioning,
    controls: MorphControls,
) -> dict[str, np.ndarray]:
    return {
        name: morph_stem(name, audio, sr, template, conditioning, controls)
        for name, audio in stems.items()
    }


def mix_stems_to_stereo(stems: dict[str, np.ndarray]) -> np.ndarray:
    mono = sum(stems.values())
    peak = np.max(np.abs(mono))
    if peak > 1e-6:
        mono = mono / peak * 0.92
    return np.stack([mono, mono], axis=1).astype(np.float32)
