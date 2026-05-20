#!/usr/bin/env python3
"""
Audio Morphing Strutturale — MIDIVERSE.

1. Analisi Template (BPM, time signature, beat grid, Intro/Verso/Drop/Outro)
2. Stem separation + NST / variazione timbrica per stem
3. Phrasing e quantizzazione invariati
4. Durata output ±2% rispetto alla reference

Uso:
  python pipeline_morph.py --source reference.mp3
  python pipeline_morph.py -s ref.wav --stems-dir ./stems --export-stems ./stems_out
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from midiverse.morph_pipeline import StructuralMorphConfig, run_structural_morph


def main() -> int:
    workdir = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(
        description="Audio Morphing Strutturale da Source Reference",
    )
    parser.add_argument("-s", "--source", type=Path, default=workdir / "reference.mp3")
    parser.add_argument("-o", "--output", type=Path, default=workdir / "output_morph.wav")
    parser.add_argument(
        "--template-json",
        type=Path,
        default=workdir / "audio_template.json",
    )
    parser.add_argument(
        "--stems-dir",
        type=Path,
        default=None,
        help="Cartella con drums.wav, bass.wav, other.wav, vocals.wav",
    )
    parser.add_argument(
        "--export-stems",
        type=Path,
        default=None,
        help="Salva stem separati prima del morph",
    )
    parser.add_argument("--intensity", type=float, default=0.72)
    parser.add_argument(
        "--duration-tolerance",
        type=float,
        default=0.02,
        help="Tolleranza durata (default 2%%)",
    )
    parser.add_argument("--demucs-device", default="cpu")
    parser.add_argument("--no-template-json", action="store_true")
    args = parser.parse_args()

    config = StructuralMorphConfig(
        source_path=args.source,
        output_path=args.output,
        template_json=None if args.no_template_json else args.template_json,
        stems_dir=args.stems_dir,
        export_stems_dir=args.export_stems,
        intensity=args.intensity,
        duration_tolerance=args.duration_tolerance,
        demucs_device=args.demucs_device,
    )

    try:
        run_structural_morph(config)
    except FileNotFoundError as e:
        print(f"ERRORE: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"ERRORE: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
