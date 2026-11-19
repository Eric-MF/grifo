// São Paulo: a garoa sobre o mar de prédios da Paulista, o MASP com o vão livre, a Ponte Estaiada
// e o Farol Santander; as colunas são as pilastras vermelhas do MASP.
import { ciclo, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, lua, noiteDe, predios, repetir } from "../kit";

const VERMELHO = "#d42a1a";
// cores por hora do dia (amanhecer, dia, entardecer, noite); céu de garoa, mais cinza
const PREDIO_LONGE = ["#8a8a9a", "#8a96a2", "#76708a", "#161a2a"];
const PREDIO = ["#5a5e6e", "#5e6672", "#504c62", "#0e1018"];
const PREDIO_PERTO = ["#3e4250", "#424a56", "#383648", "#07080e"];
const PONTE = ["#d8d8dc", "#e8eaec", "#cfc6d0", "#8a8aa0"];
const ARVORE = ["#3a5a3a", "#3a6040", "#34443a", "#0a140e"];

/** MASP: as duas vigas vermelhas sobre quatro pilares e a caixa de vidro pendurada, com o vão livre embaixo. */
function masp(ctx: Ctx, x: number, base: number, vidro: string, acesas: number) {
  const L = 200;
  ctx.fillStyle = VERMELHO;
  ctx.fillRect(x, base - 64, 10, 64);
  ctx.fillRect(x + L - 10, base - 64, 10, 64);
  ctx.fillRect(x, base - 64, L, 9);
  ctx.fillRect(x, base - 34, L, 7);
  ctx.fillStyle = vidro;
  ctx.fillRect(x + 10, base - 55, L - 20, 21);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = x + 20; i < x + L - 10; i += 12) {
    ctx.moveTo(i, base - 55);
    ctx.lineTo(i, base - 34);
  }
  ctx.stroke();
  if (acesas > 0.3) {
    ctx.fillStyle = "#ffe2a0";
    ctx.globalAlpha = acesas * 0.6;
    ctx.fillRect(x + 10, base - 55, L - 20, 21);
    ctx.globalAlpha = 1;
  }
}

/** Ponte Estaiada: o mastro em X, os estais em leque e os dois tabuleiros curvos. */
function estaiada(ctx: Ctx, x: number, base: number, cor: string, acesas: number) {
  const topo = base - 190;
  ctx.strokeStyle = cor;
  ctx.lineWidth = 7;
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(x - 30, base);
  ctx.lineTo(x + 6, topo);
  ctx.moveTo(x + 30, base);
  ctx.lineTo(x - 6, topo);
  ctx.stroke();
  ctx.lineWidth = acesas > 0.3 ? 1.2 : 0.8;
  ctx.strokeStyle = acesas > 0.3 ? "#f2e6ff" : cor;
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const y = topo + 12 + i * 6;
    ctx.moveTo(x, y);
    ctx.lineTo(x - 40 - i * 16, base - 34 + i * 0.6);
    ctx.moveTo(x, y);
    ctx.lineTo(x + 40 + i * 16, base - 34 + i * 0.6);
  }
  ctx.stroke();
  ctx.strokeStyle = cor;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x - 240, base - 26);
  ctx.quadraticCurveTo(x, base - 44, x + 240, base - 26);
  ctx.stroke();
}

/** Farol Santander: torre escalonada com o mastro no alto. */
function farol(ctx: Ctx, x: number, base: number, cor: string) {
  ctx.fillStyle = cor;
  ctx.fillRect(x, base - 200, 44, 200);
  ctx.fillRect(x + 6, base - 232, 32, 32);
  ctx.fillRect(x + 12, base - 256, 20, 24);
  ctx.fillRect(x + 17, base - 272, 10, 16);
  ctx.fillRect(x + 21, base - 300, 2, 28);
}

/** Guarda-chuva aberto, preso na alça, girando de leve. */
function guardaChuva(c: Ctx, t: number) {
  c.save();
  c.translate(0, -24);
  c.rotate(Math.sin(t * 3) * 0.08);
  c.strokeStyle = "#2a2a2a";
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(0, -18);
  c.stroke();
  c.fillStyle = "#1a1a2a";
  c.beginPath();
  c.moveTo(-22, -16);
  c.quadraticCurveTo(0, -38, 22, -16);
  for (let i = 3; i >= 0; i--) c.quadraticCurveTo(-22 + (i + 0.5) * 11, -20, -22 + i * 11, -16);
  c.fill();
  c.strokeStyle = VERMELHO;
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(-22, -16);
  c.quadraticCurveTo(0, -38, 22, -16);
  c.stroke();
  c.restore();
}

export const SP: Tema = {
  id: "sp",
  nome: "São Paulo",
  descricao: "Garoa sobre o mar de prédios, o MASP com o vão livre, a Ponte Estaiada e as pilastras vermelhas.",
  grupo: "estados",
  amostra: `linear-gradient(135deg, #5e6672 50%, ${VERMELHO} 50%)`,
  onda: "sawtooth",
  somBase: 196,
  climaFixo: "chuva",
  paleta: {
    ceu: [["#a8909a", "#e8cfc4"], ["#8aa0b4", "#d4dee6"], ["#6a6080", "#e0a88a"], ["#10142a", "#2e3452"]],
    longe: PREDIO_LONGE,
    perto: PREDIO_PERTO,
    chao: "#5a5a60",
    chaoLinha: "#ffffff",
    coluna: { corpo: "#d42a1a", sombra: "#a01e12", luz: "#ee4a32", contorno: "#4a0a04" },
    maleta: { corpo: "#2a2a3a", escuro: "#0e0e18", fivela: "#ffd24d", alca: "#0e0e18" },
    asa: { cor: "#ffffff", contorno: "#d42a1a" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: ["#d42a1a", "#ffffff", "#ffd24d"],
    recorde: {
      cor: "#ffffff", traco: [10, 4, 10, 10], largura: 3,
      aviso: { texto: "NOVO RECORDE!", fonte: "900 28px system-ui, sans-serif", corTexto: "#ffffff", corContorno: "#4a0a04", corFundo: "rgba(212,42,26,0.92)", anima: "pisca" },
    },
    hud: "#141824",
    estrelas: "#e8e8f0",
  },
  surpresa(ctx, w, h, f, t) {
    // um helicóptero cruza o céu de prédios, como todo dia em São Paulo
    const x = atravessa(w, f, 180);
    const y = h * 0.26 + Math.sin(t * 1.5) * 8;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(0.08);
    ctx.scale(1.7, 1.7);
    ctx.fillStyle = "#1a1a2a";
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-50, -3, 32, 5);
    ctx.fillRect(-52, -10, 4, 12);
    ctx.fillStyle = "#8ab0d0";
    ctx.beginPath();
    ctx.ellipse(10, -2, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1a1a2a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-14, 14);
    ctx.lineTo(16, 14);
    ctx.moveTo(-6, 11);
    ctx.lineTo(-6, 14);
    ctx.moveTo(8, 11);
    ctx.lineTo(8, 14);
    ctx.moveTo(0, -11);
    ctx.lineTo(0, -15);
    ctx.stroke();
    const p = Math.cos(t * 50);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-40 * p, -15);
    ctx.lineTo(40 * p, -15);
    ctx.stroke();
    ctx.restore();
  },
  decor(ctx, w, h, off, tod, t) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.75, h * 0.14, 18, "#e8e4dc");
    // céu de garoa: um véu de nuvens baixas
    ctx.fillStyle = ciclo(["#c8b4be", "#dce2e8", "#b496aa", "#282c46"], tod);
    ctx.globalAlpha = 0.38;
    repetir(w, off * 0.02 + t * 6, 300, (x, k) => {
      ctx.beginPath();
      ctx.ellipse(x + 150, h * 0.18 + variar(k, 7, 4) * 12, 220, 34, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    // os prédios em três camadas
    predios(ctx, w, h - 120, off * 0.05, ciclo(PREDIO_LONGE, tod), "#ffe2a0", noite * 0.8, 170, 40);
    repetir(w, off * 0.08, 1200, (x) => farol(ctx, x + 760, h - 120, ciclo(PREDIO_LONGE, tod)));
    predios(ctx, w, h - 80, off * 0.12, ciclo(PREDIO, tod), "#ffe2a0", Math.max(0.15, noite), 190, 52);
    // a Ponte Estaiada sobre o rio e o MASP na Paulista
    repetir(w, off * 0.2, 1400, (x) => estaiada(ctx, x + 400, h - 52, ciclo(PONTE, tod), noite));
    predios(ctx, w, h - 40, off * 0.36, ciclo(PREDIO_PERTO, tod), "#ffe2a0", Math.max(0.2, noite), 120, 66);
    repetir(w, off * 0.36, 1000, (x) => masp(ctx, x + 820, h - 40, ciclo(["#8aa0b4", "#9ab4c8", "#806c8a", "#2a3050"], tod), noite));
    // o trânsito da avenida, mais rápido que a calçada, de faróis acesos à noite
    repetir(w, off * 0.44 - t * 70, 160, (x, k) => {
      const cx = x + variar(k, 23, 60);
      ctx.fillStyle = ["#d83a3a", "#e8e8ea", "#2a5ab8", "#e8b83a", "#3a3a44"][variar(k, 11, 5)];
      ctx.fillRect(cx - 13, h - 51, 26, 7);
      ctx.fillRect(cx - 7, h - 56, 14, 5);
      ctx.fillStyle = "#9ab4c8";
      ctx.fillRect(cx - 5, h - 55, 4, 3);
      ctx.fillRect(cx + 1, h - 55, 4, 3);
      ctx.fillStyle = "#16161c";
      ctx.beginPath();
      ctx.arc(cx - 8, h - 43, 3, 0, Math.PI * 2);
      ctx.arc(cx + 8, h - 43, 3, 0, Math.PI * 2);
      ctx.fill();
      if (noite > 0.3) {
        ctx.globalAlpha = noite * 0.55;
        ctx.fillStyle = "#0a0c18";
        ctx.fillRect(cx - 13, h - 56, 26, 12);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#fff2b0";
        ctx.fillRect(cx + 12, h - 50, 3, 2);
        ctx.fillStyle = "#ff3a3a";
        ctx.fillRect(cx - 14, h - 50, 2, 2);
      }
    });
    // ipês e árvores da avenida
    const arvore = ciclo(ARVORE, tod);
    repetir(w, off * 0.44, 130, (x, k) => {
      const ax = x + variar(k, 19, 40);
      ctx.fillStyle = "#3a2a20";
      ctx.fillRect(ax - 2, h - 70, 4, 30);
      ctx.fillStyle = variar(k, 7, 5) === 0 ? "#e85ab0" : arvore;
      for (const [dx, dy, r] of [[-10, -76, 12], [8, -78, 13], [0, -90, 12]]) {
        ctx.beginPath();
        ctx.arc(ax + dx, h + dy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    // o asfalto molhado, com a faixa de pedestres
    ctx.fillStyle = ciclo(["#5a5a60", "#5e5e64", "#545058", "#1e1e26"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(0, y + 2, w, 6);
    ctx.fillStyle = "#e8e8e8";
    for (let x = -(off % 320); x < w; x += 320) for (let i = 0; i < 6; i++) ctx.fillRect(x + 40 + i * 14, y + 10, 8, 22);
    ctx.fillStyle = "#ffd24d";
    for (let x = -(off % 60); x < w; x += 60) ctx.fillRect(x + 160, y + 20, 28, 3);
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // concreto pintado de vermelho, com as marcas das fôrmas
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, c.luz);
    g.addColorStop(0.5, c.corpo);
    g.addColorStop(1, c.sombra);
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, len);
    ctx.strokeStyle = "rgba(60,0,0,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = 30 + variante * 13; y < len; y += 40) {
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + w, y);
    }
    ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    for (let i = 0; i < len / 14; i++) ctx.fillRect(x0 + variar(i + variante * 31, 37, w - 3), variar(i, 53, Math.max(1, Math.floor(len))), 2, 2);
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = "#8a8a8e";
      ctx.beginPath();
      ctx.moveTo(x0, 12);
      ctx.lineTo(x0 + w * 0.3, 2);
      ctx.lineTo(x0 + w * 0.6, 9);
      ctx.lineTo(x0 + w, 3);
      ctx.lineTo(x0 + w, 14);
      ctx.lineTo(x0, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // ferragem exposta
      ctx.strokeStyle = "#3a2a1a";
      ctx.beginPath();
      for (const fx of [x0 + 14, x0 + w / 2, x0 + w - 14]) {
        ctx.moveTo(fx, 14);
        ctx.lineTo(fx + 2, 0);
      }
      ctx.stroke();
      return;
    }
    // laje de concreto cinza na ponta
    ctx.fillStyle = "#9a9a9e";
    ctx.fillRect(x0 - 6, 0, w + 12, 12);
    ctx.strokeRect(x0 - 6, 0, w + 12, 12);
    ctx.fillStyle = "#7a7a80";
    ctx.fillRect(x0 - 6, 9, w + 12, 3);
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => guardaChuva(c, t));
  },
};
