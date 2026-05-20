"""
Separazione stem dalla Source Reference (Demucs opzionale, fallback HPSS+bande).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf

logger = logging.getLogger(__name__)

STEM_NAMES = ("drums", "bass", "other", "vocals")


@dataclass
class StemBundle:
    """Stem mono allineati alla stessa lunghezza e sample rate."""

    sr: int
    stems: dict[str, np.ndarray]
    source: str = "internal"

    @property
    def length(self) -> int:
        return len(next(iter(self.stems.values())))

    def mix(self) -> np.ndarray:
        return sum(self.stems.values())

    def save_dir(self, directory: Path) -> None:
        directory.mkdir(parents=True, exist_ok=True)
        for name, audio in self.stems.items():
            sf.write(str(directory / f"{name}.wav"), audio, self.sr, subtype="PCM_16")


def _normalize_stems(stems: dict[str, np.ndarray], target_len: int) -> dict[str, np.ndarray]:
    out: dict[str, np.ndarray] = {}
    for name in STEM_NAMES:
        y = stems.get(name, np.zeros(target_len, dtype=np.float32))
        if len(y) > target_len:
            y = y[:target_len]
        elif len(y) < target_len:
            y = np.pad(y, (0, target_len - len(y)))
        out[name] = y.astype(np.float32)
    return out


def separate_hpss_fallback(y_mono: np.ndarray, sr: int) -> dict[str, np.ndarray]:
    """4 stem euristici senza rete neurale."""
    n = len(y_mono)
    harmonic, percussive = librosa.effects.hpss(y_mono, margin=3.0)

    # Basso: componente armonica < 220 Hz
    sos = librosa.filters.butter(4, 220, btype="low", fs=sr, output="sos")
    bass = librosa.sosfilt(sos, harmonic).astype(np.float32)

    # Voce: banda 180–4000 Hz dell'armonica, modulazione di ampiezza
    band = librosa.filters.butter(4, [180, 4000], btype="band", fs=sr, output="sos")
    vocal_band = librosa.sosfilt(band, harmonic)
    rms = librosa.feature.rms(y=vocal_band, frame_length=2048, hop_length=512)[0]
    rms_t = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=512)
    t = np.arange(n) / sr
    env = np.interp(t, rms_t, rms / (np.max(rms) + 1e-8))
    vocals = (vocal_band * (0.5 + 0.5 * env)).astype(np.float32)

    residual_h = harmonic - bass - vocals * 0.6
    other = np.clip(residual_h, -1, 1).astype(np.float32)
    drums = percussive.astype(np.float32)

    # Bilanciamento energetico per evitare doppioni
    mix = bass + other + drums + vocals
    scale = np.max(np.abs(y_mono)) / (np.max(np.abs(mix)) + 1e-8)
    return {
        "drums": drums * scale,
        "bass": bass * scale,
        "other": other * scale,
        "vocals": vocals * scale * 0.85,
    }


def separate_demucs(wav_path: Path, device: str = "cpu") -> dict[str, np.ndarray] | None:
    try:
        import torch
        from demucs.pretrained import get_model
        from demucs.apply import apply_model
    except ImportError:
        return None

    y, sr = librosa.load(str(wav_path), sr=None, mono=False)
    if y.ndim == 1:
        y = np.stack([y, y])
    wav = torch.from_numpy(y).float().unsqueeze(0)
    model = get_model("htdemucs")
    model.eval()
    dev = torch.device(device if device != "cpu" and torch.cuda.is_available() else "cpu")
    model.to(dev)
    wav = wav.to(dev)
    with torch.no_grad():
        sources = apply_model(model, wav, device=dev)[0]
    names = model.sources
    stems: dict[str, np.ndarray] = {}
    for i, name in enumerate(names):
        mono = sources[i].mean(dim=0).cpu().numpy()
        if sr != 44100:
            mono = librosa.resample(mono, orig_sr=sr, target_sr=44100)
        stems[name] = mono.astype(np.float32)
    return stems


def load_stems_from_dir(stem_dir: Path, sr: int) -> StemBundle | None:
    """Carica stem pre-esportati (drums.wav, bass.wav, …)."""
    stems: dict[str, np.ndarray] = {}
    for name in STEM_NAMES:
        path = stem_dir / f"{name}.wav"
        if not path.is_file():
            return None
        y, file_sr = librosa.load(str(path), sr=sr, mono=True)
        stems[name] = y.astype(np.float32)
    length = max(len(s) for s in stems.values())
    return StemBundle(sr=sr, stems=_normalize_stems(stems, length), source=str(stem_dir))


def separate_stems(
    y_mono: np.ndarray,
    sr: int,
    *,
    stem_dir: Path | None = None,
    work_wav: Path | None = None,
    demucs_device: str = "cpu",
) -> StemBundle:
    """
    Ottiene StemBundle da directory esistente, Demucs, o fallback HPSS.
    """
    target_len = len(y_mono)

    if stem_dir is not None:
        loaded = load_stems_from_dir(stem_dir, sr)
        if loaded is not None:
            loaded.stems = _normalize_stems(loaded.stems, target_len)
            return loaded

    if work_wav is not None:
        demucs_stems = separate_demucs(work_wav, device=demucs_device)
        if demucs_stems is not None:
            # Demucs usa drums, bass, other, vocals
            normalized = _normalize_stems(
                {k: demucs_stems.get(k, np.zeros(target_len)) for k in STEM_NAMES},
                target_len,
            )
            return StemBundle(sr=sr, stems=normalized, source="demucs")

    hpss = separate_hpss_fallback(y_mono, sr)
    return StemBundle(sr=sr, stems=_normalize_stems(hpss, target_len), source="hpss")
