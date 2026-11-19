// Dia Nacional da Defensoria Pública (19/5, Lei 10.448/2002): o núcleo da Defensoria aberto no bairro, com a fila de
// atendimento, as casas coloridas do morro e as colunas verdes com a balança; na maleta, a balancinha pendurada.
import { ciclo, colinas, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { figura, lua, noiteDe, repetir, sol, surge } from "../kit";

const VERDE = "#1a8a4a";
const OURO = "#e8c43a";
// cores por hora do dia (amanhecer, dia, entardecer, noite)
const MORRO = ["#8a8a7a", "#7f9a7a", "#6a6a7e", "#141a24"];
const CASAS = [
  ["#f0c84a", "#f6d050", "#dcaa50", "#4a4020"],
  ["#4ab0e0", "#40b4ea", "#4a8ac0", "#14304a"],
  ["#ff8ab8", "#ff90c0", "#d878a8", "#40203a"],
  ["#e8e0d0", "#f2ece0", "#dccac4", "#4a4a5c"],
  ["#e8743a", "#f07c3a", "#c8603e", "#3a2014"],
];
const NUCLEO = ["#f2ece2", "#faf8f2", "#e8dcd8", "#5a5a6e"];
const GENTE = ["#3a3040", "#3a3242", "#342c3e", "#0c0a10"];

/** Balança da Justiça: o fiel, a haste e os dois pratos, inclinando de leve. */
function balanca(ctx: Ctx, x: number, y: number, s: number, cor: string, t: number) {
  const inc = Math.sin(t * 1.5) * 0.08;
  ctx.strokeStyle = cor;
  ctx.fillStyle = cor;
  ctx.lineWidth = 1.4 * s;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 14 * s);
  ctx.moveTo(x - 10 * s * Math.cos(inc), y - 12 * s - 10 * s * Math.sin(inc));
  ctx.lineTo(x + 10 * s * Math.cos(inc), y - 12 * s + 10 * s * Math.sin(inc));
  ctx.stroke();
  for (const l of [-1, 1]) {
    const px = x + l * 10 * s * Math.cos(inc);
    const py = y - 12 * s + l * 10 * s * Math.sin(inc);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - 3 * s, py + 6 * s);
    ctx.moveTo(px, py);
    ctx.lineTo(px + 3 * s, py + 6 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(px, py + 6.5 * s, 4 * s, 1.4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillRect(x - 4 * s, y, 8 * s, 2 * s);
}

/** O núcleo da Defensoria: prédio baixo, a porta aberta iluminada e a placa verde. */
function nucleo(ctx: Ctx, x: number, base: number, cor: string, t: number) {
  ctx.fillStyle = cor;
  ctx.fillRect(x, base - 70, 200, 70);
  ctx.fillStyle = VERDE;
  ctx.fillRect(x - 6, base - 78, 212, 12);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + 60, base - 75, 80, 6);
  ctx.fillStyle = "#ffe8a0";
  ctx.fillRect(x + 80, base - 46, 40, 46);
  ctx.fillStyle = "#3a5a7a";
  for (const jx of [x + 16, x + 140]) ctx.fillRect(jx, base - 50, 44, 22);
  balanca(ctx, x + 100, base - 52, 0.9, VERDE, t);
}

export const DEFENSORIA: Tema = {
  id: "defensoria",
  nome: "Defensoria Pública",
  descricao: "19 de maio, Dia Nacional da Defensoria Pública: o núcleo aberto no bairro, a fila de atendimento e a balança.",
  grupo: "datas-direito",
  janela: { tipo: "fixa", dia: 19, mes: 5 },
  amostra: `linear-gradient(135deg, ${VERDE} 50%, ${OURO} 50%)`,
  onda: "triangle",
  somBase: 392,
  paleta: {
    ceu: [["#f0a890", "#ffe2c4"], ["#4aa4e4", "#d8f0fc"], ["#5a4a96", "#f4a464"], ["#081234", "#22386c"]],
    longe: MORRO,
    perto: GENTE,
    chao: "#9a9a9e",
    chaoLinha: "#6a6a70",
    coluna: { corpo: "#2a9a5a", sombra: "#1a7040", luz: "#4ab878", contorno: "#0a3a1e" },
    maleta: { corpo: "#6a4a2a", escuro: "#32200e", fivela: OURO, alca: "#32200e" },
    asa: { cor: "#ffffff", contorno: VERDE },
    moeda: ["#ffd866", "#c08a1e"],
    particula: [VERDE, OURO, "#ffffff"],
    recorde: {
      cor: "#2ac86a", traco: [5, 2, 5, 2, 15, 2], largura: 3.5,
      aviso: { texto: "NOVO RECORDE!", fonte: "800 28px Georgia, serif", corTexto: "#ffffff", corContorno: "#0a3a1e", corFundo: "rgba(26,138,74,0.92)", anima: "pulsa" },
    },
    hud: "#0a2a14",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // uma balança enorme no céu, que oscila até ficar em equilíbrio
    const a = surge(f);
    ctx.globalAlpha = a;
    const amortece = Math.exp(-f * 4);
    ctx.save();
    ctx.translate(w * 0.5, h * 0.34);
    ctx.scale(5, 5);
    balanca(ctx, 0, 10, 1, OURO, Math.sin(t * 3) * amortece * 4 + 0.001);
    ctx.restore();
    ctx.globalAlpha = 1;
  },
  decor(ctx, w, h, off, tod, t) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.8, h * 0.14, 20);
    else sol(ctx, w * 0.8, h * 0.15, 24, "#fff4d6", "rgba(255,236,180,0.45)");
    // o morro com as casinhas coloridas empilhadas
    const morro = ciclo(MORRO, tod);
    colinas(ctx, w, h - 40, off * 0.05, morro, 180, 50, 0.005, 2);
    const casas = CASAS.map((c) => ciclo(c, tod));
    repetir(w, off * 0.05, 34, (x, k) => {
      // a altura acompanha o morro (a mesma onda das colinas, na mesma velocidade)
      const X = x + 17 + off * 0.05;
      const topo = h - 40 - 180 - Math.sin(X * 0.005 + 2) * 50 - Math.sin(X * 0.005 * 2.3 + 4) * 20;
      for (let i = 0; i < 4; i++) {
        const y = h - 124 - i * 26;
        if (y < topo + 6) break;
        if (variar(k * 4 + i, 7, 5) === 0) continue;
        ctx.fillStyle = casas[variar(k * 4 + i, 13, casas.length)];
        ctx.fillRect(x + variar(k + i, 7, 6), y, 28, 22);
        ctx.fillStyle = noite > 0.3 && variar(k + i, 5, 2) ? "#ffe2a0" : "#3a4a5a";
        ctx.fillRect(x + 8 + variar(k + i, 7, 6), y + 6, 8, 8);
      }
    });
    // a rua com o núcleo da Defensoria e a fila
    ctx.fillStyle = ciclo(["#c8c0b4", "#d0c8bc", "#b4a8ac", "#2e2c32"], tod);
    ctx.fillRect(0, h - 100, w, 60);
    repetir(w, off * 0.3, 760, (x) => nucleo(ctx, x + 300, h - 50, ciclo(NUCLEO, tod), t));
    const gente = ciclo(GENTE, tod);
    repetir(w, off * 0.3, 760, (x, k) => {
      for (let i = 0; i < 6; i++) {
        const px = x + 280 - i * 26;
        const respira = Math.sin(t * 1.4 + i + k) * 0.06;
        const mao = figura(ctx, px, h - 46, 0.95, gente, { tronco: respira, bracoE: 0.1, bracoD: i % 2 ? 0.9 : -0.1 });
        if (i % 2) {
          // a pasta com os documentos
          ctx.fillStyle = "#e8d8a8";
          ctx.fillRect(mao[0] - 4, mao[1] - 2, 9, 7);
        }
      }
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#8a8690", "#26262c"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 3);
    for (let x = -(off % 40); x < w; x += 40) ctx.fillRect(x, y + 3, 2, h - y);
    ctx.fillStyle = VERDE;
    for (let x = -(off % 160); x < w; x += 160) ctx.fillRect(x + 60, y + 18, 40, 3);
  },
  coluna(ctx, w, len, variante, quebrada, tema, t) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // fuste verde com volume e frisos dourados; a balança em relevo de tempos em tempos
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, c.luz);
    g.addColorStop(0.5, c.corpo);
    g.addColorStop(1, c.sombra);
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, len);
    ctx.fillStyle = OURO;
    ctx.fillRect(x0 + 6, 0, 2, len);
    ctx.fillRect(x0 + w - 8, 0, 2, len);
    const deCima = ctx.getTransform().d < 0;
    for (let y = 70 + variante * 30; y < len - 30; y += 150) {
      ctx.save();
      ctx.translate(0, y);
      if (deCima) ctx.scale(1, -1);
      ctx.fillStyle = "rgba(255,255,255,0.16)";
      ctx.beginPath();
      ctx.arc(0, -6, 20, 0, Math.PI * 2);
      ctx.fill();
      balanca(ctx, 0, 8, 1.3, OURO, t);
      ctx.restore();
    }
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = c.luz;
      ctx.beginPath();
      ctx.moveTo(x0, 12);
      ctx.lineTo(x0 + w * 0.25, 3);
      ctx.lineTo(x0 + w * 0.5, 10);
      ctx.lineTo(x0 + w * 0.75, 1);
      ctx.lineTo(x0 + w, 8);
      ctx.lineTo(x0 + w, 14);
      ctx.lineTo(x0, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    ctx.fillStyle = OURO;
    ctx.fillRect(x0 - 5, 0, w + 10, 8);
    ctx.strokeRect(x0 - 5, 0, w + 10, 8);
    ctx.fillStyle = c.sombra;
    ctx.fillRect(x0 - 2, 8, w + 4, 8);
    ctx.strokeRect(x0 - 2, 8, w + 4, 8);
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => {
      // a balancinha pendurada na alça
      c.strokeStyle = "#5a4a2a";
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(6, -22);
      c.lineTo(10, -14);
      c.stroke();
      balanca(c, 12, -2, 0.8, OURO, t);
    });
  },
};
