// Círio de Nazaré (o segundo domingo de outubro, em Belém): a procissão com a multidão segurando a corda, a berlinda
// enfeitada de flores, a Basílica de Nazaré e o papel picado caindo; as colunas levam a corda enrolada.
import { ciclo, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { ave, figura, lua, noiteDe, repetir, sol } from "../kit";

const PAPEL = ["#ffd21a", "#ffffff", "#2a8ae8", "#e8333a", "#ff7ab0"];
// cores por hora do dia (amanhecer, dia, entardecer, noite)
const BASILICA = ["#e8dcc8", "#f2e8d4", "#e0ccc4", "#54505e"];
const BASILICA_SOMBRA = ["#c4b49e", "#ccbca6", "#b8a09e", "#34324a"];
const MANGUEIRA = ["#2f5a34", "#2a6034", "#2e3e34", "#081208"];
const GENTE = ["#3a2e3a", "#3a303c", "#342834", "#0c0a0e"];
const CORDA = "#c8a46a";

/** A Basílica de Nazaré: a fachada com as duas torres e a rosácea. */
function basilica(ctx: Ctx, x: number, base: number, cor: string, sombra: string, acesas: number) {
  ctx.fillStyle = cor;
  ctx.fillRect(x, base - 100, 120, 100);
  ctx.beginPath();
  ctx.moveTo(x - 4, base - 100);
  ctx.lineTo(x + 60, base - 130);
  ctx.lineTo(x + 124, base - 100);
  ctx.fill();
  for (const tx of [x - 26, x + 120]) {
    ctx.fillStyle = cor;
    ctx.fillRect(tx, base - 150, 26, 150);
    ctx.beginPath();
    ctx.moveTo(tx - 2, base - 150);
    ctx.lineTo(tx + 13, base - 186);
    ctx.lineTo(tx + 28, base - 150);
    ctx.fill();
    ctx.fillStyle = sombra;
    ctx.fillRect(tx + 8, base - 136, 10, 20);
  }
  ctx.fillStyle = acesas > 0.3 ? "#ffe2a0" : sombra;
  ctx.beginPath();
  ctx.arc(x + 60, base - 84, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 46, base);
  ctx.lineTo(x + 46, base - 40);
  ctx.arc(x + 60, base - 40, 14, Math.PI, 0);
  ctx.lineTo(x + 74, base);
  ctx.fill();
}

/** A berlinda: o andor de vidro dourado, enfeitado de flores, levado no meio da procissão. */
function berlinda(ctx: Ctx, x: number, base: number, t: number) {
  const bal = Math.sin(t * 1.5) * 1.5;
  ctx.fillStyle = "#e8b83a";
  ctx.fillRect(x - 24, base - 50 + bal, 48, 6);
  ctx.fillRect(x - 20, base - 92 + bal, 40, 6);
  ctx.fillStyle = "rgba(200,230,255,0.55)";
  ctx.fillRect(x - 18, base - 86 + bal, 36, 36);
  ctx.strokeStyle = "#e8b83a";
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 18, base - 86 + bal, 36, 36);
  ctx.fillStyle = "#e8b83a";
  ctx.beginPath();
  ctx.moveTo(x - 20, base - 92 + bal);
  ctx.quadraticCurveTo(x, base - 112 + bal, x + 20, base - 92 + bal);
  ctx.fill();
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = ["#ffffff", "#ff7ab0", "#ffd21a"][i % 3];
    ctx.beginPath();
    ctx.arc(x - 22 + i * 5.5, base - 46 + bal, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

export const CIRIO: Tema = {
  id: "cirio",
  nome: "Círio de Nazaré",
  descricao: "Em Belém, no segundo domingo de outubro: a procissão segurando a corda, a berlinda de flores e o papel picado.",
  grupo: "festas",
  janela: { tipo: "semana", mes: 10, diaSemana: 0, ordem: 2 },
  amostra: `linear-gradient(135deg, #ffd21a 50%, #2a8ae8 50%)`,
  onda: "sine",
  somBase: 523,
  climaFixo: "folhas",
  paleta: {
    ceu: [["#e8a8a0", "#fde2cc"], ["#6aa8dc", "#dcecf6"], ["#5a5a98", "#f0a878"], ["#0a1434", "#24386a"]],
    longe: BASILICA,
    perto: GENTE,
    chao: "#8a8a8e",
    chaoLinha: "#5a5a60",
    coluna: { corpo: "#f4ecda", sombra: "#d4c6aa", luz: "#fffaee", contorno: "#5a4a2a" },
    maleta: { corpo: "#2a8ae8", escuro: "#0e3a7a", fivela: "#ffd21a", alca: "#0e3a7a" },
    asa: { cor: "#ffffff", contorno: "#ffd21a" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: PAPEL,
    recorde: {
      cor: "#4ab0ff", traco: [9, 2, 2, 2, 2, 2], largura: 3.5,
      aviso: { texto: "NOVO RECORDE!", fonte: "800 28px Georgia, serif", corTexto: "#ffd21a", corContorno: "#0e2a5a", corFundo: "rgba(42,138,232,0.92)", anima: "pulsa" },
    },
    hud: "#0e1e3a",
    estrelas: "#ffffff",
  },
  folha(ctx, s) {
    // papel picado colorido
    ctx.fillStyle = PAPEL[Math.floor(s * PAPEL.length) % PAPEL.length];
    ctx.fillRect(-4, -3, 8, 6);
  },
  surpresa(ctx, w, h, f, t) {
    // as pombas brancas soltas no meio da procissão, subindo em revoada
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 14; i++) {
      const s = Math.min(1, Math.max(0, f * 1.4 - i * 0.03));
      const x = w * 0.45 + (i - 7) * 26 + s * ((i * 47) % 500 - 200);
      const y = h - 120 - s * h * 0.6 + Math.sin(t * 3 + i) * 8;
      ctx.globalAlpha = Math.min(1, s * 6) * (1 - Math.max(0, s - 0.85) * 6);
      ave(ctx, x, y, 1.9, Math.sin(t * 12 + i));
    }
    ctx.globalAlpha = 1;
  },
  decor(ctx, w, h, off, tod, t, tema, surpresa) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.18, h * 0.14, 20);
    else sol(ctx, w * 0.18, h * 0.15, 24, "#fff4d6", "rgba(255,236,180,0.45)");
    // a Basílica e as mangueiras da avenida
    repetir(w, off * 0.08, 1000, (x) => basilica(ctx, x + 500, h - 120, ciclo(BASILICA, tod), ciclo(BASILICA_SOMBRA, tod), noite));
    const mangueira = ciclo(MANGUEIRA, tod);
    repetir(w, off * 0.14, 130, (x, k) => {
      ctx.fillStyle = "#3a2a1e";
      ctx.fillRect(x + 20, h - 150, 7, 30);
      ctx.fillStyle = mangueira;
      for (const [dx, dy, r] of [[-4, -164, 22], [22, -176, 26], [46, -164, 22]]) {
        ctx.beginPath();
        ctx.arc(x + dx + variar(k, 7, 10), h + dy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    // a surpresa: as pombas saem do meio da procissão, atrás da multidão
    surpresa?.();
    // a multidão na corda, que avança devagar, e a berlinda
    ctx.fillStyle = ciclo(["#9a9a9e", "#a0a0a4", "#8a8690", "#26262c"], tod);
    ctx.fillRect(0, h - 120, w, 80);
    const gente = ciclo(GENTE, tod);
    const avanco = off * 0.3 + t * 6;
    repetir(w, avanco, 22, (x, k) => {
      const balanca = Math.sin(t * 2 + k * 0.5) * 0.1;
      figura(ctx, x + variar(k, 7, 8), h - 70, 0.85, gente, { tronco: balanca, bracoE: 0.8, bracoD: 1.3 });
    });
    ctx.strokeStyle = CORDA;
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 10) ctx.lineTo(x, h - 86 + Math.sin(x * 0.03 + t) * 2);
    ctx.stroke();
    repetir(w, avanco, 22, (x, k) => {
      const balanca = Math.sin(t * 2 + k * 0.5 + 1) * 0.1;
      figura(ctx, x + 11 + variar(k, 11, 8), h - 44, 1, gente, { tronco: balanca, bracoE: 1, bracoD: 1.6 });
    });
    repetir(w, avanco, 1100, (x) => berlinda(ctx, x + 600, h - 70, t));
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#7a7680", "#22222a"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 3);
    // o papel picado no asfalto
    for (let x = -(off % 13); x < w; x += 13) {
      const k = Math.round((x + off) / 13);
      ctx.fillStyle = PAPEL[variar(k, 7, PAPEL.length)];
      ctx.save();
      ctx.translate(x + 6, y + 8 + variar(k, 11, 26));
      ctx.rotate(k);
      ctx.fillRect(-2.5, -1.5, 5, 3);
      ctx.restore();
    }
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // creme, com a corda do Círio enrolada em espiral
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, c.luz);
    g.addColorStop(0.5, c.corpo);
    g.addColorStop(1, c.sombra);
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, len);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, 0, w, len);
    ctx.clip();
    ctx.strokeStyle = "#8a6a3a";
    ctx.lineWidth = 8;
    ctx.beginPath();
    for (let y = -40 + variante * 12; y < len + 40; y += 40) {
      ctx.moveTo(x0 - 4, y);
      ctx.lineTo(x0 + w + 4, y + 26);
    }
    ctx.stroke();
    ctx.strokeStyle = CORDA;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.strokeStyle = "rgba(90,60,20,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = -40 + variante * 12; y < len + 40; y += 40) {
      for (let x = x0; x < x0 + w; x += 6) {
        const yy = y + ((x - x0 + 4) / (w + 8)) * 26;
        ctx.moveTo(x, yy - 3);
        ctx.lineTo(x + 3, yy + 3);
      }
    }
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = c.corpo;
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
    // a ponta com a guirlanda de flores, como a da berlinda
    ctx.fillStyle = "#e8b83a";
    ctx.fillRect(x0 - 4, 0, w + 8, 8);
    ctx.strokeRect(x0 - 4, 0, w + 8, 8);
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = ["#ffffff", "#ff7ab0", "#ffd21a"][(i + variante) % 3];
      ctx.beginPath();
      ctx.arc(x0 + 2 + (i * (w - 4)) / 9, 12, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => {
      // a fita do Círio amarrada na alça
      c.strokeStyle = "#ffd21a";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(-4, -22);
      for (let j = 1; j <= 5; j++) c.lineTo(-4 - j * 4, -22 + j * 1.4 + Math.sin(t * 9 + j) * 2);
      c.stroke();
      c.strokeStyle = "#2a8ae8";
      c.beginPath();
      c.moveTo(4, -22);
      for (let j = 1; j <= 5; j++) c.lineTo(4 - j * 4, -20 + j * 1.6 + Math.sin(t * 9 + j + 1) * 2);
      c.stroke();
    });
  },
};
