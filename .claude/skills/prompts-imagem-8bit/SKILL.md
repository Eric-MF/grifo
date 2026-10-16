---
name: prompts-imagem-8bit
description: Gera prompts em inglês, prontos para colar, para geradores de imagem de IA criarem assets 8-bit de jogos (personagens e sprite sheets, moedas, ícones, tiles, camadas de cenário, molduras, efeitos e capas), com estilo travado, paleta, fundo para recorte, tamanho, negativos e nome de arquivo. Use quando pedirem prompts de imagem para jogo 8-bit, pixel art, sprites ou tiles com IA.
---

# Prompts de IA para assets 8-bit

Esta skill escreve prompts. Para o processo de produção (pós-processamento, paleta, grade e integração), use a skill `jogo-8bit-ia`.

## Estrutura de todo prompt

1. Sujeito e função: o que é e em que pose ou quadro.
2. Composição: vista lateral, centralizado, margem, repetição horizontal se for cenário.
3. Bloco de estilo travado (seção 1). Sempre o mesmo texto.
4. Fundo: sólido #FF00FF para recorte, ou opaco para céu e capa.
5. Formato e proporção.
6. "Avoid:" com os negativos (seção 3).

Escreva sempre em inglês, em um parágrafo corrido. Não peça texto, letras, logos ou assinaturas: os geradores erram letras e o texto, quando necessário, entra no site como HTML.

## 1. Bloco de estilo travado (cole em todo prompt)

```
8-bit pixel art, retro console game sprite style, limited palette of 24 colors (deep navy, cream, sky blue, grass green, warm brown, gold), hard pixel edges, no anti-aliasing, no smooth gradients, flat shading with two or three tones, clean one-pixel dark outline, light from the top-left, no text, no logo, no watermark.
```

Paleta de referência (24 cores extraídas de `8-bits fundo completo`): #343C5C #2C5434 #247464 #44AC44 #4C7C34 #6CC47C #8CCC4C #B4EC74 #549CC4 #2CA4DC #84C4E4 #ACDCF4 #D4F4FC #8CACBC #54647C #9C8C8C #ECDCBC #DCBC9C #CC9C7C #9C7464 #74544C #3C241C #6C948C #FCD464.

Acentos permitidos só em ícones e interface: vermelho #D83C2C, branco #FCFCFC, azul-noite #0B1224, roxo #7C3C8C.

## 2. Fundo e recorte

- Sprites, personagens, ícones, moedas, efeitos e molduras: "isolated on solid flat magenta background #FF00FF, no shadow, no ground".
- Camadas de cenário com transparência: magenta na área transparente.
- Céu do cenário e capa: fundo opaco, sem magenta.

## 3. Negativos (use em todo prompt)

```
Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, JPEG artifacts, text, letters, watermark, signature, border frame, cropped subject, shadow on background, more than 24 colors.
```

## 4. Modelos por tipo

### Personagem com sheet de voo (três quadros)

```
Sprite sheet of three animation frames side by side in one horizontal row, the same character in every frame: [descrição]. Frame 1 wings raised up, frame 2 wings horizontal, frame 3 wings lowered. Each frame the same size, centered, evenly spaced, base aligned at the bottom, isolated on solid flat magenta background #FF00FF, no shadow, no ground, no text. [ESTILO]. [NEGATIVOS]
```

### Camada de cenário repetível

```
Very wide panoramic strip, about 2.4:1, seamless horizontal loop with matching left and right edges: [conteúdo]. Side view, flat layers, no characters, no text. [ESTILO]. [Fundo magenta onde for transparente]. [NEGATIVOS]
```

### Tile de chão

```
Seamless horizontal ground tile for a side-scrolling 8-bit game, 2:1 proportion: [conteúdo], tiles left to right without any visible seam, no characters, no shadows, no text. [ESTILO]. [NEGATIVOS]
```

### Ícone de HUD ou de poder (16×16)

```
Single centered pixel art icon, 16×16 design, [objeto], bold dark outline, three or four colors from the palette plus a white highlight, large simple silhouette, isolated on solid flat magenta background #FF00FF, no text, no letters. [ESTILO]. [NEGATIVOS]
```

### Sheet de animação curta (moeda, efeito)

```
Sprite sheet of [N] frames of [efeito] in one horizontal row, each frame [W]×[H] pixels, same size, centered, solid flat magenta background #FF00FF, no text. [ESTILO]. [NEGATIVOS]
```

### Moldura de painel (9-slice)

```
Decorative pixel art frame for a game menu panel, square design, ornate gold Greek meander pattern on the corners and edges, symmetric straight edges, dark navy outline, the centre solid flat magenta #FF00FF for transparency, no text, no characters. [ESTILO]. [NEGATIVOS]
```

### Capa

```
16:9 cover illustration in 8-bit pixel art: [cena]. Keep the left third calmer and empty for a title, no title text, no logo. [ESTILO]. Opaque background, no magenta. [NEGATIVOS]
```

## 5. Nomes de arquivo

- Minúsculas, sem acento, com hífen. Uma pasta por categoria.
- Padrão: `<pasta>/<nome>[-<variante>].png`. Exemplo: `colunas/dorica-rachada.png`.
- Quadros de animação ficam no mesmo arquivo, em sheet, nunca em arquivos separados.
- Saída bruta da IA, antes do pós-processamento: `assets/imagens/jogos/8bit/bruto/<mesmo-nome>-v<n>.png`.

## 6. Checklist ao receber cada imagem

- O fundo é sólido? Quantas cores aparecem? O objeto está centralizado e inteiro?
- Não há texto, letras ou marca?
- Os quadros de um sheet têm o mesmo tamanho e a mesma base?
- Se algo falhar: regenere com os negativos reforçados ou corrija no pós-processamento (skill `jogo-8bit-ia`).

## Exemplo completo: coluna dórica normal (24×96)

```
A single Doric Greek column seen from the front, tall and narrow, cream marble shaft with vertical flutes and warm brown shading on the right side, square-cut Doric capital at the top, stepped base at the bottom, isolated on solid flat magenta background #FF00FF, no shadow, no ground, no floor, no text. 8-bit pixel art, retro console game sprite style, limited palette of 24 colors (deep navy, cream, sky blue, grass green, warm brown, gold), hard pixel edges, no anti-aliasing, no smooth gradients, flat shading with two or three tones, clean one-pixel dark outline, light from the top-left, no text, no logo, no watermark. Avoid: blurry, smooth gradients, anti-aliased edges, photorealistic, 3D render, noise, JPEG artifacts, text, letters, watermark, signature, border frame, cropped subject, shadow on background, more than 24 colors.
```
