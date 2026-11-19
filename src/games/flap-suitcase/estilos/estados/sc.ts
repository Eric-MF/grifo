// Santa Catarina: a Ponte Hercílio Luz, pênsil, sobre a baía de Florianópolis, as praias, as casas enxaimel
// com floreiras do Vale do Itajaí e as colunas em enxaimel; na maleta, o chapéu tirolês.
import { ciclo, colinas, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, lua, mar, noiteDe, repetir, sol } from "../kit";

// cores por hora do dia (amanhecer, dia, entardecer, noite)
const MORRO = ["#5a7a6a", "#4a8064", "#4a5466", "#0e1a20"];
const MORRO_LONGE = ["#8aa0b4", "#7fabc4", "#6e6a92", "#141e3a"];
const MAR = ["#4a8aa8", "#2a9ac0", "#4a6a96", "#0e2240"];
const PONTE = ["#c8ccd4", "#d8dce2", "#bcb0c0", "#3a3e54"];
const REBOCO = ["#f4ece0", "#fbf6ee", "#ecdcd4", "#5a5868"];
const MADEIRA = ["#5a3a24", "#5e3e26", "#4e3226", "#181014"];
const TELHA = ["#a8483a", "#b4503e", "#8a3e3a", "#2a1a20"];

/** Ponte Hercílio Luz: as duas torres, a corrente de barras e o tabuleiro, com as luzes de noite. */
function hercilioLuz(ctx: Ctx, x: number, base: number, cor: string, acesas: number) {
  const vao = 420;
  const topo = base - 150;
  ctx.fillStyle = cor;
  ctx.strokeStyle = cor;
  for (const tx of [x, x + vao]) {
    ctx.fillRect(tx - 5, topo, 10, base - topo);
    ctx.fillRect(tx - 9, topo - 4, 18, 6);
  }
  ctx.fillRect(x - 160, base - 24, vao + 320, 6);
  // a corrente em barras: curva entre as torres, com o triângulo de treliça no meio
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 160, base - 24);
  ctx.quadraticCurveTo(x - 60, base - 60, x, topo);
  ctx.quadraticCurveTo(x + vao / 2, base - 10, x + vao, topo);
  ctx.quadraticCurveTo(x + vao + 60, base - 60, x + vao + 160, base - 24);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < 14; i++) {
    const f = i / 14;
    const px = x + f * vao;
    const py = (1 - f) * (1 - f) * topo + 2 * f * (1 - f) * (base - 10) + f * f * topo;
    ctx.moveTo(px, py);
    ctx.lineTo(px, base - 24);
  }
  ctx.stroke();
  if (acesas > 0.3) {
    ctx.fillStyle = "#fff0b0";
    for (let i = 0; i <= 28; i++) {
      const f = i / 28;
      const px = x + f * vao;
      const py = (1 - f) * (1 - f) * topo + 2 * f * (1 - f) * (base - 10) + f * f * topo;
      ctx.beginPath();
      ctx.arc(px, py, 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Casa enxaimel: reboco branco, a trama de madeira, telhado bem inclinado e floreira na janela. */
function enxaimel(ctx: Ctx, x: number, base: number, reboco: string, madeira: string, telha: string, k: number) {
  const L = 70;
  const alt = 48;
  ctx.fillStyle = reboco;
  ctx.fillRect(x, base - alt, L, alt);
  ctx.fillStyle = telha;
  ctx.beginPath();
  ctx.moveTo(x - 6, base - alt);
  ctx.lineTo(x + L / 2, base - alt - 40);
  ctx.lineTo(x + L + 6, base - alt);
  ctx.fill();
  ctx.fillStyle = reboco;
  ctx.beginPath();
  ctx.moveTo(x + 10, base - alt);
  ctx.lineTo(x + L / 2, base - alt - 26);
  ctx.lineTo(x + L - 10, base - alt);
  ctx.fill();
  ctx.strokeStyle = madeira;
  ctx.lineWidth = 2.4;
  ctx.strokeRect(x, base - alt, L, alt);
  ctx.beginPath();
  ctx.moveTo(x, base - alt / 2);
  ctx.lineTo(x + L, base - alt / 2);
  for (const vx of [x + 23, x + 47]) {
    ctx.moveTo(vx, base - alt);
    ctx.lineTo(vx, base);
  }
  ctx.moveTo(x, base);
  ctx.lineTo(x + 23, base - alt / 2);
  ctx.moveTo(x + L, base);
  ctx.lineTo(x + 47, base - alt / 2);
  ctx.moveTo(x + 10, base - alt);
  ctx.lineTo(x + L / 2, base - alt - 26);
  ctx.lineTo(x + L - 10, base - alt);
  ctx.moveTo(x + L / 2, base - alt);
  ctx.lineTo(x + L / 2, base - alt - 26);
  ctx.stroke();
  // janela com floreira
  ctx.fillStyle = "#3a5a7a";
  ctx.fillRect(x + 27, base - alt + 6, 16, 12);
  ctx.fillStyle = "#3a6a3a";
  ctx.fillRect(x + 25, base - alt + 18, 20, 4);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = ["#e8333a", "#ffd21a", "#ff7ab0"][variar(k + i, 7, 3)];
    ctx.beginPath();
    ctx.arc(x + 28 + i * 5, base - alt + 18, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Baleia-franca vista de lado, virada para a direita, com a linha d'água em `y`: o dorso largo sem barbatana, a cabeça
 * grande com a boca em arco e as calosidades claras, a nadadeira em remo. `fase` (0 a 1) é o ciclo de respirar:
 * sobe e borrifa, rola mergulhando e levanta a cauda.
 */
function baleiaFranca(ctx: Ctx, x: number, y: number, s: number, fase: number, t: number) {
  const suave = (a: number, b: number) => Math.min(1, Math.max(0, (fase - a) / (b - a)));
  // subindo (0 a 0,08), no alto (até 0,55), rolando para baixo (0,55 a 0,78)
  const sobe = suave(0, 0.08) * (1 - suave(0.55, 0.78));
  const rola = suave(0.55, 0.78);
  const corpo = "#1c222c";
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // a água abrindo em volta do dorso
  if (sobe > 0.05) {
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.beginPath();
    ctx.ellipse(-8 - rola * 50, 1, 98 * sobe, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // o corpo, recortado na linha d'água: no alto mostra o dorso e a cabeça; ao rolar, a cabeça afunda e o dorso arqueia
  ctx.save();
  ctx.beginPath();
  ctx.rect(-140, -90, 260, 91);
  ctx.clip();
  ctx.save();
  ctx.translate(-rola * 30, 26 - sobe * 27 + rola * 30);
  ctx.rotate(rola * 0.42);
  ctx.fillStyle = corpo;
  ctx.beginPath();
  ctx.moveTo(-96, 0);
  ctx.quadraticCurveTo(-50, -18, 8, -21);
  ctx.quadraticCurveTo(34, -22, 42, -17);
  ctx.quadraticCurveTo(60, -19, 76, -5);
  ctx.quadraticCurveTo(74, 10, 40, 19);
  ctx.quadraticCurveTo(-10, 24, -56, 12);
  ctx.quadraticCurveTo(-80, 6, -96, 0);
  ctx.fill();
  // a luz no dorso
  ctx.strokeStyle = "rgba(150,170,196,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-70, -9);
  ctx.quadraticCurveTo(-30, -19, 10, -19);
  ctx.stroke();
  // a boca em arco e o olho no canto dela
  ctx.strokeStyle = "#07090d";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(75, -3);
  ctx.quadraticCurveTo(60, -16, 38, 4);
  ctx.stroke();
  ctx.fillStyle = "#4a5260";
  ctx.beginPath();
  ctx.ellipse(37, 1, 2.6, 1.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#07090d";
  ctx.beginPath();
  ctx.arc(37, 1, 1.3, 0, Math.PI * 2);
  ctx.fill();
  // as calosidades: as manchas ásperas e claras no alto da cabeça e na ponta do focinho
  ctx.fillStyle = "#d8d0bc";
  for (const [cx, cy, r] of [[70, -9, 3.2], [64, -13, 2.6], [57, -16, 2.2], [48, -17, 2.4], [72, -4, 1.8], [44, -10, 1.6]] as const) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#a89c84";
  for (const [cx, cy] of [[70, -9], [64, -13], [48, -17]] as const) ctx.fillRect(cx - 0.6, cy - 0.6, 1.2, 1.2);
  // a nadadeira peitoral, larga como um remo
  ctx.fillStyle = corpo;
  ctx.beginPath();
  ctx.moveTo(26, 12);
  ctx.quadraticCurveTo(14, 30 + Math.sin(t * 1.5) * 3, 2, 32);
  ctx.quadraticCurveTo(10, 22, 14, 12);
  ctx.fill();
  ctx.restore();
  ctx.restore();
  // o borrifo em V, das duas narinas, logo depois de subir
  const sopro = suave(0.06, 0.42);
  if (sopro > 0 && sopro < 1) {
    // cada lado do V é uma névoa de gotinhas que sobe, abre e se desfaz com o vento
    const sobeV = Math.min(1, sopro * 2.2);
    // em três faixas de altura, cada uma num caminho só (a de cima mais transparente)
    for (let faixa = 0; faixa < 3; faixa++) {
      ctx.fillStyle = `rgba(250,252,255,${(0.26 - faixa * 0.05) * (1 - sopro)})`;
      ctx.beginPath();
      for (const l of [-1, 1]) {
        for (let i = faixa * 6; i < faixa * 6 + 6; i++) {
          const a = (i / 17) * sobeV;
          const r = 2.5 + a * 8 + (i % 3);
          const px = 40 + l * (4 + a * 20) - a * sopro * 14 + ((i * 7) % 7) - 3;
          const py = -14 - a * 48 + ((i * 5) % 3);
          ctx.moveTo(px + r, py);
          ctx.arc(px, py, r, 0, Math.PI * 2);
        }
      }
      ctx.fill();
    }
  }
  // a cauda: sai da água, sobe com as duas pontas, escorre e afunda
  const cauda = suave(0.66, 0.8) * (1 - suave(0.86, 0.97));
  if (cauda > 0) {
    const cx = -72;
    const alto = cauda * 52;
    ctx.fillStyle = corpo;
    ctx.beginPath();
    ctx.moveTo(cx - 8, 1);
    ctx.quadraticCurveTo(cx - 4, -alto * 0.5, cx - 3, -alto + 6);
    ctx.lineTo(cx + 3, -alto + 6);
    ctx.quadraticCurveTo(cx + 4, -alto * 0.5, cx + 8, 1);
    ctx.fill();
    // as duas pontas da cauda, largas e lisas, com o entalhe no meio
    ctx.beginPath();
    ctx.moveTo(cx, -alto + 4);
    ctx.quadraticCurveTo(cx - 14, -alto - 2, cx - 32, -alto - 14);
    ctx.quadraticCurveTo(cx - 20, -alto + 4, cx - 2, -alto + 8);
    ctx.lineTo(cx + 2, -alto + 8);
    ctx.quadraticCurveTo(cx + 20, -alto + 4, cx + 32, -alto - 14);
    ctx.quadraticCurveTo(cx + 14, -alto - 2, cx, -alto + 4);
    ctx.fill();
    // a água escorrendo da borda da cauda
    ctx.strokeStyle = "rgba(220,236,250,0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const dx = (i - 2.5) * 10;
      const cai = ((t * 1.6 + i * 0.37) % 1) * Math.max(4, alto - 6);
      ctx.moveTo(cx + dx, -alto - 4 + Math.abs(dx) * -0.3 + cai);
      ctx.lineTo(cx + dx, -alto + 2 + Math.abs(dx) * -0.3 + cai);
    }
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.ellipse(cx, 1, 18, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // depois do mergulho, a mancha lisa da cauda e os anéis abrindo
  const pegada = suave(0.86, 1);
  if (pegada > 0 && pegada < 1) {
    ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - pegada)})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(-72, 1, 16 + pegada * 34, 3 + pegada * 4, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** Veleiro de passeio: casco branco com a faixa, a vela grande e a buja enchendo com o vento, a bandeirinha e a esteira. */
function veleiro(ctx: Ctx, x: number, y: number, t: number, k: number, faixa: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 1.3 + k) * 0.05);
  const enche = Math.sin(t * 1.8 + k * 2) * 1.5;
  // a esteira para trás (o barco vai para a direita)
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-16, 3);
  ctx.lineTo(-34, 5);
  ctx.moveTo(-14, 5);
  ctx.lineTo(-28, 8);
  ctx.stroke();
  // o casco, com a proa erguida
  ctx.fillStyle = "#f8f4ec";
  ctx.beginPath();
  ctx.moveTo(-16, -4);
  ctx.lineTo(20, -5);
  ctx.quadraticCurveTo(14, 4, 8, 4);
  ctx.lineTo(-13, 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = faixa;
  ctx.fillRect(-15, -2, 31, 2);
  // o mastro, a vela grande e a buja
  ctx.fillStyle = "#4a3a2a";
  ctx.fillRect(-0.8, -38, 1.6, 34);
  ctx.fillStyle = "#fbf8f0";
  ctx.beginPath();
  ctx.moveTo(-1.5, -36);
  ctx.quadraticCurveTo(-10 - enche, -18, -14, -7);
  ctx.lineTo(-1.5, -7);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(1.5, -34);
  ctx.quadraticCurveTo(10 + enche, -18, 17, -7);
  ctx.lineTo(1.5, -7);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.moveTo(-1.5, -22);
  ctx.lineTo(-9, -22);
  ctx.stroke();
  // a bandeirinha no topo
  ctx.fillStyle = faixa;
  ctx.beginPath();
  ctx.moveTo(0.8, -38);
  ctx.lineTo(7, -36.5 + Math.sin(t * 6 + k) * 0.8);
  ctx.lineTo(0.8, -35);
  ctx.fill();
  ctx.restore();
}

/** Chapéu tirolês verde, com a pena. */
function chapeuTiroles(c: Ctx, t: number) {
  c.save();
  c.translate(-8, -22);
  c.rotate(-0.12);
  c.fillStyle = "#2e5a36";
  c.strokeStyle = "#12301a";
  c.lineWidth = 1;
  c.beginPath();
  c.ellipse(0, 2, 13, 3, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(-8, 2);
  c.lineTo(-5, -10);
  c.quadraticCurveTo(0, -13, 5, -10);
  c.lineTo(8, 2);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = "#c8322f";
  c.fillRect(-7.5, -2, 15, 2.6);
  c.save();
  c.translate(6, -3);
  c.rotate(-0.9 + Math.sin(t * 6) * 0.12);
  c.fillStyle = "#f2e6c8";
  c.beginPath();
  c.ellipse(0, -7, 1.8, 8, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
  c.restore();
}

export const SC: Tema = {
  id: "sc",
  nome: "Santa Catarina",
  descricao: "A Ponte Hercílio Luz sobre a baía de Florianópolis, as praias e as casas enxaimel do Vale do Itajaí.",
  grupo: "estados",
  amostra: "linear-gradient(135deg, #f4ece0 50%, #5a3a24 50%)",
  onda: "triangle",
  somBase: 330,
  paleta: {
    ceu: [["#e8a8a0", "#fde2cc"], ["#5aa8e0", "#dcf0fa"], ["#5a5a98", "#f0a878"], ["#0a1434", "#24386a"]],
    longe: MORRO_LONGE,
    perto: MORRO,
    chao: "#6a9a4a",
    chaoLinha: "#3f6a2a",
    coluna: { corpo: "#f4ece0", sombra: "#d8ccbc", luz: "#ffffff", contorno: "#3a2414" },
    maleta: { corpo: "#c8322f", escuro: "#6a1414", fivela: "#ffffff", alca: "#6a1414" },
    asa: { cor: "#ffffff", contorno: "#2e5a36" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: ["#c8322f", "#ffffff", "#2e5a36"],
    recorde: {
      cor: "#c8322f", traco: [4, 2, 4, 8], largura: 3.5,
      aviso: { texto: "NOVO RECORDE!", fonte: "800 28px Georgia, serif", corTexto: "#ffffff", corContorno: "#3a0a0a", corFundo: "rgba(200,50,47,0.9)", anima: "pulsa" },
    },
    hud: "#1a2418",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // a baleia-franca e o filhote passando pela baía: sobem, soltam o borrifo em V, rolam para mergulhar e levantam a
    // cauda antes de sumir
    const x0 = atravessa(w, f, 300);
    // ao largo, logo à frente das torres da ponte, para aparecer por cima dos telhados
    baleiaFranca(ctx, x0, h - 120, 1.15, (f * 2) % 1, t);
    baleiaFranca(ctx, x0 - 170, h - 114, 0.62, (f * 2 + 0.12) % 1, t + 1.3);
  },
  decor(ctx, w, h, off, tod, t, tema, surpresa) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.78, h * 0.14, 20);
    else sol(ctx, w * 0.78, h * 0.15, 24, "#fff4d6", "rgba(255,236,180,0.45)");
    colinas(ctx, w, h - 40, off * 0.04, ciclo(MORRO_LONGE, tod), 160, 30, 0.006, 3);
    // a baía com a ponte
    const yMar = h - 140;
    colinas(ctx, w, yMar, off * 0.08, ciclo(MORRO, tod), 40, 16, 0.009, 1);
    mar(ctx, w, yMar, 100, off * 0.12, ciclo(MAR, tod), "rgba(255,255,255,0.55)", t);
    repetir(w, off * 0.12, 1300, (x) => hercilioLuz(ctx, x + 400, yMar + 18, ciclo(PONTE, tod), noite));
    // a surpresa: as baleias passam na baía, atrás dos veleiros, da praia e das casas
    surpresa?.();
    // veleiros
    repetir(w, off * 0.16 - t * 8, 380, (x, k) => {
      const by = yMar + 52 + variar(k, 7, 3) * 10 + Math.sin(t * 1.3 + k) * 1.5;
      veleiro(ctx, x + variar(k, 31, 160), by, t, k, ["#3a4a6a", "#c8322f", "#2e7a4a"][variar(k, 13, 3)]!);
    });
    // a praia e as casas enxaimel
    ctx.fillStyle = ciclo(["#f0dcb0", "#f6e4b8", "#e2c8a4", "#4e4640"], tod);
    ctx.fillRect(0, yMar + 96, w, h - yMar - 96);
    const reboco = ciclo(REBOCO, tod);
    const madeira = ciclo(MADEIRA, tod);
    const telha = ciclo(TELHA, tod);
    colinas(ctx, w, h - 40, off * 0.34, ciclo(["#6a9a4a", "#5fa046", "#566a4a", "#0e1c12"], tod), 30, 6, 0.014, 2);
    repetir(w, off * 0.38, 190, (x, k) => {
      if (variar(k, 5, 4) === 0) return;
      enxaimel(ctx, x + variar(k, 17, 60), h - 46, reboco, madeira, telha, k);
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#5a7a44", "#14200e"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 3);
    // canteiros de flores
    for (let x = -(off % 31); x < w; x += 31) {
      const k = Math.round((x + off) / 31);
      ctx.fillStyle = ["#e8333a", "#ffd21a", "#ff7ab0", "#ffffff"][variar(k, 7, 4)];
      ctx.beginPath();
      ctx.arc(x + 10, y + 10 + variar(k, 11, 20), 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // enxaimel: reboco branco e a trama de madeira escura em painéis com X
    ctx.fillStyle = c.corpo;
    ctx.fillRect(x0, 0, w, len);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, 0, w, len);
    ctx.clip();
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 5;
    ctx.beginPath();
    const painel = 64;
    for (let y = 14 + ((variante * 21) % painel) - painel; y < len; y += painel) {
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + w, y);
      ctx.moveTo(x0 + 3, y);
      ctx.lineTo(x0 + w - 3, y + painel);
      ctx.moveTo(x0 + w - 3, y);
      ctx.lineTo(x0 + 3, y + painel);
    }
    ctx.moveTo(x0 + 2.5, 0);
    ctx.lineTo(x0 + 2.5, len);
    ctx.moveTo(x0 + w - 2.5, 0);
    ctx.lineTo(x0 + w - 2.5, len);
    ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(x0 + w - 10, 0, 10, len);
    ctx.restore();
    if (quebrada) {
      ctx.fillStyle = c.corpo;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x0, 12);
      ctx.lineTo(x0 + w * 0.3, 3);
      ctx.lineTo(x0 + w * 0.5, 9);
      ctx.lineTo(x0 + w * 0.75, 1);
      ctx.lineTo(x0 + w, 8);
      ctx.lineTo(x0 + w, 14);
      ctx.lineTo(x0, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // viga de madeira no topo, com a floreira
    ctx.fillStyle = c.contorno;
    ctx.fillRect(x0 - 5, 0, w + 10, 9);
    ctx.fillStyle = "#3a6a3a";
    ctx.fillRect(x0 - 1, 9, w + 2, 9);
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = ["#e8333a", "#ffd21a", "#ff7ab0"][(i + variante) % 3];
      ctx.beginPath();
      ctx.arc(x0 + 4 + (i * (w - 8)) / 7, 13 + (i % 2 ? 2 : -1), 3, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => chapeuTiroles(c, t));
  },
};
