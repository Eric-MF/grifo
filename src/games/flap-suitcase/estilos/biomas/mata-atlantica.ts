// Mata Atlântica: a Serra do Mar coberta de mata, com a cachoeira, a cerração subindo das encostas, os tucanos,
// as bromélias nos galhos e o mico-leão-dourado; as colunas são troncos de musgo e bromélias, e o mico vai na maleta.
import { ciclo, colinas, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { cachoeira, lua, noiteDe, repetir, sol, surge } from "../kit";

const MICO = "#ff9a1a";
// cores por hora do dia (amanhecer, dia, entardecer, noite)
const SERRA = [
  ["#7a9a8a", "#6fa086", "#6a7088", "#141e28"],
  ["#4f7f5a", "#468a56", "#4a5a58", "#0c1814"],
  ["#2f6038", "#2a6a36", "#2e4236", "#08120a"],
];
const AGUA = ["#d8e4ec", "#e8f4fa", "#d8ccdc", "#5a6a80"];
const TRONCO = ["#5a4a3a", "#5e4e3c", "#4e4040", "#14100e"];
// os picos de granito ao fundo e a pedra nua dos paredões
const PICO = ["#8a9eac", "#7fa2b4", "#7a7896", "#161e2c"];
const GRANITO = ["#a8acb2", "#b0b6bc", "#948ea4", "#262833"];
const FISSURA = ["#7a7e86", "#808890", "#6a6478", "#14161c"];
// o tom mais escuro das copas na encosta (a textura da mata), por camada
const COPA_SOMBRA = [
  ["#6a8a7e", "#5f8e78", "#5a6478", "#0e181c"],
  ["#3d6a46", "#337240", "#3a4a44", "#08140e"],
  ["#22502a", "#1c5826", "#24362a", "#040a06"],
];
// as árvores floridas da serra: a quaresmeira roxa, o manacá branco e rosa, e a embaúba prateada
const QUARESMEIRA = ["#9a62b0", "#a35cc0", "#84509a", "#24162c"];
const MANACA = ["#efd6ea", "#f6e2f2", "#dcc6dc", "#34303e"];
const EMBAUBA = ["#b8cabc", "#c2d6c4", "#a6a8b6", "#283034"];
const SAMAMBAIA = ["#3e6e30", "#3a7a30", "#3a4e32", "#0a140a"];
const PALMITO = ["#4a7a3a", "#468a3a", "#42583e", "#0c160c"];

/** Tucano em voo: o corpo preto, o peito branco e o bico laranja enorme. */
function tucano(ctx: Ctx, x: number, y: number, bate: number) {
  ctx.fillStyle = "#141414";
  ctx.beginPath();
  ctx.ellipse(x, y, 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 2, y - 1);
  ctx.lineTo(x - 6, y - 12 - bate * 4);
  ctx.lineTo(x + 5, y - 1);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x + 7, y - 1, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ff8a1a";
  ctx.beginPath();
  ctx.moveTo(x + 9, y - 3);
  ctx.quadraticCurveTo(x + 20, y - 3, x + 22, y);
  ctx.lineTo(x + 9, y + 1);
  ctx.fill();
}

/** Mico-leão-dourado: a juba laranja, a carinha escura e o rabo comprido. */
function micoLeao(ctx: Ctx, x: number, y: number, s: number, t: number) {
  ctx.strokeStyle = MICO;
  ctx.lineWidth = 2 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 3 * s, y + 3 * s);
  ctx.quadraticCurveTo(x - 12 * s, y + 8 * s + Math.sin(t * 3) * 2 * s, x - 10 * s, y + 18 * s);
  ctx.stroke();
  ctx.fillStyle = MICO;
  ctx.beginPath();
  ctx.ellipse(x, y + 2 * s, 4.6 * s, 5.4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 1 * s, y - 5 * s, 5.4 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4a2a1a";
  ctx.beginPath();
  ctx.ellipse(x + 2 * s, y - 4.5 * s, 2.6 * s, 3.2 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(x + 0.6 * s, y - 6 * s, 1.2 * s, 1.2 * s);
  ctx.fillRect(x + 2.8 * s, y - 6 * s, 1.2 * s, 1.2 * s);
}

/** Altura da crista de `colinas` em X (a mesma conta), para pôr as copas por cima dela. */
const crista = (X: number, base: number, alt: number, amp: number, freq: number, seed: number) =>
  base - alt - Math.sin(X * freq + seed) * amp - Math.sin(X * freq * 2.3 + seed * 2) * amp * 0.4;

/**
 * Encosta coberta de mata: o morro, a crista recortada pelas copas, a textura das copas mais escuras descendo a encosta
 * e, de vez em quando, uma árvore florida ou prateada no meio do verde.
 */
function encosta(
  ctx: Ctx, w: number, base: number, o: number, cor: string, escura: string, alt: number, amp: number, freq: number, seed: number,
  r: number, floridas: string[],
) {
  colinas(ctx, w, base, o, cor, alt, amp, freq, seed);
  ctx.fillStyle = cor;
  const passo = Math.max(8, r * 1.1);
  for (let x = -(o % passo) - passo; x < w + passo; x += passo) {
    const X = x + o;
    const k = Math.round(X / passo);
    ctx.beginPath();
    ctx.arc(x, crista(X, base, alt, amp, freq, seed) + r * 0.3, r * (0.75 + variar(k, 7, 4) * 0.12), 0, Math.PI * 2);
    ctx.fill();
  }
  const largo = r * 2.4;
  for (let x = -(o % largo) - largo; x < w + largo; x += largo) {
    const X = x + o;
    const k = Math.round(X / largo);
    const y0 = crista(X, base, alt, amp, freq, seed);
    ctx.fillStyle = escura;
    for (let j = 0; j < 5; j++) {
      const yy = y0 + r * 1.6 + j * r * 2 + variar(k + j, 11, 3) * r * 0.5;
      if (yy > base - r * 0.5) break;
      ctx.beginPath();
      ctx.arc(x + (variar(k + j, 13, 5) - 2) * r * 0.45, yy, r * (0.6 + variar(k + j, 29, 4) * 0.12), Math.PI, 0);
      ctx.fill();
    }
    // a árvore florida: uma copa em tufos, da cor da flor, assentada no meio da mata
    if (floridas.length && variar(k, 17, 4) === 0) {
      const cx = x + r * 0.4;
      const cy = y0 + r * (1.1 + variar(k, 23, 3) * 0.9);
      ctx.fillStyle = floridas[variar(k, 19, floridas.length)]!;
      for (const [dx, dy, rr] of [[-0.75, 0.2, 0.55], [0, 0, 0.75], [0.75, 0.25, 0.5]]) {
        ctx.beginPath();
        ctx.arc(cx + dx! * r, cy + dy! * r, rr! * r, Math.PI, 0);
        ctx.fill();
      }
    }
  }
}

/** Os picos de granito da serra ao fundo, um deles em dedo (o Dedo de Deus), com as faces de pedra nua mais claras. */
function picos(ctx: Ctx, x: number, base: number, s: number, cor: string, granito: string) {
  const p = (dx: number, dy: number): [number, number] => [x + dx * s, base - dy * s];
  const contorno: [number, number][] = [[0, 0], [60, 120], [90, 150], [120, 135], [150, 190], [156, 250], [166, 266], [176, 250], [182, 196], [220, 160], [260, 205], [300, 140], [380, 80], [440, 0]];
  ctx.fillStyle = cor;
  ctx.beginPath();
  for (const [dx, dy] of contorno) ctx.lineTo(...p(dx, dy));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = granito;
  ctx.globalAlpha = 0.6;
  for (const face of [[[156, 250], [166, 266], [176, 250], [182, 196], [171, 190], [168, 240]], [[260, 205], [300, 140], [286, 136], [263, 186]], [[90, 150], [120, 135], [110, 128], [92, 140]]]) {
    ctx.beginPath();
    for (const [dx, dy] of face) ctx.lineTo(...p(dx!, dy!));
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Paredão de granito na encosta, com a cachoeira caindo do alto até o poço de espuma. */
function paredao(ctx: Ctx, x: number, base: number, alt: number, pedra: string, fissura: string, agua: string, t: number) {
  ctx.fillStyle = pedra;
  ctx.beginPath();
  ctx.moveTo(x - 56, base);
  ctx.lineTo(x - 48, base - alt + 34);
  ctx.quadraticCurveTo(x - 44, base - alt, x - 10, base - alt - 8);
  ctx.quadraticCurveTo(x + 36, base - alt - 6, x + 46, base - alt + 28);
  ctx.lineTo(x + 58, base);
  ctx.fill();
  ctx.strokeStyle = fissura;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (const [dx, y0, y1] of [[-34, 0.2, 0.7], [-24, 0.45, 0.95], [26, 0.15, 0.6], [36, 0.5, 0.9]]) {
    ctx.moveTo(x + dx, base - alt + alt * y0);
    ctx.lineTo(x + dx + 3, base - alt + alt * y1);
  }
  ctx.stroke();
  // um pouco de mata agarrada no alto do paredão
  ctx.fillStyle = "#3f824c";
  for (const dx of [-36, -20, 22, 34]) {
    ctx.beginPath();
    ctx.arc(x + dx, base - alt + 2, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  cachoeira(ctx, x - 9, base - alt - 4, 18, base - 10, t, agua, "#ffffff");
  ctx.fillStyle = agua;
  ctx.beginPath();
  ctx.ellipse(x, base - 8, 34, 6, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Samambaiaçu (o xaxim): o tronco fino e escuro e a coroa de frondes que se abrem e caem nas pontas. */
function xaxim(ctx: Ctx, x: number, base: number, alt: number, folha: string, tronco: string, t: number) {
  ctx.strokeStyle = tronco;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.quadraticCurveTo(x - 3, base - alt / 2, x + 2, base - alt);
  ctx.stroke();
  const tx = x + 2;
  const ty = base - alt;
  ctx.fillStyle = folha;
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.38 + Math.sin(t * 1.2 + i + x * 0.01) * 0.04;
    const L = 26 + (4 - Math.abs(i - 4)) * 3;
    const ex = tx + Math.cos(a) * L;
    const ey = ty + Math.sin(a) * L * 0.45 + L * 0.42;
    const cx = tx + Math.cos(a) * L * 0.55;
    const cy = ty + Math.sin(a) * L * 0.55 - 8;
    // a fronde como uma folha comprida e fina, com o recorte das folhinhas na borda de baixo
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(cx, cy - 3, ex, ey);
    ctx.quadraticCurveTo(cx, cy + 5, tx, ty + 2);
    ctx.fill();
  }
}

/** Palmito-juçara: o tronco fino e reto, o palmito verde no alto e as folhas penadas caindo. */
function jucara(ctx: Ctx, x: number, base: number, alt: number, folha: string, tronco: string, t: number) {
  const bal = Math.sin(t * 1.1 + x * 0.02) * 2;
  ctx.strokeStyle = tronco;
  ctx.lineWidth = 3.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.lineTo(x + bal, base - alt);
  ctx.stroke();
  ctx.strokeStyle = folha;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x + bal, base - alt + 16);
  ctx.lineTo(x + bal, base - alt);
  ctx.stroke();
  const tx = x + bal;
  const ty = base - alt;
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 8; i++) {
    const lado = i % 2 ? 1 : -1;
    const a = lado * (0.35 + (i >> 1) * 0.32);
    const L = 34 - (i >> 1) * 3;
    const ex = tx + Math.sin(a) * L;
    const ey = ty - Math.cos(a) * L * 0.4 + L * 0.5;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(tx + Math.sin(a) * L * 0.5, ty - 10, ex, ey);
    ctx.stroke();
    // as folhinhas penduradas ao longo da folha
    for (let j = 2; j < 7; j++) {
      const u = j / 7;
      const px = (1 - u) * (1 - u) * tx + 2 * (1 - u) * u * (tx + Math.sin(a) * L * 0.5) + u * u * ex;
      const py = (1 - u) * (1 - u) * ty + 2 * (1 - u) * u * (ty - 10) + u * u * ey;
      ctx.moveTo(px, py);
      ctx.lineTo(px + lado * 1.5, py + 6);
    }
    ctx.stroke();
  }
}

/** Helicônia: as folhas largas em pé e a haste com as brácteas vermelhas em zigue-zague, de ponta amarela. */
function heliconia(ctx: Ctx, x: number, base: number, folha: string, t: number) {
  ctx.fillStyle = folha;
  for (const [dx, a, L] of [[-6, -0.35, 40], [4, 0.25, 46], [10, 0.5, 34]]) {
    const ex = x + dx + Math.sin(a) * L;
    const ey = base - Math.cos(a) * L;
    ctx.beginPath();
    ctx.moveTo(x + dx, base);
    ctx.quadraticCurveTo(x + dx + Math.sin(a) * L * 0.5 - 7, base - Math.cos(a) * L * 0.5, ex, ey);
    ctx.quadraticCurveTo(x + dx + Math.sin(a) * L * 0.5 + 7, base - Math.cos(a) * L * 0.5, x + dx, base);
    ctx.fill();
  }
  const bal = Math.sin(t * 1.4 + x) * 1.5;
  ctx.strokeStyle = "#3a5a2a";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.lineTo(x + bal, base - 44);
  ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const lado = i % 2 ? 1 : -1;
    const y = base - 18 - i * 6;
    ctx.fillStyle = "#e8432a";
    ctx.beginPath();
    ctx.moveTo(x + bal, y);
    ctx.lineTo(x + bal + lado * 9, y - 5);
    ctx.lineTo(x + bal, y - 4);
    ctx.fill();
    ctx.fillStyle = "#ffd23a";
    ctx.fillRect(x + bal + lado * 8 - 1, y - 6, 2, 2);
  }
}

/** Bromélia (no galho e na coluna). */
function bromelia(ctx: Ctx, x: number, y: number, s: number) {
  ctx.fillStyle = "#4a9a3a";
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.45;
    ctx.beginPath();
    ctx.moveTo(x - 2 * s, y);
    ctx.quadraticCurveTo(x + Math.cos(a) * 6 * s, y + Math.sin(a) * 6 * s, x + Math.cos(a) * 12 * s, y + Math.sin(a) * 11 * s);
    ctx.quadraticCurveTo(x + Math.cos(a) * 5 * s, y + Math.sin(a) * 4 * s, x + 2 * s, y);
    ctx.fill();
  }
  ctx.fillStyle = "#e8333a";
  ctx.beginPath();
  ctx.ellipse(x, y - 7 * s, 2.2 * s, 4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

export const MATA_ATLANTICA: Tema = {
  id: "mata-atlantica",
  nome: "Mata Atlântica",
  descricao: "A Serra do Mar coberta de mata, a cachoeira, a cerração nas encostas, tucanos, bromélias e o mico-leão-dourado.",
  grupo: "biomas",
  amostra: `linear-gradient(135deg, #2a6a36 50%, ${MICO} 50%)`,
  onda: "triangle",
  somBase: 523,
  climaFixo: "neblina",
  paleta: {
    ceu: [["#c8b0b8", "#f2e0d8"], ["#8ab0cc", "#e2eef4"], ["#7a6a90", "#eab098"], ["#0c1430", "#283658"]],
    longe: SERRA[0],
    perto: SERRA[2],
    chao: "#4a3a24",
    chaoLinha: "#2a2010",
    coluna: { corpo: "#6a5a46", sombra: "#4a3e30", luz: "#8a7a62", contorno: "#1e160c" },
    maleta: { corpo: "#2a6a36", escuro: "#0e3016", fivela: "#ffd21a", alca: "#0e3016" },
    asa: { cor: "#ffffff", contorno: "#2a6a36" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: [MICO, "#4a9a3a", "#ffffff"],
    recorde: {
      cor: "#ff9a1a", traco: [11, 4], largura: 3.5,
      aviso: { texto: "NOVO RECORDE!", fonte: "800 28px system-ui, sans-serif", corTexto: "#ffffff", corContorno: "#0e3016", corFundo: "rgba(42,106,54,0.92)", anima: "pulsa" },
    },
    hud: "#0e2414",
    estrelas: "#ffffff",
    neblina: "rgba(240,244,240,0.2)",
  },
  surpresa(ctx, w, h, f, t) {
    // a preguiça desce devagar pelo cipó, olha em volta e sobe de novo
    const x = w * 0.58;
    const desce = Math.sin(f * Math.PI);
    const y = -60 + desce * h * 0.42;
    ctx.globalAlpha = surge(f);
    ctx.strokeStyle = "#3a5a2a";
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, y - 34);
    ctx.stroke();
    // o corpo, em escala 1,7 a partir de (x, y)
    ctx.translate(x, y);
    ctx.scale(1.7, 1.7);
    ctx.translate(-x, -y);
    ctx.strokeStyle = "#7a6a52";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 4);
    ctx.lineTo(x - 2, y - 22);
    ctx.moveTo(x + 6, y - 4);
    ctx.lineTo(x + 2, y - 22);
    ctx.stroke();
    ctx.fillStyle = "#8a7a62";
    ctx.beginPath();
    ctx.ellipse(x, y + 10, 14, 20, 0, 0, Math.PI * 2);
    ctx.moveTo(x + 10, y - 4);
    ctx.arc(x, y - 4, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8dcc4";
    ctx.beginPath();
    ctx.ellipse(x, y - 3, 7, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a2a1e";
    const olha = Math.sin(t * 0.8) * 1.5;
    for (const dx of [-3, 3]) {
      ctx.beginPath();
      ctx.ellipse(x + dx + olha, y - 4, 2.2, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
  decor(ctx, w, h, off, tod, t) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.22, h * 0.13, 18, "#e8e4dc");
    else sol(ctx, w * 0.22, h * 0.14, 22, "#fff8e8", "rgba(255,250,230,0.35)");
    // tucanos atravessando
    if (noite < 0.6) {
      for (let i = 0; i < 2; i++) {
        const ax = ((((i * 430 + t * 40 - off * 0.05) % (w + 200)) + w + 200) % (w + 200)) - 100;
        tucano(ctx, ax, h * (0.24 + i * 0.07) + Math.sin(t * 2 + i) * 8, Math.sin(t * 8 + i));
      }
    }
    // os picos de granito lá longe, um deles o Dedo de Deus
    repetir(w, off * 0.02, 900, (x, k) => picos(ctx, x + variar(k, 31, 200), h - 250, 0.75 + variar(k, 7, 3) * 0.1, ciclo(PICO, tod), ciclo(GRANITO, tod)));
    const cerracao = (y: number, o: number, alfa: number) => {
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = alfa;
      repetir(w, o + t * 8, 240, (x, k) => {
        ctx.beginPath();
        ctx.ellipse(x + 120, y + variar(k, 7, 3) * 8, 150, 20, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    };
    cerracao(h - 250, off * 0.03, 0.22);
    // a serra em três encostas de mata, cada uma mais perto e mais escura, com as árvores floridas
    const floridas = [ciclo(QUARESMEIRA, tod), ciclo(MANACA, tod), ciclo(EMBAUBA, tod)];
    const alturas = [250, 180, 110];
    SERRA.forEach((cores, i) => {
      const o = off * (0.04 + i * 0.08);
      encosta(ctx, w, h - 40, o, ciclo(cores, tod), ciclo(COPA_SOMBRA[i]!, tod), alturas[i]!, [70, 44, 26][i]!, [0.005, 0.008, 0.012][i]!, i * 3 + 1, [7, 10, 14][i]!, floridas);
      // o paredão com a cachoeira, na encosta do meio
      if (i === 1) repetir(w, o, 1300, (x) => paredao(ctx, x + 650, h - 150, 150, ciclo(GRANITO, tod), ciclo(FISSURA, tod), ciclo(AGUA, tod), t));
      cerracao(h - [205, 140, 80][i]!, off * (0.06 + i * 0.08), 0.16);
    });
    // a mata de perto: palmitos-juçara e samambaiaçus
    const folhaPalmito = ciclo(PALMITO, tod);
    const samambaia = ciclo(SAMAMBAIA, tod);
    const tronco = ciclo(TRONCO, tod);
    repetir(w, off * 0.3, 160, (x, k) => {
      const px = x + variar(k, 29, 60);
      if (variar(k, 5, 3) === 0) xaxim(ctx, px, h - 40, 60 + variar(k, 7, 3) * 14, samambaia, tronco, t);
      else jucara(ctx, px, h - 40, 120 + variar(k, 11, 4) * 18, folhaPalmito, ciclo(["#8a8a7a", "#909080", "#7a747e", "#1a1a1c"], tod), t);
    });
    // a árvore da frente: o tronco com musgo, o galho com as bromélias e o mico, e a copa por cima
    repetir(w, off * 0.38, 900, (x, k) => {
      ctx.strokeStyle = tronco;
      ctx.lineWidth = 11;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x + 100, h - 40);
      ctx.quadraticCurveTo(x + 110, h - 140, x + 160, h - 170);
      ctx.quadraticCurveTo(x + 260, h - 200, x + 360, h - 180);
      ctx.stroke();
      ctx.strokeStyle = "#5a8a3a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 104, h - 60);
      ctx.quadraticCurveTo(x + 112, h - 140, x + 158, h - 166);
      ctx.stroke();
      // a copa da árvore, em tufos, com um cipó pendurado
      ctx.fillStyle = ciclo(SERRA[2]!, tod);
      for (const [dx, dy, r] of [[150, -205, 30], [190, -228, 34], [235, -222, 30], [280, -214, 32], [330, -200, 26], [120, -190, 22]]) {
        ctx.beginPath();
        ctx.arc(x + dx!, h + dy!, r!, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = ciclo(COPA_SOMBRA[2]!, tod);
      for (const [dx, dy, r] of [[170, -196, 18], [250, -205, 20], [310, -192, 16]]) {
        ctx.beginPath();
        ctx.arc(x + dx!, h + dy!, r!, Math.PI, 0);
        ctx.fill();
      }
      ctx.strokeStyle = ciclo(["#4a6a2a", "#466e2a", "#40502e", "#0c140a"], tod);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x + 330, h - 186);
      ctx.quadraticCurveTo(x + 334 + Math.sin(t * 1.3 + k) * 5, h - 130, x + 332, h - 90);
      ctx.stroke();
      bromelia(ctx, x + 200, h - 186, 1.3);
      bromelia(ctx, x + 300, h - 194, 1.1);
      micoLeao(ctx, x + 250 + Math.sin(t * 0.8 + k) * 20, h - 204, 1.6, t);
    });
    // helicônias e samambaias no chão da mata
    repetir(w, off * 0.44, 130, (x, k) => {
      if (variar(k, 7, 3) === 0) heliconia(ctx, x + variar(k, 31, 50), h - 40, samambaia, t);
      else xaxim(ctx, x + variar(k, 31, 50), h - 40, 6, samambaia, samambaia, t);
    });
  },

  chao(ctx, w, h, y, off, tema, tod) {
    ctx.fillStyle = ciclo([tema.paleta.chao, tema.paleta.chao, "#3e3020", "#120e08"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = "#3f7a3a";
    ctx.fillRect(0, y, w, 4);
    // samambaias rasteiras
    ctx.fillStyle = "#3a7a3a";
    for (let x = -(off % 44); x < w; x += 44) {
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.ellipse(x + 14 + i * 3, y + 2 - i * 1.5, 6, 1.6, -0.6 + i * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // tronco úmido, com musgo verde de um lado, líquens e bromélias
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, c.luz);
    g.addColorStop(0.5, c.corpo);
    g.addColorStop(1, c.sombra);
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, len);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, 0, w, len);
    ctx.clip();
    ctx.fillStyle = "#4a8a3a";
    ctx.globalAlpha = 0.75;
    for (let y = 0; y < len; y += 14) {
      ctx.beginPath();
      ctx.ellipse(x0 + 4 + Math.sin(y * 0.05 + variante) * 3, y, 9, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(220,230,200,0.5)";
    for (let y = 30 + variante * 20; y < len; y += 50) {
      ctx.beginPath();
      ctx.arc(x0 + w * 0.6 + variar(y, 7, 12), y, 3 + variar(y, 5, 3), 0, Math.PI * 2);
      ctx.fill();
    }
    const deCima = ctx.getTransform().d < 0;
    for (let y = 80 + variante * 30, i = 0; y < len - 20; y += 150, i++) {
      ctx.save();
      ctx.translate(i % 2 ? x0 + 22 : x0 + w - 20, y);
      if (deCima) ctx.scale(1, -1);
      bromelia(ctx, 0, 0, 1.4);
      ctx.restore();
    }
    ctx.restore();
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = "#c8a87a";
      ctx.beginPath();
      ctx.moveTo(x0, 12);
      for (let i = 0; i <= 8; i++) ctx.lineTo(x0 + (i * w) / 8, i % 2 ? 2 : 8);
      ctx.lineTo(x0 + w, 14);
      ctx.lineTo(x0, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // o topo coberto de musgo
    ctx.fillStyle = "#3f8a3a";
    ctx.beginPath();
    for (let x = x0 - 2; x < x0 + w + 2; x += 10) ctx.ellipse(x + 5, 6, 7, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x0 - 2, 6, w + 4, 7);
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => micoLeao(c, 10, -24, 1.2, t));
  },
};
