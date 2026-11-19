// Constituição de 1824, a do Império, outorgada por D. Pedro I: o Paço Imperial no Rio, a carruagem com os cavalos,
// o verde e o ouro do Império e as colunas de mármore com a coroa; na maleta, a coroa imperial.
import { alturaCapitel, ciclo, colinas, colunaGrega, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { cavalo, lua, noiteDe, palmeira, repetir, sol, surge } from "../kit";

const VERDE = "#0e6a3a";
const OURO = "#e8b83a";
// cores por hora do dia (amanhecer, dia, entardecer, noite)
const MORRO = ["#8a9aa8", "#7fa4bc", "#6a6a8e", "#141c36"];
const PACO = ["#f2ece0", "#faf6ec", "#e8dcd4", "#5a5a6e"];
const PACO_SOMBRA = ["#cfc2ae", "#d8ccb8", "#c4b0aa", "#3a3a4e"];
const TELHA = ["#a8583a", "#b4603e", "#8a4a3a", "#2a1e22"];
const PALMEIRA = ["#3a5a3a", "#2f6038", "#344638", "#0a140e"];
const CARRUAGEM = ["#2a1a14", "#2a1c14", "#241614", "#08060a"];

/** Coroa imperial: o aro com as pedras, os arcos e a cruz no alto. */
function coroa(ctx: Ctx, x: number, y: number, s: number) {
  ctx.fillStyle = OURO;
  ctx.strokeStyle = "#7a5a10";
  ctx.lineWidth = 0.8 * s;
  ctx.beginPath();
  ctx.moveTo(x - 9 * s, y);
  ctx.lineTo(x - 10 * s, y - 8 * s);
  ctx.quadraticCurveTo(x - 6 * s, y - 15 * s, x, y - 15 * s);
  ctx.quadraticCurveTo(x + 6 * s, y - 15 * s, x + 10 * s, y - 8 * s);
  ctx.lineTo(x + 9 * s, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(x - 1 * s, y - 20 * s, 2 * s, 6 * s);
  ctx.fillRect(x - 3 * s, y - 18.5 * s, 6 * s, 2 * s);
  ctx.fillStyle = "#c8222e";
  ctx.fillRect(x - 9 * s, y - 3 * s, 18 * s, 3 * s);
  ctx.fillStyle = "#ffffff";
  for (const dx of [-6, 0, 6]) {
    ctx.beginPath();
    ctx.arc(x + dx * s, y - 1.5 * s, 1 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  const a0 = ctx.globalAlpha;
  ctx.fillStyle = VERDE;
  ctx.globalAlpha = a0 * 0.6;
  ctx.beginPath();
  ctx.moveTo(x - 7 * s, y - 4 * s);
  ctx.quadraticCurveTo(x, y - 14 * s, x + 7 * s, y - 4 * s);
  ctx.fill();
  ctx.globalAlpha = a0;
}

/** O Paço Imperial: o sobrado colonial comprido, de janelas em arco e a torrinha no meio. */
function paco(ctx: Ctx, x: number, base: number, cor: string, sombra: string, telha: string, acesas: number) {
  ctx.fillStyle = cor;
  ctx.fillRect(x, base - 70, 360, 70);
  ctx.fillRect(x + 150, base - 96, 60, 26);
  ctx.fillStyle = telha;
  ctx.beginPath();
  ctx.moveTo(x - 6, base - 70);
  ctx.lineTo(x + 10, base - 82);
  ctx.lineTo(x + 350, base - 82);
  ctx.lineTo(x + 366, base - 70);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 146, base - 96);
  ctx.lineTo(x + 180, base - 112);
  ctx.lineTo(x + 214, base - 96);
  ctx.fill();
  for (let a = 0; a < 2; a++) {
    for (let i = 0; i < 12; i++) {
      const jx = x + 10 + i * 29;
      const jy = base - 60 + a * 32;
      ctx.fillStyle = a === 0 && acesas > 0.3 ? "#ffe2a0" : sombra;
      ctx.beginPath();
      ctx.moveTo(jx, jy + 22);
      ctx.lineTo(jx, jy + 6);
      ctx.arc(jx + 7, jy + 6, 7, Math.PI, 0);
      ctx.lineTo(jx + 14, jy + 22);
      ctx.fill();
    }
  }
  ctx.fillStyle = VERDE;
  ctx.fillRect(x + 170, base - 92, 20, 14);
  coroa(ctx, x + 180, base - 92, 0.6);
}

/** Carruagem imperial com a parelha de cavalos a trote, na frente. */
function carruagem(ctx: Ctx, x: number, base: number, cor: string, t: number) {
  cavalo(ctx, x + 112, base, 0.85, cor, t + 0.3);
  cavalo(ctx, x + 68, base, 0.85, cor, t);
  ctx.fillStyle = cor;
  ctx.strokeStyle = cor;
  ctx.lineCap = "round";
  // a caixa da carruagem, com as janelas douradas, o cocheiro na boleia e as rodas girando
  ctx.beginPath();
  ctx.roundRect(x - 2, base - 40, 34, 26, [10, 10, 4, 4]);
  ctx.fill();
  ctx.fillRect(x + 28, base - 30, 12, 4);
  ctx.beginPath();
  ctx.arc(x + 34, base - 40, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x + 32, base - 37, 4, 7);
  ctx.fillStyle = OURO;
  ctx.fillRect(x + 4, base - 34, 10, 10);
  ctx.fillRect(x + 18, base - 34, 10, 10);
  ctx.strokeStyle = OURO;
  ctx.lineWidth = 1.4;
  for (const [rx, r] of [[x + 4, 9], [x + 30, 7]]) {
    ctx.beginPath();
    ctx.arc(rx, base - r, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI + t * 6;
      ctx.moveTo(rx + Math.cos(a) * r, base - r + Math.sin(a) * r);
      ctx.lineTo(rx - Math.cos(a) * r, base - r - Math.sin(a) * r);
    }
    ctx.stroke();
  }
  // o varal ligando a carruagem à parelha
  ctx.strokeStyle = cor;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x + 38, base - 18);
  ctx.lineTo(x + 118, base - 19);
  ctx.stroke();
}

export const C1824: Tema = {
  id: "c1824",
  nome: "Império (1824)",
  descricao: "A primeira Constituição, outorgada por D. Pedro I: o Paço Imperial, a carruagem e o verde e ouro do Império.",
  grupo: "constituicoes",
  amostra: `linear-gradient(135deg, ${VERDE} 50%, ${OURO} 50%)`,
  onda: "triangle",
  somBase: 440,
  capitel: "corintio",
  paleta: {
    ceu: [["#e8a890", "#fde2c4"], ["#5aa0dc", "#d8ecf8"], ["#5a5a9a", "#f2a874"], ["#081434", "#22386a"]],
    longe: MORRO,
    perto: PALMEIRA,
    chao: "#c8b48a",
    chaoLinha: "#9a8458",
    coluna: { corpo: "#f4efe4", sombra: "#d6cab2", luz: "#fffbf2", contorno: "#5a4a2a" },
    maleta: { corpo: VERDE, escuro: "#04341a", fivela: OURO, alca: "#04341a" },
    asa: { cor: "#ffffff", contorno: OURO },
    moeda: ["#ffd866", "#c08a1e"],
    particula: [OURO, VERDE, "#ffffff"],
    recorde: {
      cor: "#e8b83a", traco: [18, 4, 4, 4], largura: 3.5,
      aviso: { texto: "RECORDE IMPERIAL!", fonte: "italic 800 28px Georgia, serif", corTexto: OURO, corContorno: "#02200e", corFundo: "rgba(14,106,58,0.92)", anima: "pulsa" },
    },
    hud: "#04200e",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // a coroa imperial desce do céu, brilhando como na coroação, e sobe de volta
    const x = w * 0.5;
    const y = -90 + Math.sin(f * Math.PI) * h * 0.42;
    ctx.globalAlpha = surge(f);
    const g = ctx.createRadialGradient(x, y - 40, 10, x, y - 40, 140);
    g.addColorStop(0, "rgba(255,226,120,0.5)");
    g.addColorStop(1, "rgba(255,226,120,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - 140, y - 180, 280, 280);
    // os raios de luz girando devagar
    ctx.strokeStyle = "#fff0b0";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = t * 0.6 + (i * Math.PI) / 6;
      ctx.moveTo(x + Math.cos(a) * 62, y - 40 + Math.sin(a) * 62);
      ctx.lineTo(x + Math.cos(a) * 92, y - 40 + Math.sin(a) * 92);
    }
    ctx.stroke();
    coroa(ctx, x, y, 4);
    // as faíscas em volta
    ctx.fillStyle = "#fff6c8";
    for (let i = 0; i < 10; i++) {
      const a = i * 0.63 - t * 0.9;
      const r = 70 + Math.sin(t * 3 + i) * 14;
      ctx.fillRect(x + Math.cos(a) * r - 2, y - 40 + Math.sin(a) * r - 2, 4, 4);
    }
  },
  decor(ctx, w, h, off, tod, t) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.8, h * 0.14, 20);
    else sol(ctx, w * 0.8, h * 0.15, 24, "#fff4d6", "rgba(255,236,180,0.45)");
    colinas(ctx, w, h - 40, off * 0.05, ciclo(MORRO, tod), 140, 40, 0.006, 2);
    repetir(w, off * 0.14, 900, (x) => paco(ctx, x + 200, h - 92, ciclo(PACO, tod), ciclo(PACO_SOMBRA, tod), ciclo(TELHA, tod), noite));
    // a praça com as palmeiras imperiais
    ctx.fillStyle = ciclo(["#c8b48a", "#d0bc90", "#b49e86", "#2e2a24"], tod);
    ctx.fillRect(0, h - 92, w, 52);
    const palm = ciclo(PALMEIRA, tod);
    repetir(w, off * 0.3, 160, (x, k) => {
      if (variar(k, 3, 3) === 0) return;
      palmeira(ctx, x + variar(k, 31, 40), h - 50, 170 + variar(k, 7, 3) * 12, palm, t, 0.02);
    });
    // a carruagem passando
    repetir(w, off * 0.42 - t * 26, 760, (x, k) => carruagem(ctx, x + variar(k, 37, 200), h - 42, ciclo(CARRUAGEM, tod), t));
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#b49e7a", "#2e2a22"], tod);
    ctx.fillRect(0, y, w, h - y);
    // o calçamento de pedra da praça, com a barra verde e ouro
    ctx.fillStyle = VERDE;
    ctx.fillRect(0, y, w, 4);
    ctx.fillStyle = OURO;
    ctx.fillRect(0, y + 4, w, 2);
    ctx.fillStyle = "rgba(90,70,40,0.3)";
    for (let fila = 0; fila < 2; fila++) {
      const yy = y + 12 + fila * 13;
      for (let x = -((off + fila * 14) % 28); x < w; x += 28) ctx.fillRect(x, yy, 2, 12);
      ctx.fillRect(0, yy + 12, w, 1.4);
    }
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    colunaGrega(ctx, w, len, variante, quebrada, tema);
    const capH = alturaCapitel(variante, quebrada, tema);
    // a faixa verde com o friso de ouro, logo abaixo do capitel
    if (capH + 30 < len) {
      ctx.fillStyle = VERDE;
      ctx.fillRect(-w / 2, capH + 6, w, 14);
      ctx.fillStyle = OURO;
      ctx.fillRect(-w / 2, capH + 6, w, 2.4);
      ctx.fillRect(-w / 2, capH + 17.6, w, 2.4);
    }
    if (quebrada) return;
    // a coroa em relevo dourado no capitel, desvirada na coluna de cima
    const deCima = ctx.getTransform().d < 0;
    ctx.save();
    ctx.translate(0, capH / 2 + 8);
    if (deCima) ctx.scale(1, -1);
    coroa(ctx, 0, 6, 0.7);
    ctx.restore();
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => coroa(c, 8, -16, 0.9));
  },
};
