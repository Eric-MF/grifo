// Cerrado: as árvores de tronco retorcido e casca grossa, os ipês-amarelos floridos soltando flores no vento,
// os cupinzeiros, o lobo-guará e a seriema; as colunas são troncos de casca de cortiça.
import { ciclo, colinas, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, lua, noiteDe, repetir, sol } from "../kit";

const IPE = "#ffcc1a";
// cores por hora do dia (amanhecer, dia, entardecer, noite)
const CHAPADAO = ["#b0a8a0", "#a8b4b8", "#8a7a94", "#1a1c2a"];
const CAPIM = ["#c8b06a", "#ccb868", "#a8906a", "#201c12"];
const COPA = ["#5a7a3a", "#56803a", "#4a5a3a", "#0e160a"];
const TRONCO = ["#5a4434", "#5e4836", "#4e3a34", "#140e0c"];
const CUPIM = ["#b07a4a", "#b8804c", "#966a4a", "#24180e"];
const LOBO = ["#c8642a", "#d06a2a", "#a8542a", "#2a140a"];

/** Árvore do cerrado: tronco torto, galhos tortos e a copa rala (ou florida, no ipê). */
function arvoreTorta(ctx: Ctx, x: number, base: number, s: number, tronco: string, copa: string, k: number) {
  ctx.strokeStyle = tronco;
  ctx.lineCap = "round";
  ctx.lineWidth = 5 * s;
  const torce = (variar(k, 7, 5) - 2) * 4 * s;
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.bezierCurveTo(x + torce, base - 14 * s, x - torce, base - 24 * s, x + torce * 0.5, base - 36 * s);
  ctx.stroke();
  ctx.lineWidth = 2.6 * s;
  ctx.beginPath();
  for (const [a, L] of [[-0.9, 22], [0.8, 24], [-0.2, 18], [0.3, 16]]) {
    ctx.moveTo(x + torce * 0.5, base - 34 * s);
    ctx.quadraticCurveTo(x + Math.sin(a) * L * 0.4 * s, base - (34 + L * 0.6) * s, x + Math.sin(a) * L * s, base - (34 + Math.cos(a) * L) * s);
  }
  ctx.stroke();
  ctx.fillStyle = copa;
  for (const [dx, dy, r] of [[-18, -56, 11], [0, -64, 13], [18, -56, 11], [-8, -50, 9], [10, -50, 9]]) {
    ctx.beginPath();
    ctx.ellipse(x + dx * s, base + dy * s, r * s * 1.2, r * s * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Lobo-guará: as pernas compridas e pretas, o pelo laranja e a crina. */
function loboGuara(ctx: Ctx, x: number, base: number, cor: string, t: number) {
  const passo = Math.sin(t * 6) * 0.35;
  ctx.strokeStyle = "#1a1210";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (const [px, f] of [[-8, 1], [-5, -1], [8, -1], [11, 1]]) {
    ctx.moveTo(x + px, base - 22);
    ctx.lineTo(x + px + Math.sin(passo * f) * 8, base);
  }
  ctx.stroke();
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.ellipse(x + 2, base - 26, 13, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 12, base - 28);
  ctx.lineTo(x + 18, base - 38);
  ctx.lineTo(x + 26, base - 36);
  ctx.lineTo(x + 18, base - 30);
  ctx.fill();
  ctx.fillStyle = "#1a1210";
  ctx.beginPath();
  ctx.moveTo(x + 17, base - 38);
  ctx.lineTo(x + 18, base - 45);
  ctx.lineTo(x + 21, base - 38);
  ctx.fill();
  ctx.fillRect(x - 4, base - 33, 14, 3);
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(x - 10, base - 28);
  ctx.quadraticCurveTo(x - 18, base - 24, x - 16, base - 16);
  ctx.lineTo(x - 12, base - 24);
  ctx.fill();
}

/** Flor de ipê-amarelo (a da maleta e as que caem no vento). */
function florIpe(ctx: Ctx, x: number, y: number, s: number) {
  ctx.fillStyle = IPE;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const [px, py] = [x + Math.cos(a) * 2.6 * s, y + Math.sin(a) * 2.6 * s];
    ctx.moveTo(px + Math.cos(a) * 2.6 * s, py + Math.sin(a) * 2.6 * s);
    ctx.ellipse(px, py, 2.6 * s, 1.6 * s, a, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.fillStyle = "#c8842a";
  ctx.beginPath();
  ctx.arc(x, y, 1 * s, 0, Math.PI * 2);
  ctx.fill();
}

export const CERRADO: Tema = {
  id: "cerrado",
  nome: "Cerrado",
  descricao: "Árvores de tronco retorcido, ipês-amarelos soltando flores no vento, cupinzeiros, o lobo-guará e a seriema.",
  grupo: "biomas",
  amostra: `linear-gradient(135deg, ${IPE} 50%, #5a4434 50%)`,
  onda: "sine",
  somBase: 330,
  climaFixo: "folhas",
  paleta: {
    // o céu seco e alto da estação das flores
    ceu: [["#f0a888", "#ffe4c4"], ["#3a94e0", "#d8eef8"], ["#7a5a90", "#f6a868"], ["#081436", "#22386a"]],
    longe: CHAPADAO,
    perto: CAPIM,
    chao: "#b8865a",
    chaoLinha: "#7a5434",
    coluna: { corpo: "#8a6a52", sombra: "#62483a", luz: "#a88a6e", contorno: "#2a1a10" },
    maleta: { corpo: "#5a7a3a", escuro: "#2a3e14", fivela: IPE, alca: "#2a3e14" },
    asa: { cor: "#ffffff", contorno: "#c8842a" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: [IPE, "#ffffff", "#c8642a"],
    recorde: {
      cor: "#ffcc1a", traco: [7, 2, 2, 2], largura: 3.5,
      aviso: { texto: "NOVO RECORDE!", fonte: "800 28px system-ui, sans-serif", corTexto: "#2a1a10", corContorno: "#ffffff", corFundo: "rgba(255,204,26,0.92)", anima: "pulsa" },
    },
    hud: "#2a1a10",
    estrelas: "#ffffff",
  },
  folha(ctx, s) {
    florIpe(ctx, 0, 0, 0.9 + s * 0.6);
  },
  surpresa(ctx, w, h, f, t) {
    // a seriema correndo pelo capim, de pernas compridas, com o topete arrepiado
    // desenhada em escala 1,7 a partir da origem (x, base)
    ctx.translate(atravessa(w, f, 180), h - 42);
    ctx.scale(1.7, 1.7);
    const x = 0;
    const base = 0;
    const passo = t * 12;
    ctx.strokeStyle = "#c8642a";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (const fs of [0, Math.PI]) {
      const a = Math.sin(passo + fs) * 0.7;
      ctx.moveTo(x, base - 34);
      ctx.lineTo(x + Math.sin(a) * 20, base - 34 + Math.cos(a) * 20);
      ctx.lineTo(x + Math.sin(a) * 20 + Math.sin(a - 0.6) * 14, base - 14 + Math.cos(a - 0.6) * 14);
    }
    ctx.stroke();
    ctx.fillStyle = "#b8a080";
    ctx.beginPath();
    ctx.ellipse(x, base - 40, 16, 9, -0.2, 0, Math.PI * 2);
    ctx.moveTo(x - 14, base - 40);
    ctx.lineTo(x - 34, base - 34);
    ctx.lineTo(x - 14, base - 36);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#b8a080";
    ctx.beginPath();
    ctx.moveTo(x + 12, base - 44);
    ctx.quadraticCurveTo(x + 18, base - 58, x + 22, base - 66);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 23, base - 68, 4.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d8303a";
    ctx.beginPath();
    ctx.moveTo(x + 27, base - 69);
    ctx.lineTo(x + 34, base - 67);
    ctx.lineTo(x + 27, base - 66);
    ctx.fill();
    ctx.strokeStyle = "#5a4a3a";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.moveTo(x + 21, base - 72);
      ctx.lineTo(x + 16 + i * 3, base - 80 + Math.sin(t * 9 + i));
    }
    ctx.stroke();
  },
  decor(ctx, w, h, off, tod, t) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.82, h * 0.13, 20);
    else sol(ctx, w * 0.82, h * 0.14, 26, "#fff6dc", "rgba(255,236,180,0.5)");
    // o chapadão ao fundo, de topo reto
    colinas(ctx, w, h - 40, off * 0.04, ciclo(CHAPADAO, tod), 150, 8, 0.003, 2);
    // o capim alto e as árvores tortas, com ipês floridos entre elas
    colinas(ctx, w, h - 40, off * 0.12, ciclo(CAPIM, tod), 90, 10, 0.008, 4);
    const tronco = ciclo(TRONCO, tod);
    const copa = ciclo(COPA, tod);
    const ipe = ciclo(["#ffcc1a", "#ffcc1a", "#e8aa2a", "#4a3a14"], tod);
    repetir(w, off * 0.18, 110, (x, k) => arvoreTorta(ctx, x + variar(k, 29, 40), h - 90, 1.1 + variar(k, 7, 3) * 0.1, tronco, variar(k, 5, 4) === 0 ? ipe : copa, k));
    // os cupinzeiros
    const cupim = ciclo(CUPIM, tod);
    repetir(w, off * 0.26, 230, (x, k) => {
      const cx = x + variar(k, 31, 80);
      const a = 30 + variar(k, 7, 3) * 12;
      ctx.fillStyle = cupim;
      ctx.beginPath();
      ctx.moveTo(cx - 14, h - 70);
      ctx.quadraticCurveTo(cx - 12, h - 70 - a, cx - 2, h - 70 - a);
      ctx.quadraticCurveTo(cx + 6, h - 70 - a * 0.9, cx + 14, h - 70);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.beginPath();
      ctx.arc(cx - 4, h - 70 - a * 0.5, 2, 0, Math.PI * 2);
      ctx.fill();
    });
    colinas(ctx, w, h - 40, off * 0.3, ciclo(["#b8a05a", "#bca85a", "#9a8458", "#1a180e"], tod), 30, 5, 0.014, 6);
    // o lobo-guará atravessando o capim
    repetir(w, off * 0.34 - t * 22, 700, (x, k) => loboGuara(ctx, x + variar(k, 31, 200), h - 50, ciclo(LOBO, tod), t));
    // ipês grandes na frente
    repetir(w, off * 0.42, 420, (x, k) => arvoreTorta(ctx, x + variar(k, 37, 100), h - 44, 2.1, tronco, ipe, k + 3));
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#9a6e4e", "#24180e"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 3);
    // flores caídas no chão
    for (let x = -(off % 31); x < w; x += 31) {
      const k = Math.round((x + off) / 31);
      florIpe(ctx, x + 12, y + 10 + variar(k, 7, 20), 0.8);
    }
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // casca grossa de cortiça: placas fundas separadas por sulcos tortos
    ctx.fillStyle = c.sombra;
    ctx.fillRect(x0, 0, w, len);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, 0, w, len);
    ctx.clip();
    for (let y = -10, fila = 0; y < len; y += 24, fila++) {
      for (let x = x0 + (fila % 2 ? -8 : 0); x < x0 + w; x += 20) {
        const k = fila * 7 + Math.round(x) + variante;
        ctx.fillStyle = variar(k, 3, 2) ? c.corpo : c.luz;
        ctx.beginPath();
        ctx.roundRect(x + 2, y + 2 + variar(k, 5, 4), 17, 20 + variar(k, 7, 4), 6);
        ctx.fill();
      }
    }
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, "rgba(255,255,255,0.15)");
    g.addColorStop(0.5, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(0,0,0,0.3)");
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, len);
    ctx.restore();
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
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
    // o corte, com flores de ipê pousadas
    ctx.fillStyle = "#d8b07a";
    ctx.fillRect(x0 - 3, 0, w + 6, 10);
    ctx.strokeRect(x0 - 3, 0, w + 6, 10);
    for (let i = 0; i < 4; i++) florIpe(ctx, x0 + 10 + i * 18, 14, 1);
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => florIpe(c, 10, -22, 1.6));
  },
};
