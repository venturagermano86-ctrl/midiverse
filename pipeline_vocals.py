#!/usr/bin/env python3
"""
MIDIVERSE — genera cantanti house (call / response) dry WAV.

Esempi:
  python3 pipeline_vocals.py
  python3 pipeline_vocals.py --pair hold-spin --call-singer mira --response-singer vale
  python3 pipeline_vocals.py --call "hold the mark" --response "spin the gate"
  python3 pipeline_vocals.py --list
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

WORKDIR = Path(__file__).resolve().parent
sys.path.insert(0, str(WORKDIR))

from midiverse.vocals.phrases import PHRASE_BANK
from midiverse.vocals.pipeline import generate_pair, list_singers


def main() -> int:
    p = argparse.ArgumentParser(description="Genera voci house dry call/response")
    p.add_argument("--out", type=Path, default=WORKDIR / "demo_vocals")
    p.add_argument("--pair", type=str, default=None, help="ID frase dal bank")
    p.add_argument("--call", type=str, default=None, help="Testo call (≥2 parole)")
    p.add_argument("--response", type=str, default=None, help="Testo response (≥2 parole)")
    p.add_argument("--call-singer", default="mira")
    p.add_argument("--response-singer", default="vale")
    p.add_argument("--bpm", type=float, default=124.0)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--list", action="store_true", help="Elenca cantanti e frasi")
    args = p.parse_args()

    if args.list:
        print("Cantanti:")
        for s in list_singers():
            print(f"  {s.id:6}  {s.name:6}  [{s.role:8}]  {s.vibe}")
        print("\nFrasi (call → response):")
        for ph in PHRASE_BANK:
            print(f"  {ph.id:14}  {ph.call!r}  →  {ph.response!r}")
        return 0

    job = generate_pair(
        args.out,
        pair_id=args.pair,
        call=args.call,
        response=args.response,
        call_singer=args.call_singer,
        response_singer=args.response_singer,
        bpm=args.bpm,
        seed=args.seed,
    )
    print(f"[vocals] pair={job.pair_id}  bpm={job.bpm}")
    print(f"[vocals] CALL     {job.call_singer}: {job.call_text!r}")
    print(f"[vocals]          → {job.call_wav}")
    print(f"[vocals] RESPONSE {job.response_singer}: {job.response_text!r}")
    print(f"[vocals]          → {job.response_wav}")
    print(f"[vocals] {job.note}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
