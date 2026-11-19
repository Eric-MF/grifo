#!/usr/bin/env bash
# Publica o site no GitHub Pages (grifo.net.br): gera o site (out/) e envia só ele para o branch gh-pages do remoto
# "origin", num commit único, sem histórico (o repositório não cresce a cada publicação; o que não mudou não é
# reenviado). O código continua no main, que se envia à parte (git push origin main).
#
#   npm run publicar                 build completo, com os PDFs atualizados (npm run build:completo)
#   npm run publicar -- --rapido     build sem refazer os PDFs (npm run build)
#   npm run publicar -- --sem-build  envia o out/ como está
#   npm run publicar -- --ensaio     faz tudo, menos o envio
#
# O remoto (git remote add origin …), o acesso ao GitHub, o DNS e o GitHub Pages (Settings › Pages: branch gh-pages,
# pasta raiz, domínio grifo.net.br) são configurados à parte; ver o README. GRIFO_REMOTO troca o destino (testes).
set -euo pipefail
cd "$(dirname "$0")/.."
RAIZ=$(pwd)

modo=completo
ensaio=0
for a in "$@"; do
  case "$a" in
    --rapido) modo=rapido ;;
    --sem-build) modo=nenhum ;;
    --ensaio) ensaio=1 ;;
    *) echo "opção desconhecida: $a (use --rapido, --sem-build ou --ensaio)" >&2; exit 2 ;;
  esac
done

remoto=${GRIFO_REMOTO:-$(git remote get-url origin 2>/dev/null || true)}
if [ -z "$remoto" ] && [ "$ensaio" = 0 ]; then
  echo "Falta o remoto 'origin' do repositório no GitHub. Por exemplo: git remote add origin git@github.com:Eric-MF/grifo.git" >&2
  exit 1
fi
[ -z "$(git status --porcelain)" ] || echo "Aviso: há mudanças não commitadas; o site publicado não corresponde a um commit."

case $modo in
  completo) npm run build:completo ;;
  rapido) npm run build ;;
esac

# o que o GitHub Pages precisa: o domínio (CNAME), o .nojekyll (sem ele, a pasta _next some), nenhum arquivo acima de
# 100 MB e o site todo abaixo de 1 GB
falha() { echo "Não publicado: $1" >&2; exit 1; }
[ -f out/index.html ] && [ -f out/404.html ] || falha "out/ incompleto (rode o build)"
[ "$(tr -d '[:space:]' < out/CNAME 2>/dev/null)" = "grifo.net.br" ] || falha "out/CNAME ausente ou sem grifo.net.br (vem de public/CNAME)"
[ -f out/.nojekyll ] || falha "out/.nojekyll ausente (vem de public/.nojekyll)"
[ -f out/sitemap.xml ] && [ -f out/robots.txt ] || falha "out/sitemap.xml ou out/robots.txt ausente"
grande=$(find out -type f -size +95M -print -quit)
[ -z "$grande" ] || falha "arquivo acima do limite do GitHub (100 MB): $grande"
total=$(du -sm out | cut -f1)
[ "$total" -lt 1000 ] || falha "o site tem $total MB, e o GitHub Pages aceita até 1 GB"

# um repositório à parte, em .cache/, cuja pasta de trabalho é o out/
GD="$RAIZ/.cache/gh-pages.git"
g() { git --git-dir="$GD" --work-tree="$RAIZ/out" "$@"; }
if [ ! -d "$GD" ]; then
  git init -q --bare "$GD"
  git --git-dir="$GD" config core.bare false
fi
g config user.name "$(git config user.name)"
g config user.email "$(git config user.email)"
if [ -n "$remoto" ]; then
  if g remote get-url origin >/dev/null 2>&1; then g remote set-url origin "$remoto"; else g remote add origin "$remoto"; fi
  # o que já está publicado: o envio leva só o que mudou
  g fetch -q --depth=1 origin gh-pages 2>/dev/null || true
fi
rm -f "$GD/index"
g add -A
arvore=$(g write-tree)
commit=$(g commit-tree "$arvore" -m "Site de $(git rev-parse --short HEAD) em $(date '+%Y-%m-%d %H:%M')")
g update-ref refs/heads/gh-pages "$commit"
arquivos=$(g ls-tree -r --name-only "$commit" | wc -l)
echo "Site pronto: $arquivos arquivos, $total MB (commit $commit)."
if [ "$ensaio" = 1 ]; then
  echo "Ensaio: nada foi enviado."
  exit 0
fi
g push -f origin "$commit:refs/heads/gh-pages"
echo "Publicado no branch gh-pages de $remoto. O GitHub Pages leva um ou dois minutos para pôr no ar: https://grifo.net.br"
