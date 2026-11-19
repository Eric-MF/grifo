// Distrito Federal: Brasília, com as cúpulas e as torres do Congresso, a Catedral de coroa, os blocos da Esplanada,
// os ipês floridos do cerrado e as colunas nos pilares curvos do Palácio da Alvorada.
import { ciclo, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, lua, noiteDe, repetir, sol } from "../kit";

// cores por hora do dia (amanhecer, dia, entardecer, noite); céu seco e alto do Planalto Central
const CONCRETO = ["#ece4dc", "#f6f4f0", "#e6d6d4", "#5a5a72"];
const CONCRETO_SOMBRA = ["#c8bcb8", "#d4d0cc", "#bca8b4", "#3a3a52"];
const VIDRO = ["#6a8aa8", "#5a94c0", "#5a6094", "#18244a"];
const GRAMA = ["#a8a85a", "#a4ac58", "#8a8456", "#1e2216"];
const CERRADO = ["#6a7a4a", "#62824a", "#5a5a48", "#10180e"];

/** Congresso Nacional: a laje, as duas cúpulas (uma para cima, outra para baixo) e as torres gêmeas. */
function congresso(ctx: Ctx, x: number, base: number, cor: string, sombra: string, acesas: number) {
  ctx.fillStyle = sombra;
  ctx.fillRect(x - 10, base - 18, 300, 18);
  ctx.fillStyle = cor;
  ctx.fillRect(x - 20, base - 24, 320, 7);
  // cúpula da Câmara (para cima) e do Senado (emborcada)
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
  // as torres, com a passarela
  ctx.fillRect(x + 122, base - 168, 18, 144);
  ctx.fillRect(x + 146, base - 168, 18, 144);
  ctx.fillRect(x + 140, base - 132, 6, 8);
  ctx.fillStyle = acesas > 0.3 ? "#ffe2a0" : sombra;
  for (let y = base - 162; y < base - 30; y += 8) {
    ctx.fillRect(x + 125, y, 12, 3);
    ctx.fillRect(x + 149, y, 12, 3);
  }
}

/** Catedral de Brasília: a coroa de pilares curvos, com os vitrais entre eles. */
function catedral(ctx: Ctx, x: number, base: number, cor: string, vidro: string) {
  ctx.fillStyle = vidro;
  ctx.beginPath();
  ctx.moveTo(x - 30, base);
  ctx.lineTo(x - 14, base - 60);
  ctx.lineTo(x + 14, base - 60);
  ctx.lineTo(x + 30, base);
  ctx.fill();
  ctx.strokeStyle = cor;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = -4; i <= 4; i++) {
    const bx = x + i * 8;
    ctx.moveTo(bx, base);
    ctx.quadraticCurveTo(x + i * 2, base - 44, x + i * 5.5, base - 76);
  }
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, base - 78);
  ctx.lineTo(x, base - 96);
  ctx.moveTo(x - 6, base - 90);
  ctx.lineTo(x + 6, base - 90);
  ctx.stroke();
}

/** Ipê florido: tronco torto e a copa de flores. */
function ipe(ctx: Ctx, x: number, base: number, s: number, flor: string, tronco: string) {
  ctx.strokeStyle = tronco;
  ctx.lineWidth = 3 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.quadraticCurveTo(x - 4 * s, base - 16 * s, x + 2 * s, base - 28 * s);
  ctx.moveTo(x + 1 * s, base - 22 * s);
  ctx.lineTo(x + 10 * s, base - 32 * s);
  ctx.stroke();
  ctx.fillStyle = flor;
  for (const [dx, dy, r] of [[-10, -34, 9], [2, -40, 11], [13, -34, 9], [-2, -30, 8], [8, -27, 7]]) {
    ctx.beginPath();
    ctx.arc(x + dx * s, base + dy * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Crachá pendurado na alça e a gravata. */
function cracha(c: Ctx, t: number) {
  const bal = Math.sin(t * 6) * 0.15;
  c.strokeStyle = "#2a5ab8";
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(-6, -22);
  c.lineTo(-10, -4);
  c.moveTo(6, -22);
  c.lineTo(-6, -4);
  c.stroke();
  c.save();
  c.translate(-8, -4);
  c.rotate(bal);
  c.fillStyle = "#ffffff";
  c.strokeStyle = "#2a5ab8";
  c.fillRect(-6, 0, 12, 15);
  c.strokeRect(-6, 0, 12, 15);
  c.fillStyle = "#2a5ab8";
  c.fillRect(-6, 0, 12, 4);
  c.fillStyle = "#9a9aa8";
  c.fillRect(-3.5, 6, 7, 5);
  c.restore();
  // a gravata
  c.fillStyle = "#c8322f";
  c.beginPath();
  c.moveTo(10, -16);
  c.lineTo(15, -16);
  c.lineTo(14, -12);
  c.lineTo(16, 4);
  c.lineTo(12.5, 8);
  c.lineTo(9, 4);
  c.lineTo(11, -12);
  c.closePath();
  c.fill();
}

export const DF: Tema = {
  id: "df",
  nome: "Distrito Federal",
  descricao: "Brasília: o Congresso, a Catedral de coroa, a Esplanada, os ipês e os pilares curvos do Alvorada.",
  grupo: "estados",
  amostra: "linear-gradient(135deg, #f6f4f0 50%, #e8c43a 50%)",
  onda: "sine",
  somBase: 392,
  climaFixo: "limpo",
  capitel: "dorico",
  paleta: {
    ceu: [["#f0a888", "#ffe4c4"], ["#2a8ae0", "#cfe8fa"], ["#4a4aa0", "#f6a060"], ["#06123a", "#1e3a72"]],
    longe: CERRADO,
    perto: CERRADO,
    chao: "#a4ac58",
    chaoLinha: "#6a7034",
    coluna: { corpo: "#f4f2ee", sombra: "#c8c2bc", luz: "#ffffff", contorno: "#5a5a64" },
    maleta: { corpo: "#3a3a48", escuro: "#16161e", fivela: "#e8c43a", alca: "#16161e" },
    asa: { cor: "#ffffff", contorno: "#2a5ab8" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: ["#e8c43a", "#ffffff", "#2a8ae0"],
    recorde: {
      cor: "#2a5ab8", traco: [20, 4], largura: 3,
      aviso: { texto: "NOVO RECORDE APROVADO!", fonte: "800 24px system-ui, sans-serif", corTexto: "#ffffff", corContorno: "#0a1a4a", corFundo: "rgba(42,90,184,0.92)", anima: "pulsa" },
    },
    hud: "#0e1a3a",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f) {
    // um avião atravessa o céu: o Plano Piloto de Brasília tem forma de avião
    const x = atravessa(w, f, 200);
    const y = h * 0.2 + Math.sin(f * Math.PI) * -20;
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 30, y);
    ctx.lineTo(Math.max(-20, x - 400), y + 6);
    ctx.stroke();
    ctx.fillStyle = "#f6f4f0";
    ctx.strokeStyle = "#5a5a64";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 40, y);
    ctx.quadraticCurveTo(x + 30, y - 6, x - 30, y - 4);
    ctx.lineTo(x - 36, y);
    ctx.lineTo(x - 30, y + 4);
    ctx.quadraticCurveTo(x + 30, y + 6, x + 40, y);
    ctx.fill();
    ctx.stroke();
    // as asas arqueadas, como as do Eixo Rodoviário
    ctx.beginPath();
    ctx.moveTo(x + 6, y - 2);
    ctx.quadraticCurveTo(x - 6, y - 30, x - 18, y - 34);
    ctx.lineTo(x - 12, y - 2);
    ctx.moveTo(x + 6, y + 2);
    ctx.quadraticCurveTo(x - 6, y + 30, x - 18, y + 34);
    ctx.lineTo(x - 12, y + 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#2a5ab8";
    ctx.fillRect(x - 34, y - 12, 6, 10);
  },
  decor(ctx, w, h, off, tod, t) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.7, h * 0.14, 22);
    else sol(ctx, w * 0.7, h * 0.15, 26, "#fff6dc", "rgba(255,236,180,0.45)");
    // nuvens altas e finas do céu seco
    ctx.fillStyle = ciclo(["#ffe8dc", "#ffffff", "#f6d0c8", "#3a4a78"], tod);
    ctx.globalAlpha = 0.5;
    repetir(w, off * 0.02 + t * 4, 420, (x, k) => {
      ctx.beginPath();
      ctx.ellipse(x + 200, h * (0.12 + variar(k, 7, 3) * 0.05), 120, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    // a linha reta do horizonte do Planalto
    const cerrado = ciclo(CERRADO, tod);
    ctx.fillStyle = cerrado;
    ctx.fillRect(0, h - 110, w, 70);
    const cor = ciclo(CONCRETO, tod);
    const sombra = ciclo(CONCRETO_SOMBRA, tod);
    const vidro = ciclo(VIDRO, tod);
    // os blocos dos ministérios, em fila na Esplanada
    repetir(w, off * 0.1, 64, (x) => {
      ctx.fillStyle = sombra;
      ctx.fillRect(x, h - 160, 22, 50);
      ctx.fillStyle = vidro;
      for (let y = h - 156; y < h - 114; y += 6) ctx.fillRect(x + 2, y, 18, 3);
      if (noite > 0.3) {
        ctx.fillStyle = "#ffe2a0";
        ctx.globalAlpha = noite * 0.6;
        for (let y = h - 156; y < h - 114; y += 12) ctx.fillRect(x + 2, y, 18, 3);
        ctx.globalAlpha = 1;
      }
    });
    repetir(w, off * 0.14, 1300, (x) => {
      congresso(ctx, x + 300, h - 110, cor, sombra, noite);
      // o espelho d'água refletindo as cúpulas
      ctx.fillStyle = vidro;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(x + 280, h - 110, 340, 8);
      ctx.globalAlpha = 1;
      catedral(ctx, x + 900, h - 110, cor, vidro);
    });
    // gramado e ipês
    ctx.fillStyle = ciclo(GRAMA, tod);
    ctx.fillRect(0, h - 104, w, 64);
    const flores = [ciclo(["#ffd23a", "#ffd21a", "#e8b030", "#4a4020"], tod), ciclo(["#ff8ac8", "#ff7ab8", "#d86aa8", "#40203a"], tod), ciclo(["#ffffff", "#ffffff", "#f0e0e8", "#4a4a5a"], tod)];
    const tronco = ciclo(["#4a3a2a", "#4a3a2a", "#3e302a", "#100c0a"], tod);
    repetir(w, off * 0.3, 140, (x, k) => {
      if (variar(k, 5, 3) === 0) return;
      ipe(ctx, x + variar(k, 29, 60), h - 52, 1.6 + variar(k, 7, 3) * 0.2, flores[variar(k, 11, 3)], tronco);
    });
    // as flores de ipê caindo, levadas pelo vento seco
    const volta = w + 40;
    for (let i = 0; i < 16; i++) {
      const q = (((t * 0.14 + i * 0.137) % 1) + 1) % 1;
      const px = ((((i * 211 - off * 0.3 - t * 18) % volta) + volta) % volta) - 20;
      ctx.save();
      ctx.translate(px + Math.sin(t * 2 + i) * 6, h - 128 + q * 84);
      ctx.rotate(t * 2 + i);
      ctx.fillStyle = flores[i % 3];
      ctx.fillRect(-2.5, -1.5, 5, 3);
      ctx.restore();
    }
  },
  chao(ctx, w, h, y, off, tema, tod) {
    // o Eixo Monumental: asfalto e o canteiro
    ctx.fillStyle = ciclo(["#6a6a70", "#707078", "#5e5a66", "#20202a"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = ciclo([tema.paleta.chao, tema.paleta.chao, "#8a8456", "#1e2216"], tod);
    ctx.fillRect(0, y, w, 6);
    ctx.fillStyle = "#f0f0f0";
    for (let x = -(off % 50); x < w; x += 50) ctx.fillRect(x + 10, y + 20, 26, 3);
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // pilar do Alvorada: o fuste branco que afina e abre em curva, como uma vela
    const pilar = (y0: number, y1: number) => {
      ctx.beginPath();
      ctx.moveTo(x0 + 6, y0);
      ctx.bezierCurveTo(x0 + 4, y0 + (y1 - y0) * 0.35, x0 + w * 0.36, y0 + (y1 - y0) * 0.55, x0 + w * 0.4, y1);
      ctx.lineTo(x0 + w * 0.6, y1);
      ctx.bezierCurveTo(x0 + w * 0.64, y0 + (y1 - y0) * 0.55, x0 + w - 4, y0 + (y1 - y0) * 0.35, x0 + w - 6, y0);
      ctx.closePath();
    };
    // fundo de vidro escuro (a fachada atrás dos pilares); os pilares não passam da ponta
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, 0, w, len);
    ctx.clip();
    ctx.fillStyle = "#2a3a5a";
    ctx.fillRect(x0, 0, w, len);
    ctx.fillStyle = "rgba(160,200,240,0.25)";
    for (let y = 8; y < len; y += 20) ctx.fillRect(x0, y, w, 2);
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, c.luz);
    g.addColorStop(0.5, c.corpo);
    g.addColorStop(1, c.sombra);
    ctx.fillStyle = g;
    const passo = 150;
    for (let y = 10 + ((variante * 40) % passo) - passo; y < len; y += passo) {
      pilar(y, y + passo / 2);
      ctx.fill();
      pilar(y + passo, y + passo / 2);
      ctx.fill();
    }
    ctx.restore();
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
    // a laje branca fina, sem ornamento
    ctx.fillStyle = c.luz;
    ctx.fillRect(x0 - 8, 0, w + 16, 9);
    ctx.strokeRect(x0 - 8, 0, w + 16, 9);
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => cracha(c, t));
  },
};
