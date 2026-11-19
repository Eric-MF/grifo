// Rondônia: Porto Velho, com a locomotiva da Estrada de Ferro Madeira-Mamoré, as Três Caixas d'Água no alto das
// torres, o rio Madeira e a floresta; as colunas são as caixas d'água de chapa rebitada, e na maleta vai o quepe de maquinista.
import { ciclo, colinas, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, lua, mar, noiteDe, repetir, sol } from "../kit";

// cores por hora do dia (amanhecer, dia, entardecer, noite)
const FLORESTA = ["#3a6a3a", "#2f7038", "#384a3a", "#0a160e"];
const FLORESTA_LONGE = ["#6a8a74", "#5f9074", "#5a6272", "#14202a"];
const RIO = ["#9a7a5a", "#a8825a", "#8a6a5a", "#241c18"];
const CAIXA = ["#a8acb0", "#b4b8bc", "#9a98a8", "#2e3038"];
const LOCOMOTIVA = ["#2a2a2e", "#26262a", "#24222a", "#08080c"];

/** Uma das Três Caixas d'Água: o tanque cilíndrico rebitado, com o teto cônico, sobre a torre de ferro. */
function caixaDagua(ctx: Ctx, x: number, base: number, cor: string) {
  ctx.strokeStyle = cor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 18, base);
  ctx.lineTo(x - 12, base - 90);
  ctx.moveTo(x + 18, base);
  ctx.lineTo(x + 12, base - 90);
  for (let y = base; y > base - 90; y -= 22) {
    ctx.moveTo(x - 18 + (base - y) * 0.066, y);
    ctx.lineTo(x + 12 - (base - y - 22) * 0.066, y - 22);
    ctx.moveTo(x + 18 - (base - y) * 0.066, y);
    ctx.lineTo(x - 12 + (base - y - 22) * 0.066, y - 22);
  }
  ctx.stroke();
  ctx.fillStyle = cor;
  ctx.fillRect(x - 20, base - 128, 40, 40);
  ctx.beginPath();
  ctx.moveTo(x - 22, base - 128);
  ctx.lineTo(x, base - 146);
  ctx.lineTo(x + 22, base - 128);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(x - 20, base - 116, 40, 2);
  ctx.fillRect(x - 20, base - 102, 40, 2);
  ctx.fillRect(x + 8, base - 128, 12, 40);
}

/** Locomotiva a vapor da Madeira-Mamoré, com a chaminé em funil e o limpa-trilhos, puxando um vagão. */
function locomotiva(ctx: Ctx, x: number, trilho: number, cor: string, t: number) {
  // o vagão atrás e a locomotiva de frente para a direita: a cabine junto do vagão, a chaminé e o limpa-trilhos na frente
  ctx.fillStyle = cor;
  ctx.fillRect(x - 70, trilho - 24, 50, 18);
  ctx.fillRect(x - 74, trilho - 28, 58, 4);
  ctx.fillRect(x, trilho - 26, 50, 18);
  ctx.fillRect(x - 4, trilho - 44, 22, 36);
  ctx.fillRect(x - 6, trilho - 48, 26, 4);
  // a chaminé em funil
  ctx.beginPath();
  ctx.moveTo(x + 44, trilho - 26);
  ctx.lineTo(x + 42, trilho - 36);
  ctx.lineTo(x + 48, trilho - 48);
  ctx.lineTo(x + 30, trilho - 48);
  ctx.lineTo(x + 36, trilho - 36);
  ctx.lineTo(x + 34, trilho - 26);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 52, trilho - 8);
  ctx.lineTo(x + 64, trilho);
  ctx.lineTo(x + 48, trilho);
  ctx.fill();
  ctx.fillStyle = "#c8a43a";
  ctx.fillRect(x + 22, trilho - 30, 6, 6);
  ctx.strokeStyle = "#5a5a5e";
  ctx.lineWidth = 1.4;
  // rodas girando no sentido do movimento
  for (const [rx, r] of [[x + 38, 7], [x + 20, 7], [x + 4, 5], [x - 60, 4], [x - 30, 4]]) {
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.arc(rx, trilho - r + 1, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    const a = t * 8;
    ctx.moveTo(rx + Math.cos(a) * r, trilho - r + 1 + Math.sin(a) * r);
    ctx.lineTo(rx - Math.cos(a) * r, trilho - r + 1 - Math.sin(a) * r);
    ctx.stroke();
  }
  // a fumaça sai da chaminé e fica para trás
  for (let i = 0; i < 6; i++) {
    const f = (((t * 0.9 + i / 6) % 1) + 1) % 1;
    ctx.fillStyle = `rgba(90,90,96,${0.6 * (1 - f)})`;
    ctx.beginPath();
    ctx.arc(x + 39 - f * 60, trilho - 52 - f * 50, 5 + f * 14, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Quepe de maquinista, listrado de azul e branco. */
function quepeMaquinista(c: Ctx) {
  c.save();
  c.translate(-7, -21);
  c.rotate(-0.14);
  c.fillStyle = "#ffffff";
  c.beginPath();
  c.moveTo(-9, 2);
  c.quadraticCurveTo(-9, -9, 0, -9);
  c.quadraticCurveTo(9, -9, 9, 2);
  c.closePath();
  c.fill();
  c.save();
  c.clip();
  c.fillStyle = "#2a4a8a";
  for (let x = -9; x < 9; x += 4) c.fillRect(x, -10, 2, 13);
  c.restore();
  c.fillStyle = "#1a2a4a";
  c.beginPath();
  c.ellipse(4, 2.5, 9, 2.2, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

export const RO: Tema = {
  id: "ro",
  nome: "Rondônia",
  descricao: "Porto Velho: a locomotiva da Madeira-Mamoré, as Três Caixas d'Água no alto das torres e o rio Madeira.",
  grupo: "estados",
  amostra: "linear-gradient(135deg, #b4b8bc 50%, #2a4a8a 50%)",
  onda: "square",
  somBase: 294,
  paleta: {
    ceu: [["#e8a8a0", "#fde2cc"], ["#5aa8e0", "#dcf0fa"], ["#5a5a98", "#f0a878"], ["#0a1434", "#24386a"]],
    longe: FLORESTA_LONGE,
    perto: FLORESTA,
    chao: "#8a6a4a",
    chaoLinha: "#4a3420",
    coluna: { corpo: "#a8acb2", sombra: "#7e828a", luz: "#ccd0d6", contorno: "#2a2c32" },
    maleta: { corpo: "#2a4a8a", escuro: "#0e1e44", fivela: "#ffd21a", alca: "#0e1e44" },
    asa: { cor: "#ffffff", contorno: "#2a4a8a" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: ["#ccd0d6", "#2a4a8a", "#ffffff"],
    recorde: {
      cor: "#4a7ae8", traco: [16, 3, 3, 3], largura: 3.5,
      aviso: { texto: "NOVO RECORDE!", fonte: "800 28px system-ui, sans-serif", corTexto: "#ffffff", corContorno: "#0e1e44", corFundo: "rgba(42,74,138,0.92)", anima: "pulsa" },
    },
    hud: "#101828",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // a cobra-grande da lenda, nadando no rio Madeira: o corpo comprido entra e sai da água em laçadas que correm da
    // cabeça para a cauda, com as escamas, a barriga clara, a cabeça com a mandíbula, os olhos acesos e a língua bífida
    const x = atravessa(w, f, 420);
    const y = h - 170;
    const escama = "#2e4232";
    const barriga = "#8a9a5a";
    // o corpo é uma onda que vai afinando até a cauda; só aparece o que fica acima da linha d'água (y + 8)
    const pontos: [number, number][] = [];
    for (let i = 0; i <= 60; i++) {
      const d = i * 6;
      const env = Math.min(1, d / 40);
      pontos.push([x - 14 - d, y + 6 - Math.sin(d * 0.034 - t * 3.2) * 22 * env + (1 - env) * -6]);
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 420, y - 80, 460, 88);
    ctx.clip();
    const tracar = (cor: string, larg: (i: number) => number, dy = 0) => {
      ctx.strokeStyle = cor;
      ctx.lineCap = "round";
      for (let i = 0; i < pontos.length - 1; i++) {
        ctx.lineWidth = larg(i);
        ctx.beginPath();
        ctx.moveTo(pontos[i]![0], pontos[i]![1] + dy);
        ctx.lineTo(pontos[i + 1]![0], pontos[i + 1]![1] + dy);
        ctx.stroke();
      }
    };
    const grossura = (i: number) => 17 - i * 0.2;
    tracar("#1e2a22", grossura);
    tracar(barriga, (i) => grossura(i) * 0.3, 5);
    tracar("rgba(120,150,110,0.45)", (i) => grossura(i) * 0.22, -4.5);
    // as escamas: losangos ao longo do dorso
    ctx.strokeStyle = escama;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (let i = 1; i < pontos.length - 1; i += 1) {
      const [px, py] = pontos[i]!;
      const e = grossura(i) * 0.22;
      ctx.moveTo(px - e, py - 1);
      ctx.lineTo(px, py - 1 - e);
      ctx.lineTo(px + e, py - 1);
      ctx.lineTo(px, py - 1 + e);
      ctx.closePath();
    }
    ctx.stroke();
    ctx.restore();
    // a água abrindo onde o corpo entra e sai do rio
    ctx.strokeStyle = "rgba(255,240,220,0.55)";
    ctx.lineWidth = 1.2;
    for (let i = 1; i < pontos.length; i++) {
      const [, a] = pontos[i - 1]!;
      const [px, b] = pontos[i]!;
      if ((a - (y + 8)) * (b - (y + 8)) < 0) {
        ctx.beginPath();
        ctx.ellipse(px, y + 9, 12 - i * 0.12 + Math.sin(t * 4 + i) * 1.5, 2.4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // a cabeça, um pouco erguida
    ctx.save();
    ctx.translate(x, y - 2);
    ctx.rotate(-0.15 + Math.sin(t * 1.5) * 0.05);
    ctx.fillStyle = "#1e2a22";
    ctx.beginPath();
    ctx.moveTo(-20, 8);
    ctx.quadraticCurveTo(-22, -10, 0, -12);
    ctx.quadraticCurveTo(24, -12, 30, -2);
    ctx.quadraticCurveTo(26, 4, 8, 4);
    ctx.quadraticCurveTo(26, 6, 24, 10);
    ctx.quadraticCurveTo(4, 14, -20, 8);
    ctx.fill();
    ctx.fillStyle = barriga;
    ctx.beginPath();
    ctx.moveTo(-14, 9);
    ctx.quadraticCurveTo(6, 13, 22, 9);
    ctx.quadraticCurveTo(6, 10, -14, 7);
    ctx.fill();
    // a língua, que sai e entra
    if (Math.sin(t * 4) > 0.2) {
      ctx.strokeStyle = "#c8323a";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(29, 2);
      ctx.lineTo(38, 3);
      ctx.lineTo(42, 0);
      ctx.moveTo(38, 3);
      ctx.lineTo(42, 6);
      ctx.stroke();
    }
    ctx.restore();
    // os olhos acesos, com o brilho
    const g = ctx.createRadialGradient(x + 13, y - 9, 2, x + 13, y - 9, 30);
    g.addColorStop(0, "rgba(255,226,58,0.45)");
    g.addColorStop(1, "rgba(255,226,58,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - 17, y - 39, 60, 60);
    ctx.fillStyle = "#ffe23a";
    for (const dx of [8, 17]) {
      ctx.beginPath();
      ctx.ellipse(x + dx, y - 10 + dx * 0.15, 3, 2.2, -0.15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#1a1408";
    for (const dx of [8, 17]) ctx.fillRect(x + dx - 0.5, y - 12 + dx * 0.15, 1, 4);
  },
  decor(ctx, w, h, off, tod, t, tema, surpresa) {
    const p = tema.paleta;
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.84, h * 0.14, 20);
    else sol(ctx, w * 0.84, h * 0.15, 24, "#fff4d6", "rgba(255,236,180,0.45)");
    colinas(ctx, w, h - 40, off * 0.04, ciclo(p.longe, tod), 190, 16, 0.01, 1);
    // o rio Madeira e a floresta da outra margem
    const yRio = h - 190;
    const floresta = ciclo(p.perto, tod);
    repetir(w, off * 0.06, 40, (x, k) => {
      ctx.fillStyle = floresta;
      ctx.beginPath();
      ctx.arc(x + 20, yRio - variar(k, 7, 4) * 4, 20, 0, Math.PI * 2);
      ctx.fill();
    });
    mar(ctx, w, yRio, 60, off * 0.08, ciclo(RIO, tod), "rgba(255,240,220,0.3)", t);
    // a surpresa: a cobra-grande nada no rio, atrás das Três Caixas d'Água e do pátio da ferrovia
    surpresa?.();
    // as Três Caixas d'Água
    const caixa = ciclo(CAIXA, tod);
    repetir(w, off * 0.14, 1200, (x) => {
      for (let i = 0; i < 3; i++) caixaDagua(ctx, x + 300 + i * 70, h - 120 - (i === 1 ? 10 : 0), caixa);
    });
    // o pátio da ferrovia, com a locomotiva indo e vindo
    ctx.fillStyle = ciclo(["#7a6a4a", "#806e4a", "#6a5a48", "#1c1810"], tod);
    ctx.fillRect(0, yRio + 56, w, h - yRio - 56);
    ctx.fillStyle = "#4a3a2a";
    repetir(w, off * 0.24, 16, (x) => ctx.fillRect(x, h - 96, 8, 4));
    ctx.fillStyle = "#8a8a90";
    ctx.fillRect(0, h - 98, w, 2);
    const trem = ciclo(LOCOMOTIVA, tod);
    // a locomotiva atravessa o pátio da esquerda para a direita e volta a aparecer do outro lado
    const volta = w + 400;
    locomotiva(ctx, ((((t * 150 - off * 0.24) % volta) + volta) % volta) - 200, h - 98, trem, t);
    colinas(ctx, w, h - 40, off * 0.36, floresta, 34, 10, 0.014, 3);
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#7a5c42", "#221a12"], tod);
    ctx.fillRect(0, y, w, h - y);
    // trilho com os dormentes
    ctx.fillStyle = "#4a3420";
    for (let x = -(off % 18); x < w; x += 18) ctx.fillRect(x, y + 10, 10, 18);
    ctx.fillStyle = "#9a9aa0";
    ctx.fillRect(0, y + 12, w, 3);
    ctx.fillRect(0, y + 24, w, 3);
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // chapa de ferro rebitada, em anéis, com o brilho do cilindro
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, c.sombra);
    g.addColorStop(0.3, c.luz);
    g.addColorStop(0.7, c.corpo);
    g.addColorStop(1, c.sombra);
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, len);
    // as juntas entre as chapas e os rebites, num caminho só
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    for (let y = 26 + variante * 9; y < len; y += 34) ctx.fillRect(x0, y, w, 2);
    ctx.fillStyle = "#4a4c52";
    ctx.beginPath();
    for (let y = 26 + variante * 9; y < len; y += 34) {
      for (let x = x0 + 4; x < x0 + w; x += 8) {
        ctx.moveTo(x + 1.3, y + 5);
        ctx.arc(x, y + 5, 1.3, 0, Math.PI * 2);
      }
    }
    ctx.fill();
    // marcas de ferrugem escorrida
    ctx.fillStyle = "rgba(150,80,30,0.25)";
    for (let i = 0; i < 3; i++) ctx.fillRect(x0 + 10 + i * 22 + variar(i + variante, 7, 6), 40 + variar(i, 13, 60), 3, 30 + variar(i + variante, 5, 4) * 10);
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = c.luz;
      ctx.beginPath();
      ctx.moveTo(x0, 12);
      ctx.lineTo(x0 + w * 0.3, 2);
      ctx.lineTo(x0 + w * 0.6, 10);
      ctx.lineTo(x0 + w, 0);
      ctx.lineTo(x0 + w, 14);
      ctx.lineTo(x0, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // o aro de cima da caixa, com a escada de serviço
    ctx.fillStyle = c.sombra;
    ctx.fillRect(x0 - 4, 0, w + 8, 10);
    ctx.strokeRect(x0 - 4, 0, w + 8, 10);
    ctx.fillStyle = "#4a4c52";
    for (let x = x0; x < x0 + w; x += 8) ctx.fillRect(x + 2, 4, 2, 2);
    ctx.strokeStyle = "#3a3c42";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x0 + w - 14, 10);
    ctx.lineTo(x0 + w - 14, 60);
    ctx.moveTo(x0 + w - 6, 10);
    ctx.lineTo(x0 + w - 6, 60);
    for (let y = 16; y < 60; y += 8) {
      ctx.moveTo(x0 + w - 14, y);
      ctx.lineTo(x0 + w - 6, y);
    }
    ctx.stroke();
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, quepeMaquinista);
  },
};
