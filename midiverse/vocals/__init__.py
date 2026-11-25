"""Cantanti house — voci dry call/response per Logic (Delay Designer sul wet)."""

from midiverse.vocals.pipeline import VocalJob, generate_pair, list_singers
from midiverse.vocals.singers import SINGERS, Singer

__all__ = [
    "SINGERS",
    "Singer",
    "VocalJob",
    "generate_pair",
    "list_singers",
]
