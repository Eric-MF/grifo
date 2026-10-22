#!/bin/sh
# Atualização semanal das súmulas (chamada pelo cron, ver scripts/sumulas/atualizar.ts).
# Anexa cada execução ao log em .cache/sumulas/atualizacao.log. O cron não herda o PATH do usuário: por isso o node é absoluto.
cd "$(dirname "$0")/../.." || exit 1
NODE="${NODE:-/usr/local/bin/node}"
LOG=".cache/sumulas/atualizacao.log"
mkdir -p .cache/sumulas
{
  echo "== $(date '+%Y-%m-%d %H:%M:%S')"
  "$NODE" scripts/sumulas/atualizar.ts
  echo "saída: $?"
} >> "$LOG" 2>&1
