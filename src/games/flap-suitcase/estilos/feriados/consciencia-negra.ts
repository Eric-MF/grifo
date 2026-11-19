// Dia Nacional de Zumbi e da Consciência Negra (20/11, Lei 14.759/2023): a Serra da Barriga, onde ficava o Quilombo
// dos Palmares, ao pôr do sol, com a paliçada, as palmeiras e uma roda de capoeira.
import { ciclo, colinas, maletaPadrao, rr, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, figura, lua, noiteDe, palmeira, repetir, sol } from "../kit";

// cores por hora do dia (amanhecer, dia, entardecer, noite); aqui é sempre fim de tarde, e a noite fica púrpura
const SERRA = ["#7a3f4a", "#8a4a48", "#6a2f45", "#2a1530"];
const SERRA_PERTO = ["#5a2e38", "#653636", "#4e2236", "#1e0f24"];
const MADEIRA = ["#6a3e24", "#744428", "#5a3020", "#24140e"];
const PALHA = ["#a8783a", "#b4843f", "#8a5a30", "#3a2618"];
const ROSTO = ["#2a140c", "#2e160c", "#24100a", "#0e0606"];
const TERRA = ["#9a4a2a", "#a4502c", "#8a3f26", "#3a1c14"];

/** Uma estaca da paliçada: tronco com a ponta lavrada. */
function estaca(ctx: Ctx, x: number, base: number, alt: number, larg: number) {
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.lineTo(x, base - alt);
  ctx.lineTo(x + larg / 2, base - alt - larg * 0.9);
  ctx.lineTo(x + larg, base - alt);
  ctx.lineTo(x + larg, base);
  ctx.fill();
}

/** Mocambo de pau a pique com telhado de palha. */
function mocambo(ctx: Ctx, x: number, base: number, s: number, parede: string, palha: string) {
  ctx.fillStyle = parede;
  ctx.fillRect(x, base - 22 * s, 40 * s, 22 * s);
  ctx.fillStyle = palha;
  ctx.beginPath();
  ctx.moveTo(x - 8 * s, base - 20 * s);
  ctx.lineTo(x + 20 * s, base - 44 * s);
  ctx.lineTo(x + 48 * s, base - 20 * s);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(x + 15 * s, base - 14 * s, 10 * s, 14 * s);
}

/** Berimbau: a verga, o arame e a cabaça; `x, y` é a ponta de baixo. */
function berimbau(ctx: Ctx, x: number, y: number, alt: number, cor: string, cabaca: string) {
  ctx.strokeStyle = cor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x - alt * 0.14, y - alt / 2, x, y - alt);
  ctx.stroke();
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - alt);
  ctx.stroke();
  ctx.fillStyle = cabaca;
  ctx.beginPath();
  ctx.arc(x + 2.5, y - alt * 0.18, alt * 0.09, 0, Math.PI * 2);
  ctx.fill();
}

/** Roda de capoeira: gente em volta batendo palma, o berimbau, o atabaque e dois jogando no meio. */
function roda(ctx: Ctx, x: number, base: number, t: number, cor: string, k: number) {
  // quem está na roda, em semicírculo atrás
  for (let i = 0; i < 7; i++) {
    const px = x + i * 22 - 66;
    const palma = Math.sin(t * 6 + i) > 0 ? 0.9 : 0.6;
    figura(ctx, px, base - 6 - Math.sin((i / 6) * Math.PI) * 5, 0.78, cor, { bracoE: palma, bracoD: palma + 0.25, pernaE: 0.1, pernaD: -0.1 });
  }
  // o tocador de berimbau e o atabaque, na ponta da roda
  figura(ctx, x + 96, base, 0.85, cor, { bracoE: 0.7, bracoD: 1.4 + Math.sin(t * 8) * 0.15 });
  berimbau(ctx, x + 104, base - 14, 46, cor, cor);
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(x - 92, base);
  ctx.lineTo(x - 90, base - 24);
  ctx.lineTo(x - 78, base - 24);
  ctx.lineTo(x - 76, base);
  ctx.fill();
  // o jogo: ginga de um, meia-lua do outro
  const g = Math.sin(t * 3.2 + k);
  figura(ctx, x - 14 + g * 5, base, 0.95, cor, { tronco: -0.25 + g * 0.15, bracoE: 1.2 + g * 0.4, bracoD: -0.6 - g * 0.3, pernaE: 0.55 * g, pernaD: -0.5 * g, dobra: 0.4 });
  const chute = (t * 1.6 + k) % 1;
  const perna = chute < 0.5 ? -Math.sin(chute * 2 * Math.PI) * 2.2 : 0.2;
  figura(ctx, x + 26, base, 0.95, cor, { tronco: 0.3, bracoE: 0.9, bracoD: -1.1, pernaE: -0.3, pernaD: perna, dobra: 0.2 });
}

export const CONSCIENCIA_NEGRA: Tema = {
  id: "consciencia-negra",
  nome: "Consciência Negra",
  descricao: "20 de novembro: a Serra da Barriga, terra do Quilombo dos Palmares e de Zumbi, com roda de capoeira ao pôr do sol.",
  grupo: "feriados",
  janela: { tipo: "fixa", dia: 20, mes: 11 },
  amostra: "linear-gradient(135deg, #f08a3a 50%, #5a2e1a 50%)",
  onda: "triangle",
  somBase: 247,
  paleta: {
    // fim de tarde nas quatro fases; a noite é um pôr do sol que já escureceu
    ceu: [["#e9824a", "#ffd39a"], ["#e8743e", "#ffc77a"], ["#a8384e", "#f59a48"], ["#2a1238", "#8a3a42"]],
    longe: SERRA,
    perto: SERRA_PERTO,
    chao: "#9a4a2a",
    chaoLinha: "#6a2e1a",
    coluna: { corpo: "#8a5634", sombra: "#5e3620", luz: "#b07a4e", contorno: "#2e1a0e" },
    maleta: { corpo: "#7a4428", escuro: "#2e160a", fivela: "#f2b23a", alca: "#2e160a" },
    asa: { cor: "#fff4e0", contorno: "#6a3a1e" },
    moeda: ["#ffd866", "#b07a1e"],
    particula: ["#f2b23a", "#e2412c", "#fff4e0"],
    recorde: {
      cor: "#e2412c", traco: [10, 3, 3, 3], largura: 3.5,
      aviso: { texto: "NOVO RECORDE!", fonte: "900 28px system-ui, sans-serif", corTexto: "#ffe9b0", corContorno: "#3a1208", corFundo: "rgba(90,30,14,0.9)", anima: "treme" },
    },
    hud: "#2a0f08",
    estrelas: "#ffe9d0",
  },
  surpresa(ctx, w, h, f) {
    // um capoeirista atravessa o chão dando aús (estrelas), um atrás do outro
    const x = atravessa(w, f, 140);
    const giro = (x / 100) * Math.PI;
    const base = h - 46;
    ctx.save();
    ctx.translate(x, base - 32);
    ctx.rotate(giro);
    figura(ctx, 0, 32, 2, ciclo(ROSTO, 1), { bracoE: Math.PI * 0.85, bracoD: -Math.PI * 0.85, pernaE: 0.9, pernaD: -0.9 });
    ctx.restore();
    // o rastro de poeira vermelha
    ctx.fillStyle = "rgba(160,80,40,0.35)";
    for (let i = 1; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(x - i * 34, base + 2, 8 - i * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  decor(ctx, w, h, off, tod, t) {
    // o sol grande, baixo, atrás da serra; de noite, a lua
    if (noiteDe(tod) > 0.5) lua(ctx, w * 0.62, h * 0.3, 26, "#f6e6d0");
    else sol(ctx, w * 0.62, h * 0.5, 52, "#ffd27a", "rgba(255,200,120,0.5)");
    // a Serra da Barriga: um morro comprido e arredondado
    repetir(w, off * 0.05, 1300, (x) => {
      ctx.fillStyle = ciclo(SERRA, tod);
      ctx.beginPath();
      ctx.moveTo(x - 200, h - 40);
      ctx.bezierCurveTo(x + 50, h - 300, x + 520, h - 330, x + 900, h - 230);
      ctx.bezierCurveTo(x + 1050, h - 190, x + 1150, h - 120, x + 1300, h - 40);
      ctx.fill();
    });
    colinas(ctx, w, h - 40, off * 0.12, ciclo(SERRA_PERTO, tod), 70, 22, 0.008, 4);
    // mocambos atrás da paliçada
    const madeira = ciclo(MADEIRA, tod);
    const palha = ciclo(PALHA, tod);
    repetir(w, off * 0.22, 230, (x, k) => mocambo(ctx, x + variar(k, 17, 60), h - 104, 1.35 + variar(k, 7, 3) * 0.15, madeira, palha));
    // a paliçada do quilombo
    ctx.fillStyle = madeira;
    repetir(w, off * 0.25, 13, (x, k) => estaca(ctx, x, h - 80, 40 + variar(k, 7, 4) * 4, 12));
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(0, h - 104, w, 3);
    ctx.fillRect(0, h - 90, w, 3);
    // palmeiras (Palmares)
    const verde = ciclo(["#2f4a2a", "#355a2c", "#2a3a28", "#0f160e"], tod);
    repetir(w, off * 0.32, 170, (x, k) => {
      if (variar(k, 5, 3) === 0) return;
      palmeira(ctx, x + variar(k, 29, 50), h - 70, 120 + variar(k, 11, 4) * 16, verde, t, 0.18);
    });
    // chão de terra e a roda de capoeira
    colinas(ctx, w, h - 40, off * 0.42, ciclo(TERRA, tod), 30, 6, 0.012, 2);
    const cor = ciclo(ROSTO, tod);
    repetir(w, off * 0.45, 760, (x, k) => {
      ctx.save();
      ctx.translate(x + 300, h - 46);
      ctx.scale(1.2, 1.2);
      roda(ctx, 0, 0, t, cor, k);
      ctx.restore();
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    ctx.fillStyle = ciclo(TERRA, tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = tema.paleta.chaoLinha;
    ctx.fillRect(0, y, w, 3);
    // capim e pedras na terra vermelha
    ctx.fillStyle = "#6a2e1a";
    for (let x = -(off % 41); x < w; x += 41) ctx.fillRect(x + 8, y + 14, 7, 3);
    ctx.fillStyle = "#5a7a2a";
    ctx.beginPath();
    for (let x = -(off % 67); x < w; x += 67) {
      ctx.moveTo(x + 30, y + 3);
      ctx.lineTo(x + 32, y - 5);
      ctx.lineTo(x + 34, y + 3);
      ctx.lineTo(x + 37, y - 3);
      ctx.lineTo(x + 38, y + 3);
    }
    ctx.fill();
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // tronco lavrado: madeira em gradiente, com veios
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, c.sombra);
    g.addColorStop(0.4, c.luz);
    g.addColorStop(1, c.sombra);
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, len);
    ctx.strokeStyle = c.contorno;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const vx = x0 + 8 + i * (w - 16) / 4;
      ctx.moveTo(vx, 0);
      for (let y = 0; y < len; y += 40) ctx.quadraticCurveTo(vx + (variar(i + y, 7, 5) - 2) * 2, y + 20, vx, y + 40);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    // faixas entalhadas com triângulos (ocre, terracota e preto)
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, 0, w, len);
    ctx.clip();
    for (let y = 46 + variante * 20; y < len - 30; y += 150) {
      ctx.fillStyle = "#2a160c";
      ctx.fillRect(x0, y, w, 22);
      ctx.fillStyle = variante % 2 ? "#e0a03a" : "#c8502e";
      ctx.beginPath();
      for (let x = x0; x < x0 + w; x += 12) {
        ctx.moveTo(x, y + 19);
        ctx.lineTo(x + 6, y + 3);
        ctx.lineTo(x + 12, y + 19);
      }
      ctx.fill();
      ctx.fillStyle = "#f2d08a";
      ctx.fillRect(x0, y - 3, w, 2);
      ctx.fillRect(x0, y + 23, w, 2);
    }
    ctx.restore();
    ctx.lineWidth = 2;
    ctx.strokeStyle = c.contorno;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      // ponta lascada
      ctx.fillStyle = c.luz;
      ctx.beginPath();
      ctx.moveTo(x0, 12);
      for (let i = 0; i <= 6; i++) ctx.lineTo(x0 + (i * w) / 6, i % 2 ? 2 : 9);
      ctx.lineTo(x0 + w, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // ponta: corte reto e amarração de corda
    ctx.fillStyle = c.luz;
    rr(ctx, x0 - 3, 0, w + 6, 9, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#c9a46a";
    ctx.fillRect(x0 - 1, 13, w + 2, 9);
    ctx.strokeStyle = "#7a5a32";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let x = x0; x < x0 + w; x += 5) {
      ctx.moveTo(x, 13);
      ctx.lineTo(x + 4, 22);
    }
    ctx.stroke();
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => {
      // berimbau de lado, com a cabaça embaixo
      c.save();
      c.translate(27, 14);
      c.rotate(0.12);
      berimbau(c, 0, 0, 46, "#c9a46a", "#e0a03a");
      c.restore();
      // faixa de pano estampado na tampa
      c.fillStyle = "#c8502e";
      rr(c, -23, -14, 46, 3.4, 1.5);
      c.fill();
      c.fillStyle = "#f2b23a";
      for (let x = -20; x < 22; x += 6) c.fillRect(x, -13.5, 2.4, 2.4);
    });
  },
};
