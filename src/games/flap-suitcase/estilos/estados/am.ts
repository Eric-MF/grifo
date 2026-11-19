// Amazonas: o Teatro Amazonas, com a fachada rosa e a cúpula de mosaico, o Encontro das Águas (o Negro escuro e o
// Solimões barrento lado a lado), a floresta e os botos; as colunas levam o mosaico da cúpula.
import { ciclo, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, ladrilho, lua, noiteDe, repetir, sol } from "../kit";

const MOSAICO = ["#ffd21a", "#2fa04a", "#2a6ac8"];
// cores por hora do dia (amanhecer, dia, entardecer, noite)
const FLORESTA = ["#2f5a34", "#2a6034", "#2e3e34", "#081208"];
const FLORESTA_LONGE = ["#5a7a6a", "#4f7f66", "#4e5464", "#10181e"];
const TEATRO = ["#e8a8a8", "#f0b0b0", "#d898a4", "#4a3040"];
const TEATRO_SOMBRA = ["#c88888", "#d09090", "#b87888", "#2e1c2a"];
const NEGRO = ["#2a1e1a", "#2a201a", "#241a1e", "#0a0808"];
const SOLIMOES = ["#b08a5a", "#bc945c", "#9a7a5e", "#2e2418"];

/** Teatro Amazonas: a fachada com o frontão e as colunas, e a cúpula de mosaico. */
function teatro(ctx: Ctx, x: number, base: number, cor: string, sombra: string, acesas: number) {
  ctx.fillStyle = cor;
  ctx.fillRect(x, base - 70, 170, 70);
  ctx.beginPath();
  ctx.moveTo(x + 40, base - 70);
  ctx.lineTo(x + 85, base - 92);
  ctx.lineTo(x + 130, base - 70);
  ctx.fill();
  ctx.fillStyle = sombra;
  for (let i = 0; i < 7; i++) ctx.fillRect(x + 44 + i * 13, base - 66, 4, 44);
  ctx.fillRect(x + 36, base - 22, 98, 4);
  for (const jx of [x + 8, x + 22, x + 140, x + 154]) {
    ctx.fillStyle = acesas > 0.3 ? "#ffe2a0" : sombra;
    ctx.fillRect(jx, base - 56, 8, 14);
    ctx.fillRect(jx, base - 32, 8, 14);
  }
  // a cúpula, em gomos coloridos
  const cx = x + 85;
  const cy = base - 100;
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = MOSAICO[i % 3];
    ctx.beginPath();
    ctx.moveTo(cx, cy - 46);
    ctx.lineTo(cx - 36 + i * 8, cy);
    ctx.lineTo(cx - 28 + i * 8, cy);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = cor;
  ctx.fillRect(cx - 40, cy, 80, 8);
  ctx.fillRect(cx - 3, cy - 58, 6, 12);
}

/** Boto saltando da água. */
/**
 * O corpo do boto-cor-de-rosa, virado para +x e centrado na origem (uns 110 de comprimento): o bico comprido e fino, a
 * testa redonda (o melão), a corcova baixa no lugar da barbatana, as nadadeiras grandes em remo e a cauda; cinza-rosado
 * em cima e rosa-chiclete embaixo. `bate` (−1 a 1) mexe a cauda e as nadadeiras.
 */
function corpoBoto(ctx: Ctx, bate: number) {
  // a cauda, em duas pontas
  ctx.fillStyle = "#d88898";
  ctx.save();
  ctx.translate(-38, 0);
  ctx.rotate(bate * 0.25);
  ctx.beginPath();
  ctx.moveTo(4, -2);
  ctx.quadraticCurveTo(-6, -4, -14, -13);
  ctx.quadraticCurveTo(-12, -4, -10, 0);
  ctx.quadraticCurveTo(-12, 4, -14, 13);
  ctx.quadraticCurveTo(-6, 4, 4, 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // a nadadeira do lado de lá
  ctx.fillStyle = "#c87a8c";
  ctx.beginPath();
  ctx.moveTo(14, 4);
  ctx.quadraticCurveTo(10, 14 - bate * 2, 2, 17 - bate * 2);
  ctx.quadraticCurveTo(6, 9, 8, 4);
  ctx.fill();
  // o corpo, com a corcova baixa, o pescoço e o melão
  const g = ctx.createLinearGradient(0, -14, 0, 12);
  g.addColorStop(0, "#b8909a");
  g.addColorStop(0.45, "#f29aae");
  g.addColorStop(1, "#ffc4d2");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-38, -2);
  ctx.quadraticCurveTo(-22, -7, -8, -11);
  ctx.quadraticCurveTo(-2, -12.5, 4, -10);
  ctx.quadraticCurveTo(14, -9, 18, -10);
  ctx.bezierCurveTo(24, -16, 33, -12, 33, -5);
  ctx.quadraticCurveTo(44, -4.5, 58, -2);
  ctx.quadraticCurveTo(60, -1, 58, 0.5);
  ctx.quadraticCurveTo(44, 1.5, 32, 3);
  ctx.quadraticCurveTo(26, 8, 16, 10);
  ctx.quadraticCurveTo(-4, 13, -22, 7);
  ctx.quadraticCurveTo(-32, 4, -38, 2);
  ctx.closePath();
  ctx.fill();
  // as manchinhas mais rosadas e a dobra do pescoço
  ctx.fillStyle = "rgba(255,120,150,0.35)";
  for (const [mx, my, r] of [[-14, 2, 3], [-2, 5, 2.4], [6, -2, 2], [-24, 1, 2]] as const) {
    ctx.beginPath();
    ctx.ellipse(mx, my, r * 1.4, r, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(150,90,104,0.5)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(19, -9);
  ctx.quadraticCurveTo(17, -2, 20, 6);
  // a boca no bico, sorrindo
  ctx.moveTo(57, -0.5);
  ctx.quadraticCurveTo(44, 0.5, 33, 0);
  ctx.quadraticCurveTo(31, -1, 30, -2.4);
  ctx.stroke();
  // o respiradouro e o olho
  ctx.fillStyle = "#5a3a44";
  ctx.beginPath();
  ctx.ellipse(16, -10, 1.6, 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a1014";
  ctx.beginPath();
  ctx.arc(28, -2.4, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(28.2, -3.2, 0.6, 0.6);
  // a nadadeira do lado de cá, larga
  ctx.fillStyle = "#e88a9e";
  ctx.beginPath();
  ctx.moveTo(16, 5);
  ctx.quadraticCurveTo(12, 16 + bate * 2, 3, 20 + bate * 2);
  ctx.quadraticCurveTo(0, 18, 4, 13);
  ctx.quadraticCurveTo(8, 8, 9, 5);
  ctx.fill();
}

/** Boto pequeno ao longe, dando um salto curto pelo rio, sem passar da linha d'água. */
function boto(ctx: Ctx, x: number, y: number, fase: number) {
  if (fase < 0 || fase > 1) return;
  const ang = -Math.PI * 0.75 + fase * Math.PI * 0.5;
  const px = x + (fase - 0.5) * 60;
  const py = y - Math.sin(fase * Math.PI) * 30;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - 60, y - 60, 120, 62);
  ctx.clip();
  ctx.translate(px, py);
  ctx.rotate(ang + Math.PI / 2);
  ctx.scale(0.34, 0.34);
  corpoBoto(ctx, Math.sin(fase * 12));
  ctx.restore();
  // os respingos de entrada e saída
  if (fase < 0.15 || fase > 0.85) {
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.ellipse(px, y, 9, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Flor de vitória-régia, branca e rosada, na tampa. */
function vitoriaRegia(c: Ctx) {
  c.save();
  c.translate(-10, -19);
  c.fillStyle = "#3a8a3a";
  c.beginPath();
  c.ellipse(0, 2, 12, 3.4, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#c8e0a0";
  c.fillRect(-12, 1, 24, 1.4);
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.38;
    c.fillStyle = i % 2 ? "#ffffff" : "#ffc8d8";
    c.beginPath();
    c.ellipse(Math.cos(a) * 4, -1 + Math.sin(a) * 4, 2, 5, a + Math.PI / 2, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = "#ffd21a";
  c.beginPath();
  c.arc(0, -2, 1.8, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

export const AM: Tema = {
  id: "am",
  nome: "Amazonas",
  descricao: "O Teatro Amazonas com a cúpula de mosaico, o Encontro das Águas do Negro e do Solimões, a floresta e os botos.",
  grupo: "estados",
  amostra: "conic-gradient(#ffd21a 33%, #2fa04a 0 66%, #2a6ac8 0)",
  onda: "sine",
  somBase: 466,
  climaFixo: "chuva",
  paleta: {
    ceu: [["#c8a0a8", "#f0dcc8"], ["#7aa4c8", "#dce8f0"], ["#6a5a8a", "#e8a888"], ["#0c1430", "#283658"]],
    longe: FLORESTA_LONGE,
    perto: FLORESTA,
    chao: "#6a5a3a",
    chaoLinha: "#3e3020",
    coluna: { corpo: "#ffd21a", sombra: "#c8a010", luz: "#ffe46a", contorno: "#1a2a4a" },
    maleta: { corpo: "#e8a8a8", escuro: "#8a4a5a", fivela: "#ffd21a", alca: "#6a2a3a" },
    asa: { cor: "#ffffff", contorno: "#2fa04a" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: MOSAICO,
    recorde: {
      cor: "#2fa04a", traco: [6, 6, 2, 6], largura: 3.5,
      aviso: { texto: "NOVO RECORDE!", fonte: "800 28px Georgia, serif", corTexto: "#ffd21a", corContorno: "#0a2a14", corFundo: "rgba(42,106,200,0.92)", anima: "pulsa" },
    },
    hud: "#0e1a14",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // o boto-cor-de-rosa dando saltos bem altos pelo rio, de um lado a outro: sai da água num jorro, gira no ar
    // pingando, e mergulha de bico, deixando os anéis na água
    const x = atravessa(w, f, 140);
    const vao = 320;
    const p = ((((x + 140) % vao) + vao) % vao) / vao;
    const y0 = h - 146;
    const alt = 130;
    const y = y0 + 10 - Math.sin(p * Math.PI) * alt;
    const ang = Math.atan2(-Math.cos(p * Math.PI) * alt * Math.PI, vao);
    const saida = x - p * vao;
    const entrada = saida + vao;
    // os anéis que ficam na água onde ele saiu e onde vai entrar
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 1.2;
    for (const [cx, idade] of [[saida, p], [entrada - vao, p + 1]] as const) {
      for (let i = 0; i < 2; i++) {
        const r = ((idade * 0.8 + i * 0.35) % 1) * 46;
        if (idade > 1.2) continue;
        ctx.globalAlpha = Math.max(0, 1 - r / 46);
        ctx.beginPath();
        ctx.ellipse(cx, y0 + 2, 8 + r, 2 + r * 0.14, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    // o corpo, recortado na linha d'água ao sair e ao entrar
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 200, y0 - 220, 400, 222);
    ctx.clip();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.scale(1.25, 1.25);
    corpoBoto(ctx, Math.sin(t * 9));
    ctx.restore();
    // as gotas que caem do corpo no ar
    if (p > 0.08 && p < 0.92) {
      ctx.fillStyle = "rgba(235,248,255,0.8)";
      for (let i = 0; i < 7; i++) {
        const q = (p * 6 + i * 0.37) % 1;
        const gx = x - Math.cos(ang) * (20 + i * 6) + Math.sin(i * 3.1) * 6;
        const gy = y - Math.sin(ang) * (20 + i * 6) + q * q * 50;
        if (gy > y0) continue;
        ctx.beginPath();
        ctx.ellipse(gx, gy, 1.3, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // o jorro de água ao sair e ao entrar: a coroa de espuma e os respingos em arco
    const jorro = (cx: number, forca: number) => {
      if (forca <= 0) return;
      ctx.fillStyle = `rgba(255,255,255,${0.75 * forca})`;
      ctx.beginPath();
      ctx.ellipse(cx, y0 + 1, 22 * (0.6 + forca * 0.4), 4, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI / 2 + (i - 4) * 0.28;
        const d = (1 - forca) * 26 + 6;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * d * 1.3, y0 - 2 + Math.sin(a) * d + (1 - forca) * (1 - forca) * 16, 2.4 * forca + 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    jorro(saida, 1 - p / 0.2);
    jorro(entrada, (p - 0.82) / 0.18);
  },
  decor(ctx, w, h, off, tod, t, tema, surpresa) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.76, h * 0.14, 20, "#e8e4dc");
    else sol(ctx, w * 0.76, h * 0.15, 22, "#fff8e8", "rgba(255,244,220,0.35)");
    // a floresta longe, e o teatro na cidade
    const longe = ciclo(FLORESTA_LONGE, tod);
    repetir(w, off * 0.04, 40, (x, k) => {
      ctx.fillStyle = longe;
      ctx.beginPath();
      ctx.arc(x + 20, h - 230 - variar(k, 7, 4) * 5, 22, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = longe;
    ctx.fillRect(0, h - 230, w, 40);
    repetir(w, off * 0.08, 1100, (x) => teatro(ctx, x + 420, h - 190, ciclo(TEATRO, tod), ciclo(TEATRO_SOMBRA, tod), noite));
    // o Encontro das Águas: o Negro em cima, o Solimões embaixo, com a divisa ondulada
    const yRio = h - 190;
    ctx.fillStyle = ciclo(NEGRO, tod);
    ctx.fillRect(0, yRio, w, 70);
    ctx.fillStyle = ciclo(SOLIMOES, tod);
    ctx.beginPath();
    ctx.moveTo(0, yRio + 150);
    for (let x = 0; x <= w + 20; x += 20) ctx.lineTo(x, yRio + 36 + Math.sin((x + off * 0.12) * 0.012 + t * 0.4) * 8);
    ctx.lineTo(w, yRio + 150);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let x = -((off * 0.12 + t * 15) % 60); x < w; x += 60) {
      ctx.moveTo(x, yRio + 16);
      ctx.lineTo(x + 16, yRio + 16);
      ctx.moveTo(x + 30, yRio + 60);
      ctx.lineTo(x + 46, yRio + 60);
    }
    ctx.stroke();
    // botos saltando
    repetir(w, off * 0.12, 500, (x, k) => boto(ctx, x + variar(k, 31, 200), yRio + 40, ((t * 0.5 + k * 0.37) % 2.2)));
    // a surpresa: o boto salta no rio, atrás da floresta de cá
    surpresa?.();
    // a floresta de cá, em copas grandes
    const floresta = ciclo(FLORESTA, tod);
    repetir(w, off * 0.36, 70, (x, k) => {
      ctx.fillStyle = floresta;
      ctx.beginPath();
      ctx.arc(x + 35, h - 70 - variar(k, 7, 4) * 8, 36 + variar(k, 13, 3) * 6, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = floresta;
    ctx.fillRect(0, h - 70, w, 30);
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#5a4c36", "#1a160e"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = "#2f6a34";
    ctx.fillRect(0, y, w, 4);
    // a calçada de ondas do Largo de São Sebastião, em frente ao teatro
    ctx.fillStyle = "#e8e0d0";
    ctx.beginPath();
    for (let x = -(off % 40) - 40; x < w + 40; x += 40) {
      ctx.moveTo(x, y + 16);
      ctx.quadraticCurveTo(x + 10, y + 10, x + 20, y + 16);
      ctx.quadraticCurveTo(x + 30, y + 22, x + 40, y + 16);
      ctx.lineTo(x + 40, y + 22);
      ctx.quadraticCurveTo(x + 30, y + 28, x + 20, y + 22);
      ctx.quadraticCurveTo(x + 10, y + 16, x, y + 22);
      ctx.closePath();
    }
    ctx.fill();
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // o mosaico da cúpula: losangos amarelos, verdes e azuis
    const lado = w / 4;
    ctx.fillStyle = ladrilho(ctx, "mosaico-am", lado, lado, (c2) => {
      c2.fillStyle = MOSAICO[0];
      c2.fillRect(0, 0, lado, lado);
      c2.fillStyle = MOSAICO[1];
      c2.beginPath();
      c2.moveTo(lado / 2, 0);
      c2.lineTo(lado, lado / 2);
      c2.lineTo(lado / 2, lado);
      c2.lineTo(0, lado / 2);
      c2.closePath();
      c2.fill();
      c2.fillStyle = MOSAICO[2];
      c2.beginPath();
      c2.moveTo(lado / 2, lado * 0.25);
      c2.lineTo(lado * 0.75, lado / 2);
      c2.lineTo(lado / 2, lado * 0.75);
      c2.lineTo(lado * 0.25, lado / 2);
      c2.closePath();
      c2.fill();
      c2.strokeStyle = "rgba(26,42,74,0.35)";
      c2.lineWidth = 0.8;
      c2.strokeRect(0, 0, lado, lado);
    });
    ctx.fillRect(x0, 0, w, len);
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, "rgba(255,255,255,0.3)");
    g.addColorStop(0.4, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(0,0,30,0.3)");
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, len);
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = c.luz;
      ctx.beginPath();
      ctx.moveTo(x0, 12);
      ctx.lineTo(x0 + w * 0.25, 2);
      ctx.lineTo(x0 + w * 0.5, 10);
      ctx.lineTo(x0 + w * 0.75, 0);
      ctx.lineTo(x0 + w, 8);
      ctx.lineTo(x0 + w, 14);
      ctx.lineTo(x0, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // a cornija rosa, como a fachada do teatro
    ctx.fillStyle = "#f0b0b0";
    ctx.fillRect(x0 - 5, 0, w + 10, 12);
    ctx.strokeRect(x0 - 5, 0, w + 10, 12);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x0 - 5, 8, w + 10, 2);
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, vitoriaRegia);
  },
};
