#!/usr/bin/env bash
# Prepara el entorno de liberación: verifica herramientas e instala dependencias.
# Uso: bash scripts/setup-env.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/frontend"

echo "== Entorno de liberación =="
command -v node >/dev/null || { echo "::error::Node.js no está instalado"; exit 1; }
command -v npm  >/dev/null || { echo "::error::npm no está instalado"; exit 1; }

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "::error::Se requiere Node 20 o superior (encontrado: $(node -v))"
  exit 1
fi
echo "node $(node -v) | npm $(npm -v)"

echo "== Instalando dependencias (npm ci) =="
npm ci --no-audit --no-fund

echo "Entorno listo."
