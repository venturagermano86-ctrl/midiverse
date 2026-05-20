"""
POST /process — accoda elaborazione audio (implementazione job in fase 2).
"""

from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from backend.app.core.config import settings

router = APIRouter(tags=["process"])


@router.post("/process")
async def process_audio(
    file: UploadFile = File(...),
    mode: str = Form(default="morph"),
):
    """
    Riceve la Source Reference, persiste il file e mette il job in coda.
    Restituisce job_id + stato iniziale.
    """
    if mode not in ("morph", "timbre"):
        raise HTTPException(400, detail="mode deve essere 'morph' o 'timbre'")

    data = await file.read()
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(data) > max_bytes:
        raise HTTPException(413, detail=f"File troppo grande (max {settings.max_upload_mb} MB)")

    job_id = str(uuid.uuid4())
    suffix = Path(file.filename or "upload.wav").suffix.lower() or ".wav"
    upload_path = settings.upload_dir / f"{job_id}{suffix}"
    upload_path.write_bytes(data)

    # TODO (fase 2): process_audio_task.delay(job_id, ...)
    return {
        "job_id": job_id,
        "status": "queued",
        "message": "Job accodato",
        "mode": mode,
        "status_url": f"/jobs/{job_id}",
    }


@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    """Stato job — stub fino a integrazione Redis/Celery."""
    # TODO (fase 2): job_store.get(job_id)
    return {
        "job_id": job_id,
        "status": "queued",
        "progress": 0,
        "message": "In attesa di implementazione worker",
    }
