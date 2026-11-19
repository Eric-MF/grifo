// Rio de Janeiro: o Cristo Redentor no Corcovado, o Pão de Açúcar com o bondinho, a baía, as asas-deltas
// e a praia de Copacabana, com o calçadão de ondas pretas e brancas nas colunas.
import { ciclo, maletaPadrao, rr, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, letreiro, lua, mar, noiteDe, palmeira, repetir, sol } from "../kit";

// cores por hora do dia (amanhecer, dia, entardecer, noite)
const MORRO_LONGE = ["#7a8aa8", "#6f94b4", "#5e5a8a", "#121c36"];
const MORRO = ["#3f6a52", "#2f6e4a", "#36484a", "#0a1a1a"];
const PEDRA = ["#8a8a98", "#8496a4", "#6a6080", "#1a2030"];
const MAR = ["#4a8ab0", "#2a9ac8", "#4a6a96", "#0e2240"];
const AREIA = ["#f0d8a8", "#f6e0b0", "#e2c09a", "#5a4e44"];
const COQUEIRO = ["#2f5a3a", "#2a6038", "#2e3e36", "#081410"];
const PREDIO = ["#e8d8c8", "#f0ece4", "#d8c0b8", "#2a2e44"];

/** Ondas do calçadão de Copacabana: faixas pretas onduladas sobre o branco, de cima a baixo do retângulo. */
function calcadao(ctx: Ctx, x0: number, y0: number, larg: number, alt: number, fase: number) {
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  for (let y = y0 - 30 + fase; y < y0 + alt + 30; y += 28) {
    ctx.moveTo(x0, y);
    for (let x = 0; x <= larg; x += 4) ctx.lineTo(x0 + x, y + Math.sin((x / larg) * Math.PI * 2) * 7);
    for (let x = larg; x >= 0; x -= 4) ctx.lineTo(x0 + x, y + 10 + Math.sin((x / larg) * Math.PI * 2) * 7);
    ctx.closePath();
  }
  ctx.fill();
}

/** Cristo Redentor de braços abertos, no alto do Corcovado. */
function cristo(ctx: Ctx, x: number, topo: number, s: number) {
  ctx.fillRect(x - 6 * s, topo - 8 * s, 12 * s, 8 * s);
  ctx.beginPath();
  ctx.moveTo(x - 4 * s, topo - 8 * s);
  ctx.lineTo(x - 3 * s, topo - 34 * s);
  ctx.lineTo(x + 3 * s, topo - 34 * s);
  ctx.lineTo(x + 4 * s, topo - 8 * s);
  ctx.fill();
  ctx.fillRect(x - 17 * s, topo - 33 * s, 34 * s, 3.4 * s);
  ctx.beginPath();
  ctx.arc(x, topo - 37 * s, 2.6 * s, 0, Math.PI * 2);
  ctx.fill();
}

/** Óculos escuros apoiados na tampa. */
function oculos(c: Ctx) {
  c.fillStyle = "#141414";
  c.strokeStyle = "#ffcc33";
  c.lineWidth = 1;
  for (const x of [-15, 4]) {
    c.beginPath();
    c.roundRect(x, -21, 11, 6.5, [2, 2, 4, 4]);
    c.fill();
    c.stroke();
  }
  c.beginPath();
  c.moveTo(-4, -19);
  c.quadraticCurveTo(0, -21.5, 4, -19);
  c.stroke();
  c.fillStyle = "rgba(255,255,255,0.45)";
  c.fillRect(-13, -20, 3, 1.4);
  c.fillRect(6, -20, 3, 1.4);
}

export const RJ: Tema = {
  id: "rj",
  nome: "Rio de Janeiro",
  descricao: "O Cristo no Corcovado, o Pão de Açúcar com o bondinho, asas-deltas e o calçadão de Copacabana.",
  grupo: "estados",
  amostra: "linear-gradient(135deg, #1a1a1a 25%, #ffffff 25% 50%, #1a1a1a 50% 75%, #ffffff 75%)",
  onda: "triangle",
  somBase: 466,
  capitel: "dorico",
  paleta: {
    ceu: [["#f0a07a", "#ffe0b8"], ["#2f9ae8", "#cfeefc"], ["#3a4a9a", "#f6a058"], ["#06143a", "#1e3c6e"]],
    longe: MORRO_LONGE,
    perto: COQUEIRO,
    chao: "#f6e0b0",
    chaoLinha: "#d8bc88",
    coluna: { corpo: "#f8f6f2", sombra: "#d8d4cc", luz: "#ffffff", contorno: "#1a1a1a" },
    maleta: { corpo: "#ff7a3a", escuro: "#9a3a12", fivela: "#ffe066", alca: "#6a2a0a" },
    asa: { cor: "#ffffff", contorno: "#1a6aa8" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: ["#ffe066", "#2f9ae8", "#ffffff"],
    recorde: {
      cor: "#ff5a7a", traco: [12, 3], largura: 3.5,
      aviso: { texto: "NOVO RECORDE!", fonte: "800 28px system-ui, sans-serif", corTexto: "#ffffff", corContorno: "#1a1a1a", corFundo: "rgba(255,90,122,0.9)", anima: "treme" },
    },
    hud: "#0a2a44",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // um aviãozinho puxando a faixa pela orla
    const x = atravessa(w, f, 340);
    const y = h * 0.3 + Math.sin(t * 1.2) * 6;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#3a3a4a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, y, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(x - 6, y - 14, 8, 28);
    ctx.fillRect(x - 22, y - 8, 4, 8);
    ctx.strokeStyle = "rgba(60,60,60,0.5)";
    ctx.beginPath();
    ctx.moveTo(x + 22, y - 8 + Math.sin(t * 40) * 6);
    ctx.lineTo(x + 22, y + 8 - Math.sin(t * 40) * 6);
    ctx.moveTo(x - 22, y);
    ctx.lineTo(x - 50, y);
    ctx.stroke();
    // a faixa ondulando
    for (let i = 0; i < 12; i++) {
      const fx = x - 50 - (i + 1) * 20;
      const dy = Math.sin(t * 6 - i * 0.6) * 3;
      ctx.fillStyle = i % 2 ? "#ffffff" : "#f6f6f6";
      ctx.fillRect(fx, y - 14 + dy, 20.5, 28);
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 290, y - 20, 240, 40);
    ctx.clip();
    letreiro(ctx, "VEM PRO RIO!", x - 170, y, 22, "#ff5a7a", "#ffffff");
    ctx.restore();
  },
  decor(ctx, w, h, off, tod, t) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.12, h * 0.15, 20);
    else sol(ctx, w * 0.12, h * 0.16, 24, "#fff4d6", "rgba(255,236,180,0.45)");
    // asas-deltas descendo da Pedra Bonita
    if (noite < 0.7) {
      for (let i = 0; i < 3; i++) {
        const ax = ((((i * 410 + t * 22 - off * 0.05) % (w + 200)) + w + 200) % (w + 200)) - 100;
        const ay = h * (0.2 + i * 0.08) + Math.sin(t * 0.8 + i * 2) * 14;
        ctx.fillStyle = ["#ff3a5a", "#ffd21a", "#3a8aff"][i];
        ctx.beginPath();
        ctx.moveTo(ax - 20, ay + 3);
        ctx.lineTo(ax, ay - 5);
        ctx.lineTo(ax + 20, ay + 3);
        ctx.lineTo(ax, ay);
        ctx.fill();
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax, ay + 10);
        ctx.stroke();
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(ax - 3, ay + 10, 6, 2.4);
      }
    }
    const yMar = h - 150;
    // Corcovado com o Cristo, e o Pão de Açúcar com o bondinho
    const morroLonge = ciclo(MORRO_LONGE, tod);
    const morro = ciclo(MORRO, tod);
    const pedra = ciclo(PEDRA, tod);
    repetir(w, off * 0.06, 1300, (x) => {
      ctx.fillStyle = morroLonge;
      ctx.beginPath();
      ctx.moveTo(x, yMar);
      ctx.bezierCurveTo(x + 100, yMar - 120, x + 220, yMar - 200, x + 300, yMar - 300);
      ctx.bezierCurveTo(x + 330, yMar - 300, x + 360, yMar - 220, x + 480, yMar - 120);
      ctx.lineTo(x + 700, yMar);
      ctx.fill();
      ctx.fillStyle = noite > 0.5 ? "#f6f0e0" : ciclo(["#f4ece4", "#ffffff", "#f0dcd0", "#c8d0e8"], tod);
      cristo(ctx, x + 312, yMar - 298, 1.1);
    });
    repetir(w, off * 0.1, 1300, (x) => {
      const px = x + 860;
      ctx.fillStyle = pedra;
      ctx.beginPath();
      ctx.moveTo(px - 150, yMar);
      ctx.bezierCurveTo(px - 150, yMar - 90, px - 110, yMar - 110, px - 80, yMar - 100);
      ctx.bezierCurveTo(px - 60, yMar - 90, px - 50, yMar - 60, px - 40, yMar);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(px - 30, yMar);
      ctx.bezierCurveTo(px - 30, yMar - 160, px + 10, yMar - 230, px + 50, yMar - 220);
      ctx.bezierCurveTo(px + 90, yMar - 210, px + 100, yMar - 120, px + 110, yMar);
      ctx.fill();
      ctx.fillStyle = morro;
      ctx.beginPath();
      ctx.moveTo(px - 170, yMar);
      ctx.quadraticCurveTo(px - 100, yMar - 40, px - 20, yMar - 20);
      ctx.quadraticCurveTo(px + 40, yMar - 60, px + 130, yMar);
      ctx.fill();
      // o cabo e o bondinho indo e vindo
      ctx.strokeStyle = "rgba(30,30,30,0.6)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(px - 80, yMar - 102);
      ctx.lineTo(px + 46, yMar - 222);
      ctx.stroke();
      const f = (Math.sin(t * 0.35) + 1) / 2;
      const bx = px - 80 + f * 126;
      const by = yMar - 102 - f * 120;
      ctx.fillStyle = "#ffcc33";
      ctx.fillRect(bx - 6, by + 4, 12, 8);
      ctx.fillStyle = "#3a3a3a";
      ctx.fillRect(bx - 1, by, 2, 4);
    });
    // a baía e a orla
    mar(ctx, w, yMar, 70, off * 0.16, ciclo(MAR, tod), "rgba(255,255,255,0.6)", t);
    const predio = ciclo(PREDIO, tod);
    repetir(w, off * 0.2, 38, (x, k) => {
      const a = 30 + variar(k, 7919, 6) * 9;
      ctx.fillStyle = predio;
      ctx.fillRect(x, yMar + 60 - a, 32, a);
      if (noite > 0.3) {
        ctx.fillStyle = "#ffd98a";
        ctx.globalAlpha = noite * 0.85;
        for (let yy = yMar + 64 - a; yy < yMar + 56; yy += 7) ctx.fillRect(x + 4 + variar(k + yy, 13, 3) * 8, yy, 4, 3);
        ctx.globalAlpha = 1;
      }
    });
    // areia e coqueiros
    ctx.fillStyle = ciclo(AREIA, tod);
    ctx.fillRect(0, yMar + 60, w, h - yMar - 60);
    mar(ctx, w, yMar + 70, 16, off * 0.3, ciclo(MAR, tod), "rgba(255,255,255,0.9)", t);
    const coqueiro = ciclo(COQUEIRO, tod);
    repetir(w, off * 0.4, 180, (x, k) => {
      if (variar(k, 5, 3) === 0) return;
      palmeira(ctx, x + variar(k, 23, 60), h - 40, 130 + variar(k, 13, 3) * 15, coqueiro, t, 0.22);
    });
    // guarda-sóis
    repetir(w, off * 0.44, 150, (x, k) => {
      const gx = x + variar(k, 17, 50);
      ctx.fillStyle = "#5a4a3a";
      ctx.fillRect(gx - 1, h - 70, 2, 30);
      ctx.fillStyle = ["#ff3a5a", "#ffd21a", "#3a8aff", "#2fbf5a"][variar(k, 7, 4)];
      ctx.beginPath();
      ctx.moveTo(gx - 20, h - 66);
      ctx.quadraticCurveTo(gx, h - 84, gx + 20, h - 66);
      ctx.fill();
    });
  },
  chao(ctx, w, h, y, off) {
    // o calçadão de Copacabana
    ctx.fillStyle = "#f8f6f2";
    ctx.fillRect(0, y, w, h - y);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y, w, h - y);
    ctx.clip();
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    const esp = 56;
    for (const yy of [y + 6, y + 24]) {
      for (let x = -(off % esp) - esp; x < w + esp; x += esp) {
        ctx.moveTo(x, yy);
        ctx.quadraticCurveTo(x + esp / 4, yy - 8, x + esp / 2, yy);
        ctx.quadraticCurveTo(x + (3 * esp) / 4, yy + 8, x + esp, yy);
        ctx.lineTo(x + esp, yy + 8);
        ctx.quadraticCurveTo(x + (3 * esp) / 4, yy + 16, x + esp / 2, yy + 8);
        ctx.quadraticCurveTo(x + esp / 4, yy, x, yy + 8);
        ctx.closePath();
      }
    }
    ctx.fill();
    ctx.restore();
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    ctx.fillStyle = c.corpo;
    ctx.fillRect(x0, 0, w, len);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, 0, w, len);
    ctx.clip();
    calcadao(ctx, x0, 0, w, len, variante * 9);
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, "rgba(255,255,255,0.2)");
    g.addColorStop(0.4, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(0,0,0,0.25)");
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, len);
    ctx.restore();
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = c.corpo;
      ctx.beginPath();
      ctx.moveTo(x0, 12);
      ctx.lineTo(x0 + w * 0.2, 3);
      ctx.lineTo(x0 + w * 0.45, 10);
      ctx.lineTo(x0 + w * 0.7, 0);
      ctx.lineTo(x0 + w, 8);
      ctx.lineTo(x0 + w, 14);
      ctx.lineTo(x0, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // meio-fio de pedra portuguesa na ponta
    ctx.fillStyle = "#d8d0c0";
    rr(ctx, x0 - 5, 0, w + 10, 10, 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#1a1a1a";
    for (let x = x0 - 2; x < x0 + w + 2; x += 8) ctx.fillRect(x, 3, 4, 4);
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, oculos);
  },
};
