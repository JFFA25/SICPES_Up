#!/usr/bin/env bash
# Verificación posterior al despliegue: espera a que la versión nueva esté en línea,
# comprueba el sitio, el manifest y el service worker, y registra indicadores.
# Variables:
#   SITE_URL         URL pública del frontend (por defecto https://sicpes-frontend.onrender.com)
#   EXPECTED_COMMIT  commit que debe estar publicado (opcional)
#   BACKEND_URL      URL del backend para una comprobación de salud (opcional)
#   MAX_WAIT         segundos máximos de espera (por defecto 900)
# Uso: bash scripts/verify.sh
set -uo pipefail

SITE_URL="${SITE_URL:-https://sicpes-frontend.onrender.com}"
SITE_URL="${SITE_URL%/}"
EXPECTED_COMMIT="${EXPECTED_COMMIT:-}"
BACKEND_URL="${BACKEND_URL:-}"
MAX_WAIT="${MAX_WAIT:-900}"
INTERVAL=15
START="$(date +%s)"

http_code() { curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$1" || echo 000; }

echo "== Esperando la versión publicada en ${SITE_URL} (máx. ${MAX_WAIT}s) =="
LIVE_COMMIT=""
while :; do
  BODY="$(curl -s --max-time 30 "${SITE_URL}/version.json" || true)"
  LIVE_COMMIT="$(printf '%s' "$BODY" | sed -n 's/.*"commit":"\([^"]*\)".*/\1/p')"
  ELAPSED=$(( $(date +%s) - START ))

  if [ -n "$LIVE_COMMIT" ]; then
    if [ -z "$EXPECTED_COMMIT" ] || [ "$LIVE_COMMIT" = "unknown" ] || [ "$LIVE_COMMIT" = "$EXPECTED_COMMIT" ]; then
      echo "Versión en línea tras ${ELAPSED}s: ${BODY}"
      break
    fi
    echo "[${ELAPSED}s] En línea hay ${LIVE_COMMIT:0:7}; se espera ${EXPECTED_COMMIT:0:7}..."
  else
    echo "[${ELAPSED}s] Aún sin respuesta válida (el servicio puede estar iniciando)..."
  fi

  if [ "$ELAPSED" -ge "$MAX_WAIT" ]; then
    echo "::error::Tiempo agotado: la versión esperada no está en línea"
    exit 1
  fi
  sleep "$INTERVAL"
done
DEPLOY_WAIT=$(( $(date +%s) - START ))

if [ "$LIVE_COMMIT" = "unknown" ]; then
  echo "::warning::version.json no trae el commit (RENDER_GIT_COMMIT no llegó al build); no se pudo confirmar la versión exacta"
fi

FAIL=0
echo "== Comprobaciones =="
declare -A RESULTS
for path in "/" "/manifest.webmanifest" "/sw.js" "/icons/icon-192.png"; do
  code="$(http_code "${SITE_URL}${path}")"
  RESULTS["$path"]="$code"
  if [ "$code" = "200" ]; then echo "OK   ${path} -> 200"; else echo "FALLA ${path} -> ${code}"; FAIL=1; fi
done

# Ruta interna de la SPA: si falla, falta la regla de reescritura /* -> /index.html en Render
code="$(http_code "${SITE_URL}/login")"
RESULTS["/login"]="$code"
if [ "$code" = "200" ]; then
  echo "OK   /login (ruta interna de la SPA) -> 200"
else
  echo "::warning::/login respondió ${code}: revisa la regla Rewrite /* -> /index.html en Render"
fi

echo "== Indicadores =="
TIME_TOTAL="$(curl -s -o /dev/null -w '%{time_total}' --max-time 30 "${SITE_URL}/")"
echo "Tiempo de respuesta de la página principal: ${TIME_TOTAL}s"
echo "Tiempo hasta versión en línea: ${DEPLOY_WAIT}s"

BACKEND_LINE="no verificado"
if [ -n "$BACKEND_URL" ]; then
  bcode="$(http_code "${BACKEND_URL%/}/")"
  BACKEND_LINE="HTTP ${bcode}"
  if [ "$bcode" = "200" ]; then echo "OK   backend (health check /) -> 200"; else echo "::warning::Backend respondió ${bcode}"; fi
fi

if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "### Verificación posterior al despliegue"
    echo ""
    echo "| Indicador | Valor |"
    echo "| --- | --- |"
    echo "| URL | ${SITE_URL} |"
    echo "| Commit en línea | \`${LIVE_COMMIT:0:7}\` |"
    echo "| Página principal | HTTP ${RESULTS["/"]} |"
    echo "| Manifest PWA | HTTP ${RESULTS["/manifest.webmanifest"]} |"
    echo "| Service worker | HTTP ${RESULTS["/sw.js"]} |"
    echo "| Tiempo de respuesta | ${TIME_TOTAL} s |"
    echo "| Tiempo hasta versión en línea | ${DEPLOY_WAIT} s |"
    echo "| Backend (health) | ${BACKEND_LINE} |"
  } >> "$GITHUB_STEP_SUMMARY"
fi

if [ "$FAIL" -ne 0 ]; then
  echo "::error::La verificación posterior al despliegue falló"
  exit 1
fi
echo "Verificación exitosa."
