// Pampa: as coxilhas a perder de vista, o umbu solitário, o gado pastando, o aramado, a estância com o galpão
// e o vento minuano levando o capim; as colunas são de taipa de pedra, e na maleta vai o poncho dobrado.
import { ciclo, colinas, maletaPadrao, rr, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, boi, letreiro, lua, noiteDe, repetir, sol, surge } from "../kit";

// cores por hora do dia (amanhecer, dia, entardecer, noite)
const COXILHA = [
  ["#9ab08a", "#8ab884", "#7a8a8a", "#16222a"],
  ["#7aa06a", "#6aaa5e", "#64785c", "#101c14"],
  ["#5a8a4a", "#4f9446", "#4e6448", "#0c180e"],
];
const UMBU = ["#3a5a2a", "#36602a", "#34442e", "#0a1208"];
// as pelagens do gado, por hora do dia: o hereford (vermelho de cara branca), o angus preto e o crioulo baio
const GADO = [
  { corpo: ["#8a4a2a", "#9a4e2a", "#7a4232", "#1a100c"], cara: ["#efe6d8", "#f4ece0", "#d8c8c0", "#3a3634"] },
  { corpo: ["#2a2420", "#2a2420", "#262022", "#08060a"] },
  { corpo: ["#b8946a", "#c49e6e", "#a08068", "#221c16"], mancha: ["#f2ece0", "#f6f0e4", "#dcd0c8", "#3a3634"] },
];
const ESTANCIA = ["#f0e6d8", "#f8f2e8", "#e6d4cc", "#4e4c5a"];

/** Umbu: a árvore baixa e larga, de tronco grosso e copa enorme. */
function umbu(ctx: Ctx, x: number, base: number, s: number, copa: string) {
  ctx.fillStyle = "#4a3a2a";
  ctx.beginPath();
  ctx.moveTo(x - 16 * s, base);
  ctx.quadraticCurveTo(x - 6 * s, base - 20 * s, x - 10 * s, base - 40 * s);
  ctx.lineTo(x + 10 * s, base - 40 * s);
  ctx.quadraticCurveTo(x + 6 * s, base - 20 * s, x + 18 * s, base);
  ctx.fill();
  ctx.fillStyle = copa;
  for (const [dx, dy, rx, ry] of [[-34, -50, 30, 20], [0, -62, 40, 26], [34, -50, 30, 20], [-16, -40, 22, 14], [18, -40, 22, 14]]) {
    ctx.beginPath();
    ctx.ellipse(x + dx * s, base + dy * s, rx * s, ry * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Poncho dobrado sobre a tampa, com as listras. */
function poncho(c: Ctx) {
  c.fillStyle = "#6a2a2a";
  rr(c, -20, -21, 40, 7, 3);
  c.fill();
  c.fillStyle = "#e8c47a";
  c.fillRect(-20, -19, 40, 1.4);
  c.fillRect(-20, -16.4, 40, 1.4);
  c.strokeStyle = "#e8c47a";
  c.lineWidth = 1;
  c.beginPath();
  for (let x = -18; x <= 18; x += 3) {
    c.moveTo(x, -14);
    c.lineTo(x - 1, -11);
  }
  c.stroke();
}

/** Onde está o quero-quero do voo rasante da surpresa. */
function voo(w: number, h: number, f: number): [number, number] {
  return [atravessa(w, f, 180), h - 130 - Math.sin(f * Math.PI) * 100];
}

export const PAMPA: Tema = {
  id: "pampa",
  nome: "Pampa",
  descricao: "As coxilhas a perder de vista, o umbu solitário, o gado, o aramado e o vento minuano levando o capim.",
  grupo: "biomas",
  amostra: "linear-gradient(135deg, #6aaa5e 50%, #6a2a2a 50%)",
  onda: "triangle",
  somBase: 196,
  climaFixo: "folhas",
  paleta: {
    ceu: [["#d8a8a8", "#fbe2d0"], ["#5a9ad8", "#dcecf6"], ["#6a5a90", "#f0aa7a"], ["#0a1434", "#24386a"]],
    longe: COXILHA[0],
    perto: COXILHA[2],
    chao: "#5f8a44",
    chaoLinha: "#3a5a2a",
    coluna: { corpo: "#9a948a", sombra: "#726c64", luz: "#bab4aa", contorno: "#2a2622" },
    maleta: { corpo: "#8a5a32", escuro: "#432812", fivela: "#d8d8e0", alca: "#432812" },
    asa: { cor: "#ffffff", contorno: "#6a2a2a" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: ["#c8d88a", "#ffffff", "#6a2a2a"],
    recorde: {
      cor: "#c8d84a", traco: [13, 3, 3, 3, 3, 3], largura: 3.5,
      aviso: { texto: "TCHÊ, NOVO RECORDE!", fonte: "800 26px Georgia, serif", corTexto: "#ffffff", corContorno: "#2a0a0a", corFundo: "rgba(106,42,42,0.92)", anima: "treme" },
    },
    hud: "#141a10",
    estrelas: "#ffffff",
  },
  folha(ctx, s) {
    // fiapos de capim levados pelo minuano
    ctx.strokeStyle = s > 0.5 ? "rgba(200,216,138,0.85)" : "rgba(170,190,110,0.85)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.quadraticCurveTo(0, -2 - s * 2, 6, 0);
    ctx.stroke();
  },
  surpresa(ctx, w, h, f, t) {
    // o quero-quero dá um voo rasante, gritando o próprio nome (desenhado em escala 1,8)
    const [px, py] = voo(w, h, f);
    ctx.translate(px, py);
    ctx.scale(1.8, 1.8);
    const x = 0;
    const y = 0;
    const bate = Math.sin(t * 14);
    ctx.fillStyle = "#4a4a52";
    for (const l of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x - 2, y);
      ctx.lineTo(x - 18, y - l * 4 - bate * 18 * l);
      ctx.lineTo(x - 26, y - l * 2 - bate * 14 * l);
      ctx.lineTo(x + 6, y);
      ctx.fill();
    }
    ctx.fillStyle = "#d8d4cc";
    ctx.beginPath();
    ctx.ellipse(x, y, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(x + 12, y - 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d8303a";
    ctx.fillRect(x + 15, y - 2, 6, 2);
  },
  surpresaFrente(ctx, w, h, f) {
    const [x, y] = voo(w, h, f);
    ctx.globalAlpha = surge(f);
    letreiro(ctx, "QUERO-QUERO!", x + 16, y - 46, 24, "#ffffff", "#2a2a32");
  },
  decor(ctx, w, h, off, tod, t) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.68, h * 0.13, 20);
    else sol(ctx, w * 0.68, h * 0.14, 24, "#fff4d6", "rgba(255,236,180,0.45)");
    // nuvens correndo com o vento
    ctx.fillStyle = ciclo(["#fff0ea", "#ffffff", "#f6dcd4", "#3a4468"], tod);
    ctx.globalAlpha = 0.8;
    repetir(w, off * 0.03 + t * 18, 360, (x, k) => {
      const y = h * (0.16 + variar(k, 7, 3) * 0.05);
      for (const [dx, r] of [[0, 18], [22, 24], [48, 18]]) {
        ctx.beginPath();
        ctx.arc(x + dx, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
    // as coxilhas, uma atrás da outra, e a estância lá longe
    colinas(ctx, w, h - 40, off * 0.04, ciclo(COXILHA[0], tod), 120, 22, 0.004, 1);
    repetir(w, off * 0.05, 1500, (x) => {
      const ex = x + 900;
      ctx.fillStyle = ciclo(ESTANCIA, tod);
      ctx.fillRect(ex, h - 180, 60, 22);
      ctx.fillRect(ex + 70, h - 176, 50, 18);
      ctx.fillStyle = ciclo(["#a8483a", "#b4503e", "#8a3e3a", "#2a1a20"], tod);
      ctx.beginPath();
      ctx.moveTo(ex - 4, h - 180);
      ctx.lineTo(ex + 30, h - 194);
      ctx.lineTo(ex + 64, h - 180);
      ctx.fill();
      ctx.fillRect(ex + 68, h - 180, 54, 4);
    });
    colinas(ctx, w, h - 40, off * 0.1, ciclo(COXILHA[1], tod), 80, 18, 0.006, 3);
    repetir(w, off * 0.14, 1100, (x) => umbu(ctx, x + 500, h - 108, 1.3, ciclo(UMBU, tod)));
    // o gado pastando e o aramado
    const pelagens = GADO.map((g) => ({ corpo: ciclo(g.corpo, tod), cara: g.cara && ciclo(g.cara, tod), mancha: g.mancha && ciclo(g.mancha, tod) }));
    repetir(w, off * 0.18, 320, (x, k) => {
      for (let i = 0; i < 3; i++) {
        const j = k * 3 + i;
        // uns pastam (a cabeça desce e sobe devagar), outros olham em volta
        const pasta = Math.max(0, Math.sin(t * 0.5 + j * 1.9)) ** 0.5;
        boi(ctx, x + i * 50 + variar(j, 13, 20), h - 94 + variar(j, 7, 3) * 4, 0.95, pelagens[variar(j, 17, 3)]!, t, j, pasta);
      }
    });
    colinas(ctx, w, h - 40, off * 0.3, ciclo(COXILHA[2], tod), 40, 10, 0.009, 5);
    ctx.strokeStyle = ciclo(["#5a4a3a", "#5a4a3a", "#4a3a34", "#14100e"], tod);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const yy of [h - 64, h - 56, h - 48]) {
      ctx.moveTo(0, yy);
      ctx.lineTo(w, yy);
    }
    for (let x = -((off * 0.36) % 60); x < w; x += 60) {
      ctx.moveTo(x, h - 68);
      ctx.lineTo(x, h - 42);
    }
    ctx.stroke();
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#526a3e", "#10180c"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 3);
    // o capim deitado pelo vento
    ctx.strokeStyle = "#7aaa5a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -(off % 13); x < w; x += 13) {
      ctx.moveTo(x, y + 14);
      ctx.quadraticCurveTo(x + 2, y + 8, x + 8, y + 6);
      ctx.moveTo(x + 6, y + 30);
      ctx.quadraticCurveTo(x + 8, y + 24, x + 14, y + 22);
    }
    ctx.stroke();
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // taipa de pedra: pedras empilhadas a seco, de tamanhos diferentes
    ctx.fillStyle = c.sombra;
    ctx.fillRect(x0, 0, w, len);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, 0, w, len);
    ctx.clip();
    for (let y = 0, fila = 0; y < len; fila++) {
      const altFila = 14 + variar(fila + variante, 7, 3) * 4;
      let x = x0 - variar(fila, 13, 10);
      let i = 0;
      while (x < x0 + w) {
        const l = 16 + variar(fila * 5 + i + variante, 11, 4) * 5;
        ctx.fillStyle = [c.corpo, c.luz, c.corpo, "#a8a090"][variar(fila * 3 + i, 7, 4)];
        ctx.beginPath();
        ctx.roundRect(x + 1, y + 1, l - 2, altFila - 2, 5);
        ctx.fill();
        x += l;
        i++;
      }
      y += altFila;
    }
    ctx.fillStyle = "rgba(90,130,60,0.4)";
    for (let y = 40 + variante * 30; y < len; y += 110) ctx.fillRect(x0, y, 10, 4);
    ctx.restore();
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = c.luz;
      ctx.beginPath();
      ctx.moveTo(x0, 16);
      ctx.lineTo(x0, 6);
      ctx.lineTo(x0 + w * 0.3, 6);
      ctx.lineTo(x0 + w * 0.3, 0);
      ctx.lineTo(x0 + w * 0.6, 0);
      ctx.lineTo(x0 + w * 0.6, 8);
      ctx.lineTo(x0 + w, 8);
      ctx.lineTo(x0 + w, 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // a capa da taipa: lajes chatas, com o capim nascendo entre elas
    ctx.fillStyle = c.luz;
    ctx.fillRect(x0 - 4, 0, w + 8, 9);
    ctx.strokeRect(x0 - 4, 0, w + 8, 9);
    ctx.strokeStyle = "#5a8a3a";
    ctx.beginPath();
    for (let x = x0; x < x0 + w; x += 9) {
      ctx.moveTo(x + 3, 10);
      ctx.lineTo(x + 5, 15);
    }
    ctx.stroke();
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, poncho);
  },
};
