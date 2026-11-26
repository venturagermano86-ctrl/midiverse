---
name: elevenlabs-sung-hooks
description: Produce short sung club hooks via ElevenLabs eleven_v3 audio tags ([sings], [softly], [drawn out]) for house/techno vocal stems with commercial licensing.
---

# ElevenLabs sung hooks

## When to use
User wants melodic/human cantati for house, techno, minimal, afro — and a voice they can release commercially.

## Requirements
- `ELEVENLABS_API_KEY` on a **paid** ElevenLabs plan (commercial license per their ToS).
- Free / demo engines are preview-only.

## API pattern
- Endpoint: `POST /v1/text-to-speech/{voice_id}`
- Prefer `model_id: "eleven_v3"` then fall back to `eleven_multilingual_v2`.
- Text examples:
  - `[sings][softly] soft through the night`
  - `[sings][drawn out] stay in the glow`
  - `[sings][softly] hold me closer`
- Voice settings starting point: stability `0.25`, similarity `0.85`, style `0.7+`.
- Generate **one short line per call**, then concat MP3s (keeps melody).

## Do / Don't
- Do: licensed Voice Library / original AI singers.
- Do: original English club phrases.
- Don't: clone famous singers or paste copyrighted lyrics.
- Don't: one giant paragraph with `[sings]` — melody collapses.

## Output
- Dry + wet call-response stems when possible.
- Label release-ready only for ElevenLabs paid path.
