---
name: melodic-house-vocals
description: Generate melodic, human-sounding house/techno vocal hooks (cantati) — sung cadence, not robotic TTS. Use for Vocal Studio, Germano Ventura tracks, and club vocal stems.
---

# Melodic house vocals (cantati)

## Goal
Vocal lines that feel **sung / human**, not flat robot speech. Usable on tracks intended for release when using a licensed paid voice engine.

## Hard locks (GV)
- Call-response ≥ 2 words each side.
- Two voices max: dry + Delay Designer wet. One voice per track.
- No Stereo Delay on vox (synth/pad/stab only).
- No celebrity voice clones without rights.
- No zombi stacks unless Germano asks.

## Engine priority (most human → least)
1. **ElevenLabs paid** (`ELEVENLABS_API_KEY`) with model `eleven_v3` and tags:
   - `[sings][softly][drawn out] <short line>`
   - One short line per request (under ~120 chars). Concatenate lines.
   - Prefer Voice Library / singer-style voices, not celebrity clones.
2. Edge neural TTS slow rate (~−20% / −25%) only as preview.
3. Google Translate TTS = **demo only** — never call it “cantato” or release-ready.

## Phrase writing for melody
- Short English club lines: 3–7 words.
- Natural words — **never** fake elongations like `sooooft throuuugh` (sounds robotic).
- Vowels open: night, glow, home, hold, soft, fall, light, wave.
- Call then answer: dry asks / wet answers.
- Prefer mantra-minimal (Villalobos mood) or soul chest (Nina mood) — original words only.

## Vocal Studio behavior
- Mark `releaseReady` only when engine is ElevenLabs on a paid plan path.
- UI must say demo is not for Beatport/streaming publish.
- YouTube reference = mood match only (tempo/timbre/title), never lyric/voice clone.

## When the user asks for “più cantato / più umano”
1. Ensure ElevenLabs key is bound for the app.
2. Switch generate path to short `[sings]` lines.
3. Soften rate, raise style, keep stability low (~0.25).
4. Do not reintroduce celebrity clones or copyrighted lyrics.
