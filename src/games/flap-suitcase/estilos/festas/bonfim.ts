// Lavagem do Bonfim (a segunda quinta-feira depois do Dia de Reis, em Salvador): a Igreja do Bonfim no alto da colina,
// as baianas de branco subindo com os jarros de água de cheiro, as fitinhas no gradil e as colunas caiadas com fitas.
import { ciclo, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, figura, lua, noiteDe, repetir, sol } from "../kit";

const FITAS = ["#e8333a", "#ffd21a", "#2a8ae8", "#2fbf5a", "#ff7ab0", "#ffffff", "#b04ce0"];
// cores por hora do dia (amanhecer, dia, entardecer, noite)
const IGREJA = ["#f4eee6", "#fbfaf6", "#ece0dc", "#5a5a70"];
const IGREJA_SOMBRA = ["#d0c4b8", "#d8d0c4", "#c4b0b0", "#3a3a50"];
const COLINA = ["#6a8a5a", "#5f9052", "#566a52", "#10180e"];
const ESCADARIA = ["#d8d0c4", "#e0d8cc", "#c8bcbc", "#36343c"];
const BAIANA = ["#fbf8f2", "#ffffff", "#f4ecec", "#c8c8d4"];
const PELE = ["#5a3a24", "#5e3c26", "#523422", "#1a120c"];

/** A Igreja do Bonfim: a fachada branca com as duas torres de cúpula azul e o frontão. */
function igreja(ctx: Ctx, x: number, base: number, cor: string, sombra: string, acesas: number) {
  ctx.fillStyle = cor;
  ctx.fillRect(x, base - 80, 110, 80);
  ctx.beginPath();
  ctx.moveTo(x + 20, base - 80);
  ctx.bezierCurveTo(x + 24, base - 108, x + 86, base - 108, x + 90, base - 80);
  ctx.fill();
  for (const tx of [x - 20, x + 110]) {
    ctx.fillStyle = cor;
    ctx.fillRect(tx, base - 110, 20, 110);
    ctx.fillStyle = "#3a6ab0";
    ctx.beginPath();
    ctx.ellipse(tx + 10, base - 110, 11, 12, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(tx + 9, base - 130, 2, 10);
    ctx.fillRect(tx + 6, base - 126, 8, 2);
    ctx.fillStyle = sombra;
    ctx.fillRect(tx + 6, base - 98, 8, 14);
  }
  ctx.fillStyle = acesas > 0.3 ? "#ffe2a0" : sombra;
  ctx.fillRect(x + 45, base - 36, 20, 36);
  ctx.fillRect(x + 14, base - 64, 14, 18);
  ctx.fillRect(x + 82, base - 64, 14, 18);
  ctx.beginPath();
  ctx.arc(x + 55, base - 82, 7, 0, Math.PI * 2);
  ctx.fill();
}

/** Baiana de saia rodada e torço, com o jarro de flores na cabeça. */
function baiana(ctx: Ctx, x: number, base: number, roupa: string, pele: string, t: number, k: number) {
  const passo = Math.sin(t * 3 + k) * 0.15;
  const gira = Math.sin(t * 3 + k) * 3;
  figura(ctx, x, base - 4, 0.95, pele, { bracoE: -2.4, bracoD: 2.4 + passo, pernaE: passo, pernaD: -passo });
  ctx.fillStyle = roupa;
  ctx.beginPath();
  ctx.moveTo(x - 5, base - 30);
  ctx.lineTo(x + 5, base - 30);
  ctx.lineTo(x + 15 + gira, base - 4);
  ctx.quadraticCurveTo(x, base, x - 15 + gira, base - 4);
  ctx.fill();
  ctx.fillRect(x - 5, base - 38, 10, 9);
  // o torço e o jarro de água de cheiro
  ctx.beginPath();
  ctx.ellipse(x, base - 47, 5, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c89a6a";
  ctx.beginPath();
  ctx.moveTo(x - 4, base - 50);
  ctx.quadraticCurveTo(x - 6, base - 60, x - 2, base - 62);
  ctx.lineTo(x + 2, base - 62);
  ctx.quadraticCurveTo(x + 6, base - 60, x + 4, base - 50);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = FITAS[(k + i) % FITAS.length];
    ctx.beginPath();
    ctx.arc(x - 3 + i * 3, base - 64, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** O jarro de água de cheiro com flores, na tampa. */
function jarro(c: Ctx) {
  c.save();
  c.translate(10, -18);
  c.fillStyle = "#c89a6a";
  c.strokeStyle = "#7a5a3a";
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(-5, 0);
  c.quadraticCurveTo(-8, -10, -3, -13);
  c.lineTo(3, -13);
  c.quadraticCurveTo(8, -10, 5, 0);
  c.closePath();
  c.fill();
  c.stroke();
  for (let i = 0; i < 4; i++) {
    c.fillStyle = FITAS[i];
    c.beginPath();
    c.arc(-4 + i * 2.6, -16 - (i % 2) * 2, 2.2, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

export const BONFIM: Tema = {
  id: "bonfim",
  nome: "Lavagem do Bonfim",
  descricao: "Em Salvador, na quinta-feira depois do Dia de Reis: a Igreja do Bonfim, as baianas com água de cheiro e as fitinhas.",
  grupo: "festas",
  janela: { tipo: "semana", mes: 1, diaSemana: 4, ordem: 2, aPartirDe: 7 },
  amostra: "conic-gradient(#e8333a 14%, #ffd21a 0 28%, #2a8ae8 0 42%, #2fbf5a 0 56%, #ff7ab0 0 70%, #ffffff 0 85%, #b04ce0 0)",
  onda: "triangle",
  somBase: 523,
  climaFixo: "limpo",
  capitel: "dorico",
  paleta: {
    ceu: [["#f0a088", "#ffe0bc"], ["#2f9ae8", "#cfeefc"], ["#4a4a9a", "#f6a058"], ["#06143a", "#1e3c6e"]],
    longe: COLINA,
    perto: PELE,
    chao: "#d8d0c4",
    chaoLinha: "#a89e90",
    coluna: { corpo: "#fbf8f2", sombra: "#d8d2c6", luz: "#ffffff", contorno: "#3a4a6a" },
    maleta: { corpo: "#2a8ae8", escuro: "#0e3a7a", fivela: "#ffffff", alca: "#0e3a7a" },
    asa: { cor: "#ffffff", contorno: "#2a8ae8" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: FITAS,
    recorde: {
      cor: "#ff7ab0", traco: [2, 2, 2, 2, 2, 8], largura: 4,
      aviso: { texto: "AXÉ! NOVO RECORDE!", fonte: "800 26px system-ui, sans-serif", corTexto: "#ffffff", corContorno: "#0e3a7a", corFundo: "rgba(42,138,232,0.92)", anima: "pulsa" },
    },
    hud: "#0e1e3a",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // uma revoada de fitinhas do Bonfim gigantes, tremulando pelo céu
    const x0 = atravessa(w, f, 300);
    for (let i = 0; i < 7; i++) {
      const x = x0 - i * 40;
      const y = h * 0.2 + i * 14;
      ctx.strokeStyle = FITAS[i];
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let j = 1; j <= 10; j++) ctx.lineTo(x - j * 18, y + Math.sin(t * 5 + j * 0.7 + i) * 10);
      ctx.stroke();
    }
  },
  decor(ctx, w, h, off, tod, t) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.8, h * 0.14, 20);
    else sol(ctx, w * 0.8, h * 0.15, 26, "#fff6dc", "rgba(255,240,190,0.5)");
    // a colina com a igreja no alto e a escadaria
    const colina = ciclo(COLINA, tod);
    repetir(w, off * 0.08, 1100, (x) => {
      ctx.fillStyle = colina;
      ctx.beginPath();
      ctx.moveTo(x, h - 100);
      ctx.quadraticCurveTo(x + 350, h - 260, x + 700, h - 100);
      ctx.fill();
      igreja(ctx, x + 295, h - 178, ciclo(IGREJA, tod), ciclo(IGREJA_SOMBRA, tod), noite);
      ctx.fillStyle = ciclo(ESCADARIA, tod);
      for (let i = 0; i < 7; i++) ctx.fillRect(x + 320 - i * 8, h - 178 + i * 10, 60 + i * 16, 5);
    });
    // o gradil com as fitinhas amarradas, tremulando
    const y0 = h - 120;
    ctx.fillStyle = ciclo(["#3a3a44", "#3a3a44", "#343040", "#0e0e14"], tod);
    ctx.fillRect(0, y0, w, 3);
    ctx.fillRect(0, y0 + 30, w, 3);
    repetir(w, off * 0.3, 10, (x, k) => {
      ctx.fillRect(x, y0, 2, 34);
      ctx.strokeStyle = FITAS[variar(k, 7, FITAS.length)];
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x + 1, y0 + 2);
      for (let j = 1; j <= 4; j++) ctx.lineTo(x + 1 - j * 3, y0 + 2 + j * 5 + Math.sin(t * 6 + k + j) * 1.5);
      ctx.stroke();
      ctx.fillStyle = ciclo(["#3a3a44", "#3a3a44", "#343040", "#0e0e14"], tod);
    });
    // o cortejo das baianas
    ctx.fillStyle = ciclo(ESCADARIA, tod);
    ctx.fillRect(0, h - 86, w, 46);
    const roupa = ciclo(BAIANA, tod);
    const pele = ciclo(PELE, tod);
    repetir(w, off * 0.42 + t * 10, 110, (x, k) => baiana(ctx, x + variar(k, 13, 40), h - 42, roupa, pele, t, k));
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#c8bcbc", "#36343c"], tod);
    ctx.fillRect(0, y, w, h - y);
    // a água de cheiro molhando as pedras, com pétalas
    ctx.fillStyle = "rgba(120,170,220,0.3)";
    for (let x = -(off % 70); x < w; x += 70) {
      ctx.beginPath();
      ctx.ellipse(x + 30, y + 16, 22, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let x = -(off % 23); x < w; x += 23) {
      const k = Math.round((x + off) / 23);
      ctx.fillStyle = FITAS[variar(k, 7, FITAS.length)];
      ctx.beginPath();
      ctx.ellipse(x + 10, y + 8 + variar(k, 11, 24), 2.4, 1.4, k, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 3);
  },
  coluna(ctx, w, len, variante, quebrada, tema, t) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // coluna caiada, toda enrolada de fitinhas que balançam
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
    for (let y = 30 + variante * 10, i = 0; y < len + 20; y += 16, i++) {
      ctx.strokeStyle = FITAS[(i + variante) % FITAS.length];
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.quadraticCurveTo(0, y + 10 + Math.sin(t * 3 + i) * 2, x0 + w, y + 2);
      ctx.stroke();
    }
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
    // a cornija azul, como as cúpulas da igreja
    ctx.fillStyle = "#3a6ab0";
    ctx.fillRect(x0 - 5, 0, w + 10, 10);
    ctx.strokeRect(x0 - 5, 0, w + 10, 10);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x0 - 5, 10, w + 10, 4);
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, jarro);
  },
};
