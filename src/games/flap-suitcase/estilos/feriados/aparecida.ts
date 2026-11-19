// Nossa Senhora Aparecida (12/10, Lei 6.802/1980), que cai junto com o Dia das Crianças: a Basílica de tijolo,
// o rio Paraíba do Sul com os pescadores jogando a rede e pipas no céu.
import { ciclo, colinas, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, lua, mar, noiteDe, repetir, sol } from "../kit";

const PIPAS = ["#e8333a", "#ffc21a", "#2a8ae8", "#2fbf5a", "#b04ce0"];
// cores por hora do dia (amanhecer, dia, entardecer, noite)
const BASILICA = ["#b0684a", "#bc7050", "#98564a", "#2e2028"];
const BASILICA_SOMBRA = ["#8a4e38", "#965640", "#76403a", "#1e141c"];
const CUPULA = ["#6a8aa0", "#5f8fae", "#5a6080", "#141c30"];
const RIO = ["#6a8aa8", "#5a9ac4", "#6a6a96", "#122040"];
const MATA = ["#4a7040", "#3f7a42", "#435040", "#0c1a14"];
const BARCO = ["#5a3a24", "#62402a", "#4e3226", "#140e0e"];

/** Basílica de Aparecida: a nave em cruz, a cúpula e a torre alta. */
function basilica(ctx: Ctx, x: number, base: number, cor: string, sombra: string, cupula: string, acesas: number) {
  ctx.fillStyle = cor;
  ctx.fillRect(x, base - 80, 320, 80);
  ctx.fillRect(x + 110, base - 120, 100, 120);
  ctx.fillStyle = cupula;
  ctx.beginPath();
  ctx.ellipse(x + 160, base - 120, 46, 44, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(x + 156, base - 180, 8, 20);
  ctx.fillRect(x + 150, base - 172, 20, 4);
  // a torre
  ctx.fillStyle = cor;
  ctx.fillRect(x + 260, base - 230, 40, 230);
  ctx.fillStyle = cupula;
  ctx.beginPath();
  ctx.moveTo(x + 256, base - 230);
  ctx.lineTo(x + 280, base - 270);
  ctx.lineTo(x + 304, base - 230);
  ctx.fill();
  ctx.fillRect(x + 278, base - 292, 4, 24);
  ctx.fillRect(x + 272, base - 284, 16, 3);
  ctx.fillStyle = sombra;
  // tijolo: fiadas e janelas em arco
  for (let y = base - 76; y < base; y += 6) ctx.fillRect(x, y, 320, 1);
  for (let y = base - 226; y < base - 80; y += 6) ctx.fillRect(x + 260, y, 40, 1);
  for (let i = 0; i < 9; i++) {
    const jx = x + 12 + i * 34;
    if (jx > x + 100 && jx < x + 210) continue;
    ctx.fillStyle = acesas > 0.3 ? "#ffd98a" : sombra;
    ctx.beginPath();
    ctx.moveTo(jx, base - 20);
    ctx.lineTo(jx, base - 54);
    ctx.arc(jx + 8, base - 54, 8, Math.PI, 0);
    ctx.lineTo(jx + 16, base - 20);
    ctx.fill();
  }
  ctx.fillStyle = acesas > 0.3 ? "#ffd98a" : sombra;
  ctx.beginPath();
  ctx.arc(x + 160, base - 86, 16, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 4; i++) ctx.fillRect(x + 270 + (i % 2) * 14, base - 210 + Math.floor(i / 2) * 40, 8, 22);
}

/** Barco de pesca com dois pescadores, um deles jogando a rede. */
function barco(ctx: Ctx, x: number, y: number, cor: string, t: number) {
  const bal = Math.sin(t * 1.5 + x * 0.01) * 2;
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(x - 34, y - 6 + bal);
  ctx.lineTo(x + 34, y - 6 - bal);
  ctx.lineTo(x + 24, y + 4);
  ctx.lineTo(x - 26, y + 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(x - 18, y - 22 + bal, 4, 16);
  ctx.beginPath();
  ctx.arc(x - 16, y - 26 + bal, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x + 10, y - 22 - bal, 4, 16);
  ctx.beginPath();
  ctx.arc(x + 12, y - 26 - bal, 3.5, 0, Math.PI * 2);
  ctx.fill();
  // a rede abrindo no ar
  const abre = (t * 0.5) % 1;
  ctx.strokeStyle = cor;
  ctx.lineWidth = 0.8;
  ctx.globalAlpha = 1 - abre * 0.6;
  ctx.beginPath();
  const r = 8 + abre * 26;
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI * (1.1 + (i / 8) * 0.8);
    ctx.moveTo(x + 14, y - 26 - bal);
    ctx.lineTo(x + 30 + Math.cos(a) * r, y - 14 + Math.sin(a) * r * 0.5 + r * 0.6);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** Pipa (losango com rabiola), presa por uma linha que desce para fora da tela. */
function pipa(ctx: Ctx, x: number, y: number, cor: string, t: number, k: number) {
  const bal = Math.sin(t * 2 + k) * 0.15;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(bal);
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, 12);
  ctx.quadraticCurveTo(-40, 120, -90, 400);
  ctx.stroke();
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(10, 0);
  ctx.lineTo(0, 12);
  ctx.lineTo(-10, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(0, 12);
  ctx.moveTo(-10, 0);
  ctx.lineTo(10, 0);
  ctx.stroke();
  // rabiola
  ctx.strokeStyle = cor;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 12);
  for (let i = 1; i <= 6; i++) ctx.lineTo(Math.sin(t * 6 + i + k) * 4, 12 + i * 6);
  ctx.stroke();
  ctx.restore();
}

export const APARECIDA: Tema = {
  id: "aparecida",
  nome: "Nossa Senhora Aparecida",
  descricao: "12 de outubro: a Basílica de tijolo, os pescadores no rio Paraíba e pipas no céu do Dia das Crianças.",
  grupo: "feriados",
  janela: { tipo: "fixa", dia: 12, mes: 10 },
  amostra: "linear-gradient(135deg, #2a5ab8 50%, #b0684a 50%)",
  onda: "sine",
  somBase: 587,
  capitel: "jonico",
  paleta: {
    ceu: [["#f0a08a", "#ffe0c0"], ["#58a8e8", "#dcf0fc"], ["#5a5aa0", "#f4a868"], ["#081638", "#22406e"]],
    longe: ["#8aa0b8", "#7fa8c4", "#6a608a", "#121e38"],
    perto: MATA,
    chao: "#a8b47a",
    chaoLinha: "#6a7a44",
    coluna: { corpo: "#b8684a", sombra: "#8a4a34", luz: "#d48a68", contorno: "#4a2216" },
    maleta: { corpo: "#2a5ab8", escuro: "#122e66", fivela: "#ffd24d", alca: "#122e66" },
    asa: { cor: "#ffffff", contorno: "#2a5ab8" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: ["#ffd24d", "#2a5ab8", "#ffffff"],
    recorde: {
      cor: "#2a6ad8", traco: [5, 5], largura: 3.5,
      aviso: { texto: "NOVO RECORDE!", fonte: "800 28px system-ui, sans-serif", corTexto: "#ffffff", corContorno: "#0a2a66", corFundo: "rgba(30,70,160,0.9)", anima: "pulsa" },
    },
    hud: "#0e1e3e",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // uma pipa enorme dançando no vento, com a rabiola comprida
    const x = atravessa(w, f, 200);
    const y = h * 0.22 + Math.sin(t * 1.3) * 22;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * 2) * 0.25);
    ctx.fillStyle = "#e8333a";
    ctx.beginPath();
    ctx.moveTo(0, -46);
    ctx.lineTo(34, 0);
    ctx.lineTo(0, 40);
    ctx.lineTo(-34, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffc21a";
    ctx.beginPath();
    ctx.moveTo(0, -46);
    ctx.lineTo(34, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.moveTo(0, 40);
    ctx.lineTo(-34, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#2a8ae8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 40);
    for (let i = 1; i <= 12; i++) ctx.lineTo(Math.sin(t * 6 + i * 0.7) * 10, 40 + i * 12);
    ctx.stroke();
    for (let i = 2; i <= 12; i += 2) {
      ctx.fillStyle = PIPAS[i % PIPAS.length];
      ctx.fillRect(Math.sin(t * 6 + i * 0.7) * 10 - 5, 38 + i * 12, 10, 5);
    }
    ctx.restore();
  },
  decor(ctx, w, h, off, tod, t, tema) {
    const p = tema.paleta;
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.12, h * 0.15, 20);
    else sol(ctx, w * 0.12, h * 0.16, 24, "#fff4d6", "rgba(255,236,180,0.45)");
    // pipas de dia, presas lá embaixo
    if (noite < 0.6) {
      ctx.globalAlpha = 1 - noite;
      for (let i = 0; i < 4; i++) {
        const px = ((((i * 337 - off * 0.05) % (w + 200)) + w + 200) % (w + 200)) - 100;
        pipa(ctx, px, h * (0.16 + (i % 3) * 0.08) + Math.sin(t * 0.9 + i) * 10, PIPAS[i % PIPAS.length], t, i);
      }
      ctx.globalAlpha = 1;
    }
    colinas(ctx, w, h - 40, off * 0.05, ciclo(p.longe, tod), 120, 30, 0.006, 2);
    // a Basílica no alto da colina
    const mata = ciclo(MATA, tod);
    colinas(ctx, w, h - 40, off * 0.12, mata, 120, 10, 0.004, 4);
    repetir(w, off * 0.13, 1200, (x) => basilica(ctx, x + 380, h - 158, ciclo(BASILICA, tod), ciclo(BASILICA_SOMBRA, tod), ciclo(CUPULA, tod), noite));
    // o rio, com os barcos de pesca
    mar(ctx, w, h - 108, 50, off * 0.25, ciclo(RIO, tod), "rgba(255,255,255,0.45)", t);
    const madeira = ciclo(BARCO, tod);
    repetir(w, off * 0.25, 640, (x, k) => barco(ctx, x + variar(k, 37, 300), h - 82, madeira, t));
    // a margem com mato
    colinas(ctx, w, h - 40, off * 0.42, ciclo(["#5a8a4a", "#4f9446", "#4f6448", "#10201a"], tod), 18, 5, 0.02, 2);
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#94a070", "#2a3020"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 3);
    // flores azuis e brancas na grama
    for (let x = -(off % 29); x < w; x += 29) {
      const k = Math.round((x + off) / 29);
      ctx.fillStyle = k % 2 ? "#ffffff" : "#3a6ad8";
      ctx.beginPath();
      ctx.arc(x + 10, y + 10 + variar(k, 7, 16), 2, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // tijolo aparente, como a Basílica, com barra azul
    ctx.fillStyle = c.corpo;
    ctx.fillRect(x0, 0, w, len);
    ctx.fillStyle = c.sombra;
    for (let y = 0, fila = 0; y < len; y += 9, fila++) {
      ctx.fillRect(x0, y, w, 1.5);
      for (let x = x0 + (fila % 2 ? 9 : 0); x < x0 + w; x += 18) ctx.fillRect(x, y, 1.5, 9);
    }
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, "rgba(255,255,255,0.18)");
    g.addColorStop(0.4, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(0,0,0,0.22)");
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, len);
    ctx.fillStyle = "#2a5ab8";
    for (let y = 90 + variante * 30; y < len - 8; y += 160) ctx.fillRect(x0, y, w, 6);
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = c.corpo;
      ctx.beginPath();
      ctx.moveTo(x0, 9);
      ctx.lineTo(x0 + 18, 9);
      ctx.lineTo(x0 + 18, 0);
      ctx.lineTo(x0 + 45, 0);
      ctx.lineTo(x0 + 45, 9);
      ctx.lineTo(x0 + w, 9);
      ctx.lineTo(x0 + w, 18);
      ctx.lineTo(x0, 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // cornija de pedra branca e uma barra azul-manto com estrelinhas
    ctx.fillStyle = "#f4ecdc";
    ctx.fillRect(x0 - 6, 0, w + 12, 8);
    ctx.strokeRect(x0 - 6, 0, w + 12, 8);
    ctx.fillStyle = "#1e4a9a";
    ctx.fillRect(x0 - 2, 8, w + 4, 12);
    ctx.strokeRect(x0 - 2, 8, w + 4, 12);
    ctx.fillStyle = "#ffd24d";
    for (let x = x0 + 6; x < x0 + w; x += 12) ctx.fillRect(x, 13, 2.2, 2.2);
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => {
      // a pipa amarrada na alça, voando atrás
      c.strokeStyle = "rgba(255,255,255,0.8)";
      c.lineWidth = 0.7;
      c.beginPath();
      c.moveTo(-6, -22);
      c.quadraticCurveTo(-22, -34, -34, -32 + Math.sin(t * 4) * 2);
      c.stroke();
      c.save();
      c.translate(-38, -34 + Math.sin(t * 4) * 2);
      c.rotate(-0.5 + Math.sin(t * 5) * 0.15);
      c.fillStyle = "#ffc21a";
      c.beginPath();
      c.moveTo(0, -7);
      c.lineTo(5, 0);
      c.lineTo(0, 6);
      c.lineTo(-5, 0);
      c.closePath();
      c.fill();
      c.fillStyle = "#e8333a";
      c.beginPath();
      c.moveTo(0, -7);
      c.lineTo(5, 0);
      c.lineTo(0, 0);
      c.closePath();
      c.fill();
      c.strokeStyle = "#e8333a";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(0, 6);
      for (let i = 1; i <= 4; i++) c.lineTo(Math.sin(t * 8 + i) * 2.5, 6 + i * 4);
      c.stroke();
      c.restore();
    });
  },
};
