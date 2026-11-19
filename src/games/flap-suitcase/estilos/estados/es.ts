// Espírito Santo: o Convento da Penha no alto do penhasco, a Terceira Ponte sobre a baía de Vitória, a Pedra Azul
// ao fundo e as colunas de granito com bromélias; na maleta, a panela de barro da moqueca capixaba.
import { ciclo, colinas, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, lua, mar, noiteDe, repetir, sol } from "../kit";

// cores por hora do dia (amanhecer, dia, entardecer, noite)
const SERRA = ["#9a9ab8", "#8aa6c0", "#7a6a98", "#141c38"];
const PEDRA = ["#8a8a92", "#8c949c", "#706a80", "#1c2030"];
const MATA = ["#3f6a44", "#336e44", "#3a4a44", "#0a1612"];
const CONVENTO = ["#f2ece4", "#fbf8f2", "#e8dcd8", "#5a5a6e"];
const BAIA = ["#4a7aa0", "#3a8ab8", "#4a5a8a", "#0e1e3a"];
const PONTE = ["#d8d4cc", "#e4e2dc", "#cabcc0", "#4a4c60"];

/** Penhasco de granito com o Convento da Penha no alto. */
function penha(ctx: Ctx, x: number, base: number, pedra: string, mata: string, convento: string, acesas: number) {
  ctx.fillStyle = mata;
  ctx.beginPath();
  ctx.moveTo(x - 140, base);
  ctx.quadraticCurveTo(x - 70, base - 90, x - 20, base - 100);
  ctx.lineTo(x + 70, base - 96);
  ctx.quadraticCurveTo(x + 120, base - 80, x + 170, base);
  ctx.fill();
  ctx.fillStyle = pedra;
  ctx.beginPath();
  ctx.moveTo(x - 30, base - 96);
  ctx.bezierCurveTo(x - 40, base - 150, x - 20, base - 190, x + 14, base - 196);
  ctx.bezierCurveTo(x + 50, base - 196, x + 66, base - 150, x + 62, base - 96);
  ctx.fill();
  // o convento: corpo comprido, a igreja e a torrinha
  ctx.fillStyle = convento;
  ctx.fillRect(x - 18, base - 214, 66, 20);
  ctx.fillRect(x - 4, base - 230, 26, 16);
  ctx.beginPath();
  ctx.moveTo(x - 6, base - 230);
  ctx.lineTo(x + 9, base - 240);
  ctx.lineTo(x + 24, base - 230);
  ctx.fill();
  ctx.fillRect(x + 30, base - 236, 10, 22);
  ctx.fillRect(x + 34, base - 246, 2, 10);
  ctx.fillStyle = acesas > 0.3 ? "#ffd98a" : "#6a6a7a";
  for (let i = 0; i < 6; i++) ctx.fillRect(x - 14 + i * 10, base - 209, 4, 6);
}

/** Terceira Ponte: o tabuleiro alto num arco suave, apoiado em pilares. */
function terceiraPonte(ctx: Ctx, x: number, base: number, cor: string, acesas: number) {
  ctx.fillStyle = cor;
  const L = 700;
  const yDe = (f: number) => base - 30 - Math.sin(f * Math.PI) * 70;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) ctx.lineTo(x + (i / 40) * L, yDe(i / 40));
  for (let i = 40; i >= 0; i--) ctx.lineTo(x + (i / 40) * L, yDe(i / 40) + 7);
  ctx.fill();
  for (let i = 1; i < 10; i++) {
    const f = i / 10;
    ctx.fillRect(x + f * L - 3, yDe(f) + 6, 6, base - yDe(f) - 6);
  }
  if (acesas > 0.3) {
    ctx.fillStyle = "#ffe2a0";
    for (let i = 0; i <= 28; i++) {
      const f = i / 28;
      ctx.beginPath();
      ctx.arc(x + f * L, yDe(f) - 2, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Bromélia: rosa de folhas pontudas com a flor vermelha no meio. */
function bromelia(ctx: Ctx, x: number, y: number, s: number, lado: number) {
  ctx.fillStyle = "#3a8a3a";
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.45;
    ctx.beginPath();
    ctx.moveTo(x - 2 * s, y);
    ctx.quadraticCurveTo(x + Math.cos(a) * 6 * s * lado, y + Math.sin(a) * 6 * s, x + Math.cos(a) * 12 * s * lado, y + Math.sin(a) * 11 * s);
    ctx.quadraticCurveTo(x + Math.cos(a) * 5 * s * lado, y + Math.sin(a) * 4 * s, x + 2 * s, y);
    ctx.fill();
  }
  ctx.fillStyle = "#e8333a";
  ctx.beginPath();
  ctx.ellipse(x + 1 * s * lado, y - 7 * s, 2.2 * s, 4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Panela de barro capixaba, preta, com a moqueca fumegando. */
function panela(c: Ctx, t: number) {
  c.save();
  c.translate(8, -20);
  c.fillStyle = "#1e1a18";
  c.strokeStyle = "#5a4a42";
  c.lineWidth = 1;
  c.beginPath();
  c.ellipse(0, 0, 11, 3, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(-11, 0);
  c.quadraticCurveTo(-10, 8, 0, 8);
  c.quadraticCurveTo(10, 8, 11, 0);
  c.fill();
  c.stroke();
  c.fillRect(-15, -1, 4, 2.4);
  c.fillRect(11, -1, 4, 2.4);
  c.fillStyle = "#e8742a";
  c.beginPath();
  c.ellipse(0, -0.5, 9, 2, 0, 0, Math.PI * 2);
  c.fill();
  for (let i = 0; i < 3; i++) {
    const f = (((t * 0.7 + i / 3) % 1) + 1) % 1;
    c.fillStyle = `rgba(255,255,255,${0.55 * (1 - f)})`;
    c.beginPath();
    c.arc(-4 + i * 4 + Math.sin(f * 6 + i) * 2, -4 - f * 14, 2 + f * 3, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

export const ES: Tema = {
  id: "es",
  nome: "Espírito Santo",
  descricao: "O Convento da Penha no alto do penhasco, a Terceira Ponte, a Pedra Azul e colunas de granito com bromélias.",
  grupo: "estados",
  amostra: "linear-gradient(135deg, #3a8ab8 50%, #e8a0b8 50%)",
  onda: "sine",
  somBase: 523,
  paleta: {
    ceu: [["#e8a8b0", "#fde4cc"], ["#5aa4dc", "#d8eefa"], ["#5a5a9a", "#f2a874"], ["#081434", "#22386a"]],
    longe: SERRA,
    perto: MATA,
    chao: "#d8c8a4",
    chaoLinha: "#a8946a",
    coluna: { corpo: "#9a9aa0", sombra: "#76767e", luz: "#bcbcc4", contorno: "#34343c" },
    maleta: { corpo: "#e8a0b8", escuro: "#8a4a62", fivela: "#ffffff", alca: "#8a4a62" },
    asa: { cor: "#ffffff", contorno: "#3a7aa8" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: ["#e8a0b8", "#3a8ab8", "#ffffff"],
    recorde: {
      cor: "#e870a0", traco: [14, 4, 2, 4, 2, 4], largura: 3.5,
      aviso: { texto: "NOVO RECORDE!", fonte: "800 28px system-ui, sans-serif", corTexto: "#ffffff", corContorno: "#1e3a5a", corFundo: "rgba(58,122,168,0.9)", anima: "pulsa" },
    },
    hud: "#1a2a3a",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // o lagarto da Pedra Azul ganha vida e atravessa a orla
    // desenhado em escala 1,8 a partir da origem (x, base)
    ctx.save();
    ctx.translate(atravessa(w, f, 240), h - 46);
    ctx.scale(1.8, 1.8);
    const x = 0;
    const base = 0;
    const passo = Math.sin(t * 8);
    ctx.fillStyle = "#6a8ab0";
    ctx.strokeStyle = "#6a8ab0";
    ctx.lineCap = "round";
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (const [px, fs] of [[-14, 1], [18, -1]]) {
      ctx.moveTo(x + px, base - 8);
      ctx.lineTo(x + px - 8 + passo * fs * 6, base);
      ctx.moveTo(x + px, base - 8);
      ctx.lineTo(x + px + 8 - passo * fs * 6, base);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x, base - 10, 30, 9, 0, 0, Math.PI * 2);
    ctx.moveTo(x + 44, base - 12);
    ctx.ellipse(x + 34, base - 12, 12, 7, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x - 28, base - 10);
    ctx.quadraticCurveTo(x - 60, base - 4 + passo * 5, x - 84, base - 10 - passo * 4);
    ctx.stroke();
    ctx.fillStyle = "#3a5070";
    for (let i = 0; i < 6; i++) ctx.fillRect(x - 22 + i * 8, base - 19, 4, 4);
    ctx.fillStyle = "#ffd23a";
    ctx.beginPath();
    ctx.arc(x + 38, base - 16, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  decor(ctx, w, h, off, tod, t) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.82, h * 0.15, 20);
    else sol(ctx, w * 0.82, h * 0.16, 24, "#fff4d6", "rgba(255,236,180,0.45)");
    // serras com a Pedra Azul (o lagarto de pedra)
    const serra = ciclo(SERRA, tod);
    colinas(ctx, w, h - 40, off * 0.04, serra, 130, 26, 0.006, 2);
    repetir(w, off * 0.04, 1500, (x) => {
      ctx.fillStyle = serra;
      ctx.beginPath();
      ctx.moveTo(x + 200, h - 160);
      ctx.bezierCurveTo(x + 220, h - 260, x + 300, h - 300, x + 340, h - 260);
      ctx.lineTo(x + 360, h - 268);
      ctx.bezierCurveTo(x + 380, h - 240, x + 420, h - 220, x + 440, h - 160);
      ctx.fill();
    });
    // a baía, o penhasco da Penha e a Terceira Ponte
    const yMar = h - 110;
    const pedra = ciclo(PEDRA, tod);
    const mata = ciclo(MATA, tod);
    repetir(w, off * 0.12, 1300, (x) => penha(ctx, x + 300, yMar, pedra, mata, ciclo(CONVENTO, tod), noite));
    mar(ctx, w, yMar, 70, off * 0.16, ciclo(BAIA, tod), "rgba(255,255,255,0.5)", t);
    repetir(w, off * 0.18, 1500, (x) => terceiraPonte(ctx, x + 600, yMar + 14, ciclo(PONTE, tod), noite));
    // barcos de pesca na baía
    repetir(w, off * 0.2 + t * 6, 500, (x, k) => {
      const bx = x + variar(k, 37, 200);
      const by = yMar + 30 + variar(k, 7, 3) * 8 + Math.sin(t * 1.4 + k) * 1.5;
      ctx.fillStyle = "#f2ece0";
      ctx.beginPath();
      ctx.moveTo(bx - 14, by);
      ctx.lineTo(bx + 14, by);
      ctx.lineTo(bx + 10, by + 5);
      ctx.lineTo(bx - 10, by + 5);
      ctx.fill();
      ctx.fillStyle = "#c8322f";
      ctx.fillRect(bx - 14, by - 1, 28, 2);
    });
    // a orla com mata e pedras
    colinas(ctx, w, h - 40, off * 0.36, mata, 22, 8, 0.02, 5);
    repetir(w, off * 0.4, 210, (x, k) => {
      ctx.fillStyle = pedra;
      ctx.beginPath();
      ctx.ellipse(x + variar(k, 19, 60), h - 46, 28, 16, 0, Math.PI, 0);
      ctx.fill();
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#c8b496", "#3e382e"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 3);
    // conchas e pedrinhas na areia
    for (let x = -(off % 37); x < w; x += 37) {
      const k = Math.round((x + off) / 37);
      ctx.fillStyle = k % 3 ? "#a8946a" : "#f2e0d0";
      ctx.beginPath();
      ctx.ellipse(x + 10, y + 10 + variar(k, 7, 20), 3, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // granito cinza com as bromélias agarradas
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, c.luz);
    g.addColorStop(0.45, c.corpo);
    g.addColorStop(1, c.sombra);
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, len);
    ctx.fillStyle = "rgba(30,30,40,0.25)";
    for (let y = 3; y < len; y += 6) ctx.fillRect(x0 + 2 + variar(Math.round(y) + variante * 7, 37, w - 4), y, 2, 2);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    for (let y = 5; y < len; y += 9) ctx.fillRect(x0 + 2 + variar(Math.round(y) * 3 + variante, 41, w - 4), y, 1.6, 1.6);
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    const deCima = ctx.getTransform().d < 0;
    for (let y = 70 + variante * 35, i = 0; y < len - 20; y += 140, i++) {
      ctx.save();
      ctx.translate(i % 2 ? x0 + 20 : x0 + w - 20, y);
      if (deCima) ctx.scale(1, -1);
      bromelia(ctx, 0, 0, 1.5, i % 2 ? 1 : -1);
      ctx.restore();
    }
    if (quebrada) {
      ctx.fillStyle = c.corpo;
      ctx.beginPath();
      ctx.moveTo(x0, 14);
      ctx.lineTo(x0 + w * 0.3, 2);
      ctx.lineTo(x0 + w * 0.55, 10);
      ctx.lineTo(x0 + w * 0.8, 3);
      ctx.lineTo(x0 + w, 12);
      ctx.lineTo(x0 + w, 16);
      ctx.lineTo(x0, 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // laje de granito polido
    ctx.fillStyle = c.luz;
    ctx.fillRect(x0 - 5, 0, w + 10, 10);
    ctx.strokeRect(x0 - 5, 0, w + 10, 10);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(x0 - 3, 2, w + 6, 2);
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => panela(c, t));
  },
};
