// Mato Grosso do Sul: Bonito, com o rio de água cristalina onde se vê o fundo e os peixes, a flutuação, as araras
// e a Gruta do Lago Azul; as colunas são de calcário, com estalactites na de cima e estalagmites na de baixo.
import { ciclo, colinas, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, lua, noiteDe, repetir, sol } from "../kit";

// cores por hora do dia (amanhecer, dia, entardecer, noite)
const SERRA = ["#8aa08a", "#7fa884", "#6e7486", "#14202a"];
const MATA = ["#3a6a3a", "#2f7038", "#384a3a", "#0a160e"];
const MATA_ESCURA = ["#24482a", "#1f4c28", "#26342c", "#060e0a"];
const AGUA = ["#5ab8b8", "#4ac8c4", "#5a8aa8", "#103038"];
const FUNDO = ["#c8b88a", "#d0c090", "#a89a84", "#2a2a2a"];
const GRUTA = ["#4a4a58", "#4a4e5a", "#3e3a4e", "#0c0c14"];

/** Peixe nadando (dourado ou piraputanga). */
function peixe(ctx: Ctx, x: number, y: number, s: number, cor: string, t: number) {
  const rabo = Math.sin(t * 9 + x) * 2 * s;
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.ellipse(x, y, 9 * s, 3.4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 8 * s, y);
  ctx.lineTo(x - 14 * s, y - 4 * s + rabo);
  ctx.lineTo(x - 14 * s, y + 4 * s + rabo);
  ctx.fill();
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(x + 5 * s, y - 1 * s, 1.4 * s, 1.4 * s);
}

/** Máscara de mergulho com o snorkel. */
function mascara(c: Ctx) {
  c.save();
  c.translate(2, -17);
  c.fillStyle = "#2a8ae8";
  c.strokeStyle = "#0a3a7a";
  c.lineWidth = 1;
  c.beginPath();
  c.roundRect(-12, -5, 24, 10, 5);
  c.fill();
  c.stroke();
  c.fillStyle = "rgba(200,240,255,0.85)";
  c.beginPath();
  c.roundRect(-10, -3.5, 9, 7, 3);
  c.roundRect(1, -3.5, 9, 7, 3);
  c.fill();
  c.strokeStyle = "#ff8a1a";
  c.lineWidth = 2.4;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(12, 0);
  c.lineTo(15, -1);
  c.lineTo(16, -14);
  c.stroke();
  c.restore();
}

export const MS: Tema = {
  id: "ms",
  nome: "Mato Grosso do Sul",
  descricao: "Bonito: o rio cristalino com os peixes à vista, a flutuação, as araras e a Gruta do Lago Azul.",
  grupo: "estados",
  amostra: "linear-gradient(135deg, #4ac8c4 50%, #e8e2d2 50%)",
  onda: "sine",
  somBase: 349,
  paleta: {
    ceu: [["#e8a8a0", "#fde2cc"], ["#5aaee4", "#dcf2fa"], ["#5a5a98", "#f0a878"], ["#0a1434", "#24386a"]],
    longe: SERRA,
    perto: MATA,
    chao: "#7a8a4a",
    chaoLinha: "#4a5a2a",
    coluna: { corpo: "#e6dfd0", sombra: "#bfb4a0", luz: "#faf6ec", contorno: "#6a604c" },
    maleta: { corpo: "#ff8a1a", escuro: "#8a3a0a", fivela: "#ffffff", alca: "#8a3a0a" },
    asa: { cor: "#ffffff", contorno: "#2a8ae8" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: ["#4ac8c4", "#ffffff", "#ffd21a"],
    recorde: {
      cor: "#1ab8b0", traco: [12, 3, 3, 3], largura: 3.5,
      aviso: { texto: "NOVO RECORDE!", fonte: "800 28px system-ui, sans-serif", corTexto: "#ffffff", corContorno: "#0a3a3a", corFundo: "rgba(26,150,150,0.9)", anima: "pulsa" },
    },
    hud: "#0e2a2a",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // uma sucuri enorme nadando pelo rio cristalino
    const x = atravessa(w, f, 300);
    const y = h - 110;
    ctx.strokeStyle = "#4a6a2a";
    ctx.lineWidth = 16;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i <= 30; i++) {
      const px = x - i * 9;
      const py = y + Math.sin(i * 0.45 - t * 4) * 12;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.strokeStyle = "#2a3a14";
    ctx.lineWidth = 4;
    ctx.setLineDash([6, 10]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#4a6a2a";
    ctx.beginPath();
    ctx.ellipse(x + 8, y + Math.sin(-t * 4) * 12, 14, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd23a";
    ctx.beginPath();
    ctx.arc(x + 14, y - 3 + Math.sin(-t * 4) * 12, 2.2, 0, Math.PI * 2);
    ctx.fill();
  },
  decor(ctx, w, h, off, tod, t, tema, surpresa) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.24, h * 0.14, 20);
    else sol(ctx, w * 0.24, h * 0.15, 24, "#fff4d6", "rgba(255,236,180,0.45)");
    colinas(ctx, w, h - 40, off * 0.04, ciclo(SERRA, tod), 200, 30, 0.005, 2);
    // a entrada da Gruta do Lago Azul, no morro de calcário
    const gruta = ciclo(GRUTA, tod);
    repetir(w, off * 0.08, 1300, (x) => {
      ctx.fillStyle = ciclo(["#b8b0a0", "#c4bcaa", "#9a8e8e", "#24242c"], tod);
      ctx.beginPath();
      ctx.moveTo(x + 200, h - 170);
      ctx.quadraticCurveTo(x + 340, h - 330, x + 520, h - 170);
      ctx.fill();
      ctx.fillStyle = gruta;
      ctx.beginPath();
      ctx.moveTo(x + 300, h - 170);
      ctx.quadraticCurveTo(x + 350, h - 260, x + 410, h - 170);
      ctx.fill();
      ctx.fillStyle = "#2a6ae8";
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.ellipse(x + 355, h - 176, 38, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
    // mata ciliar dos dois lados do rio
    colinas(ctx, w, h - 150, off * 0.14, ciclo(MATA_ESCURA, tod), 40, 14, 0.012, 4);
    const mata = ciclo(MATA, tod);
    repetir(w, off * 0.16, 44, (x, k) => {
      ctx.fillStyle = mata;
      ctx.beginPath();
      ctx.arc(x + 22, h - 176 - variar(k, 7, 4) * 6, 22 + variar(k, 13, 3) * 4, 0, Math.PI * 2);
      ctx.fill();
    });
    // o rio cristalino: a superfície, o fundo de areia e pedras, os peixes e quem flutua
    const yRio = h - 160;
    ctx.fillStyle = ciclo(FUNDO, tod);
    ctx.fillRect(0, yRio + 50, w, h - yRio - 50);
    const agua = ciclo(AGUA, tod);
    ctx.fillStyle = agua;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(0, yRio, w, h - yRio);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillRect(0, yRio, w, 2);
    // reflexos de sol riscando a água
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -((off * 0.24 + t * 12) % 70); x < w; x += 70) {
      ctx.moveTo(x, yRio + 16 + Math.sin(x * 0.05 + t) * 4);
      ctx.quadraticCurveTo(x + 20, yRio + 12, x + 40, yRio + 18);
    }
    ctx.stroke();
    repetir(w, off * 0.24, 70, (x, k) => {
      ctx.fillStyle = ciclo(["#8a8070", "#948a78", "#7a6e6a", "#1a1a1a"], tod);
      ctx.beginPath();
      ctx.ellipse(x + variar(k, 17, 40), yRio + 112, 10 + variar(k, 7, 3) * 4, 5, 0, Math.PI, 0);
      ctx.fill();
      // plantas aquáticas balançando
      ctx.strokeStyle = "#3a8a4a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const px = x + 40 + variar(k, 11, 20);
      ctx.moveTo(px, yRio + 116);
      ctx.quadraticCurveTo(px + Math.sin(t * 2 + k) * 6, yRio + 94, px + Math.sin(t * 2 + k) * 4, yRio + 76);
      ctx.stroke();
    });
    // a surpresa: a sucuri nada no fundo, atrás dos peixes e de quem flutua
    surpresa?.();
    repetir(w, off * 0.26 - t * 24, 110, (x, k) => {
      const cor = variar(k, 3, 2) ? "#e8a43a" : "#8a9aa8";
      peixe(ctx, x + variar(k, 29, 50), yRio + 40 + variar(k, 13, 5) * 14, 1.1, cor, t);
    });
    // quem faz a flutuação, de bruços com a máscara
    repetir(w, off * 0.26 - t * 6, 560, (x, k) => {
      const fx = x + variar(k, 37, 200);
      const fy = yRio + 6 + Math.sin(t * 1.4 + k) * 1.5;
      ctx.fillStyle = "#ff8a1a";
      ctx.beginPath();
      ctx.ellipse(fx, fy, 16, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3a2a20";
      ctx.beginPath();
      ctx.arc(fx + 17, fy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#2a8ae8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fx + 18, fy - 3);
      ctx.lineTo(fx + 19, fy - 12);
      ctx.stroke();
      ctx.strokeStyle = "#3a2a20";
      ctx.beginPath();
      ctx.moveTo(fx - 15, fy);
      ctx.lineTo(fx - 26, fy + Math.sin(t * 6 + k) * 3);
      ctx.stroke();
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    // a passarela de madeira da beira do rio
    ctx.fillStyle = ciclo(["#9a7a52", "#a4825a", "#8a6a52", "#2a2018"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = "rgba(40,24,10,0.45)";
    for (let x = -(off % 22); x < w; x += 22) ctx.fillRect(x, y, 2, h - y);
    ctx.fillRect(0, y, w, 3);
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // calcário: escorrido em faixas onduladas, como as paredes da gruta
    ctx.fillStyle = c.corpo;
    ctx.fillRect(x0, 0, w, len);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, 0, w, len);
    ctx.clip();
    ctx.fillStyle = c.sombra;
    for (let i = 0; i < 5; i++) {
      const bx = x0 + 6 + i * (w / 5);
      ctx.beginPath();
      ctx.moveTo(bx, 0);
      for (let y = 0; y <= len; y += 20) ctx.lineTo(bx + Math.sin(y * 0.04 + i + variante) * 3, y);
      for (let y = len; y >= 0; y -= 20) ctx.lineTo(bx + 4 + Math.sin(y * 0.04 + i + variante) * 3, y);
      ctx.fill();
    }
    ctx.fillStyle = c.luz;
    ctx.fillRect(x0, 0, 7, len);
    ctx.restore();
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = c.luz;
      ctx.beginPath();
      ctx.moveTo(x0, 12);
      ctx.lineTo(x0 + w * 0.3, 2);
      ctx.lineTo(x0 + w * 0.55, 8);
      ctx.lineTo(x0 + w * 0.8, 0);
      ctx.lineTo(x0 + w, 9);
      ctx.lineTo(x0 + w, 14);
      ctx.lineTo(x0, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // a de cima termina em estalactites; a de baixo, em estalagmites arredondadas
    const deCima = ctx.getTransform().d < 0;
    ctx.fillStyle = c.corpo;
    ctx.fillRect(x0 - 3, 0, w + 6, 9);
    ctx.strokeRect(x0 - 3, 0, w + 6, 9);
    ctx.fillStyle = c.luz;
    ctx.beginPath();
    const n = 7;
    for (let i = 0; i < n; i++) {
      const x = x0 + 4 + (i * (w - 8)) / (n - 1);
      const L = (deCima ? 6 : 3) + variar(i * 5 + variante, 3, 4) * (deCima ? 2.2 : 1.2);
      if (deCima) {
        ctx.moveTo(x - 3, 0.5);
        ctx.lineTo(x, -L);
        ctx.lineTo(x + 3, 0.5);
      } else {
        ctx.moveTo(x - 4, 0.5);
        ctx.quadraticCurveTo(x, -L * 2, x + 4, 0.5);
      }
      ctx.closePath();
    }
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.stroke();
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, mascara);
  },
};
