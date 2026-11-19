#!/bin/sh
# Conferência semanal dos gabaritos definitivos da FGV (chamada pelo cron, ver scripts/atualizar-gabaritos.ts).
# Anexa cada execução ao log em .cache/gabaritos.log. O cron não herda o PATH do usuário: por isso o node é absoluto.
cd "$(dirname "$0")/.." || exit 1
NODE="${NODE:-/usr/local/bin/node}"
LOG=".cache/gabaritos.log"
mkdir -p .cache
{
  echo "== $(date '+%Y-%m-%d %H:%M:%S')"
  "$NODE" scripts/atualizar-gabaritos.ts
  echo "saída: $?"
} >> "$LOG" 2>&1
