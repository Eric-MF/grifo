// Goiás: a Chapada dos Veadeiros, com os paredões, as cachoeiras e os cristais de quartzo, o casario da Cidade de Goiás
// e o cerrado com os pés de pequi; as colunas são cristais de quartzo.
import { ciclo, colinas, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { cachoeira, chapada, lua, noiteDe, repetir, sobrados, sol, surge } from "../kit";

// cores por hora do dia (amanhecer, dia, entardecer, noite)
const ARENITO = ["#b08a6a", "#b89070", "#9a6e62", "#2a2028"];
const ARENITO_SOMBRA = ["#8a6a52", "#94705a", "#7a5450", "#1a1418"];
const MATA = ["#4a6a3a", "#466e3a", "#3e4e3a", "#0c140c"];
const CERRADO = ["#8a9a5a", "#86a05a", "#727456", "#141c12"];
const AGUA = ["#a8c8d8", "#b8e0f0", "#a8a8c8", "#3a4a68"];
const CASAS = [
  ["#f2e6d4", "#faf2e4", "#e8d4c8", "#4e4a5a"],
  ["#f0d48a", "#f6dc90", "#e0b888", "#4e4636"],
  ["#c4d8e4", "#cce0ee", "#b0aac8", "#363c56"],
];

/** Pé de pequi: tronco grosso, copa larga e os frutos verdes. */
function pequizeiro(ctx: Ctx, x: number, base: number, s: number, cor: string, fruto: string) {
  ctx.fillStyle = "#4a3a2a";
  ctx.fillRect(x - 3 * s, base - 22 * s, 6 * s, 22 * s);
  ctx.fillStyle = cor;
  for (const [dx, dy, r] of [[-14, -28, 12], [0, -34, 14], [14, -28, 12], [-6, -22, 10], [8, -22, 10]]) {
    ctx.beginPath();
    ctx.ellipse(x + dx * s, base + dy * s, r * s * 1.1, r * s * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = fruto;
  for (const [dx, dy] of [[-8, -22], [6, -20], [12, -26]]) {
    ctx.beginPath();
    ctx.arc(x + dx * s, base + dy * s, 2.6 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Ponta de cristal de quartzo (o desenho da maleta e do chão). */
function cristal(ctx: Ctx, x: number, base: number, larg: number, alt: number, inclina: number) {
  ctx.save();
  ctx.translate(x, base);
  ctx.rotate(inclina);
  ctx.fillStyle = "rgba(240,230,255,0.85)";
  ctx.strokeStyle = "#8a7aa8";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-larg / 2, 0);
  ctx.lineTo(-larg / 2, -alt * 0.7);
  ctx.lineTo(0, -alt);
  ctx.lineTo(larg / 2, -alt * 0.7);
  ctx.lineTo(larg / 2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -alt);
  ctx.lineTo(0, 0);
  ctx.stroke();
  ctx.restore();
}

export const GO: Tema = {
  id: "go",
  nome: "Goiás",
  descricao: "A Chapada dos Veadeiros com cachoeiras e cristais, a Cidade de Goiás e o cerrado com pés de pequi.",
  grupo: "estados",
  amostra: "linear-gradient(135deg, #b89070 50%, #e8e0ff 50%)",
  onda: "sine",
  somBase: 698,
  paleta: {
    ceu: [["#e8a090", "#fde0c0"], ["#4a9ee0", "#d6ecfa"], ["#5a4a96", "#f2a46a"], ["#081234", "#22386c"]],
    longe: ARENITO,
    perto: CERRADO,
    chao: "#b07a4a",
    chaoLinha: "#7a4e2a",
    coluna: { corpo: "#e6defa", sombra: "#b8a8dc", luz: "#ffffff", contorno: "#5a4a8a" },
    maleta: { corpo: "#6a8a3a", escuro: "#2e4214", fivela: "#ffd24d", alca: "#2e4214" },
    asa: { cor: "#ffffff", contorno: "#6a5aa8" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: ["#e6defa", "#ffd24d", "#ffffff"],
    recorde: {
      cor: "#a07ae8", traco: [3, 6], largura: 3.5,
      aviso: { texto: "NOVO RECORDE!", fonte: "800 28px system-ui, sans-serif", corTexto: "#ffffff", corContorno: "#2a1a5a", corFundo: "rgba(110,80,180,0.9)", anima: "pisca" },
    },
    hud: "#1e1a30",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // um cristal gigante sobe atrás da chapada e espalha o arco-íris
    const a = surge(f);
    const x = w * 0.62;
    const sobe = Math.min(1, f * 3);
    const base = h - 90 + (1 - sobe) * 160;
    ctx.globalAlpha = a * 0.55;
    ["#ff4a4a", "#ffa83a", "#ffe83a", "#4ae86a", "#3a9aff", "#8a5aff"].forEach((cor, i) => {
      const ang = -Math.PI / 2 + (i - 2.5) * 0.18 + Math.sin(t * 0.6) * 0.1;
      ctx.fillStyle = cor;
      ctx.beginPath();
      ctx.moveTo(x, base - 150);
      ctx.lineTo(x + Math.cos(ang - 0.04) * 500, base - 150 + Math.sin(ang - 0.04) * 500);
      ctx.lineTo(x + Math.cos(ang + 0.04) * 500, base - 150 + Math.sin(ang + 0.04) * 500);
      ctx.fill();
    });
    ctx.globalAlpha = a;
    ctx.fillStyle = "rgba(240,230,255,0.95)";
    ctx.strokeStyle = "#8a7aa8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 34, base);
    ctx.lineTo(x - 34, base - 110);
    ctx.lineTo(x, base - 160);
    ctx.lineTo(x + 34, base - 110);
    ctx.lineTo(x + 34, base);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, base - 160);
    ctx.lineTo(x - 8, base);
    ctx.moveTo(x, base - 160);
    ctx.lineTo(x + 14, base);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
  decor(ctx, w, h, off, tod, t, tema, surpresa) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.15, h * 0.14, 22);
    else sol(ctx, w * 0.15, h * 0.15, 24, "#fff4d6", "rgba(255,236,180,0.45)");
    const arenito = ciclo(ARENITO, tod);
    const sombra = ciclo(ARENITO_SOMBRA, tod);
    const mata = ciclo(MATA, tod);
    const agua = ciclo(AGUA, tod);
    // as chapadas com as cachoeiras
    repetir(w, off * 0.06, 1100, (x, k) => {
      chapada(ctx, x + 100, h - 100, 420, 200, arenito, sombra, mata, k * 7);
      cachoeira(ctx, x + 300, h - 296, 22, h - 120, t, agua, "#ffffff");
      chapada(ctx, x + 640, h - 100, 300, 150, arenito, sombra, mata, k * 7 + 3);
      cachoeira(ctx, x + 760, h - 246, 14, h - 120, t + 2, agua, "#ffffff");
    });
    colinas(ctx, w, h - 40, off * 0.14, ciclo(CERRADO, tod), 70, 14, 0.008, 3);
    // o casario da Cidade de Goiás
    sobrados(ctx, w, h - 84, off * 0.2, CASAS.map((c) => ciclo(c, tod)), ciclo(["#a8583a", "#b0603e", "#8a4636", "#2a1a1e"], tod), ciclo(["#f6f0e4", "#ffffff", "#ecdcd0", "#6a6878"], tod), ciclo(["#2f6a46", "#2a6a46", "#3a4a46", "#141a1a"], tod), noite, 0.9);
    // a surpresa: o cristal surge atrás do cerrado da frente
    surpresa?.();
    // o cerrado com os pés de pequi
    colinas(ctx, w, h - 40, off * 0.3, ciclo(["#9aa864", "#94aa5e", "#7a7a5a", "#161e12"], tod), 34, 8, 0.012, 2);
    const copa = ciclo(["#4a6a2a", "#466e2a", "#3e4a32", "#0a120a"], tod);
    repetir(w, off * 0.38, 170, (x, k) => {
      if (variar(k, 5, 3) === 0) return;
      pequizeiro(ctx, x + variar(k, 31, 60), h - 46, 1.4 + variar(k, 7, 3) * 0.15, copa, "#a8c83a");
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#9a6a46", "#2a1c14"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 3);
    // pontas de cristal saindo da terra
    for (let x = -(off % 130); x < w + 30; x += 130) {
      const k = Math.round((x + off) / 130);
      cristal(ctx, x + 30, y + 18, 6, 14, -0.3);
      cristal(ctx, x + 38, y + 18, 5, 10, 0.25);
      if (variar(k, 3, 2)) cristal(ctx, x + 90, y + 26, 4, 8, 0.1);
    }
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // cristal de quartzo: faces lisas em tons de lilás, com o brilho correndo
    ctx.fillStyle = c.corpo;
    ctx.fillRect(x0, 0, w, len);
    ctx.fillStyle = c.sombra;
    ctx.beginPath();
    ctx.moveTo(x0 + w * 0.62, 0);
    ctx.lineTo(x0 + w, 0);
    ctx.lineTo(x0 + w, len);
    ctx.lineTo(x0 + w * 0.62, len);
    ctx.fill();
    ctx.fillStyle = c.luz;
    ctx.fillRect(x0, 0, w * 0.24, len);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, 0, w, len);
    ctx.clip();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    for (let y = 40 + variante * 50; y < len + 60; y += 200) {
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + w, y - 46);
      ctx.lineTo(x0 + w, y - 34);
      ctx.lineTo(x0, y + 12);
      ctx.closePath();
    }
    ctx.fill();
    // inclusões e trincas internas
    ctx.strokeStyle = "rgba(90,74,138,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = 90 + variante * 30; y < len; y += 170) {
      ctx.moveTo(x0 + w * 0.3, y);
      ctx.lineTo(x0 + w * 0.55, y + 22);
      ctx.lineTo(x0 + w * 0.45, y + 40);
    }
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    ctx.beginPath();
    ctx.moveTo(x0 + w * 0.24, 0);
    ctx.lineTo(x0 + w * 0.24, len);
    ctx.moveTo(x0 + w * 0.62, 0);
    ctx.lineTo(x0 + w * 0.62, len);
    ctx.stroke();
    if (quebrada) {
      ctx.fillStyle = c.luz;
      ctx.beginPath();
      ctx.moveTo(x0, 16);
      ctx.lineTo(x0 + w * 0.24, 4);
      ctx.lineTo(x0 + w * 0.62, 12);
      ctx.lineTo(x0 + w, 2);
      ctx.lineTo(x0 + w, 18);
      ctx.lineTo(x0, 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // a ponta lapidada: faces que se encontram, sem sair da largura
    ctx.fillStyle = c.luz;
    ctx.beginPath();
    ctx.moveTo(x0, 16);
    ctx.lineTo(x0 + w * 0.3, 0);
    ctx.lineTo(x0 + w * 0.7, 0);
    ctx.lineTo(x0 + w, 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x0 + w * 0.3, 0);
    ctx.lineTo(x0 + w * 0.24, 16);
    ctx.moveTo(x0 + w * 0.7, 0);
    ctx.lineTo(x0 + w * 0.62, 16);
    ctx.stroke();
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => {
      // pequi na alça e um cristal preso na tampa
      c.fillStyle = "#3a5a1a";
      c.fillRect(6.5, -28, 1.6, 6);
      c.fillStyle = "#8ab02a";
      c.strokeStyle = "#3a5a1a";
      c.lineWidth = 1;
      c.beginPath();
      c.ellipse(7.3, -21, 5.5, 4.6, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      cristal(c, -14, -10, 5, 10, -0.2);
    });
  },
};
