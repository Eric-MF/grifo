// Tocantins: o Jalapão, com as dunas alaranjadas ao pé da Serra do Espírito Santo, o fervedouro de água transparente,
// as veredas e o capim dourado; as colunas são de capim dourado trançado, e na maleta vai o chapéu da mesma palha.
import { ciclo, colinas, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, chapada, dunas, ladrilho, lua, noiteDe, repetir, sol } from "../kit";

const DOURADO = "#e8b83a";
// cores por hora do dia (amanhecer, dia, entardecer, noite)
const SERRA = ["#c87a4a", "#d0824a", "#a8604a", "#2a1a1a"];
const SERRA_SOMBRA = ["#a05a3a", "#a8603a", "#84483e", "#1a1012"];
const MATA = ["#5a7a3a", "#56803a", "#4a5a3a", "#0e160a"];
const DUNA = ["#f0a85a", "#f6b05e", "#d88a5a", "#3a2a22"];
const DUNA_SOMBRA = ["#d08848", "#d8904a", "#b46e4a", "#24181a"];
const CERRADO = ["#a8a05a", "#a4a656", "#888054", "#181c10"];
const PLANICIE = ["#b49a62", "#b8a066", "#96805e", "#22190f"];
const AGUA = ["#5ac8d8", "#4ad4e0", "#5a9ab8", "#10303e"];

/** Tufo de capim dourado: hastes finas com as cabecinhas brilhando. */
function capim(ctx: Ctx, x: number, base: number, s: number, t: number) {
  ctx.strokeStyle = DOURADO;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const a = (i - 3) * 0.14 + Math.sin(t * 1.6 + x * 0.05) * 0.05;
    ctx.moveTo(x, base);
    ctx.lineTo(x + Math.sin(a) * 22 * s, base - Math.cos(a) * 22 * s);
  }
  ctx.stroke();
  // as cabecinhas num caminho só (um fill por tufo, e não um por haste)
  ctx.fillStyle = "#ffd86a";
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const a = (i - 3) * 0.14 + Math.sin(t * 1.6 + x * 0.05) * 0.05;
    const cx = x + Math.sin(a) * 22 * s;
    const cy = base - Math.cos(a) * 22 * s;
    ctx.moveTo(cx + 1.4 * s, cy);
    ctx.arc(cx, cy, 1.4 * s, 0, Math.PI * 2);
  }
  ctx.fill();
}

type CoresColuna = Tema["paleta"]["coluna"];

/**
 * A trança da coluna, de x0 = −larg/2 a larg/2: fios em espinha de peixe que alternam luz e sombra a cada `passo`, a
 * costura no meio e o brilho da palha. Desenhada num ladrilho (ela se repete a cada 2 passos).
 */
function trama(c: Ctx, larg: number, alt: number, passo: number, cores: CoresColuna) {
  const x0 = -larg / 2;
  c.fillStyle = cores.corpo;
  c.fillRect(x0, 0, larg, alt);
  c.lineWidth = 3;
  for (const par of [0, 1]) {
    c.strokeStyle = par ? cores.luz : cores.sombra;
    c.beginPath();
    for (let j = -4; j <= 4; j++) {
      if (Math.abs(j % 2) !== par) continue;
      c.moveTo(x0, j * passo);
      c.lineTo(0, j * passo + 12);
      c.lineTo(x0 + larg, j * passo);
    }
    c.stroke();
  }
  c.fillStyle = "rgba(90,58,10,0.35)";
  c.fillRect(-1, 0, 2, alt);
  const g = c.createLinearGradient(x0, 0, x0 + larg, 0);
  g.addColorStop(0, "rgba(255,255,255,0.25)");
  g.addColorStop(0.4, "rgba(255,255,255,0)");
  g.addColorStop(1, "rgba(60,30,0,0.3)");
  c.fillStyle = g;
  c.fillRect(x0, 0, larg, alt);
}

/** Chapéu de capim dourado trançado. */
function chapeuCapim(c: Ctx) {
  c.save();
  c.translate(-6, -21);
  c.rotate(-0.1);
  c.fillStyle = DOURADO;
  c.strokeStyle = "#8a6a1a";
  c.lineWidth = 1;
  c.beginPath();
  c.ellipse(0, 2, 16, 3.4, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(-8, 2);
  c.quadraticCurveTo(-8, -10, 0, -10);
  c.quadraticCurveTo(8, -10, 8, 2);
  c.closePath();
  c.fill();
  c.stroke();
  c.strokeStyle = "#b8862a";
  c.beginPath();
  for (let y = -7; y < 2; y += 3) {
    c.moveTo(-7, y);
    c.lineTo(7, y);
  }
  c.stroke();
  c.restore();
}

export const TO: Tema = {
  id: "to",
  nome: "Tocantins",
  descricao: "O Jalapão: as dunas alaranjadas ao pé da Serra do Espírito Santo, o fervedouro e o capim dourado.",
  grupo: "estados",
  amostra: `linear-gradient(135deg, #f6b05e 50%, ${DOURADO} 50%)`,
  onda: "triangle",
  somBase: 277,
  climaFixo: "limpo",
  paleta: {
    ceu: [["#f0a078", "#ffdcb0"], ["#3a98e0", "#d4ecf8"], ["#7a4a7a", "#f4a050"], ["#0a1234", "#26346a"]],
    longe: SERRA,
    perto: CERRADO,
    chao: "#e8a45a",
    chaoLinha: "#b07a3a",
    coluna: { corpo: "#e0ae3a", sombra: "#b0842a", luz: "#f4cc6a", contorno: "#5a3a0a" },
    maleta: { corpo: "#2a7a8a", escuro: "#0e3a44", fivela: "#ffd86a", alca: "#0e3a44" },
    asa: { cor: "#ffffff", contorno: "#b0842a" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: [DOURADO, "#ffd86a", "#ffffff"],
    recorde: {
      cor: "#f4cc3a", traco: [5, 3, 5, 9], largura: 3.5,
      aviso: { texto: "RECORDE DOURADO!", fonte: "800 28px system-ui, sans-serif", corTexto: "#ffffff", corContorno: "#5a3a0a", corFundo: "rgba(176,132,42,0.92)", anima: "pisca" },
    },
    hud: "#2a1a0a",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // o tamanduá-bandeira atravessando o Jalapão: o focinho comprido farejando o chão e pondo a língua para fora, a
    // faixa preta com borda branca do peito ao dorso, as patas da frente claras, andando sobre as garras dobradas, e a
    // cauda enorme de pelo comprido, como uma bandeira
    ctx.save();
    ctx.translate(atravessa(w, f, 260), h - 42);
    ctx.scale(1.6, 1.6);
    const passo = t * 4.2;
    const fareja = Math.sin(t * 2.2) * 0.5 + 0.5;
    const pelo = "#6e5a48";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // as pernas do lado de lá, mais escuras
    const perna = (px: number, fase: number, frente: boolean, perto: boolean) => {
      const a = Math.sin(passo + fase) * 0.38;
      const ergue = Math.max(0, Math.cos(passo + fase)) * 3;
      const fx = px + Math.sin(a) * 14;
      ctx.strokeStyle = frente ? (perto ? "#e6dcc6" : "#bdb29c") : perto ? "#3e3026" : "#2a2018";
      ctx.lineWidth = frente ? 5.4 : 6;
      ctx.beginPath();
      ctx.moveTo(px, -20);
      ctx.lineTo(fx, -ergue - 1);
      ctx.stroke();
      if (frente) {
        // a pulseira preta e as garras grandes dobradas para dentro
        ctx.strokeStyle = "#1a1612";
        ctx.lineWidth = 5.6;
        ctx.lineCap = "butt";
        ctx.beginPath();
        ctx.moveTo(px + (fx - px) * 0.6, -20 + (19 - ergue) * 0.6);
        ctx.lineTo(px + (fx - px) * 0.7, -20 + (19 - ergue) * 0.7);
        ctx.stroke();
        ctx.lineCap = "round";
        ctx.fillStyle = "#3a3028";
        ctx.beginPath();
        ctx.moveTo(fx - 3, -ergue - 1);
        ctx.quadraticCurveTo(fx - 6, -ergue + 1, fx - 4, -ergue + 1.2);
        ctx.lineTo(fx + 3, -ergue + 1);
        ctx.fill();
      } else {
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        ctx.ellipse(fx + 1.5, -ergue, 4, 1.8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    perna(-16, 0, false, false);
    perna(20, Math.PI, true, false);
    // a cauda em bandeira: larga, de pelo comprido caindo em franja, balançando atrás. A franja faz parte do contorno
    // (mechas arredondadas na borda de baixo), e os fios claros ficam recortados dentro dela, sem sair para fora
    const bal = Math.sin(t * 1.6) * 3;
    const cauda = new Path2D();
    cauda.moveTo(-22, -34);
    cauda.quadraticCurveTo(-46, -46 + bal, -76, -36 + bal * 1.4);
    cauda.quadraticCurveTo(-86, -31 + bal, -80, -24 + bal);
    const mechas = 9;
    for (let i = 0; i < mechas; i++) {
      // da ponta para o corpo: cada mecha desce um pouco mais no meio da cauda e balança no seu ritmo
      const u0 = i / mechas;
      const u1 = (i + 1) / mechas;
      const x0 = -80 + u0 * 56;
      const x1 = -80 + u1 * 56;
      const y0 = -24 + bal * (1 - u0) + Math.sin(u0 * Math.PI) * 7;
      const y1 = -24 + bal * (1 - u1) + Math.sin(u1 * Math.PI) * 7;
      const fundo = 5 + Math.sin(((u0 + u1) / 2) * Math.PI) * 4;
      cauda.quadraticCurveTo((x0 + x1) / 2 - 1 + Math.sin(t * 3 + i) * 0.8, Math.max(y0, y1) + fundo, x1, y1);
    }
    cauda.quadraticCurveTo(-23, -16, -22, -20);
    cauda.closePath();
    ctx.fillStyle = "#4e3e32";
    ctx.fill(cauda);
    ctx.save();
    ctx.clip(cauda);
    ctx.strokeStyle = "rgba(170,150,124,0.35)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const u = i / 9;
      ctx.moveTo(-26 - u * 48, -38 + bal * u);
      ctx.quadraticCurveTo(-30 - u * 48, -24 + bal * u * 0.6, -33 - u * 46, -6 + bal * (1 - u) * 0.6);
    }
    ctx.stroke();
    ctx.restore();
    // o corpo, fundo e de pelo grosso, com o dorso arrepiado
    ctx.fillStyle = pelo;
    ctx.beginPath();
    ctx.moveTo(-24, -20);
    ctx.quadraticCurveTo(-30, -34, -18, -38);
    for (let i = 0; i <= 14; i++) ctx.lineTo(-18 + i * 2.5, -40 - Math.sin((i / 14) * Math.PI) * 3 + (i % 2) * 1.3);
    ctx.quadraticCurveTo(26, -38, 30, -30);
    ctx.quadraticCurveTo(28, -18, 18, -15);
    ctx.quadraticCurveTo(0, -12, -24, -20);
    ctx.fill();
    // a faixa preta com a borda branca, do peito ao meio do dorso
    ctx.fillStyle = "#efe8d8";
    ctx.beginPath();
    ctx.moveTo(30, -26);
    ctx.lineTo(-6, -40);
    ctx.lineTo(-10, -36);
    ctx.lineTo(24, -16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#16120e";
    ctx.beginPath();
    ctx.moveTo(28, -24);
    ctx.lineTo(-4, -38);
    ctx.lineTo(-8, -36.5);
    ctx.lineTo(23, -18);
    ctx.closePath();
    ctx.fill();
    // a cabeça pequena e o focinho comprido, que baixa farejando
    ctx.save();
    ctx.translate(30, -28);
    ctx.rotate(0.22 + fareja * 0.18);
    ctx.fillStyle = "#8a7660";
    ctx.beginPath();
    ctx.moveTo(-4, -6);
    ctx.quadraticCurveTo(8, -7, 14, -4);
    ctx.quadraticCurveTo(30, -2, 42, 0);
    ctx.quadraticCurveTo(44, 1.6, 42, 2.4);
    ctx.quadraticCurveTo(26, 3, 12, 5);
    ctx.quadraticCurveTo(2, 7, -4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#2a2018";
    ctx.beginPath();
    ctx.arc(42.5, 1.2, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6e5a48";
    ctx.beginPath();
    ctx.ellipse(2, -6, 2.6, 3.4, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#16120e";
    ctx.beginPath();
    ctx.arc(9, -2.4, 1.1, 0, Math.PI * 2);
    ctx.fill();
    // a língua comprida, que sai e entra
    const lingua = Math.max(0, Math.sin(t * 7)) * 14;
    if (lingua > 1) {
      ctx.strokeStyle = "#d8607a";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(43, 1.6);
      ctx.quadraticCurveTo(43 + lingua * 0.6, 4, 43 + lingua, 3 + Math.sin(t * 20) * 1.2);
      ctx.stroke();
    }
    ctx.restore();
    // as pernas do lado de cá, por cima do corpo
    perna(-10, Math.PI, false, true);
    perna(25, 0, true, true);
    ctx.restore();
  },
  decor(ctx, w, h, off, tod, t) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.75, h * 0.13, 20);
    else sol(ctx, w * 0.75, h * 0.14, 28, "#fff6dc", "rgba(255,236,180,0.55)");
    // a Serra do Espírito Santo, com as dunas encostadas no pé
    const serra = ciclo(SERRA, tod);
    const sombra = ciclo(SERRA_SOMBRA, tod);
    const mata = ciclo(MATA, tod);
    // a planície ao longe, atrás da serra: entre as serras e onde as dunas baixam, aparece ela, e não o céu
    colinas(ctx, w, h - 108, off * 0.05, ciclo(PLANICIE, tod), 50, 4, 0.012, 5);
    repetir(w, off * 0.05, 1300, (x, k) => chapada(ctx, x + 100, h - 140, 900, 180, serra, sombra, mata, k * 9));
    dunas(ctx, w, h - 110, off * 0.1, 110, ciclo(DUNA, tod), ciclo(DUNA_SOMBRA, tod), 300);
    // a areia do pé das dunas até o chão: sem ela, aparecia uma faixa de céu entre as dunas e o cerrado
    ctx.fillStyle = ciclo(DUNA, tod);
    ctx.fillRect(0, h - 111, w, 72);
    // a vereda e o fervedouro, com gente boiando
    colinas(ctx, w, h - 40, off * 0.2, ciclo(CERRADO, tod), 60, 10, 0.009, 2);
    const agua = ciclo(AGUA, tod);
    repetir(w, off * 0.24, 900, (x) => {
      const fx = x + 500;
      ctx.fillStyle = ciclo(["#4a7a3a", "#467e3a", "#3e5038", "#0c160c"], tod);
      ctx.beginPath();
      ctx.ellipse(fx, h - 92, 74, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = agua;
      ctx.beginPath();
      ctx.ellipse(fx, h - 92, 60, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      // a areia borbulhando no fundo
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      for (let i = 0; i < 6; i++) {
        const b = (((t * 0.8 + i / 6) % 1) + 1) % 1;
        ctx.beginPath();
        ctx.arc(fx - 40 + i * 16, h - 90 - b * 6, 1.4 + b, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const dx of [-24, 18]) {
        ctx.fillStyle = "#3a2a20";
        ctx.beginPath();
        ctx.arc(fx + dx, h - 94 + Math.sin(t * 2 + dx) * 1.5, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    // o capim dourado
    repetir(w, off * 0.4, 46, (x, k) => {
      if (variar(k, 5, 3) === 0) return;
      capim(ctx, x + variar(k, 17, 20), h - 42, 1 + variar(k, 7, 3) * 0.2, t);
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#c8884e", "#2e2016"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 2);
    ctx.strokeStyle = "rgba(140,80,30,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -(off % 28); x < w; x += 28) {
      ctx.moveTo(x, y + 12);
      ctx.quadraticCurveTo(x + 7, y + 9, x + 14, y + 12);
      ctx.moveTo(x + 12, y + 24);
      ctx.quadraticCurveTo(x + 19, y + 21, x + 26, y + 24);
    }
    ctx.stroke();
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // capim dourado trançado: fios em espinha de peixe, com o brilho da palha. A trança vem de um ladrilho desenhado uma
    // vez (redesenhar os fios, o recorte e o degradê em cada coluna a cada quadro pesava no Jalapão). O ladrilho começa
    // no meio da coluna (x = 0): as duas metades vão nele, a da direita no começo e a da esquerda no fim.
    const passo = 9;
    const tramaColuna = ladrilho(ctx, `to-trama:${w}:${c.corpo}:${c.luz}:${c.sombra}`, w, passo * 2, (t) => {
      for (const dx of [0, w]) {
        t.save();
        t.translate(dx, 0);
        trama(t, w, passo * 2, passo, c);
        t.restore();
      }
    });
    const desloca = (variante * 5) % passo;
    ctx.save();
    ctx.translate(0, desloca);
    ctx.fillStyle = tramaColuna;
    ctx.fillRect(x0, -desloca, w, len);
    ctx.restore();
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      // a trança desfiada
      ctx.strokeStyle = c.luz;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const x = x0 + 3 + (i * (w - 6)) / 11;
        ctx.moveTo(x, 10);
        ctx.lineTo(x + (variar(i + variante, 7, 5) - 2) * 2, 0);
      }
      ctx.stroke();
      return;
    }
    // a borda arrematada, com a costura de seda de buriti
    ctx.fillStyle = c.sombra;
    ctx.fillRect(x0 - 3, 0, w + 6, 10);
    ctx.strokeRect(x0 - 3, 0, w + 6, 10);
    ctx.strokeStyle = "#f4e0a0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = x0; x < x0 + w; x += 6) {
      ctx.moveTo(x, 2);
      ctx.lineTo(x + 3, 8);
    }
    ctx.stroke();
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, chapeuCapim);
  },
};
