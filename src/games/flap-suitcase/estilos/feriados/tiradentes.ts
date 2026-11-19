// Tiradentes (21/4): Ouro Preto, com o casario nas ladeiras, a igreja barroca de duas torres, o Pico do Itacolomi
// ao fundo e a bandeira da Inconfidência Mineira tremulando.
import { ciclo, colinas, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, bandeira, boi, lua, noiteDe, repetir, sol } from "../kit";

const VERMELHO = "#c8202a";
// cores por hora do dia (amanhecer, dia, entardecer, noite)
const SERRA = ["#8a8aa8", "#7f9ab0", "#6a5a86", "#141c36"];
const MORRO = ["#5a7a4a", "#4f7f46", "#4a4f46", "#0e1a16"];
const CAL = ["#f4ead8", "#fbf6ec", "#ecd6c8", "#5a5a70"];
const TELHA = ["#b0583a", "#bb603e", "#93483a", "#2a1e26"];
const AZUL = ["#2f5a9a", "#2a5aa0", "#3a4a80", "#141c38"];
const IGREJA = ["#efe2cc", "#f6ecda", "#e2c8b8", "#4a4a62"];
const PEDRA = ["#a8906a", "#b09874", "#8a7464", "#2a2630"];
const MADEIRA = ["#6a4a32", "#6e4e34", "#5a3e30", "#1a1416"];
// fachadas das casas: caiadas, amarelas, azul-claras e rosadas
const FACHADAS = [
  CAL,
  ["#f0d498", "#f6dc9a", "#e4bc90", "#5a5048"],
  ["#c4d4e2", "#cadcec", "#b0aac8", "#3c4460"],
  ["#eec4b4", "#f4ccbc", "#dca8a4", "#56404a"],
];

/** Pano da bandeira da Inconfidência: branco, o triângulo vermelho e o lema em volta. */
function panoInconfidencia(c: Ctx, l: number, a: number) {
  c.fillStyle = "#ffffff";
  c.fillRect(0, 0, l, a);
  c.fillStyle = VERMELHO;
  c.beginPath();
  c.moveTo(l / 2, a * 0.22);
  c.lineTo(l * 0.67, a * 0.66);
  c.lineTo(l * 0.33, a * 0.66);
  c.closePath();
  c.fill();
  // o lema, em riscos curtos (LIBERTAS QUÆ SERA TAMEN)
  c.strokeStyle = VERMELHO;
  c.lineWidth = 1.1;
  c.beginPath();
  for (let i = 0; i < 9; i++) {
    const ang = Math.PI * (1.15 + (i / 8) * 0.7);
    const [cx, cy] = [l / 2 + Math.cos(ang) * a * 0.36, a * 0.5 + Math.sin(ang) * a * 0.36];
    c.moveTo(cx - 1.6, cy);
    c.lineTo(cx + 1.6, cy);
  }
  c.moveTo(l * 0.36, a * 0.82);
  c.lineTo(l * 0.64, a * 0.82);
  c.stroke();
}

/** Igreja barroca: frontão curvo, duas torres redondas com cúpula e cruz. */
function igreja(ctx: Ctx, x: number, base: number, s: number, cal: string, pedra: string, madeira: string) {
  const L = 90 * s;
  ctx.fillStyle = cal;
  ctx.fillRect(x, base - 70 * s, L, 70 * s);
  // frontão
  ctx.beginPath();
  ctx.moveTo(x + 18 * s, base - 70 * s);
  ctx.bezierCurveTo(x + 22 * s, base - 96 * s, x + L - 22 * s, base - 96 * s, x + L - 18 * s, base - 70 * s);
  ctx.fill();
  for (const tx of [x - 16 * s, x + L - 4 * s]) {
    ctx.fillStyle = cal;
    ctx.fillRect(tx, base - 100 * s, 20 * s, 100 * s);
    // coruchéu de pedra, em bulbo, com a cruz
    ctx.fillStyle = pedra;
    ctx.fillRect(tx - 2 * s, base - 102 * s, 24 * s, 4 * s);
    ctx.beginPath();
    ctx.moveTo(tx + 1 * s, base - 102 * s);
    ctx.bezierCurveTo(tx - 2 * s, base - 116 * s, tx + 8 * s, base - 116 * s, tx + 10 * s, base - 126 * s);
    ctx.bezierCurveTo(tx + 12 * s, base - 116 * s, tx + 22 * s, base - 116 * s, tx + 19 * s, base - 102 * s);
    ctx.fill();
    ctx.fillRect(tx + 9 * s, base - 136 * s, 2 * s, 10 * s);
    ctx.fillRect(tx + 5.5 * s, base - 132 * s, 9 * s, 2 * s);
    ctx.fillRect(tx, base - 100 * s, 3 * s, 100 * s);
    ctx.fillRect(tx + 17 * s, base - 100 * s, 3 * s, 100 * s);
    ctx.fillStyle = madeira;
    ctx.beginPath();
    ctx.moveTo(tx + 6 * s, base - 76 * s);
    ctx.lineTo(tx + 6 * s, base - 88 * s);
    ctx.arc(tx + 10 * s, base - 88 * s, 4 * s, Math.PI, 0);
    ctx.lineTo(tx + 14 * s, base - 76 * s);
    ctx.fill();
  }
  ctx.fillStyle = pedra;
  ctx.fillRect(x + L / 2 - 13 * s, base - 34 * s, 26 * s, 34 * s);
  ctx.fillStyle = madeira;
  ctx.fillRect(x + L / 2 - 9 * s, base - 30 * s, 18 * s, 30 * s);
  ctx.beginPath();
  ctx.arc(x + L / 2, base - 30 * s, 9 * s, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(x + 22 * s, base - 58 * s, 10 * s, 14 * s);
  ctx.fillRect(x + L - 32 * s, base - 58 * s, 10 * s, 14 * s);
  ctx.beginPath();
  ctx.arc(x + L / 2, base - 72 * s, 6 * s, 0, Math.PI * 2);
  ctx.fill();
}

/** Casario em ladeira: casinhas (a maioria caiada) que sobem o morro, com janelas de moldura colorida e telha. */
function ladeira(ctx: Ctx, x: number, base: number, fachadas: string[], azul: string, telha: string, k: number) {
  for (let i = 0; i < 7; i++) {
    const sobe = Math.sin((i / 6) * Math.PI) * 44 + i * 3;
    const hx = x + i * 30;
    const hb = base - sobe;
    const alt = 24 + variar(k * 7 + i, 11, 3) * 7;
    const tom = variar(k * 7 + i, 13, fachadas.length + 2);
    ctx.fillStyle = fachadas[tom < fachadas.length ? tom : 0];
    ctx.fillRect(hx, hb - alt, 30, alt + sobe);
    ctx.fillStyle = telha;
    ctx.beginPath();
    ctx.moveTo(hx - 3, hb - alt + 1);
    ctx.lineTo(hx + 15, hb - alt - 9);
    ctx.lineTo(hx + 33, hb - alt + 1);
    ctx.fill();
    ctx.fillStyle = azul;
    ctx.fillRect(hx + 5, hb - alt + 7, 6, 8);
    ctx.fillRect(hx + 19, hb - alt + 7, 6, 8);
    if (alt > 30) ctx.fillRect(hx + 12, hb - 12, 6, 12);
  }
}

/** Chapéu tricórnio, preto com galão dourado e o laço vermelho. */
function tricornio(c: Ctx) {
  c.save();
  c.translate(9, -22);
  c.rotate(0.12);
  c.fillStyle = "#1a1a22";
  c.strokeStyle = "#c9a44a";
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(-14, 2);
  c.quadraticCurveTo(-6, -4, 0, -2);
  c.quadraticCurveTo(6, -4, 14, 2);
  c.quadraticCurveTo(8, 6, 0, 5);
  c.quadraticCurveTo(-8, 6, -14, 2);
  c.fill();
  c.stroke();
  c.beginPath();
  c.ellipse(0, -2, 7.5, 6, 0, Math.PI, 0);
  c.fill();
  c.fillStyle = VERMELHO;
  c.beginPath();
  c.moveTo(4, -3);
  c.lineTo(8, -7);
  c.lineTo(9, -2);
  c.closePath();
  c.fill();
  c.restore();
}

export const TIRADENTES: Tema = {
  id: "tiradentes",
  nome: "Tiradentes",
  descricao: "21 de abril: as ladeiras de Ouro Preto e a bandeira da Inconfidência Mineira, \"Libertas quae sera tamen\".",
  grupo: "feriados",
  janela: { tipo: "fixa", dia: 21, mes: 4 },
  amostra: `linear-gradient(135deg, #ffffff 50%, ${VERMELHO} 50%)`,
  onda: "triangle",
  somBase: 349,
  capitel: "jonico",
  paleta: {
    ceu: [["#e8a890", "#fbe2c0"], ["#5aa2dc", "#d6ecf8"], ["#5a5a9a", "#f2aa70"], ["#0a1434", "#24386a"]],
    longe: SERRA,
    perto: MORRO,
    chao: "#8a7a6a",
    chaoLinha: "#5a4e42",
    coluna: { corpo: "#e0b050", sombra: "#b8883a", luz: "#f4cc70", contorno: "#5a3e12" },
    maleta: { corpo: "#8a5a32", escuro: "#432812", fivela: "#e8c46a", alca: "#432812" },
    asa: { cor: "#ffffff", contorno: VERMELHO },
    moeda: ["#ffd866", "#c08a1e"],
    particula: [VERMELHO, "#ffffff", "#e8c46a"],
    recorde: {
      cor: "#d4202a", traco: [12, 6], largura: 3.5,
      aviso: { texto: "LIBERTAS! NOVO RECORDE", fonte: "italic 800 26px Georgia, serif", corTexto: "#ffffff", corContorno: "#6a0a10", corFundo: "rgba(160,16,26,0.9)", anima: "treme" },
    },
    hud: "#1a1420",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // o carro de boi descendo a rua de pedra, com as rodas cantando
    // desenhado em escala 1,5 a partir da origem (x, base)
    ctx.translate(atravessa(w, f, 300), h - 42);
    ctx.scale(1.5, 1.5);
    const x = 0;
    const base = 0;
    // a junta de bois puxando, andando juntos (o de trás um pouco mais escuro)
    const passo = t * 4;
    // o cabeçalho, a vara do carro até a canga, passa por trás dos bois
    ctx.strokeStyle = "#3a2a1e";
    ctx.lineCap = "round";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 10, base - 22);
    ctx.lineTo(x + 152, base - 28);
    ctx.stroke();
    boi(ctx, x + 132, base, 1, { corpo: "#6a3a22", cara: "#efe6d8" }, t, 1, 0, passo);
    boi(ctx, x + 84, base, 1, { corpo: "#8a5a32", mancha: "#efe6d8" }, t, 2, 0, passo + 0.6);
    // a canga sobre os pescoços e o carro de rodas grandes de madeira
    ctx.fillStyle = "#5a3a1e";
    for (const cx of [x + 106, x + 154]) ctx.fillRect(cx - 8, base - 34, 16, 4);
    ctx.fillStyle = "#8a5a32";
    ctx.fillRect(x - 40, base - 44, 60, 18);
    ctx.fillStyle = "#c8a46a";
    ctx.fillRect(x - 36, base - 52, 52, 8);
    ctx.strokeStyle = "#5a3a1e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x - 10, base - 14, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = t * 3 + (i * Math.PI) / 4;
      ctx.moveTo(x - 10 + Math.cos(a) * 14, base - 14 + Math.sin(a) * 14);
      ctx.lineTo(x - 10 - Math.cos(a) * 14, base - 14 - Math.sin(a) * 14);
    }
    ctx.stroke();
  },
  decor(ctx, w, h, off, tod, t) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.2, h * 0.17, 20);
    else sol(ctx, w * 0.2, h * 0.18, 24, "#fff4d6", "rgba(255,236,180,0.45)");
    // serras ao fundo, com o Pico do Itacolomi (a pedra em cima)
    const serra = ciclo(SERRA, tod);
    colinas(ctx, w, h - 40, off * 0.05, serra, 150, 40, 0.005, 1);
    repetir(w, off * 0.05, 1400, (x) => {
      ctx.fillStyle = serra;
      ctx.beginPath();
      ctx.moveTo(x + 300, h - 170);
      ctx.lineTo(x + 420, h - 290);
      ctx.lineTo(x + 440, h - 290);
      ctx.lineTo(x + 446, h - 318);
      ctx.lineTo(x + 470, h - 318);
      ctx.lineTo(x + 472, h - 290);
      ctx.lineTo(x + 600, h - 170);
      ctx.fill();
    });
    // morros verdes com o casario e a igreja no alto
    const morro = ciclo(MORRO, tod);
    const fachadas = FACHADAS.map((c) => ciclo(c, tod));
    const azul = ciclo(AZUL, tod);
    const telha = ciclo(TELHA, tod);
    colinas(ctx, w, h - 40, off * 0.16, ciclo(["#6a8a5a", "#5f8f56", "#5a5f56", "#121e1a"], tod), 110, 30, 0.006, 6);
    repetir(w, off * 0.2, 760, (x, k) => {
      ladeira(ctx, x + 40, h - 96, fachadas, azul, telha, k);
      igreja(ctx, x + 330, h - 150, 1, ciclo(IGREJA, tod), ciclo(PEDRA, tod), ciclo(MADEIRA, tod));
      ladeira(ctx, x + 470, h - 96, fachadas, azul, telha, k + 3);
    });
    colinas(ctx, w, h - 40, off * 0.3, morro, 52, 12, 0.01, 2);
    // o mastro com a bandeira da Inconfidência
    repetir(w, off * 0.32, 980, (x) => {
      const mx = x + 640;
      ctx.fillStyle = "#4a3a2a";
      ctx.fillRect(mx - 2, h - 250, 4, 180);
      bandeira(ctx, mx + 2, h - 246, 70, 48, t, panoInconfidencia);
    });
    // casario de perto, rente à rua de pedra
    repetir(w, off * 0.44, 260, (x, k) => ladeira(ctx, x, h - 42, fachadas, azul, telha, k + 11));
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    // pé de moleque: pedras irregulares das ruas de Ouro Preto
    ctx.fillStyle = ciclo([p.chao, p.chao, "#7a6a5e", "#2e2a2a"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = ciclo(["#a8988a", "#a89888", "#958478", "#3e3a3a"], tod);
    ctx.beginPath();
    for (let fila = 0; fila < 3; fila++) {
      const yy = y + 6 + fila * 11;
      for (let x = -((off + fila * 9) % 19); x < w; x += 19) {
        const k = Math.round((x + off) / 19) + fila * 5;
        ctx.roundRect(x + 1, yy, 14 + variar(k, 7, 4), 8, 3.5);
      }
    }
    ctx.fill();
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // parede pintada de ocre, com cunhal de pedra, como os sobrados coloniais
    ctx.fillStyle = c.corpo;
    ctx.fillRect(x0, 0, w, len);
    ctx.fillStyle = "#a8906a";
    for (let y = 30; y < len; y += 26) {
      ctx.fillRect(x0, y, 10, 20);
      ctx.fillRect(x0 + w - 10, y + 13, 10, 20);
    }
    ctx.fillStyle = c.sombra;
    ctx.fillRect(x0 + w - 4, 0, 4, len);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = c.contorno;
    ctx.strokeRect(x0, 0, w, len);
    // janela azul com o triângulo da Inconfidência, desvirada na coluna de cima
    const deCima = ctx.getTransform().d < 0;
    if (len > 120) {
      ctx.save();
      ctx.translate(0, 64 + variante * 10);
      if (deCima) ctx.scale(1, -1);
      ctx.fillStyle = "#2f5a9a";
      ctx.fillRect(-14, -20, 28, 40);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-11, -17, 22, 34);
      ctx.fillStyle = VERMELHO;
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(8, 6);
      ctx.lineTo(-8, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    if (quebrada) {
      ctx.fillStyle = c.corpo;
      ctx.beginPath();
      ctx.moveTo(x0, 14);
      ctx.lineTo(x0 + w * 0.22, 4);
      ctx.lineTo(x0 + w * 0.48, 12);
      ctx.lineTo(x0 + w * 0.7, 2);
      ctx.lineTo(x0 + w, 10);
      ctx.lineTo(x0 + w, 16);
      ctx.lineTo(x0, 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // beiral de telha colonial
    ctx.fillStyle = "#b0583a";
    ctx.fillRect(x0 - 6, 0, w + 12, 10);
    ctx.strokeStyle = "#5a2a1a";
    ctx.strokeRect(x0 - 6, 0, w + 12, 10);
    ctx.beginPath();
    for (let x = x0 - 6; x < x0 + w + 6; x += 8) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 10);
    }
    ctx.stroke();
    ctx.fillStyle = "#2f5a9a";
    ctx.fillRect(x0, 10, w, 5);
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, tricornio);
  },
};
