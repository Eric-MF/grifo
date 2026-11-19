// Rio Grande do Sul: o cânion do Itaimbezinho com os fios de cachoeira, a Catedral de Pedra de Canela, as coxilhas
// com o gaúcho a cavalo, a cerração da serra e as colunas de basalto; na maleta, a cuia de chimarrão e a boina.
import { ciclo, colinas, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { araucaria, atravessa, cachoeira, cavaleiro, lua, noiteDe, repetir, sol } from "../kit";

// cores por hora do dia (amanhecer, dia, entardecer, noite)
const CANION = ["#6a5a62", "#6a6466", "#5a4a5a", "#16141e"];
const CANION_SOMBRA = ["#4a3e48", "#4a4650", "#3e3244", "#0c0a12"];
const CAMPO = ["#6a9a5a", "#5fa452", "#5a7052", "#10200e"];
const CAMPO_LONGE = ["#8aa48a", "#80ac84", "#6e7a86", "#16222a"];
const PEDRA = ["#8a7a72", "#8e8278", "#76666e", "#22202a"];
const GAUCHO = ["#2a2420", "#2a2620", "#26201e", "#08070a"];
const AGUA = ["#c8d4dc", "#d8ecf4", "#c8bccc", "#4a5a70"];

/** Catedral de Pedra de Canela: a nave de pedra e a torre alta com a flecha. */
function catedralPedra(ctx: Ctx, x: number, base: number, cor: string, acesas: number) {
  ctx.fillStyle = cor;
  ctx.fillRect(x, base - 70, 110, 70);
  ctx.beginPath();
  ctx.moveTo(x - 4, base - 70);
  ctx.lineTo(x + 55, base - 104);
  ctx.lineTo(x + 114, base - 70);
  ctx.fill();
  ctx.fillRect(x + 110, base - 150, 34, 150);
  ctx.beginPath();
  ctx.moveTo(x + 106, base - 150);
  ctx.lineTo(x + 127, base - 236);
  ctx.lineTo(x + 148, base - 150);
  ctx.fill();
  for (const px of [x + 108, x + 146]) {
    ctx.beginPath();
    ctx.moveTo(px - 3, base - 150);
    ctx.lineTo(px, base - 168);
    ctx.lineTo(px + 3, base - 150);
    ctx.fill();
  }
  ctx.fillStyle = acesas > 0.3 ? "#ffd98a" : "rgba(0,0,0,0.3)";
  ctx.beginPath();
  for (const [jx, jy, jl, ja] of [[x + 14, base - 22, 12, 32], [x + 49, base - 18, 12, 40], [x + 84, base - 22, 12, 32], [x + 121, base - 90, 12, 34]]) {
    ctx.moveTo(jx, jy);
    ctx.lineTo(jx, jy - ja + jl / 2);
    ctx.lineTo(jx + jl / 2, jy - ja);
    ctx.lineTo(jx + jl, jy - ja + jl / 2);
    ctx.lineTo(jx + jl, jy);
    ctx.closePath();
  }
  ctx.fill();
}

/** Cuia de chimarrão com a bomba, e a boina por cima da tampa. */
function chimarrao(c: Ctx) {
  // boina
  c.save();
  c.translate(-8, -20);
  c.rotate(-0.15);
  c.fillStyle = "#2a2a3a";
  c.beginPath();
  c.ellipse(0, -1, 12, 5, 0, Math.PI, 0);
  c.ellipse(0, -1, 12, 2, 0, 0, Math.PI);
  c.fill();
  c.fillRect(-1, -8, 2, 3);
  c.restore();
  // cuia
  c.save();
  c.translate(14, -22);
  c.fillStyle = "#7a9a3a";
  c.strokeStyle = "#3a4a1a";
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(-6, -3);
  c.quadraticCurveTo(-9, 8, 0, 9);
  c.quadraticCurveTo(9, 8, 6, -3);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = "#c9a44a";
  c.fillRect(-6.5, -4, 13, 2.4);
  c.fillStyle = "#4a7a2a";
  c.beginPath();
  c.ellipse(0, -4, 5, 1.4, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = "#d8d8e0";
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(1, -2);
  c.lineTo(5, -14);
  c.lineTo(8, -15);
  c.stroke();
  c.restore();
}

export const RS: Tema = {
  id: "rs",
  nome: "Rio Grande do Sul",
  descricao: "O cânion do Itaimbezinho, a Catedral de Pedra de Canela, as coxilhas com o gaúcho e a cerração da serra.",
  grupo: "estados",
  amostra: "linear-gradient(135deg, #2e7a3a 33%, #c8322f 33% 66%, #ffd21a 66%)",
  onda: "triangle",
  somBase: 220,
  climaFixo: "neblina",
  capitel: "dorico",
  paleta: {
    // céu frio de serra
    ceu: [["#b8a8c0", "#f0dcd4"], ["#7aa4c8", "#dce8f0"], ["#6a6090", "#e8b098"], ["#0c1430", "#283658"]],
    longe: CAMPO_LONGE,
    perto: CAMPO,
    chao: "#5f8a44",
    chaoLinha: "#3a5a2a",
    coluna: { corpo: "#4e5058", sombra: "#36383e", luz: "#6e7078", contorno: "#16171c" },
    maleta: { corpo: "#8a5a32", escuro: "#432812", fivela: "#d8d8e0", alca: "#432812" },
    asa: { cor: "#ffffff", contorno: "#4e5058" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: ["#ffd21a", "#c8322f", "#2e7a3a"],
    recorde: {
      cor: "#2e9a4a", traco: [6, 2, 6, 6], largura: 3.5,
      aviso: { texto: "BAH, NOVO RECORDE!", fonte: "800 26px system-ui, sans-serif", corTexto: "#ffd21a", corContorno: "#3a0a0a", corFundo: "rgba(46,122,58,0.9)", anima: "treme" },
    },
    hud: "#141a14",
    estrelas: "#ffffff",
    neblina: "rgba(230,236,240,0.16)",
  },
  surpresa(ctx, w, h, f, t) {
    // o gaúcho a galope, girando as boleadeiras acima da cabeça
    const x = atravessa(w, f, 140);
    const [mx, my] = cavaleiro(ctx, x, h - 41, 1.7, "#2a2420", t * 1.6, false, true);
    ctx.strokeStyle = "#5a4a3a";
    ctx.fillStyle = "#3a3a42";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      const a = t * 9 + (i * Math.PI * 2) / 3;
      const bx = mx + Math.cos(a) * 26;
      const by = my - 6 + Math.sin(a) * 8;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bx, by, 3.6, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  decor(ctx, w, h, off, tod, t) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.25, h * 0.14, 20);
    else sol(ctx, w * 0.25, h * 0.15, 22, "#fff8e6", "rgba(255,244,220,0.35)");
    // o cânion: duas bordas de paredão com os fios d'água caindo
    const canion = ciclo(CANION, tod);
    const sombra = ciclo(CANION_SOMBRA, tod);
    const agua = ciclo(AGUA, tod);
    repetir(w, off * 0.06, 1200, (x) => {
      ctx.fillStyle = sombra;
      ctx.fillRect(x + 380, h - 300, 300, 200);
      ctx.fillStyle = canion;
      ctx.beginPath();
      ctx.moveTo(x, h - 100);
      ctx.lineTo(x, h - 300);
      ctx.lineTo(x + 380, h - 300);
      for (let y = h - 300; y < h - 100; y += 25) ctx.lineTo(x + 380 + (variar(y, 7, 3) - 1) * 10 + 10, y + 25);
      ctx.lineTo(x, h - 100);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + 1200, h - 100);
      ctx.lineTo(x + 1200, h - 290);
      ctx.lineTo(x + 690, h - 290);
      for (let y = h - 290; y < h - 100; y += 25) ctx.lineTo(x + 680 - (variar(y, 11, 3) - 1) * 10, y + 25);
      ctx.fill();
      // colunas de basalto riscadas no paredão
      ctx.fillStyle = sombra;
      for (let i = 0; i < 18; i++) ctx.fillRect(x + 10 + i * 20, h - 296, 2, 120 + variar(i, 7, 4) * 20);
      cachoeira(ctx, x + 370, h - 300, 10, h - 120, t, agua, "#ffffff");
      cachoeira(ctx, x + 684, h - 290, 8, h - 140, t + 3, agua, "#ffffff");
      // mata de araucária no alto do cânion
      const pinho = ciclo(["#2a4630", "#26482c", "#2a3430", "#06100a"], tod);
      for (let i = 0; i < 6; i++) araucaria(ctx, x + 40 + i * 60, h - 296, 50 + variar(i, 5, 3) * 10, pinho);
      for (let i = 0; i < 6; i++) araucaria(ctx, x + 760 + i * 70, h - 286, 50 + variar(i, 7, 3) * 10, pinho);
    });
    // as coxilhas, a catedral e o gaúcho
    colinas(ctx, w, h - 40, off * 0.14, ciclo(CAMPO_LONGE, tod), 80, 22, 0.006, 4);
    repetir(w, off * 0.18, 1500, (x) => catedralPedra(ctx, x + 900, h - 92, ciclo(PEDRA, tod), noite));
    colinas(ctx, w, h - 40, off * 0.28, ciclo(CAMPO, tod), 50, 16, 0.008, 2);
    // cerca de arame (o aramado) e o gaúcho a cavalo, de chapéu
    ctx.strokeStyle = ciclo(["#5a4a3a", "#5a4a3a", "#4a3a34", "#14100e"], tod);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const yy of [h - 62, h - 54]) {
      ctx.moveTo(0, yy);
      ctx.lineTo(w, yy);
    }
    for (let x = -((off * 0.4) % 50); x < w; x += 50) {
      ctx.moveTo(x, h - 66);
      ctx.lineTo(x, h - 46);
    }
    ctx.stroke();
    const gaucho = ciclo(GAUCHO, tod);
    repetir(w, off * 0.44 - t * 20, 640, (x, k) => cavaleiro(ctx, x + variar(k, 31, 200), h - 41, 1.1, gaucho, t, false));
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#526a3e", "#10180c"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 3);
    // capim da campanha
    ctx.fillStyle = "#3a5a2a";
    ctx.beginPath();
    for (let x = -(off % 23); x < w; x += 23) {
      ctx.moveTo(x, y + 14);
      ctx.lineTo(x + 3, y + 6);
      ctx.lineTo(x + 5, y + 14);
      ctx.lineTo(x + 8, y + 8);
      ctx.lineTo(x + 9, y + 14);
    }
    ctx.fill();
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // basalto colunar: prismas verticais com juntas
    ctx.fillStyle = c.corpo;
    ctx.fillRect(x0, 0, w, len);
    const n = 4;
    for (let i = 0; i < n; i++) {
      const px = x0 + (i * w) / n;
      ctx.fillStyle = i % 2 ? c.sombra : c.luz;
      ctx.fillRect(px + 2, 0, w / n - 4, len);
      ctx.fillStyle = c.corpo;
      ctx.fillRect(px + 6, 0, w / n - 12, len);
      ctx.fillStyle = c.contorno;
      for (let y = 40 + variar(i + variante, 7, 5) * 16; y < len; y += 90 + variar(i, 13, 3) * 20) ctx.fillRect(px + 2, y, w / n - 4, 2);
    }
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = c.luz;
      ctx.beginPath();
      ctx.moveTo(x0, 14);
      for (let i = 0; i < n; i++) {
        const px = x0 + (i * w) / n;
        const yy = 2 + variar(i + variante, 5, 4) * 3;
        ctx.lineTo(px, yy);
        ctx.lineTo(px + w / n, yy);
      }
      ctx.lineTo(x0 + w, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // os topos dos prismas, em degraus de alturas próximas
    ctx.fillStyle = c.luz;
    for (let i = 0; i < n; i++) {
      const px = x0 + (i * w) / n;
      ctx.fillRect(px + 1, 0, w / n - 2, 8);
      ctx.strokeRect(px + 1, 0, w / n - 2, 8);
    }
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, chimarrao);
  },
};
