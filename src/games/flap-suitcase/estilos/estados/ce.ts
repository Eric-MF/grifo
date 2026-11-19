// Ceará: a Praia de Iracema com a Ponte dos Ingleses entrando no mar, as jangadas, as dunas e falésias coloridas
// e as colunas de garrafa de areia colorida; na maleta, o chapéu de palha do jangadeiro.
import { ciclo, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, dunas, figura, jangada, lua, mar, noiteDe, palmeira, repetir, sol } from "../kit";

const AREIAS = ["#e8b04a", "#c8603a", "#f2e0b0", "#8a4a2a", "#e88a4a", "#fbf0d0", "#b07a4a"];
// cores por hora do dia (amanhecer, dia, entardecer, noite)
const FALESIA = ["#d8844a", "#e08c4a", "#b86a4a", "#2e1c1a"];
const FALESIA_SOMBRA = ["#b0603a", "#b8663a", "#94503e", "#1e1214"];
const DUNA = ["#f6dcaa", "#fae4b0", "#e8c4a0", "#4e4640"];
const DUNA_SOMBRA = ["#dcb888", "#e2c08c", "#c8a088", "#2e2a28"];
const MAR = ["#3a8ab0", "#1a9ac8", "#4a6a9a", "#0a1e3a"];
const PONTE = ["#6a5a4a", "#6a5a4a", "#5a4a44", "#141210"];
const COQUEIRO = ["#2f5a3a", "#2a6038", "#2e3e36", "#081410"];

/** Ponte dos Ingleses: o píer de ferro sobre estacas, entrando no mar, com o quiosque na ponta. */
function ponte(ctx: Ctx, x: number, y: number, cor: string) {
  ctx.fillStyle = cor;
  ctx.fillRect(x, y, 300, 6);
  ctx.fillRect(x, y - 10, 300, 2);
  for (let i = 0; i <= 300; i += 20) {
    ctx.fillRect(x + i, y + 6, 3, 34);
    ctx.fillRect(x + i, y - 10, 2, 10);
  }
  ctx.fillRect(x + 260, y - 26, 44, 16);
  ctx.beginPath();
  ctx.moveTo(x + 254, y - 26);
  ctx.lineTo(x + 282, y - 40);
  ctx.lineTo(x + 310, y - 26);
  ctx.fill();
}

/** Chapéu de palha do jangadeiro, de aba larga. */
function chapeuPalha(c: Ctx) {
  c.save();
  c.translate(-6, -21);
  c.rotate(-0.1);
  c.fillStyle = "#e8c87a";
  c.strokeStyle = "#a8843a";
  c.lineWidth = 1;
  c.beginPath();
  c.ellipse(0, 2, 17, 3.6, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(-8, 2);
  c.quadraticCurveTo(-7, -10, 0, -10);
  c.quadraticCurveTo(7, -10, 8, 2);
  c.closePath();
  c.fill();
  c.stroke();
  c.strokeStyle = "#c8a45a";
  c.beginPath();
  for (let i = -6; i <= 6; i += 3) {
    c.moveTo(i, 1);
    c.lineTo(i * 0.6, -8);
  }
  c.stroke();
  c.fillStyle = "#c8322f";
  c.fillRect(-8, -2, 16, 2.2);
  c.restore();
}

export const CE: Tema = {
  id: "ce",
  nome: "Ceará",
  descricao: "A Ponte dos Ingleses na Praia de Iracema, as jangadas, as dunas e falésias e a garrafa de areia colorida.",
  grupo: "estados",
  amostra: "linear-gradient(180deg, #e8b04a 25%, #c8603a 25% 50%, #f2e0b0 50% 75%, #8a4a2a 75%)",
  onda: "triangle",
  somBase: 415,
  climaFixo: "limpo",
  paleta: {
    ceu: [["#f0a07a", "#ffe0b4"], ["#2a98e8", "#cff0fc"], ["#4a4a9a", "#f6a058"], ["#06143a", "#1e3c6e"]],
    longe: FALESIA,
    perto: COQUEIRO,
    chao: "#fae4b0",
    chaoLinha: "#d8b880",
    coluna: { corpo: "#dceaf0", sombra: "#a8c0cc", luz: "#ffffff", contorno: "#3a5a6a" },
    maleta: { corpo: "#2a7ab0", escuro: "#0e3a5a", fivela: "#ffd23a", alca: "#0e3a5a" },
    asa: { cor: "#ffffff", contorno: "#2a7ab0" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: AREIAS.slice(0, 4),
    recorde: {
      cor: "#e88a4a", traco: [14, 3, 3, 3], largura: 3.5,
      aviso: { texto: "ARRETADO! NOVO RECORDE!", fonte: "800 24px system-ui, sans-serif", corTexto: "#ffffff", corContorno: "#4a1a0a", corFundo: "rgba(200,96,58,0.92)", anima: "treme" },
    },
    hud: "#0e2a3a",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // um kitesurfista dando um salto enorme, com a pipa lá no alto
    const x = atravessa(w, f, 140);
    const salto = Math.max(0, Math.sin(f * Math.PI * 2.5));
    const sy = h - 70 - salto * 160;
    const kx = x + 60;
    const ky = Math.min(sy - 120, h * 0.16 + Math.sin(t) * 8);
    ctx.strokeStyle = "rgba(40,40,40,0.6)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x + 6, sy - 28);
    ctx.lineTo(kx - 30, ky + 6);
    ctx.moveTo(x + 6, sy - 28);
    ctx.lineTo(kx + 30, ky + 6);
    ctx.stroke();
    ctx.fillStyle = "#e8333a";
    ctx.beginPath();
    ctx.moveTo(kx - 40, ky + 8);
    ctx.quadraticCurveTo(kx, ky - 28, kx + 40, ky + 8);
    ctx.quadraticCurveTo(kx, ky - 12, kx - 40, ky + 8);
    ctx.fill();
    ctx.fillStyle = "#ffd23a";
    ctx.fillRect(kx - 3, ky - 14, 6, 6);
    ctx.save();
    ctx.translate(x, sy);
    ctx.rotate(salto * 0.6);
    ctx.fillStyle = "#2a8ae8";
    ctx.fillRect(-16, 0, 32, 4);
    figura(ctx, 0, 0, 0.9, "#2a1e1a", { tronco: -0.2, bracoE: -1.6, bracoD: -1.4, pernaE: 0.5, pernaD: -0.4, dobra: 0.8 });
    ctx.restore();
  },
  decor(ctx, w, h, off, tod, t, tema, surpresa) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.2, h * 0.15, 20);
    else sol(ctx, w * 0.2, h * 0.16, 28, "#fff6dc", "rgba(255,240,190,0.55)");
    // dunas ao longe e as falésias coloridas
    dunas(ctx, w, h - 190, off * 0.04, 90, ciclo(DUNA, tod), ciclo(DUNA_SOMBRA, tod), 320);
    const falesia = ciclo(FALESIA, tod);
    const sombra = ciclo(FALESIA_SOMBRA, tod);
    repetir(w, off * 0.08, 1100, (x, k) => {
      ctx.fillStyle = falesia;
      ctx.beginPath();
      ctx.moveTo(x, h - 160);
      ctx.lineTo(x + 20, h - 230);
      for (let i = 1; i < 12; i++) ctx.lineTo(x + 20 + i * 40, h - 232 + (variar(k + i, 7, 3) - 1) * 6);
      ctx.lineTo(x + 500, h - 226);
      ctx.lineTo(x + 520, h - 160);
      ctx.fill();
      // as camadas coloridas da falésia
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = [sombra, ciclo(["#f2c88a", "#f6d08e", "#d8aa88", "#3a2e2a"], tod), sombra, ciclo(["#e8a0a0", "#eca8a0", "#c88a94", "#2e1e24"], tod)][i];
        ctx.fillRect(x + 14 + i * 2, h - 216 + i * 14, 496 - i * 4, 6);
      }
    });
    // o mar, a ponte e as jangadas
    const yMar = h - 160;
    mar(ctx, w, yMar, 100, off * 0.14, ciclo(MAR, tod), "rgba(255,255,255,0.55)", t);
    // as jangadas mais ao largo (acima do pé das estacas, em yMar + 64) passam atrás da ponte; as mais perto, na frente
    const jangadas = (frente: boolean) =>
      repetir(w, off * 0.2 + t * 12, 300, (x, k) => {
        const y = yMar + 50 + variar(k, 7, 3) * 12;
        if (y > yMar + 64 !== frente) return;
        jangada(ctx, x + variar(k, 37, 120), y, 1.1, ["#ffffff", "#ffd23a", "#ff7a5a", "#7ac8ff"][variar(k, 11, 4)], "#6a4a2a", t);
      });
    jangadas(false);
    repetir(w, off * 0.18, 1300, (x) => ponte(ctx, x + 300, yMar + 24, ciclo(PONTE, tod)));
    jangadas(true);
    // a surpresa: o kitesurfista no mar, atrás da areia e dos coqueiros
    surpresa?.();
    // areia e coqueiros
    ctx.fillStyle = ciclo(DUNA, tod);
    ctx.fillRect(0, yMar + 96, w, h - yMar - 96);
    mar(ctx, w, yMar + 96, 6, off * 0.3, ciclo(MAR, tod), "rgba(255,255,255,0.9)", t);
    const coqueiro = ciclo(COQUEIRO, tod);
    repetir(w, off * 0.4, 230, (x, k) => {
      if (variar(k, 5, 3) === 0) return;
      palmeira(ctx, x + variar(k, 23, 80), h - 40, 140 + variar(k, 13, 3) * 18, coqueiro, t, 0.3);
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#e8c4a0", "#4e4640"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 2);
    // marcas do vento na areia
    ctx.strokeStyle = "rgba(160,120,60,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -(off % 30); x < w; x += 30) {
      ctx.moveTo(x, y + 12);
      ctx.quadraticCurveTo(x + 8, y + 9, x + 16, y + 12);
      ctx.moveTo(x + 12, y + 24);
      ctx.quadraticCurveTo(x + 20, y + 21, x + 28, y + 24);
    }
    ctx.stroke();
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // garrafa de areia colorida: camadas onduladas de areia por trás do vidro
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, 0, w, len);
    ctx.clip();
    for (let y = -10, i = 0; y < len + 20; y += 18, i++) {
      ctx.fillStyle = AREIAS[(i + variante * 2) % AREIAS.length];
      ctx.beginPath();
      ctx.moveTo(x0, y + 20);
      for (let x = 0; x <= w; x += 6) ctx.lineTo(x0 + x, y + Math.sin(x * 0.12 + i * 1.3 + variante) * 5);
      ctx.lineTo(x0 + w, y + 30);
      ctx.lineTo(x0, y + 30);
      ctx.closePath();
      ctx.fill();
    }
    // o vidro: brilho à esquerda, reflexo à direita
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(x0 + 6, 0, 7, len);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(x0 + w - 12, 0, 4, len);
    ctx.restore();
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      // vidro trincado
      ctx.fillStyle = "rgba(220,234,240,0.9)";
      ctx.beginPath();
      ctx.moveTo(x0, 14);
      ctx.lineTo(x0 + w * 0.2, 2);
      ctx.lineTo(x0 + w * 0.35, 10);
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
    // a boca da garrafa: o vidro limpo e a rolha de cortiça
    ctx.fillStyle = c.corpo;
    ctx.fillRect(x0 - 3, 0, w + 6, 14);
    ctx.strokeRect(x0 - 3, 0, w + 6, 14);
    ctx.fillStyle = "#c89a6a";
    ctx.fillRect(x0 + 10, 2, w - 20, 9);
    ctx.fillStyle = "rgba(90,60,30,0.4)";
    for (let x = x0 + 14; x < x0 + w - 12; x += 7) ctx.fillRect(x, 5, 2, 2);
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, chapeuPalha);
  },
};
