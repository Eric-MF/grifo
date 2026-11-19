// Bahia: Salvador, com o Elevador Lacerda ligando a Cidade Baixa à Alta, o Mercado Modelo, o casario colorido do
// Pelourinho no alto da escarpa, o Farol da Barra e os saveiros na Baía de Todos-os-Santos; na maleta, as fitinhas do Bonfim.
import { ciclo, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, farol, figura, lua, luzinhas, mar, noiteDe, repetir, sobrados, sol } from "../kit";

const FITAS = ["#e8333a", "#ffd21a", "#2a8ae8", "#2fbf5a", "#ff7ab0", "#ffffff", "#b04ce0"];
// cores por hora do dia (amanhecer, dia, entardecer, noite)
const ESCARPA = ["#6a7a4a", "#5f8246", "#545a48", "#10180e"];
const BAIA = ["#3a7aa8", "#2a8ac0", "#4a5a90", "#0a1c3a"];
const ELEVADOR = ["#ece0d0", "#f6eee0", "#e2ccc4", "#5a5a70"];
const MERCADO = ["#e8c890", "#f0d098", "#d8b088", "#4a4234"];
const FORTE = ["#d8c8a8", "#e2d2b0", "#c8b0a0", "#3e3a3a"];
const FACHADAS = [
  ["#3a8ae0", "#2a8ae8", "#3a6ab0", "#1a2a4a"],
  ["#ffd23a", "#ffd21a", "#e8b030", "#4a4020"],
  ["#ff7ab0", "#ff7ab8", "#d86aa8", "#40203a"],
  ["#4ac87a", "#3fcf7a", "#3a9a6a", "#14302a"],
  ["#ff9a3a", "#ffa040", "#d87a3a", "#40281a"],
];

/** Elevador Lacerda: a torre art déco e a passarela até o alto da escarpa. */
function elevador(ctx: Ctx, x: number, base: number, alto: number, cor: string, acesas: number) {
  ctx.fillStyle = cor;
  ctx.fillRect(x, alto - 10, 54, base - alto + 10);
  ctx.fillRect(x - 6, alto - 16, 66, 8);
  ctx.fillRect(x + 54, alto - 4, 80, 14);
  ctx.fillRect(x + 8, alto - 30, 38, 14);
  ctx.fillStyle = acesas > 0.3 ? "#ffe2a0" : "rgba(0,0,0,0.22)";
  for (let y = alto + 6; y < base - 10; y += 14) ctx.fillRect(x + 8, y, 38, 5);
  ctx.fillRect(x + 12, alto - 26, 30, 6);
}

/** Saveiro: barco de carga com vela de pano escuro. */
function saveiro(ctx: Ctx, x: number, y: number, t: number) {
  const bal = Math.sin(t * 1.4 + x * 0.01) * 0.04;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(bal);
  ctx.fillStyle = "#6a3a24";
  ctx.beginPath();
  ctx.moveTo(-24, -4);
  ctx.lineTo(24, -4);
  ctx.lineTo(18, 3);
  ctx.lineTo(-18, 3);
  ctx.fill();
  ctx.fillRect(-1, -40, 2, 36);
  ctx.fillStyle = "#c89a6a";
  ctx.beginPath();
  ctx.moveTo(1, -38);
  ctx.lineTo(20, -8);
  ctx.lineTo(1, -8);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-1, -34);
  ctx.lineTo(-16, -8);
  ctx.lineTo(-1, -8);
  ctx.fill();
  ctx.restore();
}

/** Fitinhas do Bonfim amarradas na alça, tremulando. */
function fitinhas(c: Ctx, t: number) {
  for (let i = 0; i < 5; i++) {
    c.strokeStyle = FITAS[i];
    c.lineWidth = 1.8;
    c.beginPath();
    c.moveTo(-6 + i * 3, -22);
    for (let j = 1; j <= 5; j++) c.lineTo(-6 + i * 3 - j * 4, -22 + Math.sin(t * 9 + j + i) * 2.2 + j * 1.2);
    c.stroke();
  }
}

export const BA: Tema = {
  id: "ba",
  nome: "Bahia",
  descricao: "Salvador: o Elevador Lacerda, o casario colorido do Pelourinho, o Farol da Barra e os saveiros na baía.",
  grupo: "estados",
  amostra: "linear-gradient(135deg, #2a8ae8 33%, #ffd21a 33% 66%, #ff7ab8 66%)",
  onda: "triangle",
  somBase: 370,
  capitel: "dorico",
  paleta: {
    ceu: [["#f0a088", "#ffe0bc"], ["#2f9ae8", "#cfeefc"], ["#4a4a9a", "#f6a058"], ["#06143a", "#1e3c6e"]],
    longe: ESCARPA,
    perto: ESCARPA,
    chao: "#d8c8a8",
    chaoLinha: "#a8946a",
    coluna: { corpo: "#ffd21a", sombra: "#d8a810", luz: "#ffe46a", contorno: "#3a2a0a" },
    maleta: { corpo: "#ffffff", escuro: "#8a8a9a", fivela: "#e8333a", alca: "#5a5a6a" },
    asa: { cor: "#ffffff", contorno: "#2a8ae8" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: FITAS,
    recorde: {
      cor: "#2fbf5a", traco: [3, 3, 3, 3, 12, 3], largura: 3.5,
      aviso: { texto: "AXÉ! NOVO RECORDE!", fonte: "800 26px system-ui, sans-serif", corTexto: "#ffffff", corContorno: "#3a0a4a", corFundo: "rgba(176,76,224,0.9)", anima: "treme" },
    },
    hud: "#0e1e3a",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // o trio elétrico passa pela orla, com o cantor no alto e a pipoca pulando atrás
    const x = atravessa(w, f, 260);
    const base = h - 42;
    for (let i = 0; i < 12; i++) {
      const pula = Math.abs(Math.sin(t * 8 + i * 1.3)) * 8;
      figura(ctx, x - 70 - i * 18, base - pula, 0.8, "#2a1a2a", { bracoE: -2.6, bracoD: 2.5, pernaE: 0.2, pernaD: -0.2 });
    }
    ctx.fillStyle = "#2a2a3a";
    ctx.fillRect(x - 50, base - 64, 170, 54);
    ctx.fillRect(x + 120, base - 44, 40, 34);
    ctx.fillStyle = "#1a1a1a";
    for (const rx of [x - 30, x + 30, x + 100, x + 140]) {
      ctx.beginPath();
      ctx.arc(rx, base - 9, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#3a3a4a";
    for (let i = 0; i < 4; i++) ctx.fillRect(x - 44 + i * 40, base - 60, 34, 40);
    ctx.fillStyle = "#6a6a7a";
    for (let i = 0; i < 4; i++) {
      for (const dy of [-50, -32]) {
        ctx.beginPath();
        ctx.arc(x - 27 + i * 40, base + dy, 7 + Math.abs(Math.sin(t * 16)) * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const pontos: [number, number][] = [];
    for (let i = 0; i <= 17; i++) pontos.push([x - 50 + i * 10, base - 64]);
    luzinhas(ctx, pontos, t * 3, FITAS, 2.4);
    figura(ctx, x + 40, base - 64, 1.1, "#2a1a2a", { bracoE: -2.8, bracoD: 1.6 + Math.sin(t * 6) * 0.4 });
  },
  decor(ctx, w, h, off, tod, t) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.84, h * 0.14, 20);
    else sol(ctx, w * 0.84, h * 0.15, 26, "#fff6dc", "rgba(255,240,190,0.5)");
    // a escarpa verde que separa a Cidade Alta da Baixa, com o casario no alto
    const alto = h - 230;
    const escarpa = ciclo(ESCARPA, tod);
    ctx.fillStyle = escarpa;
    ctx.beginPath();
    ctx.moveTo(0, h - 100);
    for (let x = 0; x <= w + 20; x += 20) ctx.lineTo(x, alto + Math.sin((x + off * 0.1) * 0.01) * 6);
    ctx.lineTo(w, h - 100);
    ctx.fill();
    sobrados(ctx, w, alto + 4, off * 0.1, FACHADAS.map((c) => ciclo(c, tod)), ciclo(["#b0583a", "#bb603e", "#93483a", "#2a1e26"], tod), ciclo(["#fbf6ec", "#ffffff", "#f0e0d8", "#6a6a7a"], tod), ciclo(["#2a3a5a", "#24365a", "#2e2e4a", "#10141e"], tod), noite, 0.85);
    // a Cidade Baixa: o Mercado Modelo e o Elevador
    repetir(w, off * 0.1, 900, (x) => {
      ctx.fillStyle = ciclo(MERCADO, tod);
      ctx.fillRect(x + 80, h - 150, 150, 50);
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 90 + i * 24, h - 100);
        ctx.lineTo(x + 90 + i * 24, h - 126);
        ctx.arc(x + 98 + i * 24, h - 126, 8, Math.PI, 0);
        ctx.lineTo(x + 106 + i * 24, h - 100);
        ctx.fill();
      }
      elevador(ctx, x + 300, h - 100, alto, ciclo(ELEVADOR, tod), noite);
    });
    // a baía, os saveiros e o Farol da Barra no forte
    const yMar = h - 104;
    mar(ctx, w, yMar, 64, off * 0.2, ciclo(BAIA, tod), "rgba(255,255,255,0.55)", t);
    repetir(w, off * 0.22 + t * 8, 420, (x, k) => saveiro(ctx, x + variar(k, 37, 150), yMar + 30 + variar(k, 7, 3) * 8, t));
    repetir(w, off * 0.3, 1100, (x) => {
      const fx = x + 760;
      ctx.fillStyle = ciclo(FORTE, tod);
      ctx.beginPath();
      ctx.moveTo(fx - 80, yMar + 64);
      ctx.lineTo(fx - 64, yMar + 10);
      ctx.lineTo(fx + 64, yMar + 10);
      ctx.lineTo(fx + 80, yMar + 64);
      ctx.fill();
      for (let i = -60; i < 60; i += 14) ctx.fillRect(fx + i, yMar + 4, 8, 6);
      farol(ctx, fx, yMar + 10, 110, "#ffffff", "#1a1a1a", t, noite);
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    // as pedras do calçamento do Pelourinho
    ctx.fillStyle = ciclo(["#9a8e80", "#a49888", "#887a76", "#2a2828"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = ciclo(["#c0b4a4", "#c8bcaa", "#a89a94", "#3e3a3a"], tod);
    ctx.beginPath();
    for (let fila = 0; fila < 3; fila++) {
      const yy = y + 5 + fila * 11;
      for (let x = -((off + fila * 11) % 22); x < w; x += 22) ctx.roundRect(x + 1, yy, 18, 9, 4);
    }
    ctx.fill();
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // fachadas do Pelourinho empilhadas, cada andar de uma cor, com janelas e sacadas
    const deCima = ctx.getTransform().d < 0;
    const andar = 46;
    for (let y = 0, i = 0; y < len; y += andar, i++) {
      const cor = ["#2a8ae8", "#ffd21a", "#ff7ab8", "#3fcf7a", "#ffa040"][(i + variante) % 5];
      ctx.fillStyle = cor;
      ctx.fillRect(x0, y, w, Math.min(andar, len - y));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x0, y, w, 3);
      // janelas com moldura branca, desviradas na coluna de cima
      for (const jx of [x0 + 10, x0 + w - 26]) {
        const jy = y + (deCima ? andar - 36 : 12);
        if (jy + 24 > len) continue;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(jx - 2, jy - 2, 20, 28);
        ctx.fillStyle = "#3a5a7a";
        ctx.fillRect(jx, jy, 16, 24);
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(jx - 3, deCima ? jy - 2 : jy + 22, 22, 3);
      }
    }
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(x0 + w - 8, 0, 8, len);
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = c.luz;
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
    // beiral de telha
    ctx.fillStyle = "#b0583a";
    ctx.fillRect(x0 - 6, 0, w + 12, 10);
    ctx.strokeRect(x0 - 6, 0, w + 12, 10);
    ctx.strokeStyle = "#5a2a1a";
    ctx.beginPath();
    for (let x = x0 - 6; x < x0 + w + 6; x += 8) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 10);
    }
    ctx.stroke();
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => fitinhas(c, t));
  },
};
