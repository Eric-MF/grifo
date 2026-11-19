// Cenários dos 8 estilos de fora dos grupos (Clássico, Fofo, Retrofuturista, Steampunk, Noir, Papiro, Recesso e
// Gótico): o catálogo junta cada um ao seu estilo, como as surpresas de base.ts. Ficam aqui para themes.ts não
// depender do kit (o kit já depende de themes.ts).
//
// Convenções do kit: `o` é o deslocamento da camada (já multiplicado pela velocidade dela) e tudo que se repete pelo
// cenário varia pelo lugar no mundo (`repetir` dá o índice `k`, e `variar(k, …)` sorteia sem mudar de um quadro para o
// outro). O que anda sozinho (barcos, balão, dirigível, carros, aves) soma `t` ao deslocamento.

import { aurora, catedral, ciclo, colinas, faixaNeblina, montanhasNevadas, morcego, pinheiro, templo, variar, type Ctx, type Tema } from "../themes";
import { ave, bonecoDeNeve, estrelasFixas, lua, luzinhas, mar, noiteDe, palmeira, repetir, sol } from "./kit";

type Cenario = Partial<Pick<Tema, "decor" | "chao">>;

const TAU = Math.PI * 2;
/** Resto sempre positivo (para o que dá a volta na tela). */
const mod = (a: number, n: number) => ((a % n) + n) % n;

// ---------------------------------------------------------------------------
// Peças comuns
// ---------------------------------------------------------------------------

/** Nuvem fofa: vários tufos, a base reta e o alto mais claro. Com `cara`, olhos fechados e bochechas (o Fofo). */
function nuvemFofa(ctx: Ctx, x: number, y: number, s: number, cor: string, luz: string, cara = false) {
  const tufos: [number, number, number][] = [[-30, 2, 16], [-12, -10, 22], [12, -14, 26], [34, -4, 18], [48, 4, 13]];
  ctx.fillStyle = cor;
  ctx.beginPath();
  for (const [dx, dy, r] of tufos) {
    ctx.moveTo(x + (dx + r) * s, y + dy * s);
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU);
  }
  ctx.rect(x - 30 * s, y, 78 * s, 12 * s);
  ctx.fill();
  ctx.fillStyle = luz;
  ctx.beginPath();
  for (const [dx, dy, r] of tufos.slice(1, 4)) {
    ctx.moveTo(x + (dx + r * 0.6) * s, y + (dy - r * 0.25) * s);
    ctx.arc(x + dx * s, y + (dy - r * 0.25) * s, r * 0.6 * s, 0, TAU);
  }
  ctx.fill();
  if (!cara) return;
  ctx.strokeStyle = "#7a5a8a";
  ctx.lineWidth = 1.6 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (const ox of [2, 20]) ctx.arc(x + ox * s, y - 2 * s, 3 * s, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.moveTo(x + 7 * s, y + 4 * s);
  ctx.arc(x + 11 * s, y + 3 * s, 3 * s, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,140,180,0.45)";
  ctx.beginPath();
  ctx.ellipse(x - 6 * s, y + 4 * s, 4 * s, 2.4 * s, 0, 0, TAU);
  ctx.ellipse(x + 28 * s, y + 4 * s, 4 * s, 2.4 * s, 0, 0, TAU);
  ctx.fill();
}

/** Onde estão os montes de neve da frente do Recesso (o cenário guarda a cada quadro), para o trenó da surpresa. */
let neveDaFrente = { h: 0, o: 0 };
/** A altura da neve da frente do Recesso no x da tela. */
export const alturaNeveRecesso = (x: number) => alturaColina(x, neveDaFrente.h - 40, neveDaFrente.o, 22, 8, 0.016, 7);

/** Altura da linha de `colinas` na posição x da tela (a mesma conta de themes.ts), para pôr coisas em cima. */
function alturaColina(x: number, h: number, o: number, alt: number, amp: number, freq: number, seed: number) {
  const X = x + o;
  return h - alt - Math.sin(X * freq + seed) * amp - Math.sin(X * freq * 2.3 + seed * 2) * amp * 0.4;
}

/** Engrenagem com aro, raios e furos vazados (evenodd: os furos mostram o que está atrás, sem apagar o céu). */
function engrenagemRaios(ctx: Ctx, x: number, y: number, r: number, dentes: number, ang: number, cor: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.fillStyle = cor;
  ctx.beginPath();
  for (let i = 0; i < dentes * 4; i++) {
    const a = (i / (dentes * 4)) * TAU;
    const rad = i % 4 < 2 ? r * 1.14 : r;
    ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
  // os furos entre os raios
  const raios = 5;
  for (let i = 0; i < raios; i++) {
    const a0 = (i / raios) * TAU + 0.18;
    const a1 = ((i + 1) / raios) * TAU - 0.18;
    ctx.moveTo(Math.cos(a0) * r * 0.78, Math.sin(a0) * r * 0.78);
    ctx.arc(0, 0, r * 0.78, a0, a1);
    ctx.arc(0, 0, r * 0.32, a1 - 0.12, a0 + 0.12, true);
    ctx.closePath();
  }
  ctx.fill("evenodd");
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.14, 0, TAU);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fill();
  ctx.restore();
}

/**
 * Brilho redondo (vela, fogo-fátuo): um degradê desenhado uma vez numa imagem pequena e reaproveitado. Criar um
 * degradê por brilho a cada quadro pesava (o Gótico chegou a 60 por quadro). `cor` é "r,g,b".
 */
const brilhos = new Map<string, HTMLCanvasElement | null>();
function brilho(ctx: Ctx, x: number, y: number, r: number, cor: string, alfa: number) {
  let img = brilhos.get(cor);
  if (img === undefined) {
    img = null;
    if (typeof document !== "undefined") {
      const tela = document.createElement("canvas");
      tela.width = tela.height = 64;
      const c = tela.getContext("2d");
      if (c) {
        const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0, `rgba(${cor},1)`);
        g.addColorStop(0.35, `rgba(${cor},0.45)`);
        g.addColorStop(1, `rgba(${cor},0)`);
        c.fillStyle = g;
        c.fillRect(0, 0, 64, 64);
        img = tela;
      }
    }
    brilhos.set(cor, img);
  }
  if (!img) return;
  const a0 = ctx.globalAlpha;
  ctx.globalAlpha = a0 * alfa;
  ctx.drawImage(img, x - r, y - r, 2 * r, 2 * r);
  ctx.globalAlpha = a0;
}

/** Fumaça que sai de (x, y): bolas que sobem, crescem, entortam com o vento e somem. `cor` sem transparência. */
function fumaca(ctx: Ctx, x: number, y: number, t: number, cor: string, s = 1, n = 6, semente = 0) {
  ctx.fillStyle = cor;
  for (let i = 0; i < n; i++) {
    const f = mod(t * 0.35 + i / n + semente * 0.13, 1);
    ctx.globalAlpha = 0.55 * (1 - f);
    ctx.beginPath();
    ctx.arc(x - f * 40 * s + Math.sin(f * 6 + semente) * 4 * s, y - f * 90 * s, (5 + f * 16) * s, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Clássico: o mar Egeu, as ilhas com casinhas brancas, barcos, gaivotas e a Acrópole entre oliveiras
// ---------------------------------------------------------------------------
const MAR_EGEU = ["#4f7fa8", "#2d6fa3", "#3d4f80", "#0a1a33"];
const ESPUMA_EGEU = ["#ffe6c8", "#d9f0ff", "#f0b8a0", "#5a7aa8"];
const ILHA = ["#a99a9a", "#7f9db5", "#5d5476", "#14223f"];
const MARMORE = ["#f6dcc0", "#f4efe4", "#e8c3b0", "#5a6a8a"];
const MARMORE_SOMBRA = ["#d9b898", "#cfc5b2", "#b08a88", "#34405e"];
const OLIVEIRA = ["#8a9a6a", "#7f9a6a", "#6a6a5a", "#16231c"];
const CIPRESTE = ["#3a5a3a", "#2f5a3a", "#2e3a36", "#0a140f"];

/** Ilha baixa no horizonte, com casinhas brancas de cúpula azul. */
function ilha(ctx: Ctx, x: number, base: number, larg: number, alt: number, cor: string, casas: number, noite: number) {
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.quadraticCurveTo(x + larg * 0.2, base - alt * 1.1, x + larg * 0.45, base - alt);
  ctx.quadraticCurveTo(x + larg * 0.75, base - alt * 0.9, x + larg, base);
  ctx.fill();
  for (let i = 0; i < casas; i++) {
    const cx = x + larg * (0.25 + (i / Math.max(1, casas)) * 0.5);
    const cy = base - alt * (0.75 - Math.abs(i - casas / 2) * 0.08);
    ctx.fillStyle = noite > 0.5 ? "#f0c878" : "#ffffff";
    ctx.globalAlpha = noite > 0.5 ? 0.8 : 0.9;
    ctx.fillRect(cx - 3, cy - 3, 6, 5);
    if (i % 3 === 1 && noite <= 0.5) {
      ctx.fillStyle = "#3a6ab8";
      ctx.beginPath();
      ctx.arc(cx, cy - 3, 2.6, Math.PI, TAU);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

/** Barco à vela balançando: casco, mastro e a vela que enche e esvazia com o vento. */
function veleiro(ctx: Ctx, x: number, y: number, s: number, t: number, casco: string, vela: string) {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 1.8 + x * 0.01) * 1.5 * s);
  ctx.rotate(Math.sin(t * 1.3 + x * 0.02) * 0.05);
  ctx.fillStyle = casco;
  ctx.beginPath();
  ctx.moveTo(-14 * s, -2 * s);
  ctx.lineTo(14 * s, -2 * s);
  ctx.quadraticCurveTo(10 * s, 4 * s, -10 * s, 4 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(-0.8 * s, -26 * s, 1.6 * s, 24 * s);
  const enche = 4 + Math.sin(t * 2 + x) * 1.5;
  ctx.fillStyle = vela;
  ctx.beginPath();
  ctx.moveTo(1 * s, -25 * s);
  ctx.quadraticCurveTo((8 + enche) * s, -14 * s, 12 * s, -4 * s);
  ctx.lineTo(1 * s, -4 * s);
  ctx.closePath();
  ctx.moveTo(-1 * s, -22 * s);
  ctx.quadraticCurveTo((-6 - enche * 0.5) * s, -12 * s, -9 * s, -4 * s);
  ctx.lineTo(-1 * s, -4 * s);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** O Partenon: três degraus, oito colunas com sombra, o entablamento e o frontão com o tímpano em sombra. */
function partenon(ctx: Ctx, x: number, base: number, s: number, cor: string, sombra: string) {
  ctx.fillStyle = cor;
  ctx.fillRect(x - 10 * s, base - 4 * s, 140 * s, 4 * s);
  ctx.fillRect(x - 6 * s, base - 8 * s, 132 * s, 4 * s);
  ctx.fillRect(x - 2 * s, base - 12 * s, 124 * s, 4 * s);
  for (let i = 0; i < 8; i++) {
    const cx = x + 4 * s + i * 15.4 * s;
    ctx.fillStyle = cor;
    ctx.fillRect(cx, base - 46 * s, 8 * s, 34 * s);
    ctx.fillStyle = sombra;
    ctx.fillRect(cx + 5.5 * s, base - 46 * s, 2.5 * s, 34 * s);
  }
  ctx.fillStyle = cor;
  ctx.fillRect(x - 4 * s, base - 54 * s, 128 * s, 8 * s);
  ctx.fillStyle = sombra;
  ctx.fillRect(x - 4 * s, base - 49 * s, 128 * s, 1.5 * s);
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(x - 6 * s, base - 54 * s);
  ctx.lineTo(x + 60 * s, base - 72 * s);
  ctx.lineTo(x + 126 * s, base - 54 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = sombra;
  ctx.beginPath();
  ctx.moveTo(x + 8 * s, base - 56 * s);
  ctx.lineTo(x + 60 * s, base - 69 * s);
  ctx.lineTo(x + 112 * s, base - 56 * s);
  ctx.closePath();
  ctx.fill();
}

/** Oliveira: tronco torto e a copa prateada em tufos, que balança devagar. */
function oliveira(ctx: Ctx, x: number, base: number, s: number, cor: string, tronco: string, t: number) {
  ctx.save();
  ctx.translate(x, base);
  ctx.rotate(Math.sin(t * 0.9 + x * 0.03) * 0.03);
  ctx.fillStyle = tronco;
  ctx.beginPath();
  ctx.moveTo(-2 * s, 0);
  ctx.quadraticCurveTo(-4 * s, -10 * s, 1 * s, -18 * s);
  ctx.lineTo(3 * s, -17 * s);
  ctx.quadraticCurveTo(0, -9 * s, 3 * s, 0);
  ctx.fill();
  ctx.fillStyle = cor;
  ctx.beginPath();
  for (const [dx, dy, rx, ry] of [[-8, -22, 10, 7], [6, -25, 11, 8], [-1, -31, 9, 6], [12, -19, 7, 5]]) {
    ctx.moveTo((dx + rx) * s, dy * s);
    ctx.ellipse(dx * s, dy * s, rx * s, ry * s, 0, 0, TAU);
  }
  ctx.fill();
  ctx.restore();
}

/** Cipreste: a chama verde comprida, que verga com o vento. */
function cipreste(ctx: Ctx, x: number, base: number, s: number, cor: string, t: number) {
  const verga = Math.sin(t * 1.1 + x * 0.05) * 2 * s;
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(x - 6 * s, base);
  ctx.quadraticCurveTo(x - 8 * s, base - 30 * s, x + verga, base - 56 * s);
  ctx.quadraticCurveTo(x + 8 * s, base - 30 * s, x + 6 * s, base);
  ctx.fill();
}

const CLASSICO: Cenario = {
  decor(ctx, w, h, off, tod, t, tema, surpresa) {
    const p = tema.paleta;
    const noite = noiteDe(tod);
    // o sol nasce, cruza e se põe; de noite, a lua
    const xAstro = w * 0.78;
    const yAstro = h * (tod < 1 ? 0.45 - tod * 0.2 : tod < 2 ? 0.25 : 0.25 + (tod - 2) * 0.25);
    if (noite > 0.5) lua(ctx, xAstro, h * 0.2, 22);
    else sol(ctx, xAstro, yAstro, 30, tod > 1.6 ? "#ffd8a0" : "#fff2c4", "rgba(255,236,180,0.45)");
    // nuvens que o vento leva
    repetir(w, off * 0.08 + t * 6, 330, (x, k) => {
      if (variar(k, 7, 4) === 0) return;
      const s = 0.7 + variar(k, 11, 4) * 0.15;
      nuvemFofa(ctx, x, 70 + variar(k, 17, 5) * 22 + Math.sin(t * 0.4 + k) * 3, s, "rgba(255,255,255,0.6)", "rgba(255,255,255,0.35)");
    });
    // o mar, com o brilho do sol (ou da lua) piscando embaixo dele
    const yMar = h - 150;
    mar(ctx, w, yMar, 110, off * 0.15, ciclo(MAR_EGEU, tod), ciclo(ESPUMA_EGEU, tod), t);
    ctx.fillStyle = noite > 0.5 ? "#e8e4ff" : "#fff4d0";
    for (let i = 0; i < 14; i++) {
      const y = yMar + 6 + i * 7;
      const larg = 6 + i * 2.2 + Math.sin(t * 3 + i * 1.7) * 4;
      ctx.globalAlpha = (0.55 - i * 0.03) * (0.5 + 0.5 * Math.abs(Math.sin(t * 2.2 + i * 2.3)));
      ctx.fillRect(xAstro - larg / 2 + Math.sin(t + i) * 6, y, larg, 1.6);
    }
    ctx.globalAlpha = 1;
    // as ilhas no horizonte
    repetir(w, off * 0.05, 640, (x, k) => {
      if (variar(k, 5, 3) === 0) return;
      ilha(ctx, x + variar(k, 19, 120), yMar + 2, 120 + variar(k, 23, 4) * 40, 14 + variar(k, 29, 4) * 6, ciclo(ILHA, tod), 3 + variar(k, 31, 4), noite);
    });
    // os veleiros, que andam sozinhos além do mundo
    repetir(w, off * 0.12 + t * 10, 520, (x, k) => {
      if (variar(k, 41, 3) === 0) return;
      veleiro(ctx, x + variar(k, 43, 200), yMar + 22 + variar(k, 47, 4) * 14, 0.8 + variar(k, 53, 3) * 0.2, t, noite > 0.5 ? "#1a2238" : "#6a4a2a", noite > 0.5 ? "#8a90a8" : "#fbf6ea");
    });
    // o Pégaso da surpresa voa no céu, atrás das gaivotas
    surpresa?.();
    // gaivotas planando e batendo as asas
    ctx.fillStyle = noite > 0.5 ? "#c8d0e0" : "#ffffff";
    for (let i = 0; i < 6; i++) {
      const x = mod(i * 263 - t * (24 + i * 4) - off * 0.1, w + 200) - 100;
      const y = 120 + ((i * 71) % 150) + Math.sin(t * 0.9 + i * 2) * 10;
      ave(ctx, x, y, 0.6 + (i % 3) * 0.15, Math.sin(t * (5 + i) + i) * (i % 2 ? 1 : 0.4));
    }
    // a colina da Acrópole, com o Partenon no rochedo
    colinas(ctx, w, h - 40, off * 0.15, ciclo(p.longe, tod), 70, 26, 0.006, 1);
    const oAcro = off * 0.3;
    repetir(w, oAcro, 900, (x) => {
      const cx = x + 200;
      const base = h - 96;
      ctx.fillStyle = ciclo(p.perto, tod);
      ctx.beginPath();
      ctx.moveTo(cx - 70, h - 40);
      ctx.lineTo(cx - 40, base + 4);
      ctx.lineTo(cx + 150, base + 2);
      ctx.lineTo(cx + 190, h - 40);
      ctx.fill();
      partenon(ctx, cx - 8, base + 2, 1.1, ciclo(MARMORE, tod), ciclo(MARMORE_SOMBRA, tod));
    });
    // a colina da frente, com oliveiras e ciprestes
    const o = off * 0.35;
    colinas(ctx, w, h - 40, o, ciclo(p.perto, tod), 40, 14, 0.012, 4);
    const corOliva = ciclo(OLIVEIRA, tod);
    const corCipreste = ciclo(CIPRESTE, tod);
    const tronco = ciclo(p.perto, tod);
    repetir(w, o, 62, (x, k) => {
      const tipo = variar(k, 59, 7);
      if (tipo > 4) return;
      const px = x + variar(k, 61, 30);
      const y = alturaColina(px, h - 40, o, 40, 14, 0.012, 4) + 4;
      if (tipo < 2) cipreste(ctx, px, y, 1.1 + variar(k, 67, 3) * 0.2, corCipreste, t);
      else oliveira(ctx, px, y, 1.2 + variar(k, 71, 3) * 0.2, corOliva, tronco, t);
    });
  },
};

// ---------------------------------------------------------------------------
// Fofo: o sol sorridente, as nuvens com carinha, o balão, corações subindo, árvores-pirulito, flores e borboletas
// ---------------------------------------------------------------------------
const PIRULITO = ["#ff8fb8", "#ffd36b", "#8fd8ff", "#b48aff", "#7ae0b0"];

function solFofo(ctx: Ctx, x: number, y: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * 0.2);
  ctx.fillStyle = "#ffe68a";
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    ctx.moveTo(Math.cos(a - 0.12) * 34, Math.sin(a - 0.12) * 34);
    ctx.lineTo(Math.cos(a) * (46 + Math.sin(t * 3 + i) * 3), Math.sin(a) * (46 + Math.sin(t * 3 + i) * 3));
    ctx.lineTo(Math.cos(a + 0.12) * 34, Math.sin(a + 0.12) * 34);
  }
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#fff2a8";
  ctx.beginPath();
  ctx.arc(x, y, 30, 0, TAU);
  ctx.fill();
  // a carinha: olhos que piscam de vez em quando e o sorriso
  const pisca = Math.sin(t * 1.7) > 0.96;
  ctx.fillStyle = "#7a4a3a";
  ctx.strokeStyle = "#7a4a3a";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (const ox of [-10, 10]) {
    if (pisca) {
      ctx.moveTo(x + ox - 3, y - 4);
      ctx.lineTo(x + ox + 3, y - 4);
    } else {
      ctx.moveTo(x + ox + 3, y - 4);
      ctx.arc(x + ox, y - 4, 3, 0, TAU);
    }
  }
  if (pisca) ctx.stroke();
  else ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y + 3, 8, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,120,150,0.4)";
  ctx.beginPath();
  ctx.ellipse(x - 17, y + 5, 5, 3, 0, 0, TAU);
  ctx.ellipse(x + 17, y + 5, 5, 3, 0, 0, TAU);
  ctx.fill();
}

/** A lua crescente dormindo, com os "z" subindo. */
function luaFofa(ctx: Ctx, x: number, y: number, t: number) {
  ctx.fillStyle = "#fff6c8";
  ctx.beginPath();
  ctx.arc(x, y, 26, 0, TAU);
  ctx.arc(x + 12, y - 8, 22, 0, TAU, true);
  ctx.fill("evenodd");
  ctx.strokeStyle = "#8a6a7a";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(x - 12, y + 2, 3, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();
  ctx.fillStyle = "#fff6c8";
  ctx.font = "800 14px system-ui, sans-serif";
  for (let i = 0; i < 3; i++) {
    const f = mod(t * 0.3 + i / 3, 1);
    ctx.globalAlpha = 1 - f;
    ctx.fillText("z", x + 10 + f * 26, y - 20 - f * 34 - i * 2);
  }
  ctx.globalAlpha = 1;
}

/** Balão de ar quente de gomos coloridos, com a cesta, subindo e descendo devagar. */
function balao(ctx: Ctx, x: number, y: number, s: number, t: number) {
  const sobe = Math.sin(t * 0.8 + x * 0.01) * 6;
  ctx.save();
  ctx.translate(x, y + sobe);
  const cores = ["#ff9ac0", "#fff1a8", "#9fe3c0", "#a8dcff"];
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = cores[i]!;
    ctx.beginPath();
    ctx.ellipse((-15 + i * 10) * s * 0.75, 0, (13 - Math.abs(i - 1.5) * 3) * s, 30 * s, 0, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(160,110,140,0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-10 * s, 26 * s);
  ctx.lineTo(-6 * s, 40 * s);
  ctx.moveTo(10 * s, 26 * s);
  ctx.lineTo(6 * s, 40 * s);
  ctx.stroke();
  ctx.fillStyle = "#c8946a";
  ctx.fillRect(-7 * s, 40 * s, 14 * s, 9 * s);
  ctx.restore();
}

function coracao(ctx: Ctx, x: number, y: number, s: number) {
  ctx.moveTo(x, y + 3 * s);
  ctx.bezierCurveTo(x - 7 * s, y - 2 * s, x - 4 * s, y - 8 * s, x, y - 4 * s);
  ctx.bezierCurveTo(x + 4 * s, y - 8 * s, x + 7 * s, y - 2 * s, x, y + 3 * s);
}

const FOFO: Cenario = {
  decor(ctx, w, h, off, tod, t, tema, surpresa) {
    const p = tema.paleta;
    const noite = noiteDe(tod);
    if (noite > 0.5) luaFofa(ctx, w * 0.42, h * 0.17, t);
    else solFofo(ctx, w * 0.42, h * 0.17, t);
    // o arco-íris, com brilhinhos correndo por ele
    const cores = ["#ff9aa2", "#ffdac1", "#e2f0cb", "#b5ead7", "#c7ceea"];
    const ax = w * 0.7 - mod(off * 0.05, 50);
    ctx.lineWidth = 12;
    cores.forEach((c, i) => {
      ctx.strokeStyle = c;
      ctx.globalAlpha = (noite > 0.5 ? 0.22 : 0.55) + Math.sin(t * 1.5 + i) * 0.05;
      ctx.beginPath();
      ctx.arc(ax, h - 40, 260 - i * 12, Math.PI, TAU);
      ctx.stroke();
    });
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 6; i++) {
      const a = Math.PI + mod(t * 0.12 + i / 6, 1) * Math.PI;
      const r = 236 + Math.sin(t * 2 + i) * 18;
      ctx.globalAlpha = 0.8 * Math.sin(mod(t * 0.12 + i / 6, 1) * Math.PI);
      estrelinha(ctx, ax + Math.cos(a) * r, h - 40 + Math.sin(a) * r, 4);
    }
    ctx.globalAlpha = 1;
    // nuvens fofas, algumas com carinha, que flutuam
    repetir(w, off * 0.2 + t * 5, 260, (x, k) => {
      if (variar(k, 3, 5) === 0) return;
      const y = 70 + variar(k, 37, 6) * 20 + Math.sin(t * 0.9 + k * 1.3) * 5;
      nuvemFofa(ctx, x, y, 0.85 + variar(k, 13, 3) * 0.15, "rgba(255,255,255,0.92)", "#ffffff", variar(k, 17, 3) === 0);
    });
    // o balão
    repetir(w, off * 0.1 + t * 8, 1300, (x, k) => balao(ctx, x + variar(k, 7, 300), 130 + variar(k, 11, 4) * 20, 0.9, t));
    surpresa?.();
    // corações e estrelinhas subindo devagar
    for (let i = 0; i < 9; i++) {
      const f = mod(t * 0.07 + i / 9, 1);
      const x = mod(i * 157 - off * 0.25, w + 40) - 20 + Math.sin(t + i) * 10;
      const y = h - 90 - f * (h - 160);
      ctx.globalAlpha = Math.sin(f * Math.PI) * 0.7;
      ctx.fillStyle = i % 2 ? "#ffb8d4" : "#fff1a8";
      ctx.beginPath();
      if (i % 2) coracao(ctx, x, y, 1.1);
      else estrelinha(ctx, x, y, 5, false);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    colinas(ctx, w, h - 40, off * 0.2, ciclo(p.longe, tod), 80, 30, 0.007, 2);
    // a colina da frente, com árvores-pirulito, flores e borboletas
    const o = off * 0.4;
    colinas(ctx, w, h - 40, o, ciclo(p.perto, tod), 45, 20, 0.014, 5);
    repetir(w, o, 58, (x, k) => {
      const tipo = variar(k, 19, 6);
      const px = x + variar(k, 23, 24);
      const y = alturaColina(px, h - 40, o, 45, 20, 0.014, 5) + 3;
      if (tipo === 0) {
        // pirulito em espiral, num palitinho
        const cor = PIRULITO[variar(k, 29, PIRULITO.length)]!;
        const r = 16 + variar(k, 31, 3) * 4;
        const haste = 40 + variar(k, 33, 3) * 8;
        ctx.fillStyle = "#f4e6d6";
        ctx.fillRect(px - 2, y - haste, 4, haste);
        ctx.fillStyle = cor;
        ctx.beginPath();
        ctx.arc(px, y - haste - r, r, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let a = 0; a < 12; a += 0.4) ctx.lineTo(px + Math.cos(a + t * 0.8) * a * (r / 13), y - haste - r + Math.sin(a + t * 0.8) * a * (r / 13));
        ctx.stroke();
      } else if (tipo < 4) {
        // flor que balança
        const ang = Math.sin(t * 1.6 + k) * 0.15;
        const fx = px + Math.sin(ang) * 16;
        const fy = y - Math.cos(ang) * 16;
        ctx.strokeStyle = "#7ac89a";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px, y);
        ctx.lineTo(fx, fy);
        ctx.stroke();
        ctx.fillStyle = PIRULITO[variar(k, 37, PIRULITO.length)]!;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * TAU + t * 0.3;
          ctx.moveTo(fx + Math.cos(a) * 5.5 + 3.6, fy + Math.sin(a) * 5.5);
          ctx.arc(fx + Math.cos(a) * 5.5, fy + Math.sin(a) * 5.5, 3.6, 0, TAU);
        }
        ctx.fill();
        ctx.fillStyle = "#fff6a8";
        ctx.beginPath();
        ctx.arc(fx, fy, 3, 0, TAU);
        ctx.fill();
      }
    });
    // borboletas
    for (let i = 0; i < 4; i++) {
      const x = mod(i * 311 + t * (18 + i * 5) - off * 0.4, w + 100) - 50;
      const y = h - 90 - Math.abs(Math.sin(t * 0.7 + i * 2)) * 50;
      const bate = Math.abs(Math.sin(t * 12 + i));
      ctx.fillStyle = PIRULITO[(i + 1) % PIRULITO.length]!;
      ctx.beginPath();
      for (const l of [-1, 1]) {
        ctx.moveTo(x, y);
        ctx.ellipse(x + l * 4 * bate, y - 2, 4 * bate + 0.6, 5, l * 0.4, 0, TAU);
        ctx.moveTo(x, y);
        ctx.ellipse(x + l * 3 * bate, y + 3, 2.6 * bate + 0.5, 3, -l * 0.4, 0, TAU);
      }
      ctx.fill();
    }
  },
};

/** Estrela de cinco pontas; `fechar` falso deixa o caminho aberto para outro fill juntar várias. */
function estrelinha(ctx: Ctx, x: number, y: number, r: number, sozinha = true) {
  if (sozinha) ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * TAU;
    const rr = i % 2 ? r * 0.45 : r;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  if (sozinha) ctx.fill();
}

// ---------------------------------------------------------------------------
// Retrofuturista: as estrelas, a estrela cadente, o sol de faixas que descem, a cidade neon, as montanhas em
// arame e as palmeiras; no chão, a grade que corre para quem olha
// ---------------------------------------------------------------------------
const RETRO: Cenario = {
  decor(ctx, w, h, off, _tod, t, _tema, surpresa) {
    estrelasFixas(ctx, w, h, t, "#ffffff", 70, 0.5);
    // a estrela cadente, de tempos em tempos
    const ciclo6 = mod(t, 7);
    if (ciclo6 < 0.8) {
      const f = ciclo6 / 0.8;
      const sx = w * (0.15 + variar(Math.floor(t / 7), 3, 60) / 100) + f * 260;
      const sy = 40 + f * 90 + variar(Math.floor(t / 7), 5, 60);
      const g = ctx.createLinearGradient(sx - 90, sy - 30, sx, sy);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(1, "rgba(255,255,255,0.9)");
      ctx.strokeStyle = g;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx - 90, sy - 30);
      ctx.lineTo(sx, sy);
      ctx.stroke();
    }
    // o sol: o brilho, o meio-disco em degradê e as faixas que descem
    const cx = w * 0.55;
    const cy = h - 170;
    const halo = ctx.createRadialGradient(cx, cy - 30, 60, cx, cy - 30, 260);
    halo.addColorStop(0, "rgba(255,90,170,0.35)");
    halo.addColorStop(1, "rgba(255,90,170,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(cx - 260, cy - 290, 520, 400);
    const g = ctx.createLinearGradient(0, cy - 120, 0, cy + 10);
    g.addColorStop(0, "#fff36b");
    g.addColorStop(0.55, "#ff9a4a");
    g.addColorStop(1, "#ff3f8e");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 120, Math.PI, TAU);
    ctx.fill();
    ctx.fillStyle = "#1b0b40";
    const desce = mod(t * 6, 14);
    for (let i = 0; i < 7; i++) {
      const y = cy - 64 + i * 14 + desce;
      if (y > cy) continue;
      ctx.fillRect(cx - 130, y, 260, 1.5 + ((y - (cy - 64)) / 64) * 5);
    }
    surpresa?.();
    // a cidade neon ao longe, com as janelas acesas
    const oCidade = off * 0.04;
    const luzes: [number, number, string][] = [];
    ctx.fillStyle = "#2a0a52";
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    repetir(w, oCidade, 46, (x, k) => {
      if (variar(k, 7, 5) === 0) return;
      const alt = 14 + variar(k, 11, 6) * 9;
      const larg = 26 + variar(k, 13, 3) * 8;
      ctx.rect(x, h - 84 - alt, larg, alt + 10);
      for (let j = 0; j < 6; j++) if (variar(k * 9 + j, 17, 4) === 0) luzes.push([x + 4 + variar(k + j, 19, Math.max(1, larg - 8)), h - 80 - alt + variar(k * 3 + j, 23, Math.max(1, alt - 6)), j % 2 ? "#27e0ff" : "#ff3fd1"]);
    });
    ctx.fill();
    ctx.globalAlpha = 1;
    for (const [lx, ly, cor] of luzes) {
      ctx.fillStyle = cor;
      ctx.globalAlpha = 0.5 + 0.4 * Math.sin(t * 2 + lx);
      ctx.fillRect(lx, ly, 2.5, 2.5);
    }
    ctx.globalAlpha = 1;
    // as montanhas em arame: a de trás roxa, a da frente com a grade dentro
    montanhasArame(ctx, w, h - 40, off * 0.08, 150, "#2a0a4a", "rgba(176,76,255,0.55)", false, t);
    montanhasArame(ctx, w, h - 40, off * 0.16, 105, "#12042a", "#ff3fd1", true, t);
    // as palmeiras em silhueta, com a borda neon
    repetir(w, off * 0.5, 430, (x, k) => {
      if (variar(k, 31, 3) === 0) return;
      const px = x + variar(k, 37, 160);
      const alt = 120 + variar(k, 41, 4) * 20;
      palmeira(ctx, px, h - 40, alt, "#0b0118", t, 0.1 + variar(k, 43, 3) * 0.04);
    });
  },
  chao(ctx, w, h, y, off) {
    ctx.fillStyle = "#0b0118";
    ctx.fillRect(0, y, w, h - y);
    // o brilho do horizonte
    const g = ctx.createLinearGradient(0, y, 0, y + 14);
    g.addColorStop(0, "rgba(255,63,209,0.55)");
    g.addColorStop(1, "rgba(255,63,209,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, y, w, 14);
    ctx.strokeStyle = "#ff3fd1";
    ctx.lineCap = "butt";
    const cx = w / 2;
    const linhas = () => {
      ctx.beginPath();
      // as horizontais vêm vindo para quem olha (perspectiva: ficam mais espaçadas perto)
      const fase = mod(off * 0.012, 1);
      for (let i = 0; i < 6; i++) {
        const z = (i + fase) / 6;
        const yy = y + 2 + (h - y) * z * z;
        ctx.moveTo(0, yy);
        ctx.lineTo(w, yy);
      }
      for (let k = -14; k <= 14; k++) {
        const x = cx + k * 60 - mod(off, 60);
        ctx.moveTo(x, y);
        ctx.lineTo(cx + (x - cx) * 3, h);
      }
    };
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 5;
    linhas();
    ctx.stroke();
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 1.5;
    linhas();
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
};

/** Montanhas em arame (synthwave): picos que se repetem pelo mundo, a borda neon e, com `grade`, as linhas por dentro. */
function montanhasArame(ctx: Ctx, w: number, base: number, o: number, alt: number, cor: string, neon: string, grade: boolean, t: number) {
  const esp = 70;
  const picos: [number, number][] = [];
  repetir(w, o, esp, (x, k) => picos.push([x, base - 18 - variar(k, 7 + Math.round(alt), 6) * (alt / 6) - variar(k, 3, 3) * 6]));
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(picos[0]![0], base);
  for (const [x, y] of picos) ctx.lineTo(x, y);
  ctx.lineTo(picos[picos.length - 1]![0], base);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.strokeStyle = neon;
  ctx.lineWidth = 1.4;
  if (grade) {
    // de cada pico, linhas até o pé dos vizinhos (a malha de triângulos)
    ctx.globalAlpha = 0.35 + 0.1 * Math.sin(t * 2);
    ctx.beginPath();
    for (let i = 1; i < picos.length - 1; i++) {
      const [x, y] = picos[i]!;
      ctx.moveTo(x, y);
      ctx.lineTo((x + picos[i - 1]![0]) / 2, base);
      ctx.moveTo(x, y);
      ctx.lineTo((x + picos[i + 1]![0]) / 2, base);
      ctx.moveTo(x, y);
      ctx.lineTo(x, base);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.beginPath();
  for (const [x, y] of picos) ctx.lineTo(x, y);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Steampunk: o sol de latão na fumaça, as engrenagens grandes, o dirigível, as fábricas com chaminés fumegando,
// a torre do relógio e os canos que soltam vapor
// ---------------------------------------------------------------------------
const FUMACA_STEAM = ["#d9c8b0", "#e0d4c0", "#c8a890", "#5a4a3a"];
const TIJOLO = ["#5a3a28", "#6a4a32", "#4a2c20", "#1c120c"];
const LATAO_FUNDO = ["#8a6a3a", "#9a7a48", "#7a5232", "#2a1e12"];

/** O dirigível: o balão com os gomos, as aletas, a gôndola e a hélice girando. */
function dirigivel(ctx: Ctx, x: number, y: number, s: number, t: number, cor: string, escuro: string) {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 0.7) * 4);
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.ellipse(0, 0, 70 * s, 22 * s, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = escuro;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (const f of [-0.5, 0, 0.5]) ctx.ellipse(0, 0, 70 * s, 22 * s * (1 - Math.abs(f)), 0, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = escuro;
  ctx.beginPath();
  ctx.moveTo(-62 * s, -6 * s);
  ctx.lineTo(-84 * s, -20 * s);
  ctx.lineTo(-78 * s, 0);
  ctx.lineTo(-84 * s, 20 * s);
  ctx.lineTo(-62 * s, 6 * s);
  ctx.fill();
  ctx.fillRect(-20 * s, 22 * s, 40 * s, 10 * s);
  ctx.strokeStyle = escuro;
  ctx.beginPath();
  ctx.moveTo(-16 * s, 20 * s);
  ctx.lineTo(-18 * s, 23 * s);
  ctx.moveTo(16 * s, 20 * s);
  ctx.lineTo(18 * s, 23 * s);
  ctx.stroke();
  // janelinhas acesas e a hélice
  ctx.fillStyle = "#ffd27a";
  for (let i = 0; i < 4; i++) ctx.fillRect((-15 + i * 9) * s, 25 * s, 4 * s, 4 * s);
  ctx.fillStyle = escuro;
  ctx.beginPath();
  ctx.ellipse(-24 * s, 27 * s, 2 * s, 9 * s * Math.abs(Math.cos(t * 14)), 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** Fábrica de tijolo com telhado em dentes de serra, janelas que acendem e a chaminé. Devolve a boca da chaminé. */
function fabrica(ctx: Ctx, x: number, base: number, larg: number, alt: number, cor: string, acesas: number, k: number): [number, number] {
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.lineTo(x, base - alt);
  const dentes = Math.max(2, Math.round(larg / 30));
  for (let i = 0; i < dentes; i++) {
    const x0 = x + (i * larg) / dentes;
    ctx.lineTo(x0 + larg / dentes, base - alt - 16);
    ctx.lineTo(x0 + larg / dentes, base - alt);
  }
  ctx.lineTo(x + larg, base);
  ctx.closePath();
  const chx = x + larg * (0.2 + variar(k, 3, 5) * 0.12);
  const cht = alt + 50 + variar(k, 5, 3) * 20;
  ctx.rect(chx, base - cht, 14, cht);
  ctx.rect(chx - 3, base - cht, 20, 6);
  ctx.fill();
  if (acesas > 0) {
    ctx.fillStyle = "#ffb44a";
    ctx.globalAlpha = acesas * 0.85;
    ctx.beginPath();
    for (let i = 0; i < Math.floor(larg / 18); i++)
      for (let j = 0; j < 2; j++) if (variar(k * 13 + i * 3 + j, 7, 3) !== 0) ctx.rect(x + 6 + i * 18, base - alt + 10 + j * 18, 8, 10);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  return [chx + 7, base - cht];
}

/** A torre do relógio, com os ponteiros andando e o pêndulo na janela. */
function torreRelogio(ctx: Ctx, x: number, base: number, cor: string, t: number) {
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.rect(x - 22, base - 210, 44, 210);
  ctx.moveTo(x - 28, base - 210);
  ctx.lineTo(x, base - 260);
  ctx.lineTo(x + 28, base - 210);
  ctx.closePath();
  ctx.rect(x - 1, base - 280, 2, 22);
  ctx.fill();
  const cy = base - 176;
  ctx.fillStyle = "#f0e0b8";
  ctx.beginPath();
  ctx.arc(x, cy, 16, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#3a2410";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, cy);
  ctx.lineTo(x + Math.sin(t * 0.6) * 12, cy - Math.cos(t * 0.6) * 12);
  ctx.moveTo(x, cy);
  ctx.lineTo(x + Math.sin(t * 0.05) * 8, cy - Math.cos(t * 0.05) * 8);
  ctx.stroke();
  ctx.fillStyle = "#ffb44a";
  ctx.globalAlpha = 0.6;
  ctx.fillRect(x - 8, base - 140, 16, 40);
  ctx.globalAlpha = 1;
  const p = Math.sin(t * 2.4) * 0.4;
  ctx.strokeStyle = cor;
  ctx.beginPath();
  ctx.moveTo(x, base - 138);
  ctx.lineTo(x + Math.sin(p) * 28, base - 138 + Math.cos(p) * 28);
  ctx.stroke();
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.arc(x + Math.sin(p) * 30, base - 138 + Math.cos(p) * 30, 4, 0, TAU);
  ctx.fill();
}

const STEAMPUNK: Cenario = {
  decor(ctx, w, h, off, tod, t, tema, surpresa) {
    const p = tema.paleta;
    const noite = noiteDe(tod);
    // o sol de latão atrás da fumaça
    const sx = w * 0.7;
    const sy = h * 0.24;
    ctx.globalAlpha = 0.75 - noite * 0.5;
    sol(ctx, sx, sy, 34, "#e8c070", "rgba(232,192,112,0.35)");
    ctx.strokeStyle = "rgba(120,80,30,0.5)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sx, sy, 26, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // as faixas de fumaça no céu, correndo devagar
    const fum = ciclo(FUMACA_STEAM, tod);
    ctx.fillStyle = fum;
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = 0.16;
      ctx.beginPath();
      const y0 = 90 + i * 70;
      for (let x = 0; x <= w + 20; x += 20) ctx.lineTo(x, y0 + Math.sin((x + off * 0.05 + t * 10 * (i + 1)) * 0.01 + i) * 14);
      for (let x = w + 20; x >= 0; x -= 20) ctx.lineTo(x, y0 + 26 + Math.sin((x + off * 0.05 + t * 8) * 0.013 + i * 2) * 10);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // as engrenagens grandes ao fundo, em pares que se engatam (giram ao contrário uma da outra)
    const latao = ciclo(LATAO_FUNDO, tod);
    ctx.globalAlpha = 0.55;
    repetir(w, off * 0.1, 520, (x, k) => {
      const r = 46 + variar(k, 7, 3) * 14;
      const y = h - 230 + variar(k, 11, 3) * 30;
      const dentes = Math.round(r / 5);
      engrenagemRaios(ctx, x, y, r, dentes, t * 0.3 * (k % 2 ? 1 : -1), latao);
      const r2 = r * 0.6;
      const d2 = Math.round(r2 / 5);
      engrenagemRaios(ctx, x + r + r2 + 2, y + r * 0.35, r2, d2, (-t * 0.3 * (k % 2 ? 1 : -1) * dentes) / d2 + 0.2, latao);
    });
    ctx.globalAlpha = 1;
    // o dirigível
    // o dirigível aponta para a direita: anda contra o mundo, para não voar de ré
    repetir(w, off * 0.06 - t * 22, 1500, (x, k) => dirigivel(ctx, x + variar(k, 3, 400), 120 + variar(k, 5, 3) * 30, 0.9, t, ciclo(["#8a5a3a", "#9a6a42", "#7a4a32", "#2a1c12"], tod), ciclo(["#4a2c1a", "#5a3a22", "#3a2014", "#120a06"], tod)));
    colinas(ctx, w, h - 40, off * 0.2, ciclo(p.longe, tod), 60, 18, 0.008, 3);
    // o autômato da surpresa anda no horizonte, na frente das colinas e atrás das fábricas
    surpresa?.();
    // a torre do relógio
    repetir(w, off * 0.3, 1400, (x) => torreRelogio(ctx, x + 300, h - 40, ciclo(p.perto, tod), t));
    // as fábricas, com a fumaça das chaminés
    const acesas = Math.max(noite, tod > 1.6 && tod < 2.6 ? (tod - 1.6) * 0.8 : 0);
    const bocas: [number, number, number][] = [];
    repetir(w, off * 0.4, 260, (x, k) => {
      if (variar(k, 23, 5) === 0) return;
      const larg = 110 + variar(k, 29, 4) * 25;
      const alt = 60 + variar(k, 31, 4) * 18;
      const [bx, by] = fabrica(ctx, x + variar(k, 37, 40), h - 40, larg, alt, ciclo(TIJOLO, tod), acesas, k);
      bocas.push([bx, by, k]);
    });
    for (const [bx, by, k] of bocas) fumaca(ctx, bx, by, t, fum, 1, 6, k);
  },
  chao(ctx, w, h, y, off, tema) {
    const p = tema.paleta;
    ctx.fillStyle = p.chao;
    ctx.fillRect(0, y, w, h - y);
    // o cano de latão no chão, com as juntas e as válvulas que soltam vapor
    const g = ctx.createLinearGradient(0, y + 4, 0, y + 18);
    g.addColorStop(0, "#e0b766");
    g.addColorStop(0.5, "#b5863a");
    g.addColorStop(1, "#6a4a1a");
    ctx.fillStyle = g;
    ctx.fillRect(0, y + 4, w, 14);
    ctx.fillStyle = "#5a3a12";
    ctx.beginPath();
    for (let x = -mod(off, 120); x < w + 120; x += 120) ctx.rect(x, y + 2, 8, 18);
    ctx.fill();
    ctx.fillStyle = "#f0d9a8";
    for (let x = -mod(off, 120); x < w + 120; x += 120) {
      ctx.beginPath();
      ctx.arc(x + 4, y + 6, 1.4, 0, TAU);
      ctx.arc(x + 4, y + 16, 1.4, 0, TAU);
      ctx.fill();
    }
    // o vapor que escapa de algumas juntas, em sopros
    ctx.fillStyle = "#f4ece0";
    for (let x = -mod(off, 360); x < w + 360; x += 360) {
      // o chão não recebe o relógio: o sopro anda com o mundo (que nunca para durante o jogo)
      const f = mod(off * 0.006 + (x + mod(off, 360)) * 0.0013, 1);
      ctx.globalAlpha = 0.6 * (1 - f) * (f < 0.6 ? 1 : 0.5);
      ctx.beginPath();
      ctx.arc(x + 4 - f * 20, y - f * 30, 4 + f * 10, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
};

// ---------------------------------------------------------------------------
// Noir: os refletores, a cidade em duas camadas com janelas que acendem e apagam, o letreiro de neon que falha,
// os postes com a chuva no facho, o carro passando e o asfalto molhado com as poças
// ---------------------------------------------------------------------------
const LONGE_NOIR = ["#2e2e2e", "#3a3a3a", "#2a2a2a", "#161616"];
const PERTO_NOIR = ["#1e1e1e", "#2a2a2a", "#191919", "#0a0a0a"];

/**
 * Silhueta de cidade do Noir: prédios de larguras e alturas variadas (pelo lugar no mundo), alguns com o topo em
 * degraus, antena ou caixa-d'água, e um vão de vez em quando. Com `janelas`, poucas acesas, que acendem e apagam.
 */
function skylineNoir(ctx: Ctx, w: number, base: number, o: number, esp: number, cor: string, janelas: boolean, semente: number, t: number) {
  const luzes: [number, number, number][] = [];
  ctx.fillStyle = cor;
  ctx.beginPath();
  repetir(w, o, esp, (x0, k) => {
    if (variar(k, 101 + semente, 9) === 0) return;
    const larg = 52 + variar(k, 211 + semente, 5) * 9;
    const alt = 70 + variar(k, 7919 + semente, 7) * 24 + variar(k, 37 + semente, 3) * 10;
    const x = x0 + (esp - larg) / 2 + (variar(k, 53 + semente, 5) - 2) * 4;
    const topo = base - alt;
    ctx.rect(x, topo, larg, alt);
    const tipo = variar(k, 13 + semente, 6);
    if (tipo === 0) {
      ctx.rect(x + larg * 0.15, topo - 16, larg * 0.7, 16);
      ctx.rect(x + larg * 0.3, topo - 28, larg * 0.4, 12);
    } else if (tipo === 1) {
      ctx.rect(x + larg / 2 - 1.5, topo - 34, 3, 34);
      ctx.rect(x + larg / 2 - 6, topo - 8, 12, 8);
    } else if (tipo === 2) {
      ctx.rect(x + larg * 0.6, topo - 22, 16, 14);
      ctx.rect(x + larg * 0.6 + 2, topo - 8, 2, 8);
      ctx.rect(x + larg * 0.6 + 12, topo - 8, 2, 8);
    }
    if (!janelas) return;
    const cols = Math.max(2, Math.floor((larg - 10) / 12));
    const linhas = Math.max(2, Math.floor((alt - 14) / 16));
    for (let j = 0; j < 10; j++) {
      if (variar(k * 17 + j, 89 + semente, 7) !== 0) continue;
      // cada janela acende e apaga no seu ritmo
      const ritmo = Math.sin(t * (0.15 + variar(k + j, 7, 5) * 0.05) + k + j * 1.7);
      if (ritmo < -0.55) continue;
      luzes.push([x + 6 + (variar(k * 5 + j, 3, cols) * (larg - 12)) / cols, topo + 8 + variar(k * 7 + j, 11, linhas) * 16, ritmo]);
    }
  });
  ctx.fill();
  if (luzes.length) {
    ctx.fillStyle = "rgba(235,235,215,0.3)";
    ctx.beginPath();
    for (const [lx, ly] of luzes) ctx.rect(lx, ly, 6, 8);
    ctx.fill();
  }
}

/** Facho de refletor: o cone de luz que sai de (x, y) na direção `ang`, com `abre` de abertura. */
function refletor(ctx: Ctx, x: number, y: number, ang: number, comp: number, abre: number, alfa: number) {
  const g = ctx.createRadialGradient(x, y, 10, x, y, comp);
  g.addColorStop(0, `rgba(255,255,255,${alfa})`);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(ang - abre) * comp, y + Math.sin(ang - abre) * comp);
  ctx.lineTo(x + Math.cos(ang + abre) * comp, y + Math.sin(ang + abre) * comp);
  ctx.closePath();
  ctx.fill();
}

const NOIR: Cenario = {
  decor(ctx, w, h, off, tod, t, tema, surpresa) {
    const p = tema.paleta;
    // dois refletores que varrem o céu, cruzando
    refletor(ctx, w * 0.3, h - 60, -Math.PI / 2 + Math.sin(t * 0.3) * 0.5, h * 1.1, 0.12, 0.16);
    refletor(ctx, w * 0.72, h - 60, -Math.PI / 2 + Math.sin(t * 0.23 + 2) * 0.55, h * 1.1, 0.1, 0.12);
    // a cidade em duas camadas: cada prédio é do seu lugar no mundo (antes a altura vinha da vaga da tela, e os
    // prédios trocavam de altura quando a vaga dava a volta, em escadinha)
    skylineNoir(ctx, w, h - 40, off * 0.12, 110, ciclo(LONGE_NOIR, tod), false, 3, t);
    skylineNoir(ctx, w, h - 40, off * 0.2, 90, ciclo(p.longe, tod), true, 7, t);
    // o letreiro de neon do tribunal, que falha de vez em quando
    repetir(w, off * 0.2, 1500, (x) => {
      const falha = Math.sin(t * 17) + Math.sin(t * 7.3) > 1.55;
      const lx = x + 600;
      const ly = h - 200;
      ctx.fillStyle = ciclo(PERTO_NOIR, tod);
      ctx.fillRect(lx - 4, ly - 4, 112, 30);
      ctx.font = "700 16px Georgia, serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.save();
      if (!falha) {
        ctx.shadowColor = "#ffffff";
        ctx.shadowBlur = 10;
      }
      ctx.fillStyle = falha ? "#5a5a5a" : "#f4f4f4";
      ctx.fillText("TRIBUNAL", lx + 52, ly + 11);
      ctx.restore();
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
    });
    surpresa?.();
    // o fórum: entra pela borda, como o resto do cenário
    const o = off * 0.35;
    repetir(w, o, 1150, (x) => templo(ctx, x + 420, h - 40, 1.6, ciclo(p.perto, tod)));
    // o carro que passa com os faróis acesos
    const ciclo9 = mod(t, 9);
    if (ciclo9 < 3.2) {
      const cx = -120 + (ciclo9 / 3.2) * (w + 240);
      const cy = h - 48;
      ctx.fillStyle = "#050505";
      ctx.beginPath();
      ctx.roundRect(cx - 38, cy - 10, 76, 12, 3);
      ctx.roundRect(cx - 20, cy - 20, 36, 12, [6, 8, 0, 0]);
      ctx.fill();
      const g = ctx.createLinearGradient(cx + 38, 0, cx + 200, 0);
      g.addColorStop(0, "rgba(255,255,230,0.35)");
      g.addColorStop(1, "rgba(255,255,230,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(cx + 38, cy - 6);
      ctx.lineTo(cx + 200, cy - 22);
      ctx.lineTo(cx + 200, cy + 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#c83a3a";
      ctx.fillRect(cx - 40, cy - 7, 3, 3);
    }
    // os postes, com a luz e a chuva que brilha no facho
    repetir(w, off * 0.5, 300, (x, k) => {
      const px = x + 120;
      const topo = h - 150;
      ctx.fillStyle = "#050505";
      ctx.fillRect(px - 2, topo, 4, h - 40 - topo);
      ctx.fillRect(px - 2, topo, 18, 3);
      ctx.fillRect(px + 10, topo, 10, 6);
      const tremula = 0.85 + 0.15 * Math.sin(t * 23 + k * 3) * Math.sin(t * 5 + k);
      const g = ctx.createLinearGradient(0, topo + 6, 0, h - 40);
      g.addColorStop(0, `rgba(255,250,220,${0.28 * tremula})`);
      g.addColorStop(1, "rgba(255,250,220,0.02)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(px + 12, topo + 6);
      ctx.lineTo(px + 18, topo + 6);
      ctx.lineTo(px + 60, h - 40);
      ctx.lineTo(px - 30, h - 40);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,240,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        const gx = px - 18 + variar(i + k * 7, 3, 70);
        const gy = topo + 20 + mod(t * 500 + i * 37, h - 60 - topo - 20);
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx - 3, gy + 10);
      }
      ctx.stroke();
    });
  },
  chao(ctx, w, h, y, off, tema) {
    const p = tema.paleta;
    ctx.fillStyle = p.chao;
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 2);
    // o asfalto molhado: o reflexo dos postes e as poças com os pingos (o chão não recebe o relógio: os anéis
    // abrem com o mundo andando)
    const t = off * 0.008;
    ctx.fillStyle = "rgba(255,250,220,0.12)";
    for (let x = -mod(off * 0.5, 300) + 120; x < w + 300; x += 300) ctx.fillRect(x - 6, y + 3, 26, h - y - 3);
    ctx.strokeStyle = "rgba(220,220,220,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -mod(off, 170); x < w + 170; x += 170) {
      ctx.moveTo(x + 70, y + 20);
      ctx.ellipse(x + 40, y + 20, 30, 4, 0, 0, TAU);
      for (let i = 0; i < 2; i++) {
        const f = mod(t * 1.3 + i * 0.5 + x * 0.01, 1);
        const rx = 2 + f * 14;
        ctx.moveTo(x + 30 + i * 18 + rx, y + 20);
        ctx.ellipse(x + 30 + i * 18, y + 20, rx, rx * 0.25, 0, 0, TAU);
      }
    }
    ctx.stroke();
  },
};

// ---------------------------------------------------------------------------
// Papiro: o pergaminho com manchas, o sol de nanquim, aves de tinta, as montanhas e o tribunal a traço, as
// árvores rabiscadas e os parágrafos voando
// ---------------------------------------------------------------------------
const TINTA = "#3b2a1a";

/** Hachura: riscos inclinados que descem da linha y(x) até `prof` abaixo dela. */
function hachura(ctx: Ctx, w: number, y: (x: number) => number, passo: number, prof: number) {
  ctx.beginPath();
  for (let x = 0; x <= w; x += passo) {
    const yy = y(x);
    ctx.moveTo(x, yy + 2);
    ctx.lineTo(x - prof * 0.5, yy + prof);
  }
  ctx.stroke();
}

/** As manchas e as fibras do pergaminho, desenhadas uma vez por tamanho de tela (eram degradês grandes a cada quadro). */
let papelFeito: { w: number; h: number; tela: HTMLCanvasElement } | null = null;
function pergaminho(w: number, h: number): HTMLCanvasElement | null {
  if (papelFeito && papelFeito.w === w && papelFeito.h === h) return papelFeito.tela;
  if (typeof document === "undefined") return null;
  const tela = document.createElement("canvas");
  // metade da resolução: as manchas são borradas e as fibras, finas e fracas
  tela.width = Math.ceil(w / 2);
  tela.height = Math.ceil(h / 2);
  const c = tela.getContext("2d");
  if (!c) return null;
  c.scale(0.5, 0.5);
  for (let i = 0; i < 7; i++) {
    const x = (variar(i, 7, 1000) / 1000) * w;
    const y = (variar(i, 11, 1000) / 1000) * h;
    const r = 60 + variar(i, 13, 5) * 30;
    const g = c.createRadialGradient(x, y, r * 0.2, x, y, r);
    g.addColorStop(0, "rgba(150,110,60,0.09)");
    g.addColorStop(0.8, "rgba(150,110,60,0.05)");
    g.addColorStop(1, "rgba(150,110,60,0)");
    c.fillStyle = g;
    c.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  c.strokeStyle = "rgba(120,90,50,0.12)";
  c.lineWidth = 1.5;
  c.beginPath();
  for (let i = 0; i < 40; i++) {
    const x = (variar(i, 17, 1000) / 1000) * w;
    const y = (variar(i, 19, 1000) / 1000) * h;
    const a = (variar(i, 23, 20) / 20) * 0.6 - 0.3;
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(a) * 20, y + Math.sin(a) * 20);
  }
  c.stroke();
  papelFeito = { w, h, tela };
  return tela;
}

const PAPIRO: Cenario = {
  decor(ctx, w, h, off, tod, t, tema, surpresa) {
    const p = tema.paleta;
    const noite = noiteDe(tod);
    // o pergaminho: manchas de chá e as fibras, paradas (o papel não anda)
    const papel = pergaminho(w, h);
    if (papel) ctx.drawImage(papel, 0, 0, w, h);
    // o sol (ou a lua) a nanquim, com os raios girando devagar
    ctx.strokeStyle = TINTA;
    ctx.lineWidth = 1.6;
    const [sx, sy] = [w * 0.78, h * 0.2];
    ctx.beginPath();
    if (noite > 0.5) {
      ctx.arc(sx, sy, 24, 0.6, TAU - 0.6);
      ctx.arc(sx + 12, sy, 18, TAU - 0.9, 0.9, true);
    } else {
      ctx.arc(sx, sy, 24, 0, TAU);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU + t * 0.1;
        const r1 = i % 2 ? 34 : 30;
        ctx.moveTo(sx + Math.cos(a) * r1, sy + Math.sin(a) * r1);
        ctx.lineTo(sx + Math.cos(a) * (r1 + 12), sy + Math.sin(a) * (r1 + 12));
      }
    }
    ctx.stroke();
    // aves de tinta: dois traços batendo
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const x = mod(i * 237 - t * (20 + i * 3) - off * 0.1, w + 120) - 60;
      const y = 110 + ((i * 53) % 120) + Math.sin(t + i) * 8;
      const b = Math.sin(t * 7 + i) * 4;
      ctx.moveTo(x - 9, y - b);
      ctx.quadraticCurveTo(x - 4, y - 5, x, y);
      ctx.quadraticCurveTo(x + 4, y - 5, x + 9, y - b);
    }
    ctx.stroke();
    surpresa?.();
    // as montanhas ao longe, a traço, com hachura
    const oM = off * 0.1;
    const linhaM = (x: number) => h - 150 - Math.abs(Math.sin((x + oM) * 0.006)) * 60 - Math.sin((x + oM) * 0.017) * 12;
    ctx.strokeStyle = "rgba(59,42,26,0.55)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 6) ctx.lineTo(x, linhaM(x));
    ctx.stroke();
    ctx.strokeStyle = "rgba(59,42,26,0.22)";
    ctx.lineWidth = 1;
    hachura(ctx, w, linhaM, 7, 16);
    // o tribunal a traço no meio do caminho
    const oT = off * 0.22;
    ctx.strokeStyle = "rgba(59,42,26,0.7)";
    ctx.lineWidth = 1.4;
    repetir(w, oT, 1000, (x0) => {
      const x = x0 + 300;
      const base = h - 84;
      ctx.beginPath();
      ctx.moveTo(x - 8, base);
      ctx.lineTo(x + 128, base);
      ctx.moveTo(x - 4, base - 6);
      ctx.lineTo(x + 124, base - 6);
      for (let i = 0; i < 7; i++) ctx.rect(x + 4 + i * 17, base - 46, 7, 40);
      ctx.moveTo(x - 6, base - 46);
      ctx.lineTo(x + 126, base - 46);
      ctx.lineTo(x + 60, base - 70);
      ctx.closePath();
      ctx.stroke();
      // a hachura do frontão
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        ctx.moveTo(x + 20 + i * 8, base - 48);
        ctx.lineTo(x + 26 + i * 8, base - 56 - Math.min(i, 9 - i) * 1.4);
      }
      ctx.stroke();
    });
    // a colina da frente e as árvores rabiscadas
    const o = off * 0.35;
    colinas(ctx, w, h - 40, o, ciclo(p.perto, tod), 40, 16, 0.012, 6);
    ctx.strokeStyle = "rgba(59,42,26,0.45)";
    hachura(ctx, w, (x) => alturaColina(x, h - 40, o, 40, 16, 0.012, 6), 9, 14);
    ctx.strokeStyle = TINTA;
    ctx.lineWidth = 1.3;
    repetir(w, o, 90, (x, k) => {
      if (variar(k, 29, 3) === 0) return;
      const px = x + variar(k, 31, 40);
      const y = alturaColina(px, h - 40, o, 40, 16, 0.012, 6) + 2;
      const alt = 30 + variar(k, 37, 3) * 8;
      const balanca = Math.sin(t * 1.2 + k) * 1.5;
      const r = 11 + variar(k, 39, 3) * 2;
      const cx = px + balanca;
      const cy = y - alt;
      // o tronco em dois traços e a copa em gomos, com a sombra hachurada do lado de baixo
      ctx.beginPath();
      ctx.moveTo(px - 1.5, y);
      ctx.quadraticCurveTo(px - 1, y - alt * 0.5, cx - 1.5, cy + r * 0.6);
      ctx.moveTo(px + 1.5, y);
      ctx.quadraticCurveTo(px + 2, y - alt * 0.5, cx + 1.5, cy + r * 0.6);
      const gomos = 7;
      for (let i = 0; i <= gomos; i++) {
        const a0 = (i / gomos) * TAU;
        const a1 = ((i + 1) / gomos) * TAU;
        const bx = cx + Math.cos((a0 + a1) / 2) * r;
        const by = cy + Math.sin((a0 + a1) / 2) * r * 0.85;
        if (i === 0) ctx.moveTo(cx + Math.cos(a0) * r * 0.8, cy + Math.sin(a0) * r * 0.7);
        ctx.quadraticCurveTo(bx + Math.cos((a0 + a1) / 2) * 4, by + Math.sin((a0 + a1) / 2) * 4, cx + Math.cos(a1) * r * 0.8, cy + Math.sin(a1) * r * 0.7);
      }
      for (let i = 0; i < 4; i++) {
        ctx.moveTo(cx - r * 0.5 + i * 4, cy + r * 0.2 + i * 0.5);
        ctx.lineTo(cx - r * 0.5 + i * 4 + 4, cy + r * 0.65);
      }
      ctx.stroke();
    });
    // os parágrafos voando, girando e indo e vindo
    const GLIFOS = ["§", "Art.", "CP", "CPP", "LEP", "¶", "§§", "Inc."];
    ctx.fillStyle = "rgba(59,42,26,0.4)";
    ctx.font = "italic 22px Georgia, serif";
    repetir(w, off * 0.25 + t * 14, 170, (x, k) => {
      const y = 90 + variar(k, 41, 5) * 40 + Math.sin(t * 0.8 + k) * 12;
      ctx.save();
      ctx.translate(x + variar(k, 43, 60), y);
      ctx.rotate(Math.sin(t * 0.6 + k) * 0.25);
      ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t + k * 1.7);
      ctx.fillText(GLIFOS[variar(k, 47, GLIFOS.length)]!, 0, 0);
      ctx.restore();
    });
  },
};

// ---------------------------------------------------------------------------
// Recesso: o sol pálido, a aurora, as montanhas, o fórum com a guirlanda, o chalé com a chaminé fumegando e as
// janelas quentes, os pinheiros com luzinhas e um boneco de neve aqui e ali
// ---------------------------------------------------------------------------
const NEVE_RECESSO = ["#f6e9ef", "#f4f8fd", "#ecdff0", "#5a6f99"];
const NEVE_LONGE_RECESSO = ["#e9e4f0", "#e3edf7", "#ddd3e8", "#3a4f7e"];
const FORUM_RECESSO = ["#c9cde3", "#bccbe0", "#b6aed0", "#24365f"];
const MADEIRA_RECESSO = ["#8a5a3a", "#7a4e32", "#6a4030", "#2a1a14"];
const LUZINHAS = ["#ff5a5a", "#ffd24a", "#5ad46a", "#5ab0ff"];

/** Chalé de madeira com neve no telhado, a janela que acende e a chaminé. Devolve a boca da chaminé. */
function chale(ctx: Ctx, x: number, base: number, cor: string, neve: string, acesas: number): [number, number] {
  ctx.fillStyle = cor;
  ctx.fillRect(x, base - 34, 56, 34);
  ctx.fillRect(x + 38, base - 62, 9, 18);
  ctx.fillStyle = neve;
  ctx.beginPath();
  ctx.moveTo(x - 8, base - 32);
  ctx.lineTo(x + 28, base - 58);
  ctx.lineTo(x + 64, base - 32);
  ctx.lineTo(x + 58, base - 30);
  ctx.lineTo(x + 28, base - 50);
  ctx.lineTo(x - 2, base - 30);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(x + 37, base - 64, 11, 4);
  ctx.fillStyle = acesas > 0.3 ? "#ffcf6a" : "#9ab0c8";
  ctx.globalAlpha = 0.6 + acesas * 0.4;
  ctx.fillRect(x + 8, base - 24, 12, 10);
  ctx.fillRect(x + 34, base - 24, 12, 10);
  ctx.globalAlpha = 1;
  if (acesas > 0.3) brilho(ctx, x + 28, base - 18, 46, "255,200,100", 0.3 * acesas);
  return [x + 42, base - 64];
}

const RECESSO: Cenario = {
  decor(ctx, w, h, off, tod, t, tema, surpresa) {
    const p = tema.paleta;
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.22, h * 0.2, 20, "#f4f6ff");
    else sol(ctx, w * 0.22, h * 0.2, 24, "#fff8e6", "rgba(255,240,220,0.4)");
    if (noite > 0.02) aurora(ctx, w, h, t, noite);
    const neve = ciclo(NEVE_RECESSO, tod);
    montanhasNevadas(ctx, w, h - 40, off * 0.08, ciclo(p.longe, tod), neve);
    // o fórum com neve no telhado e a guirlanda no frontão
    repetir(w, off * 0.2, 900, (x0) => {
      const x = x0 + 380;
      const s = 1.3;
      const base = h - 70;
      templo(ctx, x, base, s, ciclo(FORUM_RECESSO, tod));
      ctx.save();
      ctx.strokeStyle = neve;
      ctx.lineWidth = 4 * s;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x - 6 * s, base - 41 * s);
      ctx.lineTo(x + 50 * s, base - 59 * s);
      ctx.lineTo(x + 106 * s, base - 41 * s);
      ctx.stroke();
      ctx.strokeStyle = "#2f7a4a";
      ctx.lineWidth = 2.4 * s;
      ctx.beginPath();
      ctx.arc(x + 50 * s, base - 47 * s, 4.2 * s, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = "#c8322f";
      ctx.beginPath();
      ctx.arc(x + 50 * s, base - 43 * s, 1.6 * s, 0, TAU);
      ctx.fill();
      ctx.restore();
      // as luzinhas penduradas na frente do fórum
      const pontos: [number, number][] = [];
      for (let i = 0; i <= 12; i++) pontos.push([x - 6 * s + (i * 112 * s) / 12, base - 38 * s + Math.sin((i / 12) * Math.PI) * 6]);
      luzinhas(ctx, pontos, t, LUZINHAS, 1.8);
    });
    colinas(ctx, w, h - 40, off * 0.25, ciclo(NEVE_LONGE_RECESSO, tod), 50, 14, 0.009, 3);
    // o chalé, com a fumaça da chaminé e as janelas acesas no fim do dia
    const acesas = Math.max(noite, tod > 1.6 && tod < 2.6 ? (tod - 1.6) : 0, tod < 0.5 ? 1 - tod * 2 : 0);
    repetir(w, off * 0.25, 1300, (x0, k) => {
      const x = x0 + 900;
      const base = alturaColina(x + 28, h - 40, off * 0.25, 50, 14, 0.009, 3) + 4;
      const [bx, by] = chale(ctx, x, base, ciclo(MADEIRA_RECESSO, tod), neve, acesas);
      fumaca(ctx, bx, by, t, noite > 0.5 ? "#8a9ab8" : "#e8eef6", 0.7, 5, k);
    });
    // os pinheiros, com falhas para não virar um muro; alguns com luzinhas
    const oPinho = off * 0.4;
    const cor = ciclo(p.perto, tod);
    repetir(w, oPinho, 64, (x0, k) => {
      if (variar(k, 13, 7) === 0) {
        if (variar(k, 17, 3) === 0) bonecoDeNeve(ctx, x0 + 20, h - 48, 0.75, neve, t, ["#c8322f", "#2f7a4a", "#2a5ab0"][variar(k, 19, 3)]);
        return;
      }
      const x = x0 + variar(k, 29, 17);
      const s = 0.75 + variar(k, 53, 5) * 0.1;
      pinheiro(ctx, x, h - 52, s, cor, neve);
      if (variar(k, 61, 4) === 0) {
        const pontos: [number, number][] = [];
        for (let i = 0; i < 7; i++) pontos.push([x + (i % 2 ? 1 : -1) * (14 - i * 1.6) * s, h - 52 - (14 + i * 7) * s]);
        luzinhas(ctx, pontos, t + k, LUZINHAS, 1.6);
      }
    });
    colinas(ctx, w, h - 40, off * 0.45, neve, 22, 8, 0.016, 7);
    // o boneco de neve do trenó (a surpresa) desce os montes de neve da frente, na frente dos pinheiros
    neveDaFrente = { h, o: off * 0.45 };
    surpresa?.();
    // o brilho da neve, que cintila
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 18; i++) {
      const x = mod(i * 97 - off * 0.45, w);
      const y = alturaColina(x, h - 40, off * 0.45, 22, 8, 0.016, 7) + 4 + (i % 3) * 3;
      ctx.globalAlpha = Math.max(0, Math.sin(t * 2.5 + i * 1.9)) * 0.9;
      estrelinha(ctx, x, y, 2.4);
    }
    ctx.globalAlpha = 1;
  },
};

// ---------------------------------------------------------------------------
// Gótico: a lua com as nuvens passando, os relâmpagos ao longe, a catedral, as árvores mortas com corvos, os
// morcegos, os fogos-fátuos e o cemitério com as velas
// ---------------------------------------------------------------------------
/** Árvore morta retorcida: galhos que se dividem (o mesmo desenho para o mesmo `k`). */
function arvoreMorta(ctx: Ctx, x: number, base: number, s: number, k: number, t: number) {
  const galho = (x0: number, y0: number, ang: number, comp: number, larg: number, nivel: number) => {
    const x1 = x0 + Math.cos(ang) * comp;
    const y1 = y0 + Math.sin(ang) * comp;
    ctx.lineWidth = larg;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(x0 + Math.cos(ang + 0.4) * comp * 0.5, y0 + Math.sin(ang + 0.4) * comp * 0.5, x1, y1);
    ctx.stroke();
    if (nivel <= 0) return;
    const balanca = Math.sin(t * 0.9 + k + nivel) * 0.03;
    galho(x1, y1, ang - 0.5 - variar(k + nivel, 3, 4) * 0.08 + balanca, comp * 0.68, larg * 0.62, nivel - 1);
    galho(x1, y1, ang + 0.45 + variar(k + nivel, 5, 4) * 0.08 + balanca, comp * 0.62, larg * 0.6, nivel - 1);
  };
  ctx.lineCap = "round";
  galho(x, base, -Math.PI / 2 + (variar(k, 7, 5) - 2) * 0.06, 34 * s, 6 * s, 3);
}

const GOTICO: Cenario = {
  decor(ctx, w, h, off, tod, t, tema, surpresa) {
    const p = tema.paleta;
    // o relâmpago ao longe, de tempos em tempos: o céu clareia e o raio desce atrás da catedral
    const r = mod(t, 11);
    if (r < 0.35) {
      const forte = r < 0.08 || (r > 0.16 && r < 0.22) ? 1 : 0.35;
      ctx.fillStyle = `rgba(200,190,255,${0.18 * forte})`;
      ctx.fillRect(0, 0, w, h);
      const n = Math.floor(t / 11);
      let x = w * (0.2 + variar(n, 3, 60) / 100);
      let y = 0;
      ctx.strokeStyle = `rgba(240,235,255,${0.85 * forte})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let i = 0; i < 9; i++) {
        x += variar(n * 13 + i, 7, 41) - 20;
        y += h * 0.07;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // a lua com o halo e as nuvens escuras que passam na frente dela
    const [lx, ly] = [w * 0.74, h * 0.2];
    lua(ctx, lx, ly, 34);
    ctx.fillStyle = "rgba(20,14,36,0.75)";
    repetir(w, t * 12 + off * 0.03, 420, (x, k) => {
      if (variar(k, 3, 3) === 0) return;
      const y = ly - 30 + variar(k, 7, 5) * 16;
      ctx.beginPath();
      ctx.ellipse(x, y, 70, 10, 0, 0, TAU);
      ctx.ellipse(x + 30, y - 6, 40, 9, 0, 0, TAU);
      ctx.fill();
    });
    const esp = 820;
    const oCat = off * 0.12;
    repetir(w, oCat, esp, (x) => catedral(ctx, x + 180, h - 40, ciclo(p.longe, tod), t));
    // o fantasminha da surpresa sai da catedral
    surpresa?.();
    // morcegos, em bandos que voam e dão voltas
    ctx.fillStyle = "#07040c";
    for (let i = 0; i < 9; i++) {
      const vx = mod(i * 211 - off * 0.3 - t * (22 + (i % 3) * 8), w + 120) - 60;
      const vy = 80 + ((i * 53) % 170) + Math.sin(t * 1.8 + i * 2.1) * 14 + Math.cos(t * 0.9 + i) * 10;
      morcego(ctx, vx, vy, 0.8 + (i % 3) * 0.25, Math.sin(t * 13 + i * 1.7));
    }
    faixaNeblina(ctx, w, h - 150, 70, off * 0.2 + t * 12);
    // as árvores mortas, com corvos pousados que às vezes batem as asas
    const cor = ciclo(p.perto, tod);
    const oArv = off * 0.28;
    ctx.strokeStyle = cor;
    repetir(w, oArv, 520, (x0, k) => {
      if (variar(k, 11, 3) === 0) return;
      const x = x0 + variar(k, 13, 200);
      const s = 1.7 + variar(k, 17, 3) * 0.3;
      arvoreMorta(ctx, x, h - 40, s, k, t);
      // o corvo pousado no alto do tronco
      const cx = x + 8 * s;
      const cy = h - 40 - 34 * s;
      const voa = Math.max(0, Math.sin(t * 0.7 + k * 2)) > 0.97;
      ctx.fillStyle = cor;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 6, 4, -0.2, 0, TAU);
      ctx.arc(cx + 5, cy - 4, 3, 0, TAU);
      ctx.moveTo(cx + 7, cy - 5);
      ctx.lineTo(cx + 11, cy - 3);
      ctx.lineTo(cx + 7, cy - 3);
      if (voa) {
        ctx.moveTo(cx - 2, cy - 2);
        ctx.lineTo(cx - 12, cy - 12 + Math.sin(t * 30) * 4);
        ctx.lineTo(cx + 2, cy - 3);
      }
      ctx.fill();
    });
    // o cemitério: a grade de ferro com pontas de lança
    ctx.fillStyle = cor;
    ctx.globalAlpha = 0.85;
    const oGrade = off * 0.35;
    const yg = h - 40;
    ctx.fillRect(0, yg - 34, w, 2);
    ctx.fillRect(0, yg - 12, w, 2);
    ctx.beginPath();
    for (let x = -mod(oGrade, 9); x < w + 9; x += 9) {
      ctx.rect(x, yg - 40, 1.6, 40);
      ctx.moveTo(x - 1.6, yg - 40);
      ctx.lineTo(x + 0.8, yg - 46);
      ctx.lineTo(x + 3.2, yg - 40);
      ctx.closePath();
    }
    ctx.fill();
    ctx.globalAlpha = 1;
    // as lápides: redondas, cruzes e obeliscos; nalgumas, uma vela acesa
    const oLapide = off * 0.45;
    const velas: [number, number][] = [];
    ctx.beginPath();
    repetir(w, oLapide, 46, (x, k) => {
      const tipo = variar(k, 7, 6);
      if (tipo === 0) return;
      const a = 22 + variar(k, 9, 4) * 5;
      if (tipo === 1) {
        ctx.rect(x + 7, yg - a - 6, 4, a + 8);
        ctx.rect(x + 1, yg - a + 2, 16, 4);
      } else if (tipo === 2) {
        ctx.moveTo(x + 2, yg + 2);
        ctx.lineTo(x + 6, yg - a - 10);
        ctx.lineTo(x + 9, yg - a - 16);
        ctx.lineTo(x + 12, yg - a - 10);
        ctx.lineTo(x + 16, yg + 2);
        ctx.closePath();
      } else ctx.roundRect(x, yg - a, 18, a + 2, [9, 9, 0, 0]);
      if (variar(k, 13, 4) === 0) velas.push([x + 22, yg - 4]);
    });
    ctx.fill();
    for (const [vx, vy] of velas) {
      ctx.fillStyle = "#d8d0c0";
      ctx.fillRect(vx - 1.5, vy - 6, 3, 6);
      const chama = 1 + Math.sin(t * 19 + vx) * 0.2;
      brilho(ctx, vx, vy - 9, 12 * chama, "255,210,120", 0.55);
      ctx.fillStyle = "#ffd27a";
      ctx.beginPath();
      ctx.ellipse(vx, vy - 9, 1.6, 3 * chama, 0, 0, TAU);
      ctx.fill();
    }
    // os fogos-fátuos, que flutuam entre as lápides
    for (let i = 0; i < 4; i++) {
      const x = mod(i * 293 - off * 0.45 + Math.sin(t * 0.5 + i) * 30, w + 60) - 30;
      const y = yg - 30 - Math.abs(Math.sin(t * 0.8 + i * 1.6)) * 40;
      brilho(ctx, x, y, 14, "150,255,210", 0.35 + 0.35 * Math.sin(t * 3 + i));
    }
    faixaNeblina(ctx, w, h - 70, 50, off * 0.5 + t * 20);
  },
};

/** Os cenários novos dos estilos de fora dos grupos, por id do estilo. */
export const CENARIOS_BASE: Record<string, Cenario> = {
  classico: CLASSICO,
  fofo: FOFO,
  retro: RETRO,
  steampunk: STEAMPUNK,
  noir: NOIR,
  papiro: PAPIRO,
  recesso: RECESSO,
  gotico: GOTICO,
};
