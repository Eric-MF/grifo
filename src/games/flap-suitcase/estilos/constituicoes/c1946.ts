// Constituição de 1946, promulgada na volta à democracia, quando o Rio ainda era a capital: o Palácio Tiradentes,
// onde se reuniu a Constituinte, os bondes, os prédios dos anos 1950 em tons pastel e os cartazes de eleição.
import { alturaCapitel, ciclo, colinas, colunaGrega, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, lua, noiteDe, palmeira, repetir, sol } from "../kit";

const PASTEIS = ["#7ad0c8", "#ff9a8a", "#ffd87a", "#a8c8f0"];
// cores por hora do dia (amanhecer, dia, entardecer, noite)
const MORRO = ["#8aa0b0", "#7faac0", "#6a6a90", "#141e36"];
const PALACIO = ["#f2ead8", "#faf4e4", "#e8d8cc", "#5a5868"];
const PALACIO_SOMBRA = ["#d0c2a6", "#d8ccb2", "#c4b0a8", "#3a3a4c"];
const BONDE = ["#d8a83a", "#e0b03a", "#c08a3e", "#3a2e18"];
const PALMEIRA = ["#3a5a3a", "#2f6038", "#344638", "#0a140e"];

/** Palácio Tiradentes: o pórtico de colunas, o frontão e a cúpula com a lanterna. */
function palacioTiradentes(ctx: Ctx, x: number, base: number, cor: string, sombra: string, acesas: number) {
  ctx.fillStyle = cor;
  ctx.fillRect(x, base - 80, 240, 80);
  ctx.beginPath();
  ctx.ellipse(x + 120, base - 96, 46, 40, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(x + 72, base - 98, 96, 18);
  ctx.fillRect(x + 114, base - 150, 12, 16);
  ctx.beginPath();
  ctx.moveTo(x + 60, base - 80);
  ctx.lineTo(x + 120, base - 100);
  ctx.lineTo(x + 180, base - 80);
  ctx.fill();
  ctx.fillStyle = sombra;
  for (let i = 0; i < 8; i++) ctx.fillRect(x + 66 + i * 15, base - 74, 5, 56);
  ctx.fillRect(x + 56, base - 18, 128, 4);
  for (const lado of [x + 10, x + 192]) {
    for (let a = 0; a < 2; a++) {
      for (let i = 0; i < 2; i++) {
        ctx.fillStyle = acesas > 0.3 ? "#ffe2a0" : sombra;
        ctx.fillRect(lado + i * 20, base - 70 + a * 30, 10, 20);
      }
    }
  }
}

/** Bonde aberto, de bancos, com os passageiros pendurados no estribo. */
function bonde(ctx: Ctx, x: number, base: number, cor: string, t: number) {
  ctx.strokeStyle = "#3a3a3a";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x + 40, base - 46);
  ctx.lineTo(x + 70, base - 76);
  ctx.stroke();
  ctx.fillStyle = cor;
  ctx.fillRect(x, base - 46, 90, 6);
  ctx.fillRect(x, base - 20, 90, 12);
  ctx.fillStyle = "#3a3a3a";
  for (let i = 0; i <= 6; i++) ctx.fillRect(x + i * 15, base - 40, 2, 20);
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = "#2a2a3a";
    ctx.beginPath();
    ctx.arc(x + 10 + i * 17, base - 30 - Math.abs(Math.sin(t * 5 + i)) * 1.5, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x + 8 + i * 17, base - 27, 4, 7);
  }
  for (const rx of [x + 16, x + 74]) {
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(rx, base - 5, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Chapéu de palha (canotier), com a fita escura. */
function canotier(c: Ctx) {
  c.save();
  c.translate(-6, -21);
  c.rotate(-0.1);
  c.fillStyle = "#f2dca0";
  c.strokeStyle = "#a8884a";
  c.lineWidth = 1;
  c.beginPath();
  c.ellipse(0, 2, 13, 2.8, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.fillRect(-7, -6, 14, 8);
  c.strokeRect(-7, -6, 14, 8);
  c.beginPath();
  c.ellipse(0, -6, 7, 1.8, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.fillStyle = "#1a2a4a";
  c.fillRect(-7, -2, 14, 2.6);
  c.restore();
}

export const C1946: Tema = {
  id: "c1946",
  nome: "Redemocratização (1946)",
  descricao: "Promulgada na volta à democracia: o Rio capital, o Palácio Tiradentes da Constituinte, os bondes e os anos 1950.",
  grupo: "constituicoes",
  amostra: `linear-gradient(135deg, ${PASTEIS[0]} 50%, ${PASTEIS[1]} 50%)`,
  onda: "sine",
  somBase: 494,
  capitel: "jonico",
  paleta: {
    ceu: [["#f0a890", "#ffe2c4"], ["#4aa8e8", "#d4f0fc"], ["#5a5a9a", "#f4a870"], ["#081438", "#22386c"]],
    longe: MORRO,
    perto: PALMEIRA,
    chao: "#d8d0c0",
    chaoLinha: "#a89e8a",
    coluna: { corpo: "#f6eede", sombra: "#d8ccb4", luz: "#fffbf2", contorno: "#3a4a5a" },
    maleta: { corpo: "#ff9a8a", escuro: "#a8443a", fivela: "#ffffff", alca: "#a8443a" },
    asa: { cor: "#ffffff", contorno: "#3aa8a0" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: PASTEIS,
    recorde: {
      cor: "#ff8a7a", traco: [4, 2, 4, 2, 12, 2], largura: 3.5,
      aviso: { texto: "NOVO RECORDE!", fonte: "italic 800 28px Georgia, serif", corTexto: "#ffffff", corContorno: "#3a4a5a", corFundo: "rgba(58,168,160,0.92)", anima: "pulsa" },
    },
    hud: "#1a2a3a",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f) {
    // a bola da Copa de 1950 quicando pela avenida
    const x = atravessa(w, f, 80);
    const quica = Math.abs(Math.sin(f * Math.PI * 6));
    const y = h - 66 - quica * 160;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(x / 26);
    ctx.scale(1.6, 1.6);
    ctx.fillStyle = "#c8864a";
    ctx.strokeStyle = "#5a3a1a";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.lineTo(16, 0);
    ctx.moveTo(0, -16);
    ctx.quadraticCurveTo(8, 0, 0, 16);
    ctx.moveTo(0, -16);
    ctx.quadraticCurveTo(-8, 0, 0, 16);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = `rgba(0,0,0,${0.25 * (1 - quica)})`;
    ctx.beginPath();
    ctx.ellipse(x, h - 42, 24 - quica * 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  },
  decor(ctx, w, h, off, tod, t) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.82, h * 0.14, 20);
    else sol(ctx, w * 0.82, h * 0.15, 24, "#fff4d6", "rgba(255,236,180,0.45)");
    colinas(ctx, w, h - 40, off * 0.04, ciclo(MORRO, tod), 170, 50, 0.006, 3);
    // prédios dos anos 1950 em tons pastel, com as marquises
    repetir(w, off * 0.08, 70, (x, k) => {
      const a = 70 + variar(k, 7919, 5) * 16;
      ctx.fillStyle = PASTEIS[variar(k, 13, 4)];
      ctx.globalAlpha = 0.55 + (1 - noite) * 0.35;
      ctx.fillRect(x, h - 130 - a, 62, a);
      ctx.globalAlpha = 1;
      ctx.fillStyle = noite > 0.3 ? "#ffe2a0" : "rgba(255,255,255,0.55)";
      for (let y = h - 124 - a; y < h - 136; y += 12) ctx.fillRect(x + 6, y, 50, 4);
    });
    repetir(w, off * 0.14, 1000, (x) => palacioTiradentes(ctx, x + 400, h - 96, ciclo(PALACIO, tod), ciclo(PALACIO_SOMBRA, tod), noite));
    // a rua, as palmeiras e o bonde
    ctx.fillStyle = ciclo(["#b8b0a4", "#c0b8ac", "#a89aa0", "#2a2a30"], tod);
    ctx.fillRect(0, h - 96, w, 56);
    ctx.fillStyle = "#8a8a8e";
    ctx.fillRect(0, h - 60, w, 2);
    const palm = ciclo(PALMEIRA, tod);
    repetir(w, off * 0.3, 230, (x, k) => palmeira(ctx, x + variar(k, 31, 60), h - 60, 140 + variar(k, 7, 3) * 12, palm, t, 0.04));
    repetir(w, off * 0.4 + t * 20, 640, (x, k) => bonde(ctx, x + variar(k, 37, 200), h - 46, ciclo(BONDE, tod), t));
  },
  chao(ctx, w, h, y, off, tema, tod) {
    // a calçada de pedra portuguesa em ondas largas
    ctx.fillStyle = ciclo([tema.paleta.chao, tema.paleta.chao, "#c8bcb4", "#3a3836"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = "#3a3a3a";
    ctx.beginPath();
    for (let x = -(off % 80) - 80; x < w + 80; x += 80) {
      ctx.moveTo(x, y + 18);
      ctx.quadraticCurveTo(x + 20, y + 8, x + 40, y + 18);
      ctx.quadraticCurveTo(x + 60, y + 28, x + 80, y + 18);
      ctx.lineTo(x + 80, y + 23);
      ctx.quadraticCurveTo(x + 60, y + 33, x + 40, y + 23);
      ctx.quadraticCurveTo(x + 20, y + 13, x, y + 23);
      ctx.closePath();
    }
    ctx.fill();
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    colunaGrega(ctx, w, len, variante, quebrada, tema);
    const capH = alturaCapitel(variante, quebrada, tema);
    // cartazes de eleição colados no fuste, desvirados na coluna de cima
    const deCima = ctx.getTransform().d < 0;
    for (let y = capH + 60 + variante * 30, i = 0; y < len - 40; y += 170, i++) {
      ctx.save();
      ctx.translate(0, y);
      if (deCima) ctx.scale(1, -1);
      ctx.rotate((i % 2 ? 1 : -1) * 0.05);
      ctx.fillStyle = PASTEIS[(i + variante) % 4];
      ctx.fillRect(-20, -18, 40, 36);
      ctx.fillStyle = "#1a2a4a";
      ctx.fillRect(-15, -12, 30, 6);
      ctx.fillRect(-15, -2, 20, 3);
      ctx.fillRect(-15, 4, 26, 3);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(10, 10, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, canotier);
  },
};
