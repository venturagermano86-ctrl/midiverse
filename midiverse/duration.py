"""
Vincolo di durata: output entro ±2% rispetto alla reference.
"""

from __future__ import annotations

import librosa
import numpy as np

DEFAULT_TOLERANCE = 0.02


def duration_ratio(current_samples: int, target_samples: int) -> float:
    if target_samples <= 0:
        return 1.0
    return current_samples / target_samples


def is_within_tolerance(
    current_samples: int,
    target_samples: int,
    tolerance: float = DEFAULT_TOLERANCE,
) -> bool:
    ratio = duration_ratio(current_samples, target_samples)
    return (1.0 - tolerance) <= ratio <= (1.0 + tolerance)


def fit_to_exact_length(y: np.ndarray, target_samples: int) -> np.ndarray:
    """Taglia o pad con silenzio per raggiungere la lunghezza esatta."""
    n = len(y)
    if n == target_samples:
        return y
    if n > target_samples:
        return y[:target_samples]
    if y.ndim == 1:
        pad = np.zeros(target_samples - n, dtype=y.dtype)
        return np.concatenate([y, pad])
    pad = np.zeros((target_samples - n, y.shape[1]), dtype=y.dtype)
    return np.vstack([y, pad])


def enforce_duration(
    y: np.ndarray,
    sr: int,
    target_samples: int,
    tolerance: float = DEFAULT_TOLERANCE,
) -> tuple[np.ndarray, dict]:
    """
    Porta il segnale entro ±tolerance della durata target, poi allinea al sample esatto.

    Usa time-stretch leggero solo se necessario (max ±2%).
    """
    n = len(y)
    meta: dict = {
        "input_samples": n,
        "target_samples": target_samples,
        "tolerance": tolerance,
        "time_stretch_rate": 1.0,
        "method": "none",
    }

    if target_samples <= 0:
        return y, meta

    if is_within_tolerance(n, target_samples, tolerance) and n != target_samples:
        out = fit_to_exact_length(y, target_samples)
        meta["method"] = "trim_pad"
        meta["output_samples"] = len(out)
        meta["duration_ratio"] = duration_ratio(len(out), target_samples)
        return out, meta

    if n == target_samples:
        meta["output_samples"] = n
        meta["duration_ratio"] = 1.0
        return y, meta

    rate = target_samples / n
    rate = float(np.clip(rate, 1.0 - tolerance, 1.0 + tolerance))
    meta["time_stretch_rate"] = rate
    meta["method"] = "time_stretch"

    if y.ndim == 1:
        stretched = librosa.effects.time_stretch(y.astype(np.float32), rate=1.0 / rate)
    else:
        channels = [
            librosa.effects.time_stretch(y[:, c].astype(np.float32), rate=1.0 / rate)
            for c in range(y.shape[1])
        ]
        min_len = min(len(c) for c in channels)
        stretched = np.stack([c[:min_len] for c in channels], axis=1)

    out = fit_to_exact_length(stretched, target_samples)
    meta["output_samples"] = len(out)
    meta["duration_ratio"] = duration_ratio(len(out), target_samples)
    return out, meta
