#!/usr/bin/env python3
"""Generate a mock vocal stem (and optional bed mix) for Vocal Studio.

Uses edge-tts when available. No ElevenLabs required.
Outputs WAV (and MP3 if ffmpeg present) to --out.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

SR = 44100


def load_wav_mono(path: Path) -> np.ndarray:
    import wave

    with wave.open(str(path), "rb") as w:
        assert w.getsampwidth() == 2
        raw = w.readframes(w.getnframes())
        x = np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768.0
        if w.getnchannels() == 2:
            x = x.reshape(-1, 2).mean(axis=1)
    return x


def save_wav_stereo(path: Path, L: np.ndarray, R: np.ndarray) -> None:
    import wave

    stereo = np.stack([np.clip(L, -1, 1), np.clip(R, -1, 1)], axis=1)
    pcm = (stereo * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def one_pole(x: np.ndarray, a: float) -> np.ndarray:
    y = np.zeros_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc += a * (v - acc)
        y[i] = acc
    return y


def place(buf: np.ndarray, sample: np.ndarray, t: float, gain: float = 1.0) -> None:
    i = int(t * SR)
    if i >= len(buf):
        return
    end = min(len(buf), i + len(sample))
    buf[i:end] += sample[: end - i] * gain


VOICE_MAP = {
    "jenny": "en-US-JennyNeural",
    "aria": "en-US-AriaNeural",
    "sonia": "en-GB-SoniaNeural",
    "guy": "en-US-GuyNeural",
    "brian": "en-US-BrianNeural",
    "michelle": "en-US-MichelleNeural",
    "emma": "en-US-EmmaNeural",
    "ana": "en-US-AnaNeural",
    "natasha": "en-AU-NatashaNeural",
    "libby": "en-GB-LibbyNeural",
    "roger": "en-US-RogerNeural",
}


async def tts_phrase(text: str, voice: str, rate: int, pitch_hz: int, dest: Path) -> None:
    import edge_tts

    pitch = f"{pitch_hz:+d}Hz"
    # Slightly slower = more "sung" for elongated phrases
    communicate = edge_tts.Communicate(text, voice, rate=f"{rate}%", pitch=pitch)
    await communicate.save(str(dest))


def mp3_to_wav(mp3: Path, wav: Path) -> None:
    subprocess.check_call(
        ["ffmpeg", "-y", "-i", str(mp3), "-ar", str(SR), "-ac", "1", str(wav)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def process_phrase(x: np.ndarray, wet: bool, dsp: str = "airy") -> np.ndarray:
    x = x / (np.max(np.abs(x)) + 1e-9)
    x = x * (np.abs(x) > 0.01)
    if dsp == "chest":
        warm = one_pole(x, 0.28)
        air = x - one_pole(x, 0.08)
        y = 0.88 * warm + 0.12 * air
        y = np.tanh(y * 1.15) * 0.95
        dry_g, wet_g = 0.96, 0.62
        taps_dry = [(35, 0.1), (220, 0.12), (480, 0.06)]
        taps_wet = [(55, 0.12), (380, 0.32), (760, 0.16), (1100, 0.09)]
    elif dsp == "cold":
        warm = one_pole(x, 0.12)
        air = x - one_pole(x, 0.03)
        y = 0.45 * warm + 0.55 * air
        y = np.tanh(y * 1.4) * 0.88
        dry_g, wet_g = 0.9, 0.55
        taps_dry = [(20, 0.08), (140, 0.1), (400, 0.05)]
        taps_wet = [(30, 0.1), (280, 0.22), (560, 0.12), (900, 0.06)]
    elif dsp == "punch":
        warm = one_pole(x, 0.18)
        air = x - one_pole(x, 0.04)
        y = 0.65 * warm + 0.35 * air
        y = np.tanh(y * 1.45) * 0.9
        dry_g, wet_g = 0.94, 0.68
        taps_dry = [(25, 0.14), (180, 0.14), (360, 0.07)]
        taps_wet = [(40, 0.12), (300, 0.26), (600, 0.12), (850, 0.07)]
    elif dsp == "warm":
        warm = one_pole(x, 0.24)
        air = x - one_pole(x, 0.06)
        y = 0.8 * warm + 0.2 * air
        y = np.tanh(y * 1.2) * 0.93
        dry_g, wet_g = 0.94, 0.7
        taps_dry = [(45, 0.11), (250, 0.15), (500, 0.08)]
        taps_wet = [(60, 0.11), (360, 0.3), (720, 0.15), (1050, 0.08)]
    else:  # airy / celestial
        warm = one_pole(x, 0.16)
        air = x - one_pole(x, 0.035)
        y = 0.55 * warm + 0.45 * air
        y = np.tanh(y * 1.18) * 0.9
        dry_g, wet_g = 0.88, 0.72
        taps_dry = [(50, 0.1), (300, 0.18), (640, 0.1)]
        taps_wet = [(70, 0.12), (420, 0.34), (840, 0.18), (1280, 0.1)]

    # Soft time-stretch feel: hold tails longer for airy/chest
    max_tap_ms = max(dms for dms, _ in (taps_wet if wet else taps_dry))
    tail = int((0.9 if dsp in ("airy", "chest") else 0.55) * SR) + int(
        SR * max_tap_ms / 1000
    )
    out = np.zeros(len(y) + tail)
    out[: len(y)] += y * (dry_g if not wet else wet_g)
    for dms, g in taps_dry if not wet else taps_wet:
        off = int(SR * dms / 1000)
        end = min(len(out), off + len(y))
        if off >= len(out):
            continue
        out[off:end] += y[: end - off] * g
    fade = int(0.04 * SR)
    out[:fade] *= np.linspace(0, 1, min(fade, len(out)))
    out[-fade:] *= np.linspace(1, 0, min(fade, len(out)))
    return out / (np.max(np.abs(out)) + 1e-9) * 0.92


def kick(bpm: float) -> np.ndarray:
    t = np.linspace(0, 0.2, int(SR * 0.2), False)
    return 0.4 * np.exp(-t * 26) * np.sin(2 * np.pi * (100 * np.exp(-t * 30) + 36) * t)


def build_bed(n: int, bpm: float) -> np.ndarray:
    mix = np.zeros(n)
    beat = 60.0 / bpm
    k = kick(bpm)
    rng = np.random.default_rng(7)
    hat_len = int(0.03 * SR)
    for i in range(int((n / SR) / beat)):
        place(mix, k, i * beat, 0.38)
        if i % 2:
            h = 0.03 * np.exp(-np.linspace(0, 0.03, hat_len) * 110) * rng.standard_normal(hat_len)
            place(mix, h, i * beat + beat * 0.5, 0.35)
    t = np.arange(n) / SR
    mix += 0.01 * np.sin(2 * np.pi * 110 * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.03 * t))
    return mix


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", required=True, help="JSON config path")
    ap.add_argument("--out", required=True, help="Output WAV path")
    ap.add_argument("--bed-out", default="", help="Optional vocal-only stem WAV")
    args = ap.parse_args()

    cfg = json.loads(Path(args.config).read_text())
    length_sec = float(cfg.get("lengthSec", 32))
    bpm = float(cfg.get("bpm", 124))
    mode = cfg.get("mode", "generate")  # generate | overlay | reference
    voice_key = cfg.get("voice", "jenny")
    wet_voice_key = cfg.get("wetVoice") or voice_key
    rate = int(cfg.get("rate", -18))
    pitch_hz = int(cfg.get("pitchHz", 0))
    dry_phrases = cfg.get("dry", ["hold the mark"])
    wet_phrases = cfg.get("wet", ["don't let go"])
    dsp = str(cfg.get("dsp") or "punch")
    track_path = cfg.get("trackPath") or ""
    analysis_meta = cfg.get("analysis") or {}

    user_bpm = cfg.get("userBpm")
    key_id = str(cfg.get("key") or "Am")

    # Reference mode: audio analysis, or precomputed meta (YouTube title fallback)
    if mode == "reference":
        if track_path and Path(track_path).exists():
            import analyze_reference

            analysis_meta = analyze_reference.analyze(Path(track_path))
        elif analysis_meta:
            pass  # already provided (e.g. YouTube oEmbed mood)
        else:
            raise SystemExit("reference mode needs trackPath or analysis")

        voice_key = analysis_meta["voice"]
        wet_voice_key = analysis_meta.get("wetVoice") or voice_key
        rate = int(analysis_meta["rate"])
        pitch_hz = int(analysis_meta["pitchHz"])
        dry_phrases = analysis_meta["dry"]
        wet_phrases = analysis_meta["wet"]
        dsp = str(analysis_meta.get("dsp") or "airy")
        if user_bpm is not None:
            bpm = float(user_bpm)
        elif analysis_meta.get("bpm"):
            bpm = float(analysis_meta["bpm"])
        analysis_meta["key"] = key_id
        analysis_meta["bpm"] = round(float(bpm), 1)
    elif user_bpm is not None:
        bpm = float(user_bpm)

    voice = VOICE_MAP.get(voice_key, VOICE_MAP["jenny"])
    wet_voice = VOICE_MAP.get(wet_voice_key, voice)
    n = int(SR * length_sec)
    mix = np.zeros(n)

    with tempfile.TemporaryDirectory() as td:
        td_path = Path(td)
        dry_bufs = []
        wet_bufs = []

        async def gen_all() -> None:
            tasks = []
            files = []
            for i, phrase in enumerate(dry_phrases):
                mp3 = td_path / f"dry{i}.mp3"
                tasks.append(tts_phrase(phrase, voice, rate, pitch_hz, mp3))
                files.append(("dry", i, mp3))
            for i, phrase in enumerate(wet_phrases):
                mp3 = td_path / f"wet{i}.mp3"
                # Answer voice: different neural + slightly lower / wetter
                tasks.append(
                    tts_phrase(phrase, wet_voice, rate - 2, pitch_hz - 3, mp3)
                )
                files.append(("wet", i, mp3))
            await asyncio.gather(*tasks)
            for kind, i, mp3 in files:
                wav = mp3.with_suffix(".wav")
                mp3_to_wav(mp3, wav)
                buf = process_phrase(
                    load_wav_mono(wav), wet=(kind == "wet"), dsp=dsp
                )
                if kind == "dry":
                    dry_bufs.append(buf)
                else:
                    wet_bufs.append(buf)

        asyncio.run(gen_all())

        vocal = np.zeros(n)
        beat = 60.0 / bpm
        bar = beat * 4
        # Place call/response — spacing varies with dsp mood
        gap = 1.7 if dsp in ("airy", "chest") else 2.0
        slots = max(2, int(length_sec / (6 if dsp in ("airy", "chest") else 8)))
        for s in range(slots):
            t0 = (0.75 + s * gap) * bar
            if t0 * SR >= n:
                break
            place(vocal, dry_bufs[s % len(dry_bufs)], t0, 0.92)
            place(vocal, wet_bufs[s % len(wet_bufs)], t0 + bar * 0.9, 0.8)

        if args.bed_out:
            L = vocal
            R = np.roll(vocal, 10) * 0.95 + vocal * 0.05
            save_wav_stereo(Path(args.bed_out), L, R)

        if mode == "overlay" and track_path and Path(track_path).exists():
            # Load / resample track via ffmpeg
            tmp_track = td_path / "track.wav"
            subprocess.check_call(
                [
                    "ffmpeg",
                    "-y",
                    "-i",
                    track_path,
                    "-ar",
                    str(SR),
                    "-ac",
                    "2",
                    "-t",
                    str(length_sec),
                    str(tmp_track),
                ],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            import wave

            with wave.open(str(tmp_track), "rb") as w:
                raw = w.readframes(w.getnframes())
                tr = np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32768.0
                tr = tr.reshape(-1, 2)
            if len(tr) < n:
                pad = np.zeros((n - len(tr), 2))
                tr = np.concatenate([tr, pad], axis=0)
            tr = tr[:n]
            # duck bed a bit under vocal
            bed = tr * 0.72
            bed[:, 0] += vocal * 0.85
            bed[:, 1] += np.roll(vocal, 12) * 0.8
            mix_L, mix_R = bed[:, 0], bed[:, 1]
        else:
            # Quiet bed so the vocal character is obvious when comparing refs
            bed_gain = 0.45 if mode == "reference" else 0.85
            bed = build_bed(n, bpm) * bed_gain
            mix_L = bed + vocal * 1.05
            mix_R = bed + np.roll(vocal, 12) * 1.0

        mix_L = np.tanh(mix_L * 1.05)
        mix_R = np.tanh(mix_R * 1.05)
        peak = max(np.max(np.abs(mix_L)), np.max(np.abs(mix_R))) + 1e-9
        mix_L, mix_R = mix_L / peak * 0.9, mix_R / peak * 0.9
        fade = int(1.5 * SR)
        env = np.linspace(1, 0, fade)
        mix_L[-fade:] *= env
        mix_R[-fade:] *= env
        out = Path(args.out)
        out.parent.mkdir(parents=True, exist_ok=True)
        save_wav_stereo(out, mix_L, mix_R)

        # also mp3
        mp3 = out.with_suffix(".mp3")
        subprocess.check_call(
            ["ffmpeg", "-y", "-i", str(out), "-codec:a", "libmp3lame", "-q:a", "2", str(mp3)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        payload = {"wav": str(out), "mp3": str(mp3)}
        if not analysis_meta:
            analysis_meta = {
                "bpm": round(float(bpm), 1),
                "key": key_id,
                "label": "Custom",
                "note": f"BPM {round(float(bpm))} · chiave {key_id}",
            }
        else:
            analysis_meta.setdefault("bpm", round(float(bpm), 1))
            analysis_meta["key"] = key_id
        payload["analysis"] = analysis_meta
        print(json.dumps(payload))
    return 0


if __name__ == "__main__":
    sys.exit(main())
