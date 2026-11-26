#!/usr/bin/env python3
"""Analyze a reference track's vocal/mix mood and return ORIGINAL phrase + voice params.

Never copies lyrics from the reference — only tempo/timbre/energy → style mapping.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import tempfile
from pathlib import Path

import numpy as np

SR = 22050

# Original phrase banks — usable club English, not reference lyrics
BANKS = {
    "celestial": {
        "dry": ["soft through the night", "keep the light close", "spin it slow"],
        "wet": ["stay in the glow", "fall into me", "open the gate"],
        "voice": "jenny",
        "rate": -24,
        "pitchHz": 2,
        "label": "Celestial / airy",
    },
    "soul": {
        "dry": ["hold me closer", "carry me home", "don't you leave"],
        "wet": ["through the night", "I need you so", "hold me still"],
        "voice": "sonia",
        "rate": -26,
        "pitchHz": -5,
        "label": "Soul / deep",
    },
    "club": {
        "dry": ["hold the mark", "spin the gate", "feel the bass"],
        "wet": ["don't let go", "open it wide", "keep it rolling"],
        "voice": "aria",
        "rate": -14,
        "pitchHz": 2,
        "label": "Club hook",
    },
    "cold": {
        "dry": ["into the machine", "hold the line", "no way back"],
        "wet": ["run the circuit", "find the signal", "out of time"],
        "voice": "guy",
        "rate": -10,
        "pitchHz": -2,
        "label": "Cold techno",
    },
    "warm": {
        "dry": ["under the sun", "move with the drum", "love on the floor"],
        "wet": ["dance until dawn", "fire in the night", "feel alright"],
        "voice": "aria",
        "rate": -16,
        "pitchHz": 3,
        "label": "Warm / afro-disco",
    },
}


def ffmpeg_mono(path: Path, out: Path, max_sec: float = 90) -> None:
    subprocess.check_call(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(path),
            "-t",
            str(max_sec),
            "-ar",
            str(SR),
            "-ac",
            "1",
            str(out),
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def analyze(path: Path) -> dict:
    import librosa

    with tempfile.TemporaryDirectory() as td:
        wav = Path(td) / "ref.wav"
        ffmpeg_mono(path, wav)
        y, sr = librosa.load(str(wav), sr=SR, mono=True)
        if len(y) < sr:
            y = np.pad(y, (0, sr - len(y)))

        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        tempo = float(np.atleast_1d(tempo)[0])
        # Clamp to club range (fix octave errors)
        while tempo > 150:
            tempo *= 0.5
        while tempo < 90 and tempo > 0:
            tempo *= 2
        if tempo <= 0:
            tempo = 124.0
        cent = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))
        rolloff = float(np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr)))
        flat = float(np.mean(librosa.feature.spectral_flatness(y=y)))
        rms = float(np.mean(librosa.feature.rms(y=y)))
        zcr = float(np.mean(librosa.feature.zero_crossing_rate(y)))

        # Brightness / depth heuristic
        bright = cent > 2200
        deep = cent < 1600
        sparse = rms < 0.06
        dense = rms > 0.12
        coldish = flat > 0.04 and zcr > 0.08
        warmish = not coldish and rolloff < 4500

        if tempo < 116 and deep:
            bank = "soul"
        elif tempo >= 128 and (coldish or bright):
            bank = "cold"
        elif sparse and (deep or not bright):
            bank = "celestial"
        elif warmish and 112 <= tempo <= 126:
            bank = "warm"
        else:
            bank = "club"

        style = BANKS[bank]
        # Stable but different phrase pick per reference file
        digest = hashlib.sha256(path.read_bytes()[: 256_000]).hexdigest()
        seed = int(digest[:8], 16)
        rng = np.random.default_rng(seed)
        dry = list(rng.choice(style["dry"], size=min(2, len(style["dry"])), replace=False))
        wet = list(rng.choice(style["wet"], size=min(2, len(style["wet"])), replace=False))

        # Nudge rate/pitch from analysis (still original text)
        rate = int(style["rate"])
        pitch = int(style["pitchHz"])
        if deep:
            pitch -= 2
            rate -= 2
        if bright:
            pitch += 2
        if sparse:
            rate -= 3

        return {
            "bpm": round(float(tempo), 1),
            "brightness": round(cent, 1),
            "energy": round(rms, 4),
            "bank": bank,
            "label": style["label"],
            "voice": style["voice"],
            "rate": rate,
            "pitchHz": pitch,
            "dry": [str(x) for x in dry],
            "wet": [str(x) for x in wet],
            "note": "Original phrases — mood matched to reference, not a lyric copy.",
        }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--track", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    result = analyze(Path(args.track))
    Path(args.out).write_text(json.dumps(result, indent=2))
    print(json.dumps(result))


if __name__ == "__main__":
    main()
