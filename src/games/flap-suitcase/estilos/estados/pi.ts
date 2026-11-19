// Piauí: a Serra da Capivara, com os paredões de arenito, a Pedra Furada e a caatinga, e as colunas com as pinturas
// rupestres em vermelho (gente, veados e capivaras); na maleta, o chapéu e o pincel do arqueólogo.
import { ciclo, colinas, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, ave, chapada, lua, noiteDe, repetir, sol } from "../kit";

const OCRE = "#a8321e";
// cores por hora do dia (amanhecer, dia, entardecer, noite)
const ARENITO = ["#d8a07a", "#e0a87e", "#b8806e", "#2e2024"];
const ARENITO_SOMBRA = ["#b07a5a", "#b8805e", "#966054", "#1c1418"];
const CAATINGA = ["#8a8a5a", "#869056", "#6e6a54", "#14160e"];
const MATA = ["#6a7a4a", "#62824a", "#565a46", "#10160c"];

/** Figuras rupestres em vermelho: gente de braços abertos, um veado e uma capivara. `tipo` escolhe qual. */
function rupestre(ctx: Ctx, x: number, y: number, s: number, tipo: number) {
  ctx.strokeStyle = OCRE;
  ctx.fillStyle = OCRE;
  ctx.lineWidth = 1.8 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  if (tipo === 0) {
    // gente de braços para o alto
    ctx.arc(x, y - 9 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y - 7 * s);
    ctx.lineTo(x, y + 2 * s);
    ctx.moveTo(x - 6 * s, y - 10 * s);
    ctx.lineTo(x, y - 4 * s);
    ctx.lineTo(x + 6 * s, y - 10 * s);
    ctx.moveTo(x - 4 * s, y + 8 * s);
    ctx.lineTo(x, y + 2 * s);
    ctx.lineTo(x + 4 * s, y + 8 * s);
  } else if (tipo === 1) {
    // veado
    ctx.moveTo(x - 7 * s, y);
    ctx.lineTo(x + 6 * s, y);
    ctx.lineTo(x + 9 * s, y - 6 * s);
    ctx.moveTo(x + 9 * s, y - 6 * s);
    ctx.lineTo(x + 7 * s, y - 11 * s);
    ctx.moveTo(x + 9 * s, y - 6 * s);
    ctx.lineTo(x + 12 * s, y - 10 * s);
    for (const px of [-6, -3, 3, 6]) {
      ctx.moveTo(x + px * s, y);
      ctx.lineTo(x + px * s + 1 * s, y + 7 * s);
    }
  } else {
    // capivara
    ctx.ellipse(x, y, 8 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 8 * s, y - 2 * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    for (const px of [-5, 5]) {
      ctx.moveTo(x + px * s, y + 3 * s);
      ctx.lineTo(x + px * s, y + 7 * s);
    }
  }
  ctx.stroke();
}

/** A Pedra Furada: o paredão alto com o buraco em arco por onde se vê o céu. */
function pedraFurada(ctx: Ctx, x: number, base: number, cor: string, sombra: string, ceu: string) {
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.lineTo(x + 10, base - 200);
  ctx.quadraticCurveTo(x + 60, base - 230, x + 120, base - 210);
  ctx.lineTo(x + 130, base);
  ctx.fill();
  ctx.fillStyle = sombra;
  for (let y = base - 190; y < base; y += 16) ctx.fillRect(x + 8, y, 116, 2);
  ctx.fillStyle = ceu;
  ctx.beginPath();
  ctx.ellipse(x + 66, base - 150, 22, 30, 0.1, 0, Math.PI * 2);
  ctx.fill();
}

/** Chapéu de abas largas do arqueólogo e o pincel. */
function arqueologo(c: Ctx) {
  c.save();
  c.translate(-7, -21);
  c.rotate(-0.12);
  c.fillStyle = "#b89a6a";
  c.strokeStyle = "#6a5430";
  c.lineWidth = 1;
  c.beginPath();
  c.ellipse(0, 2, 15, 3.2, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(-8, 2);
  c.quadraticCurveTo(-8, -9, 0, -10);
  c.quadraticCurveTo(8, -9, 8, 2);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = "#4a3a20";
  c.fillRect(-8, -2, 16, 2.4);
  c.restore();
  // pincel
  c.save();
  c.translate(16, -16);
  c.rotate(0.6);
  c.fillStyle = "#c8322f";
  c.fillRect(-1.2, -10, 2.4, 10);
  c.fillStyle = "#c8c8d0";
  c.fillRect(-1.6, 0, 3.2, 2.4);
  c.fillStyle = "#e8d8a8";
  c.beginPath();
  c.moveTo(-2, 2.4);
  c.lineTo(0, 8);
  c.lineTo(2, 2.4);
  c.fill();
  c.restore();
}

export const PIAUI: Tema = {
  id: "pi",
  nome: "Piauí",
  descricao: "A Serra da Capivara: os paredões de arenito, a Pedra Furada e as pinturas rupestres, entre as mais antigas das Américas.",
  grupo: "estados",
  amostra: `linear-gradient(135deg, #e0a87e 50%, ${OCRE} 50%)`,
  onda: "triangle",
  somBase: 175,
  climaFixo: "limpo",
  paleta: {
    ceu: [["#f0a078", "#ffdcb0"], ["#3a9ae0", "#d4ecf8"], ["#6a4a8a", "#f4a058"], ["#0a1234", "#26346a"]],
    longe: ARENITO,
    perto: CAATINGA,
    chao: "#c8905a",
    chaoLinha: "#8a5a32",
    coluna: { corpo: "#e0aa82", sombra: "#b8825e", luz: "#f2c49e", contorno: "#5a2e1a" },
    maleta: { corpo: "#4a6a8a", escuro: "#1e3048", fivela: "#e8c43a", alca: "#1e3048" },
    asa: { cor: "#ffffff", contorno: OCRE },
    moeda: ["#ffd866", "#c08a1e"],
    particula: [OCRE, "#f2c49e", "#ffffff"],
    recorde: {
      cor: "#c8321e", traco: [5, 2, 2, 2, 2, 2], largura: 3.5,
      aviso: { texto: "RECORDE PRÉ-HISTÓRICO!", fonte: "800 24px Georgia, serif", corTexto: "#ffe8c8", corContorno: "#3a0e06", corFundo: "rgba(140,40,20,0.92)", anima: "treme" },
    },
    hud: "#2a140c",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // as pinturas rupestres ganham vida e atravessam o paredão, pulando
    const x0 = atravessa(w, f, 300);
    for (let i = 0; i < 7; i++) {
      const x = x0 - i * 46;
      const pulo = Math.abs(Math.sin(t * 5 + i)) * 14;
      rupestre(ctx, x, h * 0.58 - pulo, 2, i % 3);
    }
  },
  decor(ctx, w, h, off, tod, t, tema, surpresa) {
    const p = tema.paleta;
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.82, h * 0.14, 20);
    else sol(ctx, w * 0.82, h * 0.15, 28, "#fff6dc", "rgba(255,236,180,0.5)");
    const arenito = ciclo(ARENITO, tod);
    const sombra = ciclo(ARENITO_SOMBRA, tod);
    const mata = ciclo(MATA, tod);
    // os paredões da serra e a Pedra Furada
    repetir(w, off * 0.06, 1300, (x, k) => {
      chapada(ctx, x, h - 100, 460, 210, arenito, sombra, mata, k * 5);
      pedraFurada(ctx, x + 600, h - 100, arenito, sombra, ciclo(p.ceu.map((c) => c[1]), tod));
      chapada(ctx, x + 820, h - 100, 380, 160, arenito, sombra, mata, k * 5 + 2);
      // pinturas no paredão, de longe
      for (let i = 0; i < 4; i++) rupestre(ctx, x + 80 + i * 60, h - 190 + variar(k + i, 7, 3) * 10, 0.9, (k + i) % 3);
    });
    // a surpresa: as pinturas ganham vida no paredão, atrás dos carcarás e da caatinga
    surpresa?.();
    // os carcarás planando em círculos sobre a serra, de dia
    if (noite < 0.5) {
      ctx.fillStyle = ciclo(["#3a2a24", "#3a2a24", "#2a1e1e", "#0a0808"], tod);
      const volta = w + 200;
      for (let i = 0; i < 3; i++) {
        const a = t * 0.5 + i * 2.1;
        const cx = ((((w * (0.2 + i * 0.3) - off * 0.03) % volta) + volta) % volta) - 100;
        ave(ctx, cx + Math.cos(a) * 60, h * 0.3 + i * 20 + Math.sin(a) * 22, 1.1, Math.sin(t * 1.6 + i) * 0.35);
      }
    }
    // a caatinga: arbustos secos de galhos retorcidos
    colinas(ctx, w, h - 40, off * 0.2, ciclo(CAATINGA, tod), 60, 12, 0.01, 3);
    const galho = ciclo(["#6a5a4a", "#6a5a4a", "#5a4a44", "#14100e"], tod);
    repetir(w, off * 0.32, 70, (x, k) => {
      const bx = x + variar(k, 31, 30);
      ctx.strokeStyle = galho;
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(bx, h - 44);
      ctx.lineTo(bx, h - 64);
      for (const [a, L] of [[-0.8, 14], [0.7, 16], [-0.2, 18], [0.3, 12]]) {
        ctx.moveTo(bx, h - 58);
        ctx.lineTo(bx + Math.sin(a) * L, h - 58 - Math.cos(a) * L);
      }
      ctx.stroke();
      ctx.fillStyle = ciclo(["#8a9a5a", "#8aa05a", "#6a7056", "#14180e"], tod);
      ctx.beginPath();
      ctx.arc(bx - 8, h - 72, 6, 0, Math.PI * 2);
      ctx.arc(bx + 10, h - 70, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#b07a52", "#2e1e16"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 3);
    ctx.fillStyle = "rgba(90,50,20,0.35)";
    for (let x = -(off % 37); x < w; x += 37) {
      ctx.beginPath();
      ctx.ellipse(x + 12, y + 14, 5, 2.4, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 28, y + 26, 3, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // arenito em camadas, com as figuras rupestres pintadas (desviradas na coluna de cima)
    for (let y = 0, i = 0; y < len; y += 20, i++) {
      ctx.fillStyle = i % 3 === 1 ? c.luz : i % 3 === 2 ? c.sombra : c.corpo;
      ctx.fillRect(x0, y, w, Math.min(20, len - y));
    }
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(x0 + w - 8, 0, 8, len);
    const deCima = ctx.getTransform().d < 0;
    for (let y = 50 + variante * 25, i = 0; y < len - 20; y += 80, i++) {
      ctx.save();
      ctx.translate(0, y);
      if (deCima) ctx.scale(1, -1);
      rupestre(ctx, -14, 0, 1.3, (i + variante) % 3);
      rupestre(ctx, 14, 4, 1.1, (i + variante + 1) % 3);
      ctx.restore();
    }
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = c.luz;
      ctx.beginPath();
      ctx.moveTo(x0, 14);
      ctx.lineTo(x0 + w * 0.2, 4);
      ctx.lineTo(x0 + w * 0.45, 10);
      ctx.lineTo(x0 + w * 0.7, 1);
      ctx.lineTo(x0 + w, 8);
      ctx.lineTo(x0 + w, 16);
      ctx.lineTo(x0, 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // laje de arenito com a beirada lascada
    ctx.fillStyle = c.luz;
    ctx.fillRect(x0 - 4, 0, w + 8, 10);
    ctx.strokeRect(x0 - 4, 0, w + 8, 10);
    ctx.fillStyle = c.sombra;
    for (let x = x0; x < x0 + w; x += 14) ctx.fillRect(x + variar(x + variante, 7, 6), 7, 5, 3);
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, arqueologo);
  },
};
