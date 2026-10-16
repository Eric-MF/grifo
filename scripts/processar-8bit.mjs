#!/usr/bin/env node
// Pós-processamento dos assets 8-bit gerados por IA (skill jogo-8bit-ia).
// Fluxo: fundo magenta vira alfa 0 → grade de pixels (periodograma das transições de cor, com alinhamento
// das bordas) → votação por bloco → normalização para o tamanho do buffer do jogo (1 célula = 1 pixel)
// → paleta comum de 32 cores (LAB) → PNG com alfa rígido.
//
// Uso: node scripts/processar-8bit.mjs [origem] [destino]
//   origem  padrão: .examples/8bits Images (fora do git)
//   destino padrão: public/jogos/flap-suitcase/8bit
import { statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const RAIZ = path.resolve(import.meta.dirname, "..");
const ORIGEM = path.resolve(process.argv[2] ?? path.join(RAIZ, ".examples/8bits Images"));
const DESTINO = path.resolve(process.argv[3] ?? path.join(RAIZ, "public/jogos/flap-suitcase/8bit"));
const CORES_NA_PALETA = 32;

// ---------------------------------------------------------------------------
// Imagem RGBA e fundo
// ---------------------------------------------------------------------------

export async function carregar(arquivo) {
  const { data, info } = await sharp(arquivo).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, px: new Uint8Array(data) };
}

/** Magenta #FF00FF com folga para o ruído do JPEG. */
const ehMagenta = (r, g, b) => r >= 170 && b >= 170 && g <= 110;

export function removerMagenta(img) {
  const { w, h, px } = img;
  for (let i = 0; i < w * h; i++) if (ehMagenta(px[i * 4], px[i * 4 + 1], px[i * 4 + 2])) px[i * 4 + 3] = 0;
}

/** Remove uma cor de fundo (ex.: cinza chapado) só quando ela está ligada à borda da imagem. */
export function removerFundoDaBorda(img, cor, tolerancia) {
  const { w, h, px } = img;
  const visto = new Uint8Array(w * h);
  const pilha = [];
  const cabe = (i) => {
    const p = i * 4;
    return !visto[i] && px[p + 3] !== 0 && Math.hypot(px[p] - cor[0], px[p + 1] - cor[1], px[p + 2] - cor[2]) <= tolerancia;
  };
  for (let x = 0; x < w; x++) pilha.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) pilha.push(y * w, y * w + w - 1);
  for (const i of pilha) if (cabe(i)) visto[i] = 1;
  const fila = pilha.filter((i) => visto[i]);
  while (fila.length) {
    const i = fila.pop();
    px[i * 4 + 3] = 0;
    const x = i % w;
    const vizinhos = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i >= w ? i - w : -1, i < w * (h - 1) ? i + w : -1];
    for (const j of vizinhos) if (j >= 0 && cabe(j)) {
      visto[j] = 1;
      fila.push(j);
    }
  }
}

// ---------------------------------------------------------------------------
// Grade de pixels: transições de cor e periodograma
// ---------------------------------------------------------------------------

/** Quantas linhas (eixo x) ou colunas (eixo y) mudam de cor em cada posição. */
export function transicoes(img, eixo) {
  const { w, h, px } = img;
  const s = new Float64Array(eixo === "x" ? w : h);
  const difere = (p, q) => Math.abs(px[p] - px[q]) + Math.abs(px[p + 1] - px[q + 1]) + Math.abs(px[p + 2] - px[q + 2]) > 60;
  if (eixo === "x") {
    for (let y = 0; y < h; y++) for (let x = 1; x < w; x++) if (difere((y * w + x) * 4, (y * w + x - 1) * 4)) s[x]++;
  } else {
    for (let y = 1; y < h; y++) for (let x = 0; x < w; x++) if (difere((y * w + x) * 4, ((y - 1) * w + x) * 4)) s[y]++;
  }
  return s;
}

/**
 * Procura o período (em px) da grade no sinal de transições, entre pmin e pmax, pelo pico do periodograma.
 * Devolve o período P e o deslocamento o da primeira borda (bordas em o + i·P).
 */
export function candidatosGrade(sinal, pmin, pmax) {
  const n = sinal.length;
  const nz = [];
  for (let k = 0; k < n; k++) if (sinal[k] > 0) nz.push(k);
  const total = nz.reduce((a, k) => a + sinal[k], 0);
  const avaliar = (P) => {
    const fase = melhorFase(sinal, nz, n, P);
    return { P, o: fase, ...medirGrade(sinal, nz, total, n, P, fase) };
  };
  // Candidatos (a): canvas dividido em N blocos inteiros, para todo N na faixa de períodos.
  const candidatos = [];
  for (let N = Math.max(1, Math.ceil(n / pmax)); N <= Math.floor(n / pmin); N++) candidatos.push(avaliar(n / N));
  // Candidatos (b): picos do periodograma, refinados em frequência (grades que não dividem o canvas).
  const potencia = (f) => {
    const om = 2 * Math.PI * f;
    let re = 0;
    let im = 0;
    for (const k of nz) {
      re += sinal[k] * Math.cos(om * k);
      im += sinal[k] * Math.sin(om * k);
    }
    return re * re + im * im;
  };
  const passos = Math.ceil((1 / pmin - 1 / pmax) * n * 8);
  const espectro = [];
  for (let j = 0; j <= passos; j++) espectro.push(potencia(1 / pmax + ((1 / pmin - 1 / pmax) * j) / passos));
  const maximo = Math.max(...espectro);
  for (let j = 0; j <= passos; j++) {
    const pot = espectro[j];
    if (pot < 0.5 * maximo || (j > 0 && pot < espectro[j - 1]) || (j < passos && pot < espectro[j + 1])) continue;
    const f0 = 1 / pmax + ((1 / pmin - 1 / pmax) * j) / passos;
    let f = f0;
    let melhor = pot;
    for (let t = -100; t <= 100; t++) {
      const q = potencia(f0 + (t / 100) * (1 / (8 * n)));
      if (q > melhor) {
        melhor = q;
        f = f0 + (t / 100) * (1 / (8 * n));
      }
    }
    candidatos.push(avaliar(1 / f));
  }
  // Escolha: alinhamento A ≥ 0,5; entre eles, o de maior A×C (o 2N alinha mas cobre só metade das bordas).
  const validos = candidatos.filter((r) => r.A >= 0.5).sort((a, b) => b.A * b.C - a.A * a.C);
  if (!validos.length) throw new Error(`nenhuma grade alinhada entre ${pmin.toFixed(1)} e ${pmax.toFixed(1)} px`);
  return validos;
}

/** Fase da grade para um período P: centro do platô de melhor alinhamento (tolerância de 1 px). */
export function melhorFase(sinal, nz, n, P) {
  const medidas = [];
  for (let phi = 0; phi < P; phi += Math.max(0.1, P / 200)) {
    let alinhado = 0;
    for (const k of nz) {
      const r = (k - phi) / P;
      if (Math.abs(r - Math.round(r)) * P <= 1) alinhado += sinal[k];
    }
    medidas.push([phi, alinhado]);
  }
  const maximo = Math.max(...medidas.map((m) => m[1]));
  let cx = 0;
  let cy = 0;
  for (const [phi, a] of medidas) {
    if (a < maximo) continue;
    cx += Math.cos((2 * Math.PI * phi) / P);
    cy += Math.sin((2 * Math.PI * phi) / P);
  }
  return ((Math.atan2(cy, cx) * P) / (2 * Math.PI) + P) % P;
}

/** Alinhamento A (fração das transições sobre as bordas, tolerância 1 px) e cobertura C (bordas com transição). */
export function medirGrade(sinal, nz, total, n, P, fase) {
  const tol = 1;
  let alinhado = 0;
  for (const k of nz) {
    const r = (k - fase) / P;
    if (Math.abs(r - Math.round(r)) * P <= tol) alinhado += sinal[k];
  }
  let cobertas = 0;
  let bordas = 0;
  for (let i = 0; ; i++) {
    const b = fase + i * P;
    if (b >= n) break;
    if (b < 0) continue;
    bordas++;
    for (let k = Math.max(0, Math.round(b - tol)); k <= Math.min(n - 1, Math.round(b + tol)); k++) {
      if (sinal[k] > 0) {
        cobertas++;
        break;
      }
    }
  }
  return { A: alinhado / total, C: bordas ? cobertas / bordas : 0 };
}

/** Intervalos [a, b) de cada bloco da grade que cabem em [inicio, fim). */
export function celulas({ P, o }, inicio, fim) {
  const out = [];
  for (let i = Math.floor((inicio - o) / P); ; i++) {
    const a = Math.round(o + i * P);
    if (a >= fim) break;
    const b = Math.round(o + (i + 1) * P);
    const A = Math.max(a, inicio);
    const B = Math.min(b, fim);
    if (B > A) out.push([A, B]);
  }
  return out;
}

/** Cor do bloco pela votação: a cor mais frequente entre os pixels opacos do miolo. Null se o bloco é fundo. */
export function votar(img, x0, x1, y0, y1) {
  const { w, px } = img;
  const mx = x1 - x0 >= 4 ? Math.floor((x1 - x0) * 0.2) : 0;
  const my = y1 - y0 >= 4 ? Math.floor((y1 - y0) * 0.2) : 0;
  const bins = new Map();
  let total = 0;
  let opacos = 0;
  for (let y = y0 + my; y < y1 - my; y++) {
    for (let x = x0 + mx; x < x1 - mx; x++) {
      total++;
      const p = (y * w + x) * 4;
      if (px[p + 3] === 0) continue;
      opacos++;
      const k = ((px[p] >> 4) << 8) | ((px[p + 1] >> 4) << 4) | (px[p + 2] >> 4);
      const b = bins.get(k) ?? { n: 0, r: 0, g: 0, b: 0 };
      b.n++;
      b.r += px[p];
      b.g += px[p + 1];
      b.b += px[p + 2];
      bins.set(k, b);
    }
  }
  if (!total || opacos < total / 2) return null;
  let top = null;
  for (const b of bins.values()) if (!top || b.n > top.n) top = b;
  return [Math.round(top.r / top.n), Math.round(top.g / top.n), Math.round(top.b / top.n), 255];
}

/** Reduz a imagem a uma grade de blocos (uma célula por bloco da grade). */
export function reduzir(img, regiao, gx, gy) {
  const cx = celulas(gx, regiao.x0, regiao.x1);
  const cy = celulas(gy, regiao.y0, regiao.y1);
  const W = cx.length;
  const H = cy.length;
  const px = new Uint8Array(W * H * 4);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const cor = votar(img, cx[i][0], cx[i][1], cy[j][0], cy[j][1]);
      if (cor) px.set(cor, (j * W + i) * 4);
    }
  }
  return { w: W, h: H, px };
}

/** Recorte da grade até a menor caixa que contém todas as células opacas. */
export function recortarGrade(g) {
  let x0 = g.w, x1 = 0, y0 = g.h, y1 = 0;
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    if (g.px[(y * g.w + x) * 4 + 3] === 0) continue;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  if (x1 < x0) throw new Error("grade vazia");
  return recortarArea(g, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
}

function recortarArea(g, x0, y0, w, h) {
  const px = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const origem = ((y0 + y) * g.w + x0) * 4;
    px.set(g.px.subarray(origem, origem + w * 4), y * w * 4);
  }
  return { w, h, px };
}

/** Remove células opacas sem nenhum vizinho opaco (ruído de borda). */
export function limparIsolados(g) {
  const { w, h, px } = g;
  const opaca = (x, y) => x >= 0 && y >= 0 && x < w && y < h && px[(y * w + x) * 4 + 3] !== 0;
  const apagar = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!opaca(x, y)) continue;
    if (!opaca(x - 1, y) && !opaca(x + 1, y) && !opaca(x, y - 1) && !opaca(x, y + 1)) apagar.push((y * w + x) * 4 + 3);
  }
  for (const p of apagar) px[p] = 0;
}

/** Ampliação por vizinho mais próximo (usada nas camadas de cenário). */
export function ampliar(g, W, H) {
  const px = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    const sy = Math.floor((y * g.h) / H);
    for (let x = 0; x < W; x++) {
      const sx = Math.floor((x * g.w) / W);
      px.set(g.px.subarray((sy * g.w + sx) * 4, (sy * g.w + sx) * 4 + 4), (y * W + x) * 4);
    }
  }
  return { w: W, h: H, px };
}

// ---------------------------------------------------------------------------
// Quadros em folha: caixas desenhadas pela IA ou faixas sem caixa
// ---------------------------------------------------------------------------

/** Regiões de fundo fechadas (não tocam a borda): o miolo de cada caixa desenhada pela IA. */
export function caixasInternas(img, n) {
  const { w, h, px } = img;
  const rotulo = new Int32Array(w * h).fill(-1);
  const pilha = new Int32Array(w * h);
  const componentes = [];
  for (let s = 0; s < w * h; s++) {
    if (rotulo[s] !== -1 || px[s * 4 + 3] !== 0) continue;
    const id = componentes.length;
    let topo = 0;
    rotulo[s] = id;
    pilha[topo++] = s;
    const c = { x0: w, x1: 0, y0: h, y1: 0, area: 0, toca: false };
    while (topo) {
      const i = pilha[--topo];
      const x = i % w;
      const y = (i - x) / w;
      c.area++;
      c.x0 = Math.min(c.x0, x);
      c.x1 = Math.max(c.x1, x + 1);
      c.y0 = Math.min(c.y0, y);
      c.y1 = Math.max(c.y1, y + 1);
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) c.toca = true;
      const vizinhos = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
      for (const j of vizinhos) if (j >= 0 && rotulo[j] === -1 && px[j * 4 + 3] === 0) {
        rotulo[j] = id;
        pilha[topo++] = j;
      }
    }
    componentes.push(c);
  }
  const caixas = componentes.filter((c) => !c.toca && c.area > 0.01 * w * h).sort((a, b) => b.area - a.area).slice(0, n);
  if (caixas.length !== n) throw new Error(`esperava ${n} caixas, achei ${caixas.length}`);
  return caixas.sort((a, b) => a.x0 - b.x0);
}

/** Monta os quadros lado a lado, com o mesmo tamanho. `base` alinha pela parte de baixo; `centro` centraliza. */
export function montarFolha(quadros, alinhamento) {
  const S = Math.max(...quadros.map((q) => q.w)) + 2;
  const T = Math.max(...quadros.map((q) => q.h)) + 2;
  const px = new Uint8Array(quadros.length * S * T * 4);
  quadros.forEach((q, k) => {
    const ox = k * S + Math.floor((S - q.w) / 2);
    const oy = alinhamento === "base" ? T - 1 - q.h : Math.floor((T - q.h) / 2);
    for (let y = 0; y < q.h; y++) {
      const destino = ((oy + y) * (S * quadros.length) + ox) * 4;
      px.set(q.px.subarray(y * q.w * 4, (y + 1) * q.w * 4), destino);
    }
  });
  return { w: S * quadros.length, h: T, px };
}

/** Reduz uma grade por votação: cada célula de saída recebe a cor mais frequente da área que cobre. */
export function reamostrarVotando(g, W, H) {
  const px = new Uint8Array(W * H * 4);
  for (let j = 0; j < H; j++) {
    const y0 = Math.floor((j * g.h) / H);
    const y1 = Math.max(y0 + 1, Math.floor(((j + 1) * g.h) / H));
    for (let i = 0; i < W; i++) {
      const x0 = Math.floor((i * g.w) / W);
      const x1 = Math.max(x0 + 1, Math.floor(((i + 1) * g.w) / W));
      const votos = new Map();
      let opacos = 0;
      let total = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        total++;
        const p = (y * g.w + x) * 4;
        if (!g.px[p + 3]) continue;
        opacos++;
        const k = (g.px[p] << 16) | (g.px[p + 1] << 8) | g.px[p + 2];
        votos.set(k, (votos.get(k) ?? 0) + 1);
      }
      if (opacos < total / 2) continue;
      let k = 0;
      let n = -1;
      for (const [c, v] of votos) if (v > n) [k, n] = [c, v];
      px.set([k >> 16, (k >> 8) & 255, k & 255, 255], (j * W + i) * 4);
    }
  }
  return { w: W, h: H, px };
}

/** Centraliza uma grade num quadro fixo (ícones 16×16). */
export function centralizar(g, W, H) {
  // grade maior que o quadro (ex.: pausa com 22 blocos): reduz por votação de blocos, sem blocos irregulares
  if (g.w > W || g.h > H) {
    const f = Math.max(g.w / W, g.h / H);
    g = reamostrarVotando(g, Math.round(g.w / f), Math.round(g.h / f));
  }
  const px = new Uint8Array(W * H * 4);
  const ox = Math.floor((W - g.w) / 2);
  const oy = Math.floor((H - g.h) / 2);
  for (let y = 0; y < g.h; y++) px.set(g.px.subarray(y * g.w * 4, (y + 1) * g.w * 4), ((oy + y) * W + ox) * 4);
  return { w: W, h: H, px };
}

// ---------------------------------------------------------------------------
// Cor: LAB e paleta comum
// ---------------------------------------------------------------------------

export function paraLab(r, g, b) {
  const lin = (c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const R = lin(r);
  const G = lin(g);
  const B = lin(b);
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X);
  const fy = f(Y);
  const fz = f(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

/**
 * Paleta comum por k-means ponderado em LAB. Cada ativo pesa 1 no total, para que sprites pequenos
 * também tenham cores na paleta. Entradas: [{ rgb, lab, peso }].
 */
export function paletaComum(amostras, K) {
  const ordem = [...amostras].sort((a, b) => b.peso - a.peso);
  const centros = [];
  for (const a of ordem) {
    if (centros.length >= K) break;
    if (centros.every((c) => dist2(c.lab, a.lab) >= 49)) centros.push({ lab: a.lab, rgb: a.rgb });
  }
  for (let it = 0; it < 30; it++) {
    const soma = centros.map(() => ({ lab: [0, 0, 0], rgb: [0, 0, 0], peso: 0 }));
    for (const a of amostras) {
      let melhor = 0;
      let d = Infinity;
      centros.forEach((c, k) => {
        const dd = dist2(c.lab, a.lab);
        if (dd < d) {
          d = dd;
          melhor = k;
        }
      });
      const s = soma[melhor];
      s.peso += a.peso;
      for (let c = 0; c < 3; c++) {
        s.lab[c] += a.lab[c] * a.peso;
        s.rgb[c] += a.rgb[c] * a.peso;
      }
    }
    soma.forEach((s, k) => {
      if (!s.peso) return;
      centros[k] = { lab: s.lab.map((v) => v / s.peso), rgb: s.rgb.map((v) => Math.round(v / s.peso)) };
    });
  }
  return centros;
}

// ---------------------------------------------------------------------------
// Itens do catálogo
// ---------------------------------------------------------------------------

const PODERES = ["escudo", "ima", "lento", "mini", "fantasma", "dobro", "leve", "congelar", "prescricao", "revisao", "arquivamento", "equilibrio", "inquerito", "presuncao", "dosimetria", "denuncia", "tipificacao", "voo"];
const PERSONAGENS = ["maleta", "balanca", "delegado", "defensor", "juiz", "promotor", "codigo", "grifo"];
const HUD = ["coracao", "moeda", "pausa", "som-ligado", "som-desligado", "tela-cheia"];

/**
 * Cada asset sai com uma célula por pixel do buffer do jogo (~200 linhas), para ficar nítido na tela.
 * A IA gerou blocos de 11 a 64 px em grades de 16 a 40 células; a normalização leva tudo a estes tamanhos.
 */
const ALVO = { icone: 16, moldura: 24, coluna: 24, personagem: 26, fxPequeno: 8, fxGrande: 24 };
/** Cenários saem com 1920 px de largura: cada bloco da grade detectada vira um fator inteiro (8, 10 ou 16 px). */
const CENA_LARGURA = 1920;

const ITENS = [
  { saida: "cenario/camada-0-ceu-sol-nuvens", origem: "camada-0-ceu-sol-nuvens.jpg", tipo: "cena", opaca: true },
  { saida: "cenario/camada-1-montanhas", origem: "camada-1-montanhas.jpg", tipo: "cena" },
  { saida: "cenario/camada-2-colinas-florestas", origem: "camada-2-colinas-florestas.jpg", tipo: "cena" },
  { saida: "cenario/camada-3-campos-rio", origem: "camada-3-campos-rio.jpg", tipo: "cena" },
  // faixa do chão: grama, borda escura e terra (30% a 50% da altura), sem ampliar: um bloco por pixel do jogo
  { saida: "cenario/chao", origem: "chao.jpg", tipo: "cena", opaca: true, faixaY: [0.3, 0.5], nativo: true },
  { saida: "colunas/dorica-normal", origem: "dorica-normal.jpg", tipo: "coluna" },
  // os destroços da base se espalham além da coluna: a rachada usa a mesma faixa horizontal da normal
  { saida: "colunas/dorica-rachada", origem: "dorica-rachada.jpg", tipo: "coluna", referencia: "colunas/dorica-normal", regiaoX: [300, 1240] },
  ...PERSONAGENS.map((id) => ({ saida: `personagens/${id}`, origem: `${id}.jpg`, tipo: "quadros", quadros: 3, caixas: true, alinhamento: "base", max: ALVO.personagem })),
  { saida: "fx/faisca", origem: "faisca.jpg", tipo: "quadros", quadros: 4, faixas: true, alinhamento: "centro", max: ALVO.fxPequeno },
  { saida: "fx/destroco", origem: "destroco.jpg", tipo: "quadros", quadros: 4, faixas: true, alinhamento: "centro", max: ALVO.fxPequeno },
  { saida: "fx/explosao", origem: "explosao.jpg", tipo: "quadros", quadros: 5, faixas: true, alinhamento: "centro", max: ALVO.fxGrande },
  { saida: "hud/moldura", origem: "moldura.jpg", tipo: "unico", fundoCinza: [32, 32, 32] },
  ...PODERES.map((id) => ({ saida: `poderes/${id}`, origem: `${id}.jpg`, tipo: "icone" })),
  ...HUD.map((id) => ({ saida: `hud/${id}`, origem: `${id}.jpg`, tipo: "icone" })),
  { saida: "itens/moeda", tipo: "giro", de: "hud/moeda", quadros: 4 },
];

// ---------------------------------------------------------------------------
// Pipeline por item
// ---------------------------------------------------------------------------

/** Faixa de período (em px) aceita para cada família. Pixel é quadrado: a mesma faixa vale para os dois eixos. */
function faixaDePeriodo(item, img) {
  const m = Math.min(img.w, img.h);
  if (item.tipo === "icone") return [m / 48, m / 9];
  if (item.tipo === "unico") return [m / 100, m / 20];
  if (item.tipo === "coluna") return [m / 200, m / 35];
  if (item.tipo === "cena") return [m / 400, m / 60];
  if (item.faixas) return [m / 300, m / 25];
  return [m / 150, m / 60];
}

/** Quadros enfileirados em faixas iguais, sem caixa desenhada. */
function faixas(W, H, n) {
  return Array.from({ length: n }, (_, k) => ({ x0: Math.round((k * W) / n), x1: Math.round(((k + 1) * W) / n), y0: 0, y1: H }));
}

/**
 * Grade do item. A IA nem sempre gera pixel quadrado, então cada eixo tem o seu período. Escolhe-se o par
 * (Px, Py) com períodos a até 3% um do outro e maior soma de alinhamento; sem par, cada eixo sai sozinho.
 */
function gradeDoItem(img, item) {
  const [pmin, pmax] = faixaDePeriodo(item, img);
  const cx = candidatosGrade(transicoes(img, "x"), pmin, pmax);
  const cy = candidatosGrade(transicoes(img, "y"), pmin, pmax);
  let par = null;
  for (const a of cx) for (const b of cy) {
    if (Math.abs(a.P - b.P) / a.P > 0.03) continue;
    const soma = a.A * a.C + b.A * b.C;
    if (!par || soma > par.soma) par = { soma, gx: a, gy: b };
  }
  const { gx, gy } = par ?? { gx: cx[0], gy: cy[0] };
  return { gx, gy, relatorio: `grade ${gx.P.toFixed(2)}×${gy.P.toFixed(2)} px (A ${gx.A.toFixed(2)}/${gy.A.toFixed(2)})${par ? "" : " [eixos independentes]"}` };
}

/** Grade com períodos já conhecidos (de outra imagem da mesma família): só a fase é medida nesta. */
function gradeComPeriodos(img, px, py) {
  const medir = (eixo, P) => {
    const sinal = transicoes(img, eixo);
    const nz = [];
    let total = 0;
    for (let k = 0; k < sinal.length; k++) if (sinal[k] > 0) {
      nz.push(k);
      total += sinal[k];
    }
    const o = melhorFase(sinal, nz, sinal.length, P);
    return { P, o, ...medirGrade(sinal, nz, total, sinal.length, P, o) };
  };
  return { gx: medir("x", px), gy: medir("y", py) };
}

/** Reduz a grade até caber no maior lado (sem ampliar). */
function caber(g, max) {
  const f = Math.max(g.w, g.h) / max;
  return f <= 1 ? g : reamostrarVotando(g, Math.max(1, Math.round(g.w / f)), Math.max(1, Math.round(g.h / f)));
}

/**
 * Mesmo fator inteiro para todos os quadros de uma folha (o personagem não muda de tamanho entre quadros, e
 * a redução por inteiro mantém os blocos regulares).
 */
function cabeTodos(quadros, max) {
  const maior = Math.max(...quadros.map((q) => Math.max(q.w, q.h)));
  const f = Math.max(1, Math.round(maior / max));
  return quadros.map((q) => (f <= 1 ? q : reamostrarVotando(q, Math.max(1, Math.round(q.w / f)), Math.max(1, Math.round(q.h / f)))));
}

/** Frames de giro da moeda: a mesma moeda com a largura reduzida (1 : 0,75 : 0,375 : 0,75). */
function girar(g, n) {
  const larguras = n === 4 ? [8, 6, 3, 6] : [8];
  return larguras.map((lw) => {
    const px = new Uint8Array(8 * 8 * 4);
    const ox = Math.floor((8 - lw) / 2);
    for (let y = 0; y < 8; y++) for (let x = 0; x < lw; x++) {
      const sx = Math.floor(((x + 0.5) * g.w) / lw);
      const sy = Math.floor(((y + 0.5) * g.h) / 8);
      px.set(g.px.subarray((sy * g.w + sx) * 4, (sy * g.w + sx) * 4 + 4), (y * 8 + ox + x) * 4);
    }
    return { w: 8, h: 8, px };
  });
}

function juntarQuadros(quadros) {
  const { w, h } = quadros[0];
  const px = new Uint8Array(w * h * quadros.length * 4);
  quadros.forEach((q, k) => {
    for (let y = 0; y < h; y++) px.set(q.px.subarray(y * w * 4, (y + 1) * w * 4), (y * w * quadros.length + k * w) * 4);
  });
  return { w: w * quadros.length, h, px };
}

/** Geometria da coluna em células: capitel (topo), fuste (miolo) e base (embaixo). */
function geometriaColuna(g) {
  const largura = [];
  for (let y = 0; y < g.h; y++) {
    let n = 0;
    for (let x = 0; x < g.w; x++) if (g.px[(y * g.w + x) * 4 + 3]) n++;
    largura.push(n);
  }
  const meio = largura.slice(Math.floor(g.h * 0.3), Math.ceil(g.h * 0.7));
  const contagem = new Map();
  for (const v of meio) contagem.set(v, (contagem.get(v) ?? 0) + 1);
  const fuste = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0][0];
  let capitel = 0;
  while (capitel < g.h && largura[capitel] > fuste) capitel++;
  let base = g.h;
  while (base > 0 && largura[base - 1] > fuste) base--;
  return { largura: g.w, altura: g.h, fuste, capitel, base, fim: g.h };
}

async function processar(item, feitos) {
  if (item.tipo === "giro") {
    const quadros = girar(feitos.get(item.de).grade, item.quadros);
    return { ...item, grade: juntarQuadros(quadros), coluna: null, relatorio: `quadros derivados de ${item.de} (8 células)` };
  }
  const img = await carregar(path.join(ORIGEM, item.origem));
  const { w: W, h: H } = img;
  if (!item.opaca) removerMagenta(img);
  if (item.fundoCinza) removerFundoDaBorda(img, item.fundoCinza, 24);
  let grade0;
  if (item.referencia) {
    const ref = feitos.get(item.referencia);
    grade0 = { ...gradeComPeriodos(img, ref.gx.P, ref.gy.P), relatorio: `grade de ${item.referencia}` };
  } else grade0 = item.passo ? { gx: { P: item.passo, o: 0 }, gy: { P: item.passo, o: 0 }, relatorio: `grade forçada ${item.passo} px` } : gradeDoItem(img, item);
  const { gx, gy, relatorio } = grade0;
  const tudo = item.regiaoX ? { x0: item.regiaoX[0], x1: item.regiaoX[1], y0: 0, y1: H } : { x0: 0, x1: W, y0: 0, y1: H };
  let grade;
  let coluna = null;
  if (item.tipo === "quadros") {
    const regioes = item.caixas ? caixasInternas(img, item.quadros) : faixas(W, H, item.quadros);
    const quadros = cabeTodos(regioes.map((r) => recortarGrade(reduzir(img, r, gx, gy))), item.max);
    grade = montarFolha(quadros, item.alinhamento);
  } else if (item.tipo === "cena") {
    grade = reduzir(img, tudo, gx, gy);
  } else if (item.tipo === "icone") {
    grade = centralizar(caber(recortarGrade(reduzir(img, tudo, gx, gy)), ALVO.icone), ALVO.icone, ALVO.icone);
    limparIsolados(grade);
  } else if (item.tipo === "unico") {
    grade = caber(recortarGrade(reduzir(img, tudo, gx, gy)), ALVO.moldura);
    limparIsolados(grade);
  } else if (item.tipo === "coluna") {
    grade = recortarGrade(reduzir(img, tudo, gx, gy));
    if (grade.w > ALVO.coluna) grade = reamostrarVotando(grade, ALVO.coluna, Math.round((grade.h * ALVO.coluna) / grade.w));
    coluna = geometriaColuna(grade);
  }
  if (item.faixaY) {
    const [a, b] = item.faixaY;
    grade = recortarArea(grade, 0, Math.round(grade.h * a), grade.w, Math.max(1, Math.round(grade.h * (b - a))));
  }
  return { ...item, grade, gx, gy, coluna, relatorio: `${relatorio} → ${grade.w}×${grade.h} células` };
}

/** Amostras da paleta: cada ativo tem peso total 1, distribuído entre as suas células opacas. */
function amostrasDaPaleta(resultados) {
  const bins = new Map();
  for (const r of resultados) {
    const g = r.grade;
    let n = 0;
    for (let i = 0; i < g.w * g.h; i++) if (g.px[i * 4 + 3]) n++;
    const peso = 1 / Math.max(1, n);
    for (let i = 0; i < g.w * g.h; i++) {
      const p = i * 4;
      if (!g.px[p + 3]) continue;
      const k = ((g.px[p] >> 3) << 10) | ((g.px[p + 1] >> 3) << 5) | (g.px[p + 2] >> 3);
      const b = bins.get(k) ?? { peso: 0, r: 0, g: 0, b: 0 };
      b.peso += peso;
      b.r += g.px[p] * peso;
      b.g += g.px[p + 1] * peso;
      b.b += g.px[p + 2] * peso;
      bins.set(k, b);
    }
  }
  return [...bins.values()].map((b) => {
    const rgb = [b.r / b.peso, b.g / b.peso, b.b / b.peso];
    return { rgb: rgb.map(Math.round), lab: paraLab(...rgb), peso: b.peso };
  });
}

/** Troca a cor de cada célula opaca pela cor mais próxima da paleta (LAB). */
function aplicarPaleta(g, paleta) {
  const cache = new Map();
  for (let i = 0; i < g.w * g.h; i++) {
    const p = i * 4;
    if (!g.px[p + 3]) continue;
    const chave = (g.px[p] << 16) | (g.px[p + 1] << 8) | g.px[p + 2];
    let cor = cache.get(chave);
    if (!cor) {
      const lab = paraLab(g.px[p], g.px[p + 1], g.px[p + 2]);
      let melhor = paleta[0];
      for (const c of paleta) if (dist2(c.lab, lab) < dist2(melhor.lab, lab)) melhor = c;
      cor = melhor.rgb;
      cache.set(chave, cor);
    }
    g.px[p] = cor[0];
    g.px[p + 1] = cor[1];
    g.px[p + 2] = cor[2];
  }
}

async function escrever(r, saida) {
  const caminho = path.join(saida, `${r.saida}.png`);
  await mkdir(path.dirname(caminho), { recursive: true });
  const fator = r.tipo === "cena" && !r.nativo ? Math.max(1, Math.round(CENA_LARGURA / r.grade.w)) : 1;
  const g = fator > 1 ? ampliar(r.grade, r.grade.w * fator, r.grade.h * fator) : r.grade;
  await sharp(Buffer.from(g.px), { raw: { width: g.w, height: g.h, channels: 4 } }).png({ compressionLevel: 9 }).toFile(caminho);
  return { caminho, g };
}

async function main() {
  const resultados = [];
  const feitos = new Map();
  for (const item of ITENS) {
    const r = await processar(item, feitos).catch((erro) => {
      throw new Error(`${item.saida}: ${erro.message}`);
    });
    feitos.set(item.saida, r);
    resultados.push(r);
  }
  const paleta = paletaComum(amostrasDaPaleta(resultados), CORES_NA_PALETA).map((c) => ({ rgb: c.rgb, lab: c.lab }));
  for (const r of resultados) aplicarPaleta(r.grade, paleta);
  await mkdir(DESTINO, { recursive: true });
  const hex = paleta.map((c) => `#${c.rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`);
  await writeFile(path.join(DESTINO, "paleta.json"), JSON.stringify({ cores: hex }, null, 2) + "\n");
  console.log(`paleta comum: ${hex.length} cores`);
  for (const r of resultados) {
    const { caminho, g } = await escrever(r, DESTINO);
    const bytes = statSync(caminho).size;
    const cores = new Set();
    for (let i = 0; i < r.grade.w * r.grade.h; i++) if (r.grade.px[i * 4 + 3]) cores.add(r.grade.px.slice(i * 4, i * 4 + 3).join(","));
    console.log(`${r.saida.padEnd(36)} ${String(g.w).padStart(4)}×${String(g.h).padEnd(4)} ${(bytes / 1024).toFixed(1).padStart(7)} KB  cores ${String(cores.size).padStart(2)}  ${r.relatorio}`);
    if (r.coluna) console.log(`   geometria: ${JSON.stringify(r.coluna)}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
