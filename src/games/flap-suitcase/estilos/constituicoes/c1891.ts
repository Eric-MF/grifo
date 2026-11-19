// Constituição de 1891, a primeira da República: os cafezais em fileiras nos morros, o trem a vapor levando as sacas
// para o porto, o casarão da fazenda e as colunas art nouveau com os ramos de café; na maleta, o chapéu-coco.
import { ciclo, colinas, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, lua, noiteDe, repetir, sol } from "../kit";

const CAFE = "#c8222e";
// cores por hora do dia (amanhecer, dia, entardecer, noite)
const MORRO = ["#a8a090", "#98aab0", "#8a7a90", "#1a1c2a"];
const CAFEZAL = ["#4a6a34", "#466e32", "#3e4a34", "#0a140a"];
const TERRA = ["#a8603a", "#b0663c", "#8e5038", "#24140e"];
const CASARAO = ["#f2e6d0", "#faf0da", "#e8d4c6", "#565262"];
const TREM = ["#2a2420", "#28221e", "#241e1e", "#08060a"];

/** Fileiras de pés de café acompanhando o morro, com os frutos vermelhos. */
function cafezal(ctx: Ctx, w: number, base: number, o: number, cor: string, alt: number) {
  for (let fila = 0; fila < 4; fila++) {
    const y = base - fila * (alt / 4);
    repetir(w, o * (1 - fila * 0.05), 20, (x, k) => {
      ctx.fillStyle = cor;
      ctx.beginPath();
      ctx.ellipse(x + 10, y - 6 - Math.sin((x + o) * 0.004) * 10, 9, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      if (variar(k + fila * 3, 5, 3) === 0) {
        ctx.fillStyle = CAFE;
        ctx.fillRect(x + 8, y - 6 - Math.sin((x + o) * 0.004) * 10, 2, 2);
      }
    });
  }
}

/** Casarão da fazenda: dois andares, varanda com colunas e o telhado de quatro águas. */
function casarao(ctx: Ctx, x: number, base: number, cor: string, acesas: number) {
  ctx.fillStyle = cor;
  ctx.fillRect(x, base - 60, 180, 60);
  ctx.fillStyle = "#a8583a";
  ctx.beginPath();
  ctx.moveTo(x - 8, base - 60);
  ctx.lineTo(x + 30, base - 84);
  ctx.lineTo(x + 150, base - 84);
  ctx.lineTo(x + 188, base - 60);
  ctx.fill();
  for (let a = 0; a < 2; a++) {
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = a === 0 && acesas > 0.3 ? "#ffe2a0" : "#4a6a4a";
      ctx.fillRect(x + 12 + i * 24, base - 52 + a * 28, 10, 16);
    }
  }
  ctx.fillStyle = "#e8dcc8";
  ctx.fillRect(x, base - 26, 180, 3);
  for (let i = 0; i < 8; i++) ctx.fillRect(x + 4 + i * 24, base - 24, 3, 24);
}

/** Locomotiva a vapor com os vagões de sacas de café. */
function tremCafe(ctx: Ctx, x: number, trilho: number, cor: string, t: number) {
  // os vagões de café atrás da locomotiva (o trem anda para a direita)
  ctx.fillStyle = cor;
  for (let i = 0; i < 3; i++) {
    const vx = x - 60 - i * 52;
    ctx.fillRect(vx, trilho - 18, 46, 12);
    ctx.fillStyle = "#c8a46a";
    for (let j = 0; j < 4; j++) {
      ctx.beginPath();
      ctx.ellipse(vx + 7 + j * 11, trilho - 21, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = cor;
  }
  // a locomotiva de frente para a direita: a cabine junto dos vagões, a chaminé na frente
  ctx.fillRect(x, trilho - 22, 44, 16);
  ctx.fillRect(x - 2, trilho - 38, 18, 32);
  ctx.beginPath();
  ctx.moveTo(x + 38, trilho - 22);
  ctx.lineTo(x + 42, trilho - 40);
  ctx.lineTo(x + 26, trilho - 40);
  ctx.lineTo(x + 30, trilho - 22);
  ctx.fill();
  for (const rx of [x + 34, x + 18, x + 4]) {
    ctx.beginPath();
    ctx.arc(rx, trilho - 5, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  // o vapor sai da chaminé e fica para trás
  for (let i = 0; i < 5; i++) {
    const f = (((t * 0.8 + i / 5) % 1) + 1) % 1;
    ctx.fillStyle = `rgba(240,240,245,${0.7 * (1 - f)})`;
    ctx.beginPath();
    ctx.arc(x + 34 - f * 50, trilho - 44 - f * 40, 4 + f * 12, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Chapéu-coco preto. */
function chapeuCoco(c: Ctx) {
  c.save();
  c.translate(-6, -21);
  c.rotate(-0.1);
  c.fillStyle = "#141414";
  c.beginPath();
  c.ellipse(0, 2, 12, 2.8, 0, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.ellipse(0, -2, 8, 8, 0, Math.PI, 0);
  c.fill();
  c.fillRect(-8, -3, 16, 4);
  c.fillStyle = "#5a3a2a";
  c.fillRect(-8, -1, 16, 2);
  c.restore();
}

export const C1891: Tema = {
  id: "c1891",
  nome: "República Velha (1891)",
  descricao: "A primeira Constituição da República, promulgada em 1891: os cafezais, o trem a vapor e o casarão da fazenda.",
  grupo: "constituicoes",
  amostra: `linear-gradient(135deg, #5a3a24 50%, #f2e6d0 50%)`,
  onda: "triangle",
  somBase: 349,
  paleta: {
    ceu: [["#e8a890", "#fde2c4"], ["#68a8d8", "#dcecf4"], ["#6a5a8a", "#f0a870"], ["#0a1434", "#24386a"]],
    longe: MORRO,
    perto: CAFEZAL,
    chao: "#a8603a",
    chaoLinha: "#6a3a1e",
    coluna: { corpo: "#efe2c8", sombra: "#c8b490", luz: "#fbf4e4", contorno: "#5a3a1a" },
    maleta: { corpo: "#6a4a2a", escuro: "#32200e", fivela: "#e8c47a", alca: "#32200e" },
    asa: { cor: "#ffffff", contorno: "#6a4a2a" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: [CAFE, "#4a6a34", "#efe2c8"],
    recorde: {
      cor: "#a8603a", traco: [14, 2, 2, 2, 2, 2], largura: 3.5,
      aviso: { texto: "NOVO RECORDE!", fonte: "italic 800 28px Georgia, serif", corTexto: "#fbf4e4", corContorno: "#2a1a0a", corFundo: "rgba(106,74,42,0.92)", anima: "pulsa" },
    },
    hud: "#2a1a0a",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // uma xícara de café gigante, fumegando, flutua pelo céu dos cafezais
    const x = atravessa(w, f, 120);
    const y = h * 0.26 + Math.sin(t * 1.5) * 10;
    ctx.fillStyle = "#f2ece0";
    ctx.strokeStyle = "#8a6a4a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y + 30, 46, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 30, y - 10);
    ctx.lineTo(x - 24, y + 22);
    ctx.quadraticCurveTo(x, y + 30, x + 24, y + 22);
    ctx.lineTo(x + 30, y - 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 34, y + 4, 10, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.fillStyle = "#5a3a1e";
    ctx.beginPath();
    ctx.ellipse(x, y - 10, 30, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const s = (((t * 0.6 + i / 3) % 1) + 1) % 1;
      ctx.globalAlpha = 1 - s;
      ctx.beginPath();
      ctx.moveTo(x - 14 + i * 14, y - 16 - s * 10);
      ctx.bezierCurveTo(x - 22 + i * 14, y - 30 - s * 20, x - 6 + i * 14, y - 40 - s * 20, x - 14 + i * 14, y - 56 - s * 24);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
  decor(ctx, w, h, off, tod, t, tema) {
    const p = tema.paleta;
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.2, h * 0.14, 20);
    else sol(ctx, w * 0.2, h * 0.15, 24, "#fff4d6", "rgba(255,236,180,0.45)");
    colinas(ctx, w, h - 40, off * 0.04, ciclo(p.longe, tod), 150, 36, 0.006, 2);
    // o mar de morros plantados de café
    const terra = ciclo(TERRA, tod);
    const pe = ciclo(CAFEZAL, tod);
    colinas(ctx, w, h - 40, off * 0.1, terra, 120, 22, 0.004, 4);
    cafezal(ctx, w, h - 120, off * 0.1, pe, 80);
    repetir(w, off * 0.12, 1300, (x) => casarao(ctx, x + 700, h - 160, ciclo(CASARAO, tod), noite));
    // o trem a vapor no aterro
    ctx.fillStyle = terra;
    ctx.fillRect(0, h - 100, w, 14);
    ctx.fillStyle = "#4a3a2a";
    repetir(w, off * 0.22, 14, (x) => ctx.fillRect(x, h - 100, 7, 3));
    repetir(w, off * 0.22 - t * 30, 1100, (x) => tremCafe(ctx, x + 400, h - 100, ciclo(TREM, tod), t));
    // pés de café de perto
    colinas(ctx, w, h - 40, off * 0.34, terra, 40, 8, 0.01, 3);
    cafezal(ctx, w, h - 44, off * 0.36, pe, 30);
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#8e5038", "#24140e"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 3);
    // grãos de café secando no terreiro
    for (let x = -(off % 17); x < w; x += 17) {
      const k = Math.round((x + off) / 17);
      ctx.fillStyle = variar(k, 3, 2) ? CAFE : "#5a3a24";
      ctx.beginPath();
      ctx.ellipse(x + 8, y + 10 + variar(k, 7, 22), 2.2, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // fuste creme com o ramo de café subindo em curvas, como nas fachadas art nouveau
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
    ctx.strokeStyle = "#5a3a1a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let y = -20; y < len + 20; y += 8) {
      const x = Math.sin(y * 0.03 + variante) * (w / 2 - 12);
      if (y === -20) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    for (let y = 20 + variante * 10; y < len; y += 34) {
      const x = Math.sin(y * 0.03 + variante) * (w / 2 - 12);
      for (const l of [-1, 1]) {
        ctx.fillStyle = "#4a6a34";
        ctx.beginPath();
        ctx.ellipse(x + l * 8, y, 7, 3, l * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = CAFE;
      for (const [dx, dy] of [[-2, 5], [2, 6], [0, 9]]) {
        ctx.beginPath();
        ctx.arc(x + dx, y + dy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = c.corpo;
      ctx.beginPath();
      ctx.moveTo(x0, 13);
      ctx.lineTo(x0 + w * 0.25, 4);
      ctx.lineTo(x0 + w * 0.5, 11);
      ctx.lineTo(x0 + w * 0.75, 2);
      ctx.lineTo(x0 + w, 9);
      ctx.lineTo(x0 + w, 15);
      ctx.lineTo(x0, 15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // capitel art nouveau: curvas que se abrem como folhas
    ctx.fillStyle = c.luz;
    ctx.fillRect(x0 - 6, 0, w + 12, 7);
    ctx.strokeRect(x0 - 6, 0, w + 12, 7);
    ctx.fillStyle = c.sombra;
    ctx.beginPath();
    ctx.moveTo(x0, 7);
    ctx.bezierCurveTo(x0 + 6, 22, x0 + 24, 12, 0, 22);
    ctx.bezierCurveTo(x0 + w - 24, 12, x0 + w - 6, 22, x0 + w, 7);
    ctx.fill();
    ctx.stroke();
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, chapeuCoco);
  },
};
