#!/usr/bin/env bash
# Pruebas automatizadas del frontend (Vitest) y revisión de estilo (ESLint).
# Las pruebas son obligatorias; el lint es informativo mientras se corrigen los
# errores existentes (ver propuesta de mejora en la ficha técnica).
# Uso: bash scripts/test.sh
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/frontend"

echo "== Pruebas automatizadas =="
npm run test || { echo "::error::Las pruebas automatizadas fallaron"; exit 1; }

echo "== Lint (informativo) =="
if npm run lint >/tmp/lint.log 2>&1; then
  echo "Lint sin problemas."
else
  SUMMARY="$(grep -E '^✖ [0-9]+ problems' /tmp/lint.log || echo 'con problemas')"
  echo "::warning::Lint $SUMMARY (no bloquea el despliegue)"
fi
exit 0
