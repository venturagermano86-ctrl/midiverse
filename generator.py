#!/usr/bin/env python3
"""
MIDIVERSE generator — reference.mp3 → nuova_traccia.mid + output_audio.wav
Stile French Touch: estrazione struttura MIDI + master pump/filter/saturazione.

Esecuzione: python3 generator.py  (installa dipendenze in automatico)
"""

from __future__ import annotations

import importlib
import subprocess
import sys

# Dipendenze minime (installazione silenziosa al primo avvio)
_DEPS = (
    ("numpy", "numpy>=1.24,<3"),
    ("scipy", "scipy>=1.10"),
    ("librosa", "librosa>=0.10"),
    ("soundfile", "soundfile>=0.12"),
    ("mido", "mido>=1.3"),
)


def _ensure_dependencies() -> None:
    missing = []
    for module, spec in _DEPS:
        try:
            importlib.import_module(module)
        except ImportError:
            missing.append(spec)
    if not missing:
        return
    print("[generator] installazione dipendenze …", flush=True)
    cmd = [
        sys.executable,
        "-m",
        "pip",
        "install",
        "-q",
        "--disable-pip-version-check",
        *missing,
    ]
    subprocess.run(cmd, check=True)
    for module, _ in _DEPS:
        importlib.invalidate_caches()
        importlib.import_module(module)


_ensure_dependencies()

import os
import random
import shutil
import tempfile
from pathlib import Path

import librosa
import mido
import numpy as np
import soundfile as sf
from scipy import signal

WORKDIR = Path(__file__).resolve().parent
REFERENCE = WORKDIR / "reference.mp3"
MIDI_OUT = WORKDIR / "nuova_traccia.mid"
WAV_OUT = WORKDIR / "output_audio.wav"

ANALYSIS_SR = 22050
OUTPUT_SR = 44100
SEED = 42
TICKS_PER_BEAT = 480


def log(msg: str) -> None:
    print(f"[generator] {msg}", flush=True)


def decode_mp3_to_wav(mp3_path: Path, wav_path: Path, stereo: bool = False) -> None:
    channels = "2" if stereo else "1"
    afconvert = shutil.which("afconvert")
    if afconvert and sys.platform == "darwin":
        subprocess.run(
            [
                afconvert,
                "-f",
                "WAVE",
                "-d",
                f"LEI16@{OUTPUT_SR}",
                "-c",
                channels,
                str(mp3_path),
                str(wav_path),
            ],
            check=True,
            capture_output=True,
        )
        return
    log("afconvert non disponibile — decodifica con librosa")
    y, _ = librosa.load(str(mp3_path), sr=OUTPUT_SR, mono=not stereo)
    sf.write(str(wav_path), y, OUTPUT_SR)


def hz_to_midi(hz: float) -> int | None:
    if hz is None or not np.isfinite(hz) or hz <= 0:
        return None
    return int(round(69 + 12 * np.log2(hz / 440.0)))


def detect_tempo(y: np.ndarray, sr: int) -> float:
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    if hasattr(tempo, "__len__"):
        tempo = float(tempo[0])
    return float(np.clip(tempo, 80, 140))


def detect_sections(y: np.ndarray, sr: int) -> list[float]:
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    bounds = librosa.segment.agglomerative(chroma, k=6)
    return [float(t) for t in librosa.frames_to_time(bounds, sr=sr)]


def extract_notes(y: np.ndarray, sr: int, tempo: float) -> tuple[list[dict], float]:
    y = librosa.util.normalize(y)
    onset_times = librosa.onset.onset_detect(
        y=y, sr=sr, units="time", backtrack=True, delta=0.07
    )
    if len(onset_times) < 4:
        onset_times = librosa.frames_to_time(
            librosa.onset.onset_detect(y=y, sr=sr), sr=sr
        )

    max_onsets = 520
    if len(onset_times) > max_onsets:
        step = max(1, len(onset_times) // max_onsets)
        onset_times = onset_times[::step]

    hop = 512
    fmin = librosa.note_to_hz("C2")
    fmax = librosa.note_to_hz("C7")
    notes: list[dict] = []

    for i, t_start in enumerate(onset_times):
        t_end = onset_times[i + 1] if i + 1 < len(onset_times) else t_start + 0.35
        t_end = min(t_end, t_start + 0.45)
        s0, s1 = int(t_start * sr), int(t_end * sr)
        seg = y[s0:s1]
        if len(seg) < hop * 2:
            continue

        f0, voiced_flag, _ = librosa.pyin(
            seg, fmin=fmin, fmax=fmax, sr=sr, hop_length=hop
        )
        voiced = f0[voiced_flag] if voiced_flag is not None else f0[~np.isnan(f0)]
        if voiced is None or len(voiced) == 0:
            continue
        pitch_hz = float(np.median(voiced))
        midi = hz_to_midi(pitch_hz)
        if midi is None or midi < 36 or midi > 96:
            continue
        rms = float(np.sqrt(np.mean(seg**2)))
        if rms < 0.02:
            continue
        notes.append(
            {
                "start": float(t_start),
                "end": float(t_end),
                "pitch": midi,
                "velocity": int(np.clip(rms * 180, 40, 127)),
            }
        )

    merged: list[dict] = []
    for n in notes:
        if (
            merged
            and merged[-1]["pitch"] == n["pitch"]
            and n["start"] - merged[-1]["end"] < 0.08
        ):
            merged[-1]["end"] = n["end"]
            merged[-1]["velocity"] = max(merged[-1]["velocity"], n["velocity"])
        else:
            merged.append(n)

    log(f"estratti {len(merged)} eventi, tempo ≈ {tempo:.1f} BPM")
    return merged, tempo


def french_touch_variation(notes: list[dict], rng: random.Random) -> list[dict]:
    """Variazione creativa: swing, transpose a blocchi, ghost ottava (French Touch)."""
    if not notes:
        return notes

    out: list[dict] = []
    transpose_block = 0
    block_counter = 0

    for i, n in enumerate(notes):
        note = dict(n)
        block_counter += 1
        if block_counter >= rng.randint(6, 14):
            block_counter = 0
            transpose_block = rng.choice([0, 0, 2, 3, 5, 7, -2, -3])

        note["pitch"] = int(np.clip(note["pitch"] + transpose_block, 36, 96))
        swing = 0.012 if i % 2 else -0.006
        note["start"] += swing + rng.uniform(-0.018, 0.018)
        note["end"] = note["start"] + (n["end"] - n["start"]) * rng.uniform(0.85, 1.15)
        note["velocity"] = int(np.clip(note["velocity"] + rng.randint(-18, 22), 35, 127))

        if rng.random() < 0.12:
            ghost = dict(note)
            ghost["pitch"] = int(np.clip(note["pitch"] + 12, 36, 108))
            ghost["velocity"] = max(28, note["velocity"] - 35)
            out.append(ghost)
        if rng.random() > 0.06:
            out.append(note)

    out.sort(key=lambda x: x["start"])
    return out


def seconds_to_ticks(seconds: float, tempo_bpm: float) -> int:
    return int(seconds * (tempo_bpm / 60.0) * TICKS_PER_BEAT)


def write_midi(notes: list[dict], tempo_bpm: float, sections: list[float], path: Path) -> None:
    mid = mido.MidiFile(ticks_per_beat=TICKS_PER_BEAT)
    track = mido.MidiTrack()
    mid.tracks.append(track)

    track.append(mido.MetaMessage("set_tempo", tempo=int(60_000_000 / tempo_bpm)))
    track.append(mido.MetaMessage("time_signature", numerator=4, denominator=4))
    track.append(mido.Message("program_change", program=81, channel=0))

    events: list[tuple[int, mido.Message]] = []
    for t_sec in sections:
        events.append(
            (
                seconds_to_ticks(t_sec, tempo_bpm),
                mido.MetaMessage("marker", text=f"sezione@{t_sec:.1f}s"),
            )
        )

    for n in notes:
        start_tick = seconds_to_ticks(n["start"], tempo_bpm)
        dur_tick = max(1, seconds_to_ticks(n["end"] - n["start"], tempo_bpm))
        events.append(
            (
                start_tick,
                mido.Message(
                    "note_on", note=n["pitch"], velocity=n["velocity"], channel=0
                ),
            )
        )
        events.append(
            (
                start_tick + dur_tick,
                mido.Message("note_off", note=n["pitch"], velocity=0, channel=0),
            )
        )

    events.sort(key=lambda x: x[0])
    last_tick = 0
    for abs_tick, msg in events:
        msg.time = max(0, abs_tick - last_tick)
        track.append(msg)
        last_tick = abs_tick
    track.append(mido.MetaMessage("end_of_track", time=1))
    mid.save(str(path))
    log(f"MIDI: {path.name}")


def biquad_lowpass(y: np.ndarray, sr: int, cutoff_hz: float) -> np.ndarray:
    nyq = sr / 2
    wn = np.clip(cutoff_hz / nyq, 0.001, 0.999)
    b, a = signal.butter(2, wn, btype="low")
    return signal.filtfilt(b, a, y)


def biquad_highpass(y: np.ndarray, sr: int, cutoff_hz: float) -> np.ndarray:
    nyq = sr / 2
    wn = np.clip(cutoff_hz / nyq, 0.001, 0.999)
    b, a = signal.butter(2, wn, btype="high")
    return signal.filtfilt(b, a, y)


def beat_envelope(length: int, sr: int, tempo_bpm: float, depth: float = 0.35) -> np.ndarray:
    beat_period = 60.0 / tempo_bpm
    t = np.arange(length) / sr
    phase = (t % beat_period) / beat_period
    return (1.0 - depth * np.exp(-phase * 14.0)).astype(np.float32)


def french_touch_master(y: np.ndarray, sr: int, tempo_bpm: float) -> np.ndarray:
    if y.ndim == 1:
        y = np.stack([y, y], axis=1)

    left = y[:, 0].astype(np.float64)
    right = y[:, 1].astype(np.float64)
    mono = (left + right) / 2.0
    n = len(mono)
    t = np.arange(n) / sr
    beats = 60.0 / tempo_bpm
    open_len = beats * 16
    cutoff = 400 + 7600 * np.clip(t / max(open_len, 1.0), 0, 1)

    block = sr * 2
    filtered = np.zeros_like(mono)
    for i in range(0, n, block):
        chunk = mono[i : i + block]
        if len(chunk) == 0:
            continue
        fc = float(np.mean(cutoff[i : i + len(chunk)]))
        filtered[i : i + len(chunk)] = biquad_lowpass(chunk, sr, fc)

    mono = 0.55 * filtered + 0.45 * mono
    mono = biquad_highpass(mono, sr, 35)
    mono = biquad_lowpass(mono, sr, 14000)

    nyq = sr / 2
    sos_low = signal.butter(2, 120 / nyq, btype="low", output="sos")
    sos_mid = signal.butter(2, [2500 / nyq, 5500 / nyq], btype="band", output="sos")
    low = signal.sosfilt(sos_low, mono)
    mid = signal.sosfilt(sos_mid, mono)
    mono = mono + 0.25 * low - 0.08 * mid

    drive = 1.35
    mono = np.tanh(mono * drive) / np.tanh(drive)
    mono *= beat_envelope(len(mono), sr, tempo_bpm, depth=0.32)

    delay_samples = int(0.012 * sr)
    right_out = np.roll(mono, delay_samples)
    left_out = mono.copy()
    width = 0.18
    side = (right_out - left_out) * width
    left_out = np.clip(left_out + side, -1, 1)
    right_out = np.clip(right_out - side, -1, 1)
    out = np.stack([left_out, right_out], axis=1)

    peak = np.max(np.abs(out))
    if peak > 1e-6:
        out = out / peak * 0.95
    return np.tanh(out * 1.05).astype(np.float32)


def main() -> int:
    if not REFERENCE.is_file():
        log(f"ERRORE: manca {REFERENCE.name}")
        return 1

    rng = random.Random(SEED)
    with tempfile.TemporaryDirectory(prefix="midiverse_gen_") as tmp:
        tmp_mono = Path(tmp) / "ref_mono.wav"
        tmp_stereo = Path(tmp) / "ref_stereo.wav"

        log("decodifica reference.mp3 …")
        decode_mp3_to_wav(REFERENCE, tmp_mono, stereo=False)
        decode_mp3_to_wav(REFERENCE, tmp_stereo, stereo=True)

        y_analysis, _ = librosa.load(str(tmp_mono), sr=ANALYSIS_SR, mono=True)
        tempo = detect_tempo(y_analysis, ANALYSIS_SR)
        sections = detect_sections(y_analysis, ANALYSIS_SR)

        log("estrazione struttura MIDI (onset + pitch) …")
        notes, tempo = extract_notes(y_analysis, ANALYSIS_SR, tempo)
        if not notes:
            log("fallback: griglia ritmica")
            duration = len(y_analysis) / ANALYSIS_SR
            step = 60.0 / tempo / 2
            t = 0.0
            while t < duration * 0.9:
                notes.append(
                    {
                        "start": t,
                        "end": t + step * 0.8,
                        "pitch": 60 + (len(notes) % 7),
                        "velocity": 72,
                    }
                )
                t += step

        varied = french_touch_variation(notes, rng)
        write_midi(varied, tempo, sections, MIDI_OUT)

        log("master French Touch → WAV …")
        y_stereo, file_sr = sf.read(str(tmp_stereo))
        if file_sr != OUTPUT_SR:
            y_stereo = librosa.resample(
                y_stereo.T if y_stereo.ndim > 1 else y_stereo,
                orig_sr=file_sr,
                target_sr=OUTPUT_SR,
            ).T
            file_sr = OUTPUT_SR

        mastered = french_touch_master(y_stereo, file_sr, tempo)
        sf.write(str(WAV_OUT), mastered, file_sr, subtype="PCM_16")

    log("completato.")
    log(f"  → {MIDI_OUT.name}")
    log(f"  → {WAV_OUT.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
