// Coluna rachada do Flap Suitcase: a pedra fratura de verdade, perto da passagem.
//
// A coluna é desenhada duas vezes, cada vez recortada por um lado da fratura: a ponta (capitel e o começo do
// fuste, a parte que encosta na passagem) fica no lugar; o resto desce um pouco e escorrega de lado. Entre as
// duas partes aparece o fundo, em cunha. A borda de cada parte é lascada (pedaços faltando nos cantos), a face
// exposta da fratura ganha um tom mais escuro, saem trincas finas da fratura e há lascas soltas do lado em que
// ela mais abre. Funciona com qualquer desenho de coluna (colunaGrega, as colunas próprias dos temas e o sprite
// do tema pixel), porque só recorta o desenho.
//
// A geometria é pura e determinística (semente por coluna); os Path2D ficam em cache por semente, largura e
// comprimento, para não recalcular nada a 60 quadros por segundo.
//
// Coordenadas locais, as mesmas de colunaGrega: x centrado na coluna, y = 0 na ponta voltada para a passagem,
// y crescendo para longe dela. A metade de cima chega aqui já espelhada pelo engine.

import type { Ctx, Paleta } from "./themes";

export interface Ponto {
  x: number;
  y: number;
}

export interface GeometriaRacha {
  /** altura média da fratura, medida a partir da ponta da coluna */
  y: number;
  /** deslocamento lateral do resto da coluna (a parte longe da passagem) */
  desloc: number;
  /** borda de baixo da ponta (de x = -w/2 a x = w/2) */
  bordaPonta: Ponto[];
  /** borda de cima do resto, no referencial do resto (antes do deslocamento) */
  bordaResto: Ponto[];
  /**
   * Recortes. O recorte por polígono custa caro em área grande, então o resto (longo) é um retângulo a
   * partir de `corteFundo` mais uma faixa estreita em volta da fratura, com uma sobra de 1 unidade; a ponta,
   * curta, é um polígono só.
   */
  corteFundo: number;
  /** meia largura dos recortes: cobre o capitel (1,3 × a largura) e os anéis e flanges dos temas */
  meiaLargura: number;
  regiaoPonta: Ponto[];
  faixaResto: Ponto[];
  /** face exposta da fratura no resto (polígono), no referencial do resto */
  face: Ponto[];
  /** trincas finas que saem da fratura: as da ponta e as do resto (no referencial do resto) */
  trincasPonta: Ponto[][];
  trincasResto: Ponto[][];
  /** lascas soltas, polígonos fora do contorno, no lado em que a fratura mais abre */
  lascas: Ponto[][];
}

/** Gerador pseudoaleatório pequeno (mulberry32): mesma semente, mesma sequência. */
function gerador(semente: number) {
  let s = semente >>> 0 || 0x9e3779b9;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Semente da racha de uma metade da coluna: depende só de dados fixos do pilar (a variante e o centro sorteado
 * do vão), então a fratura não muda de um quadro para o outro e cada coluna tem a sua.
 */
export function sementeRacha(variante: number, vao: number, metade: "cima" | "baixo"): number {
  return (Math.imul(Math.round(vao * 16) + 1, 2654435761) ^ (variante * 7919) ^ (metade === "cima" ? 0x5bd1e995 : 0)) >>> 0;
}

/** Fratura abaixo deste comprimento não cabe: a coluna aparece inteira. */
export const COMPRIMENTO_MINIMO = 64;

/**
 * Geometria da fratura. `metade` só decide para onde as lascas caem (para baixo na tela): na metade de cima,
 * espelhada, "para baixo" é na direção da ponta.
 */
export function geometriaRacha(semente: number, w: number, len: number, metade: "cima" | "baixo" = "baixo"): GeometriaRacha | null {
  if (len < COMPRIMENTO_MINIMO) return null;
  const r = gerador(semente);
  const e = w / 2;
  // logo abaixo do capitel (o mais alto tem 26), mas sem passar da metade de colunas curtas
  const y = Math.min(48 + r() * 20, len * 0.5);
  // lado em que a fratura abre mais (a cunha) e inclinação do plano de fratura
  const lado = r() < 0.5 ? -1 : 1;
  const inclin = (0.14 + r() * 0.16) * (r() < 0.5 ? -1 : 1);
  const desloc = lado * (2.5 + r() * 1.5);

  // o plano de fratura serpenteia (passeio aleatório), com vértices em espaçamento irregular e um estilhaço
  // pontudo; as duas bordas se encaixam, separadas por uma cunha
  const N = 7;
  const passo = w / N;
  const pico = 1 + Math.floor(r() * (N - 1));
  let deriva = 0;
  const bordaPonta: Ponto[] = [];
  const bordaResto: Ponto[] = [];
  for (let i = 0; i <= N; i++) {
    const x = i === 0 ? -e : i === N ? e : -e + i * passo + (r() - 0.5) * passo * 0.7;
    deriva = Math.max(-8, Math.min(8, deriva + (r() - 0.5) * 9));
    const estilhaco = i === pico ? (r() < 0.5 ? -1 : 1) * (6 + r() * 5) : 0;
    const yp = y + inclin * x + deriva + estilhaco;
    // abertura da cunha: quase fechada no lado estreito, larga no outro
    const t = (x * lado + e) / w;
    const abre = 2 + 7 * t + r() * 1.5;
    bordaPonta.push({ x, y: yp });
    bordaResto.push({ x, y: yp + abre + (r() - 0.5) * 1.5 });
  }
  // lascado: um canto do resto falta no lado largo; na ponta, falta o canto do lado estreito
  const iLargo = lado > 0 ? N : 0;
  const vizLargo = iLargo + (lado > 0 ? -1 : 1);
  bordaResto[iLargo].y += 11 + r() * 6;
  bordaResto[vizLargo].y += 4 + r() * 3;
  const iEstreito = N - iLargo;
  const vizEstreito = iEstreito + (lado > 0 ? 1 : -1);
  bordaPonta[iEstreito].y -= 7 + r() * 5;
  bordaPonta[vizEstreito].y -= 2 + r() * 3;
  // um degrau no meio da borda do resto: um bloco que se soltou
  const iBloco = 2 + Math.floor(r() * (N - 3));
  bordaResto[iBloco].y += 3 + r() * 3;
  // nada sobe até o capitel (o mais alto tem 26) e as partes nunca se tocam
  // (em colunas curtas, a fratura também não passa do fim)
  const teto = Math.min(30, len * 0.3);
  const fundo = len - 6;
  bordaPonta.forEach((p, i) => {
    p.y = Math.min(Math.max(p.y, teto), fundo - 2);
    bordaResto[i].y = Math.min(Math.max(bordaResto[i].y, p.y + 2), fundo);
  });

  const X = e * 1.4;
  const corteFundo = Math.max(...bordaResto.map((p) => p.y));
  const regiaoPonta: Ponto[] = [
    { x: -X, y: -40 },
    { x: X, y: -40 },
    { x: X, y: bordaPonta[N].y },
    ...[...bordaPonta].reverse(),
    { x: -X, y: bordaPonta[0].y },
  ];
  const faixaResto: Ponto[] = [
    { x: -X, y: bordaResto[0].y },
    ...bordaResto,
    { x: X, y: bordaResto[N].y },
    { x: X, y: corteFundo + 1 },
    { x: -X, y: corteFundo + 1 },
  ];
  // face exposta: uma faixa logo abaixo da borda do resto, mais funda onde a fratura mais abre
  const face: Ponto[] = [...bordaResto];
  for (let i = N; i >= 0; i--) {
    const t = (bordaResto[i].x * lado + e) / w;
    face.push({ x: bordaResto[i].x, y: bordaResto[i].y + 3 + 3 * t + r() * 1.5 });
  }

  // trincas: partem de vértices da fratura e entram na pedra, com um galho
  const trinca = (de: Ponto, sentido: 1 | -1, passos: number, limite: number): Ponto[] => {
    const pts: Ponto[] = [{ ...de }];
    let { x, y: yy } = de;
    for (let k = 0; k < passos; k++) {
      x = Math.max(-e + 4, Math.min(e - 4, x + (r() - 0.5) * 12));
      yy += sentido * (7 + r() * 9);
      if (sentido < 0 && yy < limite) break;
      pts.push({ x, y: yy });
    }
    return pts;
  };
  const trincasResto: Ponto[][] = [];
  for (const i of [1 + Math.floor(r() * 3), N - 1 - Math.floor(r() * 3)]) {
    const t = trinca(bordaResto[i], 1, 3 + Math.floor(r() * 2), 0);
    trincasResto.push(t);
    if (t.length > 2) trincasResto.push(trinca(t[1], 1, 2, 0));
  }
  // na ponta a trinca é curta e para antes do capitel
  const trincasPonta: Ponto[][] = [trinca(bordaPonta[3 + Math.floor(r() * 3)], -1, 2, 30)].filter((t) => t.length > 1);

  // lascas soltas: fora do contorno, do lado largo, caindo para baixo na tela
  const queda = metade === "baixo" ? 1 : -1;
  const ref = bordaResto[iLargo].y;
  const lascas: Ponto[][] = [];
  for (let k = 0; k < 3; k++) {
    const cx = lado * (e + 3 + k * 2.5 + r() * 4);
    const cy = ref - 6 + queda * (3 + k * 8 + r() * 4);
    const raio = 4.5 - k + r() * 1.5;
    const lados = 4 + Math.floor(r() * 2);
    const giro = r() * Math.PI;
    const pts: Ponto[] = [];
    for (let j = 0; j < lados; j++) {
      const a = giro + (j / lados) * Math.PI * 2;
      const rr = raio * (0.65 + r() * 0.35);
      pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
    }
    lascas.push(pts);
  }

  return { y, desloc, bordaPonta, bordaResto, corteFundo, meiaLargura: X, regiaoPonta, faixaResto, face, trincasPonta, trincasResto, lascas };
}

// ---------------------------------------------------------------------------
// Cores: só da paleta da coluna do tema
// ---------------------------------------------------------------------------
function rgb(c: string): [number, number, number] {
  const v = c.replace("#", "");
  const n = parseInt(v.length === 3 ? v.split("").map((x) => x + x).join("") : v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Mistura de a para b; com k < 0 extrapola para longe de b. Resultado sempre válido (#rrggbb). */
function misturar(a: string, b: string, k: number): string {
  const x = rgb(a);
  const y = rgb(b);
  return (
    "#" +
    x
      .map((v, i) => Math.max(0, Math.min(255, Math.round(v + (y[i] - v) * k))).toString(16).padStart(2, "0"))
      .join("")
  );
}
export const luminancia = (c: string) => {
  const [r, g, b] = rgb(c);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export interface CoresRacha {
  /** face exposta da fratura (mais escura que o corpo) */
  face: string;
  /** contorno das bordas quebradas e das trincas */
  borda: string;
  /** lábio iluminado da ponta, logo acima da fratura */
  luz: string;
  /** recheio das lascas soltas */
  lasca: string;
}

/**
 * Cores da racha a partir da paleta da coluna. Se o contorno é mais escuro que o corpo (pedra clara), a face
 * escurece na direção dele; se é mais claro (noir, retrô), a face escurece afastando-se da luz.
 */
export function coresDaRacha(c: Paleta["coluna"]): CoresRacha {
  let cores = coresPorPaleta.get(c);
  if (!cores) {
    const contornoEscuro = luminancia(c.contorno) < luminancia(c.corpo);
    // parte do tom mais escuro da pedra (no retrô, o corpo é mais escuro que a sombra)
    const base = luminancia(c.sombra) <= luminancia(c.corpo) ? c.sombra : c.corpo;
    const face = contornoEscuro ? misturar(base, c.contorno, 0.5) : misturar(base, c.luz, -0.7);
    cores = { face, borda: c.contorno, luz: c.luz, lasca: c.corpo };
    coresPorPaleta.set(c, cores);
  }
  return cores;
}
const coresPorPaleta = new WeakMap<Paleta["coluna"], CoresRacha>();

// ---------------------------------------------------------------------------
// Desenho (Path2D em cache)
// ---------------------------------------------------------------------------
interface CaminhosRacha {
  desloc: number;
  regiaoPonta: Path2D;
  retResto: Path2D;
  faixaResto: Path2D;
  face: Path2D;
  bordaPonta: Path2D;
  labio: Path2D;
  bordaResto: Path2D;
  trincasPonta: Path2D;
  trincasResto: Path2D;
  lascas: Path2D;
}

function linha(p: Path2D, pts: Ponto[], fechar = false) {
  pts.forEach((q, i) => (i ? p.lineTo(q.x, q.y) : p.moveTo(q.x, q.y)));
  if (fechar) p.closePath();
}

function retangulo(x0: number, y0: number, x1: number, y1: number) {
  const p = new Path2D();
  p.rect(x0, y0, x1 - x0, y1 - y0);
  return p;
}

function caminhos(g: GeometriaRacha): CaminhosRacha {
  const novo = (pts: Ponto[][], fechar = false) => {
    const p = new Path2D();
    for (const q of pts) linha(p, q, fechar);
    return p;
  };
  return {
    desloc: g.desloc,
    regiaoPonta: novo([g.regiaoPonta], true),
    retResto: retangulo(-g.meiaLargura, g.corteFundo, g.meiaLargura, g.corteFundo + 2400),
    faixaResto: novo([g.faixaResto], true),
    face: novo([g.face], true),
    bordaPonta: novo([g.bordaPonta]),
    labio: novo([g.bordaPonta.map((q) => ({ x: q.x, y: q.y - 2.5 }))]),
    bordaResto: novo([g.bordaResto]),
    trincasPonta: novo(g.trincasPonta),
    trincasResto: novo(g.trincasResto),
    lascas: novo(g.lascas, true),
  };
}

const MAX_CACHE = 64;
const cache = new Map<string, CaminhosRacha | null>();

/** Comprimento só importa para colunas curtas (a fratura sobe); acima disso, todas usam o mesmo caminho. */
const chaveComprimento = (len: number) => (len >= 160 ? 160 : Math.floor(len / 4) * 4);

function obter(semente: number, w: number, len: number, metade: "cima" | "baixo"): CaminhosRacha | null {
  const lenChave = chaveComprimento(len);
  const chave = `${semente}|${w}|${lenChave}|${metade}`;
  let c = cache.get(chave);
  if (c === undefined) {
    // a região do resto vai até o fim da coluna: usa o maior comprimento do grupo, com folga
    const g = geometriaRacha(semente, w, lenChave >= 160 ? Math.max(len, 2000) : lenChave + 4, metade);
    c = g && caminhos(g);
    if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value as string);
    cache.set(chave, c);
  }
  return c;
}

/**
 * Desenha uma metade de coluna rachada. `desenhar` desenha a coluna inteira no referencial atual (é chamado duas
 * vezes, cada vez recortado por um lado da fratura).
 */
export function desenharColunaRachada(
  ctx: Ctx,
  desenhar: () => void,
  w: number,
  len: number,
  semente: number,
  cores: CoresRacha,
  metade: "cima" | "baixo",
) {
  const r = obter(semente, w, len, metade);
  if (!r) {
    desenhar();
    return;
  }
  const recortado = (recorte: Path2D) => {
    ctx.save();
    ctx.clip(recorte);
    desenhar();
    ctx.restore();
  };
  // os traços da racha usam junções redondas (sem pontas de mitra nos dentes); o desenho da coluna, não
  const tracos = () => {
    ctx.globalAlpha = 1;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };
  ctx.save();
  // o resto da coluna: desce na cunha e escorrega de lado
  ctx.translate(r.desloc, 0);
  // duas vezes: no retângulo (recorte barato) e na faixa da fratura
  recortado(r.retResto);
  recortado(r.faixaResto);
  tracos();
  ctx.fillStyle = cores.face;
  ctx.fill(r.face);
  ctx.strokeStyle = cores.borda;
  ctx.lineWidth = 1.2;
  ctx.stroke(r.trincasResto);
  ctx.lineWidth = 2;
  ctx.stroke(r.bordaResto);
  ctx.restore();

  // a ponta (encosta na passagem): fica no lugar
  ctx.save();
  recortado(r.regiaoPonta);
  tracos();
  ctx.strokeStyle = cores.luz;
  ctx.lineWidth = 1.5;
  ctx.stroke(r.labio);
  ctx.strokeStyle = cores.borda;
  ctx.lineWidth = 1.2;
  ctx.stroke(r.trincasPonta);
  ctx.lineWidth = 2;
  ctx.stroke(r.bordaPonta);
  ctx.restore();

  // lascas soltas
  ctx.save();
  ctx.translate(r.desloc, 0);
  tracos();
  ctx.fillStyle = cores.lasca;
  ctx.strokeStyle = cores.borda;
  ctx.lineWidth = 1.2;
  ctx.fill(r.lascas);
  ctx.stroke(r.lascas);
  ctx.restore();
}
