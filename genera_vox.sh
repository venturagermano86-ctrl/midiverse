#!/bin/bash
# Genera due cantanti house (call + response) dry WAV per Logic.
set -euo pipefail
cd "$(dirname "$0")"
python3 -m pip install -q -r requirements.txt
python3 pipeline_vocals.py "$@"
