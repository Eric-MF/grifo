// São João (24/6): a noite de arraial, com as bandeirinhas, a fogueira, a quadrilha dançando, o sanfoneiro e o milho
// assando. Sem balão: soltar balão é crime ambiental (art. 42 da Lei 9.605/1998). Na maleta, o chapéu de palha remendado.
import { ciclo, colinas, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, estrelasFixas, figura, letreiro, lua, repetir, surge } from "../kit";

const BANDEIRINHAS = ["#e8333a", "#ffd21a", "#2a8ae8", "#2fbf5a", "#ff7ab0", "#ff8a1a"];
// cores por hora do dia (amanhecer, dia, entardecer, noite); é sempre noite de festa
const MORRO = ["#1e1a3a", "#1c1a38", "#201838", "#0e0c20"];
const CASAS = ["#3a2a4a", "#382a48", "#3a2846", "#1a1226"];
const GENTE = ["#1a1220", "#1a1222", "#18101e", "#08060a"];

/** Fogueira: a lenha cruzada e as labaredas que dançam, com as fagulhas subindo. */
function fogueira(ctx: Ctx, x: number, base: number, t: number) {
  const g = ctx.createRadialGradient(x, base - 20, 4, x, base - 20, 90);
  g.addColorStop(0, "rgba(255,170,60,0.45)");
  g.addColorStop(1, "rgba(255,120,40,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - 90, base - 110, 180, 120);
  ctx.strokeStyle = "#4a2a14";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 26, base);
  ctx.lineTo(x + 10, base - 40);
  ctx.moveTo(x + 26, base);
  ctx.lineTo(x - 10, base - 40);
  ctx.moveTo(x - 20, base - 6);
  ctx.lineTo(x + 20, base - 6);
  ctx.stroke();
  for (const [cor, esc] of [["#ff5a1a", 1], ["#ffb21a", 0.7], ["#fff08a", 0.4]] as const) {
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.moveTo(x - 22 * esc, base - 6);
    for (let i = 0; i <= 6; i++) {
      const fx = x - 22 * esc + (i * 44 * esc) / 6;
      const alto = (i % 2 ? 40 : 60) * esc + Math.sin(t * 9 + i * 2) * 8 * esc;
      ctx.quadraticCurveTo(fx - 4 * esc, base - 20 - alto * 0.5, fx, base - 6 - alto);
    }
    ctx.lineTo(x + 22 * esc, base - 6);
    ctx.fill();
  }
  ctx.fillStyle = "#ffd86a";
  for (let i = 0; i < 6; i++) {
    const f = (((t * 0.9 + i / 6) % 1) + 1) % 1;
    ctx.globalAlpha = 1 - f;
    ctx.fillRect(x - 10 + Math.sin(i * 3 + t) * 16, base - 60 - f * 80, 2, 2);
  }
  ctx.globalAlpha = 1;
}

/** Cordão de bandeirinhas de papel entre dois postes, balançando. */
function bandeirinhas(ctx: Ctx, x0: number, x1: number, y: number, fl: number, t: number, k: number) {
  ctx.strokeStyle = "#c8b48a";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.quadraticCurveTo((x0 + x1) / 2, y + fl * 2, x1, y);
  ctx.stroke();
  const n = Math.floor((x1 - x0) / 14);
  for (let i = 1; i < n; i++) {
    const f = i / n;
    const bx = x0 + f * (x1 - x0);
    const by = y + Math.sin(f * Math.PI) * fl;
    const bal = Math.sin(t * 4 + i + k) * 1.5;
    ctx.fillStyle = BANDEIRINHAS[(i + k) % BANDEIRINHAS.length];
    ctx.beginPath();
    ctx.moveTo(bx - 5, by);
    ctx.lineTo(bx + 5, by);
    ctx.lineTo(bx + 5 + bal * 0.3, by + 11);
    ctx.lineTo(bx + bal * 0.3, by + 7);
    ctx.lineTo(bx - 5 + bal * 0.3, by + 11);
    ctx.closePath();
    ctx.fill();
  }
}

/** Chapéu de palha de festa junina, com os remendos coloridos e a franja. */
function chapeuJunino(c: Ctx) {
  c.save();
  c.translate(-6, -21);
  c.rotate(-0.12);
  c.fillStyle = "#e8c87a";
  c.strokeStyle = "#a8843a";
  c.lineWidth = 1;
  c.beginPath();
  c.ellipse(0, 2, 16, 3.6, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(-8, 2);
  c.quadraticCurveTo(-6, -12, 0, -12);
  c.quadraticCurveTo(6, -12, 8, 2);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = "#e8333a";
  c.fillRect(-5, -6, 4, 4);
  c.fillStyle = "#2a8ae8";
  c.fillRect(2, -9, 4, 4);
  c.strokeStyle = "#a8843a";
  c.beginPath();
  for (let x = -15; x <= 15; x += 3) {
    c.moveTo(x, 3);
    c.lineTo(x, 6);
  }
  c.stroke();
  c.restore();
}

export const SAO_JOAO: Tema = {
  id: "sao-joao",
  nome: "São João",
  descricao: "24 de junho: noite de arraial, com bandeirinhas, a fogueira, a quadrilha e o sanfoneiro (e nada de balão).",
  grupo: "festas",
  janela: { tipo: "fixa", dia: 24, mes: 6 },
  amostra: "linear-gradient(135deg, #e8333a 25%, #ffd21a 25% 50%, #2a8ae8 50% 75%, #2fbf5a 75%)",
  onda: "triangle",
  somBase: 392,
  climaFixo: "limpo",
  paleta: {
    // é sempre noite de festa
    ceu: [["#1a1640", "#4a2a5a"], ["#101a4a", "#2e2a6a"], ["#1e1240", "#5a2a5a"], ["#06081e", "#1a1a40"]],
    longe: MORRO,
    perto: GENTE,
    chao: "#6a4a2a",
    chaoLinha: "#4a3018",
    coluna: { corpo: "#a8743a", sombra: "#7a5226", luz: "#c8945a", contorno: "#3a2410" },
    maleta: { corpo: "#c8322f", escuro: "#6a1414", fivela: "#ffd21a", alca: "#6a1414" },
    asa: { cor: "#fff4d6", contorno: "#c8322f" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: BANDEIRINHAS,
    recorde: {
      cor: "#ffb21a", traco: [7, 3, 7, 3, 1, 3], largura: 3.5,
      aviso: { texto: "ARRAIÁ DO RECORDE!", fonte: "800 26px Georgia, serif", corTexto: "#ffd21a", corContorno: "#3a0a0a", corFundo: "rgba(200,50,47,0.92)", anima: "treme" },
    },
    hud: "#fff4d6",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // "Olha a cobra!": a cobrinha de mentira atravessa o arraial, e a quadrilha grita
    const x = atravessa(w, f, 180);
    const base = h - 50;
    ctx.strokeStyle = "#2fbf5a";
    ctx.lineWidth = 11;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i <= 18; i++) {
      const px = x - i * 8;
      const py = base + Math.sin(i * 0.7 - t * 10) * 7;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    // as listras amarelas, a cabeça e a língua
    ctx.strokeStyle = "#ffd21a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 2; i <= 18; i += 3) {
      const px = x - i * 8;
      const py = base + Math.sin(i * 0.7 - t * 10) * 7;
      ctx.moveTo(px, py - 5);
      ctx.lineTo(px, py + 5);
    }
    ctx.stroke();
    ctx.fillStyle = "#2fbf5a";
    ctx.beginPath();
    ctx.ellipse(x + 4, base, 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(x + 6, base - 4, 2.4, 2.4);
    ctx.fillStyle = "#e8333a";
    ctx.fillRect(x + 13, base - 1, 8, 2);
  },
  surpresaFrente(ctx, w, h, f) {
    ctx.globalAlpha = surge(f);
    letreiro(ctx, "OLHA A COBRA!", w / 2, h * 0.34, 42, "#ffd21a", "#3a0a0a", "800 {t}px Georgia, serif");
    if (f > 0.55) letreiro(ctx, "É MENTIRA!", w / 2, h * 0.34 + 50, 28, "#ffffff", "#3a0a0a", "800 {t}px Georgia, serif");
  },
  decor(ctx, w, h, off, tod, t) {
    estrelasFixas(ctx, w, h, t, "#ffffff", 60, 0.5);
    lua(ctx, w * 0.78, h * 0.15, 22);
    colinas(ctx, w, h - 40, off * 0.04, ciclo(MORRO, tod), 150, 30, 0.006, 2);
    // as casinhas da cidade, com janelas acesas
    const casas = ciclo(CASAS, tod);
    repetir(w, off * 0.1, 80, (x, k) => {
      ctx.fillStyle = casas;
      ctx.fillRect(x, h - 170, 66, 50);
      ctx.beginPath();
      ctx.moveTo(x - 4, h - 170);
      ctx.lineTo(x + 33, h - 192);
      ctx.lineTo(x + 70, h - 170);
      ctx.fill();
      ctx.fillStyle = "#ffd98a";
      if (variar(k, 3, 2)) ctx.fillRect(x + 10, h - 158, 12, 12);
      ctx.fillRect(x + 42, h - 158, 12, 12);
    });
    // o arraial: postes, os cordões de bandeirinhas e a barraca de milho
    ctx.fillStyle = "#4a3420";
    ctx.fillRect(0, h - 120, w, 80);
    repetir(w, off * 0.24, 240, (x, k) => {
      ctx.fillStyle = "#3a2a1a";
      ctx.fillRect(x, h - 220, 4, 100);
      bandeirinhas(ctx, x + 2, x + 242, h - 216, 18, t, k);
      bandeirinhas(ctx, x + 2, x + 242, h - 196, 12, t, k + 2);
    });
    repetir(w, off * 0.28, 900, (x) => {
      // a barraca de milho e pamonha
      ctx.fillStyle = "#c8322f";
      ctx.beginPath();
      ctx.moveTo(x + 600, h - 160);
      ctx.lineTo(x + 640, h - 180);
      ctx.lineTo(x + 680, h - 160);
      ctx.fill();
      ctx.fillStyle = "#e8c87a";
      ctx.fillRect(x + 606, h - 160, 68, 40);
      ctx.fillStyle = "#ffd21a";
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.ellipse(x + 616 + i * 15, h - 128, 3, 7, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    // a fogueira e a quadrilha em volta
    repetir(w, off * 0.36, 800, (x) => fogueira(ctx, x + 400, h - 44, t));
    const gente = ciclo(GENTE, tod);
    repetir(w, off * 0.42, 130, (x, k) => {
      const passo = Math.sin(t * 5 + k) * 0.5;
      const px = x + variar(k, 31, 40);
      if (variar(k, 7, 5) === 0) {
        // o sanfoneiro
        figura(ctx, px, h - 42, 1, gente, { bracoE: 1.2, bracoD: -1.2 });
        ctx.fillStyle = "#c8322f";
        ctx.fillRect(px - 9, h - 74 + Math.sin(t * 6) * 1.5, 18, 12);
        ctx.fillStyle = "#ffffff";
        for (let i = 0; i < 4; i++) ctx.fillRect(px - 8 + i * 4.5, h - 72 + Math.sin(t * 6) * 1.5, 2, 8);
        return;
      }
      // os pares de mãos dadas
      figura(ctx, px, h - 42, 1, gente, { bracoE: -0.6, bracoD: 1.5, pernaE: passo, pernaD: -passo });
      figura(ctx, px + 22, h - 42, 1, gente, { bracoE: -1.5, bracoD: 0.6, pernaE: -passo, pernaD: passo });
      ctx.fillStyle = BANDEIRINHAS[k % BANDEIRINHAS.length];
      ctx.beginPath();
      ctx.moveTo(px + 17, h - 64);
      ctx.lineTo(px + 27, h - 64);
      ctx.lineTo(px + 34 + passo * 6, h - 46);
      ctx.lineTo(px + 10 + passo * 6, h - 46);
      ctx.fill();
    });
  },
  chao(ctx, w, h, y, off, tema) {
    const p = tema.paleta;
    ctx.fillStyle = p.chao;
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 3);
    // a terra batida do arraial, com palha e bandeirinhas caídas
    for (let x = -(off % 29); x < w; x += 29) {
      const k = Math.round((x + off) / 29);
      ctx.fillStyle = variar(k, 3, 2) ? "#c8a46a" : BANDEIRINHAS[variar(k, 7, BANDEIRINHAS.length)];
      ctx.save();
      ctx.translate(x + 10, y + 10 + variar(k, 11, 22));
      ctx.rotate(k);
      ctx.fillRect(-4, -1, 8, 2.4);
      ctx.restore();
    }
  },
  coluna(ctx, w, len, variante, quebrada, tema, t) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // o mastro de São João: o tronco de madeira enfeitado de fitas e bandeirinhas
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
    for (let i = 0; i < 2; i++) {
      ctx.strokeStyle = ["#ffd21a", "#e8333a"][i];
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let y = -20; y < len + 20; y += 8) {
        const x = Math.sin(y * 0.04 + i * Math.PI + variante) * (w / 2 - 6);
        if (y === -20) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // bandeirinhas presas no mastro, desviradas na coluna de cima
    const deCima = ctx.getTransform().d < 0;
    for (let y = 60 + variante * 20, i = 0; y < len; y += 90, i++) {
      ctx.save();
      ctx.translate(0, y);
      if (deCima) ctx.scale(1, -1);
      for (let j = 0; j < 4; j++) {
        const bal = Math.sin(t * 4 + i + j) * 1.2;
        ctx.fillStyle = BANDEIRINHAS[(i + j) % BANDEIRINHAS.length];
        ctx.beginPath();
        ctx.moveTo(x0 + 6 + j * 16, -6);
        ctx.lineTo(x0 + 18 + j * 16, -6);
        ctx.lineTo(x0 + 18 + j * 16 + bal, 6);
        ctx.lineTo(x0 + 12 + j * 16 + bal, 2);
        ctx.lineTo(x0 + 6 + j * 16 + bal, 6);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = "#d8b07a";
      ctx.beginPath();
      ctx.moveTo(x0, 12);
      for (let i = 0; i <= 8; i++) ctx.lineTo(x0 + (i * w) / 8, i % 2 ? 2 : 8);
      ctx.lineTo(x0 + w, 14);
      ctx.lineTo(x0, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // o topo do mastro com a bandeira do santo, rente à ponta
    ctx.fillStyle = "#d8b07a";
    ctx.fillRect(x0 - 3, 0, w + 6, 8);
    ctx.strokeRect(x0 - 3, 0, w + 6, 8);
    ctx.fillStyle = "#2a8ae8";
    ctx.fillRect(x0, 8, w, 10);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x0, 12, w, 2);
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, chapeuJunino);
  },
};
