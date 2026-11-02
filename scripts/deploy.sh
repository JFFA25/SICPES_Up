#!/usr/bin/env bash
# Dispara el despliegue en Render mediante su Deploy Hook, fijando el commit exacto.
# Variables requeridas:
#   RENDER_DEPLOY_HOOK_URL  (secreto del repositorio; nunca se imprime)
#   COMMIT_SHA              (commit a desplegar; en Actions: github.sha)
# Uso: bash scripts/deploy.sh
set -euo pipefail

: "${RENDER_DEPLOY_HOOK_URL:?Falta el secreto RENDER_DEPLOY_HOOK_URL}"
: "${COMMIT_SHA:?Falta COMMIT_SHA}"

SEP='?'
case "$RENDER_DEPLOY_HOOK_URL" in *\?*) SEP='&' ;; esac

echo "Solicitando despliegue del commit ${COMMIT_SHA:0:7} en Render..."
HTTP_CODE="$(curl -sS -o /tmp/deploy_response.json -w '%{http_code}' \
  -X POST "${RENDER_DEPLOY_HOOK_URL}${SEP}ref=${COMMIT_SHA}")"

echo "Respuesta de Render: HTTP ${HTTP_CODE}"
cat /tmp/deploy_response.json 2>/dev/null || true
echo

if [ "$HTTP_CODE" -lt 200 ] || [ "$HTTP_CODE" -ge 300 ]; then
  echo "::error::Render rechazó la solicitud de despliegue (HTTP ${HTTP_CODE})"
  exit 1
fi
date +%s > /tmp/deploy_started_at
echo "Despliegue solicitado."
