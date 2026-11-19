// Rio Grande do Norte: o Forte dos Reis Magos, em estrela, na boca do rio, o Morro do Careca em Ponta Negra,
// as dunas de Genipabu com os buggies e o cajueiro gigante; as colunas são a muralha do forte, com as seteiras.
import { ciclo, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, dunas, figura, lua, mar, noiteDe, repetir, sol } from "../kit";

// cores por hora do dia (amanhecer, dia, entardecer, noite)
const DUNA = ["#f2d8a8", "#f8e0ae", "#e2c09e", "#4e443e"];
const DUNA_SOMBRA = ["#d8b884", "#dcbe88", "#c49e86", "#2e2826"];
const MATA = ["#4a7a4a", "#428046", "#425244", "#0c1810"];
const MAR = ["#3a8ab0", "#1aa0c8", "#4a6a9a", "#0a1e3a"];
const FORTE = ["#d8c8a8", "#e2d2b0", "#c8b0a0", "#3e3a3a"];
const FORTE_SOMBRA = ["#b0a084", "#baa888", "#a08c84", "#262224"];
const CAJUEIRO = ["#3a6a2a", "#357030", "#36482e", "#0a1408"];

/** O forte em estrela, de perfil: muralhas inclinadas com as pontas dos baluartes e a guarita. */
function forte(ctx: Ctx, x: number, base: number, cor: string, sombra: string) {
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.lineTo(x + 20, base - 44);
  ctx.lineTo(x + 60, base - 44);
  ctx.lineTo(x + 90, base - 60);
  ctx.lineTo(x + 120, base - 44);
  ctx.lineTo(x + 180, base - 44);
  ctx.lineTo(x + 200, base);
  ctx.fill();
  ctx.fillStyle = sombra;
  ctx.beginPath();
  ctx.moveTo(x + 90, base - 60);
  ctx.lineTo(x + 120, base - 44);
  ctx.lineTo(x + 140, base);
  ctx.lineTo(x + 100, base);
  ctx.fill();
  // guarita redonda na ponta
  ctx.fillStyle = cor;
  ctx.fillRect(x + 84, base - 76, 12, 16);
  ctx.beginPath();
  ctx.arc(x + 90, base - 76, 7, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(x + 88, base - 70, 4, 6);
}

/** Buggy subindo e descendo as dunas. */
function buggy(ctx: Ctx, x: number, y: number, cor: string, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 1.3 + x * 0.01) * 0.12);
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.lineTo(-14, -9);
  ctx.lineTo(8, -9);
  ctx.lineTo(18, -2);
  ctx.lineTo(18, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2a2a2a";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-10, -9);
  ctx.lineTo(-6, -18);
  ctx.lineTo(4, -18);
  ctx.lineTo(6, -9);
  ctx.stroke();
  ctx.fillStyle = "#1a1a1a";
  for (const rx of [-11, 11]) {
    ctx.beginPath();
    ctx.arc(rx, 1, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Óculos de proteção de buggy e o lenço. */
function oculosBuggy(c: Ctx, t: number) {
  c.strokeStyle = "#3a3a3a";
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(-23, -12);
  c.lineTo(23, -12);
  c.stroke();
  c.fillStyle = "#5a3a1a";
  c.strokeStyle = "#2a1a0a";
  c.lineWidth = 1;
  for (const x of [-9, 9]) {
    c.beginPath();
    c.ellipse(x, -12, 6.5, 5, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  }
  c.fillStyle = "rgba(255,190,80,0.75)";
  for (const x of [-9, 9]) {
    c.beginPath();
    c.ellipse(x, -12, 4.5, 3.4, 0, 0, Math.PI * 2);
    c.fill();
  }
  // o lenço vermelho voando
  const bal = Math.sin(t * 9);
  c.fillStyle = "#e8333a";
  c.beginPath();
  c.moveTo(-22, -6);
  c.quadraticCurveTo(-30, -6 + bal * 2, -38, -2 + bal * 4);
  c.lineTo(-34, 2 + bal * 3);
  c.quadraticCurveTo(-28, -1, -22, -1);
  c.fill();
}

/** Chapéu de palha de aba larga, com a fita, em `x`, `y` (o alto da cabeça). */
function chapeuDePalha(ctx: Ctx, x: number, y: number, s: number) {
  ctx.fillStyle = "#e8c87a";
  ctx.beginPath();
  ctx.ellipse(x, y + 2 * s, 9 * s, 2.2 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x, y, 4.6 * s, 3.4 * s, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#c8322f";
  ctx.fillRect(x - 4.6 * s, y - 0.6 * s, 9.2 * s, 1.4 * s);
}

/**
 * Dromedário andando para a direita, com `base` no chão: as pernas compridas de joelho grosso no passo de andadura
 * (as duas do mesmo lado juntas), as patas largas, a corcova com a manta franjada, o pescoço em curva, a cabeça de
 * beiço caído e a cauda com o tufo; e o turista sentado na manta, balançando. `passo` é a fase da caminhada.
 */
function dromedario(ctx: Ctx, x: number, base: number, s: number, passo: number, manta: string, camisa: string) {
  const pelo = "#c89a64";
  const escuro = "#a07a4a";
  const balanca = Math.sin(passo * 2) * 1.4;
  ctx.save();
  ctx.translate(x, base);
  ctx.scale(s, s);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // as pernas: coxa até o joelho e canela até a pata; as do lado de lá, mais escuras
  const perna = (px: number, fase: number, cor: string) => {
    const a = Math.sin(passo + fase) * 0.42;
    const ergue = Math.max(0, Math.cos(passo + fase));
    const jx = px + Math.sin(a) * 19;
    const jy = -40 + balanca + Math.cos(a) * 19;
    const a2 = a - ergue * 0.5;
    const fx = jx + Math.sin(a2) * 19;
    const fy = Math.min(0, jy + Math.cos(a2) * 19);
    ctx.strokeStyle = cor;
    ctx.lineWidth = 5.4;
    ctx.beginPath();
    ctx.moveTo(px, -44 + balanca);
    ctx.lineTo(jx, jy);
    ctx.stroke();
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(jx, jy);
    ctx.lineTo(fx, fy);
    ctx.stroke();
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.arc(jx, jy, 2.8, 0, Math.PI * 2);
    ctx.ellipse(fx + 1.5, fy - 1, 4.2, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  perna(-18, 0, escuro);
  perna(20, 0, escuro);
  ctx.save();
  ctx.translate(0, balanca);
  // a cauda, com o tufo, balançando
  const cauda = Math.sin(passo * 1.5) * 0.3;
  ctx.strokeStyle = pelo;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-26, -50);
  ctx.quadraticCurveTo(-32, -42, -31 + cauda * 8, -32);
  ctx.stroke();
  ctx.fillStyle = "#6a4a2a";
  ctx.beginPath();
  ctx.ellipse(-31 + cauda * 8, -31, 2, 3.6, cauda, 0, Math.PI * 2);
  ctx.fill();
  // o corpo e a corcova
  ctx.fillStyle = pelo;
  ctx.beginPath();
  ctx.moveTo(-27, -48);
  ctx.quadraticCurveTo(-26, -58, -16, -60);
  ctx.quadraticCurveTo(-6, -80, 8, -62);
  ctx.quadraticCurveTo(22, -60, 26, -52);
  ctx.quadraticCurveTo(28, -40, 18, -38);
  ctx.quadraticCurveTo(0, -35, -20, -38);
  ctx.quadraticCurveTo(-28, -40, -27, -48);
  ctx.fill();
  // a barriga mais clara e a sombra embaixo
  ctx.fillStyle = "rgba(255,240,210,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, -41, 18, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // o pescoço em curva: desce do peito e sobe até a cabeça
  ctx.strokeStyle = pelo;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(20, -52);
  ctx.quadraticCurveTo(40, -50, 40, -64);
  ctx.lineTo(42, -72);
  ctx.stroke();
  // a cabeça comprida, o beiço caído, a orelha, o olho de pálpebra pesada e a narina
  ctx.save();
  ctx.translate(44, -75);
  ctx.rotate(0.28 + Math.sin(passo * 2 + 1) * 0.04);
  ctx.fillStyle = pelo;
  ctx.beginPath();
  ctx.ellipse(4, 0, 10, 5.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(12, 3.4, 4, 2.6, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = escuro;
  ctx.beginPath();
  ctx.moveTo(-2, -4);
  ctx.lineTo(-4, -9);
  ctx.lineTo(1, -5);
  ctx.fill();
  ctx.fillStyle = "#2a1a10";
  ctx.beginPath();
  ctx.arc(3, -1.5, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(12, -0.5, 1.6, 1);
  ctx.strokeStyle = escuro;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(1, -3);
  ctx.lineTo(5, -3.2);
  ctx.stroke();
  ctx.restore();
  // a manta franjada em cima da corcova, com o cabeçote da sela
  ctx.fillStyle = manta;
  ctx.beginPath();
  ctx.moveTo(-16, -60);
  ctx.quadraticCurveTo(-6, -79, 8, -62);
  ctx.lineTo(10, -48);
  ctx.lineTo(-16, -48);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffd23a";
  ctx.fillRect(-16, -51, 26, 2.4);
  ctx.strokeStyle = "#ffd23a";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let fx = -15; fx <= 9; fx += 3) {
    ctx.moveTo(fx, -48.5);
    ctx.lineTo(fx + Math.sin(passo * 2 + fx) * 0.8, -45);
  }
  ctx.stroke();
  // o turista sentado, com a perna caída do lado e a mão no cabeçote
  ctx.strokeStyle = "#2a3a5a";
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(-4, -72);
  ctx.lineTo(3, -60);
  ctx.lineTo(1, -50);
  ctx.stroke();
  ctx.fillStyle = "#3a2a20";
  ctx.beginPath();
  ctx.ellipse(2.5, -49, 3, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = camisa;
  ctx.lineWidth = 5.4;
  ctx.beginPath();
  ctx.moveTo(-4, -72);
  ctx.lineTo(-3 + balanca * 0.6, -86);
  ctx.stroke();
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-3 + balanca * 0.6, -84);
  ctx.lineTo(4, -78);
  ctx.lineTo(8, -74);
  ctx.stroke();
  ctx.fillStyle = "#e8b48a";
  ctx.beginPath();
  ctx.arc(-2.5 + balanca * 0.6, -91, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  chapeuDePalha(ctx, -2.5 + balanca * 0.6, -94 + balanca, 0.8);
  ctx.restore();
  // as pernas do lado de cá, por cima do corpo
  ctx.save();
  ctx.translate(x, base);
  ctx.scale(s, s);
  ctx.lineCap = "round";
  const pelo2 = pelo;
  const pernaFrente = (px: number) => {
    const a = Math.sin(passo + Math.PI) * 0.42;
    const ergue = Math.max(0, Math.cos(passo + Math.PI));
    const jx = px + Math.sin(a) * 19;
    const jy = -40 + balanca + Math.cos(a) * 19;
    const a2 = a - ergue * 0.5;
    const fx = jx + Math.sin(a2) * 19;
    const fy = Math.min(0, jy + Math.cos(a2) * 19);
    ctx.strokeStyle = pelo2;
    ctx.lineWidth = 5.6;
    ctx.beginPath();
    ctx.moveTo(px, -46 + balanca);
    ctx.lineTo(jx, jy);
    ctx.stroke();
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.moveTo(jx, jy);
    ctx.lineTo(fx, fy);
    ctx.stroke();
    ctx.fillStyle = pelo2;
    ctx.beginPath();
    ctx.arc(jx, jy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = escuro;
    ctx.beginPath();
    ctx.ellipse(fx + 1.5, fy - 1, 4.4, 1.9, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  pernaFrente(-13);
  pernaFrente(24);
  ctx.restore();
}

export const RN: Tema = {
  id: "rn",
  nome: "Rio Grande do Norte",
  descricao: "O Forte dos Reis Magos, o Morro do Careca, as dunas de Genipabu com os buggies e o cajueiro gigante.",
  grupo: "estados",
  amostra: "linear-gradient(135deg, #f8e0ae 50%, #1aa0c8 50%)",
  onda: "square",
  somBase: 330,
  climaFixo: "limpo",
  capitel: "dorico",
  paleta: {
    ceu: [["#f0a07a", "#ffe0b4"], ["#2a9ae8", "#cff0fc"], ["#4a4a9a", "#f6a058"], ["#06143a", "#1e3c6e"]],
    longe: DUNA,
    perto: MATA,
    chao: "#f8e0ae",
    chaoLinha: "#d8bc88",
    coluna: { corpo: "#d0bc98", sombra: "#a8946e", luz: "#e8d8b6", contorno: "#4a3a22" },
    maleta: { corpo: "#e8742a", escuro: "#7a3410", fivela: "#ffffff", alca: "#7a3410" },
    asa: { cor: "#ffffff", contorno: "#1aa0c8" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: ["#f8e0ae", "#1aa0c8", "#ffffff"],
    recorde: {
      cor: "#ffa81a", traco: [12, 2, 4, 2], largura: 3.5,
      aviso: { texto: "NOVO RECORDE!", fonte: "800 28px system-ui, sans-serif", corTexto: "#ffffff", corContorno: "#5a2a0a", corFundo: "rgba(232,116,42,0.92)", anima: "pulsa" },
    },
    hud: "#2a1a0a",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // a caravana de dromedários de Genipabu atravessando as dunas: o guia a pé puxa a corda do primeiro, e os turistas
    // vão sentados na manta, balançando no passo
    const x0 = atravessa(w, f, 300);
    const base = h - 46;
    const passo = t * 3.4;
    // o guia, de chapéu de palha, puxando a corda
    const mao = figura(ctx, x0 + 92, base, 0.95, "#4a3020", {
      bracoD: -1.1,
      bracoE: Math.sin(passo + 1.6) * 0.5,
      pernaE: Math.sin(passo) * 0.5,
      pernaD: -Math.sin(passo) * 0.5,
      dobra: 0.2,
    });
    chapeuDePalha(ctx, x0 + 92, base - 42, 0.95);
    ctx.strokeStyle = "#e8d8b0";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(mao[0], mao[1]);
    ctx.quadraticCurveTo(x0 + 72, base - 40, x0 + 54, base - 66);
    ctx.stroke();
    const mantas = ["#c8322f", "#2a7ab0", "#e8a02a"];
    const camisas = ["#ffffff", "#ff7a5a", "#5ac8a0"];
    for (let i = 0; i < 3; i++) {
      dromedario(ctx, x0 - i * 112, base, 1, passo + i * 1.3, mantas[i]!, camisas[i]!);
    }
  },
  decor(ctx, w, h, off, tod, t) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.25, h * 0.14, 20);
    else sol(ctx, w * 0.25, h * 0.15, 28, "#fff6dc", "rgba(255,240,190,0.55)");
    const yMar = h - 190;
    mar(ctx, w, yMar, 80, off * 0.06, ciclo(MAR, tod), "rgba(255,255,255,0.55)", t);
    // o Morro do Careca: a duna grande com o topo pelado e a mata em volta
    const duna = ciclo(DUNA, tod);
    const sombraDuna = ciclo(DUNA_SOMBRA, tod);
    const mata = ciclo(MATA, tod);
    repetir(w, off * 0.08, 1300, (x) => {
      ctx.fillStyle = mata;
      ctx.beginPath();
      ctx.moveTo(x + 100, yMar + 20);
      ctx.quadraticCurveTo(x + 300, yMar - 220, x + 500, yMar + 20);
      ctx.fill();
      ctx.fillStyle = duna;
      ctx.beginPath();
      ctx.moveTo(x + 200, yMar + 20);
      ctx.quadraticCurveTo(x + 260, yMar - 130, x + 300, yMar - 116);
      ctx.quadraticCurveTo(x + 330, yMar - 100, x + 380, yMar + 20);
      ctx.fill();
      // o forte na boca do rio, sobre o arrecife
      forte(ctx, x + 760, yMar + 40, ciclo(FORTE, tod), ciclo(FORTE_SOMBRA, tod));
    });
    // as dunas de Genipabu, com os buggies; a areia vai do pé delas até o chão (antes ficava uma faixa de céu ali)
    ctx.fillStyle = duna;
    ctx.fillRect(0, h - 71, w, 32);
    dunas(ctx, w, h - 70, off * 0.18, 100, duna, sombraDuna, 300);
    repetir(w, off * 0.2 - t * 30, 420, (x, k) => {
      const bx = x + variar(k, 31, 100);
      buggy(ctx, bx, h - 108 + Math.sin(bx * 0.02) * 18, ["#e8333a", "#ffd21a", "#2a8ae8"][variar(k, 7, 3)], t);
    });
    // o cajueiro gigante, de galhos espalhados, e os cajus
    const copa = ciclo(CAJUEIRO, tod);
    repetir(w, off * 0.34, 900, (x) => {
      ctx.fillStyle = copa;
      for (let i = 0; i < 9; i++) {
        ctx.beginPath();
        ctx.ellipse(x + 100 + i * 44, h - 78 - Math.sin((i / 8) * Math.PI) * 20 - variar(i, 7, 3) * 6, 32, 20, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#5a3a24";
      for (let i = 0; i < 4; i++) ctx.fillRect(x + 140 + i * 100, h - 70, 7, 30);
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = i % 2 ? "#ffcf2a" : "#e8333a";
        ctx.beginPath();
        ctx.ellipse(x + 110 + i * 32, h - 66 - variar(i, 5, 3) * 8, 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#e2c09e", "#4e443e"], tod);
    ctx.fillRect(0, y, w, h - y);
    // trilhas de pneu na areia
    ctx.strokeStyle = "rgba(140,100,50,0.35)";
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, y + 12);
    ctx.lineTo(w, y + 12);
    ctx.moveTo(0, y + 24);
    ctx.lineTo(w, y + 24);
    ctx.lineDashOffset = off % 6;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // muralha de pedra do forte: blocos grandes e as seteiras
    ctx.fillStyle = c.corpo;
    ctx.fillRect(x0, 0, w, len);
    ctx.strokeStyle = c.sombra;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let y = 18, fila = 0; y < len; y += 18, fila++) {
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + w, y);
      for (let x = x0 + (fila % 2 ? 12 : 24); x < x0 + w; x += 26) {
        ctx.moveTo(x, y - 18);
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.fillStyle = "#2a2016";
    for (let y = 70 + variante * 30; y < len - 20; y += 120) {
      ctx.fillRect(-2.5, y, 5, 22);
      ctx.fillRect(-7, y + 8, 14, 5);
    }
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(x0 + w - 8, 0, 8, len);
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = c.luz;
      ctx.beginPath();
      ctx.moveTo(x0, 14);
      ctx.lineTo(x0 + w * 0.3, 14);
      ctx.lineTo(x0 + w * 0.3, 4);
      ctx.lineTo(x0 + w * 0.65, 4);
      ctx.lineTo(x0 + w * 0.65, 0);
      ctx.lineTo(x0 + w, 0);
      ctx.lineTo(x0 + w, 18);
      ctx.lineTo(x0, 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // o parapeito com as canhoneiras
    ctx.fillStyle = c.luz;
    ctx.fillRect(x0 - 4, 0, w + 8, 14);
    ctx.strokeRect(x0 - 4, 0, w + 8, 14);
    ctx.fillStyle = "#2a2016";
    for (let x = x0 + 8; x < x0 + w - 6; x += 20) ctx.fillRect(x, 4, 8, 6);
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => oculosBuggy(c, t));
  },
};
