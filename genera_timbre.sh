#!/bin/bash
# Variazione timbrica structure-preserving da Source Reference
set -euo pipefail
cd "$(dirname "$0")"
python3 -m pip install -q -r requirements.txt
python3 pipeline_timbre.py "$@"
