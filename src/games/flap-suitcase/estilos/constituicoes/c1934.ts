// Constituição de 1934, promulgada no governo Vargas, que pôs na Constituição o voto feminino e a Justiça Eleitoral:
// a cidade art déco, a torre de rádio transmitindo, as fábricas e as eleitoras na fila da urna; na maleta, o microfone.
import { ciclo, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, figura, lua, noiteDe, repetir, sol } from "../kit";

const OURO = "#d8a83a";
const PETROLEO = "#1e5a62";
// cores por hora do dia (amanhecer, dia, entardecer, noite)
const DECO = ["#e8d8c0", "#f2e4c8", "#dcc4b8", "#4a4a5e"];
const DECO_SOMBRA = ["#c4b098", "#cebca0", "#b49e9a", "#2e2e40"];
const FABRICA = ["#8a6a5a", "#906e5a", "#76585a", "#1e1818"];
const TORRE = ["#5a5a64", "#5a5e68", "#4e4a5e", "#16161e"];
const GENTE = ["#2a2a3a", "#2a2c3a", "#262434", "#08080c"];

/** Edifício art déco escalonado, com as faixas verticais e o leque de raios no topo. */
function predioDeco(ctx: Ctx, x: number, base: number, alt: number, cor: string, sombra: string, acesas: number) {
  const l = 70;
  ctx.fillStyle = cor;
  ctx.fillRect(x, base - alt, l, alt);
  ctx.fillRect(x + 10, base - alt - 20, l - 20, 20);
  ctx.fillRect(x + 22, base - alt - 34, l - 44, 14);
  ctx.fillStyle = sombra;
  for (let i = 0; i < 4; i++) ctx.fillRect(x + 8 + i * 16, base - alt + 6, 4, alt - 12);
  // o leque de raios no alto
  ctx.fillStyle = OURO;
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const a = Math.PI + (i / 6) * Math.PI;
    ctx.moveTo(x + l / 2, base - alt - 34);
    ctx.lineTo(x + l / 2 + Math.cos(a - 0.08) * 16, base - alt - 34 + Math.sin(a - 0.08) * 16);
    ctx.lineTo(x + l / 2 + Math.cos(a + 0.08) * 16, base - alt - 34 + Math.sin(a + 0.08) * 16);
  }
  ctx.fill();
  if (acesas > 0.3) {
    ctx.fillStyle = "#ffe2a0";
    for (let y = base - alt + 10; y < base - 10; y += 12) for (let i = 0; i < 3; i++) if (variar(Math.round(base - y) * 3 + i + Math.round(alt), 7, 3)) ctx.fillRect(x + 14 + i * 16, y, 6, 6);
  }
}

/** Torre de rádio de treliça, com as ondas saindo do alto. */
function torreRadio(ctx: Ctx, x: number, base: number, cor: string, t: number) {
  const alt = 220;
  ctx.strokeStyle = cor;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x - 18, base);
  ctx.lineTo(x, base - alt);
  ctx.lineTo(x + 18, base);
  for (let y = base; y > base - alt + 10; y -= 16) {
    const l = ((y - (base - alt)) / alt) * 18;
    const l2 = ((y - 16 - (base - alt)) / alt) * 18;
    ctx.moveTo(x - l, y);
    ctx.lineTo(x + l2, y - 16);
    ctx.moveTo(x + l, y);
    ctx.lineTo(x - l2, y - 16);
  }
  ctx.stroke();
  ctx.fillStyle = "#e8333a";
  ctx.beginPath();
  ctx.arc(x, base - alt, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = OURO;
  for (let i = 0; i < 3; i++) {
    const f = (t * 0.8 + i / 3) % 1;
    ctx.globalAlpha = 1 - f;
    ctx.beginPath();
    ctx.arc(x, base - alt, 10 + f * 40, -Math.PI * 0.85, -Math.PI * 0.15);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** Urna de madeira com a fenda. */
function urna(ctx: Ctx, x: number, base: number) {
  ctx.fillStyle = "#8a5a32";
  ctx.fillRect(x - 12, base - 30, 24, 30);
  ctx.fillStyle = "#5a3a1a";
  ctx.fillRect(x - 14, base - 32, 28, 4);
  ctx.fillRect(x - 6, base - 31, 12, 1.6);
  ctx.fillStyle = OURO;
  ctx.fillRect(x - 4, base - 20, 8, 6);
}

/** Microfone de rádio art déco, de pedestal. */
function microfone(c: Ctx) {
  c.save();
  c.translate(12, -22);
  c.fillStyle = "#c8c8d0";
  c.strokeStyle = "#5a5a64";
  c.lineWidth = 1;
  c.beginPath();
  c.roundRect(-5, -12, 10, 13, 4);
  c.fill();
  c.stroke();
  c.strokeStyle = "#5a5a64";
  c.beginPath();
  for (let y = -9; y < 0; y += 3) {
    c.moveTo(-4, y);
    c.lineTo(4, y);
  }
  c.stroke();
  c.fillStyle = OURO;
  c.fillRect(-1.2, 1, 2.4, 4);
  c.fillRect(-5, 5, 10, 2);
  c.restore();
}

export const C1934: Tema = {
  id: "c1934",
  nome: "Era Vargas (1934)",
  descricao: "Promulgada em 1934, pôs na Constituição o voto feminino e a Justiça Eleitoral: o rádio, as fábricas e o art déco.",
  grupo: "constituicoes",
  amostra: `linear-gradient(135deg, ${PETROLEO} 50%, ${OURO} 50%)`,
  onda: "square",
  somBase: 311,
  paleta: {
    ceu: [["#e0a890", "#fbe2c8"], ["#6aa8cc", "#e0eef0"], ["#6a5a88", "#eeaa80"], ["#0a1430", "#26365e"]],
    longe: DECO,
    perto: FABRICA,
    chao: "#7a7470",
    chaoLinha: OURO,
    coluna: { corpo: "#ece0c8", sombra: "#c8b896", luz: "#fbf4e2", contorno: "#1e2a2e" },
    maleta: { corpo: PETROLEO, escuro: "#0a2a2e", fivela: OURO, alca: "#0a2a2e" },
    asa: { cor: "#ffffff", contorno: PETROLEO },
    moeda: ["#ffd866", "#c08a1e"],
    particula: [OURO, PETROLEO, "#ffffff"],
    recorde: {
      cor: "#1e8a92", traco: [6, 3, 6, 3, 1, 3], largura: 3.5,
      aviso: { texto: "NOVO RECORDE!", fonte: "800 28px Georgia, serif", corTexto: OURO, corContorno: "#0a1a1e", corFundo: "rgba(30,90,98,0.92)", anima: "pisca" },
    },
    hud: "#0a1a1e",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f) {
    // o dirigível Graf Zeppelin, que fazia a linha para o Brasil nos anos 1930, cruzando o céu
    const x = atravessa(w, f, 220);
    const y = h * 0.22;
    const g = ctx.createLinearGradient(0, y - 30, 0, y + 30);
    g.addColorStop(0, "#d8d4cc");
    g.addColorStop(1, "#8a8680");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, 140, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(60,60,60,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = -5; i <= 5; i++) {
      ctx.moveTo(x + i * 24, y - 27 + Math.abs(i) * 0.6);
      ctx.lineTo(x + i * 24, y + 27 - Math.abs(i) * 0.6);
    }
    ctx.stroke();
    ctx.fillStyle = "#6a6660";
    ctx.beginPath();
    ctx.moveTo(x - 130, y);
    ctx.lineTo(x - 160, y - 26);
    ctx.lineTo(x - 146, y);
    ctx.lineTo(x - 160, y + 26);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x + 20, y + 26, 40, 9);
    ctx.fillStyle = "#ffe2a0";
    for (let i = 0; i < 5; i++) ctx.fillRect(x + 24 + i * 7, y + 28, 4, 4);
  },
  decor(ctx, w, h, off, tod, t) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.7, h * 0.14, 20);
    else sol(ctx, w * 0.7, h * 0.15, 24, "#fff4d6", "rgba(255,236,180,0.45)");
    // a torre de rádio e as fábricas ao fundo
    repetir(w, off * 0.05, 900, (x) => torreRadio(ctx, x + 300, h - 120, ciclo(TORRE, tod), t));
    const fabrica = ciclo(FABRICA, tod);
    repetir(w, off * 0.08, 300, (x, k) => {
      ctx.fillStyle = fabrica;
      ctx.fillRect(x, h - 170, 160, 60);
      ctx.beginPath();
      ctx.moveTo(x, h - 170);
      for (let i = 0; i < 160; i += 32) {
        ctx.lineTo(x + i, h - 190);
        ctx.lineTo(x + i + 32, h - 170);
      }
      ctx.fill();
      ctx.fillRect(x + 120, h - 240, 14, 70);
      const f = (((t * 0.3 + k * 0.3) % 1) + 1) % 1;
      ctx.fillStyle = `rgba(220,220,225,${0.5 * (1 - f)})`;
      ctx.beginPath();
      ctx.arc(x + 127 - f * 40, h - 246 - f * 50, 8 + f * 14, 0, Math.PI * 2);
      ctx.fill();
    });
    // os prédios art déco do centro
    const deco = ciclo(DECO, tod);
    const sombra = ciclo(DECO_SOMBRA, tod);
    repetir(w, off * 0.16, 92, (x, k) => predioDeco(ctx, x, h - 80, 90 + variar(k, 7919, 5) * 22, deco, sombra, noite));
    // a fila das eleitoras diante da urna
    ctx.fillStyle = ciclo(["#8a8480", "#908a84", "#7a7280", "#22222a"], tod);
    ctx.fillRect(0, h - 80, w, 40);
    const gente = ciclo(GENTE, tod);
    repetir(w, off * 0.4, 520, (x, k) => {
      urna(ctx, x + 240, h - 44);
      for (let i = 0; i < 4; i++) {
        const px = x + 220 - i * 28;
        figura(ctx, px, h - 42, 0.95, gente, { bracoE: 0.1, bracoD: i === 0 ? 1.3 : -0.1 });
        // a saia e o chapéu cloche
        ctx.fillStyle = gente;
        ctx.beginPath();
        ctx.moveTo(px - 6, h - 61);
        ctx.lineTo(px + 6, h - 61);
        ctx.lineTo(px + 8, h - 48);
        ctx.lineTo(px - 8, h - 48);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(px, h - 81, 5.6, 3, 0, Math.PI, 0);
        ctx.fill();
        if (variar(k + i, 3, 2)) {
          ctx.fillStyle = ["#c8222e", OURO, PETROLEO][variar(k + i, 7, 3)];
          ctx.fillRect(px - 5, h - 82, 10, 1.6);
        }
      }
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    ctx.fillStyle = ciclo([tema.paleta.chao, tema.paleta.chao, "#6a6470", "#1e1e24"], tod);
    ctx.fillRect(0, y, w, h - y);
    // o piso art déco: losangos dourados sobre o cinza
    ctx.fillStyle = OURO;
    ctx.fillRect(0, y, w, 3);
    ctx.beginPath();
    for (let x = -(off % 40); x < w; x += 40) {
      ctx.moveTo(x + 20, y + 10);
      ctx.lineTo(x + 30, y + 20);
      ctx.lineTo(x + 20, y + 30);
      ctx.lineTo(x + 10, y + 20);
      ctx.closePath();
    }
    ctx.fill();
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // fuste art déco: creme, com as faixas verticais petróleo e as divisas douradas
    ctx.fillStyle = c.corpo;
    ctx.fillRect(x0, 0, w, len);
    ctx.fillStyle = PETROLEO;
    ctx.fillRect(x0 + 8, 0, 7, len);
    ctx.fillRect(x0 + w - 15, 0, 7, len);
    ctx.fillStyle = c.sombra;
    ctx.fillRect(x0 + w - 6, 0, 6, len);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, 0, w, len);
    ctx.clip();
    ctx.strokeStyle = OURO;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let y = 40 + variante * 20; y < len + 20; y += 60) {
      ctx.moveTo(x0 + 18, y);
      ctx.lineTo(0, y - 12);
      ctx.lineTo(x0 + w - 18, y);
      ctx.moveTo(x0 + 18, y + 8);
      ctx.lineTo(0, y - 4);
      ctx.lineTo(x0 + w - 18, y + 8);
    }
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = c.corpo;
      ctx.beginPath();
      ctx.moveTo(x0, 14);
      ctx.lineTo(x0 + w * 0.2, 14);
      ctx.lineTo(x0 + w * 0.2, 6);
      ctx.lineTo(x0 + w * 0.55, 6);
      ctx.lineTo(x0 + w * 0.55, 0);
      ctx.lineTo(x0 + w, 0);
      ctx.lineTo(x0 + w, 18);
      ctx.lineTo(x0, 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // capitel escalonado, em degraus
    ctx.fillStyle = c.luz;
    for (const [dy, ex] of [[0, 8], [6, 4], [12, 0]] as const) {
      ctx.fillRect(x0 - ex, dy, w + ex * 2, 6);
      ctx.strokeRect(x0 - ex, dy, w + ex * 2, 6);
    }
    ctx.fillStyle = OURO;
    ctx.fillRect(x0 - 8, 4, w + 16, 2);
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, microfone);
  },
};
