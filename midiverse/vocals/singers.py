"""Personaggi-cantanti per tracce house Germano Ventura."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Singer:
    id: str
    name: str
    role: str  # call | response | either
    # Centro di tessitura in Hz (voce cantata, non parlata)
    f0_center: float
    # Brightness formanti (1.0 = neutro)
    brightness: float
    # Vibrato depth in cents
    vibrato_cents: float
    vibrato_hz: float
    # Breath / noise mix 0..1
    breath: float
    # Amp scale
    gain: float
    vibe: str


SINGERS: dict[str, Singer] = {
    "mira": Singer(
        id="mira",
        name="Mira",
        role="call",
        f0_center=220.0,  # A3
        brightness=1.12,
        vibrato_cents=18.0,
        vibrato_hz=5.2,
        breath=0.08,
        gain=0.85,
        vibe="warm club lead — call",
    ),
    "vale": Singer(
        id="vale",
        name="Vale",
        role="response",
        f0_center=196.0,  # G3
        brightness=1.05,
        vibrato_cents=14.0,
        vibrato_hz=4.8,
        breath=0.12,
        gain=0.82,
        vibe="breathy answer — response",
    ),
    "sol": Singer(
        id="sol",
        name="Sol",
        role="call",
        f0_center=246.9,  # B3
        brightness=1.22,
        vibrato_cents=12.0,
        vibrato_hz=5.5,
        breath=0.06,
        gain=0.8,
        vibe="bright terrace call",
    ),
    "nilo": Singer(
        id="nilo",
        name="Nilo",
        role="response",
        f0_center=146.8,  # D3
        brightness=0.92,
        vibrato_cents=10.0,
        vibrato_hz=4.4,
        breath=0.1,
        gain=0.88,
        vibe="low dock response",
    ),
}


def get_singer(singer_id: str) -> Singer:
    key = singer_id.strip().lower()
    if key not in SINGERS:
        known = ", ".join(SINGERS)
        raise KeyError(f"Cantante sconosciuto: {singer_id}. Usa: {known}")
    return SINGERS[key]


def list_singers() -> list[Singer]:
    return list(SINGERS.values())
