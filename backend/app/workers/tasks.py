"""Task Celery — wrapper pipeline_morph / pipeline_timbre (fase 2)."""

from backend.app.workers.celery_app import celery_app


@celery_app.task(name="midiverse.process")
def process_task(job_id: str, source_path: str, output_path: str, mode: str = "morph"):
    """
    TODO: invocare midiverse.morph_pipeline o midiverse.pipeline
    e aggiornare stato job in Redis.
    """
    raise NotImplementedError("Worker pipeline — implementazione fase 2")
