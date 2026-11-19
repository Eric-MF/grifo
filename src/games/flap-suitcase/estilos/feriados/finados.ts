// Finados (2/11): o cemitério de dia, em tom sereno, com alamedas de ciprestes, túmulos brancos, velas acesas,
// crisântemos e as visitas levando flores.
import { ciclo, colinas, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { figura, lua, noiteDe, repetir, sol } from "../kit";

const FLORES = ["#ffffff", "#ffd84a", "#e8a0d8", "#c8a0ff"];
// cores por hora do dia (amanhecer, dia, entardecer, noite)
const CIPRESTE = ["#3a5a44", "#2f5a40", "#33443e", "#0a1612"];
const CIPRESTE_LONGE = ["#6a8478", "#5f8a74", "#5a6270", "#14202a"];
const MARMORE = ["#f0e8ea", "#f6f4f2", "#e6dae2", "#5a5a6e"];
const MARMORE_SOMBRA = ["#cfc2c8", "#d6d0cc", "#c2b2c0", "#3a3a4e"];
const VISITA = ["#4a4058", "#4a465a", "#40384e", "#10101a"];

/** Cipreste: copa estreita e alta, em chama. */
function cipreste(ctx: Ctx, x: number, base: number, alt: number, cor: string) {
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(x, base - alt);
  ctx.bezierCurveTo(x + alt * 0.16, base - alt * 0.7, x + alt * 0.14, base - alt * 0.15, x + 3, base);
  ctx.lineTo(x - 3, base);
  ctx.bezierCurveTo(x - alt * 0.14, base - alt * 0.15, x - alt * 0.16, base - alt * 0.7, x, base - alt);
  ctx.fill();
}

/** Vela acesa, com a chama tremendo e o brilho em volta. */
function vela(ctx: Ctx, x: number, y: number, t: number, k: number) {
  const tremor = Math.sin(t * 14 + k * 3) * 0.5;
  ctx.fillStyle = "rgba(255,200,110,0.25)";
  ctx.beginPath();
  ctx.arc(x, y - 9, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fbf6ea";
  ctx.fillRect(x - 1.6, y - 7, 3.2, 7);
  ctx.fillStyle = "#ffc23a";
  ctx.beginPath();
  ctx.ellipse(x + tremor * 0.4, y - 10, 1.5, 3, tremor * 0.1, 0, Math.PI * 2);
  ctx.fill();
}

/** Ramalhete de crisântemos. */
function crisantemos(ctx: Ctx, x: number, y: number, s: number, k: number) {
  ctx.fillStyle = "#3a6a3a";
  ctx.fillRect(x - 1, y - 6 * s, 2, 6 * s);
  for (let i = 0; i < 4; i++) {
    const fx = x + (i - 1.5) * 4 * s;
    const fy = y - 7 * s - (i % 2) * 3 * s;
    ctx.fillStyle = FLORES[variar(k + i, 7, FLORES.length)];
    ctx.beginPath();
    ctx.arc(fx, fy, 2.6 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Túmulo branco: base, lápide arredondada ou capelinha com cruz. */
function tumulo(ctx: Ctx, x: number, base: number, cor: string, sombra: string, k: number) {
  const tipo = variar(k, 7, 3);
  ctx.fillStyle = cor;
  ctx.fillRect(x, base - 10, 46, 10);
  ctx.fillStyle = sombra;
  ctx.fillRect(x, base - 3, 46, 3);
  ctx.fillStyle = cor;
  if (tipo === 0) {
    // capelinha
    ctx.fillRect(x + 8, base - 52, 30, 42);
    ctx.beginPath();
    ctx.moveTo(x + 4, base - 52);
    ctx.lineTo(x + 23, base - 66);
    ctx.lineTo(x + 42, base - 52);
    ctx.fill();
    ctx.fillRect(x + 21.5, base - 80, 3, 14);
    ctx.fillRect(x + 17, base - 75, 12, 3);
    ctx.fillStyle = sombra;
    ctx.beginPath();
    ctx.moveTo(x + 16, base - 10);
    ctx.lineTo(x + 16, base - 34);
    ctx.arc(x + 23, base - 34, 7, Math.PI, 0);
    ctx.lineTo(x + 30, base - 10);
    ctx.fill();
  } else {
    // lápide
    const a = tipo === 1 ? 34 : 26;
    ctx.beginPath();
    ctx.roundRect(x + 10, base - 10 - a, 26, a, [13, 13, 0, 0]);
    ctx.fill();
    ctx.fillStyle = sombra;
    ctx.fillRect(x + 16, base - 10 - a + 12, 14, 1.6);
    ctx.fillRect(x + 16, base - 10 - a + 17, 10, 1.6);
  }
}

export const FINADOS: Tema = {
  id: "finados",
  nome: "Finados",
  descricao: "2 de novembro: alamedas de ciprestes, túmulos brancos, velas acesas e crisântemos levados pelas visitas.",
  grupo: "feriados",
  janela: { tipo: "fixa", dia: 2, mes: 11 },
  amostra: "linear-gradient(135deg, #f2eef0 50%, #5a4a78 50%)",
  onda: "sine",
  somBase: 262,
  climaFixo: "limpo",
  capitel: "dorico",
  paleta: {
    // céu claro e sereno, sem a melancolia de um céu escuro
    ceu: [["#c8a8c8", "#f6e2d8"], ["#8ab4dc", "#e8f0f6"], ["#7a6a9a", "#f2c0a8"], ["#141a38", "#36406a"]],
    longe: CIPRESTE_LONGE,
    perto: CIPRESTE,
    chao: "#b8b0a2",
    chaoLinha: "#8a8274",
    coluna: { corpo: "#8e8a96", sombra: "#6e6a78", luz: "#b2aebc", contorno: "#34303e" },
    maleta: { corpo: "#5a4a78", escuro: "#2a2040", fivela: "#e8d8a0", alca: "#2a2040" },
    asa: { cor: "#ffffff", contorno: "#7a6a98" },
    moeda: ["#ffd866", "#b08a2e"],
    particula: ["#ffffff", "#ffd84a", "#c8a0ff"],
    recorde: {
      cor: "#9a86c8", traco: [2, 4, 8, 4], largura: 3,
      aviso: { texto: "NOVO RECORDE", fonte: "italic 700 28px Georgia, serif", corTexto: "#ffffff", corContorno: "#2a2040", corFundo: "rgba(70,56,100,0.88)", anima: "pulsa" },
    },
    hud: "#2a2238",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // borboletas brancas subindo devagar do cemitério para o céu
    for (let i = 0; i < 9; i++) {
      const sobe = (f * 1.3 + i * 0.07) % 1.3;
      const x = w * (0.08 + i * 0.1) + Math.sin(t * 1.5 + i * 2) * 30;
      const y = h - 90 - sobe * h * 0.7;
      const bate = Math.abs(Math.sin(t * 10 + i));
      ctx.globalAlpha = Math.max(0, Math.min(1, (1.3 - sobe) * 3)) * Math.min(1, f * 8);
      ctx.fillStyle = i % 3 === 0 ? "#f0e6ff" : "#ffffff";
      for (const l of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(x + l * 5 * bate, y - 2, 6 * bate + 1, 8, l * 0.4, 0, Math.PI * 2);
        ctx.ellipse(x + l * 4 * bate, y + 6, 4 * bate + 1, 5, l * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#4a4058";
      ctx.fillRect(x - 1, y - 6, 2, 14);
    }
    ctx.globalAlpha = 1;
  },
  decor(ctx, w, h, off, tod, t, tema, surpresa) {
    const p = tema.paleta;
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.78, h * 0.16, 20);
    else sol(ctx, w * 0.78, h * 0.17, 24, "#fffaf0", "rgba(255,240,220,0.4)");
    colinas(ctx, w, h - 40, off * 0.05, ciclo(["#a8a8c0", "#a8c0d0", "#8a80a4", "#18203a"], tod), 90, 18, 0.006, 2);
    // ciprestes ao longe
    const longe = ciclo(p.longe, tod);
    repetir(w, off * 0.12, 46, (x, k) => cipreste(ctx, x + variar(k, 13, 20), h - 110, 70 + variar(k, 7, 4) * 12, longe));
    // muro do cemitério
    ctx.fillStyle = ciclo(["#e2d6d6", "#ece6e2", "#d6c8d0", "#3a3a4c"], tod);
    ctx.fillRect(0, h - 122, w, 24);
    ctx.fillStyle = ciclo(["#c4b6ba", "#ccc4c0", "#b8a8b4", "#2a2a3a"], tod);
    ctx.fillRect(0, h - 124, w, 4);
    // a alameda: ciprestes altos e túmulos
    const marmore = ciclo(MARMORE, tod);
    const sombra = ciclo(MARMORE_SOMBRA, tod);
    const verde = ciclo(p.perto, tod);
    repetir(w, off * 0.24, 120, (x, k) => {
      cipreste(ctx, x + 6, h - 96, 150 + variar(k, 7, 3) * 16, verde);
      tumulo(ctx, x + 40, h - 98, marmore, sombra, k);
    });
    // a surpresa: as borboletas sobem da alameda, atrás dos túmulos da frente
    surpresa?.();
    // fila de túmulos da frente, com velas e flores
    repetir(w, off * 0.38, 96, (x, k) => {
      tumulo(ctx, x, h - 44, marmore, sombra, k + 5);
      crisantemos(ctx, x + 6, h - 54, 1.1, k);
      vela(ctx, x + 40, h - 54, t, k);
      if (variar(k, 3, 2)) vela(ctx, x + 44, h - 54, t, k + 1);
    });
    // visitas levando flores
    const visita = ciclo(VISITA, tod);
    repetir(w, off * 0.46 + t * 10, 340, (x, k) => {
      const passo = Math.sin(t * 3.6 + k) * 0.2;
      const px = x + variar(k, 31, 120);
      const mao = figura(ctx, px, h - 41, 0.95, visita, { bracoE: -passo, bracoD: 0.9, pernaE: passo, pernaD: -passo });
      crisantemos(ctx, mao[0] + 1, mao[1] + 1, 1, k);
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#a89ea2", "#34343c"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 3);
    // pétalas caídas no caminho de pedrisco
    for (let x = -(off % 23); x < w; x += 23) {
      const k = Math.round((x + off) / 23);
      ctx.fillStyle = FLORES[variar(k, 7, FLORES.length)];
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.ellipse(x + 8, y + 8 + variar(k, 11, 22), 2.2, 1.2, k, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // granito cinza polido, salpicado, como as lápides
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, c.sombra);
    g.addColorStop(0.38, c.luz);
    g.addColorStop(1, c.sombra);
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, len);
    ctx.fillStyle = "rgba(40,36,50,0.35)";
    for (let y = 4; y < len; y += 7) {
      for (let i = 0; i < 3; i++) ctx.fillRect(x0 + 3 + variar(Math.round(y) * 3 + i + variante, 37, w - 6), y + i * 2, 1.6, 1.6);
    }
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    for (let y = 2; y < len; y += 11) ctx.fillRect(x0 + 3 + variar(Math.round(y) * 7 + variante, 29, w - 6), y, 1.4, 1.4);
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = c.corpo;
      ctx.beginPath();
      ctx.moveTo(x0, 13);
      ctx.lineTo(x0 + w * 0.24, 4);
      ctx.lineTo(x0 + w * 0.5, 11);
      ctx.lineTo(x0 + w * 0.75, 2);
      ctx.lineTo(x0 + w, 9);
      ctx.lineTo(x0 + w, 16);
      ctx.lineTo(x0, 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // cornija e a coroa de flores em volta
    ctx.fillStyle = c.luz;
    ctx.fillRect(x0 - 5, 0, w + 10, 8);
    ctx.strokeRect(x0 - 5, 0, w + 10, 8);
    ctx.fillStyle = "#3a6a3a";
    ctx.beginPath();
    ctx.roundRect(x0 - 3, 9, w + 6, 12, 6);
    ctx.fill();
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = FLORES[(i + variante) % FLORES.length];
      ctx.beginPath();
      ctx.arc(x0 + 2 + (i * (w - 4)) / 8, 15 + (i % 2 ? 2 : -2), 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => {
      // crisântemo branco preso na alça
      c.fillStyle = "#3a6a3a";
      c.fillRect(7, -26, 2, 9);
      c.fillStyle = "#ffffff";
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        c.beginPath();
        c.ellipse(8 + Math.cos(a) * 3.4, -28 + Math.sin(a) * 3.4, 2.6, 1.2, a, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = "#ffe07a";
      c.beginPath();
      c.arc(8, -28, 1.8, 0, Math.PI * 2);
      c.fill();
    });
  },
};
