# Flap Suitcase no modo 8-bit: plano de arte e prompts

Este arquivo reúne o plano para embelezar o modo "Pixel 8-bit" do jogo, o estilo travado e os 51 prompts para gerar os assets, com o nome de cada arquivo. Os prompts estão em inglês, prontos para colar em qualquer gerador de imagem de IA. O processo de produção (remover fundo, reduzir, travar a paleta e exportar) está na skill `jogo-8bit-ia`, e a escrita de prompts, na skill `prompts-imagem-8bit`.


## Estado (16/10/2026)

- **Arte recebida:** 43 arquivos em `.examples/8bits Images/` (fora do git). O script `scripts/processar-8bit.mjs` gera `public/jogos/flap-suitcase/8bit/` (~300 KB, dentro do limite de 3 MB).
- **Feito:** cenário A1 a A5; colunas B1 e B2; personagens C1 a C8; moeda D1 (os quadros de giro saem da moeda de HUD); poderes E1 a E18; HUD F1 a F7; efeitos G1 a G3.
- **Faltam:** capas H1 e H2 (não foram geradas); colunas jônica e coríntia (B3 a B6, opcionais); botão F8 (opcional).
- **Decisões tomadas sem resposta às D1 a D6:** D1, os sprites usam a escala do buffer (uma célula da arte = um pixel do buffer) e o raio de colisão foi mantido, porque a área ocupada já é parecida com a do desenho antigo; D2, buffer de 200 linhas; D3, os 8 personagens de uma vez. D4, D5 e D6 continuam pendentes.
- **Paleta:** 32 cores comuns, em `public/jogos/flap-suitcase/8bit/paleta.json`. Personagens usam de 11 a 17 cores (o promotor fica com 17, acima do alvo de 16); ícones, de 3 a 12; cenas, de 10 a 18; efeitos, de 2 a 7.
- **Grade:** a IA gerou blocos de 11 a 64 px (grades de 16 a 40 células) para assets do mesmo tipo. A normalização está descrita na skill `jogo-8bit-ia`.

---

## 1. Plano

### 1.1 Objetivo

Deixar o modo "Pixel 8-bit" visualmente bonito e coerente, sem mudar a jogabilidade.

### 1.2 Diagnóstico: o que o modo 8-bit tem hoje

- **Cenário:** uma única imagem de fundo (`fundo-8bits.webp`) e um chão laranja liso, desenhado por código.
- **Colunas:** o sprite normal e o rachado já existem, mas o capitel é sempre dórico.
- **Personagens (8):** desenhados por código, como maleta com acessório. Não têm animação de quadros.
- **Moedas e poderes:** moedas procedurais; os 18 poderes usam ícones SVG.
- **Interface:** coração feito com emoji e ícones SVG; molduras em CSS.
- **Escala:** a maleta tem cerca de 24 px lógicos de largura. No buffer de pixels (cerca de 200 linhas), ela ocupa uns 8 pixels. Pequena demais para um sprite 8-bit expressivo.

### 1.3 Decisões (com a recomendação)

| Código | Decisão | Recomendação | Impacto |
|---|---|---|---|
| D1 | Tamanho do personagem | Ampliar para cerca de 48 px lógicos e ajustar o raio de colisão (hoje 15) | Jogabilidade |
| D2 | Resolução do buffer de pixels | Manter cerca de 200 linhas (já validado) | Aparência |
| D3 | Personagens | Fazer os 8 de uma vez | Prazo |
| D4 | Opcionais | Incluir as colunas jônica e coríntia (B3–B6) se houver tempo | Variedade |
| D5 | Fonte pixel no HUD | Usar uma fonte pixel com licença aberta (verificar a licença antes) | Interface |
| D6 | Música chiptune | Fora deste plano: o som já usa onda quadrada | Áudio |

### 1.4 Fases

1. **F0, decisões e referências.** Fechar D1 a D6 e reunir as referências aprovadas (`8-bits fundo completo`, colunas da folha de referência).
2. **F1, estilo travado.** Usar a paleta e as regras da seção 2 e testar três assets (um cenário, uma coluna e um personagem) antes de gerar o lote.
3. **F2, geração em lotes.** Lote 1: cenário (A). Lote 2: colunas (B). Lote 3: personagens (C). Lote 4: moedas e efeitos (D e G). Lote 5: poderes e interface (E e F). Lote 6: capas (H).
4. **F3, pós-processamento.** Seguir a skill `jogo-8bit-ia`: remover fundo, alfa rígido, grade, paleta e contorno, e exportar no tamanho nativo.
5. **F4, revisão.** Ver em 1× na tela, testar a silhueta em cinza, verificar a costura das camadas e contar as cores.
6. **F5, integração no motor.** Ver 1.5.
7. **F6, testes.** Rodar os e2e de jogo, poderes, fim de jogo e provas; comparar capturas antes e depois; medir o peso da pasta.
8. **F7, publicação.** Gerar o build e copiar a pasta `out/`, conforme a decisão de publicação do projeto.

### 1.5 Integração no motor (F5)

- `decor` do tema pixel: trocar a imagem única por quatro camadas de parallax (A1 a A4), com velocidades crescentes da mais distante para a mais próxima.
- `chao` do tema pixel: repetir o tile A5 na faixa do chão.
- Colunas: trocar o sprite atual pelos B1 e B2, e usar B3 a B6 se os capitéis variados entrarem.
- Personagens: no caminho pixel de `desenharPersonagem`, trocar o desenho procedural pelo sheet C correspondente, com o quadro escolhido pelo tempo (cerca de 10 fps).
- Moedas: desenhar o sheet D1 com quadros por tempo.
- Poderes: no modo 8-bit, usar E1 a E18 no lugar dos SVG.
- Interface: F1 no lugar do emoji de coração, F2 a F6 nos botões e contadores, F7 como moldura de painel (`border-image`).
- Efeitos: G1 ao pegar moeda, G2 ao bater em coluna rachada, G3 ao fim da partida.
- Manter o desenho procedural como alternativa quando o arquivo não existir (`optionalImage`).

### 1.6 Critérios de aceite

- Cada cena tem até 32 cores; sprites têm até 16.
- Nenhum pixel com alfa parcial.
- Silhuetas legíveis em 1× e no buffer de pixels.
- Quadros de animação alinhados pela base e pelo centro.
- Camadas do cenário sem costura visível na largura real de rolagem.
- Sem texto, logo ou marca d'água em nenhum asset.
- Pasta `8bit` com menos de 3 MB.
- Os e2e do jogo continuam passando.

### 1.7 Riscos

- **Grade torta na saída da IA:** usar a votação por bloco e conferir em 1×.
- **Halo nos recortes:** alfa rígido, sem alfa parcial.
- **Personagens diferentes entre quadros:** gerar cada personagem como um sheet único, com referência aprovada.
- **Licença das ferramentas:** conferir os termos antes de vender qualquer asset.
- **Personagem pequeno demais:** resolver pela decisão D1.

---

## 2. Estilo travado

### 2.1 Bloco de estilo

Use este bloco em todo prompt. Os prompts da seção 5 já trazem uma versão curta dele.

```text
8-bit pixel art, retro console game sprite style, limited palette of 24 colors (deep navy, cream, sky blue, grass green, warm brown, gold), hard pixel edges, no anti-aliasing, no smooth gradients, flat shading with two or three tones, clean one-pixel dark outline, light from the top-left, no text, no logo, no watermark.
```

### 2.2 Paleta

Extraída da referência `8-bits fundo completo` e da coluna pixel. Use estas cores na pós-produção: a saída da IA é mapeada para o conjunto mais próximo.

| Grupo | Cores (hex) |
|---|---|
| Azul-marinho e sombras frias | #343C5C #54647C #2C5434 #247464 |
| Verdes | #44AC44 #4C7C34 #6CC47C #8CCC4C #B4EC74 #2C5434 |
| Céu e água | #549CC4 #2CA4DC #84C4E4 #ACDCF4 #D4F4FC #8CACBC |
| Cinzas e creme | #9C8C8C #ECDCBC #DCBC9C |
| Marrons | #CC9C7C #9C7464 #74544C #3C241C #6C948C |
| Ouro | #FCD464 |

**Acentos** (só em ícones e interface, fora da paleta da cena): vermelho #D83C2C, branco #FCFCFC, azul-noite #0B1224, roxo #7C3C8C.

### 2.3 Negativos

```text
Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, JPEG artifacts, text, letters, watermark, signature, border frame, cropped subject, shadow on background, more than 24 colors.
```

### 2.4 Fundo para recorte

- Sprites, personagens, ícones, moedas, efeitos e molduras: fundo sólido #FF00FF, sem sombra e sem chão.
- Camadas do cenário: magenta onde for transparente.
- Céu do cenário e capas: fundo opaco, sem magenta.

---

## 3. Pastas e nomes

- **Saída bruta da IA:** `assets/imagens/jogos/8bit/bruto/<nome>-v<n>.png`.
- **Arquivos finais do jogo:** `public/jogos/flap-suitcase/8bit/<categoria>/<nome>.png`.
- **Categorias:** `cenario/`, `colunas/`, `personagens/`, `itens/`, `poderes/`, `hud/`, `fx/`, `capas/`.
- **Regras:** minúsculas, sem acento, com hífen. Quadros de animação ficam num único sheet.

---

## 4. Catálogo

| ID | Arquivo final | Tamanho nativo | Fundo | Prioridade | Uso no motor |
|---|---|---|---|---|---|
| A1 | `cenario/camada-0-ceu-sol-nuvens.png` | 512×216 | opaco | obrigatório | céu, sol e nuvens (camada mais distante) |
| A2 | `cenario/camada-1-montanhas.png` | 512×216 | transparente | obrigatório | montanhas (parallax lento) |
| A3 | `cenario/camada-2-colinas-florestas.png` | 512×216 | transparente | obrigatório | colinas e florestas (parallax médio) |
| A4 | `cenario/camada-3-campos-rio.png` | 512×216 | transparente | obrigatório | campos e rio (parallax mais rápido) |
| A5 | `cenario/chao.png` | 32×16 (tile) | opaco | obrigatório | faixa do chão |
| B1 | `colunas/dorica-normal.png` | 24×96 | transparente | obrigatório | coluna normal, capitel dórico |
| B2 | `colunas/dorica-rachada.png` | 24×96 | transparente | obrigatório | coluna rachada |
| B3 | `colunas/jonica-normal.png` | 24×96 | transparente | opcional | variante jônica |
| B4 | `colunas/jonica-rachada.png` | 24×96 | transparente | opcional | variante jônica rachada |
| B5 | `colunas/corintia-normal.png` | 24×96 | transparente | opcional | variante coríntia |
| B6 | `colunas/corintia-rachada.png` | 24×96 | transparente | opcional | variante coríntia rachada |
| C1 | `personagens/maleta.png` | 96×32 (3 quadros de 32×32) | transparente | obrigatório | personagem inicial |
| C2 | `personagens/balanca.png` | 96×32 | transparente | obrigatório | desbloqueio com 60 XP |
| C3 | `personagens/delegado.png` | 96×32 | transparente | obrigatório | desbloqueio com 150 XP |
| C4 | `personagens/defensor.png` | 96×32 | transparente | obrigatório | desbloqueio com 300 XP |
| C5 | `personagens/juiz.png` | 96×32 | transparente | obrigatório | desbloqueio com 500 XP |
| C6 | `personagens/promotor.png` | 96×32 | transparente | obrigatório | desbloqueio com 800 XP |
| C7 | `personagens/codigo.png` | 96×32 | transparente | obrigatório | desbloqueio com 1200 XP |
| C8 | `personagens/grifo.png` | 96×32 | transparente | obrigatório | desbloqueio com 2000 XP |
| D1 | `itens/moeda.png` | 64×16 (4 quadros de 16×16) | transparente | obrigatório | moedas girando |
| E1 | `poderes/escudo.png` | 16×16 | transparente | prioritário | Habeas Corpus |
| E2 | `poderes/ima.png` | 16×16 | transparente | prioritário | Vade Mecum |
| E3 | `poderes/lento.png` | 16×16 | transparente | prioritário | Prazo em Dobro |
| E4 | `poderes/mini.png` | 16×16 | transparente | prioritário | Insignificância |
| E5 | `poderes/fantasma.png` | 16×16 | transparente | prioritário | Absolvição Sumária |
| E6 | `poderes/dobro.png` | 16×16 | transparente | prioritário | Concurso Material |
| E7 | `poderes/leve.png` | 16×16 | transparente | prioritário | Asas de Ouro |
| E8 | `poderes/congelar.png` | 16×16 | transparente | prioritário | Trânsito em Julgado |
| E9 | `poderes/prescricao.png` | 16×16 | transparente | prioritário | Prescrição |
| E10 | `poderes/revisao.png` | 16×16 | transparente | prioritário | Revisão Criminal |
| E11 | `poderes/arquivamento.png` | 16×16 | transparente | prioritário | Arquivamento |
| E12 | `poderes/equilibrio.png` | 16×16 | transparente | prioritário | Equilíbrio |
| E13 | `poderes/inquerito.png` | 16×16 | transparente | prioritário | Inquérito |
| E14 | `poderes/presuncao.png` | 16×16 | transparente | prioritário | Presunção de Inocência |
| E15 | `poderes/dosimetria.png` | 16×16 | transparente | prioritário | Dosimetria |
| E16 | `poderes/denuncia.png` | 16×16 | transparente | prioritário | Denúncia |
| E17 | `poderes/tipificacao.png` | 16×16 | transparente | prioritário | Tipificação |
| E18 | `poderes/voo.png` | 16×16 | transparente | prioritário | Voo do Grifo |
| F1 | `hud/coracao.png` | 16×16 | transparente | obrigatório | vidas (no lugar do emoji) |
| F2 | `hud/moeda.png` | 16×16 | transparente | obrigatório | contador de moedas |
| F3 | `hud/pausa.png` | 16×16 | transparente | obrigatório | botão pausar |
| F4 | `hud/som-ligado.png` | 16×16 | transparente | obrigatório | botão de som |
| F5 | `hud/som-desligado.png` | 16×16 | transparente | obrigatório | botão de som desligado |
| F6 | `hud/tela-cheia.png` | 16×16 | transparente | obrigatório | botão de tela cheia |
| F7 | `hud/moldura.png` | 48×48 (9-slice) | transparente no centro | obrigatório | painéis do menu |
| F8 | `hud/botao.png` | 48×24 (9-slice) | transparente no centro | opcional | botões do menu |
| G1 | `fx/faisca.png` | 32×8 (4 quadros de 8×8) | transparente | obrigatório | brilho ao pegar moeda |
| G2 | `fx/destroco.png` | 32×8 (4 quadros de 8×8) | transparente | obrigatório | pedaços ao bater em coluna rachada |
| G3 | `fx/explosao.png` | 120×24 (5 quadros de 24×24) | transparente | obrigatório | fim da partida |
| H1 | `capas/flap-suitcase-8bit.png` | 2000×1125 | opaco | obrigatório | capa do jogo |
| H2 | `capas/flap-suitcase-8bit-og.png` | 1200×630 | opaco | opcional | pré-visualização social |

Contagem: 27 obrigatórios, 18 prioritários (poderes) e 6 opcionais. Total de 51 arquivos.

---

## 5. Prompts

Cada prompt traz o nome do arquivo, o tamanho nativo, o fundo e o texto para colar. Para sheets, peça a imagem inteira e separe os quadros no pós-processamento.

### A. Cenário

#### A1. `cenario/camada-0-ceu-sol-nuvens.png` (512×216, opaco)

```text
Very wide panoramic strip, about 2.4:1, seamless horizontal loop with matching left and right edges: a clear sky in bands of sky blue, a large pixel sun with a soft golden halo in the upper left, a few fluffy white pixel clouds drifting across, a handful of tiny distant birds. No mountains, no ground, no characters. Side view, flat layers. 8-bit pixel art, limited 24-color palette (deep navy, cream, sky blue, grass green, warm brown, gold), hard pixel edges, no anti-aliasing, flat shading with two or three tones, one-pixel dark outline, no text, no logo. Opaque sky, no magenta. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, shadow on background, more than 24 colors.
```

#### A2. `cenario/camada-1-montanhas.png` (512×216, transparente)

```text
Very wide panoramic strip, about 2.4:1, seamless horizontal loop with matching left and right edges: a distant range of blue-grey mountains with white snow caps across the whole width, peaks in hard pixel steps. The sky above the peaks and the lower area are solid flat magenta #FF00FF. No trees, no characters, no text. 8-bit pixel art, limited 24-color palette (deep navy, cream, sky blue, grass green, warm brown, gold), hard pixel edges, no anti-aliasing, no smooth gradients, flat shading with two or three tones, one-pixel dark outline, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, shadow on background, more than 24 colors.
```

#### A3. `cenario/camada-2-colinas-florestas.png` (512×216, transparente)

```text
Very wide panoramic strip, about 2.4:1, seamless horizontal loop with matching left and right edges: rolling green hills with rows of dark green pine-tree silhouettes along the ridges, two depth layers. The sky above the hills and the bottom part are solid flat magenta #FF00FF. No snowy mountains, no characters, no text. 8-bit pixel art, limited 24-color palette (deep navy, cream, sky blue, grass green, warm brown, gold), hard pixel edges, no anti-aliasing, no smooth gradients, flat shading with two or three tones, one-pixel dark outline, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, shadow on background, more than 24 colors.
```

#### A4. `cenario/camada-3-campos-rio.png` (512×216, transparente)

```text
Very wide panoramic strip, about 2.4:1, seamless horizontal loop with matching left and right edges: a near green meadow with a winding blue river with brown banks, a few small brown village houses and a stone tower, a couple of round bushes. The area above the meadow is solid flat magenta #FF00FF. No sky, no characters, no text. 8-bit pixel art, limited 24-color palette (deep navy, cream, sky blue, grass green, warm brown, gold), hard pixel edges, no anti-aliasing, no smooth gradients, flat shading with two or three tones, one-pixel dark outline, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, shadow on background, more than 24 colors.
```

#### A5. `cenario/chao.png` (tile 32×16, opaco)

```text
Seamless horizontal ground tile for a side-scrolling 8-bit game, 2:1 proportion: the top row is bright grass green with small light-green tufts, below it warm brown earth with a few dark-brown stones, tiles left to right without any visible seam. No characters, no shadows, no text. 8-bit pixel art, limited 24-color palette (deep navy, cream, sky blue, grass green, warm brown, gold), hard pixel edges, no anti-aliasing, no smooth gradients, flat shading with two or three tones, one-pixel dark outline, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, more than 24 colors.
```

### B. Colunas

#### B1. `colunas/dorica-normal.png` (24×96, transparente)

```text
A single Doric Greek column seen from the front, tall and narrow, cream marble shaft with vertical flutes and warm brown shading on the right side, square-cut Doric capital at the top, stepped base at the bottom, isolated on solid flat magenta background #FF00FF, no shadow, no ground, no floor, no text. 8-bit pixel art, limited 24-color palette (deep navy, cream, sky blue, grass green, warm brown, gold), hard pixel edges, no anti-aliasing, no smooth gradients, flat shading with two or three tones, clean one-pixel dark outline, light from the top-left, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, shadow on background, more than 24 colors.
```

#### B2. `colunas/dorica-rachada.png` (24×96, transparente)

```text
A single Doric Greek column seen from the front, tall and narrow, cream marble shaft with warm brown shading, the same design as a standard Doric column but cracked: several dark diagonal cracks across the shaft, a chipped capital, a few small marble chips at the base, isolated on solid flat magenta background #FF00FF, no shadow, no ground, no text. 8-bit pixel art, limited 24-color palette (deep navy, cream, sky blue, grass green, warm brown, gold), hard pixel edges, no anti-aliasing, no smooth gradients, flat shading with two or three tones, clean one-pixel dark outline, light from the top-left, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, shadow on background, more than 24 colors.
```

#### B3. `colunas/jonica-normal.png` (24×96, transparente, opcional)

```text
A single Ionic Greek column seen from the front, tall and narrow, cream marble shaft with vertical flutes and warm brown shading on the right side, a capital with two spiral volutes at the top, stepped base at the bottom, isolated on solid flat magenta background #FF00FF, no shadow, no ground, no text. 8-bit pixel art, limited 24-color palette (deep navy, cream, sky blue, grass green, warm brown, gold), hard pixel edges, no anti-aliasing, no smooth gradients, flat shading with two or three tones, clean one-pixel dark outline, light from the top-left, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, shadow on background, more than 24 colors.
```

#### B4. `colunas/jonica-rachada.png` (24×96, transparente, opcional)

```text
A single Ionic Greek column seen from the front, tall and narrow, cream marble shaft with warm brown shading, the same design as a standard Ionic column but cracked: several dark diagonal cracks across the shaft, a chipped volute at the capital, a few small marble chips at the base, isolated on solid flat magenta background #FF00FF, no shadow, no ground, no text. 8-bit pixel art, limited 24-color palette (deep navy, cream, sky blue, grass green, warm brown, gold), hard pixel edges, no anti-aliasing, no smooth gradients, flat shading with two or three tones, clean one-pixel dark outline, light from the top-left, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, shadow on background, more than 24 colors.
```

#### B5. `colunas/corintia-normal.png` (24×96, transparente, opcional)

```text
A single Corinthian Greek column seen from the front, tall and narrow, cream marble shaft with vertical flutes and warm brown shading on the right side, a capital decorated with acanthus leaves at the top, stepped base at the bottom, isolated on solid flat magenta background #FF00FF, no shadow, no ground, no text. 8-bit pixel art, limited 24-color palette (deep navy, cream, sky blue, grass green, warm brown, gold), hard pixel edges, no anti-aliasing, no smooth gradients, flat shading with two or three tones, clean one-pixel dark outline, light from the top-left, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, shadow on background, more than 24 colors.
```

#### B6. `colunas/corintia-rachada.png` (24×96, transparente, opcional)

```text
A single Corinthian Greek column seen from the front, tall and narrow, cream marble shaft with warm brown shading, the same design as a standard Corinthian column but cracked: several dark diagonal cracks across the shaft, chipped acanthus leaves at the capital, a few small marble chips at the base, isolated on solid flat magenta background #FF00FF, no shadow, no ground, no text. 8-bit pixel art, limited 24-color palette (deep navy, cream, sky blue, grass green, warm brown, gold), hard pixel edges, no anti-aliasing, no smooth gradients, flat shading with two or three tones, clean one-pixel dark outline, light from the top-left, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, shadow on background, more than 24 colors.
```

### C. Personagens

Todos os sheets têm o mesmo formato: três quadros de 32×32 em linha, com as asas em três posições. O nome do arquivo é o id do personagem em `progressao.ts`.

#### C1. `personagens/maleta.png` (96×32, transparente)

```text
Sprite sheet of three animation frames side by side in one horizontal row, the same character in every frame: a brown leather briefcase with a black handle and small white feather wings. Frame 1 wings raised up, frame 2 wings horizontal, frame 3 wings lowered. Each frame the same size, centered, evenly spaced, base aligned at the bottom, isolated on solid flat magenta background #FF00FF, no shadow, no ground, no text. 8-bit pixel art, limited 24-color palette (deep navy, cream, sky blue, grass green, warm brown, gold), hard pixel edges, no anti-aliasing, flat shading with two or three tones, one-pixel dark outline, light from the top-left, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, cropped subject, different character per frame, more than 24 colors.
```

#### C2. `personagens/balanca.png` (96×32, transparente)

```text
Sprite sheet of three animation frames side by side in one horizontal row, the same character in every frame: golden justice scales (balança da justiça) with two brass pans, and small white feather wings at the ends of the beam. Frame 1 wings raised up, frame 2 wings horizontal, frame 3 wings lowered. Each frame the same size, centered, evenly spaced, base aligned at the bottom, isolated on solid flat magenta background #FF00FF, no shadow, no ground, no text. 8-bit pixel art, limited 24-color palette (deep navy, cream, sky blue, grass green, warm brown, gold), hard pixel edges, no anti-aliasing, flat shading with two or three tones, one-pixel dark outline, light from the top-left, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, cropped subject, different character per frame, more than 24 colors.
```

#### C3. `personagens/delegado.png` (96×32, transparente)

```text
Sprite sheet of three animation frames side by side in one horizontal row, the same character in every frame: a brown leather briefcase wearing a navy police cap with a small gold star, and small white feather wings. Frame 1 wings raised up, frame 2 wings horizontal, frame 3 wings lowered. Each frame the same size, centered, evenly spaced, base aligned at the bottom, isolated on solid flat magenta background #FF00FF, no shadow, no ground, no text. 8-bit pixel art, limited 24-color palette (deep navy, cream, sky blue, grass green, warm brown, gold), hard pixel edges, no anti-aliasing, flat shading with two or three tones, one-pixel dark outline, light from the top-left, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, cropped subject, different character per frame, more than 24 colors.
```

#### C4. `personagens/defensor.png` (96×32, transparente)

```text
Sprite sheet of three animation frames side by side in one horizontal row, the same character in every frame: a brown leather briefcase wearing a black lawyer's robe with white collar tabs, and small white feather wings. Frame 1 wings raised up, frame 2 wings horizontal, frame 3 wings lowered. Each frame the same size, centered, evenly spaced, base aligned at the bottom, isolated on solid flat magenta background #FF00FF, no shadow, no ground, no text. 8-bit pixel art, limited 24-color palette (deep navy, cream, sky blue, grass green, warm brown, gold), hard pixel edges, no anti-aliasing, flat shading with two or three tones, one-pixel dark outline, light from the top-left, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, cropped subject, different character per frame, more than 24 colors.
```

#### C5. `personagens/juiz.png` (96×32, transparente)

```text
Sprite sheet of three animation frames side by side in one horizontal row, the same character in every frame: a brown leather briefcase with a white judge's wig and a small wooden gavel, and small white feather wings. Frame 1 wings raised up, frame 2 wings horizontal, frame 3 wings lowered. Each frame the same size, centered, evenly spaced, base aligned at the bottom, isolated on solid flat magenta background #FF00FF, no shadow, no ground, no text. 8-bit pixel art, limited 24-color palette (deep navy, cream, sky blue, grass green, warm brown, gold), hard pixel edges, no anti-aliasing, flat shading with two or three tones, one-pixel dark outline, light from the top-left, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, cropped subject, different character per frame, more than 24 colors.
```

#### C6. `personagens/promotor.png` (96×32, transparente)

```text
Sprite sheet of three animation frames side by side in one horizontal row, the same character in every frame: a brown leather briefcase wearing a black prosecutor's robe and carrying a folded document, and small white feather wings. Frame 1 wings raised up, frame 2 wings horizontal, frame 3 wings lowered. Each frame the same size, centered, evenly spaced, base aligned at the bottom, isolated on solid flat magenta background #FF00FF, no shadow, no ground, no text. 8-bit pixel art, limited 24-color palette (deep navy, cream, sky blue, grass green, warm brown, gold), hard pixel edges, no anti-aliasing, flat shading with two or three tones, one-pixel dark outline, light from the top-left, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, cropped subject, different character per frame, more than 24 colors.
```

#### C7. `personagens/codigo.png` (96×32, transparente)

```text
Sprite sheet of three animation frames side by side in one horizontal row, the same character in every frame: a hardcover penal law book with a gold emblem on the cover and small white feather wings. Frame 1 wings raised up, frame 2 wings horizontal, frame 3 wings lowered. Each frame the same size, centered, evenly spaced, base aligned at the bottom, isolated on solid flat magenta background #FF00FF, no shadow, no ground, no text. 8-bit pixel art, limited 24-color palette (deep navy, cream, sky blue, grass green, warm brown, gold), hard pixel edges, no anti-aliasing, flat shading with two or three tones, one-pixel dark outline, light from the top-left, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, cropped subject, different character per frame, more than 24 colors.
```

#### C8. `personagens/grifo.png` (96×32, transparente)

```text
Sprite sheet of three animation frames side by side in one horizontal row, the same character in every frame: a griffin in flight, with an eagle head and a lion body, cream and light blue-grey wings, orange-brown body, yellow beak and talons, matching the Grifo mascot. Frame 1 wings raised up, frame 2 wings horizontal, frame 3 wings lowered. Each frame the same size, centered, evenly spaced, base aligned at the bottom, isolated on solid flat magenta background #FF00FF, no shadow, no ground, no text. 8-bit pixel art, limited 24-color palette (deep navy, cream, sky blue, grass green, warm brown, gold), hard pixel edges, no anti-aliasing, flat shading with two or three tones, one-pixel dark outline, light from the top-left, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, cropped subject, different character per frame, more than 24 colors.
```

### D. Moedas

#### D1. `itens/moeda.png` (64×16, transparente)

```text
Sprite sheet of four frames of a spinning gold coin in one horizontal row: full face, three-quarter view, thin edge, mirrored three-quarter view. Gold #FCD464 with a darker orange-brown rim and a tiny embossed scales-of-justice symbol. Each frame the same size, centered, isolated on solid flat magenta background #FF00FF, no shadow, no text. 8-bit pixel art, limited 24-color palette (deep navy, cream, sky blue, grass green, warm brown, gold), hard pixel edges, no anti-aliasing, flat shading with two or three tones, one-pixel dark outline, light from the top-left, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, cropped subject, more than 24 colors.
```

### E. Poderes (ícones 16×16)

Os conceitos seguem o `powers.ts` e os SVG atuais em `public/poderes/`. Use o SVG de cada poder como referência de identidade ao gerar.

#### E1. `poderes/escudo.png` (Habeas Corpus)

```text
Single centered pixel art icon, 16×16 design: a golden shield with a small silver padlock in its centre. Bold dark outline, three or four colors from the palette plus a white highlight, large simple silhouette, isolated on solid flat magenta background #FF00FF, no text, no letters. 8-bit pixel art, hard pixel edges, no anti-aliasing, flat shading with two or three tones, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, more than 24 colors.
```

#### E2. `poderes/ima.png` (Vade Mecum)

```text
Single centered pixel art icon, 16×16 design: a small closed law book with a red-and-silver horseshoe magnet on its cover. Bold dark outline, three or four colors from the palette plus a white highlight, large simple silhouette, isolated on solid flat magenta background #FF00FF, no text, no letters. 8-bit pixel art, hard pixel edges, no anti-aliasing, flat shading with two or three tones, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, more than 24 colors.
```

#### E3. `poderes/lento.png` (Prazo em Dobro)

```text
Single centered pixel art icon, 16×16 design: an hourglass with golden sand. Bold dark outline, three or four colors from the palette plus a white highlight, large simple silhouette, isolated on solid flat magenta background #FF00FF, no text, no letters. 8-bit pixel art, hard pixel edges, no anti-aliasing, flat shading with two or three tones, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, more than 24 colors.
```

#### E4. `poderes/mini.png` (Insignificância)

```text
Single centered pixel art icon, 16×16 design: a tiny suitcase with two small arrows pointing inward. Bold dark outline, three or four colors from the palette plus a white highlight, large simple silhouette, isolated on solid flat magenta background #FF00FF, no text, no letters. 8-bit pixel art, hard pixel edges, no anti-aliasing, flat shading with two or three tones, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, more than 24 colors.
```

#### E5. `poderes/fantasma.png` (Absolvição Sumária)

```text
Single centered pixel art icon, 16×16 design: a translucent white gavel fading out, ghostly. Bold dark outline, three or four colors from the palette plus a white highlight, large simple silhouette, isolated on solid flat magenta background #FF00FF, no text, no letters. 8-bit pixel art, hard pixel edges, no anti-aliasing, flat shading with two or three tones, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, more than 24 colors.
```

#### E6. `poderes/dobro.png` (Concurso Material)

```text
Single centered pixel art icon, 16×16 design: two stacked gold coins with a small upward arrow. Bold dark outline, three or four colors from the palette plus a white highlight, large simple silhouette, isolated on solid flat magenta background #FF00FF, no text, no letters. 8-bit pixel art, hard pixel edges, no anti-aliasing, flat shading with two or three tones, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, more than 24 colors.
```

#### E7. `poderes/leve.png` (Asas de Ouro)

```text
Single centered pixel art icon, 16×16 design: a pair of golden feathered wings. Bold dark outline, three or four colors from the palette plus a white highlight, large simple silhouette, isolated on solid flat magenta background #FF00FF, no text, no letters. 8-bit pixel art, hard pixel edges, no anti-aliasing, flat shading with two or three tones, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, more than 24 colors.
```

#### E8. `poderes/congelar.png` (Trânsito em Julgado)

```text
Single centered pixel art icon, 16×16 design: a gavel encased in blue ice crystals. Bold dark outline, three or four colors from the palette plus a white highlight, large simple silhouette, isolated on solid flat magenta background #FF00FF, no text, no letters. 8-bit pixel art, hard pixel edges, no anti-aliasing, flat shading with two or three tones, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, more than 24 colors.
```

#### E9. `poderes/prescricao.png` (Prescrição)

```text
Single centered pixel art icon, 16×16 design: a calendar page with a rubber eraser. Bold dark outline, three or four colors from the palette plus a white highlight, large simple silhouette, isolated on solid flat magenta background #FF00FF, no text, no letters. 8-bit pixel art, hard pixel edges, no anti-aliasing, flat shading with two or three tones, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, more than 24 colors.
```

#### E10. `poderes/revisao.png` (Revisão Criminal)

```text
Single centered pixel art icon, 16×16 design: a red heart with a small golden scales inside. Bold dark outline, three or four colors from the palette plus a white highlight, large simple silhouette, isolated on solid flat magenta background #FF00FF, no text, no letters. 8-bit pixel art, hard pixel edges, no anti-aliasing, flat shading with two or three tones, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, more than 24 colors.
```

#### E11. `poderes/arquivamento.png` (Arquivamento)

```text
Single centered pixel art icon, 16×16 design: a grey archive box with a folded file on top. Bold dark outline, three or four colors from the palette plus a white highlight, large simple silhouette, isolated on solid flat magenta background #FF00FF, no text, no letters. 8-bit pixel art, hard pixel edges, no anti-aliasing, flat shading with two or three tones, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, more than 24 colors.
```

#### E12. `poderes/equilibrio.png` (Equilíbrio)

```text
Single centered pixel art icon, 16×16 design: a golden balance scale perfectly level. Bold dark outline, three or four colors from the palette plus a white highlight, large simple silhouette, isolated on solid flat magenta background #FF00FF, no text, no letters. 8-bit pixel art, hard pixel edges, no anti-aliasing, flat shading with two or three tones, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, more than 24 colors.
```

#### E13. `poderes/inquerito.png` (Inquérito)

```text
Single centered pixel art icon, 16×16 design: a magnifying glass over a gold coin. Bold dark outline, three or four colors from the palette plus a white highlight, large simple silhouette, isolated on solid flat magenta background #FF00FF, no text, no letters. 8-bit pixel art, hard pixel edges, no anti-aliasing, flat shading with two or three tones, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, more than 24 colors.
```

#### E14. `poderes/presuncao.png` (Presunção de Inocência)

```text
Single centered pixel art icon, 16×16 design: a white dove. Bold dark outline, three or four colors from the palette plus a white highlight, large simple silhouette, isolated on solid flat magenta background #FF00FF, no text, no letters. 8-bit pixel art, hard pixel edges, no anti-aliasing, flat shading with two or three tones, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, more than 24 colors.
```

#### E15. `poderes/dosimetria.png` (Dosimetria)

```text
Single centered pixel art icon, 16×16 design: a small scale with three gold dots on one pan. Bold dark outline, three or four colors from the palette plus a white highlight, large simple silhouette, isolated on solid flat magenta background #FF00FF, no text, no letters. 8-bit pixel art, hard pixel edges, no anti-aliasing, flat shading with two or three tones, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, more than 24 colors.
```

#### E16. `poderes/denuncia.png` (Denúncia)

```text
Single centered pixel art icon, 16×16 design: a scroll document with a red wax seal. Bold dark outline, three or four colors from the palette plus a white highlight, large simple silhouette, isolated on solid flat magenta background #FF00FF, no text, no letters. 8-bit pixel art, hard pixel edges, no anti-aliasing, flat shading with two or three tones, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, more than 24 colors.
```

#### E17. `poderes/tipificacao.png` (Tipificação)

```text
Single centered pixel art icon, 16×16 design: a law book with a golden section sign on its spine. Bold dark outline, three or four colors from the palette plus a white highlight, large simple silhouette, isolated on solid flat magenta background #FF00FF, no text, no letters. 8-bit pixel art, hard pixel edges, no anti-aliasing, flat shading with two or three tones, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, more than 24 colors.
```

#### E18. `poderes/voo.png` (Voo do Grifo)

```text
Single centered pixel art icon, 16×16 design: a golden griffin wing with feathers. Bold dark outline, three or four colors from the palette plus a white highlight, large simple silhouette, isolated on solid flat magenta background #FF00FF, no text, no letters. 8-bit pixel art, hard pixel edges, no anti-aliasing, flat shading with two or three tones, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, more than 24 colors.
```

### F. Interface (HUD e menu)

#### F1. `hud/coracao.png` (16×16, transparente)

```text
Single centered pixel art heart icon, 16×16 design, red #D83C2C with a white highlight and a darker red outline, simple big silhouette, isolated on solid flat magenta background #FF00FF, no text. 8-bit pixel art, hard pixel edges, no anti-aliasing, flat shading with two tones, one-pixel dark outline, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, more than 24 colors.
```

#### F2. `hud/moeda.png` (16×16, transparente)

```text
Single centered pixel art gold coin icon, 16×16 design: a gold #FCD464 face with a darker orange-brown rim and a small scales-of-justice emblem, isolated on solid flat magenta background #FF00FF, no text. 8-bit pixel art, hard pixel edges, no anti-aliasing, flat shading with two or three tones, one-pixel dark outline, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, more than 24 colors.
```

#### F3. `hud/pausa.png` (16×16, transparente)

```text
Single centered pixel art pause button icon, 16×16 design: two vertical white bars with a dark outline, inside a rounded navy square, isolated on solid flat magenta background #FF00FF outside the square, no text. 8-bit pixel art, hard pixel edges, no anti-aliasing, flat shading with two tones, one-pixel dark outline, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, more than 24 colors.
```

#### F4. `hud/som-ligado.png` (16×16, transparente)

```text
Single centered pixel art speaker icon with two sound waves, 16×16 design: white with a dark outline, inside a rounded navy square, isolated on solid flat magenta background #FF00FF outside the square, no text. 8-bit pixel art, hard pixel edges, no anti-aliasing, flat shading with two tones, one-pixel dark outline, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, more than 24 colors.
```

#### F5. `hud/som-desligado.png` (16×16, transparente)

```text
Single centered pixel art speaker icon with a red X, 16×16 design: white with a dark outline, inside a rounded navy square, isolated on solid flat magenta background #FF00FF outside the square, no text. 8-bit pixel art, hard pixel edges, no anti-aliasing, flat shading with two tones, one-pixel dark outline, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, more than 24 colors.
```

#### F6. `hud/tela-cheia.png` (16×16, transparente)

```text
Single centered pixel art fullscreen icon, 16×16 design: four diagonal corner arrows pointing outward, white with a dark outline, inside a rounded navy square, isolated on solid flat magenta background #FF00FF outside the square, no text. 8-bit pixel art, hard pixel edges, no anti-aliasing, flat shading with two tones, one-pixel dark outline, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, more than 24 colors.
```

#### F7. `hud/moldura.png` (48×48, 9-slice, centro transparente)

```text
Decorative pixel art frame for a game menu panel, square 48×48 design: 8-pixel corners with an ornate gold Greek meander (grega) pattern, symmetric straight edges, dark navy outline, the centre area solid flat magenta #FF00FF for transparency. No text, no characters. 8-bit pixel art, hard pixel edges, no anti-aliasing, flat shading with two or three tones, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, asymmetric pattern, more than 24 colors.
```

#### F8. `hud/botao.png` (48×24, 9-slice, centro transparente, opcional)

```text
Decorative pixel art button frame for a game menu, 48×24 design: 6-pixel rounded corners, gold edge with a thin cream highlight on top and a darker bottom edge, dark navy outline, the centre area solid flat magenta #FF00FF for transparency. No text, no characters. 8-bit pixel art, hard pixel edges, no anti-aliasing, flat shading with two or three tones, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, more than 24 colors.
```

### G. Efeitos

#### G1. `fx/faisca.png` (32×8, 4 quadros de 8×8)

```text
Sprite sheet of four frames of a small golden sparkle effect in one horizontal row, each frame 8×8 pixels: a four-point star that grows, then fades. White and gold colors, each frame the same size and centered, isolated on solid flat magenta background #FF00FF, no text. 8-bit pixel art, hard pixel edges, no anti-aliasing, flat shading with two tones, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, more than 24 colors.
```

#### G2. `fx/destroco.png` (32×8, 4 quadros de 8×8)

```text
Sprite sheet of four frames of small cream marble chips and dust flakes in one horizontal row, each frame 8×8 pixels, with different debris shapes: cream and warm brown colors, brown outlines, each frame the same size and centered, isolated on solid flat magenta background #FF00FF, no text. 8-bit pixel art, hard pixel edges, no anti-aliasing, flat shading with two tones, one-pixel dark outline, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, more than 24 colors.
```

#### G3. `fx/explosao.png` (120×24, 5 quadros de 24×24)

```text
Sprite sheet of five frames of a small pixel burst effect in one horizontal row, each frame 24×24 pixels: it grows from a point to a round white-and-gold burst, then fades into sparks. Each frame the same size and centered, isolated on solid flat magenta background #FF00FF, no text. 8-bit pixel art, limited 24-color palette (deep navy, cream, sky blue, grass green, warm brown, gold), hard pixel edges, no anti-aliasing, flat shading with two tones, no logo. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, more than 24 colors.
```

### H. Capas

#### H1. `capas/flap-suitcase-8bit.png` (2000×1125, opaco)

```text
16:9 cover illustration in 8-bit pixel art: a brown leather briefcase with white feather wings flying between tall white Greek columns over a dusk sky with a large pixel sun, clouds and a small griffin silhouette in the distance. Keep the left third calmer and empty for a title. No title text, no logo, no watermark. Opaque background, no magenta. 8-bit pixel art, limited 24-color palette (deep navy, cream, sky blue, grass green, warm brown, gold), hard pixel edges, no anti-aliasing, no smooth gradients, flat shading with two or three tones. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, signature, more than 24 colors.
```

#### H2. `capas/flap-suitcase-8bit-og.png` (1200×630, opaco, opcional)

```text
Social preview image, 1.9:1, 8-bit pixel art: the same scene as the game cover, with the briefcase centered and large, white Greek columns and a dusk sky with a pixel sun. Leave the left side empty for a title. No text, no logo, no watermark. Opaque background, no magenta. 8-bit pixel art, limited 24-color palette (deep navy, cream, sky blue, grass green, warm brown, gold), hard pixel edges, no anti-aliasing, no smooth gradients, flat shading with two or three tones. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, text, letters, watermark, signature, more than 24 colors.
```

---

## 6. Fontes da pesquisa (2026)

- dev.to/jenissimo, "How to tame your AI pixel art": detecção de grade, votação por bloco e quantização Wu. Código em github.com/jenissimo/unfake.js.
- spritecook.ai/blog/consistent-game-art-with-ai: tema e estilo fixos, referências aprovadas e presets.
- sorceress.games: guias de remoção de fundo e alfa rígido.
- pixnote.net/en/learn/shading: sombra conforme o tamanho do canvas.
- lospec.com/articles/pixel-art-outlines: contornos.
- gdg.mit.edu/style-guide: limite de cores por sprite.
- wayline.io: paletas limitadas.
- Comparativos de ferramentas (app.cinevva.com/guides/ai-pixel-art-generators e spritecook.ai/compare/retro-diffusion): são de fornecedores, então os números valem como regra prática.
