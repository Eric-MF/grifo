// Independência (7/9): a colina do Ipiranga, com o Museu Paulista e o jardim, o riacho, as bandeirolas verdes e amarelas
// e a cavalaria com as espadas no alto, como no quadro do Grito.
import { ciclo, colinas, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, cavaleiro, letreiro, lua, noiteDe, repetir, sol, surge } from "../kit";

const VERDE = "#0f7a3a";
const AMARELO = "#ffd21a";
// cores por hora do dia (amanhecer, dia, entardecer, noite)
const MUSEU = ["#ecd2a8", "#f4dcb0", "#dcb89a", "#4a4458"];
const MUSEU_SOMBRA = ["#c8a880", "#d0b088", "#b48e7a", "#2e2a3c"];
const JARDIM = ["#5a8a4a", "#4f9446", "#4f6448", "#10201a"];
const CERCA = ["#3a6a3a", "#2f6f3a", "#36503a", "#0a1610"];
const RIACHO = ["#7aa8c8", "#6ab0dc", "#6a6a9a", "#16264a"];
const TROPA = ["#2a2a3a", "#262a3a", "#24202e", "#08080e"];

/** Museu Paulista: corpo central com frontão, alas compridas, janelas em arco e a escadaria. */
function museu(ctx: Ctx, x: number, base: number, cor: string, sombra: string, acesas: number) {
  const L = 420;
  ctx.fillStyle = cor;
  ctx.fillRect(x, base - 70, L, 70);
  ctx.fillRect(x + L / 2 - 60, base - 100, 120, 100);
  ctx.beginPath();
  ctx.moveTo(x + L / 2 - 66, base - 100);
  ctx.lineTo(x + L / 2, base - 126);
  ctx.lineTo(x + L / 2 + 66, base - 100);
  ctx.fill();
  ctx.fillRect(x - 6, base - 74, L + 12, 6);
  ctx.fillRect(x + L / 2 - 66, base - 104, 132, 5);
  ctx.fillStyle = sombra;
  // janelas em arco nas alas, colunas no corpo central
  for (let i = 0; i < 14; i++) {
    if (i >= 5 && i <= 8) continue;
    const jx = x + 12 + i * 29;
    ctx.beginPath();
    ctx.moveTo(jx, base - 18);
    ctx.lineTo(jx, base - 50);
    ctx.arc(jx + 7, base - 50, 7, Math.PI, 0);
    ctx.lineTo(jx + 14, base - 18);
    ctx.fill();
    if (acesas > 0.3) {
      ctx.fillStyle = "#ffd98a";
      ctx.globalAlpha = acesas * 0.8;
      ctx.fillRect(jx + 2, base - 46, 10, 26);
      ctx.globalAlpha = 1;
      ctx.fillStyle = sombra;
    }
  }
  for (let i = 0; i < 6; i++) ctx.fillRect(x + L / 2 - 52 + i * 20, base - 96, 6, 78);
  ctx.fillRect(x + L / 2 - 66, base - 18, 132, 4);
  // escadaria
  for (let i = 0; i < 4; i++) ctx.fillRect(x + L / 2 - 70 - i * 10, base - 14 + i * 4, 140 + i * 20, 2);
}

/** Bicorne com pluma verde e amarela. */
function bicorne(c: Ctx, t: number) {
  c.save();
  c.translate(6, -22);
  c.rotate(0.08);
  c.fillStyle = "#141414";
  c.strokeStyle = "#c9a44a";
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(-17, 3);
  c.quadraticCurveTo(0, -16, 17, 3);
  c.quadraticCurveTo(0, -2, -17, 3);
  c.fill();
  c.stroke();
  c.fillStyle = VERDE;
  c.beginPath();
  c.arc(-2, -4, 3, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = AMARELO;
  c.beginPath();
  c.arc(-2, -4, 1.5, 0, Math.PI * 2);
  c.fill();
  // pluma
  const bal = Math.sin(t * 6) * 0.15;
  c.save();
  c.translate(-2, -6);
  c.rotate(-0.4 + bal);
  c.fillStyle = "#ffffff";
  c.beginPath();
  c.ellipse(0, -7, 3, 8, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = VERDE;
  c.beginPath();
  c.ellipse(1, -8, 1.6, 6, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
  c.restore();
}

export const INDEPENDENCIA: Tema = {
  id: "independencia",
  nome: "Independência",
  descricao: "7 de setembro: a colina do Ipiranga com o Museu Paulista, o riacho e a cavalaria com as espadas no alto.",
  grupo: "feriados",
  janela: { tipo: "fixa", dia: 7, mes: 9 },
  amostra: `linear-gradient(135deg, ${VERDE} 50%, ${AMARELO} 50%)`,
  onda: "triangle",
  somBase: 523,
  capitel: "dorico",
  paleta: {
    ceu: [["#f0a07a", "#ffe2b2"], ["#3f98e0", "#d2ecfc"], ["#3f4a92", "#f6a65a"], ["#061436", "#20406c"]],
    longe: ["#9aa0b8", "#8ab0c8", "#6a5f8a", "#121e3a"],
    perto: JARDIM,
    chao: "#c9b07a",
    chaoLinha: "#8a7444",
    coluna: { corpo: "#1a8a46", sombra: "#0f6a32", luz: "#3aae62", contorno: "#063a1a" },
    maleta: { corpo: "#e8c43a", escuro: "#8a6a10", fivela: "#0f7a3a", alca: "#5a4408" },
    asa: { cor: "#ffffff", contorno: VERDE },
    moeda: ["#ffd866", "#c08a1e"],
    particula: [AMARELO, VERDE, "#ffffff"],
    recorde: {
      cor: "#1fa34a", traco: [16, 4, 4, 4], largura: 3.5,
      aviso: { texto: "INDEPENDÊNCIA OU RECORDE!", fonte: "800 24px Georgia, serif", corTexto: AMARELO, corContorno: "#032a10", corFundo: "rgba(10,90,40,0.92)", anima: "pulsa" },
    },
    hud: "#0a2a14",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // o Grito: o príncipe a cavalo, de espada erguida, e o brado no céu
    const x = atravessa(w, f, 120);
    const [mx, my] = cavaleiro(ctx, x, h - 41, 1.8, "#1a1a24", t * 1.3, true, true);
    ctx.strokeStyle = "#e8e8f0";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(mx, my + 3);
    ctx.lineTo(mx + 8, my - 34);
    ctx.stroke();
  },
  surpresaFrente(ctx, w, h, f) {
    ctx.globalAlpha = surge(f);
    letreiro(ctx, "INDEPENDÊNCIA OU MORTE!", w / 2, h * 0.36, 36, AMARELO, "#032a10", "italic 900 {t}px Georgia, serif");
  },
  decor(ctx, w, h, off, tod, t, tema) {
    const p = tema.paleta;
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.84, h * 0.15, 20);
    else sol(ctx, w * 0.84, h * 0.16, 24, "#fff4d6", "rgba(255,236,180,0.45)");
    colinas(ctx, w, h - 40, off * 0.05, ciclo(p.longe, tod), 110, 24, 0.006, 1);
    // a colina com o Museu e o jardim geométrico na frente
    const jardim = ciclo(JARDIM, tod);
    colinas(ctx, w, h - 40, off * 0.12, jardim, 110, 10, 0.004, 3);
    const cor = ciclo(MUSEU, tod);
    const sombra = ciclo(MUSEU_SOMBRA, tod);
    repetir(w, off * 0.14, 1100, (x) => {
      museu(ctx, x + 300, h - 150, cor, sombra, noite);
      // canteiros e o espelho d'água
      ctx.fillStyle = ciclo(CERCA, tod);
      for (let i = 0; i < 6; i++) {
        const cx = x + 300 + 30 + i * 64;
        ctx.beginPath();
        ctx.moveTo(cx, h - 128);
        ctx.lineTo(cx + 26, h - 140);
        ctx.lineTo(cx + 52, h - 128);
        ctx.lineTo(cx + 26, h - 116);
        ctx.fill();
      }
      ctx.fillStyle = ciclo(RIACHO, tod);
      ctx.fillRect(x + 300 + 170, h - 134, 80, 8);
    });
    // o riacho do Ipiranga
    const agua = ciclo(RIACHO, tod);
    ctx.fillStyle = agua;
    ctx.beginPath();
    ctx.moveTo(0, h - 96);
    for (let x = 0; x <= w + 20; x += 20) ctx.lineTo(x, h - 96 + Math.sin((x + off * 0.24) * 0.008) * 6);
    for (let x = w + 20; x >= 0; x -= 20) ctx.lineTo(x, h - 84 + Math.sin((x + off * 0.24) * 0.008 + 1) * 5);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -((off * 0.24 + t * 20) % 60); x < w; x += 60) {
      ctx.moveTo(x, h - 90);
      ctx.lineTo(x + 14, h - 90);
    }
    ctx.stroke();
    colinas(ctx, w, h - 40, off * 0.3, jardim, 40, 6, 0.01, 5);
    // bandeirolas verdes e amarelas num cordão
    repetir(w, off * 0.34, 260, (x, k) => {
      const y0 = h - 190;
      ctx.strokeStyle = "#5a4a3a";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.quadraticCurveTo(x + 130, y0 + 26, x + 260, y0);
      ctx.stroke();
      for (let i = 1; i < 12; i++) {
        const f = i / 12;
        const bx = x + f * 260;
        const by = y0 + Math.sin(f * Math.PI) * 13;
        const bal = Math.sin(t * 5 + i + k) * 2;
        ctx.fillStyle = i % 2 ? VERDE : AMARELO;
        ctx.beginPath();
        ctx.moveTo(bx - 6, by);
        ctx.lineTo(bx + 6, by);
        ctx.lineTo(bx + bal, by + 14);
        ctx.fill();
      }
    });
    // a cavalaria a galope, de espada erguida
    const tropa = ciclo(TROPA, tod);
    repetir(w, off * 0.48 - t * 30, 520, (x, k) => {
      for (let i = 0; i < 4; i++) {
        const cx = x + i * 52 + variar(k + i, 7, 16);
        const [mx, my] = cavaleiro(ctx, cx, h - 41, 1.05, tropa, t * 1.4 + i * 0.3, true, true);
        ctx.strokeStyle = "#d8d8e0";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(mx, my + 2);
        ctx.lineTo(mx + 5, my - 20);
        ctx.stroke();
      }
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#b49c72", "#3e3628"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 3);
    // estrada de terra com marcas de casco
    ctx.fillStyle = "rgba(90,70,30,0.35)";
    for (let x = -(off % 34); x < w; x += 34) {
      ctx.beginPath();
      ctx.arc(x + 8, y + 14, 2.4, 0, Math.PI);
      ctx.arc(x + 24, y + 26, 2.4, 0, Math.PI);
      ctx.fill();
    }
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // fuste verde com caneluras e frisos dourados
    ctx.fillStyle = c.corpo;
    ctx.fillRect(x0, 0, w, len);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? c.sombra : c.luz;
      ctx.fillRect(x0 + (i + 0.5) * (w / 6) - w / 24, 18, w / 12, len);
    }
    ctx.fillStyle = c.sombra;
    ctx.fillRect(x0 + w - 6, 0, 6, len);
    ctx.fillStyle = AMARELO;
    for (let y = 60 + variante * 26; y < len - 10; y += 130) {
      ctx.fillRect(x0, y, w, 5);
      ctx.fillStyle = "#c9a43a";
      ctx.fillRect(x0, y + 5, w, 2);
      ctx.fillStyle = AMARELO;
    }
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = c.corpo;
      ctx.beginPath();
      ctx.moveTo(x0, 14);
      ctx.lineTo(x0 + w * 0.18, 5);
      ctx.lineTo(x0 + w * 0.42, 12);
      ctx.lineTo(x0 + w * 0.66, 1);
      ctx.lineTo(x0 + w, 9);
      ctx.lineTo(x0 + w, 18);
      ctx.lineTo(x0, 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // capitel dourado com o losango amarelo sobre o verde
    ctx.fillStyle = "#e8c43a";
    ctx.fillRect(x0 - 6, 0, w + 12, 7);
    ctx.strokeStyle = "#7a5a10";
    ctx.strokeRect(x0 - 6, 0, w + 12, 7);
    ctx.fillStyle = c.sombra;
    ctx.fillRect(x0 - 2, 7, w + 4, 13);
    ctx.fillStyle = AMARELO;
    ctx.beginPath();
    ctx.moveTo(-16, 13.5);
    ctx.lineTo(0, 8.5);
    ctx.lineTo(16, 13.5);
    ctx.lineTo(0, 18.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#1a3a8a";
    ctx.beginPath();
    ctx.arc(0, 13.5, 3.4, 0, Math.PI * 2);
    ctx.fill();
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => bicorne(c, t));
  },
};
