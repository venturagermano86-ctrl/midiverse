"""
Celery — configurazione coda (broker e backend su Redis).

Avvio worker:
  celery -A backend.app.workers.celery_app worker --loglevel=info
"""

from celery import Celery

from backend.app.core.config import settings

celery_app = Celery("midiverse")

celery_app.conf.update(
    # Broker / risultati (stessi host Redis, DB diversi — vedi docker-compose)
    broker_url=settings.celery_broker_url,
    result_backend=settings.celery_result_backend,
    # Task
    include=["backend.app.workers.tasks"],
    task_track_started=True,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    # Connessione robusta all'avvio (utile con depends_on in Docker)
    broker_connection_retry_on_startup=True,
    result_expires=3600,
)

# Alias per compatibilità con `celery -A backend.app.workers.celery_app`
app = celery_app
