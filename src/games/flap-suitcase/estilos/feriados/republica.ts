// Proclamação da República (15/11): o Rio de 1889, com o Campo de Santana, os sobrados e a bandeira nova no mastro.
import { alturaCapitel, ciclo, colinas, colunaGrega, maletaPadrao, rr, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, bandeira, cavaleiro, letreiro, lua, noiteDe, palmeira, repetir, sobrados, sol, surge } from "../kit";

const VERDE = "#009c3b";
const AMARELO = "#ffdf00";
const AZUL = "#002776";

// cores por hora do dia (amanhecer, dia, entardecer, noite) das camadas que a paleta não cobre
const SOBRADOS = [
  ["#e9c9a0", "#f3d7a8", "#d9a98a", "#4a4058"],
  ["#c9d6e3", "#d8e6f2", "#b9a9c3", "#3a4560"],
  ["#e6b3a8", "#f0bfb2", "#d48f8a", "#4f3a4a"],
  ["#f2ead8", "#faf4e6", "#e2cdb8", "#525066"],
];
const TELHADO = ["#a85a3a", "#b4613d", "#8a4a3a", "#2a2230"];
const MOLDURA = ["#f8f1e2", "#ffffff", "#eadccd", "#6a6878"];
const JANELA = ["#3a5a7a", "#2f5a80", "#3a3a5a", "#1a1a2a"];
const MORROS_PERTO = ["#987a92", "#6f93ad", "#5a4c78", "#0f1b34"];

/** Pano da bandeira republicana: o losango, o globo com as estrelas e a faixa branca. */
function panoRepublica(c: Ctx, l: number, a: number) {
  c.fillStyle = VERDE;
  c.fillRect(0, 0, l, a);
  c.fillStyle = AMARELO;
  c.beginPath();
  c.moveTo(l * 0.08, a / 2);
  c.lineTo(l / 2, a * 0.1);
  c.lineTo(l * 0.92, a / 2);
  c.lineTo(l / 2, a * 0.9);
  c.closePath();
  c.fill();
  const r = a * 0.27;
  c.fillStyle = AZUL;
  c.beginPath();
  c.arc(l / 2, a / 2, r, 0, Math.PI * 2);
  c.fill();
  c.save();
  c.beginPath();
  c.arc(l / 2, a / 2, r, 0, Math.PI * 2);
  c.clip();
  c.strokeStyle = "#ffffff";
  c.lineWidth = r * 0.22;
  c.beginPath();
  c.arc(l / 2 + r * 0.2, a / 2 + r * 2.1, r * 2.2, -Math.PI * 0.68, -Math.PI * 0.3);
  c.stroke();
  c.fillStyle = "#ffffff";
  for (let i = 0; i < 9; i++) c.fillRect(l / 2 - r * 0.7 + variar(i, 37, 14) * r * 0.1, a / 2 + variar(i, 23, 9) * r * 0.08, 1.2, 1.2);
  c.restore();
}

/** Quepe de marechal: copa azul-escura, faixa dourada e pala preta. */
function quepe(c: Ctx) {
  c.save();
  c.translate(14, -22);
  c.rotate(0.18);
  c.fillStyle = "#1b2a4a";
  c.strokeStyle = "#0b1428";
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(-8, 4);
  c.lineTo(-7, -9);
  c.lineTo(7, -9);
  c.lineTo(8, 4);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = "#c8322f";
  c.fillRect(-7, -10, 14, 2.4);
  c.fillStyle = "#e8c25a";
  c.fillRect(-8, -1, 16, 3);
  c.fillStyle = "#0b1428";
  c.beginPath();
  c.ellipse(-3, 5, 10, 2.4, -0.1, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#ffdf00";
  c.beginPath();
  c.arc(0, -4.5, 1.6, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

export const REPUBLICA: Tema = {
  id: "republica",
  nome: "Proclamação da República",
  descricao: "15 de novembro de 1889: a bandeira nova tremula sobre o Campo de Santana, no Rio.",
  grupo: "feriados",
  janela: { tipo: "fixa", dia: 15, mes: 11 },
  amostra: `linear-gradient(135deg, ${VERDE} 50%, ${AZUL} 50%)`,
  onda: "square",
  somBase: 392,
  capitel: "corintio",
  paleta: {
    ceu: [["#e9907a", "#fde0b6"], ["#4f9ee3", "#d5ecfb"], ["#4a4f98", "#f3a35c"], ["#08163a", "#22406f"]],
    longe: ["#a98aa0", "#7fa0b9", "#6a5a86", "#13213f"],
    perto: ["#3f6a4a", "#2c6e45", "#3a4552", "#0a1a20"],
    chao: "#d8c79e",
    chaoLinha: "#b29a66",
    coluna: { corpo: "#f2ecdf", sombra: "#d3c5a6", luz: "#fffbf2", contorno: "#7f6f4f" },
    maleta: { corpo: "#2f6a42", escuro: "#123a22", fivela: "#ffd23f", alca: "#123a22" },
    asa: { cor: "#ffffff", contorno: "#2a4a8a" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: [AMARELO, VERDE, "#ffffff"],
    recorde: {
      cor: "#ffd23f", traco: [14, 5], largura: 3.5,
      aviso: { texto: "NOVO RECORDE!", fonte: "800 28px Georgia, serif", corTexto: AMARELO, corContorno: "#003a14", corFundo: "rgba(0,80,32,0.9)", anima: "pulsa" },
    },
    hud: "#0f2a1a",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // o marechal a cavalo erguendo o quepe, e o "Viva a República!" no céu
    const x = atravessa(w, f, 120);
    const [mx, my] = cavaleiro(ctx, x, h - 41, 1.7, "#1b2a4a", t * 1.2, true, true);
    ctx.fillStyle = "#1b2a4a";
    ctx.fillRect(mx - 6, my - 12, 12, 9);
    ctx.fillStyle = "#e8c25a";
    ctx.fillRect(mx - 6, my - 6, 12, 2);
  },
  surpresaFrente(ctx, w, h, f) {
    ctx.globalAlpha = surge(f);
    letreiro(ctx, "VIVA A REPÚBLICA!", w / 2, h * 0.36, 40, AMARELO, "#003a14", "800 {t}px Georgia, serif");
  },
  decor(ctx, w, h, off, tod, t, tema) {
    const p = tema.paleta;
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.8, h * 0.17, 22);
    else sol(ctx, w * 0.8, h * 0.18, 24, "#fff4d6", "rgba(255,236,180,0.45)");
    // morros do Rio ao fundo
    colinas(ctx, w, h - 40, off * 0.06, ciclo(p.longe, tod), 120, 46, 0.006, 2);
    colinas(ctx, w, h - 40, off * 0.1, ciclo(MORROS_PERTO, tod), 70, 26, 0.011, 5);
    // sobrados da cidade
    const fachadas = SOBRADOS.map((cs) => ciclo(cs, tod));
    sobrados(ctx, w, h - 64, off * 0.22, fachadas, ciclo(TELHADO, tod), ciclo(MOLDURA, tod), ciclo(JANELA, tod), noite, 1.15);
    // palmeiras imperiais e o mastro com a bandeira, no Campo de Santana
    const verde = ciclo(p.perto, tod);
    repetir(w, off * 0.34, 150, (x, k) => {
      if (variar(k, 7, 4) === 0) return;
      palmeira(ctx, x + variar(k, 31, 40), h - 50, 150 + variar(k, 13, 4) * 14, verde, t, 0.02);
    });
    repetir(w, off * 0.34, 1050, (x) => {
      const mx = x + 520;
      ctx.fillStyle = "#e8e0cc";
      ctx.fillRect(mx - 2, h - 250, 4, 200);
      ctx.fillStyle = "#c9a94a";
      ctx.beginPath();
      ctx.arc(mx, h - 252, 4, 0, Math.PI * 2);
      ctx.fill();
      bandeira(ctx, mx + 2, h - 246, 74, 52, t, panoRepublica);
    });
    // a tropa a cavalo atravessando a praça
    const tropa = noite > 0.5 ? "#0a1420" : "#2a3a3a";
    repetir(w, off * 0.46 - t * 18, 420, (x, k) => {
      for (let i = 0; i < 3; i++) cavaleiro(ctx, x + i * 48 + variar(k, 11, 20), h - 41, 0.9, tropa, t + i * 0.4);
    });
    // grama baixa na beira da praça
    colinas(ctx, w, h - 40, off * 0.5, ciclo(["#5f7f45", "#4f8a45", "#4a5040", "#0e1c16"], tod), 4, 3, 0.05, 1);
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#c4ae86", "#4a4436"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 3);
    // terra batida da praça, com pedrinhas e tufos de capim
    ctx.fillStyle = "#c2ad7c";
    for (let x = -(off % 37); x < w; x += 37) ctx.fillRect(x + 5, y + 12, 6, 3);
    for (let x = -(off % 53); x < w; x += 53) ctx.fillRect(x + 24, y + 24, 9, 3);
    ctx.fillStyle = "#6a8a45";
    ctx.beginPath();
    for (let x = -(off % 90); x < w; x += 90) {
      ctx.moveTo(x + 40, y + 4);
      ctx.lineTo(x + 43, y - 4);
      ctx.lineTo(x + 45, y + 4);
      ctx.lineTo(x + 48, y - 2);
      ctx.lineTo(x + 49, y + 4);
    }
    ctx.fill();
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    colunaGrega(ctx, w, len, variante, quebrada, tema);
    const capH = alturaCapitel(variante, quebrada, tema);
    const c = tema.paleta.coluna;
    // faixas verde e amarela abaixo do capitel
    ctx.lineWidth = 1;
    ctx.strokeStyle = c.contorno;
    for (const [dy, cor] of [[12, VERDE], [20, AMARELO], [26, VERDE]] as const) {
      if (capH + dy + 6 > len) break;
      ctx.fillStyle = cor;
      ctx.fillRect(-w / 2, capH + dy, w, dy === 20 ? 4 : 6);
    }
    if (quebrada) return;
    // o globo azul no meio do capitel
    const deCima = ctx.getTransform().d < 0;
    ctx.save();
    ctx.translate(0, capH / 2 + 3);
    if (deCima) ctx.scale(1, -1);
    ctx.fillStyle = AZUL;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#e8c25a";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(1.5, 17, 18, -Math.PI * 0.68, -Math.PI * 0.32);
    ctx.stroke();
    ctx.restore();
    ctx.restore();
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => {
      // faixa verde e amarela na tampa e o quepe de marechal
      c.fillStyle = AMARELO;
      rr(c, -23, 10, 46, 2.6, 1.3);
      c.fill();
      quepe(c);
    });
  },
};
