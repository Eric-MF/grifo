#!/usr/bin/env bash
# Regenera o rascunho de um exame e aplica os termos salvos em content/_transcricao/termos/<id>.json
#   scripts/transcrever.sh 30            scripts/transcrever.sh 25 "Porto Alegre"
set -euo pipefail
cd "$(dirname "$0")/.."
num="$1"; var="${2:-}"
id=$(printf "%02d" "$num")
[ -n "$var" ] && id="$id-$(echo "$var" | iconv -f utf8 -t ascii//TRANSLIT | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]\+/-/g')"
if [ ! -f "content/_transcricao/termos/$id.json" ]; then
  echo "sem content/_transcricao/termos/$id.json: exame transcrito à mão ou ainda não iniciado — nada feito" >&2
  exit 1
fi
node scripts/rascunho-exame.ts "$num" ${var:+"$var"} --force >/dev/null
node scripts/aplicar-termos.ts "$id" "content/_transcricao/termos/$id.json"
