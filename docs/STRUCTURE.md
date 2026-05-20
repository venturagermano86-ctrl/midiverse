# MIDIVERSE — Struttura full-stack

```
MIDIVERSE/
├── Dockerfile                 # Immagine unica: Python, ffmpeg, Demucs, pipeline
├── docker-compose.yml         # redis + api + worker + frontend
├── setup.sh                   # venv locale + dipendenze + modelli
├── .env.example
│
├── requirements.txt           # Analisi audio + pipeline (librosa, scipy…)
├── requirements-ml.txt        # ML: torch, demucs, diffusers (opzionale)
│
├── midiverse/                 # Libreria condivisa (logica morph / analisi)
│   ├── analysis.py
│   ├── morph_pipeline.py
│   └── …
├── pipeline_morph.py          # CLI morph (richiama midiverse)
├── pipeline_timbre.py         # CLI timbre
│
├── backend/                   # FastAPI + Celery
│   ├── requirements.txt       # API + include requirements root
│   └── app/
│       ├── main.py            # Entrypoint ASGI
│       ├── api/
│       │   └── routes/
│       │       └── process.py # POST /process
│       ├── core/
│       │   └── config.py      # Settings (Redis, path, CORS)
│       ├── services/          # (fase 2) wrapper pipeline
│       └── workers/
│           ├── celery_app.py
│           └── tasks.py       # Job in coda
│
└── frontend/                  # Next.js + Tailwind
    ├── package.json
    ├── next.config.mjs
    ├── tailwind.config.ts
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx           # UI upload + stato (fase 2)
    │   └── globals.css
    ├── components/              # Upload, Status, Player (fase 2)
    └── lib/
        └── api.ts             # Client verso /process
```

## Flusso richiesta

1. `POST /process` → salva file, crea `job_id`, accoda Celery
2. `GET /jobs/{job_id}` → stato (`queued` | `processing` | `completed` | `failed`)
3. `GET /jobs/{job_id}/events` → SSE progresso (fase 2)
4. `GET /jobs/{job_id}/download` → WAV risultato (fase 2)
