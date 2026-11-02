#!/usr/bin/env bash
# Genera el artefacto (frontend/dist) y su registro de versión.
# Uso: bash scripts/build.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/frontend"

echo "== Compilando (tsc -b && vite build; el postbuild escribe dist/version.json) =="
npm run build

echo "Artefacto listo en frontend/dist:"
du -sh dist
cat dist/version.json
