#!/usr/bin/env bash
# Install the 5 senior-dev plugins (Agent Skills, Context7, Graphify, 21st, Strix)
# for Cursor (global) and optionally Claude Code.
set -euo pipefail
export PATH="$HOME/.local/bin:$PATH"

echo "==> Agent Skills + Strix + Context7 + 21st (Cursor global skills)"
npx --yes skills add addyosmani/agent-skills -g -a cursor -y --copy
npx --yes skills add usestrix/strix -g -a cursor -y --copy
npx --yes skills add upstash/context7 -g -a cursor -y --copy -s context7-mcp
npx --yes skills add 21st-dev/skill -g -a cursor -y --copy --all

echo "==> Graphify CLI + Cursor rule/skill"
python3 -m pip install -q --user graphifyy || pip install -q graphifyy
graphify install --platform cursor || true
mkdir -p "$HOME/.cursor/skills/graphify"
python3 - <<'PY'
from pathlib import Path
import graphify
src = Path(graphify.__file__).parent / "skill.md"
dst = Path.home() / ".cursor/skills/graphify/SKILL.md"
dst.parent.mkdir(parents=True, exist_ok=True)
dst.write_text(src.read_text())
print("Wrote", dst)
PY

echo "==> MCP stubs in ~/.cursor/mcp.json (merge if you already have servers)"
mkdir -p "$HOME/.cursor"
MCP="$HOME/.cursor/mcp.json"
if [ ! -f "$MCP" ]; then
  cat > "$MCP" <<'JSON'
{
  "mcpServers": {
    "context7": { "url": "https://mcp.context7.com/mcp" },
    "21st": {
      "url": "https://mcp.21st.dev/mcp",
      "headers": { "x-api-key": "${API_KEY_21ST}" }
    }
  }
}
JSON
else
  echo "Existing $MCP left unchanged — add context7 + 21st manually if missing."
fi

echo "==> Optional: Strix CLI (needs Docker + LLM key)"
if command -v docker >/dev/null 2>&1; then
  curl -sSL https://strix.ai/install | bash || true
else
  echo "Docker not found; skipping Strix CLI. Skills still installed."
fi

echo "Done. For Cloud Agents: enable Sync Skills, and add Context7/21st MCP at cursor.com/agents."
echo "Get 21st key: https://21st.dev/mcp"

echo "==> House vocals skills (Vocaler + ElevenLabs music + sync)"
npx --yes skills add Vocaler-AI/music-skills -g -a cursor -y --copy
npx --yes skills add elevenlabs/skills -g -a cursor -y --copy -s music
echo "Set ELEVENLABS_API_KEY for audio generation. Text hooks work without it via gv-house-vocals."
