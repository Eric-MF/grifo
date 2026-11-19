// Estilos visuais do Flap Suitcase. Quase tudo é desenhado proceduralmente, para o jogo ser leve e para cada
// estilo poder mudar forma, cor e efeitos. O tema Pixel usa a arte 8-bit de arte8bit.ts, com desenho procedural de reserva.
//
// Para criar um estilo: copie um objeto de TEMAS_BASE, ajuste a paleta e, se quiser,
// sobrescreva `decor`, `coluna` ou `maleta`. Os cenários dos 8 estilos de fora dos grupos ficam em
// estilos/base-cenarios.ts (o catálogo junta cada um ao seu estilo, para themes.ts não depender do kit). Os estilos dos grupos (feriados, estados…) ficam em estilos/,
// um arquivo por estilo, e usam as peças de cenário exportadas aqui e em estilos/kit.ts.

import type { DataFesta } from "../calendario";
import { CENARIO, COLUNA, faixa, miniatura, pronta } from "./arte8bit";

export type Ctx = CanvasRenderingContext2D;

/** Linha do recorde e aviso de recorde quebrado: cada estilo tem os seus (ver recorde.ts). */
export interface MarcaRecorde {
  cor: string;
  traco: number[];
  largura: number;
  aviso: { texto: string; fonte: string; corTexto: string; corContorno: string; corFundo: string; anima: "pulsa" | "pisca" | "treme" };
}

export interface Paleta {
  ceu: [string, string][]; // [topo, horizonte] para amanhecer, dia, entardecer, noite
  longe: string[]; // colinas distantes por hora do dia
  perto: string[]; // silhuetas próximas por hora do dia
  chao: string;
  chaoLinha: string;
  coluna: { corpo: string; sombra: string; luz: string; contorno: string };
  maleta: { corpo: string; escuro: string; fivela: string; alca: string };
  asa: { cor: string; contorno: string };
  moeda: [string, string];
  particula: string[];
  recorde: MarcaRecorde;
  hud: string;
  estrelas: string;
  sprite?: string[]; // cores dos sprites de coluna: entram na paleta de encaixe do tema pixel
  neblina?: string; // véu do clima neblina (sem isso, branco a 18%)
}

export interface Tema {
  id: string;
  nome: string;
  descricao: string;
  paleta: Paleta;
  onda: OscillatorType;
  somBase: number;
  /** <1 renderiza em baixa resolução e amplia (estética pixel) */
  escala?: number;
  /** com `escala`: cores do buffer viram a paleta do tema, sem bordas intermediárias */
  semAntisserrilhado?: boolean;
  /** força clima */
  climaFixo?: Clima;
  /** grupo do menu (ver GRUPOS_ESTILOS em progressao.ts); sem grupo, o estilo fica na lista principal */
  grupo?: string;
  /** estilo datado: só fica à venda na semana do evento */
  janela?: DataFesta;
  /** fundo CSS da amostra de cor no seletor (os estilos antigos usam as regras de games.module.css) */
  amostra?: string;
  capitel?: "dorico" | "jonico" | "corintio" | "misto";
  /**
   * Cenário de fundo. `surpresa`, quando a surpresa do estilo está na tela, desenha-a ali mesmo: o cenário chama na
   * profundidade certa (atrás da mata da frente, da multidão…). Se não chamar, ela sai por cima do cenário todo.
   */
  decor?: (ctx: Ctx, w: number, h: number, off: number, tod: number, t: number, tema: Tema, surpresa?: () => void) => void;
  coluna?: (ctx: Ctx, w: number, len: number, variante: number, quebrada: boolean, tema: Tema, t: number) => void;
  maleta?: (ctx: Ctx, fase: number, t: number, tema: Tema) => void;
  chao?: (ctx: Ctx, w: number, h: number, y: number, off: number, tema: Tema, tod: number) => void;
  /** partícula do clima "folhas" (pétala, confete…), já posicionada e girada; `s` (0 a 1) varia de uma para outra. Sem isso, folhas de papel */
  folha?: (ctx: Ctx, s: number) => void;
  /**
   * Surpresa (easter egg) do estilo, desenhada no fundo, atrás das colunas, enquanto dura (ver surpresa.ts).
   * `f` vai de 0 (começo) a 1 (fim); `t` é o tempo do motor, para as animações.
   */
  surpresa?: (ctx: Ctx, w: number, h: number, f: number, t: number, tema: Tema) => void;
  /** Parte da surpresa desenhada na frente das colunas e do chão (os letreiros), para não ficar escondida. */
  surpresaFrente?: (ctx: Ctx, w: number, h: number, f: number, t: number, tema: Tema) => void;
}

export type Clima = "limpo" | "chuva" | "neve" | "folhas" | "tempestade" | "neblina";

// ---------------------------------------------------------------------------
// Utilidades de cor
// ---------------------------------------------------------------------------
export function hex(c: string): [number, number, number] {
  const v = c.replace("#", "");
  const n = parseInt(v.length === 3 ? v.split("").map((x) => x + x).join("") : v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mix(a: string, b: string, k: number) {
  const [r1, g1, b1] = hex(a);
  const [r2, g2, b2] = hex(b);
  const f = (x: number, y: number) => Math.round(x + (y - x) * k);
  return `rgb(${f(r1, r2)},${f(g1, g2)},${f(b1, b2)})`;
}
/** Interpola uma lista de 4 cores (ciclo do dia) em tod ∈ [0, 4). Só cores em hexadecimal: rgba() vira preto; para transparência, use globalAlpha. */
export function ciclo(cores: string[], tod: number) {
  const i = Math.floor(tod) % 4;
  return mix(cores[i], cores[(i + 1) % 4], tod - Math.floor(tod));
}
export const rr = (ctx: Ctx, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
};

// ---------------------------------------------------------------------------
// Peças de cenário reutilizáveis
// ---------------------------------------------------------------------------
export function colinas(ctx: Ctx, w: number, h: number, off: number, cor: string, alt: number, amp: number, freq: number, seed: number) {
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w + 20; x += 20) {
    const X = x + off;
    const y = h - alt - Math.sin(X * freq + seed) * amp - Math.sin(X * freq * 2.3 + seed * 2) * amp * 0.4;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}

export function templo(ctx: Ctx, x: number, base: number, s: number, cor: string) {
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(x - 6 * s, base - 40 * s);
  ctx.lineTo(x + 50 * s, base - 58 * s);
  ctx.lineTo(x + 106 * s, base - 40 * s);
  ctx.fill();
  ctx.fillRect(x - 6 * s, base - 40 * s, 112 * s, 6 * s);
  for (let i = 0; i < 6; i++) ctx.fillRect(x + i * 19 * s, base - 34 * s, 8 * s, 30 * s);
  ctx.fillRect(x - 10 * s, base - 4 * s, 120 * s, 4 * s);
}

export function nuvem(ctx: Ctx, x: number, y: number, s: number, cor: string) {
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.arc(x, y, 18 * s, 0, Math.PI * 2);
  ctx.arc(x + 20 * s, y - 10 * s, 22 * s, 0, Math.PI * 2);
  ctx.arc(x + 44 * s, y, 18 * s, 0, Math.PI * 2);
  ctx.rect(x, y, 44 * s, 18 * s);
  ctx.fill();
}

export function engrenagem(ctx: Ctx, x: number, y: number, r: number, dentes: number, ang: number, cor: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.fillStyle = cor;
  ctx.beginPath();
  for (let i = 0; i < dentes * 2; i++) {
    const a = (i / (dentes * 2)) * Math.PI * 2;
    const rad = i % 2 ? r : r * 1.18;
    ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Índice inteiro estável por posição no mundo (para variar tamanhos sem sortear a cada quadro): um hash de `k` e `primo`
 * em [0, n). Antes era `k · primo mod n`, uma progressão aritmética: os prédios saíam em escadinha (0, 8, 7, 6…) e
 * duas chamadas com o mesmo `k` ficavam amarradas uma à outra.
 */
export const variar = (k: number, primo: number, n: number) => {
  let x = Math.imul(Math.floor(k), 0x9e3779b1) ^ Math.imul(primo, 0x85ebca77);
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return ((x ^ (x >>> 16)) >>> 0) % n;
};

/** Montanhas em pico com neve no alto; `off` já vem com a velocidade da camada. */
export function montanhasNevadas(ctx: Ctx, w: number, base: number, off: number, cor: string, neve: string) {
  const esp = 260;
  for (let k = Math.floor(off / esp) - 1; k * esp - off < w + esp; k++) {
    const px = k * esp - off + esp / 2;
    const alt = 120 + variar(k, 7919, 5) * 28;
    const hb = esp * 0.7;
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.moveTo(px - hb, base);
    ctx.lineTo(px, base - alt);
    ctx.lineTo(px + hb, base);
    ctx.fill();
    const f = 0.32;
    const yc = base - alt * (1 - f);
    ctx.fillStyle = neve;
    ctx.beginPath();
    ctx.moveTo(px, base - alt);
    ctx.lineTo(px + hb * f, yc);
    ctx.lineTo(px + hb * f * 0.45, yc - alt * 0.05);
    ctx.lineTo(px + hb * f * 0.05, yc + alt * 0.03);
    ctx.lineTo(px - hb * f * 0.5, yc - alt * 0.06);
    ctx.lineTo(px - hb * f, yc);
    ctx.fill();
  }
}

/** Pinheiro de três andares, com neve no alto de cada andar. */
export function pinheiro(ctx: Ctx, x: number, base: number, s: number, cor: string, neve: string) {
  ctx.fillStyle = cor;
  ctx.fillRect(x - 3 * s, base - 12 * s, 6 * s, 12 * s);
  for (let i = 0; i < 3; i++) {
    const yb = base - 10 * s - i * 18 * s;
    const larg = (26 - i * 6) * s;
    const alt = 26 * s;
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.moveTo(x - larg, yb);
    ctx.lineTo(x, yb - alt);
    ctx.lineTo(x + larg, yb);
    ctx.fill();
    const f = 0.55;
    const yc = yb - alt * (1 - f);
    ctx.fillStyle = neve;
    ctx.beginPath();
    ctx.moveTo(x, yb - alt);
    ctx.lineTo(x + larg * f, yc);
    ctx.lineTo(x + larg * f * 0.5, yc - 2.5 * s);
    ctx.lineTo(x + larg * f * 0.1, yc + 1.5 * s);
    ctx.lineTo(x - larg * f * 0.35, yc - 2.5 * s);
    ctx.lineTo(x - larg * f, yc);
    ctx.fill();
  }
}

/** Faixas de aurora ondulando no alto do céu; `k` é o quanto já é noite (0 a 1). */
export function aurora(ctx: Ctx, w: number, h: number, t: number, k: number) {
  const cores = ["#5cf2b0", "#4fd4e8", "#a08cff"];
  for (let i = 0; i < 3; i++) {
    const y0 = h * 0.1 + i * 26;
    const onda = (x: number) => Math.sin(x * 0.006 + t * 0.5 + i * 1.3) * 22;
    ctx.globalAlpha = k * (0.32 - i * 0.07);
    ctx.fillStyle = cores[i];
    ctx.beginPath();
    for (let x = 0; x <= w; x += 16) ctx.lineTo(x, y0 + onda(x));
    for (let x = w; x >= 0; x -= 16) ctx.lineTo(x, y0 + 46 + onda(x) + Math.sin(x * 0.03 + t * 1.7) * 6);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export const VITRAIS = ["#f0b040", "#c83a4a", "#4a7ad8"];

/** Contorno de um arco ogival (janela gótica): (x, y) é o canto de baixo à esquerda. */
export function ogiva(ctx: Ctx, x: number, y: number, larg: number, alt: number) {
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - alt + larg * 0.8);
  ctx.quadraticCurveTo(x, y - alt + larg * 0.15, x + larg / 2, y - alt);
  ctx.quadraticCurveTo(x + larg, y - alt + larg * 0.15, x + larg, y - alt + larg * 0.8);
  ctx.lineTo(x + larg, y);
  ctx.closePath();
}

/** Catedral em silhueta: duas torres com flecha, nave, rosácea e vitrais acesos. */
export function catedral(ctx: Ctx, x: number, base: number, cor: string, t: number) {
  ctx.fillStyle = cor;
  ctx.beginPath();
  for (const tx of [x, x + 170]) {
    ctx.rect(tx, base - 200, 50, 200);
    ctx.moveTo(tx - 4, base - 200);
    ctx.lineTo(tx + 25, base - 290);
    ctx.lineTo(tx + 54, base - 200);
    ctx.closePath();
    for (const px of [tx - 2, tx + 46]) {
      ctx.moveTo(px, base - 200);
      ctx.lineTo(px + 3, base - 222);
      ctx.lineTo(px + 6, base - 200);
      ctx.closePath();
    }
  }
  ctx.rect(x + 50, base - 140, 120, 140);
  ctx.moveTo(x + 50, base - 140);
  ctx.lineTo(x + 110, base - 186);
  ctx.lineTo(x + 170, base - 140);
  ctx.closePath();
  ctx.fill();
  const janelas = [
    [x + 15, base - 120, 20, 50],
    [x + 185, base - 120, 20, 50],
    [x + 62, base - 20, 16, 56],
    [x + 102, base - 20, 16, 64],
    [x + 142, base - 20, 16, 56],
  ];
  janelas.forEach(([jx, jy, jl, ja], i) => {
    ctx.globalAlpha = 0.7 + 0.2 * Math.sin(t * 2.3 + i * 1.7);
    ctx.fillStyle = VITRAIS[i % 3];
    ctx.beginPath();
    ogiva(ctx, jx, jy, jl, ja);
    ctx.fill();
  });
  // rosácea
  const [rx, ry] = [x + 110, base - 112];
  const g = ctx.createRadialGradient(rx, ry, 2, rx, ry, 18);
  g.addColorStop(0, "#ffe9a8");
  g.addColorStop(0.5, "#c83a4a");
  g.addColorStop(1, "#4a3a9a");
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(rx, ry, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // a pedra cruza os vitrais: raios da rosácea e o pilar do meio de cada janela
  ctx.strokeStyle = cor;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx + Math.cos(a) * 18, ry + Math.sin(a) * 18);
  }
  for (const [jx, jy, jl, ja] of janelas) {
    ctx.moveTo(jx + jl / 2, jy);
    ctx.lineTo(jx + jl / 2, jy - ja + jl * 0.5);
  }
  ctx.stroke();
}

/** Morcego em silhueta; `bate` (−1 a 1) levanta e abaixa as asas. */
export function morcego(ctx: Ctx, x: number, y: number, s: number, bate: number) {
  const asa = bate * 5 * s;
  ctx.beginPath();
  ctx.ellipse(x, y, 2.6 * s, 3.6 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  for (const l of [-1, 1]) {
    ctx.moveTo(x + l * 2 * s, y - s);
    ctx.lineTo(x + l * 9 * s, y - 4 * s - asa);
    ctx.lineTo(x + l * 15 * s, y - s - asa * 0.6);
    ctx.quadraticCurveTo(x + l * 12 * s, y + 0.5 * s, x + l * 10 * s, y + 3 * s - asa * 0.2);
    ctx.quadraticCurveTo(x + l * 7 * s, y + 0.5 * s, x + l * 5.5 * s, y + 3.5 * s);
    ctx.quadraticCurveTo(x + l * 4 * s, y + s, x + l * 2 * s, y + 2 * s);
    ctx.closePath();
  }
  ctx.fill();
}

/** Neblina rente ao chão: tufos achatados e esfumados (sem borda), que deslizam devagar. `alt` é a altura da faixa. */
export function faixaNeblina(ctx: Ctx, w: number, y: number, alt: number, desloc: number) {
  const r = alt * 2.4;
  const esp = r * 1.3;
  ctx.save();
  ctx.translate(0, y);
  ctx.scale(1, alt / (2 * r));
  for (let k = Math.floor(desloc / esp) - 1; k * esp - desloc < w + esp; k++) {
    const x = k * esp - desloc;
    const dy = (variar(k, 31, 5) - 2) * r * 0.15;
    const g = ctx.createRadialGradient(x, dy, 0, x, dy, r);
    g.addColorStop(0, "rgba(200,190,230,0.17)");
    g.addColorStop(1, "rgba(200,190,230,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, dy - r, 2 * r, 2 * r);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Coluna grega padrão (desenhada a partir da ponta voltada para o vão, em y=0,
// crescendo para +y). O engine espelha a de cima.
// ---------------------------------------------------------------------------
/** Altura do capitel, em unidades lógicas: a faixa do topo da coluna que o fuste não ocupa (0 se a coluna está quebrada). */
export function alturaCapitel(variante: number, quebrada: boolean, tema: Tema): number {
  const ordem = tema.capitel === "misto" || !tema.capitel ? (["dorico", "jonico", "corintio"] as const)[variante % 3] : tema.capitel;
  return quebrada ? 0 : ordem === "dorico" ? 16 : ordem === "jonico" ? 20 : 26;
}

export function colunaGrega(ctx: Ctx, w: number, len: number, variante: number, quebrada: boolean, tema: Tema) {
  const c = tema.paleta.coluna;
  const ordem = tema.capitel === "misto" || !tema.capitel ? (["dorico", "jonico", "corintio"] as const)[variante % 3] : tema.capitel;
  const capH = alturaCapitel(variante, quebrada, tema);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = c.contorno;

  // fuste com caneluras
  const x0 = -w / 2;
  ctx.fillStyle = c.corpo;
  ctx.fillRect(x0, capH, w, len - capH);
  const n = 6;
  for (let i = 0; i < n; i++) {
    const fx = x0 + (i + 0.5) * (w / n);
    ctx.fillStyle = i % 2 ? c.sombra : c.luz;
    ctx.fillRect(fx - w / n / 4, capH + 2, w / n / 2, len - capH);
  }
  ctx.fillStyle = c.sombra;
  ctx.fillRect(x0 + w - 6, capH, 6, len - capH);
  ctx.strokeRect(x0, capH, w, len - capH);

  if (quebrada) {
    // ponta quebrada (ruína)
    ctx.fillStyle = c.corpo;
    ctx.beginPath();
    ctx.moveTo(x0, 14);
    ctx.lineTo(x0 + w * 0.2, 4);
    ctx.lineTo(x0 + w * 0.38, 12);
    ctx.lineTo(x0 + w * 0.6, 0);
    ctx.lineTo(x0 + w * 0.8, 9);
    ctx.lineTo(x0 + w, 3);
    ctx.lineTo(x0 + w, 16);
    ctx.lineTo(x0, 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    return;
  }

  // capitel
  const aw = w * 1.3;
  ctx.fillStyle = c.luz;
  rr(ctx, -aw / 2, 0, aw, 8, 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = c.corpo;
  if (ordem === "dorico") {
    ctx.beginPath();
    ctx.moveTo(-aw / 2 + 4, 8);
    ctx.lineTo(aw / 2 - 4, 8);
    ctx.lineTo(w / 2, capH);
    ctx.lineTo(-w / 2, capH);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (ordem === "jonico") {
    ctx.fillRect(-w / 2 - 2, 8, w + 4, capH - 8);
    ctx.strokeRect(-w / 2 - 2, 8, w + 4, capH - 8);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(s * (w / 2 + 2), 14, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s * (w / 2 + 2), 14, 3, 0, Math.PI * 1.6);
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(-aw / 2 + 2, 8);
    ctx.lineTo(aw / 2 - 2, 8);
    ctx.lineTo(w / 2 + 2, capH);
    ctx.lineTo(-w / 2 - 2, capH);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = c.sombra;
    for (let i = 0; i < 5; i++) {
      const lx = -w / 2 + (i + 0.5) * (w / 5);
      ctx.beginPath();
      ctx.ellipse(lx, capH - 6, 5, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = c.sombra;
  ctx.fillRect(-w / 2, capH, w, 3);
}

// ---------------------------------------------------------------------------
// Maleta padrão (centrada em 0,0; ~46×34)
// ---------------------------------------------------------------------------
export type EstiloAsa = "penas" | "neon" | "mecanica" | "tinta" | "morcego";

export function asas(ctx: Ctx, fase: number, tema: Tema, estilo: EstiloAsa = "penas") {
  const a = tema.paleta.asa;
  const ang = Math.sin(fase) * 0.7;
  for (const lado of [-1, 1]) {
    ctx.save();
    ctx.translate(lado * 14, -8);
    ctx.scale(lado, 1);
    ctx.rotate(-0.35 - ang * 0.6);
    ctx.lineWidth = estilo === "neon" ? 2 : 1.4;
    ctx.strokeStyle = a.contorno;
    if (estilo === "morcego") {
      // membrana: braço até o pulso, três dedos e a borda recortada em arcos entre eles
      ctx.fillStyle = a.cor;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(16, -18);
      ctx.lineTo(36, -21);
      ctx.quadraticCurveTo(28, -14, 32, -6);
      ctx.quadraticCurveTo(24, -6, 22, 2);
      ctx.quadraticCurveTo(13, -2, 4, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(16, -18);
      ctx.lineTo(32, -6);
      ctx.moveTo(16, -18);
      ctx.lineTo(22, 2);
      ctx.stroke();
      ctx.restore();
      continue;
    }
    ctx.fillStyle = estilo === "neon" ? "transparent" : a.cor;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      const L = 34 - i * 5;
      ctx.ellipse(10 + i * 3, -6 - i * 5, L * 0.55, 6, -0.5 - i * 0.18, 0, Math.PI * 2);
      if (estilo !== "neon") ctx.fill();
      ctx.stroke();
      if (estilo === "mecanica") {
        ctx.beginPath();
        ctx.arc(2, -2, 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

export function maletaPadrao(ctx: Ctx, fase: number, t: number, tema: Tema, extras?: (ctx: Ctx) => void, estiloAsa?: EstiloAsa) {
  const m = tema.paleta.maleta;
  asas(ctx, fase, tema, estiloAsa);
  // alça
  ctx.strokeStyle = m.alca;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(-8, -24, 16, 10, 5);
  ctx.stroke();
  // corpo
  ctx.fillStyle = m.corpo;
  ctx.strokeStyle = m.escuro;
  ctx.lineWidth = 2;
  rr(ctx, -23, -16, 46, 32, 6);
  ctx.fill();
  ctx.stroke();
  // aba
  ctx.fillStyle = m.escuro;
  rr(ctx, -23, -16, 46, 11, 6);
  ctx.globalAlpha = 0.35;
  ctx.fill();
  ctx.globalAlpha = 1;
  // costuras e tiras
  ctx.strokeStyle = m.escuro;
  ctx.lineWidth = 3;
  for (const x of [-12, 12]) {
    ctx.beginPath();
    ctx.moveTo(x, -16);
    ctx.lineTo(x, 8);
    ctx.stroke();
  }
  // fivelas e fecho
  ctx.fillStyle = m.fivela;
  for (const x of [-12, 12]) ctx.fillRect(x - 3.5, 2, 7, 6);
  rr(ctx, -4, -8, 8, 7, 2);
  ctx.fill();
  extras?.(ctx);
}

// ---------------------------------------------------------------------------
// Temas
// ---------------------------------------------------------------------------
const CLASSICO: Tema = {
  id: "classico",
  nome: "Clássico",
  descricao: "Mármore, mar Egeu e a Acrópole ao fundo.",
  onda: "triangle",
  somBase: 440,
  capitel: "misto",
  paleta: {
    ceu: [["#f3a86b", "#fbd9a8"], ["#4f9fe0", "#bfe3fb"], ["#3b4f8f", "#f0915a"], ["#07142e", "#1d3a6b"]],
    longe: ["#c9a98a", "#8fb3c9", "#6d5a7c", "#12223f"],
    perto: ["#a98c6c", "#6f97a8", "#4d3f5e", "#0b1830"],
    chao: "#e8dcc4",
    chaoLinha: "#c9b48c",
    coluna: { corpo: "#efe6d6", sombra: "#d3c6ad", luz: "#fbf6ec", contorno: "#a8977a" },
    maleta: { corpo: "#b8742e", escuro: "#7a4617", fivela: "#e8c35a", alca: "#6b3d14" },
    asa: { cor: "#ffffff", contorno: "#b9c7d6" },
    moeda: ["#f3c44f", "#b8860b"],
    particula: ["#ffffff", "#f3c44f", "#d9c9a8"],
    recorde: {
      cor: "#2b4f7e", traco: [], largura: 3,
      aviso: { texto: "NOVO RECORDE!", fonte: "700 30px Georgia, serif", corTexto: "#2b4f7e", corContorno: "#fff7e0", corFundo: "rgba(255,247,224,0.92)", anima: "pulsa" },
    },
    hud: "#03112c",
    estrelas: "#ffffff",
  },
};

const FOFO: Tema = {
  id: "fofo",
  nome: "Fofo",
  descricao: "Tons pastel, nuvens de algodão e uma maleta sorridente.",
  onda: "sine",
  somBase: 660,
  capitel: "jonico",
  paleta: {
    ceu: [["#ffc6d9", "#fff0f5"], ["#a8dcff", "#e9f7ff"], ["#ffb3c7", "#ffe3b3"], ["#4b3f8f", "#9d84d6"]],
    longe: ["#ffd6e8", "#c8f0dc", "#f7c6e0", "#6d5fb0"],
    perto: ["#ffb8d4", "#9fe3c0", "#eaa6cf", "#584a9c"],
    chao: "#b8f0cf",
    chaoLinha: "#86d9ad",
    coluna: { corpo: "#ffe1ee", sombra: "#ffc2da", luz: "#ffffff", contorno: "#e59ab9" },
    maleta: { corpo: "#ff8fb8", escuro: "#d45f8d", fivela: "#fff1a8", alca: "#c24f7c" },
    asa: { cor: "#ffffff", contorno: "#ffc2da" },
    moeda: ["#ffe27a", "#f7a8c4"],
    particula: ["#ff8fb8", "#ffe27a", "#a8dcff", "#ffffff"],
    recorde: {
      cor: "#ff5fa2", traco: [10, 6], largura: 3.5,
      aviso: { texto: "NOVO RECORDE!", fonte: "900 30px system-ui, sans-serif", corTexto: "#ff3d8b", corContorno: "#ffffff", corFundo: "rgba(255,255,255,0.9)", anima: "pulsa" },
    },
    hud: "#8a3a63",
    estrelas: "#fff6a8",
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    colunaGrega(ctx, w, len, variante, quebrada, tema);
    // listras de bala: começam logo abaixo do capitel, sem faixa lisa entre ele e a primeira listra
    const capH = alturaCapitel(variante, quebrada, tema);
    ctx.save();
    ctx.beginPath();
    ctx.rect(-w / 2, capH, w, len - capH);
    ctx.clip();
    // base da listra encostada no capitel: a diagonal deixa um vão nas bordas, que esta faixa fecha
    ctx.fillStyle = "rgba(255,143,184,0.35)";
    ctx.fillRect(-w / 2, capH, w, 6);
    ctx.strokeStyle = "rgba(255,143,184,0.35)";
    ctx.lineWidth = 7;
    for (let y = 20; y < len + w; y += 22) {
      ctx.beginPath();
      ctx.moveTo(-w / 2, y);
      ctx.lineTo(w / 2, y - w * 0.5);
      ctx.stroke();
    }
    ctx.restore();
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => {
      const pisca = Math.sin(t * 2.3) > 0.97;
      c.fillStyle = "#3a2140";
      for (const x of [-8, 8]) {
        c.beginPath();
        if (pisca) c.rect(x - 3, 3, 6, 1.5);
        else c.arc(x, 4, 2.6, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = "rgba(255,90,140,0.5)";
      for (const x of [-15, 15]) {
        c.beginPath();
        c.ellipse(x, 9, 4, 2.5, 0, 0, Math.PI * 2);
        c.fill();
      }
      c.strokeStyle = "#3a2140";
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(0, 8, 3.5, 0.15 * Math.PI, 0.85 * Math.PI);
      c.stroke();
    });
  },
};

const RETRO: Tema = {
  id: "retro",
  nome: "Retrofuturista",
  descricao: "Synthwave: sol listrado, grade neon e colunas de luz.",
  onda: "sawtooth",
  somBase: 330,
  capitel: "dorico",
  paleta: {
    ceu: [["#2b0b4f", "#ff5ea8"], ["#1b0b40", "#ff8a3d"], ["#140630", "#ff3f8e"], ["#05010f", "#3a0b5e"]],
    longe: ["#3b0f63", "#401066", "#2c0a4a", "#150426"],
    perto: ["#1a0633", "#1c0738", "#12042a", "#07010f"],
    chao: "#0b0118",
    chaoLinha: "#ff3fd1",
    coluna: { corpo: "#12052b", sombra: "#1d0a40", luz: "#2a0f5c", contorno: "#27e0ff" },
    maleta: { corpo: "#c8d3e6", escuro: "#6c3bd6", fivela: "#27e0ff", alca: "#ff3fd1" },
    asa: { cor: "#27e0ff", contorno: "#27e0ff" },
    moeda: ["#fff36b", "#ff3fd1"],
    particula: ["#27e0ff", "#ff3fd1", "#fff36b"],
    recorde: {
      cor: "#27e0ff", traco: [4, 5], largura: 3,
      aviso: { texto: "RECORDE!!", fonte: "900 28px monospace", corTexto: "#27e0ff", corContorno: "#ff3fd1", corFundo: "rgba(3,17,44,0.88)", anima: "pisca" },
    },
    hud: "#ffffff",
    estrelas: "#ffffff",
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    colunaGrega(ctx, w, len, variante, quebrada, tema);
    // brilho neon (traço largo translúcido + traço fino)
    ctx.strokeStyle = variante % 2 ? "#ff3fd1" : "#27e0ff";
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 8;
    ctx.strokeRect(-w / 2, 0, w, len);
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2, 0, w, len);
  },
  maleta(ctx, fase, t, tema) {
    // rastro de propulsor
    ctx.fillStyle = "rgba(255,63,209,0.55)";
    ctx.beginPath();
    ctx.moveTo(-23, 6);
    ctx.lineTo(-40 - Math.random() * 12, 10);
    ctx.lineTo(-23, 14);
    ctx.fill();
    maletaPadrao(ctx, fase, t, tema, (c) => {
      c.strokeStyle = "#27e0ff";
      c.lineWidth = 1.5;
      c.strokeRect(-20, -13, 40, 26);
    }, "neon");
  },
};

const STEAMPUNK: Tema = {
  id: "steampunk",
  nome: "Steampunk",
  descricao: "Latão, engrenagens girando e vapor por todo lado.",
  onda: "triangle",
  somBase: 220,
  capitel: "corintio",
  paleta: {
    ceu: [["#6b4a2b", "#d9a066"], ["#8a6a45", "#e8c79a"], ["#5a3522", "#d97a3d"], ["#1f140c", "#4a3320"]],
    longe: ["#5a4230", "#6e5540", "#4a2f20", "#1a110a"],
    perto: ["#3d2b1e", "#4a3727", "#33201a", "#0f0a06"],
    chao: "#3a2a1c",
    chaoLinha: "#b5863a",
    coluna: { corpo: "#b5863a", sombra: "#8a5f22", luz: "#e0b766", contorno: "#5a3a12" },
    maleta: { corpo: "#6b4226", escuro: "#3d2412", fivela: "#d9a441", alca: "#2a1a0d" },
    asa: { cor: "#c98b4a", contorno: "#6b4226" },
    moeda: ["#e0b766", "#8a5f22"],
    particula: ["#d9d2c5", "#b5863a", "#8a8178"],
    recorde: {
      cor: "#b5863a", traco: [14, 4, 3, 4], largura: 3.5,
      aviso: { texto: "NOVO RECORDE", fonte: "700 28px Georgia, serif", corTexto: "#f3e3b5", corContorno: "#3b2a1a", corFundo: "rgba(59,42,26,0.92)", anima: "treme" },
    },
    hud: "#2a1a0d",
    estrelas: "#f0d9a8",
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    g.addColorStop(0, c.sombra);
    g.addColorStop(0.35, c.luz);
    g.addColorStop(1, c.sombra);
    ctx.fillStyle = g;
    ctx.fillRect(-w / 2, 18, w, len);
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2, 18, w, len);
    // anéis com rebites
    for (let y = 60; y < len; y += 90) {
      ctx.fillStyle = c.sombra;
      ctx.fillRect(-w / 2 - 4, y, w + 8, 10);
      ctx.fillStyle = "#f0d9a8";
      for (let x = -w / 2; x <= w / 2; x += w / 4) {
        ctx.beginPath();
        ctx.arc(x, y + 5, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // flange + engrenagem na ponta
    ctx.fillStyle = c.corpo;
    ctx.fillRect(-w / 2 - 8, 0, w + 16, 18);
    ctx.strokeRect(-w / 2 - 8, 0, w + 16, 18);
    if (!quebrada) engrenagem(ctx, 0, 9, 13, 8, variante, "#5a3a12");
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => {
      engrenagem(c, 14, 8, 5, 7, t * 3, "#d9a441");
      c.fillStyle = "#2a1a0d";
      c.fillRect(-20, -3, 16, 5);
      c.fillStyle = "#9fe0f0";
      for (const x of [-16, -8]) {
        c.beginPath();
        c.arc(x, -1, 3, 0, Math.PI * 2);
        c.fill();
      }
    }, "mecanica");
  },
};

/** Medidas da coluna pixel, em células do sprite (scripts/processar-8bit.mjs imprime a geometria). */
const GEOMETRIA_COLUNA = { capitel: 7, base: 60, fim: 66 };

/** Coluna em coordenadas locais: capitel em y = 0, fuste esticado, base em y = len. */
function desenharColunaSprite(c: Ctx, w: number, len: number, img: HTMLImageElement, g: { capitel: number; base: number; fim: number }) {
  const sw = img.naturalWidth;
  const s = w / sw;
  const dCapitel = g.capitel * s;
  const dBase = (g.fim - g.base) * s;
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = "high";
  if (len < dCapitel + dBase) c.drawImage(img, 0, 0, sw, g.fim, -w / 2, 0, w, len);
  else {
    c.drawImage(img, 0, 0, sw, g.capitel, -w / 2, 0, w, dCapitel);
    c.drawImage(img, 0, g.capitel, sw, g.base - g.capitel, -w / 2, dCapitel, w, len - dCapitel - dBase);
    c.drawImage(img, 0, g.base, sw, g.fim - g.base, -w / 2, len - dBase, w, dBase);
  }
  c.imageSmoothingEnabled = false;
}

const PIXEL: Tema = {
  id: "pixel",
  nome: "Pixel 8-bit",
  descricao: "Resolução baixa e cores de console antigo.",
  onda: "square",
  somBase: 523,
  escala: 0.34,
  semAntisserrilhado: false,
  capitel: "dorico",
  paleta: {
    ceu: [["#f8b878", "#fce0a8"], ["#5c94fc", "#a4e4fc"], ["#d82800", "#fca044"], ["#000000", "#0000a8"]],
    longe: ["#e45c10", "#00a800", "#a81000", "#000080"],
    perto: ["#ac7c00", "#008800", "#881400", "#000058"],
    chao: "#c84c0c",
    chaoLinha: "#fcbcb0",
    coluna: { corpo: "#fcfcfc", sombra: "#bcbcbc", luz: "#fcfcfc", contorno: "#000000" },
    maleta: { corpo: "#c84c0c", escuro: "#7c0800", fivela: "#fcd8a8", alca: "#000000" },
    asa: { cor: "#fcfcfc", contorno: "#000000" },
    moeda: ["#fca044", "#c84c0c"],
    particula: ["#fcfcfc", "#fca044", "#5c94fc"],
    recorde: {
      cor: "#fca044", traco: [6, 6], largura: 3,
      aviso: { texto: "RECORDE!", fonte: "bold 26px monospace", corTexto: "#fca044", corContorno: "#1a1a2e", corFundo: "#1a1a2e", anima: "pisca" },
    },
    hud: "#000000",
    estrelas: "#fcfcfc",
    sprite: ["#f0e0c0", "#e0d0b0", "#d0b080", "#c09070"],
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const img = quebrada ? COLUNA.rachada : COLUNA.normal;
    if (!pronta(img)) return colunaGrega(ctx, w, len, variante, quebrada, tema);
    desenharColunaSprite(ctx, w, len, img, GEOMETRIA_COLUNA);
  },
  // Camadas de parallax, da mais distante para a mais próxima. Com a noite, o céu some (aparecem as estrelas)
  // e as camadas escurecem.
  decor(ctx, w, h, off, dia) {
    if (!pronta(CENARIO.ceu)) return;
    const noite = Math.max(0, 1 - Math.abs(dia - 3) * 1.4);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.globalAlpha = 1 - noite;
    faixa(ctx, miniatura(CENARIO.ceu), off * 0.02, 0, h, w);
    ctx.globalAlpha = 1;
    // as montanhas sobem para os picos aparecerem acima das colinas (que são opacas até embaixo)
    for (const [img, velocidade, subida] of [[CENARIO.montanhas, 0.08, 0.22], [CENARIO.colinas, 0.2, 0], [CENARIO.campos, 0.35, 0]] as const) {
      if (pronta(img)) faixa(ctx, miniatura(img), off * velocidade, -subida * h, h, w);
    }
    if (noite > 0) {
      ctx.fillStyle = `rgb(0 8 40 / ${0.5 * noite})`;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.imageSmoothingEnabled = false;
  },
  // Faixa do chão: a mesma velocidade das colunas, sem costura à vista.
  chao(ctx, w, h, y, off, tema) {
    if (!pronta(CENARIO.chao)) {
      ctx.fillStyle = tema.paleta.chao;
      ctx.fillRect(0, y, w, h - y);
      return;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    faixa(ctx, miniatura(CENARIO.chao), off, y, h - y, w);
    ctx.imageSmoothingEnabled = false;
  },
};

const NOIR: Tema = {
  id: "noir",
  nome: "Noir Tribunal",
  descricao: "Preto e branco, chuva constante e luz de refletor.",
  onda: "sine",
  somBase: 196,
  climaFixo: "chuva",
  capitel: "dorico",
  paleta: {
    ceu: [["#2a2a2a", "#555555"], ["#3a3a3a", "#707070"], ["#222222", "#4a4a4a"], ["#050505", "#1c1c1c"]],
    longe: ["#1e1e1e", "#2a2a2a", "#191919", "#0a0a0a"],
    perto: ["#111111", "#161616", "#0d0d0d", "#000000"],
    chao: "#141414",
    chaoLinha: "#3a3a3a",
    coluna: { corpo: "#3c3c3c", sombra: "#262626", luz: "#6a6a6a", contorno: "#c8c8c8" },
    maleta: { corpo: "#1c1c1c", escuro: "#000000", fivela: "#d8d8d8", alca: "#000000" },
    asa: { cor: "#e8e8e8", contorno: "#8a8a8a" },
    moeda: ["#e0e0e0", "#7a7a7a"],
    particula: ["#dddddd", "#9a9a9a"],
    recorde: {
      cor: "#e6e6e6", traco: [2, 5], largura: 2.5,
      aviso: { texto: "NOVO RECORDE", fonte: "700 28px Georgia, serif", corTexto: "#f2f2f2", corContorno: "#000000", corFundo: "rgba(0,0,0,0.82)", anima: "pulsa" },
    },
    hud: "#ffffff",
    estrelas: "#bbbbbb",
  },
};

const PAPIRO: Tema = {
  id: "papiro",
  nome: "Papiro",
  descricao: "Tudo desenhado a nanquim sobre pergaminho, com parágrafos voando.",
  onda: "triangle",
  somBase: 392,
  climaFixo: "folhas",
  capitel: "jonico",
  paleta: {
    ceu: [["#efe0bd", "#f7ecd2"], ["#f1e4c6", "#faf3e0"], ["#e8d3a8", "#f3e2bf"], ["#b9a47c", "#d6c49b"]],
    longe: ["#d9c69d", "#dccaa3", "#cdb68a", "#9c8762"],
    perto: ["#c7b084", "#cbb58b", "#baa073", "#85704d"],
    chao: "#dcc79c",
    chaoLinha: "#3b2a1a",
    coluna: { corpo: "#f4e8cc", sombra: "#e3d2ab", luz: "#fbf4e2", contorno: "#3b2a1a" },
    maleta: { corpo: "#f4e8cc", escuro: "#3b2a1a", fivela: "#3b2a1a", alca: "#3b2a1a" },
    asa: { cor: "#fbf4e2", contorno: "#3b2a1a" },
    moeda: ["#f4e8cc", "#3b2a1a"],
    particula: ["#3b2a1a", "#7a5c3a"],
    recorde: {
      cor: "#7a5c3a", traco: [16, 6], largura: 3,
      aviso: { texto: "NOVO RECORDE!", fonte: "700 30px Georgia, serif", corTexto: "#5a3e1f", corContorno: "#f5e6c0", corFundo: "rgba(245,230,192,0.94)", anima: "pulsa" },
    },
    hud: "#3b2a1a",
    estrelas: "#3b2a1a",
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => {
      c.strokeStyle = "#3b2a1a";
      c.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.moveTo(-20 + i * 3, 14);
        c.lineTo(-10 + i * 3, 4);
        c.stroke();
      }
    }, "tinta");
  },
};

const RECESSO: Tema = {
  id: "recesso",
  nome: "Recesso Forense",
  descricao: "Prazos suspensos: neve sem parar, colunas de gelo e aurora à noite.",
  onda: "sine",
  somBase: 784,
  climaFixo: "neve",
  capitel: "jonico",
  paleta: {
    // azuis médios: os flocos brancos precisam aparecer no céu
    ceu: [["#7f9fd6", "#f2c9d6"], ["#5f9ad8", "#cfe4f6"], ["#6a6fb8", "#e3b4c8"], ["#0b1a3a", "#24427a"]],
    longe: ["#9aaad0", "#8fb0d6", "#8a86b8", "#1c2f5a"],
    perto: ["#3f6b6a", "#2f6b5a", "#3d4f6e", "#0c1e2e"],
    chao: "#eef4fb",
    chaoLinha: "#b9cde3",
    coluna: { corpo: "#dceefa", sombra: "#a9cbe6", luz: "#ffffff", contorno: "#3f6f9e" },
    maleta: { corpo: "#a8432f", escuro: "#5e1f16", fivela: "#efe0b4", alca: "#4a1a12" },
    asa: { cor: "#ffffff", contorno: "#7fa6cf" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: ["#ffffff", "#d6e9fb", "#9cc3ea"],
    recorde: {
      cor: "#3d8fd6", traco: [12, 4, 2, 4], largura: 3,
      aviso: { texto: "NOVO RECORDE!", fonte: "800 28px system-ui, sans-serif", corTexto: "#ffffff", corContorno: "#1d5a99", corFundo: "rgba(29,90,153,0.88)", anima: "treme" },
    },
    hud: "#0d2a4a",
    estrelas: "#ffffff",
  },
  chao(ctx, w, h, y, off, tema) {
    const p = tema.paleta;
    ctx.fillStyle = p.chao;
    ctx.fillRect(0, y, w, h - y);
    // montinhos de neve na borda, na velocidade das colunas
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    for (let x = -(off % 56) - 28; x < w + 56; x += 56) {
      ctx.moveTo(x + 34, y + 3);
      ctx.ellipse(x, y + 3, 34, 7, 0, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.fillStyle = p.chaoLinha;
    for (let x = -(off % 56); x < w; x += 56) ctx.fillRect(x + 6, y + 16, 22, 2);
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    colunaGrega(ctx, w, len, variante, quebrada, tema);
    const capH = alturaCapitel(variante, quebrada, tema);
    // reflexos do gelo no fuste
    ctx.save();
    ctx.beginPath();
    ctx.rect(-w / 2, capH, w, len - capH);
    ctx.clip();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    for (let y = capH + 30 + variante * 25; y < len + w; y += 170) {
      ctx.moveTo(-w / 2, y + 18);
      ctx.lineTo(w / 2, y - 22);
      ctx.lineTo(w / 2, y - 12);
      ctx.lineTo(-w / 2, y + 28);
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
    if (quebrada) return;
    // o motor espelha a coluna de cima: lá a ponta fica para baixo e ganha pingentes; a de baixo ganha neve
    const deCima = ctx.getTransform().d < 0;
    const aw = w * 1.3;
    ctx.strokeStyle = tema.paleta.coluna.contorno;
    ctx.lineWidth = 1;
    if (deCima) {
      ctx.fillStyle = "rgba(225,242,255,0.92)";
      ctx.beginPath();
      const n = 8;
      for (let i = 0; i < n; i++) {
        const x = -aw / 2 + 5 + (i * (aw - 10)) / (n - 1);
        const L = 5 + variar(i * 7 + variante * 3, 1, 5) * 1.6;
        ctx.moveTo(x - 2.6, 0.5);
        ctx.lineTo(x, -L);
        ctx.lineTo(x + 2.6, 0.5);
        ctx.closePath();
      }
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = "#f8fbff";
      ctx.beginPath();
      ctx.moveTo(-aw / 2 - 2, 5);
      const n = 5;
      for (let i = 0; i < n; i++) {
        const x0 = -aw / 2 - 2 + (i * (aw + 4)) / n;
        const x1 = -aw / 2 - 2 + ((i + 1) * (aw + 4)) / n;
        ctx.quadraticCurveTo((x0 + x1) / 2, -7 - variar(i + variante, 3, 3), x1, i === n - 1 ? 5 : -1);
      }
      // a neve escorre um pouco pelas bordas do ábaco
      ctx.quadraticCurveTo(aw / 2 + 3, 9, aw / 2 - 1, 9);
      ctx.lineTo(-aw / 2 + 1, 9);
      ctx.quadraticCurveTo(-aw / 2 - 3, 9, -aw / 2 - 2, 5);
      ctx.fill();
      ctx.strokeStyle = "#b9cde3";
      ctx.stroke();
    }
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => {
      // cachecol listrado: a volta na tampa e a ponta tremulando para trás
      const onda = Math.sin(t * 9);
      c.fillStyle = "#c8322f";
      c.strokeStyle = "#7a1a18";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(-20, -12);
      c.quadraticCurveTo(-30, -12 + onda * 2, -38, -9 + onda * 3.5);
      c.lineTo(-37, -3 + onda * 3);
      c.quadraticCurveTo(-29, -6 + onda * 1.5, -20, -6);
      c.closePath();
      c.fill();
      c.stroke();
      rr(c, -24, -15, 48, 6, 3);
      c.fill();
      c.stroke();
      c.strokeStyle = "#f4efe6";
      c.lineWidth = 2.2;
      c.beginPath();
      for (const x of [-16, -5, 6, 17]) {
        c.moveTo(x, -14.2);
        c.lineTo(x, -9.8);
      }
      c.moveTo(-29, -11.2 + onda * 1.9);
      c.lineTo(-28.6, -6.4 + onda * 1.4);
      c.moveTo(-34, -10.2 + onda * 2.9);
      c.lineTo(-33.6, -4.8 + onda * 2.3);
      c.stroke();
      // neve sobre a tampa, dos dois lados da alça
      c.fillStyle = "#ffffff";
      c.strokeStyle = "#b9cde3";
      c.lineWidth = 0.8;
      for (const x of [-22, 9]) {
        rr(c, x, -19.5, 13, 4.5, 2.2);
        c.fill();
        c.stroke();
      }
    });
  },
};

const GOTICO: Tema = {
  id: "gotico",
  nome: "Gótico",
  descricao: "Sessão noturna: catedral com vitrais acesos, morcegos e neblina.",
  onda: "sawtooth",
  somBase: 165,
  climaFixo: "neblina",
  capitel: "dorico",
  paleta: {
    // escuro nas quatro fases: é sempre noite
    ceu: [["#2a1840", "#6a3a6e"], ["#141a3a", "#3a3f6e"], ["#2a0f24", "#8a2a3a"], ["#07050e", "#1c1430"]],
    longe: ["#1e1530", "#1b1f38", "#22121f", "#0b0814"],
    perto: ["#120c1e", "#101426", "#160a14", "#050309"],
    chao: "#1d1726",
    chaoLinha: "#4b3a5e",
    coluna: { corpo: "#5a5068", sombra: "#3e3650", luz: "#7d7392", contorno: "#1a1522" },
    maleta: { corpo: "#6b3a86", escuro: "#2a1238", fivela: "#d4af37", alca: "#2a1238" },
    asa: { cor: "#2e2240", contorno: "#b9a2e0" },
    moeda: ["#e8c25a", "#8a6a1e"],
    particula: ["#b9a2e0", "#e8c25a", "#ffffff"],
    recorde: {
      cor: "#b04cff", traco: [8, 4], largura: 3,
      aviso: { texto: "NOVO RECORDE", fonte: "italic 700 30px Georgia, serif", corTexto: "#f1e3ff", corContorno: "#2a0f3a", corFundo: "rgba(20,8,30,0.9)", anima: "pulsa" },
    },
    hud: "#f1e3ff",
    estrelas: "#e8e0ff",
    // lilás baixo: o branco do padrão deixaria a cena cinza
    neblina: "rgba(120,110,150,0.12)",
  },
  chao(ctx, w, h, y, off, tema) {
    const p = tema.paleta;
    ctx.fillStyle = p.chao;
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 3);
    // paralelepípedos, na velocidade das colunas
    ctx.fillStyle = "#2a2236";
    ctx.beginPath();
    for (let fila = 0; fila < 3; fila++) {
      const yy = y + 7 + fila * 11;
      for (let x = -((off + (fila % 2) * 13) % 26); x < w; x += 26) ctx.roundRect(x + 1, yy, 23, 8, 3);
    }
    ctx.fill();
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    // a coluna de cima vem espelhada: vitrais e arcos são desvirados para a ponta ficar sempre para cima
    const deCima = ctx.getTransform().d < 0;
    const capH = quebrada ? 12 : 30;
    const x0 = -w / 2;
    const pedra = (a: number, b: number) => {
      const g = ctx.createLinearGradient(a, 0, b, 0);
      g.addColorStop(0, c.sombra);
      g.addColorStop(0.42, c.luz);
      g.addColorStop(1, c.sombra);
      return g;
    };
    ctx.fillStyle = pedra(x0, x0 + w);
    ctx.fillRect(x0, capH, w, len - capH);
    // feixe de três colunelos
    const colunelos = [-1, 0, 1].map((k) => k * w * 0.3);
    for (const cx of colunelos) {
      ctx.fillStyle = pedra(cx - 7, cx + 7);
      ctx.fillRect(cx - 7, capH, 14, len - capH);
    }
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    for (const cx of colunelos) {
      ctx.moveTo(cx - 7, capH);
      ctx.lineTo(cx - 7, len);
      ctx.moveTo(cx + 7, capH);
      ctx.lineTo(cx + 7, len);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    // fresta de vitral aceso entre dois colunelos, perto da ponta
    if (len > capH + 90) {
      ctx.save();
      ctx.translate(11, capH + 44);
      if (deCima) ctx.scale(1, -1);
      ctx.fillStyle = VITRAIS[variante % 3];
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ogiva(ctx, -6, 22, 12, 44);
      ctx.fill();
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      ogiva(ctx, -3.5, 18, 7, 36);
      ctx.fill();
      ctx.restore();
    }
    // anéis
    ctx.fillStyle = c.sombra;
    ctx.lineWidth = 1.5;
    for (let y = capH + 110; y < len - 10; y += 130) {
      ctx.fillRect(x0 - 3, y, w + 6, 7);
      ctx.strokeRect(x0 - 3, y, w + 6, 7);
    }
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, capH, w, len - capH);
    if (quebrada) {
      ctx.fillStyle = c.corpo;
      ctx.beginPath();
      ctx.moveTo(x0, capH + 1);
      ctx.lineTo(x0, 6);
      ctx.lineTo(x0 + w * 0.18, 1);
      ctx.lineTo(x0 + w * 0.34, 9);
      ctx.lineTo(x0 + w * 0.55, 0);
      ctx.lineTo(x0 + w * 0.74, 8);
      ctx.lineTo(x0 + w, 2);
      ctx.lineTo(x0 + w, capH + 1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // capitel: ábaco e uma arcada cega de arcos ogivais
    ctx.fillStyle = c.luz;
    ctx.fillRect(x0 - 6, 0, w + 12, 8);
    ctx.strokeRect(x0 - 6, 0, w + 12, 8);
    ctx.fillStyle = c.corpo;
    ctx.fillRect(x0 - 2, 8, w + 4, capH - 8);
    ctx.strokeRect(x0 - 2, 8, w + 4, capH - 8);
    ctx.save();
    ctx.translate(0, (8 + capH) / 2);
    if (deCima) ctx.scale(1, -1);
    ctx.fillStyle = c.sombra;
    ctx.beginPath();
    const vao = (w - 2) / 4;
    for (let i = 0; i < 4; i++) ogiva(ctx, x0 + 3 + i * vao, 9, vao - 4, 18);
    ctx.fill();
    ctx.restore();
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => {
      const m = tema.paleta.maleta;
      // rosácea dourada no fecho
      c.fillStyle = m.fivela;
      c.strokeStyle = m.escuro;
      c.lineWidth = 0.8;
      c.beginPath();
      c.arc(0, -4.5, 4.4, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        c.moveTo(0, -4.5);
        c.lineTo(Math.cos(a) * 4.4, -4.5 + Math.sin(a) * 4.4);
      }
      c.stroke();
      // olhos vermelhos, boca e duas presinhas
      c.fillStyle = "#ff4d6d";
      for (const x of [-8, 8]) {
        c.beginPath();
        c.ellipse(x, 4, 2.4, 1.8, 0, 0, Math.PI * 2);
        c.fill();
      }
      c.strokeStyle = m.escuro;
      c.lineWidth = 1.3;
      c.beginPath();
      c.moveTo(-5, 9);
      c.quadraticCurveTo(0, 11, 5, 9);
      c.stroke();
      c.fillStyle = "#ffffff";
      c.beginPath();
      for (const x of [-2.6, 2.6]) {
        c.moveTo(x - 1.4, 9.6);
        c.lineTo(x, 13);
        c.lineTo(x + 1.4, 9.6);
        c.closePath();
      }
      c.fill();
    }, "morcego");
  },
};

/** Os estilos de fora dos grupos; a lista completa, com os grupos, fica em catalogo.ts. */
export const TEMAS_BASE: Tema[] = [CLASSICO, FOFO, RETRO, STEAMPUNK, PIXEL, NOIR, PAPIRO, RECESSO, GOTICO];
