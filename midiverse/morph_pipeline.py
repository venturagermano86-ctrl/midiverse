"""
Audio Morphing Strutturale — orchestratore completo.

1. Analisi Template
2. Separazione stem + Feature mapping (NST per stem)
3. Controllo variazione (phrasing/quantizzazione invariati)
4. Vincolo durata ±2%
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf

from midiverse.analysis import AudioTemplate, analyze_template
from midiverse.conditioning import build_conditioning
from midiverse.duration import DEFAULT_TOLERANCE, enforce_duration, is_within_tolerance
from midiverse.morph import MorphControls, mix_stems_to_stereo, morph_all_stems
from midiverse.stems import StemBundle, separate_stems

ANALYSIS_SR = 22050
OUTPUT_SR = 44100


@dataclass
class StructuralMorphConfig:
    source_path: Path
    output_path: Path
    template_json: Path | None = None
    stems_dir: Path | None = None
    export_stems_dir: Path | None = None
    preset: str = "warm_analog"
    timbre_style: str = "modern electronic production"
    intensity: float = 0.72
    duration_tolerance: float = DEFAULT_TOLERANCE
    demucs_device: str = "cpu"
    n_sections: int = 6
    seed: int = 42


def _log(msg: str) -> None:
    print(f"[structural-morph] {msg}", flush=True)


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
        sf.write(str(wav_path), y, OUTPUT_SR, subtype="PCM_16")
        return

    if suffix == ".mp3":
        afconvert = shutil.which("afconvert")
        if afconvert and sys.platform == "darwin":
            ch = "2" if stereo else "1"
            subprocess.run(
                [
                    afconvert,
                    "-f",
                    "WAVE",
                    "-d",
                    f"LEI16@{OUTPUT_SR}",
                    "-c",
                    ch,
                    str(source),
                    str(wav_path),
                ],
                check=True,
                capture_output=True,
            )
            return
    y, _ = librosa.load(str(source), sr=OUTPUT_SR, mono=not stereo)
    sf.write(str(wav_path), y, OUTPUT_SR)


def validate_morph(
    reference: np.ndarray,
    output: np.ndarray,
    sr: int,
    template: AudioTemplate,
    target_samples: int,
    tolerance: float,
) -> dict:
    ref_mono = librosa.to_mono(reference.T) if reference.ndim > 1 else reference
    out_mono = librosa.to_mono(output.T) if output.ndim > 1 else output
    n = min(len(ref_mono), len(out_mono))
    ref_mono, out_mono = ref_mono[:n], out_mono[:n]

    _, beats_ref = librosa.beat.beat_track(y=ref_mono, sr=sr)
    _, beats_out = librosa.beat.beat_track(y=out_mono, sr=sr)

    chroma_ref = librosa.feature.chroma_cqt(y=ref_mono, sr=sr)
    chroma_out = librosa.feature.chroma_cqt(y=out_mono, sr=sr)
    chroma_out = librosa.util.fix_length(chroma_out, size=chroma_ref.shape[1], axis=1)

    onset_ref = librosa.onset.onset_strength(y=ref_mono, sr=sr)
    onset_out = librosa.onset.onset_strength(y=out_mono, sr=sr)
    onset_out = librosa.util.fix_length(onset_out, size=len(onset_ref))

    duration_ratio = len(out_mono) / max(target_samples, 1)

    return {
        "bpm_template": template.bpm,
        "time_signature": list(template.time_signature),
        "beat_count_template": len(template.beat_times),
        "beat_count_output": len(beats_out),
        "onset_envelope_correlation": float(np.corrcoef(onset_ref, onset_out)[0, 1]),
        "harmony_correlation": float(np.corrcoef(chroma_ref.flatten(), chroma_out.flatten())[0, 1]),
        "duration_ratio": float(duration_ratio),
        "duration_within_tolerance": is_within_tolerance(
            len(out_mono), target_samples, tolerance
        ),
        "sections": [{"label": s.label, "start": s.start, "end": s.end} for s in template.sections],
    }


def run_structural_morph(config: StructuralMorphConfig) -> AudioTemplate:
    source = config.source_path.resolve()
    if not source.is_file():
        raise FileNotFoundError(f"Source Reference non trovata: {source}")

    config.output_path.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="midiverse_morph_") as tmp:
        tmp_dir = Path(tmp)
        wav_stereo = tmp_dir / "source.wav"
        wav_mono = tmp_dir / "source_mono.wav"

        _log(f"[1/4] Analisi Template: {source.name}")
        decode_to_wav(source, wav_stereo, stereo=True)
        decode_to_wav(source, wav_mono, stereo=False)

        y_analysis, _ = librosa.load(str(wav_mono), sr=ANALYSIS_SR, mono=True)
        template = analyze_template(
            y_analysis, ANALYSIS_SR, source, n_sections=config.n_sections
        )

        ts = template.time_signature
        _log(
            f"  BPM={template.bpm:.1f} | {ts[0]}/{ts[1]} | "
            f"beats={len(template.beat_times)} | downbeats={len(template.downbeat_times)}"
        )
        for sec in template.sections:
            _log(f"  [{sec.label}] {sec.start:.2f}s – {sec.end:.2f}s")

        if config.template_json:
            config.template_json.parent.mkdir(parents=True, exist_ok=True)
            template.save_json(config.template_json)

        y_stereo, file_sr = sf.read(str(wav_stereo))
        if file_sr != OUTPUT_SR:
            y_stereo = librosa.resample(
                y_stereo.T if y_stereo.ndim > 1 else y_stereo,
                orig_sr=file_sr,
                target_sr=OUTPUT_SR,
            ).T
            file_sr = OUTPUT_SR

        y_mono = librosa.to_mono(y_stereo.T)
        target_samples = len(y_mono)

        _log("[2/4] Separazione stem (reference, non generazione ex-nihilo)")
        bundle = separate_stems(
            y_mono,
            file_sr,
            stem_dir=config.stems_dir,
            work_wav=wav_mono,
            demucs_device=config.demucs_device,
        )
        _log(f"  metodo: {bundle.source}")

        if config.export_stems_dir:
            bundle.save_dir(config.export_stems_dir)
            _log(f"  stem esportati → {config.export_stems_dir}")

        conditioning = build_conditioning(y_mono, file_sr, template, style=config.timbre_style)
        controls = MorphControls(intensity=config.intensity)

        _log("[3/4] Feature mapping — NST / variazione timbrica per stem")
        morphed = morph_all_stems(
            bundle.stems, file_sr, template, conditioning, controls
        )
        morphed_mix = mix_stems_to_stereo(morphed)

        _log(f"[4/4] Vincolo durata ±{config.duration_tolerance * 100:.0f}%")
        final, dur_meta = enforce_duration(
            morphed_mix,
            file_sr,
            target_samples,
            tolerance=config.duration_tolerance,
        )

        metrics = validate_morph(
            y_stereo,
            final,
            file_sr,
            template,
            target_samples,
            config.duration_tolerance,
        )
        metrics["duration_enforcement"] = dur_meta

        _log(
            f"  onset corr={metrics['onset_envelope_correlation']:.3f} | "
            f"armonia={metrics['harmony_correlation']:.3f} | "
            f"durata ratio={metrics['duration_ratio']:.4f} | "
            f"OK={metrics['duration_within_tolerance']}"
        )

        sf.write(str(config.output_path), final, file_sr, subtype="PCM_16")
        _log(f"output → {config.output_path}")

        if config.template_json:
            metrics_path = config.template_json.with_suffix(".metrics.json")
            metrics_path.write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    return template
