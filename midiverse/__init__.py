"""
MIDIVERSE — Audio Morphing Strutturale condizionato da Source Reference.
"""

from midiverse.analysis import AudioTemplate, StructuralLock, analyze_template
from midiverse.morph_pipeline import StructuralMorphConfig, run_structural_morph
from midiverse.pipeline import TimbrePipelineConfig, run_timbre_pipeline

__all__ = [
    "AudioTemplate",
    "StructuralLock",
    "analyze_template",
    "StructuralMorphConfig",
    "run_structural_morph",
    "TimbrePipelineConfig",
    "run_timbre_pipeline",
]
