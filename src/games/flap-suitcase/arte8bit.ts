// Arte do tema Pixel 8-bit (public/jogos/flap-suitcase/8bit), gerada e processada por scripts/processar-8bit.mjs.
// Cada célula da imagem é um pixel do buffer do jogo: os sprites são desenhados em escala 1:1 para ficarem nítidos.

const PASTA = "/jogos/flap-suitcase/8bit";

/** Caminho público de um arquivo da pasta 8-bit (também usado pelo HUD, em React). */
export const arte8bit = (caminho: string) => `${PASTA}/${caminho}`;

function carregar(caminho: string): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  const img = new Image();
  img.src = arte8bit(caminho);
  return img;
}

/** A imagem já foi baixada e tem tamanho (senão o motor usa o desenho procedural). */
export const pronta = (img: HTMLImageElement | null | undefined): img is HTMLImageElement => !!img?.naturalWidth;

/** Cenário em camadas: céu (fundo, opaco), montanhas, colinas e campos (com transparência) e o chão. */
export const CENARIO = {
  ceu: carregar("cenario/camada-0-ceu-sol-nuvens.png"),
  montanhas: carregar("cenario/camada-1-montanhas.png"),
  colinas: carregar("cenario/camada-2-colinas-florestas.png"),
  campos: carregar("cenario/camada-3-campos-rio.png"),
  chao: carregar("cenario/chao.png"),
};

/** Colunas dóricas: inteira e rachada (a mesma geometria: capitel, fuste e base). */
export const COLUNA = {
  normal: carregar("colunas/dorica-normal.png"),
  rachada: carregar("colunas/dorica-rachada.png"),
};

/** Personagens: uma folha com três quadros lado a lado (asas para cima, na horizontal e para baixo). */
export const PERSONAGEM: Record<string, HTMLImageElement | null> = Object.fromEntries(
  ["maleta", "balanca", "delegado", "defensor", "juiz", "promotor", "codigo", "grifo"].map((id) => [id, carregar(`personagens/${id}.png`)]),
);

/** Moeda girando: quatro quadros (cheia, meia, fina e meia). */
export const MOEDA = carregar("itens/moeda.png");

/** Efeitos em sequência: quantos quadros e quantos por segundo. */
export const EFEITO = {
  faisca: { img: carregar("fx/faisca.png"), quadros: 4, fps: 12 },
  destroco: { img: carregar("fx/destroco.png"), quadros: 4, fps: 10 },
  explosao: { img: carregar("fx/explosao.png"), quadros: 5, fps: 10 },
};

const poderes = new Map<string, HTMLImageElement | null>();

/** Ícone 16×16 de um poder (o motor imprime essa URL no HUD). */
export const iconePoder = (id: string) => arte8bit(`poderes/${id}.png`);

/** Imagem do ícone de poder para desenhar no canvas (carregada uma vez). */
export function imagemPoder(id: string): HTMLImageElement | null {
  if (!poderes.has(id)) poderes.set(id, carregar(`poderes/${id}.png`));
  return poderes.get(id) ?? null;
}

/**
 * Desenha o quadro `k` de uma folha de `quadros` lado a lado, centrado em (x, y).
 * `sb` são os pixels do buffer por unidade lógica: com ele, cada célula cai em um pixel do buffer.
 */
export function desenharQuadro(c: CanvasRenderingContext2D, img: HTMLImageElement, quadros: number, k: number, x: number, y: number, sb: number) {
  const fw = img.naturalWidth / quadros;
  const fh = img.naturalHeight;
  const lw = fw / sb;
  const lh = fh / sb;
  c.drawImage(img, k * fw, 0, fw, fh, x - lw / 2, y - lh / 2, lw, lh);
}

/** Altura (em linhas) das camadas já reduzidas: acima do buffer do jogo, para o desenho por quadro ficar barato. */
const LINHAS_MINIATURA = 240;
const miniaturas = new Map<HTMLImageElement, HTMLCanvasElement | HTMLImageElement>();

/**
 * Camada reduzida uma vez para ~240 linhas (a arte original tem 1080). Imagens já pequenas voltam como estão.
 * Só deve ser chamada no navegador.
 */
export function miniatura(img: HTMLImageElement): HTMLCanvasElement | HTMLImageElement {
  if (img.naturalHeight <= LINHAS_MINIATURA) return img;
  let cv = miniaturas.get(img);
  if (!cv) {
    const canvas = document.createElement("canvas");
    canvas.height = LINHAS_MINIATURA;
    canvas.width = Math.round((LINHAS_MINIATURA * img.naturalWidth) / img.naturalHeight);
    const c = canvas.getContext("2d");
    if (c) {
      c.imageSmoothingEnabled = true;
      c.imageSmoothingQuality = "high";
      c.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
    cv = canvas;
    miniaturas.set(img, cv);
  }
  return cv;
}

/**
 * Faixa que se repete na horizontal, espelhada a cada repetição: a costura entre as cópias nunca aparece,
 * mesmo quando a arte original não é um laço perfeito. `deslocamento` cresce com a rolagem.
 */
export function faixa(c: CanvasRenderingContext2D, fonte: HTMLImageElement | HTMLCanvasElement, deslocamento: number, y: number, altura: number, w: number) {
  const [fw, fh] = fonte instanceof HTMLImageElement ? [fonte.naturalWidth, fonte.naturalHeight] : [fonte.width, fonte.height];
  const largura = (fw / fh) * altura;
  for (let a = Math.floor(deslocamento / largura); ; a++) {
    const x = a * largura - deslocamento;
    if (x >= w) break;
    if (a & 1) {
      c.save();
      c.translate(x + largura, y);
      c.scale(-1, 1);
      c.drawImage(fonte, 0, 0, largura, altura);
      c.restore();
    } else c.drawImage(fonte, x, y, largura, altura);
  }
}
