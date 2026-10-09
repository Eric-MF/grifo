# Grifo · 2ª Fase OAB – Penal

Site do curso Grifo (www.grifo.com). É 100% estático (Next.js com `output: "export"`), sem
backend; as preferências e o histórico do aluno ficam no `localStorage`.

- **Provas** (`/provas`): cadernos e padrões de resposta originais da FGV e versões atualizadas
  no layout do 40º Exame, com marca Grifo, além da folha de respostas para imprimir.
- **Simulados** (`/simulados`): prova com cronômetro, pausa com anúncio discreto e correção
  automática item a item pela tabela da FGV. Há correção opcional por IA com a chave do próprio
  aluno (Anthropic, OpenAI, Gemini, OpenRouter, Groq, Mistral, DeepSeek) e card de
  compartilhamento com código de verificação (`/verificar`).
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

`npm run build:completo` também gera os PDFs atualizados (precisa do Chromium do Playwright:
`npx playwright install chromium`).

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
