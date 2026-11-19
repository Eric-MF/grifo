# Estilo visual do Grifo

Este documento descreve o estilo visual do site grifo.net.br: a identidade, as cores, as fontes, as medidas, os
componentes, cada página, as imagens geradas, a impressão e os jogos. Os valores foram tirados do código em
2026-11-03 (a página de estatísticas, em 2026-11-04). Em caso de dúvida, vale o código:

| O quê | Onde |
| --- | --- |
| Cores, temas, fontes e componentes globais | `src/app/globals.css` |
| Fontes carregadas e cor da barra do navegador | `src/app/layout.tsx` |
| Preferências de visualização (tema, tamanho, densidade…) | `src/lib/prefs.ts` e `src/components/ViewModeMenu.tsx` |
| Cada componente e cada página | o `.module.css` ao lado do `.tsx` |
| Cores dos grifos (marcações) | `src/lib/leis/legendas.ts` |
| Card e prévias de compartilhar | `src/lib/share/card.ts`, `src/lib/share/meandro.ts`, `scripts/gerar-previas.ts` |
| Impressão (cadernos e gabaritos) | `src/app/print/print.css` |
| Jogos | `src/games/games.module.css` e `src/games/flap-suitcase/` |

## Sumário

1. [Conceito](#1-conceito)
2. [Marca](#2-marca)
3. [Cores](#3-cores)
4. [Tipografia](#4-tipografia)
5. [Espaço, forma e profundidade](#5-espaço-forma-e-profundidade)
6. [Movimento](#6-movimento)
7. [Componentes](#7-componentes)
8. [Ícones](#8-ícones)
9. [Estrutura do site: cabeçalho, rodapé e menus](#9-estrutura-do-site-cabeçalho-rodapé-e-menus)
10. [Páginas](#10-páginas)
11. [Leitor de leis e Vade Mecum](#11-leitor-de-leis-e-vade-mecum)
12. [Treinar questões e o strike](#12-treinar-questões-e-o-strike)
13. [Jogos](#13-jogos)
14. [Ilustrações e fotos](#14-ilustrações-e-fotos)
15. [Imagens geradas: card e prévias de compartilhar](#15-imagens-geradas-card-e-prévias-de-compartilhar)
16. [Impressão e PDFs](#16-impressão-e-pdfs)
17. [Modos de visualização](#17-modos-de-visualização)
18. [Responsividade](#18-responsividade)
19. [Acessibilidade](#19-acessibilidade)
20. [Texto na interface](#20-texto-na-interface)
21. [Pontos de atenção](#21-pontos-de-atenção)
22. [Apêndice: inventário do CSS](#22-apêndice-inventário-do-css)

---

## 1. Conceito

O Grifo junta **a Grécia antiga** e **o Direito**:
- o **grifo**, guardião alado da mitologia, é a marca;
- as **colunas gregas**, o **Partenon** e o **meandro** (a borda grega) são os elementos decorativos;
- a balança, o martelo, a pena e o pergaminho aparecem nas ilustrações.

A dupla de cores é **azul-marinho e ouro**: o marinho dá a seriedade de um material de estudo jurídico, e o ouro marca o
que é chamada, nota e conquista. O fundo claro é um **papel creme** (`#f7f4ee`), e não um branco puro, para lembrar o
papel dos cadernos de prova.

O tom é sóbrio nas páginas de estudo (provas, simulados, leis) e mais lúdico nos jogos e no treino, com brilhos de ouro,
comemorações e personagens.

Regras que valem em todo o site:
- **As cores do leitor de leis são legendas das marcações do usuário** (cada cor tem um significado), e não uma
  coloração automática do texto.
- **Folhas de papel continuam brancas** (as páginas dos PDFs, a folha de resposta no tema claro), mesmo dentro de um tema
  escuro, quando representam um papel.
- **Nada depende só da cor**: acerto e erro levam também ✓, ✗ e um selo escrito.

---

## 2. Marca

### 2.1 Nome e textos de marca (`src/config/site.ts`)

| Item | Valor |
| --- | --- |
| Nome | Grifo |
| Domínio | grifo.net.br |
| Slogan | Aprovação na 2ª Fase OAB – Penal |
| Descrição | Provas anteriores, gabaritos, simulados com correção automática e jogos para a 2ª fase da OAB em Direito Penal. |
| Título padrão das páginas | `Grifo · Aprovação na 2ª Fase OAB – Penal` |
| Título das demais páginas | `<título da página> · Grifo` |
| Linha de apoio nas imagens | `2ª FASE OAB · DIREITO PENAL` |

### 2.2 O símbolo (o grifo)

- **Desenho:** um grifo rampante de perfil, voltado para a esquerda, com as asas abertas para cima, as garras dianteiras
  erguidas e a cauda de leão enrolada.
- **Arquivo-fonte:** `Grifo.svg` (Inkscape, na raiz). Os caminhos ficam em `src/components/logo-paths.ts`
  (`LOGO_PATHS`, `viewBox="0 0 210 210"`).
- **No site:** `src/components/Logo.tsx` desenha o grifo inline com `fill="currentColor"`. A cor vem do texto em volta.

| Arquivo | Cor | Uso |
| --- | --- | --- |
| `public/logo.svg` | marinho `#03112C` | sobre fundo claro |
| `public/logo-ouro.svg` | ouro `#D69C45` | sobre fundo escuro |
| `public/logo-branco.svg` | branco `#FFFFFF` | sobre foto ou cor forte |
| `src/app/icon.svg` | grifo ouro sobre quadrado marinho de cantos arredondados (`rx 48` num quadro de 250) | favicon |
| `src/app/apple-icon.png`, `public/icon-192.png`, `public/icon-512.png` | o mesmo | ícone de app |

Tamanhos e cores do símbolo em cada lugar:

| Lugar | Tamanho | Cor |
| --- | --- | --- |
| Cabeçalho | 38 px | cor do texto (marinho no claro, quase branco no escuro) |
| Rodapé | 44 px | ouro |
| Bloco do curso (início) | 96 px, de 80 a 160 px (`clamp(80px, 14vw, 160px)`) | ouro |
| Anúncio da casa (`PromoSlot`) | 40 px | `--accent` (ouro) |
| Card de compartilhar | 180 px (retrato) e 170 px (paisagem) | ouro |
| Prévias de compartilhar | dois grifos de 250 px, frente a frente | ouro |
| Folha de resposta em PDF | proporcional à folha | marinho `rgb(3, 17, 44)` |

### 2.3 O nome escrito

- No cabeçalho: **Grifo** em Cormorant Garamond 700, 1,6 rem, espaçamento de 0,02 em.
- Nas imagens (card, prévias, imagem do site): **GRIFO** em maiúsculas, Cormorant Garamond 700, quase branco
  (`#eef2f7`).
- No rodapé: **Grifo** em Cormorant 1,5 rem, branco.

### 2.4 Logotipo dos materiais impressos ("Grifo em Progresso")

`public/img/logo-grifo-em-progresso.svg` (900 × 472) vai nos cadernos, nos gabaritos e na folha de resposta em PDF:
- à esquerda, um globo azul como o da bandeira do Brasil, com estrelas brancas e a faixa **GRIFO EM PROGRESSO**;
- o globo vai do azul-claro `#7cb8e6` ao marinho `#03112c`, passando por `#2f78b5`, `#1a6099` e `#0a2a52`;
- à direita, um monograma dourado em degradê (de `#7d5013` e `#94621d` a `#c28b3a`, `#ecc47e` e `#efc27a`), com contorno
  bronze;
- embaixo, **GRIFO.NET.BR** em letras condensadas pesadas, marinho.

O texto alternativo é "Grifo em Progresso · grifo.net.br". Ver também [Pontos de atenção](#21-pontos-de-atenção).

---

## 3. Cores

### 3.1 Paleta base

Definida no topo de `globals.css` (Adobe Color, esquema complementar), mais o marinho da marca:

| Token | Hex | Nome | Papel |
| --- | --- | --- | --- |
| `--navy` | `#03112c` | azul-marinho do grifo | marca, blocos escuros, texto no claro |
| `--gold` | `#d69c45` | ouro | chamadas, destaques, a marca sobre escuro |
| `--blue` | `#1a6099` | azul | links e ação principal no claro |
| `--sky` | `#5a9ed6` | azul-céu | foco, links no escuro |

As outras duas cores da paleta do Adobe Color, o taupe `#807059` e o ardósia `#5e7282`, ficam só no comentário do topo
de `globals.css`: nenhum estilo as usa, então não viraram variáveis.

### 3.2 Tokens semânticos por tema

O tema fica em `data-theme` no `<html>`. Sem o atributo ("Automático"), o site segue o sistema
(`prefers-color-scheme`). Um traço (—) quer dizer que o tema herda o valor do tema claro.

| Token | Claro | Escuro | Sépia (papel) | Alto contraste |
| --- | --- | --- | --- | --- |
| `--bg` (fundo da página) | `#f7f4ee` | `#03112c` | `#f1e6d0` | `#000000` |
| `--bg-alt` (seção alternada) | `#efe9dd` | `#061a3d` | `#e9dcc1` | `#000000` |
| `--surface` (cartões) | `#ffffff` | `#0a1f45` | `#faf3e4` | `#000000` |
| `--surface-2` (fundo de chips, cabeçalho de tabela) | `#f3efe7` | `#0e2753` | `#f3e8d2` | `#111111` |
| `--text` | `#03112c` | `#eef2f7` | `#33291e` | `#ffffff` |
| `--muted` (texto secundário) | `#4f5f6d` | `#a6b5c6` | `#6b5b47` | `#e6e6e6` |
| `--border` | `#ded6c6` | `#1f3a66` | `#d8c4a0` | `#ffffff` |
| `--primary` (links, ação, selecionado) | `#1a6099` | `#5a9ed6` | `#1a5a8f` | `#ffd84d` |
| `--primary-ink` (texto sobre o primary) | `#ffffff` | `#03112c` | — | `#000000` |
| `--accent` (preenchimento dourado) | `#d69c45` | — | — | `#ffd84d` |
| `--accent-ink` (texto dourado legível) | `#8a5a14` | `#e5b56b` | `#875714` | `#ffd84d` |
| `--on-accent` (texto sobre o dourado) | `#03112c` | — | — | `#000000` |
| `--ok` (acerto) | `#2a7449` | `#5cc98a` | `#276b44` | `#7dff9b` |
| `--warn` (aviso) | `#955706` | `#f0a84a` | `#8a4f07` | `#ffd84d` |
| `--bad` (erro) | `#b3261e` | `#ff8a80` | — | `#ff8a80` |
| `--on-estado` (texto sobre um fundo cheio de `--ok`, `--warn` ou `--bad`) | `#ffffff` | `#03112c` | — | `#000000` |
| `--shadow` | `0 1px 2px rgb(3 17 44 / 0.06), 0 8px 24px rgb(3 17 44 / 0.08)` | `0 1px 2px rgb(0 0 0 / 0.3), 0 8px 24px rgb(0 0 0 / 0.35)` | — | `none` |
| `--focus` (anel de foco) | `0 0 0 3px rgb(90 158 214 / 0.55)` | — | — | `0 0 0 3px #ffffff` |
| `color-scheme` | `light` | `dark` | `light` | `dark` |

Outros detalhes dos temas:
- **Alto contraste:** todo link é sublinhado (`:root[data-theme="contraste"] a`). A abertura do início fica preta, com
  véu de 75%; o rodapé e o bloco do curso ficam pretos, com bordas brancas.
- **Barra do navegador (`themeColor`):** `#f7f4ee` com o sistema claro, `#03112c` com o escuro.
- **Sem "flash" de tema:** `PREFS_BOOT_SCRIPT` aplica o tema salvo no `<head>`, antes da primeira pintura.

### 3.3 Como cada cor é usada

| Cor | Para quê |
| --- | --- |
| Ouro (`--accent`) | botão principal (`.btn-gold`), selo dourado (`.badge-gold`), meandro, borda ao passar o mouse nos cartões (`.card` de ferramentas, de simulados, de jogos), pino do slide do leitor, seleção de texto (45%) |
| Texto dourado (`--accent-ink`) | sobrancelhas (`.eyebrow`), recorde, rótulos de seção da correção, contagens. O ouro puro não tem contraste para texto sobre o creme; o `--accent-ink` tem |
| Azul (`--primary`) | links, botão secundário (`.btn-primary`), item escolhido (borda e anel interno), caixas marcadas (`accent-color`), cursor da folha de resposta, CTA dos cartões ("Ver provas →") |
| Marinho (`--navy`) | rodapé, bloco do curso, números dos passos e dos exames, véu dos diálogos |
| `--ok`, `--warn`, `--bad` | acerto, aviso (gabarito preliminar, resposta não identificada) e erro. Nos fundos, entram misturados (`color-mix`) de 8% a 18%. Quando são o fundo inteiro (a faixa de alerta do simulado, a letra da alternativa na revisão do quiz, o aviso de cópia que falhou), o texto vai em `--on-estado` |

Misturas com `color-mix(in srgb, …)` são a regra para fundos suaves. Os percentuais mais usados:

| Mistura | Uso |
| --- | --- |
| `--accent` 14% a 22% | fundo de aviso, selo dourado, linha-alvo de tabela (16%), ícone dos cartões do início (18%) |
| `--accent` 45% | `mark` da busca, seleção de texto |
| `--primary` 5% a 16% | fundo de item escolhido, caixa de observação (10%), botão do dock ativo (16%) |
| `--ok` / `--bad` 8% a 14% | fundo de acerto e erro, resultado da verificação (8%) |
| `--warn` 14% a 18% | aviso e selo "preliminar" |
| `--bg` 88% | cabeçalho translúcido |

### 3.4 Cores da correção (simulado)

Tokens de `globals.css`, usados em `correcao.module.css`. Um traço (—) quer dizer que o tema herda o valor do claro; o
sépia herda todos.

| Token | Claro | Escuro | Alto contraste | Uso |
| --- | --- | --- | --- | --- |
| `--marca` / `--marca-ink` / `--marca-borda` | `#fde047` / `#111827` / `#a16207` | — | `#ffd84d` / `#000000` / `#ffffff` | fundo do trecho que pontuou (`.marca`), com o texto em peso 700 e um anel de 1 px |
| `--realce` | `#facc15` | — | `#ffd84d` | parágrafo, linha da tabela e parágrafo do gabarito em destaque (12% a 22%) |
| `--realce-borda` | `#ca8a04` | — | `#ffd84d` | borda esquerda de 3 px dos destaques |
| `--realce-texto` | `#8a5a08` | `#facc15` | `#ffd84d` | o sinal "−" do corte |
| `--corte` / `--corte-ink` | `#b45309` / `#ffffff` | — | `#ff9f43` / `#000000` | laranja do corte (✂): ferramenta ligada, selo "Pontuação retirada", contagem, borda tracejada do critério cortado, borda do recurso (45%) |
| `--corte-texto` | `#92400e` | `#fdba74` | `#ffb870` | ✂ ao lado de cada critério |
| `--marca` a 75% → transparente | (o da marca) | — | (o da marca) | marca do critério no texto do recurso, que some em 2,6 s |

### 3.5 Cores dos grifos (marcações do leitor de leis)

`src/lib/leis/legendas.ts`. Cada cor é um significado dentro de um **sistema de cores**.

Cores principais, na ordem em que um sistema novo as recebe:

| Nome | Hex |
| --- | --- |
| Amarelo | `#fde047` |
| Verde | `#86efac` |
| Azul | `#93c5fd` |
| Rosa | `#f9a8d4` |
| Vermelho | `#fca5a5` |
| Roxo | `#c4b5fd` |

Cores extras (sistemas com mais de seis significados): `#fdba74`, `#5eead4`, `#bef264`, `#67e8f9`, `#a5b4fc`,
`#fda4af`, `#d8b4fe`, `#fde68a`. Esgotadas as extras, cada cor nova é `hsl(h, 80%, 75%)`, girando o matiz pelo ângulo
áureo (137,508°), para nunca repetir.

Os dois sistemas prontos, **Essenciais** (o padrão: só o que já caiu em prova) e **Geral**, usam as mesmas quatro cores:

| Tipo de grifo pronto | Cor | Forma |
| --- | --- | --- |
| Peças | verde `#86efac` | marca-texto |
| Teses | amarelo `#fde047` | marca-texto |
| Súmulas | azul `#93c5fd` | marca-texto |
| Pedidos | vermelho `#fca5a5` | **sublinhado** de 2,5 px (muitos pedidos já estão grifados como tese) |

Como o grifo aparece:
- **Grifo do usuário:** imita a caneta marca-texto.
  - Faixa em degradê de 100°, com as pontas irregulares (cantos `0.5em 0.2em 0.55em 0.25em`).
  - Opacidade de 72%, ou 48% no fundo escuro do leitor (`--grifo-alfa`).
  - Num trecho de várias linhas, a faixa é uma forma só, cortada nas quebras (`box-decoration-break: slice`).
  - Ao grifar, a faixa "pinta" da esquerda para a direita em 0,35 s.
- **Grifo pronto do Grifo:** mais leve, para não competir com o do usuário (62% no leitor, 70% no cartão do artigo).
  Dentro de um grifo do usuário, vira só um sublinhado.
- **Parágrafo inteiro grifado:** um retângulo só para o bloco; parágrafos seguidos se encostam e formam uma forma
  contínua.
- **Grifo só com anotação:** sublinhado pontilhado de 2 px; um "✎" pequeno marca o grifo que tem nota.

Outras marcas do leitor:

| Marca | Cor |
| --- | --- |
| Estrela (artigo importante) | `#d4a017` |
| Ponto de erro no slide | `#dc2626` |
| ● de erro no Vade Mecum (alto, médio, baixo) | `--leitor-bad`, `--leitor-warn`, cor secundária do leitor |
| Pontos de erro no texto (alto, médio, baixo) e borda dos "mais errados" | `--leitor-bad`, `--leitor-warn`, cor secundária do leitor |

O erro e o aviso do leitor têm variáveis próprias, porque o papel do leitor não segue o tema do site (o site pode estar
escuro com o papel claro): `--leitor-bad` `#b3261e` e `--leitor-warn` `#8a4f07` nos fundos claros, `#ff8a80` e
`#f0a84a` no fundo escuro. Os diálogos do leitor ficam no fundo do site e usam `--bad`.

### 3.6 Cores dos grupos de leis

`GRUPOS_LEIS` (`src/lib/leis/leitura.ts`): a cor marca o título do grupo (borda de 5 px) e a borda esquerda de cada
lei (4 px) em `/leis/`, e a barra de leitura de cada uma. São variáveis de `globals.css`, para seguir o tema (o sépia
herda as do claro):

| Grupo | Token | Claro | Escuro | Alto contraste |
| --- | --- | --- | --- | --- |
| Códigos | `--lei-codigos` | `#1d4ed8` | `#60a5fa` | `#8fc4ff` |
| Constituição | `--lei-constituicao` | `#b45309` | `#f59e0b` | `#ffb347` |
| Estatutos | `--lei-estatutos` | `#15803d` | `#4ade80` | `#7dff9b` |
| Leis | `--lei-leis` | `#7c3aed` | `#a78bfa` | `#c4b5fd` |
| Súmulas (`COR_SUMULAS`, `src/lib/leis/sumulas.ts`) | `--lei-sumulas` | `#be185d` | `#f472b6` | `#f9a8d4` |

### 3.7 Fundos do leitor de leis

O leitor tem cinco fundos próprios (`leitor.module.css`, e `src/lib/leis/baixar.ts` para o arquivo baixado). Eles
mudam também o fundo da página inteira (`data-leitor-fundo` no `<html>`).

| Fundo | Fundo (`--leitor-bg`) | Texto | Secundário | Borda | Link | Painéis |
| --- | --- | --- | --- | --- | --- | --- |
| Papel (padrão) | `#fbf7ee` | `#1f1b16` | `#6b6257` | `#e6dcc8` | `#1d4f91` | `#fffdf8` |
| Branco | `#ffffff` | `#111111` | `#5f6368` | `#e2e2e2` | `#1d4f91` | `#ffffff` |
| Sépia | `#f1e3c6` | `#3b2c18` | `#7a6446` | `#dcc8a0` | `#1d4f91` | `#f8eedb` |
| Verde | `#e6f0e1` | `#1d2a1a` | `#56664f` | `#c9dbc0` | `#1d4f91` | `#f1f7ee` |
| Escuro | `#17181b` | `#e8e6e1` | `#a3a09a` | `#33353a` | `#8fb8ff` | `#212328` |

A cor das letras pode ser trocada (`CORES_TEXTO`, `src/lib/leis/opcoes.ts`): padrão do fundo, preto `#111111`,
azul-marinho `#14284b`, cinza `#3d3d3d` ou marrom `#3b2c18`.

O cabeçalho da lei (`cabecalho.module.css`) redefine os tokens do site para ficar legível sobre o papel do leitor:
- no fundo claro: texto `#1f1b16`, secundário `#6b6257`, primary `#1d4f91` e texto dourado `#8a5a14`;
- no fundo escuro: `#e8e6e1`, `#a3a09a`, `#8fb8ff` e `#e5b56b`.

### 3.8 Ícones das peças

Os SVGs de `public/icones/pecas/*.svg` usam variáveis definidas em `globals.css`, para seguir o tema. Cada SVG traz as
mesmas cores como reserva, para quando é aberto sozinho. O alto contraste usa as cores do escuro, com a tinta branca
(`#ffffff`) e a luz `#ffd84d`: no fundo preto, as cores do claro apagavam a tinta. O sépia usa as do claro.

| Variável | Claro | Escuro |
| --- | --- | --- |
| `--icone-contorno` | `#1f2b45` | `#0b1633` |
| `--icone-sombra` | `rgb(3 17 44 / 0.13)` | `rgb(0 0 0 / 0.35)` |
| `--icone-brilho` | `rgb(255 255 255 / 0.75)` | `rgb(255 255 255 / 0.6)` |
| `--icone-ouro` / `-claro` / `-escuro` | `#d69c45` / `#f0c97f` / `#a8742a` | `#e5b56b` / `#f6d9a0` / `#b8863a` |
| `--icone-metal` / `-claro` / `-escuro` | `#4d6a8c` / `#7f9cbc` / `#34495f` | `#6f8fb4` / `#a3bddb` / `#4a6585` |
| `--icone-aco` / `-claro` / `-escuro` | `#aab5c2` / `#d5dce4` / `#7d8a99` | `#bcc7d3` / `#e3e9ef` / `#8e9bab` |
| `--icone-papel` / `-papel-sombra` | `#f4e7c5` / `#e0c98f` | `#f1e3bd` / `#d8bf85` |
| `--icone-tinta` | `#1f2b45` | `#e6ecf4` |
| `--icone-madeira` / `-escura` | `#9a6a3c` / `#6e4626` | `#b07d4c` / `#85582f` |
| `--icone-cobre` / `-escuro` | `#c7743a` / `#9a5528` | `#db8a4f` / `#b06a37` |
| `--icone-vermelho` | `#b3261e` | `#e0574d` |
| `--icone-verde` / `-claro` | `#2e7d4f` / `#4f9a6c` | `#3f9a66` / `#67b886` |
| `--icone-azul` | `#1a6099` | `#5a9ed6` |
| `--icone-rosa` / `-escuro` | `#e8907f` / `#c96a5a` | `#f0a596` / `#d77f6f` |
| `--icone-vidro` | `rgb(255 255 255 / 0.55)` | `rgb(200 220 255 / 0.16)` |
| `--icone-luz` | `#ffcf5c` | `#ffd977` |
| `--icone-fundo-escuro` | `#1a2540` | `#0d1833` |
| `--icone-claro` | `#fffaf0` | `#fffaf0` |

### 3.9 Ouro festivo (conquistas)

Um ouro mais vivo que o da marca, para brilho e comemoração. Fica no treino, no menu do modo foco, na barra de leitura
completa, no destaque da busca nos PDFs e no jogo. São variáveis de `globals.css`, iguais em todos os temas (vão
sempre sobre o próprio fundo); as transparências saem delas com `color-mix`.

| Token | Hex | Uso |
| --- | --- | --- |
| `--festa-brilho` | `#fff6d5` | o ponto mais claro dos degradês e das moedas |
| `--festa-claro` | `#ffe9a0` | brilhos, avisos dourados sobre marinho (jogo, vídeos), o fim claro da barra de leitura completa |
| `--festa-ouro` | `#f5c542` | ouro principal: onda, estrela e líquido do strike, moedas ganhas, leitura completa, marca-texto da busca nos PDFs (45%) |
| `--festa-medio` | `#e0a82e` | gota e sombra do líquido do modo foco |
| `--festa-escuro` | `#c98a10` | fim escuro dos degradês, contorno da estrela |
| `--festa-fundo` | `#b8780a` | as pontas escuras do brilho do strike, da barra de leitura completa e das moedas |
| `--festa-borda` | `#8a5a14` | aro da moeda do vídeo |

O texto escuro sobre o ouro ("xp" da estrela, contagem de strikes) é `#1d1503`.

### 3.10 Painéis escuros (estilo HUD)

Os balões do leitor ("citado por", o detalhe do grifo e o ajuste do tamanho do grifo) imitam a HUD dos jogos:
- **fundo:** degradê de cima para baixo, `rgb(10 32 72 / 0.97)` → `rgb(3 17 44 / 0.97)`;
- **borda:** `rgb(120 180 255 / 0.22)`;
- **sombra:** `0 14px 34px rgb(0 0 0 / 0.35)` e um brilho interno de 1 px no alto;
- **texto:** `#eef4ff`; o secundário, `rgb(190 210 240 / 0.85)`;
- **botões:** brancos translúcidos (8%, 16% ao passar o mouse);
- **botão principal:** degradê azul `#6fb6ff` → `#2f7fd6` com texto marinho;
- **botão de perigo:** texto `#ffb4b4`.

### 3.11 Contraste medido (WCAG)

Razões de contraste dos tokens de texto sobre `--bg` e sobre `--surface`. O mínimo para texto normal (AA) é 4,5:1.

| Texto | Claro | Escuro | Sépia | Alto contraste |
| --- | --- | --- | --- | --- |
| `--text` | 17,1 / 18,7 | 16,7 / 14,4 | 11,5 / 12,9 | 21 / 21 |
| `--muted` | 6,0 / 6,6 | 9,0 / 7,8 | 5,3 / 5,9 | 16,8 / 16,8 |
| `--primary` | 6,0 / 6,6 | 6,5 / 5,6 | 5,8 / 6,5 | 15,2 / 15,2 |
| `--accent-ink` | 5,4 / 5,9 | 10,0 / 8,6 | 5,0 / 5,6 | 15,2 / 15,2 |
| `--ok` | 5,2 / 5,7 | 9,1 / 7,9 | 5,2 / 5,8 | 16,6 / 16,6 |
| `--warn` | 5,3 / 5,8 | 9,3 / 8,0 | 5,3 / 5,9 | 15,2 / 15,2 |
| `--bad` | 6,0 / 6,5 | 8,2 / 7,1 | 5,3 / 5,9 | 9,2 / 9,2 |

As cores de estado passam de 4,5:1 também sobre `--surface-2` e `--bg-alt` em todos os temas (o pior caso é o `--ok`
do claro e do sépia sobre `--bg-alt`, com 4,7:1).

Outros pares:

| Par | Razão |
| --- | --- |
| Marinho sobre ouro (botão dourado) | 7,8 |
| Branco sobre `#1a6099` (botão azul no claro) | 6,6 |
| Marinho sobre `#5a9ed6` (botão azul no escuro) | 6,5 |
| Ouro sobre marinho (rodapé, números) | 7,8 |
| `#dbe4ee` sobre marinho (texto do rodapé) | 14,6 |
| `#a9b8c8` sobre marinho (texto pequeno do rodapé) | 9,3 |
| `--on-estado` sobre `--ok` e `--bad` (o pior dos dois) | 5,7 no claro, 6,4 no sépia, 8,2 no escuro, 9,2 no alto contraste |
| `--corte-ink` sobre `--corte` (selo e botão do corte) | 5,0; 10,3 no alto contraste |
| `--corte-texto` (✂) sobre o fundo e os cartões | 6,5 no claro, 9,6 no escuro, 12,3 no alto contraste |
| `--primary-ink` sobre `--primary` | 6,6 no claro, 7,2 no sépia, 6,5 no escuro, 15,2 no alto contraste |

As correções que levaram a esses valores estão em [Pontos de atenção](#21-pontos-de-atenção).

### 3.12 Grupos de peças e pirâmide (estatísticas)

Tokens de `globals.css` usados em `/estatisticas/`. Cada peça pertence a um grupo pelo momento do processo (o campo
`grupo` de `content/pecas.yaml`); o grupo dá a cor do selo, do medalhão, das barras e das bolinhas. O sépia herda o claro.

| Token | Grupo | Claro | Escuro | Alto contraste |
| --- | --- | --- | --- | --- |
| `--peca-defesa` | Defesa no processo (Resposta à Acusação, Memoriais) | `#15603a` | `#4ade80` | `#7dff9b` |
| `--peca-recurso` | Recursos (Apelação, RESE, embargos, ROC…) | `#1e46b8` | `#7cb4ff` | `#8fc4ff` |
| `--peca-contrarrazoes` | Contrarrazões | `#6222c4` | `#b9a2ff` | `#c4b5fd` |
| `--peca-execucao` | Execução penal (Agravo em Execução) | `#8a4200` | `#fbbf24` | `#ffb347` |
| `--peca-prisao` | Prisão e liberdade (Relaxamento, Liberdade Provisória, Revogação) | `#0b5d75` | `#22d3ee` | `#67e8f9` |
| `--peca-autonoma` | Ações autônomas (Habeas Corpus, Revisão Criminal, Mandado de Segurança) | `#951552` | `#f78fc4` | `#f9a8d4` |
| `--peca-acusacao` | Acusação (Queixa-Crime) | `#a3201a` | `#ff8a80` | `#ff8a80` |

- **Contraste:** todas passam de 4,5:1 como texto sobre o fundo, os cartões, as faixas e o selo tingido do próprio grupo
  (a cor a 12% sobre o cartão). Os piores casos são o sépia sobre `--bg-alt` (4,6:1, execução e acusação) e o escuro sobre
  o próprio selo (5,4:1).
- **Na sequência das peças,** a peça mais cobrada de cada grupo vai na cor cheia; as outras do mesmo grupo vão em tons
  mais claros (58%, 34% e 20% da cor sobre o cartão), com uma legenda embaixo.

A pirâmide e o pódio usam as cores de medalha, com o texto em `--podio-ink`; do 4º andar em diante (pirâmide de 5 ou
7 peças), os andares são neutros, de `--surface-2` a `--border`, com o texto em `--text`. A pizza e o mosaico usam a cor
de cada peça (a do grupo, nos tons da sequência), e "as outras" vão em `--border` / `--surface-2`.

| Token | Claro, sépia e escuro | Alto contraste |
| --- | --- | --- |
| `--podio-ouro` (1º) | `#d69c45` | `#ffd84d` |
| `--podio-prata` (2º) | `#b9c3cf` | `#ffffff` |
| `--podio-bronze` (3º) | `#c98250` | `#ffb347` |
| `--podio-ink` | `#03112c` (7,8:1 no ouro, 10,5:1 na prata, 6,1:1 no bronze) | `#000000` |

Os andares vão num degradê da cor clareada (60% a 70% com branco) para a cor cheia.

---

## 4. Tipografia

### 4.1 Famílias

Carregadas por `next/font/google` em `layout.tsx` (subconjunto latino, `display: swap`), cada uma numa variável CSS:

| Família | Variável | Pesos | Papel | Reserva |
| --- | --- | --- | --- | --- |
| **Inter** | `--font-inter` → `--font-body` | todos (fonte variável) | texto, botões, números, interface | `system-ui, -apple-system, "Segoe UI", sans-serif` |
| **Cormorant Garamond** | `--font-cormorant` → `--font-title` | 600 e 700 | títulos `h1` a `h3`, nome da marca, números de exame, títulos de cartões | `Georgia, "Times New Roman", serif` |
| **Atkinson Hyperlegible** | `--font-atkinson` | 400 e 700 | "Fonte de leitura facilitada": substitui as duas acima | `system-ui, sans-serif` |
| **Carlito** | `--font-carlito` | 400 e 700 | impressão no padrão FGV (mesmas medidas da Calibri) | `Calibri, "Liberation Sans", Arial, sans-serif` |
| Monoespaçada do sistema | `--font-mono` | — | códigos de verificação, chave de API, atalhos (`kbd`), comandos | `ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace` |

Para as imagens geradas fora do navegador, `assets/fontes/` guarda Inter 500, Inter 800 e Cormorant Garamond 700 em WOFF
(Google Fonts, licença OFL).

### 4.2 Escala

A base é a do navegador (16 px). O usuário muda a raiz com "Tamanho do texto", e tudo em `rem` acompanha:

| Opção | `font-size` da raiz | Base |
| --- | --- | --- |
| A− | 90% | 14,4 px |
| A (padrão) | 100% | 16 px |
| A+ | 112,5% | 18 px |
| A++ | 125% | 20 px |

| Elemento | Família | Tamanho | Peso | Entrelinha | Outros |
| --- | --- | --- | --- | --- | --- |
| `h1` | título | `clamp(2.2rem, 5vw, 3.6rem)` | 700 | 1,15 | espaçamento −0,01 em |
| `h2` | título | `clamp(1.7rem, 3.4vw, 2.5rem)` | 700 | 1,15 | |
| `h3` | título | 1,35 rem | 700 | 1,15 | |
| Texto (`body`) | Inter | 1 rem | 400 | 1,6 | suavização `antialiased` |
| `.lead` (abertura) | Inter | 1,15 rem | 400 | | cor secundária, até 60 caracteres por linha |
| `.eyebrow` (sobrancelha) | Inter | 0,78 rem | 700 | | maiúsculas, espaçamento 0,14 em, `--accent-ink` |
| Rótulos de grupo (`legend`) | Inter | 0,72 a 0,78 rem | 700 | | maiúsculas, espaçamento 0,06 a 0,1 em, cor secundária |
| Cabeçalho de tabela | Inter | 0,72 a 0,75 rem | 700 | | maiúsculas, espaçamento 0,06 a 0,08 em |
| Selos e etiquetas | Inter | 0,65 a 0,75 rem | 700 | | maiúsculas em alguns ("Publicidade", "Pontuação retirada") |
| Botão | Inter | 1 rem (`.btn-sm`: 0,9 rem) | 600 | 1,2 | |
| Links do menu | Inter | 0,95 rem | 600 | | |

Com "Fonte de leitura facilitada": Atkinson Hyperlegible no texto e nos títulos, espaçamento de 0,02 em entre letras e
0,08 em entre palavras, e entrelinha de 1,75.

### 4.3 Números

- **Notas e pontuações grandes:** Inter 800 ou 900, sempre com algarismos tabulares (`font-variant-numeric:
  tabular-nums`). Exemplos:
  - a nota do resultado: `clamp(3.5rem, 10vw, 6rem)`;
  - o tempo da pausa: 2,6 rem;
  - o total do treino: `clamp(2.2rem, 7vw, 3.2rem)`;
  - os pontos do fim de jogo: `clamp(2.2rem, 7vw, 3.4rem)`.
- **Números de exame e de passos:** Cormorant 700, algarismos de altura igual (`lining-nums`).
- **Cronômetros, contagens, tempos e tabelas de pontos:** algarismos tabulares, para não "dançarem".
- **Formato brasileiro:** vírgula decimal ("7,50"), ponto de milhar ("1.000"). No jogo, moedas e XP abreviam com k, M
  e B ("1,4k"), cortando a casa decimal em vez de arredondar.

### 4.4 Outros recursos tipográficos

- **Versalete (`small-caps`):** o título do enunciado no simulado e os títulos de seção da impressão, como nos cadernos
  da FGV.
- **Justificado com hifenização:** o texto do enunciado no simulado e o texto dos PDFs.
- **Itálico:** quase não se usa; aparece nas evidências da correção.
- **Texto vazado:** os rótulos verticais das laterais da correção (só o contorno, `-webkit-text-stroke`).
- **Texto em degradê de ouro:** a frase da comemoração do strike (`background-clip: text`).

### 4.5 Texto do leitor de leis e da folha de resposta

| Ajuste | Leitor de leis | Folha de resposta |
| --- | --- | --- |
| Família | Inter (sem serifa, padrão), Cormorant (serifa) ou monoespaçada | a do site (`--font-sheet`, se definida) |
| Tamanho | 18 px (de 14 a 28 px) | 15 px, escolhido pelo aluno |
| Entrelinha | 1,7 | 2 × o tamanho da letra (o texto cabe na pauta) |
| Largura | coluna de 44 rem, ou "largura livre" | papel de 36 rem (576 px no tamanho padrão) |
| Recuo | incisos +1,5 em, alíneas +3 em | Tab de 2,25 em |

---

## 5. Espaço, forma e profundidade

### 5.1 Espaçamento

| Token | Valor | Uso |
| --- | --- | --- |
| `--space` | 1 rem (0,7 rem no "Layout compacto") | unidade base |
| `.section` | `padding-block: 5 × --space` | seções das páginas |
| `.card` | `padding: 1.5 × --space` | cartões |
| `.grid` | `gap: 1.25 × --space` | grades |
| `.container` | `width: min(100% - 2rem, 1180px)` | largura do conteúdo, com 1 rem de margem de cada lado |
| `--maxw` | 1180 px | largura máxima |

Larguras de leitura usadas: 46 ch (abertura do início), 60 ch (`.lead`), 80 ch (aviso do resultado), 44 rem (lei),
46 a 52 rem (questão no modo foco), 820 px (FAQ), 860 px (início do simulado, páginas do PDF), 900 px (simulado em
coluna).

### 5.2 Cantos

| Token ou valor | Uso |
| --- | --- |
| `--radius` 14 px (10 px no compacto) | cartões, painéis, menus, caixas |
| `--radius-sm` 8 px | campos, chips de tema, botões pequenos |
| 999 px (pílula) | botões, links do menu, chips, filtros, campos de busca, selos |
| 50% | botões redondos de ícone, bolinhas, avatares |
| 12 px | números de exame, itens de lista, cartões do treino e do leitor |
| 18 a 22 px | diálogos grandes (pausa: `--radius` + 6 px; questão: 20 px; menu do jogo: 22 px) |
| 20 px 20 px 0 0 | painéis que sobem de baixo, no celular |
| 4 px | páginas de PDF na tela, anel de foco |

### 5.3 Bordas

- 1 px `--border` em cartões, campos, chips e tabelas.
- 1,5 px transparente nos botões (para não pular de tamanho quando a borda aparece).
- Item escolhido: borda `--primary` e um anel interno de 1 a 2 px (`box-shadow: inset 0 0 0 1px var(--primary)`).
- Destaque lateral: borda esquerda de 3 px (avisos, explicação, critério cortado, trecho citado); 4 a 5 px nos grupos de
  leis.
- Tracejado: área de "adicionar", critério cortado (✂), destinos do slide do leitor.

### 5.4 Sombras e camadas

| Sombra | Uso |
| --- | --- |
| `--shadow` (duas camadas, leve) | cartões, menus, folha de resposta, palco do jogo |
| `0 6px 18px rgb(214 156 69 / 0.35)` | brilho do botão dourado |
| `0 10px 30px rgb(0 0 0 / 0.16 a 0.28)` | barras e balões flutuantes do leitor, toast |
| `0 24px 60px rgb(0 0 0 / 0.35)` | caixa da pergunta, menu do jogo, janelas por cima |
| `0 30px 80px rgb(3 17 44 / 0.4)` | caixa de pausa do simulado |
| `none` | alto contraste |

Vidro (translúcido com desfoque):

| Elemento | Fundo | Desfoque |
| --- | --- | --- |
| Cabeçalho | `--bg` 88% | `saturate(1.4) blur(10px)` |
| Barra de documentos em `/provas/todos` | `--surface` 92% | `blur(8px)` |
| Dock do leitor | painel 94% | `blur(8px)` |
| Botão claro da abertura do início | branco 12% | `blur(4px)` |
| Menu flutuante do modo foco (celular) | `--surface` 88% | `blur(6px)` |

Véus atrás de diálogos: marinho a 45% (pausa do simulado) ou 55% (pergunta do jogo), preto a 28% a 55% (painéis e
`dialog::backdrop`).

A ordem das camadas (`z-index`) está no [apêndice](#22-apêndice-inventário-do-css).

---

## 6. Movimento

### 6.1 Princípios

- As transições de interface são curtas: **0,12 a 0,25 s**, `ease` ou `ease-out`.
- Quando abrem, painéis e caixas sobem 4 px e aparecem (`opacity` 0 → 1). Os painéis de baixo sobem da borda; os
  laterais entram da direita.
- Elevação ao passar o mouse:
  - botões sobem 1 px (`translateY(-1px)`) e voltam ao clicar;
  - cartões do início sobem 3 px;
  - tiles das redes, 1 px.
- O que é destaque pisca uma vez e some. Exemplos:
  - o artigo encontrado: 1,6 s;
  - a marca do critério: 2,6 s;
  - o trecho citado: 2,8 s.
- Brilho contínuo só em conquistas: leitura completa, strike, poder pronto.
- **Movimento reduzido:** com `prefers-reduced-motion: reduce`, uma regra global leva toda animação e transição a
  0,01 ms. Os componentes ainda desligam, um a um, as animações decorativas: comemorações, confetes, brilhos e o pulso
  do poder pronto.

### 6.2 Animações características

| Animação | Onde | O que faz |
| --- | --- | --- |
| `grifar` | leitor | o marca-texto se estende da esquerda para a direita (0,35 s) |
| `destaque`, `destaqueSome` | leitor, cartão do artigo | fundo dourado que desaparece |
| `brilho`, `brilhoNome` | barra e faixa de leitura completa | reflexo de ouro que corre (2,6 s, contínuo) |
| `shake` | folha de resposta | treme ao bater no limite de linhas |
| `fade` | pausa do simulado | véu aparece (0,2 s) |
| `subir`, `lado` | painéis do leitor | sobem de baixo (celular) ou entram da direita (computador) |
| `spin` | correção por IA | girador de 16 px |
| `copiarPulso`, `copiarTremer` | copiar questão | folhas viram um ✓ (sucesso) ou o botão treme (falha) |
| `entrar`, `tremer`, `piscar` | bolinhas do strike | quicam ao acender, tremem ao zerar, piscam em onda no strike |
| Comemoração do strike | treino | clarão dourado, raios girando, onda de choque, estilhaços, frase em ouro palavra por palavra, pó dourado caindo |
| Líquido do menu | modo foco | o botão enche como um copo, ondula, vira ouro no strike e escorre |
| `pulsarPoder` | HUD do jogo | o poder pronto pulsa um halo na cor dele |
| `avisoAuto`, `avanco` | jogo e treino | aviso de subida ou descida de nível entra, fica e sai |
| `ganhou`, `moedaSobe` | vídeos do jogo | chuva de moedas que sobe e some |

A lista completa de `@keyframes` está no [apêndice](#22-apêndice-inventário-do-css).

---

## 7. Componentes

### 7.1 Botões (`globals.css`)

Base `.btn`:
- **Forma:** `inline-flex`, pílula (999 px), espaço de 0,5 rem entre ícone e texto, preenchimento de 0,75 rem por
  1,25 rem.
- **Texto:** peso 600, entrelinha 1,2.
- **Movimento:** transição de 0,15 s em posição, fundo e sombra; sobe 1 px ao passar o mouse.
- **Desabilitado:** opacidade 50%, cursor "proibido" e sem movimento.
- **Foco pelo teclado:** anel `--focus` mais um contorno de 2 px na cor do texto, afastado 3 px. O anel vence a sombra
  dourada.

| Variante | Fundo | Texto | Borda | Uso |
| --- | --- | --- | --- | --- |
| `.btn-gold` | `--accent` | `--on-accent` (marinho) | — | ação principal da página ("Fazer um simulado grátis", "Jogar") |
| `.btn-primary` | `--primary` | `--primary-ink` | — | ação secundária forte ("Jogar agora" no banner) |
| `.btn-ghost` | transparente (`--surface-2` ao passar o mouse) | `--text` | `--border` | ações neutras (Copiar imagem, Baixar PNG) |
| `.btn-sm` | — | 0,9 rem | — | preenchimento 0,45 × 0,9 rem |
| Botão claro (abertura do início) | branco 12% (22% ao passar o mouse), vidro | branco | branco 55% | sobre a foto |
| Perigo (`.btnPerigo`, leitor) | transparente (vermelho 10% ao passar o mouse) | `--bad` | `--bad` 45%, 1,5 px | excluir |

Outros botões:
- **Redondos de ícone:** 38 a 44 px, borda `--border`, fundo `--surface`, ícone na cor secundária. Ligados (`aria-pressed`),
  ficam com borda e ícone `--primary` e fundo `--primary` 12%.
- **Link-botão:** sem fundo, sublinhado, `--primary` ou cor secundária ("Restaurar padrão", "Abandonar").

### 7.2 Escolhas: chips, segmentos e interruptores

| Componente | Desenho | Estado escolhido |
| --- | --- | --- |
| Chip (tema, tamanho do texto) | caixa de `--radius-sm`, borda, fundo `--surface-2`, 0,88 rem | borda `--primary` + anel interno de 1 px |
| Chip pílula (filtros, quantidade de questões, categorias) | pílula, altura mínima de 40 px, borda, peso 700 | borda e texto `--primary`, anel de 1,5 px, ou fundo `--primary` 10% |
| Segmentado (versão do documento, fonte do resultado) | grupo em pílula com fundo `--surface-2` | botão cheio de `--primary` com texto `--primary-ink` |
| Interruptor (`PreviaSwitch`) | pílula com trilho de 36 × 20 px e bolinha branca de 14 px | trilho `--primary`, a bolinha anda 16 px |
| Interruptor do leitor (`.alternar`) | trilho de 40 × 24 px na cor da borda, bolinha de 18 px | trilho na cor do link do leitor |
| Caixa e rádio | nativos, de 18 a 20 px, com `accent-color: var(--primary)` | |
| Cartão de opção (leitor, Vade Mecum) | caixa de 12 px com a marca, o título (650) e uma linha de explicação | borda `--primary` e fundo `--primary` 8% |

### 7.3 Campos

- **Busca e filtros:** pílula, preenchimento de 0,6 rem por 0,9 rem, borda `--border`, fundo `--surface`.
- **Formulários (IA, Vade Mecum, quiz):** cantos de 8 a 12 px, fundo `--surface` ou `--surface-2`.
- **Áreas de texto:** redimensionáveis na vertical; a de uma linha cresce com o texto (`field-sizing: content`).
- **Código de verificação:** monoespaçada, maiúsculas, espaçamento 0,05 em, em pílula.
- **Foco:** contorno de 2 px `--primary` afastado 1 a 2 px, ou o anel `--focus`.

### 7.4 Cartões, selos e listas

- **`.card`:** fundo `--surface`, borda de 1 px, cantos `--radius`, sombra `--shadow`. Nos cartões que são links, a
  borda fica dourada ao passar o mouse.
- **`.badge`:** pílula de 0,75 rem, peso 700, fundo `--surface-2`, cor secundária, borda.
- **`.badge-gold`:** fundo `--accent` 22%, texto `--accent-ink`, sem borda.
- **Selo "preliminar":** pílula de 0,68 a 0,72 rem, fundo `--warn` 18%, texto `--warn`. Marca o gabarito que a FGV
  ainda não tornou definitivo.
- **Contagem:** pílula pequena com número ("3"), de cor cheia (laranja do corte) ou suave (`--bad` 18%, `--warn` 22%,
  `--accent` 25%).
- **Grades:** `.grid-3` (colunas de no mínimo 260 px) e `.grid-2` (no mínimo 320 px), em `auto-fit`.
- **Perguntas frequentes:** `<details>` com linha de 1 px embaixo e o resumo em peso 600.

### 7.5 Tabelas

- Cabeçalho em maiúsculas pequenas (0,72 a 0,75 rem), cor secundária, fundo `--surface-2`. Em `/provas/`, o cabeçalho
  fica preso no alto, abaixo do cabeçalho do site (`top: 4rem`).
- Linhas separadas por 1 px; a linha sob o mouse fica com `--surface-2`; a linha-alvo de um link (`:target`), com
  `--accent` 16%.
- Números à direita, com algarismos tabulares.
- **Abaixo de 980 px** (ou na "Versão Celular"), a tabela de provas vira cartões:
  - cada linha é um cartão em duas colunas;
  - cada botão traz o próprio nome, e nada depende do cabeçalho;
  - os botões têm altura mínima de 44 px.

### 7.6 Diálogos, painéis e balões

| Tipo | Desenho |
| --- | --- |
| Diálogo grande (PDF em `/provas/`) | `min(1100px, 96vw)` × `min(90vh, 920px)`, cantos `--radius`, fundo de trás preto a 55% |
| Caixa de pausa (simulado) | até 440 px, centrada, fundo `--bg`, sombra marinha forte |
| Pergunta do jogo e do treino | até 980 px (com o vídeo ao lado, 260 px) ou 860 px; cantos de 20 px |
| Painel de baixo (celular) | sobe da borda, cantos de cima de 18 a 20 px, alça de 40 × 4 px no topo |
| Painel lateral (leitor, a partir de 900 px) | 400 px à direita, cantos de 18 px, entra deslizando |
| Menu suspenso | `--surface`, borda, `--radius`, `--shadow`, abre 8 px abaixo do botão |
| Dica (`data-dica`, `data-tip`) | invertida (fundo `--text`, texto `--bg`), 0,75 rem, peso 600, cantos de 8 px; aparece depois de 0,35 s com mouse, ou já no foco pelo teclado |
| Toast | pílula invertida, centrada embaixo, sombra forte |
| Balão sobre o dedo (menus do jogo) | marinho a 94%, branco, com a ponta (seta) embaixo |

### 7.7 Barras de progresso

| Barra | Desenho |
| --- | --- |
| Nota por parte (resultado) | 10 px, pílula, fundo `--surface-2` com borda; preenchimento em degradê do azul `--blue` ao ouro `--accent` |
| Leitura da lei | 10 px, fundo na cor do grupo a 14%, preenchimento em degradê da cor do grupo; ouro com brilho quando completa |
| Acerto por grupo (treino) | 8 px; verde até a porcentagem, vermelho suave no resto |
| Taxa de acertos (menu do foco) | 3 px; verde `#2fd38a` até a taxa, vermelho `#ff4d4d` no resto, pulsando |
| Nível do treino | três a cinco barrinhas de 14 × 5 px; acendem em `#e6b13b`, `#ff8a3d` e `#ff3d4a`, do nível 1 ao 3 |
| Poder no jogo | 38 × 5 px, branco 25% com preenchimento ouro (ou na cor do poder próprio) |

### 7.8 Meandro (borda grega)

- **Na página (`.meander`):** uma faixa de 14 px de altura, pintada de `--accent` através de uma máscara SVG que se repete
  na horizontal. O módulo tem 28 × 14 px e é desenhado com traço de 2 px. A opacidade é de 80%. A faixa fica no topo do
  rodapé.
- **No canvas (`meandro()`):** a borda completa em volta do card e das prévias.
  - Espirais quadradas em ouro `#d69c45`, com traço de 16% do módulo e pontas quadradas.
  - Um retângulo fino fecha a borda.
  - O módulo e a margem mudam com o formato (ver a seção 15).

---

## 8. Ícones

| Família | Desenho | Tamanho | Arquivo |
| --- | --- | --- | --- |
| **Interface** (menu do jogo, quiz, treino, leitor, Vade Mecum) | traço simples, `viewBox 0 0 24 24`, sem preenchimento, traço de 1,8 a 2,4 px, pontas e junções redondas, na cor do texto | 14 a 20 px | `src/games/IconesMenu.tsx`, SVGs inline nos componentes |
| **Copiar, Baixar, Compartilhar** | traço, na cor do texto | 1,1 em | `src/components/IconesRedes.tsx` |
| **Redes sociais** | símbolos oficiais nas cores das marcas: WhatsApp, Facebook, Instagram (degradê), Threads, LinkedIn e e-mail vêm do site eric.adv.br; X, TikTok, Telegram, Bluesky, Pinterest, Reddit e Discord vêm do Simple Icons | 30 px, num tile com o nome embaixo | `src/components/IconesRedes.tsx` |
| **Peças** | ilustrações do número do artigo de cada peça com um objeto (o 593 escrito com pena, o 648 com cadeado, chave e ampulheta, o 581 numa placa…), em tinta, ouro, papel e metal | variável | `public/icones/pecas/*.svg` |
| **Poderes** | medalhão de 64 × 64: círculo marinho `#03112c` com aro ouro de 3 px, um anel interno ouro a 45% e o símbolo do poder no meio (escudo, chama, garras, baú…) | 22 px (HUD), 26 px (menu, ficha), 28 px (pergunta) | `public/poderes/*.svg` |
| **Pixel** (8-bit) | 16 × 16, ampliados em escala inteira, sem suavizar (`image-rendering: pixelated`) | 22 a 32 px | `public/jogos/flap-suitcase/8bit/` |
| **Emoji** | símbolos simples onde não há ilustração | | início (📜 ⚖️ 💼), jogos (📝 ⚖️), dock do leitor (☰ ⌕ 🖍 ↶ ⛶ ⋯) |
| **Hambúrguer** | três traços de 2 px | 22 px | `MenuMobile.tsx` |

Sinais de texto usados como ícones: ✓, ✗ e − na correção; ✂ para cortar pontuação; ✎ para anotação; → no fim das
chamadas ("Ver provas →"); ▾ e ▴ nos blocos que abrem; ▶ no vídeo.

---

## 9. Estrutura do site: cabeçalho, rodapé e menus

### 9.1 Cabeçalho (`SiteHeader`)

- **Posição:** preso no alto (`sticky`, camada 50), com altura mínima de 64 px.
  - Fundo: o fundo da página a 88%, com vidro (`saturate(1.4) blur(10px)`).
  - Linha de 1 px embaixo.
  - A rolagem para âncoras deixa 5,5 rem de folga no alto (`scroll-padding-top`), para o título não ficar atrás dele.
- **Marca:** o grifo (38 px) e "Grifo" em Cormorant 1,6 rem, à esquerda.
- **Navegação:** Provas, Simulados, Estatísticas, Vade Mecum, Jogos e Curso.
  - Links em pílula, peso 600, 0,95 rem; fundo `--surface-2` ao passar o mouse.
  - A faixa rola na horizontal, sem barra visível.
  - **Resumo do desempenho:** com o mouse por cima de "Estatísticas" (0,16 s) ou com o foco do teclado, abre um cartão
    de 340 px logo abaixo do link (camada 60, cantos de 14 px, sombra dos cartões flutuantes, surge em 0,14 s). Ele
    mostra, do navegador: os simulados feitos (com um anel em `--primary`), a média (verde ou vermelha pelo corte) com a
    tendência, o acerto no treino, a linha das últimas notas com o corte tracejado em `--accent`, as duas últimas
    semanas de estudo (os tons do calendário), o ponto fraco da peça, a categoria que a pessoa mais erra e o artigo que
    mais erra, e o link "Ver tudo em Estatísticas". Fecha ao tirar o mouse (0,22 s), com o Esc e ao rolar. O conteúdo é
    carregado só na primeira vez; no toque, o link só navega.
- **Botão "Aa":** 40 px, redondo, com "Aa" em Cormorant 700. Abre os modos de visualização (seção 17).
- **Celular:**
  - até 560 px, o nome "Grifo" some e os links encolhem;
  - até 420 px, some o último link (Curso);
  - na "Versão Celular", até 640 px, os links viram o menu hambúrguer (botão de 44 px; painel de no mínimo 12 rem, com
    itens de 44 px de altura).
- **Atalho de teclado:** "Pular para o conteúdo" aparece no canto ao receber o foco.

### 9.2 Rodapé (`SiteFooter`)

- **Cores:** fundo marinho, texto `#dbe4ee`, links brancos. No alto contraste, fundo preto e linha branca em cima.
- **Abertura:** o meandro dourado corre no topo.
- **Margem:** fica 4 rem abaixo do conteúdo.
- **Conteúdo:**
  - o grifo dourado (44 px), "Grifo" (Cormorant 1,5 rem, branco) e o slogan;
  - os links das páginas e "Verificar nota";
  - os e-mails de sugestão e de erro;
  - o aviso de material independente e o "©".
- **Texto pequeno:** 0,85 rem, `#a9b8c8`.
- **Leitor e modo foco:** o rodapé some no leitor de leis e no modo foco.

### 9.3 Espaço promocional (`PromoSlot`)

Cartão de até 320 px (ou a largura toda, no modo compacto), com etiqueta em maiúsculas pequenas no canto
("Grifo", "Publicidade", "Aula Grifo"). Há três tipos:
- **Anúncio da casa:** o grifo dourado, o título em Cormorant 1,3 rem, o texto em cor secundária e a chamada com "→" em
  `--primary`.
- **Rede de anúncios:** caixa com altura mínima de 250 px.
- **Vídeo:** capa 16:9 a 85%, com o ▶ num círculo preto de 56 px; o player só carrega ao clicar.

---

## 10. Páginas

### 10.1 Início (`/`)

1. **Abertura (hero).**
   - Altura `min(88vh, 760px)`, texto branco.
   - Fundo: a ilustração do Partenon ao pôr do sol, ou, sem ela, um degradê do azul `#1a5b93` ao ouro `#c98f45` com a
     silhueta de um templo (`#0b2446`).
   - Um véu marinho escurece a direita, onde fica o texto, alinhado à direita, com até 560 px e sombra suave.
   - Conteúdo:
     - a sobrancelha dourada "2ª Fase OAB · Direito Penal";
     - o título em três linhas, "A peça certa. / Os artigos certos. / **A aprovação.**", a última em ouro;
     - a abertura em `#eef3f9`;
     - dois botões: o dourado e o claro de vidro.
   - Até 800 px: o véu desce de cima para baixo, o texto vai para a esquerda e o templo fica maior e mais claro.
2. **Ferramentas:**
   - três cartões com um quadrado de 52 px (dourado a 18%, cantos de 14 px) e um emoji;
   - título, texto e a chamada com "→";
   - ao passar o mouse, o cartão sobe 3 px e a borda fica dourada.
3. **Como funciona:**
   - seção de fundo alternado, com quatro passos;
   - cada passo tem um círculo marinho de 44 px com o número em ouro (Cormorant 1,4 rem);
   - no tema escuro, as cores se invertem.
4. **Banner do jogo:**
   - duas colunas: o texto (sobrancelha, título, abertura, botão azul) e a capa 16:9 com cantos e sombra;
   - até 800 px, uma coluna.
5. **Curso:**
   - bloco marinho de 5 rem em cima e embaixo;
   - o grifo dourado grande, o título branco e a lista com marcadores dourados;
   - o botão dourado e "Inscrições em breve." em letra pequena.
6. **Perguntas frequentes:** até 820 px, cada pergunta abre e fecha.

### 10.2 Provas (`/provas/`)

- Filtros em pílula e a tabela de exames, que vira cartões no celular (7.5).
- **Número do exame:** Cormorant 1,2 rem, peso 700. Embaixo, o link para a página da FGV, em 0,75 rem.
- **Botões de baixar:** pílulas com borda. O do PDF atualizado é dourado (`--accent` 20% com texto `--accent-ink`).
  O selo "preliminar" fica dentro do botão.
- **Visualizador:** diálogo grande com abas em pílula e o PDF embutido. A conferência de texto fica em duas colunas
  (texto e nota). A nota total vem em Cormorant 2,4 rem; "Aprovado" sai em `--primary`, e "Reprovado" na cor
  secundária.
  - **Setas:** dos lados do título, pílulas de `--surface-2` com "‹" ou "›" (1,35 rem) e o numeral do vizinho; sem vizinho,
    a 40%. No celular (até 640 px) só a seta fica, o título vai ao meio e os botões descem para a linha de baixo.
  - **Troca de exame:** pelas setas, pelas setas do teclado ou com o dedo de lado (60 px, mais na horizontal que na
    vertical, fora do que rola de lado). A aba escolhida continua, e o conteúdo entra deslizando 28 px do lado de onde
    veio (0,22 s; sem movimento reduzido, nada).
  - **Nas estatísticas:** o "Ver a prova" abre o mesmo diálogo sem sair da página, no caderno original e na página 2
    (`#page=2`). As setas andam pelos exames da lista como está filtrada. A pontuação vem do recorte `/dados/exames`
    quando a aba abre.
- **Todos os documentos (`/provas/todos/`):**
  - uma barra de vidro presa no alto (`top: 4.25rem`) com o tipo, a versão (segmentados), a busca e o "Ir para";
  - as páginas são folhas brancas de cantos de 4 px, com sombra, uma embaixo da outra (até 860 px);
  - a palavra buscada ganha um marca-texto dourado sobre a imagem (`rgb(245 197 66 / 0.45)`, `multiply`);
  - no celular, a barra não fica presa.
- **Folha de resposta e caderno de caligrafia:** campos em pílula, controles deslizantes em `--primary` e uma linha
  tracejada separando a caligrafia.

### 10.3 Simulados (`/simulados/`)

- **Lista:** cartões com o número romano do exame num bloco marinho de 64 × 56 px (cantos de 12 px), com o número em
  ouro (Cormorant 1,15 rem). No tema escuro, o bloco usa `--surface-2`.
- **Histórico:** pílulas com a nota em algarismos tabulares, verde ou vermelha.

### 10.4 Simulado (`/simulados/<exame>/`)

- **Início:** até 860 px, com as regras em lista, a caixa de confirmação e os botões.
- **Barra da prova:** presa abaixo do cabeçalho do site (no topo, em tela cheia), com fundo `--bg` e linha embaixo.
  - As abas (Peça, Questão 1…) são pílulas em cor secundária. A atual fica em `--surface`, com borda e sombra.
  - Uma bolinha verde de 7 px marca a parte já respondida.
  - O cronômetro, em algarismos tabulares, fica numa caixa `--surface-2`. Perto do fim, fica vermelho.
- **Faixa de alerta:** fundo `--bad`, texto `--on-estado`.
- **Corpo:** duas colunas, o enunciado (5 partes) e a folha (6 partes), com 2 rem entre elas.
  - O enunciado é um cartão preso na rolagem.
  - O título do enunciado vem em versalete, com um fio de 3 px na cor do texto embaixo, como no caderno da FGV.
  - O texto do enunciado é justificado, com 0,97 rem.
  - Até 960 px, uma coluna.
- **Pausa:** o corpo desfoca (`blur(14px) saturate(0.6)`). Sobre um véu marinho a 45% aparece a caixa com:
  - a sobrancelha dourada;
  - o tempo em Inter 800, 2,6 rem;
  - o resumo das partes, com "vazia" em vermelho.

### 10.5 Folha de resposta (`AnswerSheet`)

A folha imita a pauta da FGV:

| | Claro | Escuro e alto contraste | Sépia |
| --- | --- | --- | --- |
| Papel | `#ffffff` | `#0b1730` | `#fbf5e8` |
| Pauta | `#c9c9c9` | `#2a3d63` | `#d7c7a6` |
| Faixa de 5 em 5 linhas (numeração) | `#dcdcdc` | `#1a2b4d` | `#e9dcc1` |
| Tinta | `#0d1b3d` | `#eef2f7` | `#33291e` |

- **Moldura:** borda `#9a9a9a`, sombra `--shadow`.
- **Numeração:** à esquerda, numa coluna de 3 rem, em 0,75 rem, `#8a8a8a`. Cada quinta linha tem fundo cinza.
- **Pauta:** desenhada com `repeating-linear-gradient`, uma linha a cada entrelinha (2 × a letra).
- **Cursor:** azul (`--primary`). O texto aparece numa camada por baixo da área de digitação.
- **Barra da folha:** presa abaixo da barra da prova, com os controles reduzidos a ícones de 2 rem. A letra se ajusta
  num painel que abre ao passar o mouse.
- **Largura:** o papel tem largura fixa (36 rem) e rola na horizontal se a tela for estreita. Na "Versão Celular",
  "Ajustar à tela" tira a régua e a pauta, e a folha cresce com o texto.
- **Limite de linhas:** a folha treme.

### 10.6 Resultado e correção

- **Topo:** duas colunas, com a nota grande à esquerda.
  - A nota vem em Inter 800, de 3,5 a 6 rem; o "/10,00" sai a 35% do tamanho, em cor secundária.
  - O estado ("Aprovado(a)") fica em verde ou vermelho.
- **Barras por parte:** grade de 6 rem, barra, 4,5 rem e 6,5 rem. Cada barra é um link para a correção da parte.
- **Partes:** blocos que abrem, com o título em Cormorant 1,3 rem e a nota em algarismos tabulares.
  - Avisos: peça inadequada em vermelho a 14%; não identificada e vazia em âmbar a 14%.
  - Tabela de itens com o número do item em cinza (800). A nota de cada item vem em verde (cheia), âmbar (parcial) ou
    vermelho (zero).
  - Os critérios levam ✓ (verde) ou ✗ (vermelho), a evidência em itálico pequeno, o que faltou em vermelho e a nota da
    IA em `--primary`.
- **Correção detalhada:** a resposta e a tabela lado a lado (resposta 1, tabela 1,15), com a resposta presa na rolagem.
  Até 900 px, em coluna.
  - **Barra de controles:** flutua sobre o texto a 35% de opacidade e fica opaca ao passar o mouse. Tem os segmentados
    e o ✂.
  - **Trechos que pontuaram:** o grifo amarelo forte (3.4). O enunciado tem a linha do critério grifada.
  - **Recurso automático:** uma caixa com borda laranja; o texto editável fica sobre uma cópia onde a marcação aparece.
    As ações são ícones que mostram o nome ao passar o mouse.
  - **Rótulos laterais:** o exame, a fase e a matéria correm na vertical, vazados, nas duas bordas da tela. Somem
    abaixo de 1.280 px.
- **Código de verificação:** monoespaçada, em cor secundária.
- **Card de compartilhar:** prévia à esquerda (até 360 px; a paisagem ocupa a largura toda) e ações à direita (até
  320 px).
  - Os formatos são "Stories / feed" e "Link / LinkedIn".
  - "Compartilhar imagem" aparece só onde o sistema compartilha arquivos.
  - "Copiar imagem" e "Baixar PNG" ficam em duas colunas.
  - Embaixo, a grade das 13 redes (tiles de no mínimo 4,4 rem).
  - Até 720 px, tudo fica em uma coluna.
- **Correção por IA:** caixa com o resumo em `--primary` a 10%, campos em `--surface-2` (a chave em monoespaçada) e um
  girador de 16 px.

### 10.7 Verificar nota (`/verificar/`)

- **Campo:** monoespaçada, em maiúsculas, numa pílula.
- **Resultado:** uma caixa com borda verde ou vermelha e o fundo tingido a 8%. Os dados vêm numa lista de duas colunas,
  e a nota em peso 800.

### 10.8 Leis (`/leis/`)

- **Grupos:** cada grupo (Códigos, Constituição, Estatutos, Leis) tem o título com uma borda colorida de 5 px.
- **Leis:** cada lei é um cartão de `--radius` com a borda esquerda de 4 px na cor do grupo. O nome e o subtítulo
  reservam duas linhas cada, para a barra de leitura ficar alinhada embaixo.
- **Leitor:** ver a seção 11.

### 10.9 Jogos (`/jogos/`)

- **Lista:** cartões de no mínimo 300 px, sem preenchimento, com a capa 16:9 em cima. Sem capa, um degradê de céu
  (`#5a9ed6` → `#bfe0f7`) com um emoji de 4 rem.
- **Cartão:** título de 1,5 rem, texto em cor secundária e o botão dourado pequeno.
- **"Em breve":** a 60% de opacidade, sem link.

### 10.10 Estatísticas (`/estatisticas/`)

Três abas, com a escolhida no endereço (`#exames`, `#desempenho`, `#linha`). Os dados das provas vêm prontos do build
(`src/content/estatisticas.ts`); os pessoais, do navegador.

- **Abas:** presas abaixo do cabeçalho (`top: 4rem`, camada 5), com fundo `--bg` e linha embaixo, como a barra do
  simulado. São pílulas em cor secundária; a escolhida fica em `--surface`, com borda e sombra. As setas do teclado trocam
  de aba. Até 560 px, os nomes encurtam ("Exames", "Desempenho").
- **Filtros:** um cartão com chips de pílula (a época, várias ao mesmo tempo), um segmentado (todos, últimos 20, 10 e 5) e
  a caixa das reaplicações. O segmentado não quebra linha: rola de lado se não couber.
- **Números do topo (`kpi`):** cartões com o rótulo em `--accent-ink` (0,72 rem, maiúsculas), o valor em Inter 800 de
  1,35 a 1,75 rem e a linha de apoio em cor secundária. A média fica verde ou vermelha pelo corte de 6,00.
- **As peças do topo:** três segmentados escolhem o formato (pirâmide, pódio, pizza ou mosaico), quantas peças (3, 5 ou
  7) e o critério (as mais cobradas ou o palpite); a escolha fica no navegador. À esquerda, o formato; à direita, a lista
  das mesmas peças (borda esquerda de 5 px na cor da medalha, a posição em Cormorant, o medalhão, a barra na cor da peça
  e o número em `--accent-ink`, 2 rem no 1º). Até 760 px, a lista vai embaixo e perde a posição.
  - **Pirâmide:** um triângulo (`clip-path`) de até 23 rem, com um andar por peça separado por 4 px da cor do cartão; o
    triângulo fica mais alto com mais andares. O nome vai em maiúsculas, 800, numa largura que acompanha o andar; nos
    andares estreitos do topo (com 5 ou 7 peças), só a posição e o valor, e o nome fica na dica.
  - **Pódio:** três degraus (2º, 1º, 3º) com cantos de 12 px em cima, a altura pelo valor (de 38% a 100% de 17 rem) e o
    degradê da medalha; o nome em cima, a posição em Cormorant 1,6 rem e o valor no degrau.
  - **Pizza:** SVG de até 18 rem, uma fatia por peça a partir do topo, no sentido do relógio, separadas por um fio de
    1,5 px da cor do cartão; a porcentagem vai dentro das fatias de 6% ou mais (Inter 800, 11 px, com contorno da cor do
    cartão para ler sobre qualquer cor). Com o mouse, a fatia sai 6 px do centro. A legenda embaixo diz a base (os N
    exames ou a chance no próximo). Quem tinha escolhido a antiga rosca fica com a pizza.
  - **Mosaico:** retângulos com a área pelo valor (algoritmo "squarified"), em 4:3, com o fundo da cor da peça a 26%, a
    base de 4 px na cor cheia e cantos de 10 px; o nome só nos blocos grandes. Ganha uma coluna mais larga (1,25 : 1).
- **Palpite do próximo exame:** um aviso em `--warn` (borda esquerda de 4 px, fundo a 11%) antes dos números; depois, um
  cartão com o título em Cormorant 1,3 rem e, logo abaixo dele, o teste do palpite nos exames passados, em
  `--surface-2`, com três barras (o 1º do palpite, entre os 3 primeiros e ao acaso). Depois vêm a régua do peso do tempo
  sem cair (0 a 2, com três marcas) e uma linha por peça: a posição, o nome, o porquê em letra menor com o selo do ritmo
  (atrasada em `--warn`, no ritmo em `--primary`, caiu há pouco em cinza, uma vez só com borda tracejada) e a barra da
  chance na cor do grupo. As três primeiras têm o fundo em `--accent` a 7%. Cada barra é focável e tem a dica: a porcentagem em destaque, a conta ("11 de 36
  exames") e os exames em que acertou ("12º, 18º…"); com o mouse, o fundo dela escurece 5%.
- **Número dos exames:** o numeral romano no meio do texto tem sublinhado pontilhado e `cursor: help`. Todo exame (o
  numeral, o quadrado da sequência, as bolinhas, os chips, o mapa, os traços da linha do tempo) tem a dica com o número
  em algarismos em destaque ("45º Exame") e, embaixo, o nome, a data, a banca e o que já se dizia ali. A lista de exames
  mostra o "45º" ao lado do título.
- **Balão das dicas:** invertido (fundo `--text`, letra `--bg`), cantos de 10 px, até 18 rem, camada 120, aparece em
  0,1 s. Com o mouse e com o foco do teclado, na hora; no toque, segurando o dedo 0,35 s (o balão fica 44 px acima do
  dedo e acompanha o dedo ao deslizar; soltar não aciona o botão). Nas telas de toque (`hover: none`), os elementos com dica não selecionam texto nem abrem o menu do aparelho.
- **Prévia dos artigos:** os artigos e súmulas citados (a lista de artigos, a tabela de pontos de cada exame, o fundamento
  na ficha da peça e os artigos que a pessoa mais erra) abrem o pop-up do texto do artigo, o mesmo das leis
  (`PopupArtigos`), com o mouse por cima e com o clique. Dentro da ficha da peça, o pop-up abre por cima dela; o Esc fecha
  primeiro o pop-up e depois a ficha.
- **Medalhão do artigo:** círculo de 3,1 rem com borda de 2 px na cor do grupo e fundo dela a 9%; o número do artigo
  da peça em Cormorant (1,05 rem; 0,82 rem acima de três caracteres, como "396-A") e a sigla da lei em 0,58 rem.
- **Ranking:** linhas em cartão de 12 px com o medalhão, o nome (link-botão) e o grupo, a barra (na escala da peça mais
  cobrada) e a linha de bolinhas de 10 px nos exames em que a peça caiu. Embaixo, a última vez, o intervalo médio e o
  maior intervalo, e o botão "Ver os N exames ↓". Em cima, a barra empilhada dos grupos, com a legenda.
- **Sequência das peças:** um quadrado de 34 px de altura por exame, com 3 px entre eles (2 px acima de 60 exames). Os
  quadrados dividem a largura toda; a faixa só rola de lado quando cada um ficaria com menos de 9 px (no celular, ou com
  muitos exames numa tela estreita). O exame antigo com várias peças divide o quadrado em faixas. O numeral sai a cada
  cinco exames e no último (o que ficaria colado ao último sai); o do último se alinha à direita, sem passar da borda.
  Peça escondida: listras de `--surface-2` e `--border`.
- **Dentro da prova:** dois segmentados (teses ou artigos; peça, questões ou prova toda). As teses são chips agrupados
  (processo, crime, pena, execução) com a contagem num selo dourado. A escolhida abre uma caixa com borda esquerda de
  3 px em `--accent` e fundo a 10%, com os exames em chips de Cormorant. Os artigos são linhas com a posição em
  Cormorant `--accent-ink`, o artigo (link para o leitor), a epígrafe em até duas linhas e a barra em `--primary`.
- **Lista de exames:** cartões de 12 px com o número no bloco marinho dos simulados (64 × 52 px; cinza e sem ouro nos
  exames antigos, que não têm prova no site), o título, o ano, a banca em selo de contorno, o selo da peça e "Na tabela
  de pontos da peça" (abre as teses e os artigos). À direita, a nota da pessoa (pílula verde ou vermelha, com ✓ ou ✗),
  o botão dourado do simulado e os links (prova, caderno, gabarito, FGV). O exame procurado pisca em `--accent` a 22%
  (2,6 s). Até 760 px, as ações vão embaixo.
- **Busca da lista:** o campo, o seletor "Buscar em" (número, ano, peça e tese, o padrão; enunciados; gabaritos; os dois)
  e o botão "Opções da busca", em pílula, que abre um cartão com as três opções (palavra inteira, acentos, maiúsculas) e
  os exemplos da sintaxe em `--font-mono`, num botão de `--surface-2` que põe o exemplo no campo. Nos textos, um
  segmentado escolhe a parte (toda a prova, só a peça, só as questões). Os textos (297 KB comprimidos,
  `public/dados/estatisticas/textos.json.gz`) só são baixados na primeira busca neles. Cada exame achado mostra até três
  trechos numa caixa com borda esquerda de 3 px em `--accent` e fundo a 8%: a parte em maiúsculas pequenas
  (`--accent-ink`), o trecho com os achados em `<mark>` (`--accent` a 45%; no alto contraste, cheio com letra preta) e,
  embaixo, quantos achados e "Ver a prova". Com a peça escondida, o trecho do gabarito fica fechado num link-botão.
- **Os exames achados, por peça:** com uma busca, uma caixa de cantos de 12 px embaixo dela lista uma linha por peça
  (separadas por um traço pontilhado). Cada linha tem um quadrado de 0,75 rem na cor da peça (a da sequência), o nome,
  a quantidade em `.chipNum` e os numerais em pílulas na cor da peça (fundo a 16%, borda a 60%). Na busca nos textos,
  um `<sup>` em `--muted` mostra quantos achados há no exame. As peças escondidas ficam num grupo "Peça escondida" em
  itálico. O toque leva ao exame na lista, sem tirar a busca.
- **Ficha da peça:** um `dialog` de até 560 px, cantos de `--radius` + 6 px, véu marinho a 55%, que sobe 4 px ao abrir.
  O topo tem o medalhão, o grupo em maiúsculas na cor dele e o nome em Cormorant 1,55 rem. Embaixo, a lista "quando
  cabe, prazo, fundamento" e as vezes em que caiu.
- **Meu desempenho:**
  - gráfico das notas em SVG (230 px de altura): grade em `--border`, linha `--primary` de 2,5 px, pontos de 5 px
    (7 px no foco) verdes ou vermelhos, a linha de corte tracejada em `--accent` e a dica invertida acima do ponto;
  - barras por parte da prova e por parte da peça, no degradê azul-ouro das notas;
  - a ordem: os números, as notas, o calendário de estudo, o mapa dos simulados, peça por peça, o treino, onde a pessoa
    ganha e perde pontos, os artigos que mais erra e a leitura;
  - o mapa dos simulados: quadrados de no mínimo 4,8 rem, com borda tracejada nos que faltam e o fundo verde a 12% ou
    vermelho a 9% nos feitos; o exame sorteado pisca como o exame procurado da lista;
  - a sugestão do próximo simulado numa caixa com borda esquerda de 3 px em `--accent` e fundo a 14%. A explicação (que
    pode dizer a peça) só aparece com o clique em "Por que este exame?", com o aviso ao lado em cor secundária;
  - o sorteio de um simulado, na mesma caixa em `--primary` (borda de 3 px, fundo a 8%): o seletor (qualquer exame, a
    peça primeiro ou uma peça só), a caixa "Incluir os que já fiz", o botão azul e o exame sorteado num cartão branco
    com o botão dourado do simulado. A peça do sorteado não aparece (só quando a pessoa escolheu uma peça);
  - o calendário de estudo, em duas formas (a escolha fica no navegador):
    - **Semanas:** quadrados de 15 px (18 px a partir de 1000 px, 12 px até 560 px) com 3 px entre eles, de
      `--surface-2` a `--primary` em quatro tons (28%, 50%, 75% e cheio). Cada mês é um bloco, com o nome em cima e uma
      linha de `--border` à esquerda; os sete dias da semana ficam nomeados ("dom", "seg"…; só a inicial até 560 px) e
      presos à esquerda quando as semanas rolam, e a rolagem começa nas mais recentes;
    - **Mês:** a grade de sete colunas (até 26 rem) com o número de cada dia em quadrados de cantos de 8 px; os dias fora
      do período ficam apagados. A partir de 1000 px, o detalhe do dia fica ao lado;
    - nas duas, o dia com simulado tem um ponto de 5 px em `--accent` no canto, hoje tem um anel interno em `--accent`, e
      o dia escolhido, um contorno em `--accent`. Cada dia é um botão (as setas andam pelos dias) com a dica da data, e o
      clique abre o detalhe embaixo: a data por extenso, as respostas e os acertos (com a barra verde) e os simulados do
      dia, com a nota e o link da correção;
  - as tabelas seguem as de `/provas/` (cabeçalho em maiúsculas pequenas sobre `--surface-2`, números à direita).
- **Linha do tempo:** um panorama e, embaixo, a história. As épocas usam as cores dos grupos de leis: VUNESP
  `--lei-constituicao`, transição `--lei-leis`, CESPE `--lei-estatutos`, FGV `--primary` e hoje `--accent-ink`.
  - **Panorama:** o eixo dos anos (do primeiro exame ao último), proporcional ao tempo, num cartão. De cima para baixo:
    os marcos em círculos numerados de 26 px (borda de 2 px na cor da época; o escolhido cheio e com um anel a 25%),
    afastados uns dos outros pelo menos 30 px e ligados ao ano certo por um traço de 1,5 px (com um colchete quando o
    marco ocupa um intervalo); as faixas das bancas (26 px, a cor a 22% com a borda de cima de 3 px e o nome que couber:
    inteiro, curto ou nenhum); um traço de 4 px por prova, na cor da peça (dividido nas provas de várias peças; listrado
    na peça escondida; mais curto na reaplicação), com a dica do exame; e os anos, de dois em dois (de quatro em quatro
    até 760 px). Os traços são links para a prova, fora da ordem do Tab (os mesmos exames estão na história).
  - **História:** um capítulo por marco, num trilho vertical de 4 px na cor da época. O número do marco vai num círculo
    de 2,6 rem (cheio quando escolhido); o cartão tem a borda esquerda de 5 px na cor da época, o período em maiúsculas,
    o título em Cormorant 1,35 rem, o texto, o destaque com o link e "N provas de Penal no período": quadrados de 14 × 26
    px na cor da peça, links para a prova, com a dica. O marco escolhido no panorama pisca como o exame procurado.
---

## 11. Leitor de leis e Vade Mecum

O leitor (`src/components/leis/`) tem superfície própria (os fundos de 3.7) e ocupa a página inteira na cor escolhida.
Ele esconde o rodapé e, ao rolar, o cabeçalho.

### 11.1 Texto

- **Coluna:** a folha tem até 44 rem, com preenchimento de 0,75 a 3 rem (`clamp`) e cantos `--radius`. Na "largura
  livre", ocupa a tela, com a margem lateral escolhida, e deixa sempre 56 px à direita para o slide.
- **Estrutura:**
  - títulos e capítulos centralizados, em negrito, espaçamento 0,04 em;
  - rubricas em negrito a 0,95 em;
  - os artigos com 0,9 em de espaço acima;
  - incisos recuados 1,5 em e alíneas 3 em.
- **Notas de redação:** "Redação dada pela…" e o "Vide" saem pequenos (0,72 em), em cor secundária, depois do texto.
- **Texto revogado** (quando à mostra): riscado, em cor secundária. Na linha do tempo, "≈" marca o texto aproximado.
- **Estrela:** aparece à esquerda do bloco ao passar o mouse e fica em `#d4a017` quando marcada. No celular, fica
  sempre à mostra, antes do texto.
- **Referências** ("art. 121"): links sublinhados na cor do link do leitor.
  - Quando o diploma não foi identificado, a referência fica com um sublinhado pontilhado e uma dica.
  - O rótulo do artigo tem sublinhado pontilhado e abre o "citado por" (painel escuro HUD, 3.10).

### 11.2 Controles

- **Faixa do nome da lei:** presa no alto quando o título sai da tela, em Cormorant 1,15 rem. No fundo da faixa, a
  parte já lida aparece como um degradê na cor do grupo; completa, ganha o brilho dourado.
- **Seção atual:** uma pílula pequena (0,78 rem) que aparece ao rolar e some depois de um tempo parado.
- **Dock:** uma barra de botões em pílula, centrada embaixo, translúcida com desfoque.
  - Os botões têm 58 × 48 px, com um ícone de 1,15 rem e um rótulo de 0,68 rem: ☰ Leis, ⌕ Buscar, 🖍 Grifar (ou
    "Grifando"), ↶ Desfazer, Aa Leitura, ⛶ Tela cheia, ⋯ Mais.
  - O botão ligado fica com `--primary` a 16%; o "Grifar" ligado, com dourado a 30%.
  - No celular, os botões dividem a largura da tela.
- **Paleta de cores do grifo:** círculos de 34 px, com a cor a 85% e um anel interno fino. A cor escolhida ganha borda
  na cor do texto e cresce 8%. A borracha fica na cor do fundo.
- **Slide de artigos (trilho):**
  - uma faixa de 40 px na borda direita, afastada 10 px (a borda é onde o sistema puxa o gesto de voltar);
  - uma linha de 3 px no meio, com as marcas da página;
  - grifos, estrelas (losango) e erros aparecem como pontos de 7 px na cor deles; grifos prontos, como pontos de 5 px;
  - o pino é uma cápsula dourada de 14 × 40 px com sombra, dentro de uma área de toque de 44 × 56 px;
  - pode ir para a esquerda, para o alto ou para baixo (deitado). Ao arrastar, as quatro bordas possíveis aparecem
    tracejadas em dourado.
  - O cartão do artigo é invertido (fundo `--text`) e mostra o artigo, a seção, as marcas e os modos.
- **Painéis:** no celular, sobem de baixo (até 78% da altura, alça no topo). A partir de 900 px, abrem à direita, com
  400 px.
  - Grupos com legenda em maiúsculas pequenas.
  - Chips de 40 px de altura; as amostras de fonte e de fundo já vêm na fonte e na cor delas.
  - Cartões de ação ("Levar a lei") com ícone de traço azul.
- **"Ir para":** uma caixa de até 34 rem que desce do alto. O item escolhido tem uma barra azul de 3 px à esquerda, e
  os atalhos de teclado vêm em `kbd`.
- **Barra de cores da seleção e detalhe do grifo:** flutuam sobre o texto. O detalhe usa o painel escuro HUD, com a
  citação marcada por uma borda de 3 px na cor do grifo.

### 11.3 No celular

- A folha ocupa a largura toda (sem cantos), com 54 px à direita para o slide e 7 rem embaixo para o dock.
- A margem dos blocos diminui (0,7 em), e os recuos também.

### 11.4 Impressão do leitor e do Vade Mecum

- Só o texto da lei: o site, os controles, os avisos e os links somem.
- Corpo de 11 pt, entrelinha de 1,45, fundo branco e texto preto.
- Os grifos imprimem nas cores deles (`print-color-adjust: exact`).
- Há opções de três colunas e de cada lei numa página nova.
- O Vade Mecum ganha um índice cronológico e um índice alfabético-remissivo, este em duas colunas na tela.

### 11.5 Cartão do artigo (`PopupArtigos`)

- **Na tela:** ao passar o mouse sobre uma referência fora do leitor, abre um cartão de até 340 px (cantos de 14 px,
  sombra forte) com o texto do artigo. Os grifos aparecem iguais aos do leitor.
- **No celular:** vira um painel de baixo.
- **Troca de artigo:** o texto novo entra do lado de onde veio.

---

## 12. Treinar questões e o strike

### 12.1 Página do treino

- **Painel de opções:** cartão de cantos de 18 px.
  - Níveis em três cartões de 12 px (no celular, um embaixo do outro).
  - Quantidade de questões em pílulas: 10, 20, 30, 50 e "∞ Modo infinito". Ao lado, "↗ Modo automático".
  - O recorde vem em `--accent-ink`.
- **Questão:** o mesmo cartão da pergunta do jogo (12.3), sem a caixa escura.
- **Resultado:**
  - o total em peso 900;
  - números em caixas de 12 px;
  - barras de acerto por nível e por tipo;
  - a lista das questões, cada uma com uma barra interna de 3 px à esquerda (verde ou vermelha), número num círculo de
    1,9 rem, título, tempo e pontos. Cada questão abre com a resposta como ficou.
- **Aviso de subida ou descida de nível:** uma pílula no alto, verde ou vermelha clara, que entra, fica e some.
- **Questão anterior:** uma janela de até 46 rem, que entra da esquerda, com o topo preso.

### 12.2 Modo foco

O cabeçalho e o rodapé do site somem. A questão ocupa uma coluna de leitura (largura ajustável, 52 rem por padrão) sem
cartões nem sombras.
- **Topo:** vira uma linha só, com o número, as bolinhas, o tempo e o menu. Os botões secundários ficam a 45% até o
  mouse passar.
- **Caso ao lado:** com mouse e tela larga (a partir de 54 rem de questão), o caso fica parado à esquerda e a resposta
  corre à direita.
- **Celular:** o menu e o XP flutuam no canto, em pílula de vidro.
- **Digitando no celular:** uma faixa na cor do fundo cobre a barra de notificações do Android.

### 12.3 Pergunta (quiz)

- **Caixa:** fundo `--bg`, cantos de 20 px e sombra forte, sobre um véu marinho a 55% (no jogo).
- **Topo:** sobrancelha dourada e título de 1,5 rem.
- **Enunciado:** cartão de 12 px com o botão de copiar no canto. No jogo, o caso rola sozinho até 13 rem.
  - Nas teses das provas, o enunciado é a introdução curta. Abaixo dela, "▸ Ler o caso completo da prova" é um
    `<details>` com o resumo azul (`--primary`, peso 600) e uma seta que gira 90° ao abrir. O caso aparece num quadro
    `--surface-2` com borda de 1 px, cantos de 10 px e rolagem própria até 18 rem.
- **Alternativas:** cartões de 12 px, peso 600, com a letra num círculo de 28 px.
  - Ao passar o mouse, a borda fica azul.
  - No toque, arrastar para o lado risca a alternativa: ela avermelha e fica a 45%, riscada.
- **Resposta:** em verde (14%) ou vermelho (12%).
  - O texto do artigo digitado aparece numa caixa com uma barra vermelha à esquerda e rolagem própria.
  - A revisão das alternativas marca a correta (verde, letra branca em círculo verde) e a errada (vermelha).
- **Botões de ícone:** círculos de 2,25 rem (2,5 rem no toque) para copiar, relatar erro e sugerir, com dica invertida.
  Ao copiar, as folhas viram um ✓ verde.

### 12.4 Strike (as bolinhas)

- **Bolinhas:** de 9 a 14 px, vazias, com a borda na cor delas. Acendem cheias a cada acerto.
- **Cor:** esquenta do azul ao vermelho, conforme a posição: matiz 205 (azul) → 140 (verde) → 45 (ouro) → 25 (laranja)
  → 0 (vermelho), saturação 85% e luminosidade de 48% (52% no último quarto).
- **Movimento:**
  - a bolinha nova quica e brilha;
  - um erro faz todas tremerem;
  - o strike as faz piscarem em onda.
- **Comemoração:** cobre a tela sem bloquear o clique.
  - Um clarão dourado e raios de ouro girando devagar.
  - Uma onda de choque (anel `--festa-ouro`) e estilhaços nas cores das bolinhas, que estouram em faíscas.
  - A frase em ouro, palavra por palavra (peso 900, de 2,2 a 5 rem), com um reflexo que passa.
  - Pílulas escuras com o detalhe e o próximo objetivo.
  - Pó dourado caindo, em três formas: círculo, losango e estrela de quatro pontas.
- **Menu do modo foco:** um botão redondo de 2,9 rem que mostra o placar.
  - O "líquido" sobe com o strike e ondula.
  - No strike, vira ouro com halo e depois escorre devagar, em gotas.
  - Um anel em volta mostra o tempo que não tira pontos e fica vermelho no fim.
- **Estrela do XP:** dourada, com "xp" escrito em `#1d1503`. A cada strike ganha um enfeite, do 1 ao 6:
  1. ouro;
  2. brilho;
  3. reflexo;
  4. raios girando;
  5. duas faíscas em órbita;
  6. halo pulsante.

---

## 13. Jogos

### 13.1 Palco e HUD (`games.module.css`)

- **Palco:**
  - altura `min(78dvh, 720px)`, de no mínimo 460 px;
  - fundo `#0b1830`, cantos `--radius`, sombra;
  - não seleciona texto nem mostra o toque.
  - Em tela cheia, ocupa a janela.
  - Na "Versão Celular", em pé, vai até embaixo do cabeçalho; deitado, quase a tela toda.
- **Contadores (pontos, XP, moedas):**
  - Inter 900, de 1,5 a 2,2 rem, brancos;
  - contorno marinho de 2 px e sombra de 3 px embaixo, como um letreiro de jogo.
  - A estrela do XP é verde (`#6dd66f`), com contorno marinho e "xp" dentro.
  - A moeda é um degradê radial nas cores do estilo (`--moeda-ouro`, `--moeda-borda`).
- **Poderes:** pílulas marinhas a 55% com o ícone e uma barrinha de ouro.
  - O poder do personagem fica cinza até carregar.
  - Pronto, pulsa um halo na cor dele.
- **Botões da HUD:** círculos de 38 px (44 px na "Versão Celular"), marinhos a 55%, ícone branco.
- **Dica de início:** "Toque para começar" no celular, ou "Toque, clique ou aperte espaço para começar", numa pílula
  marinha que pulsa.

### 13.2 Menus

- **Fundo:** um véu radial marinho escurece o palco.
- **Caixa:** até 560 px, fundo `--bg`, cantos de 22 px e sombra forte, com rolagem própria.
  - O título vai de 1,45 a 2,5 rem.
  - No topo, as informações à esquerda e o som, os efeitos e o poder automático à direita, em botões redondos.
- **Botão Jogar:** fica sempre à vista. A barra dele gruda no alto da caixa, com um degradê do fundo para o
  transparente.
- **Opções de pergunta:** segmentos em pílula com ícone. O escolhido fica azul a 13% com anel. A explicação abre numa
  caixa com borda azul de 3 px.
- **Estilos:** grade de cartões de no mínimo 150 px, cada um com uma amostra de 18 px (cantos de 6 px).

  | Estilo | Amostra |
  | --- | --- |
  | Clássico | `#4f9fe0` / `#efe6d6` |
  | Fofo | `#ffc6d9` / `#b8f0cf` |
  | Retrofuturista | `#1b0b40` / `#ff3fd1` |
  | Steampunk | `#6b4a2b` / `#d9a441` |
  | Pixel | xadrez `#5c94fc` / `#c84c0c` |
  | Noir Tribunal | `#111` / `#bbb` |
  | Papiro | `#f1e4c6` / `#3b2a1a` |
  | Recesso Forense | `#9cc3ea` / `#f4f8fd` |
  | Gótico | `#1a1028` / `#b04cff` |

  As amostras com duas cores são em diagonal; os estilos dos grupos usam a amostra própria (`amostra`). Os grupos
  abrem e fecham.
- **Personagens:** quadrados de no mínimo 54 px, só com o desenho.
  - O escolhido ganha borda e anel azuis e um ✓ num círculo azul no canto.
  - Uma ficha fixa embaixo mostra o nome, o requisito e o poder.
  - No toque, segurar e deslizar mostra um balão **acima** do dedo.
- **Poderes (melhorias):**
  - **Grade:** círculos de 46 px com um anel de progresso.
  - **Painel do poder:** borda de 2 px, com a prévia ao vivo (150 × 96 px) e as quatro trilhas.
  - **Trilhas:** cada uma tem um ícone num círculo de 30 px, o texto, as bolinhas de nível (10 px) e o botão de
    melhorar em pílula. O contrapeso sai em vermelho.
  - **Cores do estilo em uso (`coresMenu`):** o fundo é o corpo da coluna, a borda é o contorno da coluna e o acento é
    a cor do recorde (ou a da moeda). O texto sobre o acento é escuro (`#14110c`) ou branco, conforme a luminância.
- **Estilo Pixel:** o menu usa uma moldura 8-bit (`border-image` em 9 partes, 12 px, pixelada), sem cantos
  arredondados.

### 13.3 Estilos do Flap Suitcase

São 68 estilos, de `src/games/flap-suitcase/catalogo.ts`. O Pixel fica fora do menu (`FORA_DO_MENU`).

| Grupo | Estilos |
| --- | --- |
| Principais (9) | Clássico (mármore, mar Egeu e a Acrópole), Fofo (pastel e nuvens de algodão), Retrofuturista (synthwave: sol listrado e grade neon), Steampunk (latão, engrenagens e vapor), Pixel 8-bit, Noir Tribunal (preto e branco, chuva e refletor), Papiro (nanquim sobre pergaminho), Recesso Forense (neve, colunas de gelo e aurora), Gótico (catedral com vitrais, morcegos e neblina) |
| Feriados nacionais (10) | Ano-Novo, Tiradentes, Dia do Trabalho, Independência, Nossa Senhora Aparecida, Finados, Proclamação da República, Consciência Negra, Sexta-feira Santa, Natal |
| Estados (27) | os 26 estados e o Distrito Federal |
| Biomas (6) | Amazônia, Cerrado, Caatinga, Mata Atlântica, Pampa, Pantanal |
| Constituições (7) | Império (1824), República Velha (1891), Era Vargas (1934), Estado Novo (1937), Redemocratização (1946), Ditadura Militar (1967), Constituição Cidadã (1988) |
| Datas do Direito (4) | Ministério Público, Defensoria Pública, Onze de Agosto, Dia da Justiça |
| Festas populares (5) | Lavagem do Bonfim, Carnaval, São João, Festival de Parintins, Círio de Nazaré |

Cada estilo (`Tema`, em `themes.ts`) define:
- **Paleta:**
  - o céu em quatro degradês, um por hora do dia;
  - a camada de longe e a de perto, com quatro cores cada;
  - o chão e a linha do chão;
  - a coluna (corpo, sombra, luz, contorno);
  - a maleta (corpo, escuro, fivela, alça) e a asa (cor, contorno);
  - a moeda e as partículas;
  - o aviso de recorde (texto, fonte, cores e animação);
  - a cor da HUD e a das estrelas.
- **Coluna:** o capitel (dórico, jônico, coríntio ou misto).
- **Som:** a forma de onda e a nota base (o Clássico usa `triangle` a 440 Hz).
- **Clima:** limpo, chuva, neve, folhas, tempestade ou neblina.
- **Desenhos opcionais:** o cenário (`decor`), a coluna, a maleta, o chão, a partícula do clima e a surpresa (easter
  egg).
- **Estética pixel:** com `escala`, o jogo desenha em baixa resolução e amplia; com `semAntisserrilhado`, sem bordas
  suaves.

Exemplo, Clássico:
- céu de dia `#4f9fe0` → `#bfe3fb`;
- colunas de mármore `#efe6d6`, com contorno `#a8977a`;
- maleta de couro `#b8742e`, com fivela `#e8c35a`;
- moeda `#f3c44f` / `#b8860b`;
- recorde em `#2b4f7e`, com "NOVO RECORDE!" em Georgia.

Regras de desenho dos cenários:
- **O mais alto fica atrás.** O que está mais acima na água ou no chão está mais longe e é desenhado antes. Um píer que
  entra no mar divide o que passa por ele.
- **A surpresa entra na camada certa** do cenário (por `surpresa()` dentro do `decor`). A do céu e a que anda no chão
  ficam por cima.
- **Bichos e coisas com os traços que os identificam** (o bico do boto, a faixa do tamanduá…), nunca formas genéricas.
- **Nenhuma faixa de céu** entre a última camada do cenário e o chão.

### 13.4 Visual dos poderes

O nível "Visual" das melhorias mostra **a mecânica e o momento do poder**:
- o caminho do Voo do Grifo;
- a coluna sendo arquivada no Arquivamento;
- a vida ganha pela Fênix.

Um efeito genérico (um brilho ou um anel sozinho) não basta. As cores saem da paleta do estilo em uso, misturadas com a
do poder: no Gótico, roxo e prata; no Natal, vermelho e verde; no Pixel, a aura também fica pixelada.

| Nível | O que aparece |
| --- | --- |
| 1 | o momento e a mecânica |
| 2 | o motivo do poder em volta (chamas da Fênix, moedas do Dracofisco, "§" do Código…) |
| 3 | o momento ampliado e o rastro |
| 4 e 5 | camadas maiores, até a explosão e a auréola com o ícone do poder |

### 13.5 Vídeos do jogo

- **Banner do vídeo:** cartão de até 320 px com a capa 16:9.
- **Ao assistir:** o vídeo abre numa janela grande sobre o jogo escurecido (marinho a 78%) ou em tela cheia, com a
  barra de baixo marinha.
- **Ao fechar:** aparece a pílula com as moedas ganhas e uma chuva de moedas (`--festa-brilho` → `--festa-ouro` → `--festa-fundo`).

---

## 14. Ilustrações e fotos

As ilustrações ficam em `public/img/`, em WebP de 800, 1.400 e 2.000 px (`srcset`), geradas por
`scripts/optimize-images.mjs`. Sem o arquivo, a página usa um desenho em CSS ou SVG no lugar (`optionalImage`).

| Arquivo | O que mostra | Estilo | Onde |
| --- | --- | --- | --- |
| `hero-partenon-1` | o Partenon em silhueta azul-marinho, de lado, contra um céu de pôr do sol (do azul profundo ao laranja) | vetorial, sem contorno, com textura leve | abertura do início |
| `maleta-colunas-1` | uma maleta de couro com asas brancas voando entre colunas jônicas, com um templo ao fundo e céu azul | desenho animado, cores chapadas, contorno escuro | banner do jogo, capa do Flap Suitcase |
| `treino-2fase` | mesa de madeira com livros, códigos, papéis escritos, caneta-tinteiro azul, martelo e um capitel de coluna | desenho animado quente, contorno escuro | capa do "Treinar questões" |
| `em-breve` | balança dourada sobre um pedestal com meandro, sob um foco de luz azul, com colunas ao fundo | desenho animado, fundo marinho | cartão "Em breve" |
| `moldura-meandro-1` | moldura de meandro dourado em volta de um fundo marinho com uma luz dourada no centro | ornamental | fundo do card de compartilhar (resultado e jogo) |

Na tela, as ilustrações levam cantos `--radius` e sombra, quando não estão sangradas (a abertura ocupa a largura toda).

---

## 15. Imagens geradas: card e prévias de compartilhar

### 15.1 Card do resultado e do jogo (`src/lib/share/card.ts`)

Desenhado num canvas com os dados salvos (não copia a página).

Fundo:
- com a moldura (`moldura-meandro-1`): a imagem em nove partes, com os cantos na mesma escala (9,5% da largura);
- sem a moldura: marinho, com uma luz dourada radial no centro (`rgba(214,156,69,0.28)` até transparente) e o
  meandro desenhado.

Cores:

| Cor | Uso |
| --- | --- |
| marinho `#03112c` | fundo |
| ouro `#d69c45` | grifo e nota de aprovado |
| ouro claro `#f0c97f` | linhas de apoio e domínio |
| `#eef2f7` | texto principal |
| `#b9c6d6` | texto secundário |
| `#9fb0c3` | texto terciário |
| `rgba(238,242,247,0.55)` | código |

Formatos:

| | Retrato ("Stories / feed") | Paisagem ("Link / LinkedIn") |
| --- | --- | --- |
| Tamanho | 1080 × 1350 | 1200 × 630 |
| Meandro (margem / módulo) | 34 / 46 px | 26 / 36 px |
| Grifo | 180 px, centrado no alto | 170 px, à esquerda |
| "GRIFO" | Cormorant 64 px | Cormorant 48 px, sob o grifo |
| Linha de apoio | "2ª FASE OAB · DIREITO PENAL", Inter 700 22 px | "2ª FASE OAB · PENAL", Inter 700 16 px |
| Título (exame) | Cormorant 46 px | Cormorant 42 px, à esquerda |
| Subtítulo (peça) | Inter 500 28 px | Inter 500 24 px |
| Nota | Inter 800 190 px, com "de 10,00" embaixo (30 px) | Inter 800 150 px, com "/ 10,00" ao lado (34 px) |
| Destaque ("Aprovado(a)!") | pílula de 64 px de altura: ouro com texto marinho (aprovado) ou branco a 12% | texto de 30 px, ouro ou claro |
| Linhas de números | colunas, valor 38 px e rótulo 22 px | uma linha com "·" entre os itens, 22 px |
| Rodapé, domínio e código | 22 px; 26 px ouro claro; monoespaçada 17 px | numa linha de 18 px; código 15 px |

### 15.2 Prévias por nota e por pontos (`scripts/gerar-previas.ts`)

As prévias são imagens de 1200 × 630, em JPEG (mozjpeg, qualidade 80), menores que 300 KB. São 101 notas (de 0,0 a
10,0) e 1.002 pontuações do Flap Suitcase (de 0 a 1.000, mais "1.000+").

- **Fundo:**
  - degradê radial de `#0d2e60` (centro) a `#03112c`;
  - o meandro (margem de 26 px, módulo de 30 px);
  - dois grifos dourados de 250 px, frente a frente, como os suportes de um brasão (o da esquerda espelhado).
- **No alto, centrados:**
  - "GRIFO" em Cormorant 64 px, com 4 px entre as letras;
  - "2ª FASE OAB · DIREITO PENAL" em Inter 800 17 px, ouro claro, com 2,5 px entre as letras;
  - o rótulo ("NOTA NO SIMULADO", "PONTOS NO FLAP SUITCASE") em Inter 800 21 px, com 3 px entre as letras.
- **No centro:** o número em Inter 800 de até 200 px, com no máximo 480 px de largura para não encostar nas asas.
  - Entre as letras, −2 px.
  - Sombra `rgba(0,0,0,0.45)`, desfoque de 24 px, 6 px para baixo.
- **Embaixo:** "de 10,0" (Inter 500 30 px, `#b9c6d6`), a pílula do destaque e o domínio (Inter 800 24 px, ouro).
  - A pílula tem 38 px de altura e cantos de 19 px.
  - Fundo branco a 8% e contorno de 1,5 px na cor do texto.
- **Cores por nota:**

  | Nota | Número | Pílula |
  | --- | --- | --- |
  | 6,0 ou mais | ouro | "Aprovado(a)!" em ouro |
  | de 5,0 a 5,9 | claro | "Quase lá!" em claro |
  | abaixo de 5,0 | claro | "Em evolução" em `#b9c6d6` |

### 15.3 Imagem geral do site (`public/compartilhar-1200x630.jpg`)

É a prévia das páginas sem prévia própria:
- marinho com a moldura de meandro e o grifo dourado à esquerda;
- à direita, "GRIFO" em Cormorant, "2ª FASE OAB · DIREITO PENAL" em ouro claro e a descrição em `#dbe4ee`;
- embaixo, "grifo.net.br" em ouro.

---

## 16. Impressão e PDFs

### 16.1 Cadernos e padrões de resposta (`src/app/print/print.css`)

Imitam os cadernos da FGV em A4:
- **Folha:** 210 × 297 mm, com margens internas de 14 mm (18 mm embaixo). Na tela, as folhas brancas ficam sobre um
  fundo cinza `#8a8a8a`.
- **Fonte:** Carlito (medidas da Calibri), 10,5 pt, entrelinha 1,32, cor `#111`. Cabeçalhos e rodapés em Arial,
  7,5 pt, maiúsculas.
- **Cabeçalho e rodapé:** o logotipo "Grifo em Progresso" (9 mm de altura) e o exame. O rodapé tem um fio preto de
  0,6 pt e a marca em marinho `#03112c`.
- **Selo dourado:** no canto, Arial 6,5 pt, texto `#8a5a14`, borda `#d69c45`.
- **Capa:**
  - uma faixa cinza `#d9d9d9` de 46 mm com o logotipo;
  - a área em Arial 34 pt, peso 800, alinhada à direita;
  - blocos de instruções com um cabeçalho em degradê cinza, ícone num círculo e lista justificada com fio cinza à
    esquerda.
- **Textos:**
  - a caixa "Atenção" com borda preta de 1,2 pt;
  - títulos de seção em versalete com fio de 2,2 pt embaixo;
  - texto justificado.
- **Folhas pautadas:** linhas de 7,6 mm com bordas de 0,5 pt `#8c8c8c`. A numeração fica numa coluna de 8 mm, com
  fundo cinza de 5 em 5 linhas.
- **Padrão de resposta:**
  - faixas coloridas em laranja-tijolo `#993300` e azul `#336699`;
  - tabela de pontos com cabeçalho `#993300`, bordas da mesma cor, linhas de seção cinza e valores em vermelho
    `#e00000`.
- **Nota de atualização:** borda dourada de 2,5 pt `#d69c45` e fundo creme `#fbf5e8`. Marca onde a lei mudou depois do
  exame.

### 16.2 Folha de resposta em PDF (`src/lib/folha/`)

Gerada com pdf-lib:
- linhas e numeração em preto e cinza;
- faixas da numeração em cinza claro;
- o grifo da marca em marinho;
- os textos discretos em cinza a 60%.

---

## 17. Modos de visualização

O menu "Aa" do cabeçalho grava as escolhas no navegador e aplica cada uma como um atributo no `<html>`:

| Opção | Valores | Atributo | Efeito |
| --- | --- | --- | --- |
| Versão | Padrão, Celular | `data-layout="celular"` | layouts próprios para tela estreita (menu hambúrguer, tabelas em cartões, botões maiores, folha "Ajustar à tela") |
| Tema | Automático, Claro, Escuro, Sépia (papel), Alto contraste | `data-theme` | os tokens da seção 3.2 |
| Tamanho do texto | A−, A, A+, A++ | `data-fonte="p"`, `"g"`, `"gg"` | 90%, 100%, 112,5% e 125% |
| Layout compacto | ligado ou desligado | `data-densidade="compacta"` | `--space` 0,7 rem e `--radius` 10 px |
| Fonte de leitura facilitada | ligada ou desligada | `data-leitura="facil"` | Atkinson Hyperlegible, mais espaço entre letras, palavras e linhas |

O painel tem até 320 px. Cada tema vem com uma amostra redonda de 16 px:
- Automático: diagonal creme e marinho;
- Claro: creme;
- Escuro: marinho;
- Sépia: papel;
- Alto contraste: diagonal preto e amarelo.

Outros modos:
- **Modo foco** (simulado e treino, `body[data-foco]`): esconde o cabeçalho e o rodapé.
- **Fundo do leitor** (`data-leitor-fundo`): pinta a página inteira na cor da leitura.
- **Barra de rolagem do navegador no leitor** (`data-barra-navegador`): oculta por padrão, porque o slide faz esse
  papel.

---

## 18. Responsividade

- **Fluida antes de quebrar:** os títulos usam `clamp`, as grades usam `auto-fit` / `auto-fill` com `minmax(min(100%,
  …))` e a largura do conteúdo é `min(100% - 2rem, 1180px)`.
- **Pontos de quebra mais usados:** 420, 520, 560, 640, 720, 760, 800, 900, 960 e 980 px, além de 1.279 px (os rótulos
  laterais da correção) e 900 px para cima (painel lateral do leitor). A lista completa está no apêndice.
- **"Versão Celular":** muitos ajustes só valem com `data-layout="celular"`, e não apenas pela largura. Assim, quem
  prefere o layout de sempre no celular continua com ele.
- **Toque:**
  - áreas de toque de no mínimo 44 px (menu, botões das tabelas, pino do slide);
  - `@media (pointer: coarse)` aumenta os botões de ícone e esconde as dicas de teclado;
  - `@media (hover: hover)` guarda os efeitos de passar o mouse.
- **Margens do sistema:** `env(safe-area-inset-*)` afasta da barra de notificações e da barra de gestos os elementos
  presos (toast, dock, painéis de baixo, vídeo em tela cheia).
- **Altura dinâmica:** `100dvh` no palco do jogo, no modo foco e nas caixas por cima.
- **Orientação:** o jogo tem medidas próprias em pé (`portrait`) e deitado com pouca altura (`landscape` e
  `max-height: 500px`).
- **Em pé no celular:** o jogo e a questão ficam em uma coluna, com uma rolagem só.

---

## 19. Acessibilidade

- **Foco pelo teclado:** todo elemento focável mostra o anel `--focus` (azul-céu, 3 px) ou um contorno de 2 px
  `--primary`. Os botões levam os dois.
- **"Pular para o conteúdo":** o primeiro item da página.
- **Texto para leitores de tela:** `.sr-only` e equivalentes (`.soLeitura`, `.oculto`) guardam rótulos que não aparecem
  na tela.
- **Movimento reduzido:** respeitado em todo o site (seção 6).
- **Temas:** alto contraste (amarelo `#ffd84d` sobre preto, links sublinhados, sem sombras), sépia e fonte de leitura
  facilitada.
- **Cor nunca sozinha:** acerto e erro levam ✓, ✗ e selos escritos; os grifos prontos de Pedidos são sublinhados, e não
  só uma cor.
- **Estados nos atributos:** `aria-pressed`, `aria-checked`, `aria-selected` e `aria-current` são os mesmos atributos que
  o CSS usa para pintar o estado escolhido. O visual e o leitor de tela não divergem.
- **Toque e celular:** cada opção diz o que faz ao ser tocada (o `title` não aparece no toque). Nas grades de escolha, o
  balão fica acima do dedo.

---

## 20. Texto na interface

- **Idioma:** português do Brasil.
- **Botões:** começam com verbo e só a primeira letra é maiúscula ("Fazer um simulado grátis", "Baixar provas
  anteriores", "Restaurar padrão").
- **Chamadas em cartões:** terminam com "→" ("Ver provas →", "Jogar agora →").
- **Sobrancelhas:** curtas, em maiúsculas, com " · " entre os termos ("2ª Fase OAB · Direito Penal").
- **Títulos:** frases, não rótulos ("Tudo o que a 2ª fase cobra, num só lugar", "Do enunciado à nota em quatro passos").
- **Separadores:** " · " junta itens curtos, como "© 2026 Grifo · grifo.net.br" e "Corrigido automaticamente · data".
- **Números:** vírgula decimal e ponto de milhar; moedas e XP abreviados no jogo ("1,4k"); "1 moeda" no singular só
  para 1.

---

## 21. Pontos de atenção

Os oito pontos achados ao levantar este documento. Os sete primeiros foram corrigidos em 2026-11-03; o oitavo fica
como está, por escolha.

1. **Cores de estado nos temas** (corrigido).
   - O escuro e o automático com o sistema escuro ganharam `--ok`, `--warn` e `--bad` próprios. O claro e o sépia
     ganharam um verde e um âmbar mais escuros. Todos passam de 4,5:1 sobre o fundo, os cartões e as faixas (seção 3.11).
   - O texto sobre um fundo de estado cheio usa `--on-estado`. Antes era branco, que no alto contraste ficava sobre o
     vermelho claro.
   - O leitor de leis tem `--leitor-bad` e `--leitor-warn`, porque o papel dele não segue o tema do site.
2. **Ajustes do escuro no "Automático"** (corrigido). Os círculos dos passos do início (`.stepN`) e o número do exame em
   `/simulados/` (`.num`) têm a regra também em `@media (prefers-color-scheme: dark)`, como a folha de resposta.
3. **Ícones das peças no alto contraste** (corrigido). Usam as cores do escuro, com a tinta branca. Um contorno branco
   foi testado e descartado: apagava os números desenhados dentro dos ícones (o 621 do relógio, o 581 da placa).
4. **Dourados parecidos** (corrigido).
   - O ouro claro do card, das prévias e do poder Asas de Ouro passou de `#f0c77e` para `#f0c97f`, o dos ícones.
   - O ouro festivo virou a escala `--festa-*` (seção 3.9). Os tons quase iguais entraram nela: `#ffd700`, `#ffd977`,
     `#ffd966`, `#fff3c4`, `#ffe7a8`, `#fff4b0`, `#e6b13b`, `#b8860b` e `#b8862a`.
5. **Cores fixas** (corrigido).
   - Seguem os temas, inclusive o alto contraste: o corte, o realce e a marca da correção (`--corte*`, `--realce*`,
     `--marca*`, seção 3.4) e os grupos de leis e as Súmulas (`--lei-*`, seção 3.6).
   - O vermelho do contrapeso no menu dos poderes virou `--bad`.
   - O sinal "−" do corte, em `#ca8a04`, tinha 2,9:1 sobre o branco; agora usa `--realce-texto` (5,4:1).
   - Os textos brancos sobre `--primary` (o ✓ do quadro escolhido no menu do jogo, o "↩ Resposta anterior" do quiz e o
     segmento escolhido da correção) passaram a `--primary-ink`. No escuro, ficavam em 2,9:1; no alto contraste, branco
     sobre amarelo.
6. **Regras repetidas** (corrigido). Saíram do `@media (max-width: 640px)` de `todos.module.css`.
7. **`--taupe` e `--slate`** (corrigido). Saíram das variáveis. As cores ficam no comentário da paleta, em `globals.css`.
8. **Logotipo "Grifo em Progresso".** No "GRIFO.NET.BR", o ponto antes de "BR" encosta na haste do "B". É assim mesmo,
   por escolha do desenho.

---

## 22. Apêndice: inventário do CSS

Levantamento dos 39 arquivos `.css` de `src/` (o `globals.css`, o `print.css` e os `.module.css`), em 2026-11-03,
recontado inteiro em 2026-11-05, depois da quarta rodada da página de estatísticas (os comentários não contam).

### 22.1 Números gerais

| Item | Quantidade |
| --- | --- |
| Regras `@media` | 83 |
| `@keyframes` | 69 |
| Usos de `animation` | 88 |
| Declarações `transition` | 84 |
| Declarações `z-index` | 81 |
| Cores literais fora de `globals.css` (hex, `rgb()` e `hsl()`) | 405 |
| Usos de `color-mix()` | 213 |
| `font-family` e `font-size` fora de `globals.css` | 79 e 542 |
| Declarações `border-radius` | 383 |
| Sombras (`box-shadow`, `text-shadow`, `drop-shadow`) | 139, 4 e 9 |

### 22.2 Pontos de quebra

| Condição | Vezes | O que muda, em geral |
| --- | --- | --- |
| `max-width: 420px` | 4 | último link do cabeçalho some; barras do resultado em duas linhas; menu do jogo mais justo; abas e ficha das estatísticas |
| `max-width: 480px` | 1 | painel do poder em coluna |
| `max-width: 520px` | 2 | opções do jogo com o rótulo em cima; rodadas do treino em duas linhas |
| `max-width: 560px` | 4 | nome "Grifo" some do cabeçalho; campos da folha com a largura toda; nomes curtos das abas, calendário menor e só a inicial dos dias da semana nas estatísticas |
| `max-width: 640px` | 9 | "Versão Celular" (menu hambúrguer, barra do simulado), leitor no celular, curso em uma coluna, tabela do resultado, topo do visualizador de provas |
| `max-width: 720px` | 2 | card de compartilhar em uma coluna; rótulo do interruptor da prévia some |
| `max-width: 760px` | 10 | treino e quiz no celular (modo foco, copiar, uma rolagem só); estatísticas em uma coluna |
| `max-width: 800px` | 3 | abertura do início, banner do jogo e topo do resultado em uma coluna |
| `max-width: 900px` | 2 | correção em coluna |
| `max-width: 960px` | 1 | simulado em uma coluna |
| `max-width: 980px` | 1 | tabela de provas vira cartões |
| `max-width: 1279px` | 1 | rótulos laterais da correção somem |
| `min-width: 900px` | 1 | painéis do leitor abrem ao lado |
| `min-width: 1000px` | 1 | calendário das estatísticas com quadrados maiores e o detalhe do dia ao lado do mês |
| `max-height: 620px` (com `pointer: coarse`) | 1 | pergunta do jogo com o celular deitado |
| `max-height: 500px` (com `landscape`) | 1 | jogo deitado |
| `orientation: portrait` | 1 | jogo em pé |
| `prefers-color-scheme: dark` | 6 | tema automático escuro (tokens, ícones, folha de resposta, passos do início, número do exame nos simulados e nas estatísticas) |
| `prefers-reduced-motion: reduce` | vários | desliga animações |
| `pointer: coarse` / `hover: hover` / `hover: none` | vários | toque e mouse |
| `print` | 5 | impressão |

Há também um `@container (min-width: 54rem)` no quiz: o caso fica ao lado da resposta no modo foco.

### 22.3 Camadas (`z-index`)

| Valor | O que fica nessa camada |
| --- | --- |
| −2 a −1 | imagem e véu da abertura do início; forma do parágrafo grifado; raios da estrela do XP |
| 1 a 6 | cabeçalho da tabela de provas, barra dos documentos (3), barra do Jogar (3), barra de controles da correção (5), pergunta do jogo (5), balão do dedo (5), abas das estatísticas (5), dica do gráfico de notas (2), dias da semana presos no calendário (2), dia escolhido e número do capítulo da linha do tempo (1), dicas internas, aviso da linha do tempo (6) |
| 20 | botão de tela cheia do jogo; dicas dos níveis e das categorias |
| 29 a 30 | faixa do nome da lei (29), seção atual da lei, barra da folha de resposta, avisos dentro do palco (30) |
| 35 | slide de artigos do leitor |
| 40 | barra do simulado, dock do leitor, painel da letra, painel do menu do foco |
| 44 a 48 | barra de cores e balões do grifo (44), toast e faixa de digitação (45), véu e "citado por" (46), painel do leitor (47), "Ir para" (48) |
| 50 | **cabeçalho do site**; menu flutuante do modo foco |
| 54 a 55 | destinos e slide sendo arrastado; revoada do strike |
| 60 | menus do cabeçalho ("Aa", hambúrguer, resumo do desempenho), modal do leitor, comemoração e aviso do treino |
| 80 | pausa do simulado; vídeo do jogo |
| 90 | jogo em tela cheia |
| 99 a 100 | cartão do artigo e o fundo dele; "Pular para o conteúdo" |
| 120 | balão das dicas das estatísticas |
| 300 | diagnóstico de seleção (só em desenvolvimento) |

### 22.4 Cantos (`border-radius`)

Valores distintos, com o número de declarações:

| Valor | Vezes | Valor | Vezes |
| --- | --- | --- | --- |
| `999px` | 93 | `6px` | 10 |
| `50%` | 43 | `2px` | 6 |
| `12px` | 35 | `0 12px 12px 0` (caixas com borda esquerda) | 5 |
| `var(--radius)` | 27 | `18px`, `5px` | 4 cada |
| `10px` | 23 | `0.5em 0.2em 0.55em 0.25em` (grifo) | 3 |
| `var(--radius-sm)` | 21 | `calc(var(--radius) + 6px)` (pausa, ficha da peça), `0 8px 8px 0`, `16px`, `9px`, `1px`, `inherit` | 2 cada |
| `3px` | 20 | `20px`, `22px`, `0.5rem`, `0.2em`, `0.25em`, `0.3em`, `1mm` | 1 cada |
| `14px` | 18 | `18px 18px 0 0`, `20px 20px 0 0` (painéis de baixo), `12px 12px 4px 4px` (degrau do pódio) | 1 cada |
| `8px` | 17 | `0 6mm 6mm 0`, `5px 3px 6px 3px` | 1 cada |
| `4px` | 12 | três formas irregulares (manchas e gota do líquido do strike) | 1 cada |
| `0` | 10 | | |

### 22.5 Durações das transições

Cada duração conta uma vez por propriedade animada (`transition: transform 0.15s, color 0.15s` conta duas).

| Duração | Vezes |
| --- | --- |
| 0,15 s | 44 |
| 0,2 s | 32 |
| 0,12 s | 16 |
| 0,25 s | 6 |
| 0,6 s | 4 |
| 0,18 s, 0,22 s, 0,45 s | 3 cada |
| 0 s, 0,08 s, 0,3 s | 2 cada |
| 0,35 s, 0,65 s, 1,2 s | 1 cada |
| 2,2 s | 1 (o líquido do strike escorrendo) |

### 22.6 `@keyframes`

| Arquivo | Animações |
| --- | --- |
| `simulados/[exame]/simulador.module.css` | `fade` |
| `simulados/[exame]/resultado/correcao.module.css` | `marcaRecursoSome` |
| `simulados/[exame]/resultado/ia.module.css` | `spin` |
| `estatisticas/estatisticas.module.css` | `alvo`, `subir`, `surgirDica` |
| `treino/treino.module.css` | `abrir`, `avanco` (e a versão reduzida), `abrirJanela` |
| `treino/strike.module.css` | `entrar`, `tremer`, `piscar`, `sumir`, `clarao`, `raios`, `raiosEntrar`, `onda`, `voar`, `faisca`, `saltar`, `brilhoOuro`, `subir`, `cair`, `cintilar` |
| `treino/menuFoco.module.css` | `girar`, `reflexo`, `tremer`, `piscar`, `reluzir`, `halo`, `gota`, `tempo`, `abrir`, `revoada`, `encher`, `reflexoEstrela`, `haloEstrela`, `ganhou`, `pulsar`, `acender` |
| `provas/provas.module.css` | `entraProximo`, `entraAnterior` |
| `components/AnswerSheet.module.css` | `shake` |
| `components/ResumoDesempenho.module.css` | `surgir` |
| `components/leis/leitor.module.css` | `destaque`, `grifar`, `brilhoNome`, `subir`, `lado` |
| `components/leis/barraLeitura.module.css` | `brilho` |
| `components/leis/irPara.module.css` | `descer` |
| `components/leis/popup.module.css` | `destaqueSome`, `entraDaDireita`, `entraDaEsquerda`, `surgir`, `surgirAoLado`, `subir` |
| `quiz/quiz.module.css` | `copiarPulso`, `copiarTremer`, `revisaoAbre` |
| `games/games.module.css` | `pulsarPoder`, `pulse`, `surgirMenu`, `avisoAuto`, `avisoAutoFade` |
| `games/video.module.css` | `ganhou`, `moedaSobe`, `ganhouFade` |

Os nomes se repetem entre arquivos (`subir`, `abrir`, `tremer`, `piscar`, `ganhou`) sem conflito, porque os CSS
Modules dão a cada arquivo um escopo próprio.
