"""Pipeline: due cantanti → due WAV dry (call + response) per Logic."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np
import soundfile as sf

from midiverse.vocals.phrases import CallResponse, custom_pair, get_pair
from midiverse.vocals.singers import Singer, get_singer, list_singers
from midiverse.vocals.synth import render_phrase


@dataclass
class VocalJob:
    pair_id: str
    call_text: str
    response_text: str
    call_singer: str
    response_singer: str
    bpm: float
    call_wav: str
    response_wav: str
    note: str


def generate_pair(
    out_dir: Path | str,
    *,
    pair_id: str | None = None,
    call: str | None = None,
    response: str | None = None,
    call_singer: str = "mira",
    response_singer: str = "vale",
    bpm: float = 124.0,
    sr: int = 44100,
    seed: int = 42,
) -> VocalJob:
    """
    Genera due file dry mono 24-bit:
      {pair}__{singerA}_call_dry.wav
      {pair}__{singerB}_response_dry.wav

    Lock Germano: una voce = una traccia; wet = Delay Designer in Logic (non qui).
    """
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    if call and response:
        pair: CallResponse = custom_pair(call, response, pair_id or "custom")
    else:
        import random

        pair = get_pair(pair_id, random.Random(seed))

    singer_a: Singer = get_singer(call_singer)
    singer_b: Singer = get_singer(response_singer)

    call_audio = render_phrase(pair.call, singer_a, bpm=bpm, sr=sr)
    resp_audio = render_phrase(pair.response, singer_b, bpm=bpm, sr=sr)

    # Piccola pausa di riposta (1 battuta) sul response file come lead-in silenzioso
    beat = int((60.0 / bpm) * sr)
    resp_audio = np.concatenate([np.zeros(beat, dtype=np.float32), resp_audio])

    call_name = f"{pair.id}__{singer_a.id}_call_dry.wav"
    resp_name = f"{pair.id}__{singer_b.id}_response_dry.wav"
    call_path = out / call_name
    resp_path = out / resp_name

    sf.write(str(call_path), call_audio, sr, subtype="PCM_24")
    sf.write(str(resp_path), resp_audio, sr, subtype="PCM_24")

    job = VocalJob(
        pair_id=pair.id,
        call_text=pair.call,
        response_text=pair.response,
        call_singer=singer_a.name,
        response_singer=singer_b.name,
        bpm=bpm,
        call_wav=str(call_path),
        response_wav=str(resp_path),
        note=(
            "DRY only. In Logic: una traccia per voce; copia wet con Delay Designer "
            "(non Stereo Delay). Call-response ≥2 parole."
        ),
    )

    meta = out / f"{pair.id}__meta.json"
    meta.write_text(json.dumps(asdict(job), indent=2), encoding="utf-8")
    return job


__all__ = ["VocalJob", "generate_pair", "list_singers"]
