// Carnaval (a terça-feira é 47 dias antes da Páscoa): a noite na avenida, com as arquibancadas cheias, o carro alegórico
// passando, os passistas, o confete caindo e as colunas enroladas de serpentina; na maleta, a máscara de colombina.
import { ciclo, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, estrelasFixas, figura, luzinhas, repetir } from "../kit";

const CORES = ["#ff3a8a", "#ffd21a", "#2ad8e8", "#7aff5a", "#b04cff", "#ff8a1a"];
// cores por hora do dia (amanhecer, dia, entardecer, noite); é sempre noite de desfile
const ARQUIBANCADA = ["#2a1e48", "#261c44", "#2a1a44", "#140e26"];
const PUBLICO = ["#3a2a5a", "#3a2c58", "#3a2856", "#1a1230"];
const PASSISTA = ["#1a1030", "#1a1030", "#1a102e", "#0a0614"];

/** Carro alegórico: a plataforma com as luzes e a escultura gigante (uma cabeça de rei momo com a coroa). */
function carro(ctx: Ctx, x: number, base: number, t: number) {
  ctx.fillStyle = "#6a2a8a";
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.lineTo(x + 10, base - 40);
  ctx.lineTo(x + 230, base - 40);
  ctx.lineTo(x + 240, base);
  ctx.fill();
  const pontos: [number, number][] = [];
  for (let i = 0; i <= 22; i++) pontos.push([x + 10 + i * 10, base - 40]);
  luzinhas(ctx, pontos, t * 2, CORES, 2.4);
  // a escultura: a cabeça sorridente, a coroa e as plumas
  const cx = x + 120;
  const cy = base - 110 + Math.sin(t * 1.2) * 3;
  ctx.fillStyle = "#ffcf8a";
  ctx.beginPath();
  ctx.arc(cx, cy, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c8323a";
  ctx.beginPath();
  ctx.arc(cx, cy + 10, 22, 0.1, Math.PI - 0.1);
  ctx.fill();
  ctx.fillStyle = "#1a1030";
  for (const dx of [-16, 16]) {
    ctx.beginPath();
    ctx.ellipse(cx + dx, cy - 10, 5, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#ffd21a";
  ctx.beginPath();
  ctx.moveTo(cx - 40, cy - 30);
  for (let i = 0; i <= 5; i++) ctx.lineTo(cx - 40 + i * 16, cy - (i % 2 ? 46 : 64));
  ctx.lineTo(cx + 40, cy - 30);
  ctx.fill();
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = CORES[i % CORES.length];
    ctx.beginPath();
    ctx.ellipse(cx - 60 + i * 20, cy - 70 - Math.sin((i / 6) * Math.PI) * 20 + Math.sin(t * 4 + i) * 3, 5, 18, (i - 3) * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Máscara de colombina, com as plumas. */
function mascara(c: Ctx, t: number) {
  c.save();
  c.translate(2, -18);
  c.fillStyle = "#ff3a8a";
  c.strokeStyle = "#ffd21a";
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(-14, 0);
  c.quadraticCurveTo(-12, -8, -4, -6);
  c.quadraticCurveTo(0, -3, 4, -6);
  c.quadraticCurveTo(12, -8, 14, 0);
  c.quadraticCurveTo(10, 6, 4, 3);
  c.quadraticCurveTo(0, 1, -4, 3);
  c.quadraticCurveTo(-10, 6, -14, 0);
  c.fill();
  c.stroke();
  c.fillStyle = "#1a1030";
  for (const x of [-7, 7]) {
    c.beginPath();
    c.ellipse(x, -1, 3.6, 2, 0, 0, Math.PI * 2);
    c.fill();
  }
  for (let i = 0; i < 3; i++) {
    c.fillStyle = CORES[(i + 1) % CORES.length];
    c.save();
    c.translate(12, -6);
    c.rotate(-0.4 + i * 0.35 + Math.sin(t * 5 + i) * 0.1);
    c.beginPath();
    c.ellipse(0, -8, 2.4, 8, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
  c.restore();
}

export const CARNAVAL: Tema = {
  id: "carnaval",
  nome: "Carnaval",
  descricao: "A noite na avenida: as arquibancadas cheias, o carro alegórico, os passistas e o confete e a serpentina no ar.",
  grupo: "festas",
  janela: { tipo: "pascoa", dias: -47 },
  amostra: "conic-gradient(#ff3a8a 17%, #ffd21a 0 33%, #2ad8e8 0 50%, #7aff5a 0 67%, #b04cff 0 83%, #ff8a1a 0)",
  onda: "square",
  somBase: 587,
  climaFixo: "folhas",
  capitel: "dorico",
  paleta: {
    // sempre noite de desfile
    ceu: [["#2a1050", "#6a2a7a"], ["#1a1050", "#4a2a80"], ["#2a0e48", "#7a2a6a"], ["#0e0628", "#2a1450"]],
    longe: ARQUIBANCADA,
    perto: PASSISTA,
    chao: "#3a3a48",
    chaoLinha: "#ffd21a",
    coluna: { corpo: "#fbf6ff", sombra: "#d8cce8", luz: "#ffffff", contorno: "#4a1a6a" },
    maleta: { corpo: "#b04cff", escuro: "#4a1a6a", fivela: "#ffd21a", alca: "#4a1a6a" },
    asa: { cor: "#ffd21a", contorno: "#ff3a8a" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: CORES,
    recorde: {
      cor: "#ff3a8a", traco: [3, 3, 3, 3, 3, 9], largura: 4,
      aviso: { texto: "NOTA DEZ! NOVO RECORDE!", fonte: "900 24px system-ui, sans-serif", corTexto: "#ffd21a", corContorno: "#2a0a3a", corFundo: "rgba(176,76,255,0.92)", anima: "treme" },
    },
    hud: "#fff0ff",
    estrelas: "#ffffff",
  },
  folha(ctx, s) {
    // confete: papelzinho colorido girando
    ctx.fillStyle = CORES[Math.floor(s * CORES.length) % CORES.length];
    ctx.fillRect(-3.5, -2.5, 7, 5);
  },
  surpresa(ctx, w, h, f, t) {
    // a bateria da escola passa pela avenida, tocando os surdos
    const x0 = atravessa(w, f, 460);
    for (let i = 0; i < 8; i++) {
      // cada ritmista em escala 1,5 a partir da origem (x, base)
      ctx.save();
      ctx.translate(x0 - i * 56, h - 42);
      ctx.scale(1.5, 1.5);
      const x = 0;
      const base = 0;
      const bate = Math.sin(t * 12 + i);
      const mao = figura(ctx, x, base, 1, "#1a1030", { bracoE: 0.9, bracoD: 1.6 + bate * 0.5, pernaE: 0.2 * bate, pernaD: -0.2 * bate });
      ctx.fillStyle = CORES[i % CORES.length];
      ctx.fillRect(x - 8, base - 30, 16, 14);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(x, base - 30, 8, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#f2e6c8";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(mao[0], mao[1]);
      ctx.lineTo(mao[0] - 6, mao[1] + 6 + bate * 2);
      ctx.stroke();
      ctx.restore();
    }
  },
  decor(ctx, w, h, off, tod, t) {
    estrelasFixas(ctx, w, h, t, "#ffffff", 30, 0.3);
    // os refletores
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 2 + Math.sin(t * 0.6 + i * 1.6) * 0.5;
      const x = w * (0.15 + i * 0.24);
      ctx.fillStyle = `${CORES[i]}33`;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + Math.cos(a - 0.08) * 600, Math.sin(a - 0.08) * 600);
      ctx.lineTo(x + Math.cos(a + 0.08) * 600, Math.sin(a + 0.08) * 600);
      ctx.fill();
    }
    // as arquibancadas lotadas, com o público pulando e as luzinhas dos celulares
    const arq = ciclo(ARQUIBANCADA, tod);
    const publico = ciclo(PUBLICO, tod);
    ctx.fillStyle = arq;
    ctx.beginPath();
    ctx.moveTo(0, h - 130);
    ctx.lineTo(0, h - 300);
    ctx.lineTo(w, h - 300);
    ctx.lineTo(w, h - 130);
    ctx.fill();
    for (let fila = 0; fila < 6; fila++) {
      const y = h - 290 + fila * 28;
      // a fileira inteira num caminho só; as luzinhas por cima
      ctx.fillStyle = publico;
      ctx.beginPath();
      repetir(w, off * 0.05, 14, (x, k) => {
        const pula = Math.max(0, Math.sin(t * 6 + k * 0.7 + fila)) * 3;
        ctx.moveTo(x + 12, y + 10 - pula);
        ctx.arc(x + 7, y + 10 - pula, 5, 0, Math.PI * 2);
        ctx.rect(x + 3, y + 14 - pula, 8, 10);
      });
      ctx.fill();
      repetir(w, off * 0.05, 14, (x, k) => {
        if (variar(k + fila * 13, 11, 9) !== 0) return;
        const pula = Math.max(0, Math.sin(t * 6 + k * 0.7 + fila)) * 3;
        ctx.fillStyle = CORES[variar(k + fila, 7, CORES.length)];
        ctx.fillRect(x + 6, y + 2 - pula, 2, 3);
      });
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(0, y + 24, w, 3);
    }
    // a avenida, com o carro alegórico e os passistas
    ctx.fillStyle = "#4a4a5a";
    ctx.fillRect(0, h - 130, w, 90);
    repetir(w, off * 0.2 + t * 14, 900, (x) => carro(ctx, x + 300, h - 70, t));
    const passista = ciclo(PASSISTA, tod);
    repetir(w, off * 0.4, 120, (x, k) => {
      const gira = Math.sin(t * 8 + k);
      const px = x + variar(k, 31, 40);
      figura(ctx, px, h - 42, 1, passista, { tronco: gira * 0.2, bracoE: -2.2 + gira * 0.4, bracoD: 2.4 - gira * 0.4, pernaE: 0.5 * gira, pernaD: -0.5 * gira, dobra: 0.5 });
      // o costeiro de plumas
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = CORES[(i + k) % CORES.length];
        ctx.beginPath();
        ctx.ellipse(px + (i - 2) * 6, h - 82 - Math.abs(i - 2) * -3, 3, 12, (i - 2) * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  },
  chao(ctx, w, h, y, off, tema) {
    const p = tema.paleta;
    ctx.fillStyle = p.chao;
    ctx.fillRect(0, y, w, h - y);
    // a faixa amarela da avenida e as serpentinas caídas
    ctx.fillStyle = p.chaoLinha;
    for (let x = -(off % 60); x < w; x += 60) ctx.fillRect(x + 10, y + 18, 34, 4);
    ctx.lineWidth = 1.8;
    for (let x = -(off % 47); x < w; x += 47) {
      const k = Math.round((x + off) / 47);
      ctx.strokeStyle = CORES[variar(k, 7, CORES.length)];
      ctx.beginPath();
      ctx.moveTo(x, y + 8);
      ctx.bezierCurveTo(x + 6, y + 2, x + 12, y + 14, x + 18, y + 6);
      ctx.bezierCurveTo(x + 24, y, x + 26, y + 12, x + 32, y + 10);
      ctx.stroke();
    }
  },
  coluna(ctx, w, len, variante, quebrada, tema, t) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // branca e brilhosa, enrolada de serpentinas coloridas
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
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = CORES[(i + variante) % CORES.length];
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      for (let y = -20; y < len + 20; y += 8) {
        const x = Math.sin(y * 0.05 + i * 1.6 + variante) * (w / 2 - 4);
        if (y === -20) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    for (let y = 10; y < len; y += 23) ctx.fillRect(x0 + 4 + variar(y + variante, 13, w - 8), y, 2, 2);
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
    // a ponta com lantejoulas piscando
    ctx.fillStyle = "#4a1a6a";
    ctx.fillRect(x0 - 4, 0, w + 8, 12);
    ctx.strokeRect(x0 - 4, 0, w + 8, 12);
    const pontos: [number, number][] = [];
    for (let i = 0; i < 9; i++) pontos.push([x0 + 2 + (i * (w - 4)) / 8, 6]);
    luzinhas(ctx, pontos, t * 2 + variante, CORES, 2);
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => mascara(c, t));
  },
};
