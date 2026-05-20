"""
Backend opzionale AudioLDM-2 (Hugging Face Diffusers).

AudioLDM-2 non espone ancora style-transfer audio→audio completo; qui si usa
il prompt timbrico + durata vincolata alla reference, poi si ricombina con
il segnale structure-locked (fase/ritmo dalla reference).
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

import numpy as np

from midiverse.conditioning import TimbreConditioning

logger = logging.getLogger(__name__)

AUDIOLDM2_SR = 16000
MAX_CHUNK_S = 9.5


def is_audioldm2_available() -> bool:
    try:
        import torch  # noqa: F401
        from diffusers import AudioLDM2Pipeline  # noqa: F401

        return True
    except ImportError:
        return False


def _load_pipeline(device: str):
    import torch
    from diffusers import AudioLDM2Pipeline

    dtype = torch.float16 if device != "cpu" and torch.cuda.is_available() else torch.float32
    pipe = AudioLDM2Pipeline.from_pretrained(
        "cvssp/audioldm2",
        torch_dtype=dtype,
    )
    pipe = pipe.to(device)
    if device != "cpu":
        try:
            pipe.enable_model_cpu_offload()
        except Exception:
            pass
    return pipe


def _generate_chunk(
    pipe,
    prompt: str,
    duration_s: float,
    seed: int,
    num_inference_steps: int,
    guidance_scale: float,
) -> np.ndarray:
    import torch

    generator = torch.Generator(device=pipe.device).manual_seed(seed)
    duration_s = float(np.clip(duration_s, 2.0, MAX_CHUNK_S))
    out = pipe(
        prompt,
        num_inference_steps=num_inference_steps,
        audio_length_in_s=duration_s,
        guidance_scale=guidance_scale,
        generator=generator,
    )
    audio = out.audios[0]
    if hasattr(audio, "cpu"):
        audio = audio.cpu().numpy()
    return np.asarray(audio, dtype=np.float32).flatten()


def enhance_with_audioldm2(
    structure_locked: np.ndarray,
    sr: int,
    conditioning: TimbreConditioning,
    *,
    device: str = "cpu",
    seed: int = 42,
    num_inference_steps: int = 50,
    guidance_scale: float = 3.0,
    neural_blend: float = 0.25,
) -> np.ndarray:
    """
    Aggiunge colore timbrico neurale miscelato al segnale già allineato.

    neural_blend basso (0.15–0.35) evita di riscrivere melodia/ritmo.
    """
    if not is_audioldm2_available():
        raise RuntimeError(
            "AudioLDM-2 non disponibile. Installa: pip install torch diffusers transformers accelerate"
        )

    import librosa

    neural_blend = float(np.clip(neural_blend, 0.0, 0.5))
    if neural_blend <= 0:
        return structure_locked

    pipe = _load_pipeline(device)
    mono_ref = structure_locked.mean(axis=1) if structure_locked.ndim > 1 else structure_locked
    ref_16k = librosa.resample(mono_ref, orig_sr=sr, target_sr=AUDIOLDM2_SR)

    from midiverse.analysis import Section

    sections = conditioning.sections
    if not sections:
        duration = len(ref_16k) / AUDIOLDM2_SR
        sections = [Section(0, 0.0, min(duration, MAX_CHUNK_S), "fallback")]

    neural_parts: list[tuple[int, int, np.ndarray]] = []
    prompt = conditioning.timbre_prompt

    for i, sec in enumerate(sections):
        chunk_dur = min(sec.end - sec.start, MAX_CHUNK_S)
        if chunk_dur < 1.0:
            continue
        chunk = _generate_chunk(
            pipe,
            prompt,
            chunk_dur,
            seed=seed + i,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
        )
        s0 = int(sec.start * AUDIOLDM2_SR)
        s1 = min(s0 + len(chunk), len(ref_16k))
        chunk = chunk[: s1 - s0]
        neural_parts.append((s0, s1, chunk))

    neural_full = np.zeros(len(ref_16k), dtype=np.float32)
    for s0, s1, chunk in neural_parts:
        neural_full[s0:s1] = chunk

    if len(neural_full) < len(ref_16k):
        neural_full = np.pad(neural_full, (0, len(ref_16k) - len(neural_full)))
    else:
        neural_full = neural_full[: len(ref_16k)]

    blended_16k = (1.0 - neural_blend) * ref_16k + neural_blend * neural_full
    blended = librosa.resample(blended_16k, orig_sr=AUDIOLDM2_SR, target_sr=sr)

    if structure_locked.ndim > 1:
        n = min(len(blended), len(structure_locked))
        out = structure_locked.copy()
        for ch in range(out.shape[1]):
            out[:n, ch] = blended[:n]
        return out

    return blended[: len(structure_locked)]
