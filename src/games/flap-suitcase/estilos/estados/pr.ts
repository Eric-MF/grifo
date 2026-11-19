// Paraná: as Cataratas do Iguaçu em leque, com o arco-íris na névoa, os pinheirais de araucária,
// a estufa do Jardim Botânico de Curitiba e as colunas em tronco de araucária com pinhas.
import { ciclo, colinas, maletaPadrao, rr, variar, type Ctx, type Tema } from "../../themes";
import { araucaria, atravessa, ladrilho, lua, noiteDe, repetir, sol } from "../kit";

// cores por hora do dia (amanhecer, dia, entardecer, noite)
const PAREDAO = ["#6a5a5a", "#6a6058", "#5a4a52", "#16141c"];
const MATA = ["#3a6a3a", "#2e7038", "#384a3a", "#0a160e"];
const MATA_LONGE = ["#6a8a7a", "#5f9078", "#5a6274", "#14202a"];
const AGUA = ["#c8d4dc", "#d8ecf4", "#c8bccc", "#4a5a70"];
const ESPUMA = ["#ffffff", "#ffffff", "#f6e8ee", "#a8b4c8"];
const ARAUCARIA = ["#24402c", "#1f4428", "#26342c", "#060e0a"];
const ESTUFA = ["#e8eef0", "#f4fafc", "#e2d8e2", "#5a6478"];
const MATA_ALTO = ["#2f5a34", "#28623a", "#2e4034", "#08120c"];
const ARCO_IRIS = ["#ff4a4a", "#ffa83a", "#ffe83a", "#4ae86a", "#3a9aff", "#8a5aff"];

/** Cor em hexadecimal com transparência (para os degradês do arco-íris). */
function comAlfa(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/**
 * Uma queda das cataratas: a cortina de água que se abre um pouco para baixo, de borda ondulada, com os filetes
 * descendo, a espuma na borda de cima e a névoa batendo embaixo.
 */
function queda(ctx: Ctx, x: number, topo: number, larg: number, base: number, t: number, agua: string, espuma: string, k: number) {
  const alt = base - topo;
  const abre = larg * 0.12;
  ctx.fillStyle = agua;
  ctx.globalAlpha = 0.92;
  ctx.beginPath();
  ctx.moveTo(x, topo);
  ctx.lineTo(x + larg, topo);
  for (let y = 0; y <= alt; y += 12) ctx.lineTo(x + larg + (y / alt) * abre + Math.sin(y * 0.09 + t * 3 + k) * 2, topo + y);
  for (let y = alt; y >= 0; y -= 12) ctx.lineTo(x - (y / alt) * abre + Math.sin(y * 0.08 - t * 3 + k) * 2, topo + y);
  ctx.closePath();
  ctx.fill();
  // os filetes: riscos claros que descem, cada um no seu ritmo
  ctx.strokeStyle = espuma;
  ctx.lineWidth = 1.6;
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  for (let i = 0; i < larg / 6; i++) {
    const cx = x + 3 + i * 6 + variar(k + i, 7, 3);
    const fase = ((t * 1.3 + variar(k + i, 13, 10) / 10) % 1) * alt;
    for (let y = fase - alt; y < alt; y += alt / 2.2) {
      if (y + 22 < 0) continue;
      const y0 = Math.max(0, y);
      const y1 = Math.min(alt, y + 22);
      ctx.moveTo(cx + (y0 / alt) * abre * ((cx - x) / larg - 0.5) * 2, topo + y0);
      ctx.lineTo(cx + (y1 / alt) * abre * ((cx - x) / larg - 0.5) * 2, topo + y1);
    }
  }
  ctx.stroke();
  // a espuma na borda de cima e a névoa embaixo
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = espuma;
  ctx.fillRect(x - 1, topo - 1, larg + 2, 3);
  ctx.globalAlpha = 0.6;
  for (let i = 0; i < Math.max(3, larg / 14); i++) {
    const r = 6 + variar(k + i, 17, 4) * 2.5 + Math.sin(t * 2 + i + k) * 2;
    ctx.beginPath();
    ctx.arc(x - abre + i * ((larg + abre * 2) / Math.max(3, larg / 14)) + 6, base - 2, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Araucária de longe: o tronco curto e a copa em taça, em dois andares (o desenho cheio some nesse tamanho). */
function araucariaLonge(ctx: Ctx, x: number, base: number, alt: number, cor: string) {
  ctx.strokeStyle = cor;
  ctx.lineWidth = Math.max(1.4, alt * 0.06);
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.lineTo(x, base - alt * 0.8);
  ctx.stroke();
  ctx.fillStyle = cor;
  for (const [dy, larg, esp] of [[0.86, 0.5, 0.16], [0.66, 0.36, 0.13]]) {
    const y = base - alt * dy!;
    ctx.beginPath();
    ctx.moveTo(x - alt * larg!, y - alt * 0.06);
    ctx.quadraticCurveTo(x, y + alt * esp!, x + alt * larg!, y - alt * 0.06);
    ctx.quadraticCurveTo(x, y - alt * esp! * 0.5, x - alt * larg!, y - alt * 0.06);
    ctx.fill();
  }
}

/** A mata no alto do paredão: copas de tamanhos variados e, no meio delas, araucárias pequenas. */
function mataNoAlto(ctx: Ctx, x0: number, x1: number, y: number, cor: string, pinho: string, k: number) {
  ctx.fillStyle = cor;
  for (let x = x0, i = 0; x < x1; x += 14 + variar(k + i, 7, 3) * 4, i++) {
    const r = 7 + variar(k + i, 11, 4) * 3;
    ctx.beginPath();
    ctx.arc(x, y + 2 - variar(k + i, 13, 3) * 2, r, Math.PI, 0);
    ctx.fill();
    if (variar(k + i, 17, 4) === 0) araucariaLonge(ctx, x + 4, y + 2, 30 + variar(k + i, 19, 3) * 7, pinho);
  }
  ctx.fillRect(x0 - 6, y, x1 - x0 + 12, 4);
}

/** A estufa do Jardim Botânico: estrutura de ferro branco e vidro, com a cúpula. */
function estufa(ctx: Ctx, x: number, base: number, cor: string, acesas: number) {
  ctx.strokeStyle = cor;
  ctx.fillStyle = acesas > 0.3 ? "rgba(255,226,160,0.35)" : "rgba(200,230,240,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.lineTo(x, base - 30);
  ctx.quadraticCurveTo(x + 40, base - 54, x + 70, base - 50);
  ctx.quadraticCurveTo(x + 90, base - 96, x + 110, base - 50);
  ctx.quadraticCurveTo(x + 140, base - 54, x + 180, base - 30);
  ctx.lineTo(x + 180, base);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 15; i < 180; i += 15) {
    ctx.moveTo(x + i, base);
    ctx.lineTo(x + i, base - 30 - Math.sin((i / 180) * Math.PI) * 30);
  }
  ctx.moveTo(x, base - 16);
  ctx.lineTo(x + 180, base - 16);
  ctx.stroke();
  ctx.fillStyle = cor;
  ctx.fillRect(x + 88, base - 104, 4, 10);
}

/** Capa de chuva amarela, transparente, com o capuz, cobrindo a tampa (a de quem visita as Cataratas). */
function capa(c: Ctx, t: number) {
  const bal = Math.sin(t * 8) * 1.5;
  c.fillStyle = "rgba(255,210,26,0.55)";
  c.strokeStyle = "#c8a40a";
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(-25, -4);
  c.lineTo(-24, -15);
  c.quadraticCurveTo(-12, -19, 0, -19);
  c.quadraticCurveTo(12, -19, 24, -15);
  c.lineTo(25 + bal, -4);
  c.quadraticCurveTo(0, -1, -25 - bal, -4);
  c.closePath();
  c.fill();
  c.stroke();
  // o capuz, de lado
  c.fillStyle = "#ffd21a";
  c.beginPath();
  c.moveTo(-22, -15);
  c.quadraticCurveTo(-24, -31, -10, -30);
  c.quadraticCurveTo(-3, -28, -6, -16);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = "rgba(255,255,255,0.5)";
  rr(c, -19, -26, 3, 8, 1.5);
  c.fill();
}

export const PR: Tema = {
  id: "pr",
  nome: "Paraná",
  descricao: "As Cataratas do Iguaçu com o arco-íris na névoa, pinheirais de araucária e a estufa do Jardim Botânico.",
  grupo: "estados",
  amostra: "linear-gradient(135deg, #2e7038 50%, #d8ecf4 50%)",
  onda: "sine",
  somBase: 440,
  paleta: {
    ceu: [["#e8a8a0", "#fde2cc"], ["#5aa8e0", "#dcf0fa"], ["#5a5a98", "#f0a878"], ["#0a1434", "#24386a"]],
    longe: MATA_LONGE,
    perto: ARAUCARIA,
    chao: "#7a5a3a",
    chaoLinha: "#4a3420",
    coluna: { corpo: "#7a5236", sombra: "#56381f", luz: "#9a6e4a", contorno: "#2a1a0c" },
    maleta: { corpo: "#2e7038", escuro: "#123a1a", fivela: "#ffd21a", alca: "#123a1a" },
    asa: { cor: "#ffffff", contorno: "#2e7038" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: ["#ffd21a", "#ffffff", "#5aa8e0"],
    recorde: {
      cor: "#3ac0e8", traco: [10, 3, 2, 3, 2, 3], largura: 3.5,
      aviso: { texto: "NOVO RECORDE!", fonte: "800 28px system-ui, sans-serif", corTexto: "#ffffff", corContorno: "#0a3a1a", corFundo: "rgba(46,112,56,0.9)", anima: "pulsa" },
    },
    hud: "#0e2416",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // uma família de capivaras atravessando o parque, como em Curitiba
    const x0 = atravessa(w, f, 220);
    const base = h - 44;
    for (const [dx, s] of [[0, 1.3], [-60, 0.8], [-100, 0.7]] as const) {
      const x = x0 + dx;
      const passo = Math.sin(t * 6 + dx);
      ctx.fillStyle = "#7a5a3a";
      ctx.beginPath();
      ctx.ellipse(x, base - 14 * s, 22 * s, 13 * s, 0, 0, Math.PI * 2);
      ctx.moveTo(x + 30 * s, base - 22 * s);
      ctx.roundRect(x + 14 * s, base - 30 * s, 16 * s, 14 * s, 5 * s);
      ctx.fill();
      ctx.fillRect(x + 14 * s, base - 32 * s, 3 * s, 4 * s);
      for (const [px, fs] of [[-14, 1], [10, -1]]) ctx.fillRect(x + px * s + passo * fs * 2, base - 6 * s, 5 * s, 6 * s);
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(x + 24 * s, base - 26 * s, 2 * s, 2 * s);
    }
  },
  decor(ctx, w, h, off, tod, t) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.2, h * 0.14, 20);
    else sol(ctx, w * 0.2, h * 0.15, 24, "#fff4d6", "rgba(255,236,180,0.45)");
    colinas(ctx, w, h - 40, off * 0.04, ciclo(MATA_LONGE, tod), 170, 20, 0.006, 1);
    // as cataratas: o paredão em degraus com várias quedas, a névoa e o arco-íris
    const paredao = ciclo(PAREDAO, tod);
    const agua = ciclo(AGUA, tod);
    const espuma = ciclo(ESPUMA, tod);
    const mata = ciclo(MATA, tod);
    const pinho = ciclo(ARAUCARIA, tod);
    // araucárias pequenas na crista do morro de trás
    repetir(w, off * 0.04, 46, (x, k) => {
      if (variar(k, 5, 3) === 0) return;
      const X = x + off * 0.04;
      const y = h - 40 - 170 - Math.sin(X * 0.006 + 1) * 20 - Math.sin(X * 0.0138 + 2) * 8;
      araucariaLonge(ctx, x + variar(k, 7, 20), y + 4, 24 + variar(k, 11, 3) * 6, ciclo(MATA_LONGE, tod));
    });
    repetir(w, off * 0.1, 1400, (x, k) => {
      const topo = h - 290;
      const degrau = h - 200;
      ctx.fillStyle = paredao;
      ctx.beginPath();
      ctx.moveTo(x + 100, h - 90);
      for (let i = 0; i <= 18; i++) ctx.lineTo(x + 100 + i * 50, topo + (variar(i, 7, 4) - 1) * 6);
      ctx.lineTo(x + 1000, h - 90);
      ctx.fill();
      // o degrau do meio e as estrias da rocha
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(x + 100, degrau, 900, 8);
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      for (let i = 0; i < 40; i++) ctx.fillRect(x + 104 + i * 22 + variar(i, 13, 9), topo + 10, 2, 170 - variar(i, 7, 5) * 14);
      // as quedas de cima, do alto até o degrau, e as de baixo, do degrau até o rio, desencontradas
      for (let i = 0; i < 7; i++) {
        const cx = x + 140 + i * 120 + variar(i + k, 7, 30);
        if (cx > x + 470 && cx < x + 660) continue;
        const larg = 26 + variar(i + k, 13, 4) * 9;
        queda(ctx, cx, topo + 2, larg, degrau, t + i, agua, espuma, i);
        queda(ctx, cx + 30 + variar(i + k, 17, 3) * 12, degrau + 6, larg * 0.8, h - 120, t + i + 3, agua, espuma, i + 9);
      }
      // a mata no alto e no degrau, entre as quedas
      mataNoAlto(ctx, x + 104, x + 996, topo - 2, mata, pinho, k * 13);
      ctx.fillStyle = ciclo(MATA_ALTO, tod);
      for (let i = 0; i < 18; i++) {
        ctx.beginPath();
        ctx.arc(x + 118 + i * 50 + variar(i, 23, 12), degrau + 2, 9 + variar(i, 29, 3) * 3, Math.PI, 0);
        ctx.fill();
      }
      // a Garganta do Diabo, a queda mais larga, em ferradura, do alto até o rio
      queda(ctx, x + 510, topo + 2, 120, h - 120, t + 9, agua, espuma, 21);
      // o arco-íris na névoa: um degradê de cima para baixo faz as duas pontas sumirem
      if (noite < 0.6) {
        const cx = x + 575;
        const cy = h - 110;
        const R = 150;
        ctx.save();
        ctx.lineWidth = 5;
        ARCO_IRIS.forEach((cor, i) => {
          const r = R - i * 5;
          const a = 0.4 * (1 - noite);
          const g = ctx.createLinearGradient(0, cy - r, 0, cy - r * 0.08);
          g.addColorStop(0, comAlfa(cor, a));
          g.addColorStop(0.45, comAlfa(cor, a));
          g.addColorStop(1, comAlfa(cor, 0));
          ctx.strokeStyle = g;
          ctx.beginPath();
          ctx.arc(cx, cy, r, Math.PI * 1.02, Math.PI * 1.98);
          ctx.stroke();
        });
        ctx.restore();
      }
    });
    // a névoa que sobe do rio
    ctx.fillStyle = ciclo(["#ffffff", "#ffffff", "#fae6f0", "#788caa"], tod);
    ctx.globalAlpha = 0.4;
    repetir(w, off * 0.14 + t * 10, 120, (x, k) => {
      ctx.beginPath();
      ctx.ellipse(x + 60, h - 118 + Math.sin(t + k) * 4, 70, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    // a estufa do Jardim Botânico, ao longe
    repetir(w, off * 0.2, 1700, (x) => estufa(ctx, x + 1100, h - 76, ciclo(ESTUFA, tod), noite));
    // pinheirais de araucária
    colinas(ctx, w, h - 40, off * 0.26, mata, 40, 10, 0.012, 4);
    repetir(w, off * 0.34, 90, (x, k) => {
      if (variar(k, 7, 4) === 0) return;
      araucaria(ctx, x + variar(k, 31, 40), h - 50, 130 + variar(k, 13, 4) * 22, pinho);
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#6a4e36", "#201812"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = "#3f7a3a";
    ctx.fillRect(0, y, w, 4);
    // pinhões caídos
    for (let x = -(off % 41); x < w; x += 41) {
      const k = Math.round((x + off) / 41);
      ctx.fillStyle = "#a8643a";
      ctx.beginPath();
      ctx.ellipse(x + 12, y + 12 + variar(k, 7, 18), 2, 4, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // tronco de araucária: casca em placas
    ctx.fillStyle = c.corpo;
    ctx.fillRect(x0, 0, w, len);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, 0, w, len);
    ctx.clip();
    // as placas da casca, desenhadas uma vez num ladrilho de duas fileiras desencontradas
    ctx.fillStyle = ladrilho(ctx, "casca-araucaria", 18, 28, (l) => {
      l.fillStyle = c.corpo;
      l.fillRect(0, 0, 18, 28);
      l.fillStyle = c.sombra;
      l.beginPath();
      for (const [cx, cy] of [[9, 7], [0, 21], [18, 21]]) {
        l.moveTo(cx + 8, cy);
        l.ellipse(cx, cy, 8, 6, 0, 0, Math.PI * 2);
      }
      l.fill();
      l.fillStyle = c.luz;
      for (const [cx, cy] of [[9, 7], [0, 21], [18, 21]]) l.fillRect(cx - 5, cy - 3, 8, 2);
    });
    ctx.fillRect(x0, 0, w, len);
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, "rgba(255,255,255,0.12)");
    g.addColorStop(0.5, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(0,0,0,0.3)");
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, len);
    ctx.restore();
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      // tronco partido, com a madeira clara por dentro
      ctx.fillStyle = "#d8b07a";
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
    // corte reto com os anéis e uma fileira de pinhas
    ctx.fillStyle = "#d8b07a";
    ctx.fillRect(x0 - 3, 0, w + 6, 9);
    ctx.strokeRect(x0 - 3, 0, w + 6, 9);
    ctx.strokeStyle = "rgba(90,56,31,0.5)";
    ctx.beginPath();
    ctx.moveTo(x0 + 6, 4.5);
    ctx.lineTo(x0 + w - 6, 4.5);
    ctx.stroke();
    ctx.fillStyle = "#5a3a1f";
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(x0 + 9 + i * ((w - 18) / 3), 17, 7.5, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#a8643a";
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) ctx.fillRect(x0 + 5 + i * ((w - 18) / 3) + j * 3, 14 + (j % 2) * 3, 2, 2);
    }
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => capa(c, t));
  },
};
