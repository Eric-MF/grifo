// Alagoas: as piscinas naturais de Maragogi, com o mar em faixas de turquesa sobre os arrecifes, as jangadas que levam
// até elas, os coqueirais e as colunas de arrecife de coral; na maleta, o colar de conchas.
import { ciclo, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, jangada, lua, mar, noiteDe, palmeira, repetir, sol } from "../kit";

// cores por hora do dia (amanhecer, dia, entardecer, noite)
const MAR_FUNDO = ["#2a6a9a", "#1a6aa8", "#3a4a8a", "#081a3a"];
const MAR_RASO = ["#4ab8c8", "#2ad0d0", "#5a8ab0", "#10303e"];
const ARRECIFE = ["#a88a7a", "#b0907a", "#8a6e72", "#22202a"];
const AREIA = ["#f6e6c0", "#fbeec8", "#ead0b0", "#5a5248"];
const COQUEIRO = ["#2f5a3a", "#2a6038", "#2e3e36", "#081410"];
const CORAIS = ["#ff7a5a", "#c05ad8", "#ffb23a", "#ff5a8a"];

/** Colar de conchas atravessado na maleta. */
function colar(c: Ctx) {
  c.strokeStyle = "#c8a46a";
  c.lineWidth = 0.9;
  c.beginPath();
  c.moveTo(-20, -14);
  c.quadraticCurveTo(0, 2, 20, -14);
  c.stroke();
  for (let i = 0; i < 7; i++) {
    const f = i / 6;
    const x = -20 + f * 40;
    const y = -14 + Math.sin(f * Math.PI) * 8;
    c.fillStyle = i % 2 ? "#fff0e0" : "#ffb8a0";
    c.beginPath();
    c.moveTo(x - 2.6, y);
    c.quadraticCurveTo(x, y - 4, x + 2.6, y);
    c.quadraticCurveTo(x, y + 2.4, x - 2.6, y);
    c.fill();
  }
  c.fillStyle = "#ff8a6a";
  c.beginPath();
  c.arc(0, -6, 2.4, 0, Math.PI * 2);
  c.fill();
}

/**
 * Peixe-boi visto de lado pela água clara, virado para a direita: o corpo roliço e enrugado, a cauda em remo redondo
 * que sobe e desce, a nadadeira com as unhas, o focinho grande com os bigodes e as manchas de alga no dorso, com os
 * reflexos do sol passando por cima. `respira` (0 a 1, ou negativo para nunca) é o ciclo de subir para respirar.
 */
function peixeBoi(ctx: Ctx, x: number, y: number, s: number, t: number, k: number, respira: number) {
  const sobe = respira >= 0 ? Math.max(0, Math.sin(((respira - 0.35) / 0.4) * Math.PI)) * (respira > 0.35 && respira < 0.75 ? 1 : 0) : 0;
  const rabo = Math.sin(t * 1.7 + k) * 0.28;
  ctx.save();
  ctx.translate(x, y - sobe * 8);
  ctx.scale(s, s);
  ctx.rotate(-sobe * 0.18 + Math.sin(t * 0.9 + k) * 0.03);
  const pele = ctx.createLinearGradient(0, -18, 0, 16);
  pele.addColorStop(0, "#5c6066");
  pele.addColorStop(0.6, "#7c7c80");
  pele.addColorStop(1, "#a29c94");
  // a cauda em remo, subindo e descendo
  ctx.save();
  ctx.translate(-46, 0);
  ctx.rotate(rabo);
  ctx.fillStyle = "#5c6066";
  ctx.beginPath();
  ctx.moveTo(4, -7);
  ctx.quadraticCurveTo(-10, -9, -18, -15);
  ctx.bezierCurveTo(-36, -18, -40, 16, -18, 14);
  ctx.quadraticCurveTo(-10, 8, 4, 7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // o corpo roliço
  const corpo = new Path2D();
  corpo.moveTo(-48, -7);
  corpo.bezierCurveTo(-34, -18, 2, -21, 30, -14);
  corpo.quadraticCurveTo(40, -11, 46, -12);
  corpo.bezierCurveTo(56, -13, 66, -8, 66, 0);
  corpo.bezierCurveTo(66, 7, 58, 10, 50, 9);
  corpo.bezierCurveTo(30, 18, -10, 19, -36, 10);
  corpo.quadraticCurveTo(-46, 7, -48, 7);
  corpo.closePath();
  ctx.fillStyle = pele;
  ctx.fill(corpo);
  ctx.save();
  ctx.clip(corpo);
  // manchas de alga no dorso e as rugas do pescoço
  ctx.fillStyle = "rgba(80,120,70,0.35)";
  for (const [ax, ay, r] of [[-20, -13, 7], [4, -16, 5], [-34, -6, 4]] as const) {
    ctx.beginPath();
    ctx.ellipse(ax, ay, r * 1.6, r * 0.7, -0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(40,42,48,0.45)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  for (const rx of [32, 37, 42]) {
    ctx.moveTo(rx, -12);
    ctx.quadraticCurveTo(rx - 3, 0, rx, 12);
  }
  ctx.stroke();
  // os reflexos do sol que passam pela água e dançam no dorso
  ctx.strokeStyle = "rgba(220,255,250,0.32)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const cx = -50 + ((i * 23 + t * 14) % 130);
    ctx.moveTo(cx, -20);
    ctx.quadraticCurveTo(cx + 6, -12 + Math.sin(t * 2 + i) * 3, cx + 2, -4);
  }
  ctx.stroke();
  ctx.restore();
  // o focinho grande, com os bigodes, a narina e o olhinho
  ctx.fillStyle = "#8a8682";
  ctx.beginPath();
  ctx.ellipse(60, 2, 7, 7.5, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3a3a40";
  for (const [bx, by] of [[60, 0], [63, 3], [58, 4], [62, 6], [57, 7], [64, -1]] as const) ctx.fillRect(bx, by, 1, 1);
  ctx.beginPath();
  ctx.ellipse(63, -6, 1.6, 1, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#16181c";
  ctx.beginPath();
  ctx.arc(50, -4, 1.5, 0, Math.PI * 2);
  ctx.fill();
  // a nadadeira, remando, com as três unhas
  ctx.save();
  ctx.translate(36, 8);
  ctx.rotate(0.5 + Math.sin(t * 1.7 + k + 1) * 0.35);
  ctx.fillStyle = "#666a70";
  ctx.beginPath();
  ctx.moveTo(-4, 0);
  ctx.quadraticCurveTo(-6, 12, -2, 18);
  ctx.quadraticCurveTo(4, 20, 6, 14);
  ctx.quadraticCurveTo(5, 4, 4, 0);
  ctx.fill();
  ctx.fillStyle = "#d8cfc0";
  for (const ux of [-2, 1, 4]) {
    ctx.beginPath();
    ctx.arc(ux, 16.5 - Math.abs(ux - 1) * 0.6, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // a água turquesa por cima, para parecer que está dentro do mar raso
  ctx.fillStyle = "rgba(42,200,208,0.16)";
  ctx.fill(corpo);
  ctx.restore();
  // as bolhas subindo da narina e, ao respirar, os anéis na superfície
  const nx = x + 63 * s;
  const ny = y - 6 * s - sobe * 8;
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  for (let i = 0; i < 4; i++) {
    const b = (t * 0.5 + i * 0.25 + k * 0.4) % 1;
    ctx.beginPath();
    ctx.arc(nx + Math.sin(b * 9 + i) * 3, ny - b * 34 * s, (1 + b * 1.6) * s, 0, Math.PI * 2);
    ctx.fill();
  }
  if (sobe > 0.05) {
    ctx.strokeStyle = `rgba(255,255,255,${0.7 * sobe})`;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 2; i++) {
      const r = (((respira - 0.35) * 4 + i * 0.5) % 1) * 22 * s;
      ctx.beginPath();
      ctx.ellipse(nx, ny - 14 * s, 6 + r, 2 + r * 0.25, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

export const AL: Tema = {
  id: "al",
  nome: "Alagoas",
  descricao: "As piscinas naturais de Maragogi, o mar turquesa sobre os arrecifes, jangadas e coqueirais.",
  grupo: "estados",
  amostra: "linear-gradient(135deg, #2ad0d0 50%, #fbeec8 50%)",
  onda: "sine",
  somBase: 554,
  paleta: {
    ceu: [["#f0a890", "#ffe2c0"], ["#3aa8e8", "#d4f2fc"], ["#4a4a9a", "#f4a464"], ["#06143a", "#1e3a6e"]],
    longe: MAR_FUNDO,
    perto: COQUEIRO,
    chao: "#fbeec8",
    chaoLinha: "#e0c898",
    coluna: { corpo: "#d8a890", sombra: "#b07e6a", luz: "#f0c8b0", contorno: "#5a3428" },
    maleta: { corpo: "#2ab0c0", escuro: "#0a5a6a", fivela: "#fff0e0", alca: "#0a5a6a" },
    asa: { cor: "#ffffff", contorno: "#0a8aa0" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: ["#2ad0d0", "#ffffff", "#ffb8a0"],
    recorde: {
      cor: "#00c8d8", traco: [4, 3, 4, 9], largura: 3.5,
      aviso: { texto: "NOVO RECORDE!", fonte: "800 28px system-ui, sans-serif", corTexto: "#ffffff", corContorno: "#0a4a5a", corFundo: "rgba(10,150,170,0.9)", anima: "pulsa" },
    },
    hud: "#0a2a3a",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // a mãe peixe-boi e o filhote nadando devagar pela piscina natural (Alagoas cuida dos peixes-boi em Porto de
    // Pedras), vistos pela água clara; a mãe sobe para respirar a cada tanto
    const x = atravessa(w, f, 160);
    const y = h - 150 + Math.sin(t * 1.1) * 3;
    const respira = (f * 1.6) % 1;
    peixeBoi(ctx, x, y, 1.15, t, 0, respira);
    peixeBoi(ctx, x - 44, y + 26 + Math.sin(t * 1.4 + 1) * 2, 0.58, t * 1.3, 1, -1);
  },
  decor(ctx, w, h, off, tod, t, tema, surpresa) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.8, h * 0.15, 20);
    else sol(ctx, w * 0.8, h * 0.16, 26, "#fff6dc", "rgba(255,240,190,0.5)");
    // o mar em faixas: fundo azul, o raso turquesa e os arrecifes à flor d'água
    const yMar = h - 250;
    mar(ctx, w, yMar, 70, off * 0.06, ciclo(MAR_FUNDO, tod), "rgba(255,255,255,0.45)", t);
    mar(ctx, w, yMar + 70, 140, off * 0.12, ciclo(MAR_RASO, tod), "rgba(255,255,255,0.6)", t);
    const arrecife = ciclo(ARRECIFE, tod);
    repetir(w, off * 0.1, 170, (x, k) => {
      ctx.fillStyle = arrecife;
      ctx.beginPath();
      ctx.ellipse(x + variar(k, 31, 60), yMar + 74, 40 + variar(k, 7, 3) * 14, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      // espuma batendo no arrecife
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.ellipse(x + variar(k, 31, 60) - 30, yMar + 71 + Math.sin(t * 2 + k) * 1.5, 14, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    // a surpresa: o peixe-boi nada no raso, atrás das jangadas, da areia e dos coqueiros
    surpresa?.();
    // jangadas indo e voltando das piscinas
    repetir(w, off * 0.14 + t * 10, 330, (x, k) => {
      jangada(ctx, x + variar(k, 37, 120), yMar + 110 + variar(k, 7, 3) * 14, 1, ["#ffffff", "#ffd23a", "#ff7a5a"][variar(k, 11, 3)], "#6a4a2a", t);
    });
    // a areia e os coqueiros
    ctx.fillStyle = ciclo(AREIA, tod);
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w + 20; x += 20) ctx.lineTo(x, yMar + 190 + Math.sin((x + off * 0.3) * 0.015) * 6);
    ctx.lineTo(w, h);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let x = 0; x <= w + 20; x += 20) ctx.lineTo(x, yMar + 188 + Math.sin((x + off * 0.3) * 0.015 + t * 1.2) * 6);
    ctx.stroke();
    const coqueiro = ciclo(COQUEIRO, tod);
    repetir(w, off * 0.4, 110, (x, k) => {
      if (variar(k, 7, 4) === 0) return;
      palmeira(ctx, x + variar(k, 23, 40), h - 40, 140 + variar(k, 13, 3) * 18, coqueiro, t, 0.28 * (variar(k, 3, 2) ? 1 : -1));
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#ead0b0", "#5a5248"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 2);
    // conchinhas e cocos caídos
    for (let x = -(off % 61); x < w; x += 61) {
      const k = Math.round((x + off) / 61);
      ctx.fillStyle = variar(k, 3, 2) ? "#ffb8a0" : "#6a4a2a";
      ctx.beginPath();
      ctx.ellipse(x + 20, y + 12 + variar(k, 7, 18), variar(k, 3, 2) ? 3 : 5, variar(k, 3, 2) ? 2 : 4.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // arrecife de coral: rocha porosa, com corais coloridos e o limo verde
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
    ctx.fillStyle = "rgba(90,52,40,0.35)";
    for (let y = 6; y < len; y += 9) {
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.ellipse(x0 + 6 + variar(Math.round(y) * 3 + i * 17 + variante, 37, w - 12), y + i * 4, 2.4, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const deCima = ctx.getTransform().d < 0;
    for (let y = 60 + variante * 30, i = 0; y < len - 10; y += 90, i++) {
      const cx = x0 + 14 + variar(i + variante, 7, w - 28);
      ctx.save();
      ctx.translate(cx, y);
      if (deCima) ctx.scale(1, -1);
      ctx.fillStyle = CORAIS[(i + variante) % CORAIS.length];
      for (const a of [-0.6, 0, 0.6]) {
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.roundRect(-2, -12, 4, 12, 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, -12, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
    ctx.restore();
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = c.luz;
      ctx.beginPath();
      ctx.moveTo(x0, 12);
      for (let i = 0; i <= 6; i++) ctx.lineTo(x0 + (i * w) / 6, i % 2 ? 3 : 9);
      ctx.lineTo(x0 + w, 14);
      ctx.lineTo(x0, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // a ponta à flor d'água: faixa turquesa com a espuma
    ctx.fillStyle = "#2ad0d0";
    ctx.fillRect(x0 - 3, 0, w + 6, 12);
    ctx.strokeRect(x0 - 3, 0, w + 6, 12);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    for (let x = x0 - 3; x < x0 + w + 3; x += 10) ctx.ellipse(x + 5, 3, 5, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a8a4a";
    ctx.fillRect(x0, 12, w, 3);
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, colar);
  },
};
