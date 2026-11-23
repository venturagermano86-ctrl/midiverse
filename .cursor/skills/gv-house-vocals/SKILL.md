---
name: gv-house-vocals
description: Generate Germano Ventura house vocal hooks (cantati) as call-response phrases, dual-voice layout, and AI generation prompts. Use when Germano asks for cantati, vocals, vox, hooks, toplines, or lyrics for a house track; or when building a new GV house demo that needs sung parts.
---

# Germano Ventura — house cantati

House tracks always need vocals. Produce **short club hooks**, not full verse essays.

## Hard locks
- **Call-response ≥ 2 words** each side (A answers B).
- **Two voices max**: Voice A dry/fixed + Voice B Delay Designer wet. Each voice = **one track only**.
- **No zombi** (undead/robot spoken stacks) unless Germano asks.
- Prefer **English or Italian** club English: 2–6 words per hit, easy to chop.
- Sit behind the groove — hooks that can enter/exit in 8-bar cells.
- Never put Stereo Delay (`GV 1-4 Dotted Stereo`) on vox (synth/pad/stab only).

## Workflow (every request)
1. Ask only if BPM/key/title are totally missing; otherwise infer from context or pick a working house default (122–126 BPM).
2. Write **3–5 hook sets**. Each set:
   - Title / vibe (one line)
   - Voice A (dry): call phrase(s)
   - Voice B (wet): response phrase(s)
   - Placement: which 8-bar cells (enter/exit)
3. Also emit a **generation prompt** via `music-prompt-engineer` style for ElevenLabs Music / ACE-Step / Suno — **vocals only or vocal+minimal bed**, house, tempo, dry call / wet response feel.
4. If audio generation is available (`music` ElevenLabs skill + API key), generate dry takes; otherwise stop at text + prompt and tell Germano where to paste it.
5. Delivery naming: phrases tied to track title; never overwrite keeper vocal files unless he says `sovrascrivi`.

## Phrase style
- Imperative / body / night / gate / mark / spin / hold / cut — club verbs.
- Strong vowels on downbeats; avoid tongue-twisters.
- Example shape (not to copy forever):
  - A: "Hold the mark"
  - B: "Don't let go"
  - A: "Spin the gate"
  - B: "Open it wide"

## Logic layout reminder
- Track `Vox Dry` — Voice A, no delay plugin from the synth lock.
- Track `Vox Wet` — Voice B only through Delay Designer (not Stereo Delay).
- Mute/enter by 8-bar cells with the hats/clap arrangement, not static forever.

## Companion skills
- `hook-writer`, `lyrics-writer`, `chorus-builder`, `melody-writer`, `prosody-checker`
- `music-prompt-engineer`, `ai-song-formatter`, ElevenLabs `music`
