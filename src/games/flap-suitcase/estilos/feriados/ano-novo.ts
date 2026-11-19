// Confraternização Universal (1/1): a virada na praia, com fogos sobre o mar, balsas acesas,
// gente de branco pulando as sete ondas e flores brancas na beira d'água.
import { ciclo, maletaPadrao, rr, variar, type Ctx, type Tema } from "../../themes";
import { estrelasFixas, figura, fogos, letreiro, luzinhas, mar, predios, repetir, surge } from "../kit";

const FOGOS = ["#ffd24d", "#ff6a8a", "#7af0ff", "#b88aff", "#ffffff", "#7aff9a"];
// cores por hora do dia (amanhecer, dia, entardecer, noite); aqui é sempre a noite da virada
const MORROS = ["#141c3e", "#121a3a", "#181a3e", "#0a0f26"];
const MAR = ["#10224a", "#0e2048", "#142050", "#08142e"];
const AREIA = ["#c9b48a", "#c4b088", "#bca684", "#8a7a62"];
const GENTE = ["#f4f1ea", "#f6f3ec", "#efe8e2", "#dcd6d0"];

/** Flor branca (rosa ou palma) boiando. */
function flor(ctx: Ctx, x: number, y: number, s: number) {
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * 2.4 * s, y + Math.sin(a) * 1.2 * s, 2.4 * s, 1.4 * s, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#ffe9a8";
  ctx.beginPath();
  ctx.arc(x, y, 1.1 * s, 0, Math.PI * 2);
  ctx.fill();
}

/** Cartola dourada com brilho. */
function cartola(c: Ctx, t: number) {
  c.save();
  c.translate(-9, -22);
  c.rotate(-0.22);
  c.fillStyle = "#e8b83a";
  c.strokeStyle = "#8a6414";
  c.lineWidth = 1;
  c.beginPath();
  c.ellipse(0, 4, 11, 2.6, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(-7, 4);
  c.lineTo(-6, -12);
  c.lineTo(6, -12);
  c.lineTo(7, 4);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = "#ffffff";
  c.fillRect(-6.5, -1, 13, 2.6);
  c.beginPath();
  c.ellipse(0, -12, 6, 1.8, 0, 0, Math.PI * 2);
  c.fillStyle = "#ffd970";
  c.fill();
  c.stroke();
  // faísca que gira em volta
  const a = t * 5;
  c.fillStyle = "#ffffff";
  c.globalAlpha = 0.6 + 0.4 * Math.sin(t * 11);
  c.beginPath();
  const [sx, sy] = [Math.cos(a) * 12, -6 + Math.sin(a) * 6];
  for (let i = 0; i < 8; i++) {
    const r = i % 2 ? 0.8 : 2.6;
    const b = (i * Math.PI) / 4;
    c.lineTo(sx + Math.cos(b) * r, sy + Math.sin(b) * r);
  }
  c.fill();
  c.globalAlpha = 1;
  c.restore();
}

export const ANO_NOVO: Tema = {
  id: "ano-novo",
  nome: "Ano-Novo",
  descricao: "1º de janeiro: a virada na praia, com fogos sobre o mar e gente de branco pulando as sete ondas.",
  grupo: "feriados",
  janela: { tipo: "fixa", dia: 1, mes: 1 },
  amostra: "linear-gradient(135deg, #0b1440 50%, #f5c542 50%)",
  onda: "square",
  somBase: 659,
  capitel: "jonico",
  paleta: {
    // é sempre a noite da virada
    ceu: [["#120f3a", "#3a2a6a"], ["#0b1440", "#26306e"], ["#1a103e", "#4a2a6a"], ["#050822", "#151c4a"]],
    longe: MORROS,
    perto: MAR,
    chao: "#c4b088",
    chaoLinha: "#a8946a",
    coluna: { corpo: "#f8f5ee", sombra: "#ddd4c2", luz: "#ffffff", contorno: "#a8822a" },
    maleta: { corpo: "#f4f1ea", escuro: "#a8822a", fivela: "#e8b83a", alca: "#8a6414" },
    asa: { cor: "#fff3c8", contorno: "#c89a2a" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: ["#ffd24d", "#ffffff", "#ff6a8a"],
    recorde: {
      cor: "#f5c542", traco: [3, 3, 9, 3], largura: 3.5,
      aviso: { texto: "FELIZ RECORDE NOVO!", fonte: "800 26px system-ui, sans-serif", corTexto: "#ffe9a8", corContorno: "#3a2a0a", corFundo: "rgba(20,16,50,0.88)", anima: "pulsa" },
    },
    hud: "#fff3d6",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // na virada, depois da contagem regressiva, o estouro grande dos fogos
    if (f >= 0.45) fogos(ctx, w, h, t * 1.6, FOGOS, 12, 0.06, 0.45);
  },
  surpresaFrente(ctx, w, h, f) {
    // a contagem regressiva no céu e, na virada, o "FELIZ ANO-NOVO!"
    if (f < 0.45) {
      const n = 3 - Math.floor(f / 0.15);
      const k = (f % 0.15) / 0.15;
      ctx.globalAlpha = 1 - k * 0.6;
      letreiro(ctx, String(n), w / 2, h * 0.36, 90 + k * 30, "#ffe9a8", "#3a2a0a");
      return;
    }
    ctx.globalAlpha = surge(f);
    letreiro(ctx, "FELIZ ANO-NOVO!", w / 2, h * 0.36, 54, "#ffe9a8", "#3a2a0a");
  },
  decor(ctx, w, h, off, tod, t) {
    estrelasFixas(ctx, w, h, t, "#ffffff", 40, 0.45);
    fogos(ctx, w, h, t, FOGOS, 6, 0.08, 0.4);
    // morros e prédios da orla, na linha do horizonte
    const yMar = h - 190;
    const morros = ciclo(MORROS, tod);
    ctx.fillStyle = morros;
    repetir(w, off * 0.04, 900, (x) => {
      ctx.beginPath();
      ctx.moveTo(x, yMar);
      ctx.quadraticCurveTo(x + 120, yMar - 150, x + 220, yMar - 40);
      ctx.quadraticCurveTo(x + 300, yMar - 90, x + 420, yMar - 20);
      ctx.lineTo(x + 900, yMar);
      ctx.fill();
    });
    predios(ctx, w, yMar, off * 0.06, morros, "#ffe2a0", 0.9, 46, 30);
    // o mar, com o reflexo dos fogos e as balsas
    mar(ctx, w, yMar, 130, off * 0.12, ciclo(MAR, tod), "rgba(150,180,255,0.5)", t);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, yMar, w, 130);
    ctx.clip();
    ctx.translate(0, yMar * 2);
    ctx.scale(1, -1);
    ctx.globalAlpha = 0.28;
    fogos(ctx, w, h, t, FOGOS, 6, 0.08, 0.4);
    ctx.restore();
    ctx.globalAlpha = 1;
    repetir(w, off * 0.1, 520, (x, k) => {
      const bx = x + variar(k, 37, 200);
      ctx.fillStyle = "#050a1c";
      ctx.fillRect(bx, yMar + 14, 36, 6);
      luzinhas(ctx, [[bx + 4, yMar + 13], [bx + 14, yMar + 13], [bx + 24, yMar + 13], [bx + 33, yMar + 13]], t * 2 + k, ["#ffd24d", "#ffffff"], 1.5);
    });
    // espuma na beira e a areia
    const yAreia = h - 64;
    ctx.fillStyle = ciclo(AREIA, tod);
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w + 20; x += 20) ctx.lineTo(x, yAreia + Math.sin((x + off * 0.3) * 0.02) * 3);
    ctx.lineTo(w, h);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = 0; x <= w + 20; x += 20) ctx.lineTo(x, yAreia - 2 + Math.sin((x + off * 0.3) * 0.02 + t * 1.5) * 3);
    ctx.stroke();
    // flores na beira d'água
    repetir(w, off * 0.3, 70, (x, k) => flor(ctx, x + variar(k, 13, 40), yAreia - 8 + Math.sin(t * 1.4 + k) * 1.5, 1.1));
    // gente de branco pulando as ondas
    const gente = ciclo(GENTE, tod);
    repetir(w, off * 0.42, 260, (x, k) => {
      for (let i = 0; i < 3; i++) {
        if (variar(k * 3 + i, 7, 4) === 0) continue;
        const pulo = Math.max(0, Math.sin(t * 3.4 + k * 1.7 + i * 2.1));
        const braco = 2.6 * pulo + 0.3;
        figura(ctx, x + i * 34 + variar(k + i, 11, 18), yAreia + 10 - pulo * 9, 0.95, gente, { bracoE: -braco, bracoD: braco, pernaE: 0.25 * pulo, pernaD: -0.25 * pulo, dobra: 0.5 * pulo });
      }
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    ctx.fillStyle = ciclo(AREIA, tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = tema.paleta.chaoLinha;
    ctx.fillRect(0, y, w, 2);
    // pegadas e pétalas brancas na areia
    ctx.fillStyle = "rgba(90,70,40,0.35)";
    for (let x = -(off % 44); x < w; x += 44) {
      ctx.beginPath();
      ctx.ellipse(x + 10, y + 12, 3, 1.6, 0.3, 0, Math.PI * 2);
      ctx.ellipse(x + 22, y + 22, 3, 1.6, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#ffffff";
    for (let x = -(off % 71); x < w; x += 71) {
      ctx.beginPath();
      ctx.ellipse(x + 40, y + 28, 2.4, 1.3, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  coluna(ctx, w, len, variante, quebrada, tema, t) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // branco com volume, anéis dourados e um fio de lâmpadas douradas em espiral
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, c.sombra);
    g.addColorStop(0.35, c.luz);
    g.addColorStop(1, c.sombra);
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, len);
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    ctx.fillStyle = "#e8b83a";
    for (let y = 70 + variante * 30; y < len - 6; y += 140) ctx.fillRect(x0, y, w, 4);
    ctx.strokeStyle = "rgba(168,130,42,0.6)";
    ctx.lineWidth = 1;
    const pontos: [number, number][] = [];
    ctx.beginPath();
    for (let y = 30; y < len; y += 3) {
      const x = Math.sin(y * 0.045 + variante) * (w / 2 - 6);
      if (y === 30) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      if (y % 21 === 0) pontos.push([x, y]);
    }
    ctx.stroke();
    luzinhas(ctx, pontos, t * 1.5 + variante, ["#ffd24d", "#fff3c8"], 2);
    if (quebrada) {
      ctx.fillStyle = c.corpo;
      ctx.strokeStyle = c.contorno;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x0, 13);
      ctx.lineTo(x0 + w * 0.3, 3);
      ctx.lineTo(x0 + w * 0.55, 11);
      ctx.lineTo(x0 + w * 0.8, 1);
      ctx.lineTo(x0 + w, 9);
      ctx.lineTo(x0 + w, 15);
      ctx.lineTo(x0, 15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // capitel dourado
    ctx.fillStyle = "#f0c84a";
    ctx.strokeStyle = "#8a6414";
    ctx.lineWidth = 1.5;
    rr(ctx, x0 - 6, 0, w + 12, 9, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#e8b83a";
    ctx.fillRect(x0 - 1, 9, w + 2, 12);
    ctx.strokeRect(x0 - 1, 9, w + 2, 12);
    ctx.fillStyle = "#fff3c8";
    for (let x = x0 + 5; x < x0 + w - 2; x += 9) {
      ctx.beginPath();
      ctx.arc(x, 15, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => cartola(c, t));
  },
};
