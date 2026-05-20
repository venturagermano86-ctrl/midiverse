"""
Fase 1 — Analisi del Template: BPM, time signature, beat grid, sezioni nominate.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path

import librosa
import numpy as np

# Template accordi (12 pitch class)
_CHORD_TEMPLATES: dict[str, np.ndarray] = {}
_ROOTS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
_QUALITIES = {
    "maj": [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],
    "min": [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0],
    "7": [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    "m7": [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
}
for i, root in enumerate(_ROOTS):
    for qual, pattern in _QUALITIES.items():
        _CHORD_TEMPLATES[f"{root}:{qual}"] = np.roll(np.array(pattern, dtype=np.float32), i)

SECTION_LABELS = ("Intro", "Verso", "Drop", "Outro", "Bridge", "Chorus")


@dataclass
class HarmonicEvent:
    start: float
    end: float
    chord: str
    confidence: float


@dataclass
class Section:
    index: int
    start: float
    end: float
    label: str


@dataclass
class AudioTemplate:
    """
    Dati quantitativi estratti dalla reference (Structural Lock / Template).
    """

    source_path: str
    duration_s: float
    sample_rate: int
    bpm: float
    time_signature: tuple[int, int]
    beat_times: list[float]
    downbeat_times: list[float]
    sections: list[Section]
    harmony: list[HarmonicEvent]
    metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        d = asdict(self)
        d["time_signature"] = list(self.time_signature)
        return d

    def save_json(self, path: Path) -> None:
        path.write_text(json.dumps(self.to_dict(), indent=2), encoding="utf-8")


# Alias retrocompatibile
StructuralLock = AudioTemplate


def _best_chord(chroma_vec: np.ndarray) -> tuple[str, float]:
    chroma_vec = chroma_vec / (np.linalg.norm(chroma_vec) + 1e-8)
    best_name, best_score = "N", 0.0
    for name, template in _CHORD_TEMPLATES.items():
        t = template / (np.linalg.norm(template) + 1e-8)
        score = float(np.dot(chroma_vec, t))
        if score > best_score:
            best_score = score
            best_name = name.replace(":", "")
    if best_score < 0.45:
        return "N", best_score
    return best_name, best_score


def detect_tempo_and_beats(y: np.ndarray, sr: int) -> tuple[float, np.ndarray]:
    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, units="frames")
    if hasattr(tempo, "__len__"):
        tempo = float(tempo[0])
    beat_times = librosa.frames_to_time(beat_frames, sr=sr)
    return float(np.clip(tempo, 40, 220)), beat_times


def detect_time_signature(
    y: np.ndarray,
    sr: int,
    beat_times: np.ndarray,
) -> tuple[int, int]:
    """Stima 3/4 vs 4/4 dalla periodicità dell'onset strength."""
    if len(beat_times) < 6:
        return (4, 4)

    oenv = librosa.onset.onset_strength(y=y, sr=sr)
    ac = librosa.autocorrelate(oenv, max_size=len(oenv) // 2)
    beat_interval = np.median(np.diff(beat_times)) if len(beat_times) > 1 else 0.5
    beats_per_bar_candidates = [3, 4, 6]

    best_beats, best_score = 4, -np.inf
    for bpb in beats_per_bar_candidates:
        bar_dur = beat_interval * bpb
        if bar_dur <= 0:
            continue
        frames_per_bar = int(bar_dur * sr / 512)
        if frames_per_bar < 2 or frames_per_bar >= len(ac):
            continue
        score = float(ac[frames_per_bar]) if frames_per_bar < len(ac) else 0.0
        if score > best_score:
            best_score = score
            best_beats = bpb

    if best_beats in (3, 6):
        return (3, 4) if best_beats == 3 else (6, 8)
    return (4, 4)


def compute_downbeats(beat_times: list[float], beats_per_bar: int) -> list[float]:
    if not beat_times:
        return []
    return [beat_times[i] for i in range(0, len(beat_times), beats_per_bar)]


def _section_features(y: np.ndarray, sr: int, start: float, end: float) -> dict[str, float]:
    s0, s1 = int(start * sr), int(end * sr)
    seg = y[s0:s1]
    if len(seg) < sr // 4:
        return {"rms": 0.0, "centroid": 0.0, "flux": 0.0}
    rms = float(np.sqrt(np.mean(seg**2)))
    cent = float(np.mean(librosa.feature.spectral_centroid(y=seg, sr=sr)))
    flux = float(np.mean(librosa.onset.onset_strength(y=seg, sr=sr)))
    return {"rms": rms, "centroid": cent, "flux": flux}


def label_sections(
    raw_sections: list[Section],
    y: np.ndarray,
    sr: int,
    duration: float,
) -> list[Section]:
    """
    Assegna etichette Intro / Verso / Drop / Outro (e Bridge/Chorus se servono).
    """
    if not raw_sections:
        return [Section(0, 0.0, duration, "Intro")]

    feats = [_section_features(y, sr, s.start, s.end) for s in raw_sections]
    n = len(raw_sections)
    energies = [f["rms"] for f in feats]

    labels = ["Verso"] * n
    labels[0] = "Intro"
    labels[-1] = "Outro"

    if n >= 3:
        middle_idx = list(range(1, n - 1))
        if middle_idx:
            drop_i = max(middle_idx, key=lambda i: energies[i])
            labels[drop_i] = "Drop"
            for i in middle_idx:
                if i != drop_i:
                    if energies[i] > np.median(energies) * 1.1:
                        labels[i] = "Chorus"
                    elif i == drop_i - 1 or i == drop_i + 1:
                        labels[i] = "Bridge" if labels[i] == "Verso" else labels[i]

    labeled: list[Section] = []
    for i, sec in enumerate(raw_sections):
        labeled.append(
            Section(index=i, start=sec.start, end=sec.end, label=labels[i])
        )
    return labeled


def detect_sections(y: np.ndarray, sr: int, duration: float, n_sections: int = 6) -> list[Section]:
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    k = int(np.clip(n_sections, 2, 10))
    bounds = librosa.segment.agglomerative(chroma, k=k)
    bound_times = [0.0] + [float(t) for t in librosa.frames_to_time(bounds, sr=sr)] + [duration]
    raw: list[Section] = []
    for i in range(len(bound_times) - 1):
        start, end = bound_times[i], bound_times[i + 1]
        if end - start < 0.25:
            continue
        raw.append(Section(index=len(raw), start=start, end=end, label=""))
    if not raw:
        raw = [Section(0, 0.0, duration, "")]
    return label_sections(raw, y, sr, duration)


def detect_harmony(
    y: np.ndarray,
    sr: int,
    beat_times: np.ndarray,
    hop_length: int = 512,
) -> list[HarmonicEvent]:
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=hop_length)
    if len(beat_times) < 2:
        duration = len(y) / sr
        chord, conf = _best_chord(np.mean(chroma, axis=1))
        return [HarmonicEvent(0.0, duration, chord, conf)]

    events: list[HarmonicEvent] = []
    for i in range(len(beat_times) - 1):
        t0, t1 = float(beat_times[i]), float(beat_times[i + 1])
        f0 = librosa.time_to_frames(t0, sr=sr, hop_length=hop_length)
        f1 = max(f0 + 1, librosa.time_to_frames(t1, sr=sr, hop_length=hop_length))
        seg = chroma[:, f0:f1]
        if seg.size == 0:
            continue
        chord, conf = _best_chord(np.mean(seg, axis=1))
        if events and events[-1].chord == chord:
            events[-1].end = t1
            events[-1].confidence = max(events[-1].confidence, conf)
        else:
            events.append(HarmonicEvent(t0, t1, chord, conf))

    t_last = float(beat_times[-1])
    duration = len(y) / sr
    if duration - t_last > 0.05:
        f0 = librosa.time_to_frames(t_last, sr=sr, hop_length=hop_length)
        seg = chroma[:, f0:]
        if seg.size > 0:
            chord, conf = _best_chord(np.mean(seg, axis=1))
            events.append(HarmonicEvent(t_last, duration, chord, conf))
    return events


def analyze_template(
    y: np.ndarray,
    sr: int,
    source_path: str | Path,
    n_sections: int = 6,
) -> AudioTemplate:
    """Fase 1 completa: estrazione template quantitativo."""
    y = librosa.util.normalize(y)
    duration = len(y) / sr
    bpm, beat_times = detect_tempo_and_beats(y, sr)
    time_sig = detect_time_signature(y, sr, beat_times)
    downbeats = compute_downbeats([float(t) for t in beat_times], time_sig[0])
    sections = detect_sections(y, sr, duration, n_sections=n_sections)
    harmony = detect_harmony(y, sr, beat_times)

    return AudioTemplate(
        source_path=str(source_path),
        duration_s=duration,
        sample_rate=sr,
        bpm=bpm,
        time_signature=time_sig,
        beat_times=[float(t) for t in beat_times],
        downbeat_times=downbeats,
        sections=sections,
        harmony=harmony,
        metadata={
            "analysis_hop": 512,
            "beats_per_bar": time_sig[0],
            "section_labels": list(SECTION_LABELS),
        },
    )


def analyze_reference(
    y: np.ndarray,
    sr: int,
    source_path: str | Path,
    n_sections: int = 6,
) -> AudioTemplate:
    """Alias per retrocompatibilità."""
    return analyze_template(y, sr, source_path, n_sections=n_sections)
