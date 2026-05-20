#!/usr/bin/env python3
"""
Pipeline di variazione timbrica (mix intero) — MIDIVERSE.

Per Audio Morphing Strutturale completo (stem + NST + ±2%% durata) usa:
  python pipeline_morph.py --source reference.mp3

Uso:
  python pipeline_timbre.py --source reference.mp3 --output output_timbre.wav
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from midiverse.pipeline import TimbrePipelineConfig, run_timbre_pipeline


def main() -> int:
    workdir = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(
        description="Variazione timbrica da Source Reference (structure-preserving)",
    )
    parser.add_argument(
        "--source",
        "-s",
        type=Path,
        default=workdir / "reference.mp3",
        help="File audio Source Reference",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        default=workdir / "output_timbre.wav",
        help="WAV di uscita",
    )
    parser.add_argument(
        "--lock-json",
        type=Path,
        default=workdir / "structural_lock.json",
        help="Esporta BPM, sezioni e armonia in JSON",
    )
    parser.add_argument(
        "--preset",
        choices=["warm_analog", "bright_digital", "lofi", "filter_house"],
        default="warm_analog",
    )
    parser.add_argument(
        "--style",
        default="warm analog synthesizer",
        help="Descrizione timbro per prompt AudioLDM-2",
    )
    parser.add_argument(
        "--intensity",
        type=float,
        default=0.65,
        help="Intensità variazione timbrica 0–1",
    )
    parser.add_argument(
        "--backend",
        choices=["dsp", "audioldm2", "hybrid"],
        default="dsp",
        help="dsp=solo DSP; hybrid=DSP+AudioLDM-2 blend leggero",
    )
    parser.add_argument(
        "--audioldm2-device",
        default="cpu",
        help="cpu | cuda | mps",
    )
    parser.add_argument(
        "--audioldm2-blend",
        type=float,
        default=0.22,
        help="Quota segnale neurale (bassa = più fedeltà strutturale)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Seed per AudioLDM-2 (non introduce variazioni armoniche nel DSP)",
    )
    parser.add_argument(
        "--no-lock-json",
        action="store_true",
        help="Non scrivere structural_lock.json",
    )
    args = parser.parse_args()

    config = TimbrePipelineConfig(
        source_path=args.source,
        output_path=args.output,
        lock_json_path=None if args.no_lock_json else args.lock_json,
        preset=args.preset,
        timbre_style=args.style,
        intensity=args.intensity,
        backend=args.backend,
        audioldm2_device=args.audioldm2_device,
        audioldm2_blend=args.audioldm2_blend,
        seed=args.seed,
    )

    try:
        run_timbre_pipeline(config)
    except FileNotFoundError as e:
        print(f"ERRORE: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"ERRORE: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
