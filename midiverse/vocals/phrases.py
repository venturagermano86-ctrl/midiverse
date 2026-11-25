"""Frasi house call/response — ogni parte ≥ 2 parole (lock Germano)."""

from __future__ import annotations

from dataclasses import dataclass
import random


@dataclass(frozen=True)
class CallResponse:
    id: str
    call: str
    response: str
    mood: str


# Tutte le parti hanno almeno 2 parole.
PHRASE_BANK: list[CallResponse] = [
    CallResponse("hold-spin", "hold the mark", "spin the gate", "club lock"),
    CallResponse("keep-moving", "keep it moving", "don't you stop", "rolling"),
    CallResponse("feel-night", "feel the night", "take me higher", "peak"),
    CallResponse("open-floor", "open the floor", "let it ride", "terrace"),
    CallResponse("wait-drop", "wait for the drop", "bring it back", "build"),
    CallResponse("body-work", "body on the floor", "work it out", "groove"),
    CallResponse("deep-pulse", "deep in the pulse", "hold that line", "deep"),
    CallResponse("light-fire", "light up the fire", "burn it slow", "warm"),
    CallResponse("come-closer", "come a little closer", "stay right here", "intimate"),
    CallResponse("run-away", "don't you run away", "stay with me", "hook"),
    CallResponse("midnight-call", "midnight on the line", "answer the call", "late"),
    CallResponse("salt-water", "salt on the water", "ride the wave", "coast"),
]


def validate_phrase(text: str) -> str:
    words = [w for w in text.strip().split() if w]
    if len(words) < 2:
        raise ValueError(f"Serve almeno 2 parole (call-response lock): {text!r}")
    return " ".join(words).lower()


def get_pair(pair_id: str | None = None, rng: random.Random | None = None) -> CallResponse:
    rng = rng or random.Random()
    if pair_id:
        for p in PHRASE_BANK:
            if p.id == pair_id:
                return p
        known = ", ".join(p.id for p in PHRASE_BANK)
        raise KeyError(f"Frase sconosciuta: {pair_id}. Usa: {known}")
    return rng.choice(PHRASE_BANK)


def custom_pair(call: str, response: str, pair_id: str = "custom") -> CallResponse:
    return CallResponse(
        id=pair_id,
        call=validate_phrase(call),
        response=validate_phrase(response),
        mood="custom",
    )
