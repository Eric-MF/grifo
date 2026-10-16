---
name: jogo-8bit-ia
description: Planeja e produz arte 8-bit bonita para jogos feitos com IA. Cobre estilo travado, paleta, resolução nativa, consistência entre assets, pós-processamento (remover fundo, grade de pixels, paleta, contorno), sprite sheets, camadas de parallax e integração no motor. Use quando pedirem jogo 8-bit, pixel art com IA, sprites, cenário em camadas ou para embelezar um jogo retrô.
---

# Jogo 8-bit bonito com IA

## Princípio central

IA gera imagens bonitas, mas não pixel art pronta. A qualidade vem de três coisas: um estilo travado para todos os assets, uma resolução nativa definida antes de gerar, e um pós-processamento que transforma a saída da IA em pixels reais.

## 1. Planejar antes de gerar

- Liste todos os assets: personagens com quadros de animação, inimigos, moedas, ícones, tiles, camadas de cenário, molduras, efeitos e capa.
- Escreva o estilo num único bloco de texto e reutilize esse bloco em todo prompt.
- Defina a paleta antes da primeira imagem (seção 3) e guarde os códigos hex num arquivo do projeto.
- Escolha a resolução nativa de cada tipo (seção 2). O sprite nativo deve corresponder a pixels reais da tela, ou a um múltiplo inteiro deles.
- Aprove uma referência cedo e use-a como âncora nas gerações seguintes.

## 2. Resolução e grade

Valores de partida. Valide no motor, porque o tamanho desenhado na tela define o que aparece como pixel.

| Tipo | Nativo sugerido | Observação |
|---|---|---|
| Ícone de HUD ou de poder | 16×16 (até 24×24) | Silhueta grande e simples |
| Moeda, faísca, destroço | 8×8 a 16×16 | Sheets de 4 a 6 quadros |
| Personagem ou inimigo | 24×24 a 32×32 por quadro | Sheet de quadros lado a lado, mesma base |
| Coluna ou obstáculo | Largura igual à largura desenhada em pixels reais | Altura livre: só o fuste estica |
| Cenário em camadas | 384 a 512 px de largura, altura da cena | Repetível na horizontal |
| Capa | Gerar com 1536 a 2048 px de largura, reduzir depois | |

Gere sempre acima do nativo (512 px ou mais para sprites) e reduza no fim. Saídas pequenas, abaixo de uns 256 px, produzem bordas de alfa em blocos.

**Normalização para o buffer (aprendido no lote de 2026-10-16).** A IA gerou o mesmo tipo de asset com blocos de 11 a 64 px, em grades de 16 a 40 células, e o meio-bloco aparece em alguns casos. O motor desenha o tema pixel num buffer de ~200 linhas, então a regra é: **uma célula da arte = um pixel do buffer**, o que deixa tudo nítido. Os tamanhos que o projeto usa:

- ícones e poderes: 16×16 (o conteúdo cabe em 16; blocos maiores são reduzidos por votação);
- personagens: quadros com no máximo 26 células, mesmo fator inteiro em todos os quadros da folha;
- colunas: 24 células de largura (a altura segue a proporção, e a geometria do capitel e da base é medida na arte);
- efeitos: destroço em quadros de 8×8 e faísca de 9×10 (folhas de 4 quadros), explosão de 23×23 (5 quadros);
- moeda: 8×8 nos quadros de giro (derivados da moeda de HUD, 16×16);
- chão: faixa nativa de ~14 linhas (grama, borda e terra), desenhada 1:1;
- cenários: grade detectada com fator inteiro até 1920 px de largura, para o arquivo ter blocos regulares.

## 3. Paleta e sombras

- Paleta fixa por cena: 16 a 32 cores. Sprites isolados: até 16.
- Mapeie a saída da IA para a paleta com distância perceptual (LAB). Sem dithering em sprites.
- Sombra por matiz: escureça e desloque a tonalidade (sombra para azul ou roxo, luz para amarelo ou laranja), em vez de só reduzir o brilho.
- Três tons por material em objetos pequenos (base, sombra, luz). Quatro ou cinco em objetos grandes.
- Contorno de 1 px, numa cor mais escura que a do próprio objeto.
- Uma só direção de luz (topo à esquerda) em todos os assets.
- Sem preto puro nas sombras, sem gradiente suave. Dithering só em céus e fundos, e se for necessário.

## 4. Gerar

- Fundo sólido chapado (#FF00FF) para sprites e para camadas com transparência. Sem sombra no chão.
- Um objeto por imagem, centralizado, com margem.
- Cite explicitamente: "8-bit pixel art", "limited palette", "hard pixel edges", "no anti-aliasing", "flat shading".
- Para animação, peça um sheet num único prompt ("three frames side by side, same size, base aligned"), em vez de quadros soltos. Assim o personagem fica consistente.
- Cenário: "seamless horizontal loop", sem personagens e sem texto.
- Peça variações da mesma cena e escolha a melhor. Não aceite a primeira saída só porque ficou bonita.

## 5. Pós-processamento (ordem fixa)

Ferramenta do projeto: `node scripts/processar-8bit.mjs` lê `.examples/8bits Images/` (fora do git) e grava em `public/jogos/flap-suitcase/8bit/`. Ela faz os passos de 1 a 7 e imprime a grade detectada de cada arquivo. Para um asset novo, acrescente uma linha em `ITENS` e rode de novo.

1. Remover o fundo: chroma key da cor sólida, com limpeza do vazamento (spill) nas bordas.
2. Alfa rígido: alfa maior ou igual a 128 vira 255, o resto vira 0. Nada de alfa parcial, que vira halo quando ampliado.
3. Detectar a grade: periodograma das transições de cor, com candidatos de canvas inteiro (N blocos) e picos refinados. Cada candidato recebe A (fração das transições que caem nas bordas) e C (fração das bordas com transição). Escolha o de maior A×C com A ≥ 0,5. Um período dobrado (2N) também alinha, mas cobre só metade das bordas, então perde. Os dois eixos saem como par quando os períodos são parecidos (até 3%), porque nem toda imagem é pixel quadrado.
4. Reduzir: votação por bloco (a cor dominante vence se superar a segunda em mais de 5%, senão use a média). Nearest-neighbor só quando a grade já estiver exata.
5. Mapear para a paleta (LAB), sem dithering.
6. Limpeza: remova pixels isolados, feche o contorno de 1 px, alinhe a base dos quadros.
7. Exporte PNG com alfa no tamanho nativo exato. Em sheets, quadros em linha, todos com a mesma largura.
8. Conferir: 1× na tela, silhueta em tons de cinza, contagem de cores, costura das camadas repetidas em três larguras.

## 6. Consistência entre assets

- Mesmo bloco de estilo e mesma paleta em todos os assets.
- Uma referência aprovada entra em toda geração nova.
- Teste de silhueta: converta para cinza e confira se os objetos se separam do fundo.
- Mesma altura de base e mesma escala visual entre personagens.
- Se um asset destoar, regenere só esse, com a referência. Não refaça o conjunto inteiro.

## 7. Integração no motor

- Carregue imagens sob demanda e mantenha o desenho procedural como fallback quando o arquivo não existir (o projeto já faz isso com `optionalImage`).
- Quadros de animação avançam por tempo, com fps fixo, e não por quadro de render.
- Camadas de parallax com velocidades diferentes: a mais distante se move mais devagar.
- Desenhe em escala inteira quando possível. Para fundos grandes, reduza com suavização alta antes de desenhar no buffer de pixels.
- Meça o custo: poucos `drawImage` por quadro e peso total da pasta dentro do orçamento (ex.: menos de 3 MB).

## 8. Checklist de aceite

- [ ] Paleta da cena com até 32 cores, e sprites com até 16.
- [ ] Nenhum pixel com alfa parcial.
- [ ] Silhuetas legíveis em 1× e no buffer de pixels.
- [ ] Quadros alinhados (base e centro).
- [ ] Camadas sem costura visível na largura real de rolagem.
- [ ] Sem texto, logo ou marca d'água.
- [ ] Peso da pasta dentro do orçamento.

## 9. Ferramentas

Checar os termos de uso antes de vender qualquer asset.

- Geradores gerais de imagem: ChatGPT e Gemini (imagens), Midjourney, Stable Diffusion.
- Pixel art nativa: PixelLab (sprites animados e direções), Retro Diffusion (plugin para Aseprite), Sprite-AI, Ludo.
- Consistência de estilo com referências: Scenario, Layer.
- Limpeza e pixelização: Aseprite (pago; LibreSprite e Piskel são gratuitos), unfake.js (grade e paleta), True Pixel (presets PICO-8, NES e Game Boy).

## Fontes da pesquisa (2026)

- dev.to/jenissimo: "How to tame your AI pixel art" (detecção de grade, votação por bloco, quantização Wu). Código em github.com/jenissimo/unfake.js.
- spritecook.ai/blog/consistent-game-art-with-ai: tema e estilo fixos, referências aprovadas, presets.
- sorceress.games (guias de remoção de fundo e alfa rígido).
- pixnote.net/en/learn/shading: sombra por tamanho de canvas.
- lospec.com/articles/pixel-art-outlines: contornos.
- gdg.mit.edu/style-guide: limite de cores por sprite.
- wayline.io: paletas limitadas.

As fontes são majoritariamente de fornecedores de ferramentas. Trate os números como regras práticas, não como especificação. Não há consenso documentado sobre o filtro ideal de redução final.
