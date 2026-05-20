#!/bin/bash
# Un solo passaggio: installa dipendenze (se mancano) ed esegue la pipeline.
set -euo pipefail
cd "$(dirname "$0")"
python3 -m pip install -q -r requirements.txt
python3 pipeline_musica.py
