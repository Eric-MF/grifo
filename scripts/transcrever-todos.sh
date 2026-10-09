#!/usr/bin/env bash
# Regenera TODOS os exames a partir do texto dos PDFs (.examples/_text) + termos (content/_transcricao/termos).
# Exames sem gabarito (corrigivel: false) não são tocados.
set -euo pipefail
cd "$(dirname "$0")/.."
for f in content/_transcricao/termos/*.json; do
  id=$(basename "$f" .json)
  num=$((10#${id%%-*}))
  case "$id" in
    *-porto-alegre) scripts/transcrever.sh "$num" "Porto Alegre" ;;
    *-porto-velho) scripts/transcrever.sh "$num" "Porto Velho" ;;
    *) scripts/transcrever.sh "$num" ;;
  esac | sed "s/^/$id: /"
done
node scripts/build-content.ts --check
