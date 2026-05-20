# =============================================================================
# MIDIVERSE — Dockerfile unico (ambiente elaborazione audio + API)
# Include: ffmpeg, pip, librosa/DSP, Demucs, pipeline midiverse/
# =============================================================================
FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app

# --- Sistema: ffmpeg per decode/encode audio ---
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# --- Dipendenze Python ---
COPY requirements.txt requirements-ml.txt ./
COPY backend/requirements.txt ./backend/requirements.txt

RUN pip install --upgrade pip && \
    pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu && \
    pip install -r backend/requirements.txt

# --- Pre-download modello Demucs (evita download al primo job) ---
RUN python -c "from demucs.pretrained import get_model; get_model('htdemucs')"

# --- Codice applicazione ---
COPY midiverse/ ./midiverse/
COPY pipeline_morph.py pipeline_timbre.py ./
COPY backend/ ./backend/

RUN mkdir -p /tmp/midiverse/uploads /tmp/midiverse/outputs

EXPOSE 8000

# Override in docker-compose per il worker Celery
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
