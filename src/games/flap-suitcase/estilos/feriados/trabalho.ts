// Dia do Trabalho (1/5): um bairro fabril, com galpões de tijolo de telhado em dente de serra, chaminés soltando fumaça,
// guindastes de obra e as colunas em viga de aço rebitada.
import { ciclo, colinas, maletaPadrao, rr, variar, type Ctx, type Tema } from "../../themes";
import { figura, letreiro, lua, noiteDe, repetir, sol } from "../kit";

// cores por hora do dia (amanhecer, dia, entardecer, noite)
const PREDIOS_LONGE = ["#9a8aa0", "#8aa0b4", "#7a6488", "#161c34"];
const TIJOLO = ["#a8583a", "#b0603e", "#8a4636", "#2a1a1e"];
const TIJOLO_ESCURO = ["#7a3e2a", "#84452e", "#62322a", "#1a1014"];
const TELHADO = ["#5a6a7a", "#5f7283", "#4a4a5e", "#10141e"];
const GUINDASTE = ["#e8a020", "#f0a820", "#c8802a", "#3a2a14"];
const OPERARIO = ["#2a3440", "#2a3644", "#262a36", "#080a10"];

/** Galpão de tijolo com telhado em dente de serra e janelas altas. */
function galpao(ctx: Ctx, x: number, base: number, larg: number, tijolo: string, escuro: string, telhado: string, acesas: number) {
  const alt = 54;
  ctx.fillStyle = tijolo;
  ctx.fillRect(x, base - alt, larg, alt);
  ctx.fillStyle = telhado;
  ctx.beginPath();
  ctx.moveTo(x, base - alt);
  for (let i = 0; i < larg; i += 30) {
    ctx.lineTo(x + i, base - alt - 22);
    ctx.lineTo(x + i + 30, base - alt);
  }
  ctx.lineTo(x + larg, base - alt);
  ctx.fill();
  // vidraças dos dentes do telhado e janelas
  ctx.fillStyle = acesas > 0.3 ? "#ffd98a" : "#9ab8cc";
  ctx.globalAlpha = 0.85;
  for (let i = 0; i < larg; i += 30) {
    ctx.beginPath();
    ctx.moveTo(x + i + 2, base - alt - 2);
    ctx.lineTo(x + i + 2, base - alt - 18);
    ctx.lineTo(x + i + 9, base - alt - 11);
    ctx.lineTo(x + i + 9, base - alt - 2);
    ctx.fill();
  }
  for (let i = 10; i < larg - 16; i += 26) ctx.fillRect(x + i, base - alt + 12, 14, 22);
  ctx.globalAlpha = 1;
  ctx.fillStyle = escuro;
  for (let yy = base - alt + 6; yy < base; yy += 8) ctx.fillRect(x, yy, larg, 1.2);
  ctx.fillRect(x + larg / 2 - 12, base - 30, 24, 30);
}

/** Chaminé com a fumaça subindo em rolos. */
function chamine(ctx: Ctx, x: number, base: number, alt: number, tijolo: string, escuro: string, t: number, fumaca: string) {
  ctx.fillStyle = tijolo;
  ctx.beginPath();
  ctx.moveTo(x - 10, base);
  ctx.lineTo(x - 7, base - alt);
  ctx.lineTo(x + 7, base - alt);
  ctx.lineTo(x + 10, base);
  ctx.fill();
  ctx.fillStyle = escuro;
  ctx.fillRect(x - 9, base - alt, 18, 5);
  ctx.fillRect(x - 8, base - alt + 22, 16, 3);
  ctx.fillStyle = fumaca;
  for (let i = 0; i < 6; i++) {
    const f = (((t * 0.35 + i / 6) % 1) + 1) % 1;
    const r = 6 + f * 18;
    ctx.globalAlpha = 0.5 * (1 - f);
    ctx.beginPath();
    ctx.arc(x - f * 60 + Math.sin(f * 6 + i) * 4, base - alt - 6 - f * 90, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Guindaste de torre: treliça, lança e o gancho que sobe e desce. */
function guindaste(ctx: Ctx, x: number, base: number, cor: string, t: number, k: number) {
  const alt = 250;
  ctx.strokeStyle = cor;
  ctx.fillStyle = cor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 6, base);
  ctx.lineTo(x - 6, base - alt);
  ctx.moveTo(x + 6, base);
  ctx.lineTo(x + 6, base - alt);
  for (let y = base; y > base - alt; y -= 16) {
    ctx.moveTo(x - 6, y);
    ctx.lineTo(x + 6, y - 16);
  }
  // lança e contralança
  ctx.moveTo(x - 50, base - alt);
  ctx.lineTo(x + 170, base - alt);
  ctx.moveTo(x - 50, base - alt + 8);
  ctx.lineTo(x + 170, base - alt + 8);
  for (let xx = x - 50; xx < x + 170; xx += 14) {
    ctx.moveTo(xx, base - alt + 8);
    ctx.lineTo(xx + 7, base - alt);
    ctx.lineTo(xx + 14, base - alt + 8);
  }
  ctx.moveTo(x, base - alt - 30);
  ctx.lineTo(x + 170, base - alt);
  ctx.moveTo(x, base - alt - 30);
  ctx.lineTo(x - 50, base - alt);
  ctx.stroke();
  ctx.fillRect(x - 6, base - alt - 30, 12, 30);
  ctx.fillRect(x - 50, base - alt + 6, 20, 14);
  // carrinho e gancho com a carga
  const cx = x + 70 + Math.sin(t * 0.4 + k) * 70;
  const desce = 60 + Math.sin(t * 0.7 + k) * 40;
  ctx.fillRect(cx - 5, base - alt + 6, 10, 6);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, base - alt + 12);
  ctx.lineTo(cx, base - alt + desce);
  ctx.stroke();
  ctx.fillStyle = "#5a6a7a";
  ctx.fillRect(cx - 16, base - alt + desce, 32, 8);
}

/** Capacete de obra amarelo. */
function capacete(c: Ctx) {
  c.save();
  c.translate(-8, -21);
  c.rotate(-0.12);
  c.fillStyle = "#ffc21a";
  c.strokeStyle = "#a87a0a";
  c.lineWidth = 1;
  c.beginPath();
  c.ellipse(0, 3, 13, 2.6, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.beginPath();
  c.ellipse(0, 2, 9.5, 9, 0, Math.PI, 0);
  c.fill();
  c.stroke();
  c.fillStyle = "#ffe07a";
  c.fillRect(-1.5, -7, 3, 9);
  c.restore();
}

export const TRABALHO: Tema = {
  id: "trabalho",
  nome: "Dia do Trabalho",
  descricao: "1º de maio: galpões de tijolo, chaminés, guindastes e as colunas em viga de aço rebitada.",
  grupo: "feriados",
  janela: { tipo: "fixa", dia: 1, mes: 5 },
  amostra: "linear-gradient(135deg, #e85a1a 50%, #ffc21a 50%)",
  onda: "square",
  somBase: 247,
  paleta: {
    ceu: [["#d89a8a", "#f6d6b0"], ["#6aa6d6", "#dcecf4"], ["#6a5a8a", "#f0a060"], ["#0c1430", "#283a62"]],
    longe: PREDIOS_LONGE,
    perto: TIJOLO,
    chao: "#6a6a6a",
    chaoLinha: "#ffc21a",
    coluna: { corpo: "#d8582a", sombra: "#a8401e", luz: "#f07a40", contorno: "#5a1e0a" },
    maleta: { corpo: "#2a5a8a", escuro: "#123050", fivela: "#ffc21a", alca: "#123050" },
    asa: { cor: "#ffffff", contorno: "#2a5a8a" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: ["#ffc21a", "#d8582a", "#ffffff"],
    recorde: {
      cor: "#ff8c1a", traco: [9, 3, 2, 3], largura: 3.5,
      aviso: { texto: "NOVO RECORDE!", fonte: "900 28px system-ui, sans-serif", corTexto: "#1a1a1a", corContorno: "#ffc21a", corFundo: "rgba(255,194,26,0.92)", anima: "treme" },
    },
    hud: "#1a1e2a",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // um guindaste desce pelo alto a faixa do 1º de Maio, segura um pouco e sobe de novo
    const desce = Math.sin(Math.min(1, f * 1.25) * Math.PI);
    const y = -60 + desce * (h * 0.32);
    const x = w * 0.5 + Math.sin(t * 0.8) * 6;
    ctx.strokeStyle = "#3a3a42";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, y - 30);
    ctx.moveTo(x, y - 30);
    ctx.lineTo(x - 130, y);
    ctx.moveTo(x, y - 30);
    ctx.lineTo(x + 130, y);
    ctx.stroke();
    ctx.fillStyle = "#ffc21a";
    ctx.fillRect(x - 5, y - 36, 10, 8);
    ctx.fillStyle = "#d8582a";
    ctx.fillRect(x - 140, y, 280, 50);
    ctx.fillStyle = "#1a1a1a";
    for (let i = 0; i < 14; i++) ctx.fillRect(x - 140 + i * 20, y, 10, 5);
    letreiro(ctx, "1º DE MAIO", x, y + 29, 30, "#ffffff", "#5a1e0a");
  },
  decor(ctx, w, h, off, tod, t) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.7, h * 0.16, 20);
    else sol(ctx, w * 0.7, h * 0.17, 24, "#fff1d0", "rgba(255,230,170,0.4)");
    // cidade ao longe
    colinas(ctx, w, h - 40, off * 0.04, ciclo(["#b8a0a8", "#a8bccb", "#8a7498", "#1a2038"], tod), 70, 14, 0.008, 3);
    const longe = ciclo(PREDIOS_LONGE, tod);
    repetir(w, off * 0.08, 40, (x, k) => {
      const a = 50 + variar(k, 7919, 7) * 14;
      ctx.fillStyle = longe;
      ctx.fillRect(x, h - 80 - a, 34, a + 40);
    });
    // guindastes de obra
    const amarelo = ciclo(GUINDASTE, tod);
    repetir(w, off * 0.14, 900, (x, k) => guindaste(ctx, x + 200 + variar(k, 31, 200), h - 70, amarelo, t, k));
    // os galpões e as chaminés
    const tijolo = ciclo(TIJOLO, tod);
    const escuro = ciclo(TIJOLO_ESCURO, tod);
    const telhado = ciclo(TELHADO, tod);
    const fumaca = ciclo(["#d8d0d0", "#e8e8ec", "#b8a8b8", "#3a3a4a"], tod);
    repetir(w, off * 0.26, 420, (x, k) => {
      chamine(ctx, x + 60 + variar(k, 7, 30), h - 94, 120 + variar(k, 11, 3) * 20, tijolo, escuro, t + k, fumaca);
      galpao(ctx, x, h - 44, 200, tijolo, escuro, telhado, noite);
      chamine(ctx, x + 300, h - 70, 90, tijolo, escuro, t + k + 0.5, fumaca);
      galpao(ctx, x + 230, h - 44, 150, tijolo, escuro, telhado, noite);
    });
    // operários indo para o trabalho
    const op = ciclo(OPERARIO, tod);
    repetir(w, off * 0.46 + t * 14, 360, (x, k) => {
      for (let i = 0; i < 2; i++) {
        const passo = Math.sin(t * 5 + i * 2 + k) * 0.35;
        figura(ctx, x + i * 30 + variar(k, 13, 40), h - 41, 0.92, op, { bracoE: -passo, bracoD: passo, pernaE: passo, pernaD: -passo });
        // capacete
        ctx.fillStyle = "#ffc21a";
        ctx.beginPath();
        ctx.ellipse(x + i * 30 + variar(k, 13, 40), h - 41 - 37, 4.6, 3.4, 0, Math.PI, 0);
        ctx.fill();
      }
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    ctx.fillStyle = ciclo(["#6a6a6a", "#707070", "#5e5a60", "#26262c"], tod);
    ctx.fillRect(0, y, w, h - y);
    // faixa de segurança zebrada, em amarelo e preto
    ctx.fillStyle = "#ffc21a";
    ctx.fillRect(0, y, w, 7);
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    for (let x = -(off % 20); x < w + 20; x += 20) {
      ctx.moveTo(x, y + 7);
      ctx.lineTo(x + 7, y);
      ctx.lineTo(x + 14, y);
      ctx.lineTo(x + 7, y + 7);
    }
    ctx.fill();
    // trilho da ponte rolante
    ctx.fillStyle = "#4a4a50";
    ctx.fillRect(0, y + 20, w, 3);
    for (let x = -(off % 26); x < w; x += 26) ctx.fillRect(x, y + 17, 6, 9);
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // viga de aço em I, pintada de zarcão: abas dos lados e a alma no meio
    ctx.fillStyle = c.sombra;
    ctx.fillRect(x0, 0, w, len);
    ctx.fillStyle = c.corpo;
    ctx.fillRect(x0 + 12, 0, w - 24, len);
    ctx.fillStyle = c.luz;
    ctx.fillRect(x0, 0, 12, len);
    ctx.fillRect(x0 + w - 12, 0, 4, len);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(x0 + 12, 0, 4, len);
    ctx.fillRect(x0 + w - 16, 0, 4, len);
    // chapas de emenda com rebites
    for (let y = 40 + variante * 24; y < len - 10; y += 120) {
      ctx.fillStyle = c.luz;
      ctx.fillRect(x0 + 14, y, w - 28, 26);
      ctx.strokeStyle = c.contorno;
      ctx.lineWidth = 1;
      ctx.strokeRect(x0 + 14, y, w - 28, 26);
      ctx.fillStyle = c.contorno;
      for (let i = 0; i < 4; i++) {
        for (const dy of [6, 20]) {
          ctx.beginPath();
          ctx.arc(x0 + 22 + i * ((w - 44) / 3), y + dy, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      // ponta torta, cortada a maçarico
      ctx.fillStyle = c.corpo;
      ctx.beginPath();
      ctx.moveTo(x0, 4);
      ctx.lineTo(x0 + w, 14);
      ctx.lineTo(x0 + w, 18);
      ctx.lineTo(x0, 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2a2a2a";
      ctx.fillRect(x0, 4, w, 2);
      return;
    }
    // chapa de topo parafusada
    ctx.fillStyle = "#8a8a92";
    rr(ctx, x0 - 6, 0, w + 12, 10, 2);
    ctx.fill();
    ctx.strokeStyle = "#3a3a42";
    ctx.stroke();
    ctx.fillStyle = "#3a3a42";
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(x0 - 1 + i * ((w + 2) / 4), 5, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, capacete);
  },
};
