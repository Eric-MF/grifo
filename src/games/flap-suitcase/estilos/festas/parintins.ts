// Festival de Parintins (no último fim de semana de junho): o Bumbódromo dividido entre o vermelho do Garantido e o azul
// do Caprichoso, os bois dançando, as alegorias gigantes da floresta e as galeras; as colunas de cima são do Garantido
// (vermelhas, com o coração) e as de baixo do Caprichoso (azuis, com a estrela).
import { ciclo, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { estrelasFixas, luzinhas, repetir, surge } from "../kit";

const VERMELHO = "#d8202e";
const AZUL = "#1a4ad8";
// cores por hora do dia (amanhecer, dia, entardecer, noite); é sempre noite de apresentação
const ARENA = ["#2a1e3a", "#261c38", "#2a1a38", "#120c1e"];

/** Coração do Garantido. */
function coracao(ctx: Ctx, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + 6 * s);
  ctx.bezierCurveTo(x - 10 * s, y - 2 * s, x - 6 * s, y - 10 * s, x, y - 4 * s);
  ctx.bezierCurveTo(x + 6 * s, y - 10 * s, x + 10 * s, y - 2 * s, x, y + 6 * s);
  ctx.fill();
}

/** Estrela do Caprichoso. */
function estrela(ctx: Ctx, x: number, y: number, s: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = (i % 2 ? 3.4 : 8) * s;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
}

/** Boi-bumbá dançando: a saia rodada, o corpo, a cabeça com os chifres e o símbolo na testa. */
function boi(ctx: Ctx, x: number, base: number, garantido: boolean, t: number) {
  const gira = Math.sin(t * 4 + (garantido ? 0 : 2));
  const pulo = Math.abs(gira) * 6;
  ctx.save();
  ctx.translate(x, base - pulo);
  ctx.rotate(gira * 0.12);
  ctx.fillStyle = garantido ? VERMELHO : AZUL;
  ctx.beginPath();
  ctx.moveTo(-34, -10);
  ctx.quadraticCurveTo(0, 6 + gira * 4, 34, -10);
  ctx.lineTo(28, -30);
  ctx.lineTo(-28, -30);
  ctx.fill();
  ctx.fillStyle = garantido ? "#f4f0ea" : "#1a1a22";
  ctx.beginPath();
  ctx.ellipse(0, -40, 32, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(30, -50, 11, 9, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#f2e6c8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(26, -58);
  ctx.quadraticCurveTo(22, -72, 14, -70);
  ctx.moveTo(34, -58);
  ctx.quadraticCurveTo(42, -72, 48, -68);
  ctx.stroke();
  ctx.fillStyle = garantido ? VERMELHO : AZUL;
  if (garantido) coracao(ctx, 30, -52, 0.6);
  else estrela(ctx, 30, -52, 0.6);
  // as fitas e franjas da saia
  for (let i = 0; i < 7; i++) {
    ctx.strokeStyle = ["#ffd21a", "#ffffff"][i % 2];
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-28 + i * 9, -28);
    ctx.lineTo(-30 + i * 9 + gira * 3, -6);
    ctx.stroke();
  }
  ctx.restore();
}

/** Alegoria gigante: uma flor de vitória-régia que abre e fecha, sobre a base enfeitada. */
function alegoria(ctx: Ctx, x: number, base: number, cor: string, t: number) {
  ctx.fillStyle = "#3a8a3a";
  ctx.beginPath();
  ctx.ellipse(x, base - 30, 90, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  const abre = 0.6 + Math.sin(t * 0.8) * 0.3;
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.32 * abre;
    ctx.save();
    ctx.translate(x, base - 40);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = i % 2 ? "#ffffff" : cor;
    ctx.beginPath();
    ctx.ellipse(0, -60, 14, 60, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = "#ffd21a";
  ctx.beginPath();
  ctx.arc(x, base - 44, 16, 0, Math.PI * 2);
  ctx.fill();
}

export const PARINTINS: Tema = {
  id: "parintins",
  nome: "Festival de Parintins",
  descricao: "No fim de junho, o Bumbódromo dividido entre o Garantido vermelho e o Caprichoso azul, com os bois e as alegorias.",
  grupo: "festas",
  janela: { tipo: "semana", mes: 6, diaSemana: 6, ordem: -1 },
  amostra: `linear-gradient(135deg, ${VERMELHO} 50%, ${AZUL} 50%)`,
  onda: "sawtooth",
  somBase: 294,
  climaFixo: "limpo",
  capitel: "dorico",
  paleta: {
    ceu: [["#1a1240", "#4a2060"], ["#0e1448", "#2a2470"], ["#1e1040", "#5a2050"], ["#08061e", "#1c1440"]],
    longe: ARENA,
    perto: ARENA,
    chao: "#3a3a46",
    chaoLinha: "#ffd21a",
    coluna: { corpo: "#d8202e", sombra: "#a01620", luz: "#f0444e", contorno: "#3a0610" },
    maleta: { corpo: "#f4f0ea", escuro: "#8a8a94", fivela: "#ffd21a", alca: "#5a5a64" },
    asa: { cor: "#ffffff", contorno: "#ffd21a" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: [VERMELHO, AZUL, "#ffd21a", "#ffffff"],
    recorde: {
      cor: "#ffd21a", traco: [8, 2, 2, 2, 2, 2], largura: 4,
      aviso: { texto: "TOADA DE RECORDE!", fonte: "900 26px system-ui, sans-serif", corTexto: "#ffffff", corContorno: "#1a0a2a", corFundo: "rgba(120,30,160,0.92)", anima: "treme" },
    },
    hud: "#fff8e8",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // a cabeça gigante de boi da alegoria sobe no meio da arena e balança, piscando
    const a = surge(f);
    const sobe = Math.min(1, f * 2.5);
    const x = w * 0.5;
    const y = h - 40 - sobe * 200;
    const lado = Math.floor(t / 2) % 2 === 0;
    ctx.globalAlpha = a;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * 1.5) * 0.12);
    ctx.fillStyle = lado ? "#f4f0ea" : "#1a1a22";
    ctx.beginPath();
    ctx.ellipse(0, 0, 70, 60, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f2e6c8";
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-50, -40);
    ctx.quadraticCurveTo(-90, -80, -110, -60);
    ctx.moveTo(50, -40);
    ctx.quadraticCurveTo(90, -80, 110, -60);
    ctx.stroke();
    ctx.fillStyle = lado ? VERMELHO : AZUL;
    if (lado) coracao(ctx, 0, -20, 2.4);
    else estrela(ctx, 0, -20, 2.4);
    const pisca = Math.sin(t * 3) > 0.92;
    ctx.fillStyle = lado ? "#1a1a22" : "#f4f0ea";
    for (const dx of [-28, 28]) {
      ctx.beginPath();
      ctx.ellipse(dx, 6, 9, pisca ? 1.5 : 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  },
  decor(ctx, w, h, off, tod, t, tema, surpresa) {
    estrelasFixas(ctx, w, h, t, "#ffffff", 40, 0.35);
    // a arena: arquibancadas das duas galeras, vermelha à esquerda e azul à direita de cada lado
    const arena = ciclo(ARENA, tod);
    ctx.fillStyle = arena;
    ctx.fillRect(0, h - 300, w, 170);
    repetir(w, off * 0.05, 700, (x) => {
      for (let lado = 0; lado < 2; lado++) {
        const cor = lado === 0 ? VERMELHO : AZUL;
        for (let fila = 0; fila < 5; fila++) {
          for (let i = 0; i < 24; i++) {
            const px = x + lado * 350 + i * 14 + (fila % 2) * 7;
            const pula = Math.max(0, Math.sin(t * 6 + i * 0.6 + fila + lado * 3)) * 3;
            ctx.fillStyle = cor;
            ctx.globalAlpha = 0.65 + (fila % 2) * 0.2;
            ctx.beginPath();
            ctx.arc(px, h - 284 + fila * 30 - pula, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(px - 4, h - 280 + fila * 30 - pula, 8, 12);
          }
        }
        ctx.globalAlpha = 1;
      }
      const pontos: [number, number][] = [];
      for (let i = 0; i <= 35; i++) pontos.push([x + i * 20, h - 302]);
      luzinhas(ctx, pontos, t * 2, ["#ffd21a", "#ffffff"], 2);
    });
    // a surpresa: a cabeça do boi sobe de trás da pista
    surpresa?.();
    // a pista, com as alegorias e os bois
    ctx.fillStyle = "#4a4458";
    ctx.fillRect(0, h - 130, w, 90);
    repetir(w, off * 0.18, 900, (x) => {
      alegoria(ctx, x + 200, h - 70, VERMELHO, t);
      alegoria(ctx, x + 650, h - 70, AZUL, t + 1.5);
    });
    repetir(w, off * 0.4, 520, (x, k) => {
      boi(ctx, x + variar(k, 31, 60), h - 44, true, t);
      boi(ctx, x + 260 + variar(k, 13, 60), h - 44, false, t);
    });
  },
  chao(ctx, w, h, y, off, tema) {
    const p = tema.paleta;
    ctx.fillStyle = p.chao;
    ctx.fillRect(0, y, w, h - y);
    // a pista dividida: metade vermelha, metade azul, na velocidade das colunas
    for (let x = -(off % 200); x < w; x += 200) {
      ctx.fillStyle = VERMELHO;
      ctx.fillRect(x, y, 100, 4);
      ctx.fillStyle = AZUL;
      ctx.fillRect(x + 100, y, 100, 4);
      ctx.fillStyle = "#ffd21a";
      coracao(ctx, x + 50, y + 22, 0.9);
      estrela(ctx, x + 150, y + 22, 0.9);
    }
  },
  coluna(ctx, w, len, variante, quebrada) {
    const x0 = -w / 2;
    // a de cima é do Garantido (vermelha, com corações); a de baixo, do Caprichoso (azul, com estrelas)
    const deCima = ctx.getTransform().d < 0;
    const corpo = deCima ? "#d8202e" : "#1a4ad8";
    const sombra = deCima ? "#a01620" : "#0e2e9a";
    const luz = deCima ? "#f0444e" : "#3a6af0";
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, luz);
    g.addColorStop(0.5, corpo);
    g.addColorStop(1, sombra);
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, len);
    ctx.fillStyle = "#ffd21a";
    ctx.fillRect(x0 + 5, 0, 3, len);
    ctx.fillRect(x0 + w - 8, 0, 3, len);
    ctx.fillStyle = "#ffffff";
    for (let y = 50 + variante * 25; y < len - 20; y += 80) {
      ctx.save();
      ctx.translate(0, y);
      if (deCima) {
        ctx.scale(1, -1);
        coracao(ctx, 0, 0, 1.6);
      } else estrela(ctx, 0, 0, 1.6);
      ctx.restore();
    }
    ctx.strokeStyle = deCima ? "#3a0610" : "#06103a";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = luz;
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
    // a ponta com a franja dourada
    ctx.fillStyle = "#ffd21a";
    ctx.fillRect(x0 - 4, 0, w + 8, 9);
    ctx.strokeRect(x0 - 4, 0, w + 8, 9);
    ctx.strokeStyle = "#ffd21a";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let x = x0; x < x0 + w; x += 5) {
      ctx.moveTo(x, 9);
      ctx.lineTo(x, 16);
    }
    ctx.stroke();
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => {
      // os chifres de boi com as fitas vermelha e azul
      c.strokeStyle = "#f2e6c8";
      c.lineWidth = 3;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(-10, -16);
      c.quadraticCurveTo(-20, -24, -18, -32);
      c.moveTo(10, -16);
      c.quadraticCurveTo(20, -24, 18, -32);
      c.stroke();
      for (const [x, cor] of [[-18, VERMELHO], [18, AZUL]] as const) {
        c.strokeStyle = cor;
        c.lineWidth = 1.8;
        c.beginPath();
        c.moveTo(x, -30);
        c.lineTo(x + (x < 0 ? -6 : 6), -24 + Math.sin(t * 8) * 2);
        c.moveTo(x, -30);
        c.lineTo(x + (x < 0 ? -3 : 3), -20 + Math.sin(t * 8 + 1) * 2);
        c.stroke();
      }
    });
  },
};
