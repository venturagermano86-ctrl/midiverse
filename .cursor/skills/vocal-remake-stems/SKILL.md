---
name: vocal-remake-stems
description: Remake vocal stems from a reference — different words, same duration and note grid, slightly different voice, same mood. Use for Vocal Studio sistema nostro without paid ElevenLabs.
---

# Vocal remake stems (sistema nostro)

## Goal
From a YouTube/file reference, produce **original** vocal stems:
- **dry** (call) + **wet** (response) + **mix**
- **parole diverse** (never copy the source lyric)
- **stessa durata** (ffmpeg lock)
- **stesso schema di note** (scale of chosen key + fixed contour)
- **voce leggermente diversa** (neighbor voice)
- **stesso mood** (pack from title/artist)

## Hard locks
- No celebrity voice clones.
- No ripping copyrighted vocal stems for redistribution as “the same voice”.
- Free-first: Edge TTS → optional ElevenLabs → Google last.
- GV: call-response ≥ 2 words; dry + Delay Designer–style wet; no Stereo Delay on vox.

## Pipeline
1. Meta/mood from oEmbed or filename (`analyzeFromMeta`).
2. `planRemake` → new phrases, neighbor voices, note contour.
3. `buildStemBundle` → render phrases, pitch to notes, wet character, duration lock.
4. Return JSON stems (UI) or ZIP (`stem-dry.mp3`, `stem-wet.mp3`, `stem-mix.mp3`).

## Phase 2 (local / heavier)
True F0 lock from uploaded audio: Demucs vocal stem → Basic Pitch MIDI → sing new lyrics on MIDI. Keep commercial vocals original.

## When to use
User asks for remake, stems, “stesse note parole diverse”, “sistema nostro”, or refuses paid TTS.
