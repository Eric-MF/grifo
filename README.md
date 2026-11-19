# Grifo · 2ª Fase OAB – Penal

Site do curso Grifo (grifo.net.br). É 100% estático (Next.js com `output: "export"`), sem
backend; as preferências e o histórico do aluno ficam no `localStorage`.

- **Provas** (`/provas`): cadernos e padrões de resposta originais da FGV e versões atualizadas
  no layout do 40º Exame, com marca Grifo, além da folha de respostas para imprimir.
- **Simulados** (`/simulados`): prova com cronômetro, pausa com anúncio discreto e correção
  automática item a item pela tabela da FGV. Há correção opcional por IA com a chave do próprio
  aluno (Anthropic, OpenAI, Gemini, OpenRouter, Groq, Mistral, DeepSeek) e card de
  compartilhamento com código de verificação (`/verificar`).
- **Estatísticas** (`/estatisticas`): as peças de cada exame (a FGV, o I Exame do CESPE e os exames
  antigos da OAB/SP, de `content/historico.yaml`), as peças do topo em pirâmide, pódio, pizza ou
  mosaico, o ranking, o palpite da peça do próximo exame (só uma estimativa, testada nos exames
  passados), as teses e os artigos das tabelas de pontos (com a prévia do texto), a busca nos
  enunciados e gabaritos, a linha do tempo da unificação e o desempenho do aluno nos simulados, no
  treino e nos jogos, com o calendário de estudo e o sorteio de simulado. O link do cabeçalho mostra
  um resumo do desempenho com o mouse por cima.
- **Jogos** (`/jogos`): plataforma de jogos com perguntas de 2ª fase em três níveis. O primeiro
  jogo é o Flap Suitcase, com 7 estilos e 10 poderes.
- **Modos de visualização:** claro, escuro, sépia e alto contraste; tamanho de fonte; densidade;
  fonte de leitura fácil; modo foco no simulado.

## Começar

```bash
npm install
npm run dev        # http://100.80.118.27:3100 (Tailscale) — GRIFO_HOST / GRIFO_PORT para mudar
npm test
npm run build      # site estático em out/
```

`npm run build:completo` também gera os PDFs atualizados das provas e das leis (precisa do Chromium do
Playwright: `npx playwright install chromium`).

## Publicar (GitHub Pages, grifo.net.br)

O site fica no GitHub Pages do repositório `Eric-MF/grifo`: o código no `main` e o site gerado no branch
`gh-pages`, que só tem a pasta `out/`.

```bash
npm run publicar               # build completo (com os PDFs) e envio do out/ para o gh-pages
npm run publicar -- --rapido   # sem refazer os PDFs
npm run publicar -- --ensaio   # tudo, menos o envio
git push origin main           # o código
```

O `publicar` confere o que o GitHub Pages precisa (o `CNAME` e o `.nojekyll`, que vêm de `public/`, o sitemap,
nenhum arquivo acima de 100 MB e o site abaixo de 1 GB) e envia o site num commit único, sem histórico: o
repositório não cresce a cada publicação, e o que não mudou não é reenviado. Os crons desta máquina (súmulas e
gabaritos) só atualizam o conteúdo aqui; o site muda quando se publica de novo.

Configuração, uma vez só:

1. Criar o repositório público `Eric-MF/grifo`, ligar o remoto (`git remote add origin git@github.com:Eric-MF/grifo.git`)
   e dar a esta máquina acesso de escrita a ele.
2. Em Settings › Pages: "Deploy from a branch", branch `gh-pages`, pasta `/ (root)`; Custom domain `grifo.net.br`;
   depois que o certificado sair, "Enforce HTTPS".
3. No DNS do domínio (Registro.br):
   - `grifo.net.br`, tipo A: `185.199.108.153`, `185.199.109.153`, `185.199.110.153` e `185.199.111.153`;
   - `grifo.net.br`, tipo AAAA: `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153` e `2606:50c0:8003::153`;
   - `www`, tipo CNAME: `eric-mf.github.io`.
4. Opcional e recomendado: verificar o domínio na conta do GitHub (Settings › Pages › Verified domains), para
   nenhum outro repositório poder usá-lo.

## Estrutura

| Pasta | Conteúdo |
| --- | --- |
| `content/` | exames, perguntas, peças, leis e promoções em YAML (validados com zod) |
| `src/app/(site)/` | páginas públicas |
| `src/app/print/` | páginas A4 que viram os PDFs atualizados |
| `src/app/revisao/` | painel de revisão (existe só em `npm run dev`) |
| `src/lib/correcao/` | normalização de texto, leitor de citações e corretor |
| `src/lib/ia/` | correção por IA (chamadas direto do navegador) |
| `src/lib/codigo/` | código de verificação (HMAC + dígito verificador ISO 7064) |
| `src/games/` | plataforma de jogos e o Flap Suitcase |
| `src/quiz/` | banco de perguntas: geradores paramétricos e perguntas fixas |
| `scripts/` | validação, transcrição de exames, PDFs, imagens e geradores de esqueleto |

**Para incluir exames, perguntas, jogos, anúncios ou vídeos e para revisar o conteúdo, veja
[docs/COMO-ADICIONAR.md](docs/COMO-ADICIONAR.md).**

## Observações

- O build de produção usa webpack (`next build --webpack`); o Turbopack falha com `next/font`
  nesta versão.
- A pasta `.examples/` (material de referência da FGV) fica fora do git.
- O link do Curso Completo (`COURSE_URL` em `src/config/site.ts`) ainda está vazio. Enquanto
  isso, os anúncios levam à seção `#curso` da landing.
- Todos os exames estão como rascunho e aguardam revisão jurídica (veja `/revisao` no `npm run dev`).
