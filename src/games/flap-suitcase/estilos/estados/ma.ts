// Maranhão: os Lençóis Maranhenses, com as dunas brancas e as lagoas azuis de chuva entre elas, os casarões de azulejo
// de São Luís ao longe e as colunas de azulejo português; na maleta, o chapéu de fitas do bumba-meu-boi.
import { ciclo, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, dunas, ladrilho, lua, noiteDe, repetir, sol } from "../kit";

const FITAS = ["#e8333a", "#ffd21a", "#2a8ae8", "#2fbf5a", "#ff7ab0", "#b04ce0"];
// cores por hora do dia (amanhecer, dia, entardecer, noite)
const DUNA = ["#fbf0e8", "#ffffff", "#f6e2e0", "#5a5a6e"];
const DUNA_SOMBRA = ["#e2d2d8", "#e4ecf2", "#dcc4cc", "#3a3a50"];
const LAGOA = ["#4aa8c8", "#2ab8d8", "#5a8ab8", "#10304a"];
const LAGOA_VERDE = ["#4ac8a8", "#2ad0b0", "#5a9aa0", "#103a34"];
const CASARAO = ["#d8e2ec", "#e2ecf6", "#ccc4d8", "#3a3e56"];
const AZULEJO = ["#3a5aa8", "#2a5ab8", "#3a4a90", "#141c3e"];

/** Lagoa entre as dunas, com o reflexo. */
function lagoa(ctx: Ctx, x: number, y: number, larg: number, cor: string) {
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.ellipse(x, y, larg, larg * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillRect(x - larg * 0.5, y - 1, larg * 0.3, 1.5);
}

/** Casarão de dois andares com a fachada de azulejo e os balcões. */
function casarao(ctx: Ctx, x: number, base: number, cor: string, azulejo: string, acesas: number) {
  ctx.fillStyle = cor;
  ctx.fillRect(x, base - 64, 110, 64);
  ctx.fillStyle = azulejo;
  for (let y = base - 60; y < base - 4; y += 6) for (let i = x + 2; i < x + 108; i += 6) if ((y + i) % 12 < 6) ctx.fillRect(i, y, 3, 3);
  ctx.fillStyle = "#b0583a";
  ctx.fillRect(x - 4, base - 68, 118, 5);
  for (let a = 0; a < 2; a++) {
    for (let j = 0; j < 4; j++) {
      const jx = x + 10 + j * 25;
      const jy = base - 56 + a * 30;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(jx - 2, jy - 2, 14, 22);
      ctx.fillStyle = acesas > 0.3 && a === 1 ? "#ffd98a" : "#2a3a4a";
      ctx.fillRect(jx, jy, 10, 18);
      if (a === 0) {
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(jx - 3, jy + 16, 16, 2);
      }
    }
  }
}

/** Chapéu do bumba-meu-boi: a copa bordada e as fitas compridas que balançam. */
function chapeuFitas(c: Ctx, t: number) {
  c.save();
  c.translate(-4, -22);
  for (let i = 0; i < 6; i++) {
    c.strokeStyle = FITAS[i];
    c.lineWidth = 1.8;
    c.beginPath();
    const x = -12 + i * 4.8;
    c.moveTo(x, 2);
    for (let j = 1; j <= 4; j++) c.lineTo(x + Math.sin(t * 7 + i + j) * 2, 2 + j * 5);
    c.stroke();
  }
  c.fillStyle = "#1a1a3a";
  c.beginPath();
  c.ellipse(0, 2, 14, 3, 0, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.moveTo(-9, 2);
  c.quadraticCurveTo(-8, -10, 0, -11);
  c.quadraticCurveTo(8, -10, 9, 2);
  c.closePath();
  c.fill();
  c.fillStyle = "#ffd21a";
  for (let i = 0; i < 5; i++) {
    c.beginPath();
    c.arc(-6 + i * 3, -3 - Math.sin((i / 4) * Math.PI) * 3, 1.1, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

export const MA: Tema = {
  id: "ma",
  nome: "Maranhão",
  descricao: "Os Lençóis Maranhenses, com as lagoas azuis entre as dunas brancas, e os casarões de azulejo de São Luís.",
  grupo: "estados",
  amostra: "linear-gradient(135deg, #ffffff 50%, #2ab8d8 50%)",
  onda: "sine",
  somBase: 622,
  climaFixo: "limpo",
  paleta: {
    ceu: [["#e8a0a8", "#fde0c8"], ["#3a98e0", "#d0eefc"], ["#5a4a96", "#f2a46a"], ["#081234", "#22386c"]],
    longe: DUNA,
    perto: DUNA_SOMBRA,
    chao: "#fbf6ee",
    chaoLinha: "#d8d0c4",
    coluna: { corpo: "#f6f8fc", sombra: "#c8d0e0", luz: "#ffffff", contorno: "#1e3a8a" },
    maleta: { corpo: "#1a1a3a", escuro: "#060614", fivela: "#ffd21a", alca: "#060614" },
    asa: { cor: "#ffffff", contorno: "#2a5ab8" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: FITAS,
    recorde: {
      cor: "#2a5ab8", traco: [2, 2, 2, 8], largura: 3.5,
      aviso: { texto: "NOVO RECORDE!", fonte: "800 28px Georgia, serif", corTexto: "#ffffff", corContorno: "#0a1a4a", corFundo: "rgba(42,90,184,0.92)", anima: "pulsa" },
    },
    hud: "#0e1a3a",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // o bumba-meu-boi dançando pelas dunas, com as fitas girando
    const x = atravessa(w, f, 200);
    const base = h - 44;
    const gira = Math.sin(t * 5);
    ctx.save();
    ctx.translate(x, base - Math.abs(gira) * 10);
    ctx.rotate(gira * 0.1);
    ctx.scale(1.7, 1.7);
    for (let i = 0; i < 10; i++) {
      ctx.strokeStyle = FITAS[i % FITAS.length];
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-34 + i * 7.5, -28);
      ctx.lineTo(-36 + i * 7.5 + gira * 5, 0);
      ctx.stroke();
    }
    ctx.fillStyle = "#1a1a3a";
    ctx.beginPath();
    ctx.ellipse(0, -40, 36, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd21a";
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.arc(-26 + (i % 6) * 10, -46 + Math.floor(i / 6) * 10, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#1a1a3a";
    ctx.beginPath();
    ctx.ellipse(36, -52, 12, 9, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f2e6c8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(32, -60);
    ctx.quadraticCurveTo(28, -74, 20, -72);
    ctx.moveTo(40, -60);
    ctx.quadraticCurveTo(48, -74, 54, -70);
    ctx.stroke();
    ctx.fillStyle = "#e8333a";
    ctx.beginPath();
    ctx.arc(38, -54, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  decor(ctx, w, h, off, tod, t) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.72, h * 0.14, 22);
    else sol(ctx, w * 0.72, h * 0.15, 28, "#fff6dc", "rgba(255,240,190,0.55)");
    // São Luís lá longe, no horizonte, sobre a faixa de terra e mangue
    ctx.fillStyle = ciclo(["#8a9a7a", "#7aa07a", "#6e6e7a", "#141a22"], tod);
    ctx.fillRect(0, h - 244, w, 60);
    repetir(w, off * 0.03, 1600, (x) => {
      for (let i = 0; i < 4; i++) casarao(ctx, x + 200 + i * 116, h - 240, ciclo(CASARAO, tod), ciclo(AZULEJO, tod), noite);
    });
    // as dunas em camadas, com as lagoas entre elas
    const duna = ciclo(DUNA, tod);
    const sombra = ciclo(DUNA_SOMBRA, tod);
    const azul = ciclo(LAGOA, tod);
    const verde = ciclo(LAGOA_VERDE, tod);
    dunas(ctx, w, h - 200, off * 0.06, 70, duna, sombra, 300);
    // a areia do pé das dunas de trás até o chão: sem ela, o céu aparecia entre as camadas e embaixo da última
    ctx.fillStyle = duna;
    ctx.fillRect(0, h - 201, w, 162);
    repetir(w, off * 0.08, 300, (x, k) => lagoa(ctx, x + 140 + variar(k, 31, 60), h - 196, 60 + variar(k, 7, 3) * 20, variar(k, 3, 2) ? azul : verde));
    dunas(ctx, w, h - 140, off * 0.14, 90, duna, sombra, 340);
    repetir(w, off * 0.18, 340, (x, k) => lagoa(ctx, x + 170 + variar(k, 29, 80), h - 132, 80 + variar(k, 11, 3) * 22, variar(k, 5, 2) ? verde : azul));
    dunas(ctx, w, h - 60, off * 0.3, 100, duna, sombra, 380);
    repetir(w, off * 0.34, 380, (x, k) => lagoa(ctx, x + 200 + variar(k, 37, 60), h - 52, 90 + variar(k, 7, 3) * 20, variar(k, 3, 2) ? azul : verde));
    // gente andando na crista de uma duna
    ctx.fillStyle = ciclo(["#4a3a3a", "#3a3030", "#3a2a32", "#0a080c"], tod);
    repetir(w, off * 0.14 + t * 3, 900, (x) => {
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x + 400 + i * 10, h - 222 - i, 1.6, 0, Math.PI * 2);
        ctx.fillRect(x + 399 + i * 10, h - 220 - i, 2, 6);
        ctx.fill();
      }
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#f0dcd4", "#4a4a5a"], tod);
    ctx.fillRect(0, y, w, h - y);
    // marcas do vento
    ctx.strokeStyle = "rgba(160,150,170,0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -(off % 26); x < w; x += 26) {
      ctx.moveTo(x, y + 10);
      ctx.quadraticCurveTo(x + 7, y + 7, x + 14, y + 10);
      ctx.moveTo(x + 10, y + 22);
      ctx.quadraticCurveTo(x + 17, y + 19, x + 24, y + 22);
    }
    ctx.stroke();
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // azulejo português: ladrilhos brancos com o desenho azul em quadros de quatro
    ctx.fillStyle = c.corpo;
    ctx.fillRect(x0, 0, w, len);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, 0, w, len);
    ctx.clip();
    const lado = w / 4;
    ctx.fillStyle = ladrilho(ctx, "azulejo-ma", lado, lado, (c2) => {
      c2.fillStyle = "#f6f8fc";
      c2.fillRect(0, 0, lado, lado);
      c2.fillStyle = "#2a4aa8";
      const m = lado / 2;
      // flor de quatro pétalas no meio e os quartos de flor nos cantos, que formam outra flor entre os ladrilhos
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        c2.beginPath();
        c2.ellipse(m + Math.cos(a) * lado * 0.18, m + Math.sin(a) * lado * 0.18, lado * 0.15, lado * 0.07, a, 0, Math.PI * 2);
        c2.fill();
      }
      c2.beginPath();
      c2.arc(m, m, lado * 0.06, 0, Math.PI * 2);
      for (const [dx, dy] of [[0, 0], [lado, 0], [0, lado], [lado, lado]]) {
        c2.moveTo(dx + lado * 0.14, dy);
        c2.arc(dx, dy, lado * 0.14, 0, Math.PI * 2);
      }
      c2.fill();
      c2.strokeStyle = "rgba(30,58,138,0.25)";
      c2.lineWidth = 0.8;
      c2.strokeRect(0, 0, lado, lado);
    });
    ctx.fillRect(x0, 0, w, len);
    ctx.fillStyle = "rgba(0,0,40,0.1)";
    ctx.fillRect(x0 + w - 8, 0, 8, len);
    ctx.restore();
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = c.corpo;
      ctx.beginPath();
      ctx.moveTo(x0, lado * 0.6);
      ctx.lineTo(x0 + lado, lado * 0.6);
      ctx.lineTo(x0 + lado, 0);
      ctx.lineTo(x0 + lado * 2, 0);
      ctx.lineTo(x0 + lado * 2, lado * 0.4);
      ctx.lineTo(x0 + w, lado * 0.4);
      ctx.lineTo(x0 + w, lado * 0.8);
      ctx.lineTo(x0, lado * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // cimalha de pedra
    ctx.fillStyle = "#e8e0d0";
    ctx.fillRect(x0 - 5, 0, w + 10, 9);
    ctx.strokeRect(x0 - 5, 0, w + 10, 9);
    ctx.fillStyle = "#2a4aa8";
    ctx.fillRect(x0 - 5, 9, w + 10, 3);
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => chapeuFitas(c, t));
  },
};
