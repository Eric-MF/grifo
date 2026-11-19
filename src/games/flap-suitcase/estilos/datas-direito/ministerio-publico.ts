// Dia Nacional do Ministério Público (14/12, art. 82 da Lei 8.625/1993): a sede da Promotoria no centro da cidade,
// as pilhas de inquéritos chegando e as colunas bordô com o brasão da República; na maleta, os autos amarrados com barbante.
import { ciclo, maletaPadrao, rr, variar, type Ctx, type Tema } from "../../themes";
import { figura, lua, noiteDe, predios, repetir, sol } from "../kit";

const BORDO = "#7a1a2a";
const OURO = "#e0b84a";
// cores por hora do dia (amanhecer, dia, entardecer, noite)
const PREDIOS = ["#a8a0a8", "#a8b0bc", "#8a7a94", "#1a1c2c"];
const SEDE = ["#e8e0d6", "#f4eee6", "#e0d0cc", "#545468"];
const SEDE_SOMBRA = ["#c4b8ac", "#cec4b8", "#b8a4a4", "#34344a"];
const GENTE = ["#2a2a36", "#2a2c38", "#262432", "#08080c"];

/** O brasão da República simplificado: a estrela de cinco pontas com o círculo azul, sobre a coroa de ramos. */
function brasao(ctx: Ctx, x: number, y: number, s: number) {
  ctx.strokeStyle = "#2a7a3a";
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.arc(x, y + 2 * s, 11 * s, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  ctx.fillStyle = OURO;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = (i % 2 ? 4.2 : 10) * s;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#1a3a8a";
  ctx.beginPath();
  ctx.arc(x, y, 4 * s, 0, Math.PI * 2);
  ctx.fill();
}

/** Pilha de autos: as capas de cartolina coloridas e o barbante. */
function autos(ctx: Ctx, x: number, base: number, n: number, k: number) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = ["#e8c87a", "#c8e0f0", "#f0b0a0", "#d8e8b0"][variar(k + i, 7, 4)];
    ctx.fillRect(x - 13 + variar(k + i, 5, 4) - 2, base - (i + 1) * 5, 26, 5);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(x - 13 + variar(k + i, 5, 4) - 2, base - (i + 1) * 5 + 4, 26, 1);
  }
  ctx.strokeStyle = "#8a6a3a";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.lineTo(x, base - n * 5);
  ctx.stroke();
}

/** A sede da Promotoria: prédio de pedra com as colunas na entrada, a bandeira e o brasão. */
function sede(ctx: Ctx, x: number, base: number, cor: string, sombra: string, acesas: number) {
  ctx.fillStyle = cor;
  ctx.fillRect(x, base - 120, 240, 120);
  ctx.fillRect(x - 8, base - 126, 256, 8);
  ctx.fillStyle = sombra;
  for (let i = 0; i < 6; i++) ctx.fillRect(x + 64 + i * 22, base - 64, 8, 64);
  ctx.fillRect(x + 56, base - 70, 128, 6);
  for (let a = 0; a < 3; a++) {
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = acesas > 0.3 && variar(a * 8 + i, 7, 3) ? "#ffe2a0" : sombra;
      ctx.fillRect(x + 10 + i * 29, base - 114 + a * 16, 14, 10);
    }
  }
  ctx.fillStyle = BORDO;
  ctx.fillRect(x + 70, base - 84, 100, 12);
  brasao(ctx, x + 120, base - 96, 0.7);
}

export const MINISTERIO_PUBLICO: Tema = {
  id: "ministerio-publico",
  nome: "Ministério Público",
  descricao: "14 de dezembro, Dia Nacional do Ministério Público: a sede da Promotoria, as pilhas de inquéritos e o brasão.",
  grupo: "datas-direito",
  janela: { tipo: "fixa", dia: 14, mes: 12 },
  amostra: `linear-gradient(135deg, ${BORDO} 50%, ${OURO} 50%)`,
  onda: "square",
  somBase: 349,
  capitel: "dorico",
  paleta: {
    ceu: [["#e8a890", "#fde2c4"], ["#5a9ad8", "#d8ecf8"], ["#5a5a98", "#f2a874"], ["#081434", "#22386a"]],
    longe: PREDIOS,
    perto: GENTE,
    chao: "#8a8a90",
    chaoLinha: "#5a5a62",
    coluna: { corpo: "#8a2a3a", sombra: "#5e1626", luz: "#a8445a", contorno: "#2a0a12" },
    maleta: { corpo: "#3a3a48", escuro: "#16161e", fivela: OURO, alca: "#16161e" },
    asa: { cor: "#ffffff", contorno: BORDO },
    moeda: ["#ffd866", "#c08a1e"],
    particula: [BORDO, OURO, "#ffffff"],
    recorde: {
      cor: "#c83a5a", traco: [6, 6, 18, 6], largura: 3.5,
      aviso: { texto: "DENÚNCIA RECEBIDA: NOVO RECORDE!", fonte: "800 20px system-ui, sans-serif", corTexto: "#ffffff", corContorno: "#2a0a12", corFundo: "rgba(122,26,42,0.92)", anima: "treme" },
    },
    hud: "#1a0a10",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // a pilha de inquéritos desaba e as folhas saem voando pela rua
    for (let i = 0; i < 26; i++) {
      const s = Math.min(1, Math.max(0, f * 1.6 - (i % 8) * 0.05));
      const x = w * 0.2 + s * (w * 0.9) * (0.4 + ((i * 37) % 60) / 100) + Math.sin(t * 2 + i) * 12;
      const y = h - 60 - Math.sin(s * Math.PI) * (80 + ((i * 53) % 160));
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(s * 8 + i);
      ctx.fillStyle = ["#f8f4ec", "#e8c87a", "#c8e0f0", "#f0b0a0"][i % 4];
      ctx.fillRect(-9, -6, 18, 12);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(-6, -3, 12, 1);
      ctx.fillRect(-6, 0, 9, 1);
      ctx.restore();
    }
  },
  decor(ctx, w, h, off, tod, t) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.84, h * 0.14, 20);
    else sol(ctx, w * 0.84, h * 0.15, 24, "#fff4d6", "rgba(255,236,180,0.45)");
    predios(ctx, w, h - 100, off * 0.05, ciclo(PREDIOS, tod), "#ffe2a0", noite, 170, 46);
    repetir(w, off * 0.12, 900, (x) => sede(ctx, x + 300, h - 90, ciclo(SEDE, tod), ciclo(SEDE_SOMBRA, tod), noite));
    // a calçada com os servidores levando os autos
    ctx.fillStyle = ciclo(["#b0aaa4", "#b8b2ac", "#a0969c", "#2a2a30"], tod);
    ctx.fillRect(0, h - 90, w, 50);
    const gente = ciclo(GENTE, tod);
    repetir(w, off * 0.36 + t * 12, 300, (x, k) => {
      const px = x + variar(k, 31, 120);
      const passo = Math.sin(t * 5 + k) * 0.3;
      const mao = figura(ctx, px, h - 44, 1, gente, { bracoE: -passo, bracoD: 1.2, pernaE: passo, pernaD: -passo });
      autos(ctx, mao[0] + 4, mao[1] + 3, 3 + variar(k, 7, 3), k);
    });
    // as pilhas de inquéritos na porta
    repetir(w, off * 0.4, 260, (x, k) => autos(ctx, x + variar(k, 13, 60), h - 44, 4 + variar(k, 7, 5), k * 3));
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#7a7680", "#22222a"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 3);
    for (let x = -(off % 50); x < w; x += 50) ctx.fillRect(x, y + 3, 2, h - y);
    ctx.fillStyle = BORDO;
    ctx.fillRect(0, y + 3, w, 2);
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // fuste bordô com caneluras, frisos dourados e o brasão em relevo
    ctx.fillStyle = c.corpo;
    ctx.fillRect(x0, 0, w, len);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? c.sombra : c.luz;
      ctx.fillRect(x0 + (i + 0.5) * (w / 6) - w / 24, 22, w / 12, len);
    }
    ctx.fillStyle = c.sombra;
    ctx.fillRect(x0 + w - 6, 0, 6, len);
    const deCima = ctx.getTransform().d < 0;
    for (let y = 90 + variante * 30; y < len - 30; y += 170) {
      ctx.fillStyle = c.sombra;
      ctx.beginPath();
      ctx.arc(0, y, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(0, y);
      if (deCima) ctx.scale(1, -1);
      brasao(ctx, 0, 0, 1.1);
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
    // capitel dórico dourado
    ctx.fillStyle = OURO;
    ctx.fillRect(x0 - 6, 0, w + 12, 8);
    ctx.strokeRect(x0 - 6, 0, w + 12, 8);
    ctx.fillStyle = c.luz;
    ctx.beginPath();
    ctx.moveTo(x0 - 2, 8);
    ctx.lineTo(x0 + w + 2, 8);
    ctx.lineTo(x0 + w, 20);
    ctx.lineTo(x0, 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => {
      // os autos amarrados com barbante, em cima da tampa
      for (let i = 0; i < 3; i++) {
        c.fillStyle = ["#e8c87a", "#c8e0f0", "#f0b0a0"][i];
        rr(c, -18 + i * 1.5, -21 - i * 4, 24, 4, 1);
        c.fill();
      }
      c.strokeStyle = "#8a6a3a";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(-6, -15);
      c.lineTo(-6, -31);
      c.stroke();
    });
  },
};
