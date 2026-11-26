#!/usr/bin/env python3
"""Analyze a reference track / YouTube meta → ORIGINAL vocal character.

Every distinct URL/title must land on a clearly different voice pack
(voice A/B, rate, pitch, phrases, DSP style) — not the same Jenny every time.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import tempfile
from pathlib import Path

import numpy as np

SR = 22050

# Distinct character packs — changing the reference MUST change the pack.
# Phrases are elongated / sung-ish (demo TTS); never copied from a track.
PACKS = [
    {
        "id": "celestial-jenny",
        "label": "Celestial airy · Jenny",
        "tags": ("celestial", "airy", "ambient", "villalobos", "soft", "float", "glow", "dream", "ethereal", "whisper", "space", "minimal"),
        "voice": "jenny",
        "wetVoice": "aria",
        "rate": -28,
        "pitchHz": 3,
        "dsp": "airy",
        "bpm": 120,
        "dry": ["sooooft throuuugh the niiight", "keeep the liiight clooose", "spiiin it sllooow"],
        "wet": ["staaay in the gloooow", "faaall into meeee", "ooopen the gaaate"],
    },
    {
        "id": "celestial-aria",
        "label": "Celestial lift · Aria",
        "tags": ("celestial", "voice", "resurrection", "easy lee", "hypnotic", "lee"),
        "voice": "aria",
        "wetVoice": "jenny",
        "rate": -26,
        "pitchHz": 6,
        "dsp": "airy",
        "bpm": 121,
        "dry": ["hooold the liiight", "sliiide into quiiiet", "breeeathe with meeee"],
        "wet": ["dooown in the gloooow", "caaall me soooftly", "waaait for the waaave"],
    },
    {
        "id": "soul-sonia",
        "label": "Soul deep · Sonia",
        "tags": ("soul", "nina", "gospel", "deep house", "blues", "heart", "ballad", "motown", "r&b", "rnb"),
        "voice": "sonia",
        "wetVoice": "michelle",
        "rate": -30,
        "pitchHz": -8,
        "dsp": "chest",
        "bpm": 112,
        "dry": ["hooold me cloooser", "caaarry me hooome", "dooon't you leeeave"],
        "wet": ["throoough the niiight", "I neeeed you sooo", "hooold me stiiill"],
    },
    {
        "id": "soul-michelle",
        "label": "Soul warm · Michelle",
        "tags": ("soul", "love", "warm", "night", "deep"),
        "voice": "michelle",
        "wetVoice": "sonia",
        "rate": -27,
        "pitchHz": -5,
        "dsp": "chest",
        "bpm": 114,
        "dry": ["taaake me sloooow", "keeep me neeeear", "looove on the floooor"],
        "wet": ["dooon't let me faaade", "staaay with the beeeat", "feeel my heaaart"],
    },
    {
        "id": "club-aria",
        "label": "Club hook · Aria",
        "tags": ("tech house", "club", "peak", "groove", "bassline", "festival", "house", "mix"),
        "voice": "aria",
        "wetVoice": "emma",
        "rate": -12,
        "pitchHz": 2,
        "dsp": "punch",
        "bpm": 125,
        "dry": ["hold the mark", "spin the gate", "feel the bass"],
        "wet": ["don't let go", "open it wide", "keep it rolling"],
    },
    {
        "id": "club-emma",
        "label": "Club chant · Emma",
        "tags": ("house", "remix", "edit", "dj", "club"),
        "voice": "emma",
        "wetVoice": "aria",
        "rate": -10,
        "pitchHz": 4,
        "dsp": "punch",
        "bpm": 126,
        "dry": ["move your body", "bring it back", "run the floor"],
        "wet": ["all night long", "take me higher", "let it drop"],
    },
    {
        "id": "cold-guy",
        "label": "Cold techno · Guy",
        "tags": ("techno", "industrial", "berghain", "cold", "acid", "warehouse", "hardgroove", "detroit"),
        "voice": "guy",
        "wetVoice": "brian",
        "rate": -8,
        "pitchHz": -3,
        "dsp": "cold",
        "bpm": 132,
        "dry": ["into the machine", "hold the line", "no way back"],
        "wet": ["run the circuit", "find the signal", "out of time"],
    },
    {
        "id": "cold-brian",
        "label": "Cold pulse · Brian",
        "tags": ("techno", "peak time", "rave"),
        "voice": "brian",
        "wetVoice": "guy",
        "rate": -6,
        "pitchHz": -1,
        "dsp": "cold",
        "bpm": 134,
        "dry": ["push the voltage", "lock the grid", "cut the silence"],
        "wet": ["wire me in", "burn the clock", "drive it harder"],
    },
    {
        "id": "warm-aria",
        "label": "Warm afro · Aria",
        "tags": ("afro", "disco", "nu-disco", "sunshine", "tropical", "organic", "latin", "balearic"),
        "voice": "aria",
        "wetVoice": "natasha",
        "rate": -16,
        "pitchHz": 4,
        "dsp": "warm",
        "bpm": 122,
        "dry": ["under the suuun", "mooove with the druum", "looove on the flooor"],
        "wet": ["daaance until daaawn", "fiiire in the niiight", "feeel alriiight"],
    },
    {
        "id": "warm-natasha",
        "label": "Warm sun · Natasha",
        "tags": ("disco", "fun", "summer", "groove"),
        "voice": "natasha",
        "wetVoice": "libby",
        "rate": -14,
        "pitchHz": 5,
        "dsp": "warm",
        "bpm": 120,
        "dry": ["sliiide into the suun", "shaake it geentle", "keeep the riihythm"],
        "wet": ["doo't stop the feeeling", "liiift me uuup", "daaance with meeee"],
    },
    {
        "id": "uk-libby",
        "label": "UK soft · Libby",
        "tags": ("uk", "london", "garage", "broken", "2step"),
        "voice": "libby",
        "wetVoice": "sonia",
        "rate": -20,
        "pitchHz": 1,
        "dsp": "airy",
        "bpm": 130,
        "dry": ["keeep it liiight", "piiull me cloooser", "staaay a litttle"],
        "wet": ["throoough the ciiity", "niiight is opeeen", "hooold that moood"],
    },
    {
        "id": "intimate-michelle",
        "label": "Intimate soft · Michelle",
        "tags": ("intimate", "quiet", "soft", "whisper", "late"),
        "voice": "michelle",
        "wetVoice": "jenny",
        "rate": -32,
        "pitchHz": 2,
        "dsp": "airy",
        "bpm": 118,
        "dry": ["whiiisper my naaame", "clooose your eeyes", "slooow with meeee"],
        "wet": ["soooft as the raain", "faaade into bluuue", "keeep me heeere"],
    },
]


def _digest_int(s: str) -> int:
    return int(hashlib.sha256(s.encode("utf-8")).hexdigest()[:12], 16)


def _score_pack(pack: dict, blob: str) -> int:
    score = 0
    for t in pack["tags"]:
        if t in blob:
            score += 3 + (2 if len(t) > 7 else 0)
    return score


def pick_pack(seed_src: str, blob: str = "") -> dict:
    """Keyword soft-bias + strong hash so every URL differs even in same mood."""
    blob = blob.lower()
    scored = [( _score_pack(p, blob), i, p) for i, p in enumerate(PACKS)]
    scored.sort(key=lambda x: (-x[0], x[1]))
    top_score = scored[0][0]
    # Candidates: keyword hits, or all packs if no hits
    if top_score > 0:
        candidates = [p for s, _, p in scored if s >= max(1, top_score - 2)]
    else:
        candidates = list(PACKS)
    rng = np.random.default_rng(_digest_int(seed_src + "|pack"))
    pack = candidates[int(rng.integers(0, len(candidates)))]
    # Phrase + micro variation from full seed
    rng2 = np.random.default_rng(_digest_int(seed_src + "|phr|" + pack["id"]))
    dry = list(rng2.choice(pack["dry"], size=min(2, len(pack["dry"])), replace=False))
    wet = list(rng2.choice(pack["wet"], size=min(2, len(pack["wet"])), replace=False))
    rate = int(pack["rate"]) + int(rng2.integers(-3, 4))
    pitch = int(pack["pitchHz"]) + int(rng2.integers(-3, 4))
    return {
        "packId": pack["id"],
        "bank": pack["id"].split("-")[0],
        "label": pack["label"],
        "voice": pack["voice"],
        "wetVoice": pack["wetVoice"],
        "rate": rate,
        "pitchHz": pitch,
        "dsp": pack["dsp"],
        "bpm": float(pack["bpm"]) + float(rng2.choice([-2, -1, 0, 1, 2])),
        "dry": [str(x) for x in dry],
        "wet": [str(x) for x in wet],
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


def analyze_from_meta(
    *,
    title: str = "",
    author: str = "",
    url: str = "",
    bpm_hint: float | None = None,
) -> dict:
    blob = f"{title} {author}".lower()
    # Strip filler so different videos don't collapse to the same words
    blob = re.sub(r"\b(official|video|audio|hq|hd|full|track)\b", " ", blob)
    seed = f"{url}|{title}|{author}"
    picked = pick_pack(seed, blob)
    if bpm_hint:
        picked["bpm"] = float(bpm_hint)
    return {
        **picked,
        "sourceTitle": title,
        "sourceAuthor": author,
        "sourceUrl": url,
        "sourceMode": "meta",
        "note": (
            f"Voce: {picked['voice']} + {picked['wetVoice']} · pack {picked['packId']}. "
            "Mood dal link — frasi originali, non copia del video."
        ),
    }


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

        bright = cent > 2200
        deep = cent < 1600
        sparse = rms < 0.06
        coldish = flat > 0.04 and zcr > 0.08
        warmish = not coldish and rolloff < 4500

        hint = []
        if tempo < 116 and deep:
            hint += ["soul", "deep", "heart"]
        elif tempo >= 128 and (coldish or bright):
            hint += ["techno", "cold", "warehouse"]
        elif sparse and (deep or not bright):
            hint += ["celestial", "airy", "soft", "ambient"]
        elif warmish and 112 <= tempo <= 126:
            hint += ["afro", "disco", "warm", "sunshine"]
        else:
            hint += ["house", "club", "groove"]

        seed = hashlib.sha256(path.read_bytes()[: 256_000]).hexdigest()
        picked = pick_pack(seed, " ".join(hint))
        if deep:
            picked["pitchHz"] -= 2
            picked["rate"] -= 2
        if bright:
            picked["pitchHz"] += 2
        if sparse:
            picked["rate"] -= 3

        return {
            **picked,
            "bpm": round(float(tempo), 1),
            "brightness": round(cent, 1),
            "energy": round(rms, 4),
            "sourceMode": "audio",
            "note": (
                f"Voce: {picked['voice']} + {picked['wetVoice']} · pack {picked['packId']}. "
                "Mood matched to audio — frasi originali."
            ),
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
