// Constituição de 1988, a Constituição Cidadã, promulgada em 5 de outubro: o Congresso Nacional, a multidão com
// bandeiras verdes e amarelas, o livro da Constituição erguido e os fogos; o livro vai também nas colunas e na maleta.
import { ciclo, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { figura, fogos, letreiro, lua, noiteDe, repetir, sol, surge } from "../kit";

const VERDE = "#009c3b";
const AMARELO = "#ffdf00";
const AZUL = "#002776";
// cores por hora do dia (amanhecer, dia, entardecer, noite)
const CONGRESSO = ["#ece4dc", "#f6f4f0", "#e6d6d4", "#5a5a72"];
const CONGRESSO_SOMBRA = ["#c8bcb8", "#d4d0cc", "#bca8b4", "#3a3a52"];
const GRAMA = ["#7a9a4a", "#6aa444", "#667848", "#121c0e"];
const MULTIDAO = ["#2a2a3a", "#2a2c3a", "#262434", "#08080c"];

/** O livro da Constituição: capa verde com as faixas e o brasão dourados. */
function livro(ctx: Ctx, x: number, y: number, s: number) {
  ctx.fillStyle = "#0e5a2e";
  ctx.strokeStyle = "#04240e";
  ctx.lineWidth = 0.8 * s;
  ctx.beginPath();
  ctx.roundRect(x - 7 * s, y - 9 * s, 14 * s, 18 * s, 1.5 * s);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f2ead8";
  ctx.fillRect(x + 6 * s, y - 8 * s, 1.6 * s, 16 * s);
  ctx.fillStyle = "#e8c43a";
  ctx.fillRect(x - 5 * s, y - 5 * s, 10 * s, 1.4 * s);
  ctx.fillRect(x - 5 * s, y + 3 * s, 10 * s, 1.4 * s);
  ctx.beginPath();
  ctx.arc(x, y - 1 * s, 2.2 * s, 0, Math.PI * 2);
  ctx.fill();
}

/** O Congresso: as duas cúpulas e as torres gêmeas, com a bandeira grande no mastro. */
function congresso(ctx: Ctx, x: number, base: number, cor: string, sombra: string, t: number) {
  ctx.fillStyle = sombra;
  ctx.fillRect(x - 10, base - 18, 300, 18);
  ctx.fillStyle = cor;
  ctx.fillRect(x - 20, base - 24, 320, 7);
  ctx.beginPath();
  ctx.moveTo(x + 10, base - 24);
  ctx.quadraticCurveTo(x + 55, base - 66, x + 100, base - 24);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 180, base - 52);
  ctx.quadraticCurveTo(x + 220, base - 14, x + 260, base - 52);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(x + 214, base - 30, 12, 6);
  ctx.fillRect(x + 122, base - 168, 18, 144);
  ctx.fillRect(x + 146, base - 168, 18, 144);
  ctx.fillRect(x + 140, base - 132, 6, 8);
  // o mastro com a bandeira nacional
  ctx.fillStyle = "#9a9aa0";
  ctx.fillRect(x + 330, base - 200, 3, 200);
  const ond = Math.sin(t * 3) * 2;
  ctx.fillStyle = VERDE;
  ctx.fillRect(x + 333, base - 198 + ond * 0.3, 54, 36);
  ctx.fillStyle = AMARELO;
  ctx.beginPath();
  ctx.moveTo(x + 337, base - 180 + ond * 0.5);
  ctx.lineTo(x + 360, base - 195 + ond * 0.5);
  ctx.lineTo(x + 383, base - 180 + ond * 0.5);
  ctx.lineTo(x + 360, base - 165 + ond * 0.5);
  ctx.fill();
  ctx.fillStyle = AZUL;
  ctx.beginPath();
  ctx.arc(x + 360, base - 180 + ond * 0.5, 8, 0, Math.PI * 2);
  ctx.fill();
}

export const C1988: Tema = {
  id: "c1988",
  nome: "Constituição Cidadã (1988)",
  descricao: "Promulgada em 5 de outubro de 1988: o Congresso Nacional, a multidão de verde e amarelo e o livro erguido.",
  grupo: "constituicoes",
  amostra: `linear-gradient(135deg, ${VERDE} 50%, ${AMARELO} 50%)`,
  onda: "triangle",
  somBase: 587,
  capitel: "dorico",
  paleta: {
    ceu: [["#f0a888", "#ffe4c4"], ["#2a8ae0", "#cfe8fa"], ["#4a4aa0", "#f6a060"], ["#06123a", "#1e3a72"]],
    longe: CONGRESSO,
    perto: MULTIDAO,
    chao: "#6aa444",
    chaoLinha: "#3a6a24",
    coluna: { corpo: "#f6f4ee", sombra: "#d0ccc4", luz: "#ffffff", contorno: AZUL },
    maleta: { corpo: VERDE, escuro: "#004a1c", fivela: AMARELO, alca: "#004a1c" },
    asa: { cor: "#ffffff", contorno: AZUL },
    moeda: ["#ffd866", "#c08a1e"],
    particula: [VERDE, AMARELO, "#ffffff", AZUL],
    recorde: {
      cor: "#00c84a", traco: [3, 2, 3, 2, 3, 6], largura: 4,
      aviso: { texto: "RECORDE CIDADÃO!", fonte: "800 28px system-ui, sans-serif", corTexto: AMARELO, corContorno: "#001a40", corFundo: "rgba(0,39,118,0.92)", anima: "treme" },
    },
    hud: "#001a40",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // chuva de papel picado verde e amarelo, e a palavra que deu nome à Constituição
    for (let i = 0; i < 50; i++) {
      const cai = ((f * 1.2 + (i * 0.173) % 1) % 1.2) / 1.2;
      const x = ((i * 97) % w) + Math.sin(t * 2 + i) * 14;
      const y = cai * (h - 40);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 3 + i);
      ctx.fillStyle = [VERDE, AMARELO, "#ffffff", AZUL][i % 4];
      ctx.fillRect(-4, -2.5, 8, 5);
      ctx.restore();
    }
  },
  surpresaFrente(ctx, w, h, f) {
    ctx.globalAlpha = surge(f);
    letreiro(ctx, "CIDADANIA", w / 2, h * 0.36, 50, AMARELO, "#002776");
  },
  decor(ctx, w, h, off, tod, t) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.12, h * 0.14, 20);
    else sol(ctx, w * 0.12, h * 0.15, 26, "#fff6dc", "rgba(255,236,180,0.45)");
    // fogos de comemoração, mais vivos à noite
    ctx.globalAlpha = 0.35 + noite * 0.65;
    fogos(ctx, w, h, t, [VERDE, AMARELO, "#ffffff", "#4a8aff"], 3, 0.08, 0.3);
    ctx.globalAlpha = 1;
    repetir(w, off * 0.1, 1200, (x) => congresso(ctx, x + 300, h - 120, ciclo(CONGRESSO, tod), ciclo(CONGRESSO_SOMBRA, tod), t));
    // o gramado da Esplanada e a multidão
    ctx.fillStyle = ciclo(GRAMA, tod);
    ctx.fillRect(0, h - 120, w, 80);
    const gente = ciclo(MULTIDAO, tod);
    repetir(w, off * 0.24, 26, (x, k) => {
      const pulo = Math.max(0, Math.sin(t * 4 + k * 0.9)) * 3;
      figura(ctx, x + variar(k, 7, 10), h - 76 - pulo, 0.7, gente, { bracoE: -2.4 - pulo * 0.1, bracoD: 2.6 });
      if (variar(k, 5, 4) === 0) {
        // bandeirinha verde e amarela no alto
        const bx = x + variar(k, 7, 10) + 10;
        ctx.fillStyle = "#5a4a3a";
        ctx.fillRect(bx, h - 130 - pulo, 1.4, 34);
        ctx.fillStyle = variar(k, 3, 2) ? VERDE : AMARELO;
        ctx.fillRect(bx + 1.4, h - 130 - pulo + Math.sin(t * 6 + k), 16, 10);
      }
    });
    // na frente, o deputado erguendo o livro da Constituição
    repetir(w, off * 0.4, 900, (x, k) => {
      const px = x + 450 + variar(k, 37, 100);
      const mao = figura(ctx, px, h - 42, 1.3, gente, { bracoE: 0.3, bracoD: Math.PI * 0.95 });
      livro(ctx, mao[0], mao[1] - 10, 1.3);
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#5a7a42", "#10180c"], tod);
    ctx.fillRect(0, y, w, h - y);
    // papel picado verde e amarelo pelo chão
    for (let x = -(off % 19); x < w; x += 19) {
      const k = Math.round((x + off) / 19);
      ctx.fillStyle = [VERDE, AMARELO, "#ffffff", AZUL][variar(k, 7, 4)];
      ctx.save();
      ctx.translate(x + 8, y + 8 + variar(k, 11, 24));
      ctx.rotate(k);
      ctx.fillRect(-2.5, -1.5, 5, 3);
      ctx.restore();
    }
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 3);
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // branco de Brasília, com as faixas verde e amarela e o artigo 1º em linhas de texto
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, c.luz);
    g.addColorStop(0.5, c.corpo);
    g.addColorStop(1, c.sombra);
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, len);
    ctx.fillStyle = VERDE;
    ctx.fillRect(x0, 0, 7, len);
    ctx.fillStyle = AMARELO;
    ctx.fillRect(x0 + 7, 0, 4, len);
    ctx.fillStyle = "rgba(0,39,118,0.25)";
    for (let y = 40 + variante * 16; y < len - 10; y += 8) {
      const l = 30 + variar(Math.round(y) + variante, 7, 4) * 6;
      ctx.fillRect(x0 + 18, y, l, 2);
    }
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = c.corpo;
      ctx.beginPath();
      ctx.moveTo(x0, 12);
      ctx.lineTo(x0 + w * 0.25, 2);
      ctx.lineTo(x0 + w * 0.5, 9);
      ctx.lineTo(x0 + w * 0.75, 0);
      ctx.lineTo(x0 + w, 8);
      ctx.lineTo(x0 + w, 14);
      ctx.lineTo(x0, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // o capitel com o livro da Constituição em relevo
    ctx.fillStyle = c.luz;
    ctx.fillRect(x0 - 6, 0, w + 12, 24);
    ctx.strokeRect(x0 - 6, 0, w + 12, 24);
    ctx.fillStyle = AZUL;
    ctx.fillRect(x0 - 6, 20, w + 12, 4);
    const deCima = ctx.getTransform().d < 0;
    ctx.save();
    ctx.translate(0, 11);
    if (deCima) ctx.scale(1, -1);
    ctx.rotate(Math.PI / 2);
    livro(ctx, 0, 0, 0.85);
    ctx.restore();
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => livro(c, 12, -22, 0.9));
  },
};
