"""
FastAPI — entrypoint minimale MIDIVERSE.

Espone health check e router /process (accodamento job).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.routes.process import router as process_router
from backend.app.core.config import settings

app = FastAPI(
    title="MIDIVERSE API",
    version="0.1.0",
    description="Backend audio morphing — upload e coda elaborazione",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(process_router)


@app.get("/health")
def health():
    """Liveness — usato da Docker healthcheck."""
    return {"status": "ok", "service": "api"}


@app.get("/health/ready")
def readiness():
    """
    Readiness — verifica che Redis sia raggiungibile (broker Celery).
    Utile per validare le connessioni tra servizi.
    """
    try:
        import redis

        client = redis.from_url(settings.redis_url, socket_connect_timeout=2)
        client.ping()
        return {"status": "ok", "redis": "connected"}
    except Exception as exc:
        return {"status": "degraded", "redis": "unavailable", "detail": str(exc)}
