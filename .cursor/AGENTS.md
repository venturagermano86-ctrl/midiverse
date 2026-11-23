# Midiverse agent notes

## Senior-dev plugins
Agent Skills, Context7, Graphify, 21st, Strix under `.cursor/skills/`.
MCP stubs: `.cursor/mcp.json` (Context7 + 21st). Set `API_KEY_21ST` for 21st.

## House vocals (Germano)
- Custom lock: `gv-house-vocals` (call-response ≥2 words, dual dry + Delay Designer wet).
- Text/hooks: Vocaler skills (`hook-writer`, `lyrics-writer`, `music-prompt-engineer`, …).
- Audio when keyed: ElevenLabs `music` skill (`ELEVENLABS_API_KEY`).
- Reinstall machine-wide: `bash scripts/install-senior-dev-plugins.sh` and `npx skills add Vocaler-AI/music-skills -g -a cursor -y --copy`
