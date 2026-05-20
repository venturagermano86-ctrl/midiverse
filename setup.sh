#!/usr/bin/env bash
# =============================================================================
# MIDIVERSE — setup ambiente locale
#
# 1. Crea virtualenv Python (.venv)
# 2. Installa dipendenze da requirements.txt (+ backend per API/Celery)
# 3. Prepara cartelle upload/output
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

log() { echo "[setup] $*"; }
die() { echo "[setup] ERRORE: $*" >&2; exit 1; }

# --- Prerequisiti ---
command -v python3 >/dev/null || die "python3 non trovato"
python3 -c "import venv" 2>/dev/null || die "modulo venv non disponibile"

# --- Virtual environment ---
VENV="$ROOT/.venv"
if [[ ! -d "$VENV" ]]; then
  log "Creazione virtualenv in .venv …"
  python3 -m venv "$VENV"
fi

# shellcheck disable=SC1091
source "$VENV/bin/activate"

log "Aggiornamento pip …"
pip install --upgrade pip

# --- Dipendenze (ordine: base → ML → backend API/Celery) ---
if [[ ! -f "$ROOT/requirements.txt" ]]; then
  die "manca requirements.txt nella root del progetto"
fi

log "Installazione requirements.txt (analisi audio / pipeline) …"
pip install -r "$ROOT/requirements.txt"

if [[ -f "$ROOT/requirements-ml.txt" ]]; then
  log "Installazione requirements-ml.txt (torch, demucs) …"
  pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
  pip install -r "$ROOT/requirements-ml.txt"
fi

if [[ -f "$ROOT/backend/requirements.txt" ]]; then
  log "Installazione backend/requirements.txt (FastAPI, Celery, Redis) …"
  pip install -r "$ROOT/backend/requirements.txt"
fi

# --- Directory di lavoro ---
log "Directory upload/output …"
mkdir -p /tmp/midiverse/uploads /tmp/midiverse/outputs

# --- Env ---
if [[ -f "$ROOT/.env.example" ]] && [[ ! -f "$ROOT/.env" ]]; then
  cp "$ROOT/.env.example" "$ROOT/.env"
  log "Creato .env da .env.example"
fi

export PYTHONPATH="$ROOT"

log "Setup Python completato."
echo ""
echo "Verifica connessioni (Redis deve essere avviato):"
echo "  redis-server"
echo "  source .venv/bin/activate"
echo "  uvicorn backend.app.main:app --reload --port 8000"
echo "  celery -A backend.app.workers.celery_app worker --loglevel=info"
echo ""
echo "Oppure tutto lo stack Docker:"
echo "  docker compose up --build"
echo ""
echo "  API:       http://localhost:8000/health"
echo "  Readiness: http://localhost:8000/health/ready"
echo "  Docs:      http://localhost:8000/docs"
