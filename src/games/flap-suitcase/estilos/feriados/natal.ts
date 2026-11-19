// Natal (25/12): Natal tropical, numa noite quente de verão, com a árvore de luzes na praça,
// pisca-pisca nos coqueiros e nas casas, e o trenó cruzando o céu.
import { ciclo, maletaPadrao, rr, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, estrelasFixas, lua, luzinhas, palmeira, predios, repetir } from "../kit";

const LUZES = ["#ff4d4d", "#ffd24d", "#4dff88", "#4dc3ff", "#ff8af0"];
// cores por hora do dia (amanhecer, dia, entardecer, noite); aqui é sempre noite
const CIDADE = ["#1c2350", "#1a2048", "#22204a", "#0e1230"];
const COQUEIRO = ["#10243a", "#0e2236", "#141e36", "#081422"];
const CASAS = ["#2a3a6a", "#283866", "#2e3466", "#1a2448"];

/** Árvore de Natal de luzes: cone de fios em espiral e a estrela no alto. */
function arvoreDeLuzes(ctx: Ctx, x: number, base: number, alt: number, t: number) {
  const larg = alt * 0.42;
  ctx.fillStyle = "rgba(20,70,50,0.55)";
  ctx.beginPath();
  ctx.moveTo(x, base - alt);
  ctx.lineTo(x + larg, base);
  ctx.lineTo(x - larg, base);
  ctx.fill();
  const pontos: [number, number][] = [];
  for (let i = 0; i < 90; i++) {
    const k = i / 90;
    const y = base - alt + k * alt;
    const raio = larg * k;
    const ang = k * Math.PI * 14 + t * 0.6;
    if (Math.sin(ang) < -0.2) continue; // o lado de trás da espiral fica escondido
    pontos.push([x + Math.cos(ang) * raio, y]);
  }
  luzinhas(ctx, pontos, t, LUZES, 2);
  // estrela do topo
  ctx.save();
  ctx.translate(x, base - alt - 6);
  ctx.rotate(Math.sin(t) * 0.08);
  ctx.fillStyle = "#ffe066";
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 4.5 : 11;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.fill();
  ctx.restore();
}

/**
 * O trenó do Papai Noel puxado por três renas a galope. As renas têm o corpo, as patas dobrando, o pescoço erguido,
 * a orelha, o focinho e a galhada (a haste curva para trás, com as pontas); a da frente tem o nariz vermelho. No
 * trenó, o Papai Noel de gorro e o saco de presentes. `colorido` pinta tudo (o trenó da surpresa, que passa baixo);
 * sem ele, é uma silhueta no céu.
 */
function treno(ctx: Ctx, x: number, y: number, t: number, colorido = false) {
  const silhueta = "#0a0f24";
  const pelo = colorido ? "#8a5a32" : silhueta;
  const galhada = colorido ? "#d8c4a0" : silhueta;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 0; i < 3; i++) {
    const rx = x + 36 + i * 22;
    const ry = y - i * 3 + Math.sin(t * 9 + i) * 1.5;
    const galope = t * 12 + i * 1.3;
    // as patas, dobrando no galope (as de trás e as da frente se alternam)
    ctx.strokeStyle = pelo;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const [px, fase] of [[-5, 0], [-3, 0.6], [4, Math.PI], [6, Math.PI + 0.6]] as const) {
      const a = Math.sin(galope + fase);
      const jx = rx + px + a * 2.2;
      const jy = ry + 4;
      ctx.moveTo(rx + px, ry + 1.5);
      ctx.lineTo(jx, jy);
      ctx.lineTo(jx + (px > 0 ? 2.4 : -2.4) * (0.6 + a * 0.4), jy + 3.6);
    }
    ctx.stroke();
    // o corpo, o pescoço e a cabeça
    ctx.fillStyle = pelo;
    ctx.beginPath();
    ctx.ellipse(rx, ry, 7.5, 3.4, -0.08, 0, Math.PI * 2);
    ctx.moveTo(rx + 5, ry - 2);
    ctx.quadraticCurveTo(rx + 8, ry - 5, rx + 8.5, ry - 8);
    ctx.lineTo(rx + 10.5, ry - 7);
    ctx.quadraticCurveTo(rx + 9, ry - 3, rx + 6.5, ry + 0.5);
    ctx.closePath();
    ctx.moveTo(rx + 13.5, ry - 7.4);
    ctx.ellipse(rx + 11, ry - 7.6, 3, 1.7, 0.25, 0, Math.PI * 2);
    ctx.fill();
    // a orelha
    ctx.beginPath();
    ctx.moveTo(rx + 9.4, ry - 9);
    ctx.lineTo(rx + 7.4, ry - 11);
    ctx.lineTo(rx + 8.6, ry - 8.4);
    ctx.fill();
    // a galhada: duas hastes curvas para trás, cada uma com três pontas
    ctx.strokeStyle = galhada;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (const lado of [0, 1.6]) {
      const bx = rx + 10 - lado;
      const by = ry - 9;
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx - 1, by - 5, bx - 5, by - 8);
      ctx.moveTo(bx - 0.6, by - 2.6);
      ctx.lineTo(bx + 2, by - 5);
      ctx.moveTo(bx - 2, by - 5.2);
      ctx.lineTo(bx - 0.4, by - 8.4);
      ctx.moveTo(bx - 3.8, by - 7.2);
      ctx.lineTo(bx - 3.6, by - 10);
    }
    ctx.stroke();
    // o rabinho branco e, na rena da frente, o nariz vermelho
    if (colorido) {
      ctx.fillStyle = "#f4efe6";
      ctx.beginPath();
      ctx.arc(rx - 7.6, ry - 1, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (i === 2) {
      ctx.fillStyle = "#ff3a2a";
      ctx.beginPath();
      ctx.arc(rx + 13.8, ry - 7.2, 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,80,60,0.35)";
      ctx.beginPath();
      ctx.arc(rx + 13.8, ry - 7.2, 3.4 + Math.sin(t * 6) * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // as rédeas, do trenó às renas
  ctx.strokeStyle = colorido ? "#c8a040" : silhueta;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(x + 16, y - 6);
  ctx.quadraticCurveTo(x + 40, y - 2, x + 82, y - 5);
  ctx.stroke();
  // o trenó: a caixa com a voluta na frente e o patim curvo
  ctx.fillStyle = colorido ? "#c8222e" : silhueta;
  ctx.beginPath();
  ctx.moveTo(x - 16, y - 8);
  ctx.lineTo(x + 14, y - 6);
  ctx.quadraticCurveTo(x + 24, y - 6, x + 22, y - 12);
  ctx.quadraticCurveTo(x + 26, y - 10, x + 24, y - 2);
  ctx.quadraticCurveTo(x + 22, y + 4, x + 12, y + 4);
  ctx.lineTo(x - 12, y + 4);
  ctx.quadraticCurveTo(x - 18, y + 2, x - 16, y - 8);
  ctx.fill();
  ctx.strokeStyle = colorido ? "#e8c04a" : silhueta;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x - 18, y + 8);
  ctx.lineTo(x + 20, y + 8);
  ctx.quadraticCurveTo(x + 28, y + 8, x + 27, y + 2);
  ctx.quadraticCurveTo(x + 26, y - 1, x + 23, y + 1);
  ctx.moveTo(x - 8, y + 4);
  ctx.lineTo(x - 8, y + 8);
  ctx.moveTo(x + 10, y + 4);
  ctx.lineTo(x + 10, y + 8);
  ctx.stroke();
  // o saco de presentes atrás
  ctx.fillStyle = colorido ? "#8a6a3a" : silhueta;
  ctx.beginPath();
  ctx.ellipse(x - 10, y - 11, 6.5, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  if (colorido) {
    ctx.fillStyle = "#2f8a4a";
    ctx.fillRect(x - 13, y - 19, 5, 4);
    ctx.fillStyle = "#ffd23a";
    ctx.fillRect(x - 8, y - 18, 4, 3.4);
  }
  // o Papai Noel: o corpo, a barba, o rosto e o gorro com o pompom
  ctx.fillStyle = colorido ? "#d8222e" : silhueta;
  ctx.beginPath();
  ctx.ellipse(x + 2, y - 11, 5.5, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  if (colorido) {
    ctx.fillStyle = "#f4efe6";
    ctx.beginPath();
    ctx.ellipse(x + 4.5, y - 15, 3.4, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f2c8a8";
    ctx.beginPath();
    ctx.arc(x + 4, y - 18.5, 2.8, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(x + 4, y - 18, 3.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = colorido ? "#d8222e" : silhueta;
  ctx.beginPath();
  ctx.moveTo(x + 0.6, y - 20.5);
  ctx.quadraticCurveTo(x + 2, y - 26, x - 3.5, y - 25 + Math.sin(t * 5) * 1);
  ctx.lineTo(x + 7, y - 20.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = colorido ? "#f4efe6" : silhueta;
  ctx.fillRect(x + 0.2, y - 21.5, 7.4, 1.6);
  ctx.beginPath();
  ctx.arc(x - 3.6, y - 25 + Math.sin(t * 5) * 1, 1.4, 0, Math.PI * 2);
  ctx.fill();
}

export const NATAL: Tema = {
  id: "natal",
  nome: "Natal",
  descricao: "25 de dezembro: Natal tropical, noite quente, pisca-pisca nos coqueiros e a árvore de luzes na praça.",
  grupo: "feriados",
  janela: { tipo: "fixa", dia: 25, mes: 12 },
  amostra: "linear-gradient(135deg, #c8222e 50%, #1f7a3a 50%)",
  onda: "triangle",
  somBase: 1047,
  capitel: "dorico",
  paleta: {
    // noite nas quatro fases: o ciclo do dia só muda o tom do azul
    ceu: [["#1a1a52", "#4a3a7a"], ["#0e1f5a", "#2f5a9a"], ["#24185a", "#6a3a7a"], ["#050a26", "#18306a"]],
    longe: CIDADE,
    perto: COQUEIRO,
    chao: "#1d3a2a",
    chaoLinha: "#3f7a4a",
    coluna: { corpo: "#fbf6f0", sombra: "#e2d6cc", luz: "#ffffff", contorno: "#8a2a2a" },
    maleta: { corpo: "#1f7a3a", escuro: "#0b3a1a", fivela: "#ffd24d", alca: "#0b3a1a" },
    asa: { cor: "#ffffff", contorno: "#c8222e" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: ["#ff4d4d", "#ffd24d", "#ffffff"],
    recorde: {
      cor: "#ff4d5a", traco: [4, 4, 12, 4], largura: 3.5,
      aviso: { texto: "NOVO RECORDE!", fonte: "800 28px Georgia, serif", corTexto: "#ffffff", corContorno: "#7a0f16", corFundo: "rgba(160,20,32,0.9)", anima: "pisca" },
    },
    hud: "#fff3d6",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // o trenó passa baixinho, largando os presentes, que caem girando
    const x = atravessa(w, f, 200);
    const y = h * 0.32 + Math.sin(f * Math.PI * 2) * 20;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1.8, 1.8);
    treno(ctx, 0, 0, t, true);
    ctx.restore();
    for (let i = 0; i < 8; i++) {
      const fi = f - i * 0.09;
      if (fi < 0) continue;
      const x0 = atravessa(w, i * 0.09 + 0.05, 200);
      const queda = fi * 8;
      const px = x0 + queda * 30;
      const py = y + 20 + queda * queda * 60;
      if (py > h - 40) continue;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(queda * 3);
      ctx.fillStyle = LUZES[i % LUZES.length];
      ctx.fillRect(-7, -6, 14, 12);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-1.5, -6, 3, 12);
      ctx.fillRect(-7, -1.5, 14, 3);
      ctx.restore();
    }
  },
  decor(ctx, w, h, off, tod, t, tema, surpresa) {
    const p = tema.paleta;
    estrelasFixas(ctx, w, h, t, "#ffffff", 55, 0.5);
    lua(ctx, w * 0.16, h * 0.16, 20);
    // a estrela-guia, com o brilho em cruz
    const [ex, ey] = [w * 0.58, h * 0.11];
    ctx.strokeStyle = "rgba(255,250,220,0.75)";
    ctx.lineWidth = 1.4;
    const br = 12 + Math.sin(t * 2) * 3;
    ctx.beginPath();
    ctx.moveTo(ex - br, ey);
    ctx.lineTo(ex + br, ey);
    ctx.moveTo(ex, ey - br * 1.4);
    ctx.lineTo(ex, ey + br * 1.4);
    ctx.stroke();
    ctx.fillStyle = "#fffbe8";
    ctx.beginPath();
    ctx.arc(ex, ey, 3.2, 0, Math.PI * 2);
    ctx.fill();
    // o trenó cruzando o céu de tempos em tempos, longe, em silhueta. Enquanto a surpresa (o trenó baixinho largando os
    // presentes) está na tela, este não passa: os dois juntos pareciam o mesmo trenó sem os presentes
    const volta = (t * 70) % (w * 2.2);
    if (!surpresa && volta < w + 160) treno(ctx, volta - 80, h * 0.28 + Math.sin(t * 0.7) * 12, t);
    // prédios da cidade com janelas acesas
    predios(ctx, w, h - 40, off * 0.07, ciclo(CIDADE, tod), "#ffd98a", 0.9, 150, 54);
    // a árvore de luzes da praça
    repetir(w, off * 0.16, 1150, (x) => arvoreDeLuzes(ctx, x + 560, h - 60, 260, t));
    // casas com pisca-pisca no beiral
    const casas = ciclo(CASAS, tod);
    repetir(w, off * 0.28, 120, (x, k) => {
      const larg = 96;
      const alt = 46 + variar(k, 7, 3) * 8;
      const base = h - 44;
      ctx.fillStyle = casas;
      ctx.fillRect(x, base - alt, larg, alt);
      ctx.beginPath();
      ctx.moveTo(x - 6, base - alt);
      ctx.lineTo(x + larg / 2, base - alt - 26);
      ctx.lineTo(x + larg + 6, base - alt);
      ctx.fill();
      ctx.fillStyle = "#ffd98a";
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x + 14, base - alt + 12, 16, 14);
      ctx.fillRect(x + 66, base - alt + 12, 16, 14);
      ctx.globalAlpha = 1;
      const fio: [number, number][] = [];
      for (let i = 0; i <= 12; i++) {
        const f = i / 12;
        const px = x - 6 + f * (larg + 12);
        fio.push([px, base - alt - 26 * (1 - Math.abs(f - 0.5) * 2) + 3]);
      }
      luzinhas(ctx, fio, t + k, LUZES, 1.8);
    });
    // coqueiros com o pisca-pisca enrolado no tronco
    const coqueiro = ciclo(p.perto, tod);
    repetir(w, off * 0.4, 210, (x, k) => {
      if (variar(k, 5, 4) === 0) return;
      const bx = x + variar(k, 23, 60);
      const alt = 150 + variar(k, 13, 3) * 18;
      const [tx, ty] = palmeira(ctx, bx, h - 40, alt, coqueiro, t, 0.2);
      const fio: [number, number][] = [];
      for (let i = 0; i < 26; i++) {
        const f = i / 26;
        const yy = h - 40 - f * (h - 40 - ty);
        const xx = bx + (tx - bx) * f * f + Math.sin(f * Math.PI * 9) * 4;
        fio.push([xx, yy]);
      }
      luzinhas(ctx, fio, t * 1.3 + k, LUZES, 1.8);
    });
  },
  chao(ctx, w, h, y, off, tema) {
    const p = tema.paleta;
    ctx.fillStyle = p.chao;
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 3);
    // presentes embrulhados pelo gramado, na velocidade das colunas
    const esp = 230;
    for (let x = -(off % esp); x < w + esp; x += esp) {
      const k = Math.round((x + off) / esp);
      const cor = LUZES[variar(k, 7, LUZES.length)];
      ctx.fillStyle = cor;
      ctx.fillRect(x + 40, y - 9, 16, 12);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + 46.5, y - 9, 3, 12);
      ctx.fillRect(x + 40, y - 5, 16, 2.5);
      ctx.beginPath();
      ctx.ellipse(x + 45, y - 11, 3, 2, -0.5, 0, Math.PI * 2);
      ctx.ellipse(x + 51, y - 11, 3, 2, 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#143024";
    for (let x = -(off % 33); x < w; x += 33) ctx.fillRect(x + 8, y + 16, 12, 2);
  },
  coluna(ctx, w, len, variante, quebrada, tema, t) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // bengala doce: branco com listras vermelhas em diagonal
    ctx.fillStyle = c.corpo;
    ctx.fillRect(x0, 0, w, len);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, 0, w, len);
    ctx.clip();
    ctx.fillStyle = "#d42a36";
    ctx.beginPath();
    for (let y = -w + variante * 18; y < len + w; y += 54) {
      ctx.moveTo(x0, y + 22);
      ctx.lineTo(x0 + w, y);
      ctx.lineTo(x0 + w, y + 20);
      ctx.lineTo(x0, y + 42);
      ctx.closePath();
    }
    ctx.fill();
    // volume: sombra à direita e brilho à esquerda
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, "rgba(255,255,255,0.35)");
    g.addColorStop(0.35, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(80,0,10,0.28)");
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, len);
    ctx.restore();
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = c.corpo;
      ctx.beginPath();
      ctx.moveTo(x0, 12);
      ctx.lineTo(x0 + w * 0.25, 2);
      ctx.lineTo(x0 + w * 0.5, 10);
      ctx.lineTo(x0 + w * 0.78, 0);
      ctx.lineTo(x0 + w, 8);
      ctx.lineTo(x0 + w, 14);
      ctx.lineTo(x0, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // ponta: aro dourado e uma guirlanda com bolinhas e pisca-pisca
    ctx.fillStyle = "#e8b83a";
    rr(ctx, x0 - 4, 0, w + 8, 8, 3);
    ctx.fill();
    ctx.strokeStyle = "#8a6a1a";
    ctx.stroke();
    ctx.fillStyle = "#1f6a34";
    rr(ctx, x0 - 2, 9, w + 4, 11, 5);
    ctx.fill();
    ctx.fillStyle = "#2f8a46";
    for (let x = x0; x < x0 + w; x += 7) {
      ctx.beginPath();
      ctx.ellipse(x + 3.5, 14.5, 4, 3, (x % 14) * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    const pontos: [number, number][] = [];
    for (let i = 0; i < 7; i++) pontos.push([x0 + 5 + (i * (w - 10)) / 6, 14 + (i % 2 ? 2 : -2)]);
    luzinhas(ctx, pontos, t + variante, LUZES, 1.9);
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => {
      // gorro de Papai Noel caído para trás, com o pompom balançando
      const bal = Math.sin(t * 7) * 2.5;
      c.fillStyle = "#d42a36";
      c.strokeStyle = "#7a0f16";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(-14, -20);
      c.quadraticCurveTo(-8, -40, 6, -36);
      c.quadraticCurveTo(14 + bal * 0.5, -34, 20 + bal, -26);
      c.quadraticCurveTo(10, -30, 10, -20);
      c.closePath();
      c.fill();
      c.stroke();
      c.fillStyle = "#ffffff";
      rr(c, -16, -23, 28, 6, 3);
      c.fill();
      c.beginPath();
      c.arc(21 + bal, -25, 4, 0, Math.PI * 2);
      c.fill();
      // laço de fita na frente
      c.fillStyle = "#ffd24d";
      c.fillRect(-23, 9, 46, 2.6);
    });
  },
};
