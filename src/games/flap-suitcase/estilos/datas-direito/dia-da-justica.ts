// Dia da Justiça (8/12, Decreto-Lei 8.292/1945, feriado forense): a Praça dos Três Poderes, com a colunata do Supremo
// e a estátua A Justiça, de olhos vendados e a espada no colo; as colunas são de mármore com a balança, e na maleta vai a toga.
import { ciclo, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, lua, noiteDe, repetir, sol } from "../kit";

const OURO = "#d8b04a";
// cores por hora do dia (amanhecer, dia, entardecer, noite)
const PALACIO = ["#ece6e0", "#f8f6f2", "#e6d8d6", "#5a5a72"];
const PALACIO_SOMBRA = ["#c4bcb6", "#d0ccc8", "#bcaab4", "#363650"];
const VIDRO = ["#5a7a98", "#4a84b0", "#4a5488", "#141e40"];
const ESTATUA = ["#6a6a72", "#6e7078", "#5e5a6e", "#20202c"];
const PRACA = ["#e4dcd0", "#ece6dc", "#d8c8c4", "#3e3c48"];

/** A colunata do Supremo: os pilares que tocam o chão só nas pontas, sob a laje fina, e o vidro atrás. */
function supremo(ctx: Ctx, x: number, base: number, cor: string, sombra: string, vidro: string) {
  ctx.fillStyle = vidro;
  ctx.fillRect(x + 10, base - 56, 300, 52);
  ctx.fillStyle = cor;
  ctx.fillRect(x - 10, base - 66, 340, 8);
  for (let i = 0; i < 8; i++) {
    const px = x + i * 46;
    ctx.beginPath();
    ctx.moveTo(px - 2, base - 58);
    ctx.quadraticCurveTo(px + 8, base - 30, px + 2, base);
    ctx.lineTo(px + 6, base);
    ctx.quadraticCurveTo(px + 14, base - 30, px + 26, base - 58);
    ctx.fill();
  }
  ctx.fillStyle = sombra;
  ctx.fillRect(x - 10, base - 4, 340, 4);
}

/** A Justiça de Ceschiatti: a figura sentada, de olhos vendados, com a espada sobre as pernas. */
function estatua(ctx: Ctx, x: number, base: number, cor: string) {
  ctx.fillStyle = "#d8d0c4";
  ctx.fillRect(x - 26, base - 16, 52, 16);
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(x - 16, base - 16);
  ctx.lineTo(x - 14, base - 34);
  ctx.quadraticCurveTo(x - 12, base - 62, x, base - 64);
  ctx.quadraticCurveTo(x + 10, base - 62, x + 10, base - 36);
  ctx.lineTo(x + 22, base - 34);
  ctx.lineTo(x + 22, base - 16);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, base - 70, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e8e0d4";
  ctx.fillRect(x - 7, base - 72, 14, 3);
  ctx.strokeStyle = "#e8e0d4";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 22, base - 34);
  ctx.lineTo(x + 30, base - 36);
  ctx.stroke();
}

/** Balança em relevo dourado. */
function balanca(ctx: Ctx, x: number, y: number, s: number) {
  ctx.strokeStyle = OURO;
  ctx.fillStyle = OURO;
  ctx.lineWidth = 1.6 * s;
  ctx.beginPath();
  ctx.moveTo(x, y + 10 * s);
  ctx.lineTo(x, y - 10 * s);
  ctx.moveTo(x - 12 * s, y - 8 * s);
  ctx.lineTo(x + 12 * s, y - 8 * s);
  for (const l of [-1, 1]) {
    ctx.moveTo(x + l * 12 * s, y - 8 * s);
    ctx.lineTo(x + l * 15 * s, y);
    ctx.moveTo(x + l * 12 * s, y - 8 * s);
    ctx.lineTo(x + l * 9 * s, y);
  }
  ctx.stroke();
  for (const l of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + l * 12 * s, y + 0.5 * s, 4.4 * s, 1.6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillRect(x - 5 * s, y + 10 * s, 10 * s, 2.4 * s);
}

/** A toga preta caindo sobre a tampa, com a gola branca. */
function toga(c: Ctx, t: number) {
  const bal = Math.sin(t * 7) * 1.5;
  c.fillStyle = "#141418";
  c.beginPath();
  c.moveTo(-25, -16);
  c.lineTo(25, -16);
  c.lineTo(27 + bal, 4);
  c.quadraticCurveTo(0, 0, -27 - bal, 4);
  c.closePath();
  c.globalAlpha = 0.92;
  c.fill();
  c.globalAlpha = 1;
  c.fillStyle = "#ffffff";
  c.beginPath();
  c.moveTo(-7, -16);
  c.lineTo(0, -8);
  c.lineTo(7, -16);
  c.closePath();
  c.fill();
  c.fillStyle = OURO;
  c.fillRect(-1.5, -10, 3, 3);
}

export const DIA_DA_JUSTICA: Tema = {
  id: "dia-da-justica",
  nome: "Dia da Justiça",
  descricao: "8 de dezembro, feriado forense: a colunata do Supremo e A Justiça de olhos vendados, na Praça dos Três Poderes.",
  grupo: "datas-direito",
  janela: { tipo: "fixa", dia: 8, mes: 12 },
  amostra: `linear-gradient(135deg, #f8f6f2 50%, ${OURO} 50%)`,
  onda: "sine",
  somBase: 440,
  climaFixo: "limpo",
  paleta: {
    ceu: [["#f0a888", "#ffe4c4"], ["#2a8ae0", "#cfe8fa"], ["#4a4aa0", "#f6a060"], ["#06123a", "#1e3a72"]],
    longe: PALACIO,
    perto: ESTATUA,
    chao: "#e4dcd0",
    chaoLinha: "#b8ae9e",
    coluna: { corpo: "#e8e2d8", sombra: "#bcb4a6", luz: "#fbf8f2", contorno: "#3a3428" },
    maleta: { corpo: "#6a2a32", escuro: "#300e14", fivela: OURO, alca: "#300e14" },
    asa: { cor: "#ffffff", contorno: OURO },
    moeda: ["#ffd866", "#c08a1e"],
    particula: [OURO, "#ffffff", "#141418"],
    recorde: {
      cor: "#d8b04a", traco: [24, 4, 4, 4], largura: 3,
      aviso: { texto: "RECORDE TRANSITADO EM JULGADO!", fonte: "italic 800 22px Georgia, serif", corTexto: OURO, corContorno: "#0a0a0e", corFundo: "rgba(20,20,24,0.92)", anima: "pulsa" },
    },
    hud: "#141418",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // os códigos saem voando como passarinhos, batendo as páginas
    const x0 = atravessa(w, f, 260);
    const nomes = ["#6a2a32", "#1e3a6a", "#2a5a3a", "#5a4a2a", "#3a2a5a"];
    for (let i = 0; i < 5; i++) {
      const x = x0 - i * 60;
      const y = h * 0.24 + (i % 3) * 30 + Math.sin(t * 2 + i) * 10;
      const bate = Math.sin(t * 10 + i * 1.7) * 0.8;
      for (const l of [-1, 1]) {
        ctx.fillStyle = nomes[i];
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + l * 16 * Math.cos(bate), y - 12 - Math.sin(bate) * 8);
        ctx.lineTo(x + l * 18 * Math.cos(bate), y + 6 - Math.sin(bate) * 8);
        ctx.lineTo(x, y + 14);
        ctx.fill();
        ctx.fillStyle = "#f8f4ec";
        ctx.beginPath();
        ctx.moveTo(x, y + 2);
        ctx.lineTo(x + l * 14 * Math.cos(bate), y - 8 - Math.sin(bate) * 8);
        ctx.lineTo(x + l * 15 * Math.cos(bate), y + 4 - Math.sin(bate) * 8);
        ctx.lineTo(x, y + 12);
        ctx.fill();
      }
      ctx.fillStyle = OURO;
      ctx.fillRect(x - 1, y - 1, 2, 15);
    }
  },
  decor(ctx, w, h, off, tod, t) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.2, h * 0.14, 22);
    else sol(ctx, w * 0.2, h * 0.15, 26, "#fff6dc", "rgba(255,236,180,0.45)");
    // a linha reta do Planalto e o Supremo, com a estátua na frente
    ctx.fillStyle = ciclo(["#8a9a6a", "#86a066", "#6e7266", "#141a14"], tod);
    ctx.fillRect(0, h - 140, w, 20);
    ctx.fillStyle = ciclo(PRACA, tod);
    ctx.fillRect(0, h - 120, w, 80);
    repetir(w, off * 0.14, 1000, (x) => {
      supremo(ctx, x + 300, h - 120, ciclo(PALACIO, tod), ciclo(PALACIO_SOMBRA, tod), ciclo(VIDRO, tod));
      // o mastro com a bandeira, como na praça
      ctx.fillStyle = "#9a9aa0";
      ctx.fillRect(x + 760, h - 300, 3, 180);
      const o = Math.sin(t * 3) * 1.5;
      ctx.fillStyle = "#009c3b";
      ctx.fillRect(x + 763, h - 298 + o * 0.3, 50, 34);
      ctx.fillStyle = "#ffdf00";
      ctx.beginPath();
      ctx.moveTo(x + 767, h - 281 + o * 0.4);
      ctx.lineTo(x + 788, h - 295 + o * 0.4);
      ctx.lineTo(x + 809, h - 281 + o * 0.4);
      ctx.lineTo(x + 788, h - 267 + o * 0.4);
      ctx.fill();
      ctx.fillStyle = "#002776";
      ctx.beginPath();
      ctx.arc(x + 788, h - 281 + o * 0.4, 7, 0, Math.PI * 2);
      ctx.fill();
    });
    repetir(w, off * 0.3, 900, (x) => estatua(ctx, x + 520, h - 44, ciclo(ESTATUA, tod)));
    // os postes da praça
    repetir(w, off * 0.34, 240, (x, k) => {
      ctx.fillStyle = "#3a3a42";
      ctx.fillRect(x + variar(k, 13, 40), h - 120, 3, 76);
      ctx.fillStyle = noite > 0.3 ? "#ffe8a0" : "#d8d4cc";
      ctx.beginPath();
      ctx.arc(x + variar(k, 13, 40) + 1.5, h - 124, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#d0c0bc", "#34323c"], tod);
    ctx.fillRect(0, y, w, h - y);
    // as placas de pedra portuguesa clara da praça
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 3);
    for (let x = -(off % 70); x < w; x += 70) ctx.fillRect(x, y, 1.6, h - y);
    ctx.fillRect(0, y + 22, w, 1.6);
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // mármore claro com veios e a balança dourada em relevo
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, c.luz);
    g.addColorStop(0.5, c.corpo);
    g.addColorStop(1, c.sombra);
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, len);
    ctx.strokeStyle = "rgba(120,110,100,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = 30 + variante * 40; y < len; y += 120) {
      ctx.moveTo(x0 + 4, y);
      ctx.bezierCurveTo(x0 + 24, y + 30, x0 + 40, y - 10, x0 + w - 4, y + 24);
    }
    ctx.stroke();
    const deCima = ctx.getTransform().d < 0;
    for (let y = 80 + variante * 30; y < len - 30; y += 160) {
      ctx.save();
      ctx.translate(0, y);
      if (deCima) ctx.scale(1, -1);
      balanca(ctx, 0, 0, 1.3);
      ctx.restore();
    }
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = c.luz;
      ctx.beginPath();
      ctx.moveTo(x0, 12);
      ctx.lineTo(x0 + w * 0.25, 3);
      ctx.lineTo(x0 + w * 0.5, 10);
      ctx.lineTo(x0 + w * 0.75, 1);
      ctx.lineTo(x0 + w, 8);
      ctx.lineTo(x0 + w, 14);
      ctx.lineTo(x0, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // a laje fina, sem ornamento, como a do Supremo
    ctx.fillStyle = c.luz;
    ctx.fillRect(x0 - 8, 0, w + 16, 9);
    ctx.strokeRect(x0 - 8, 0, w + 16, 9);
    ctx.fillStyle = OURO;
    ctx.fillRect(x0 - 8, 9, w + 16, 2);
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => toga(c, t));
  },
};
