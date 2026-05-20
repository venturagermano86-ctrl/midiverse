"""
Orchestratore: Source Reference → analisi → conditioning → variazione timbrica.
"""

from __future__ import annotations

import json
import logging
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf

from midiverse.analysis import AudioTemplate, StructuralLock, analyze_template
from midiverse.audioldm2_backend import enhance_with_audioldm2, is_audioldm2_available
from midiverse.conditioning import build_conditioning
from midiverse.timbre_dsp import apply_timbre_dsp

logger = logging.getLogger(__name__)

ANALYSIS_SR = 22050
OUTPUT_SR = 44100


@dataclass
class TimbrePipelineConfig:
    source_path: Path
    output_path: Path
    lock_json_path: Path | None = None
    preset: str = "warm_analog"
    timbre_style: str = "warm analog synthesizer"
    intensity: float = 0.65
    backend: str = "dsp"  # dsp | audioldm2 | hybrid
    audioldm2_device: str = "cpu"
    audioldm2_blend: float = 0.22
    audioldm2_steps: int = 50
    seed: int = 42
    n_sections: int = 6


def _log(msg: str) -> None:
    print(f"[timbre-pipeline] {msg}", flush=True)


def decode_to_wav(source: Path, wav_path: Path, stereo: bool = True) -> None:
    suffix = source.suffix.lower()
    if suffix in {".wav", ".flac", ".aiff", ".aif"}:
        y, sr = sf.read(str(source))
        if sr != OUTPUT_SR:
            y = librosa.resample(
                y.T if y.ndim > 1 else y,
                orig_sr=sr,
                target_sr=OUTPUT_SR,
            )
            if y.ndim > 1 and not stereo:
                y = librosa.to_mono(y)
            elif y.ndim == 1 and stereo:
                y = np.stack([y, y])
            y = y.T if y.ndim > 1 else y
            sr = OUTPUT_SR
        sf.write(str(wav_path), y, sr, subtype="PCM_16")
        return

    if suffix == ".mp3":
        afconvert = shutil.which("afconvert")
        if afconvert and sys.platform == "darwin":
            channels = "2" if stereo else "1"
            subprocess.run(
                [
                    afconvert,
                    "-f",
                    "WAVE",
                    "-d",
                    f"LEI16@{OUTPUT_SR}",
                    "-c",
                    channels,
                    str(source),
                    str(wav_path),
                ],
                check=True,
                capture_output=True,
            )
            return
        y, _ = librosa.load(str(source), sr=OUTPUT_SR, mono=not stereo)
        sf.write(str(wav_path), y, OUTPUT_SR)
        return

    y, _ = librosa.load(str(source), sr=OUTPUT_SR, mono=not stereo)
    sf.write(str(wav_path), y, OUTPUT_SR)


def validate_structure_preservation(
    reference: np.ndarray,
    output: np.ndarray,
    sr: int,
    lock: StructuralLock,
) -> dict[str, float]:
    """Metriche rapide: allineamento beat e similarità cromatica."""
    ref_mono = librosa.to_mono(reference.T) if reference.ndim > 1 else reference
    out_mono = librosa.to_mono(output.T) if output.ndim > 1 else output
    n = min(len(ref_mono), len(out_mono))
    ref_mono, out_mono = ref_mono[:n], out_mono[:n]

    tempo_ref, beats_ref = librosa.beat.beat_track(y=ref_mono, sr=sr)
    tempo_out, beats_out = librosa.beat.beat_track(y=out_mono, sr=sr)
    if hasattr(tempo_ref, "__len__"):
        tempo_ref = float(tempo_ref[0])
    if hasattr(tempo_out, "__len__"):
        tempo_out = float(tempo_out[0])

    bpm_drift = abs(tempo_out - lock.bpm) / max(lock.bpm, 1e-6)

    chroma_ref = librosa.feature.chroma_cqt(y=ref_mono, sr=sr)
    chroma_out = librosa.feature.chroma_cqt(y=out_mono, sr=sr)
    chroma_out = librosa.util.fix_length(chroma_out, size=chroma_ref.shape[1], axis=1)
    harmony_corr = float(np.corrcoef(chroma_ref.flatten(), chroma_out.flatten())[0, 1])

    return {
        "bpm_reference": lock.bpm,
        "bpm_output_estimated": float(tempo_out),
        "bpm_drift_ratio": float(bpm_drift),
        "harmony_correlation": harmony_corr,
        "beats_reference": len(beats_ref),
        "beats_output": len(beats_out),
    }


def run_timbre_pipeline(config: TimbrePipelineConfig) -> AudioTemplate:
    source = config.source_path.resolve()
    if not source.is_file():
        raise FileNotFoundError(f"Source Reference non trovata: {source}")

    config.output_path.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="midiverse_timbre_") as tmp:
        tmp_dir = Path(tmp)
        wav_stereo = tmp_dir / "source_stereo.wav"
        wav_mono = tmp_dir / "source_mono.wav"

        _log(f"caricamento Source Reference: {source.name}")
        decode_to_wav(source, wav_stereo, stereo=True)
        decode_to_wav(source, wav_mono, stereo=False)

        y_analysis, _ = librosa.load(str(wav_mono), sr=ANALYSIS_SR, mono=True)
        lock = analyze_template(y_analysis, ANALYSIS_SR, source, n_sections=config.n_sections)

        _log(f"BPM bloccato: {lock.bpm:.1f} | {lock.time_signature[0]}/{lock.time_signature[1]}")
        _log(f"sezioni: {len(lock.sections)} | eventi armonici: {len(lock.harmony)}")

        if config.lock_json_path:
            config.lock_json_path.parent.mkdir(parents=True, exist_ok=True)
            lock.save_json(config.lock_json_path)
            _log(f"StructuralLock → {config.lock_json_path}")

        y_stereo, file_sr = sf.read(str(wav_stereo))
        if file_sr != OUTPUT_SR:
            y_stereo = librosa.resample(
                y_stereo.T if y_stereo.ndim > 1 else y_stereo,
                orig_sr=file_sr,
                target_sr=OUTPUT_SR,
            ).T
            file_sr = OUTPUT_SR

        y_for_cond = librosa.to_mono(y_stereo.T) if y_stereo.ndim > 1 else y_stereo
        conditioning = build_conditioning(
            y_for_cond,
            file_sr,
            lock,
            style=config.timbre_style,
        )

        _log(f"variazione timbrica (preset={config.preset}, intensity={config.intensity})")
        processed = apply_timbre_dsp(
            y_stereo,
            file_sr,
            conditioning,
            preset_name=config.preset,
            intensity=config.intensity,
        )

        backend = config.backend.lower()
        if backend in ("audioldm2", "hybrid"):
            if not is_audioldm2_available():
                _log("AVVISO: AudioLDM-2 non installato — solo backend DSP")
            else:
                _log(f"rinforzo neurale AudioLDM-2 (blend={config.audioldm2_blend})")
                processed = enhance_with_audioldm2(
                    processed,
                    file_sr,
                    conditioning,
                    device=config.audioldm2_device,
                    seed=config.seed,
                    num_inference_steps=config.audioldm2_steps,
                    neural_blend=config.audioldm2_blend,
                )

        # Durata identica alla reference
        n_ref = len(y_stereo)
        if len(processed) > n_ref:
            processed = processed[:n_ref]
        elif len(processed) < n_ref:
            pad = np.zeros((n_ref - len(processed), processed.shape[1]), dtype=processed.dtype)
            processed = np.vstack([processed, pad])

        metrics = validate_structure_preservation(y_stereo, processed, file_sr, lock)
        _log(
            f"validazione: armonia corr={metrics['harmony_correlation']:.3f}, "
            f"BPM drift={metrics['bpm_drift_ratio']:.3f}"
        )

        sf.write(str(config.output_path), processed, file_sr, subtype="PCM_16")
        _log(f"output → {config.output_path}")

        if config.lock_json_path:
            meta_path = config.lock_json_path.with_suffix(".metrics.json")
            meta_path.write_text(
                json.dumps(metrics, indent=2),
                encoding="utf-8",
            )

    return lock
