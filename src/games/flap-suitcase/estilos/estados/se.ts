// Sergipe: o Cânion do Xingó, com a água verde do São Francisco entre os paredões e o catamarã, e a orla de Atalaia
// com os coqueiros e os caranguejos; as colunas são o paredão do cânion, e na maleta vai um caranguejo agarrado.
import { ciclo, colinas, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, lua, mar, noiteDe, palmeira, repetir, sol } from "../kit";

// cores por hora do dia (amanhecer, dia, entardecer, noite)
const PAREDAO = ["#8a6a5a", "#94725e", "#765a5a", "#1e161a"];
const PAREDAO_SOMBRA = ["#6a4e44", "#72544a", "#5a4048", "#120e12"];
const RIO = ["#3a8a7a", "#2a9a84", "#3a6a78", "#0a2420"];
const CAATINGA = ["#7a8a5a", "#768e56", "#646a54", "#12160e"];
const COQUEIRO = ["#2f5a3a", "#2a6038", "#2e3e36", "#081410"];
const CATAMARA = ["#f4f0ea", "#ffffff", "#ece0dc", "#5a5a70"];

/** Caranguejo de patas abertas, com as garras. */
function caranguejo(ctx: Ctx, x: number, y: number, s: number, cor: string, t: number) {
  const mexe = Math.sin(t * 8 + x) * 0.2;
  ctx.fillStyle = cor;
  ctx.strokeStyle = cor;
  ctx.lineWidth = 1.4 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (const l of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      ctx.moveTo(x + l * 4 * s, y + (i - 1) * 2 * s);
      ctx.lineTo(x + l * (10 + i) * s, y + (i * 3 - 1) * s + mexe * 4 * s);
    }
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x, y, 7 * s, 4.6 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const l of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + l * 5 * s, y - 3 * s);
    ctx.lineTo(x + l * 9 * s, y - 8 * s);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x + l * 10 * s, y - 10 * s, 3 * s, 2.2 * s, l * (0.6 + mexe), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(x - 3 * s, y - 5 * s, 1.6 * s, 1.6 * s);
  ctx.fillRect(x + 1.4 * s, y - 5 * s, 1.6 * s, 1.6 * s);
}

/** Catamarã de passeio, com o toldo. */
function catamara(ctx: Ctx, x: number, y: number, cor: string, t: number) {
  const bal = Math.sin(t * 1.4 + x * 0.01) * 1.5;
  ctx.fillStyle = cor;
  ctx.fillRect(x - 30, y - 6 + bal, 60, 6);
  ctx.fillRect(x - 26, y + bal, 14, 4);
  ctx.fillRect(x + 12, y + bal, 14, 4);
  ctx.fillRect(x - 24, y - 18 + bal, 2, 12);
  ctx.fillRect(x + 22, y - 18 + bal, 2, 12);
  ctx.fillStyle = "#2a8ae8";
  ctx.fillRect(x - 28, y - 22 + bal, 56, 5);
}

export const SE: Tema = {
  id: "se",
  nome: "Sergipe",
  descricao: "O Cânion do Xingó, com a água verde do São Francisco entre os paredões, e a orla de Atalaia com os caranguejos.",
  grupo: "estados",
  amostra: "linear-gradient(135deg, #2a9a84 50%, #94725e 50%)",
  onda: "triangle",
  somBase: 262,
  paleta: {
    ceu: [["#f0a078", "#ffdcb0"], ["#3a9ae0", "#d4ecf8"], ["#6a4a8a", "#f4a058"], ["#0a1234", "#26346a"]],
    longe: PAREDAO,
    perto: COQUEIRO,
    chao: "#ead2a2",
    chaoLinha: "#c4a470",
    coluna: { corpo: "#8e6e5e", sombra: "#6a5044", luz: "#ae8e7a", contorno: "#2a1a14" },
    maleta: { corpo: "#2a9a84", escuro: "#0e4a3e", fivela: "#ffd23a", alca: "#0e4a3e" },
    asa: { cor: "#ffffff", contorno: "#2a9a84" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: ["#2a9a84", "#e8642a", "#ffffff"],
    recorde: {
      cor: "#2ae8a8", traco: [9, 5], largura: 3.5,
      aviso: { texto: "NOVO RECORDE!", fonte: "800 28px system-ui, sans-serif", corTexto: "#ffffff", corContorno: "#0a3a2e", corFundo: "rgba(42,154,132,0.92)", anima: "pulsa" },
    },
    hud: "#1a1410",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // o caranguejo gigante da orla de Atalaia sai andando de lado pela praia
    const x = atravessa(w, f, 160);
    caranguejo(ctx, x, h - 72, 4.6, "#e8642a", t * 2);
  },
  decor(ctx, w, h, off, tod, t, tema, surpresa) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.5, h * 0.12, 20);
    else sol(ctx, w * 0.5, h * 0.13, 24, "#fff4d6", "rgba(255,236,180,0.45)");
    colinas(ctx, w, h - 40, off * 0.03, ciclo(CAATINGA, tod), 230, 16, 0.006, 3);
    // os paredões do cânion, recortados, com o rio verde no fundo
    const paredao = ciclo(PAREDAO, tod);
    const sombra = ciclo(PAREDAO_SOMBRA, tod);
    const yRio = h - 150;
    mar(ctx, w, yRio, 60, off * 0.1, ciclo(RIO, tod), "rgba(255,255,255,0.4)", t);
    repetir(w, off * 0.1, 900, (x, k) => {
      for (const [x1, larg] of [[x, 320], [x + 520, 380]]) {
        ctx.fillStyle = paredao;
        ctx.beginPath();
        ctx.moveTo(x1, yRio + 4);
        ctx.lineTo(x1 + 10, h - 300);
        for (let i = 1; i < 8; i++) ctx.lineTo(x1 + (i * larg) / 8, h - 300 - (variar(k + i, 7, 4) - 1) * 10);
        ctx.lineTo(x1 + larg - 10, h - 296);
        ctx.lineTo(x1 + larg, yRio + 4);
        ctx.fill();
        // as fendas e o degrau ficam dentro do paredão: recortados pelo contorno dele, não passam das laterais
        ctx.save();
        ctx.clip();
        ctx.fillStyle = sombra;
        for (let i = 0; i < larg / 22; i++) ctx.fillRect(x1 + 12 + i * 22 + variar(k + i, 13, 8), h - 290, 3, 100 + variar(k + i, 5, 4) * 20);
        ctx.fillRect(x1 + 6, yRio - 14, larg - 12, 10);
        ctx.restore();
      }
      catamara(ctx, x + 430 + Math.sin(t * 0.2 + k) * 40, yRio + 30, ciclo(CATAMARA, tod), t);
    });
    // a orla de Atalaia: areia, coqueiros e caranguejos
    ctx.fillStyle = ciclo(["#f0d8a8", "#f4dcaa", "#e2c4a0", "#4a4238"], tod);
    ctx.fillRect(0, yRio + 56, w, h - yRio - 56);
    // a surpresa: o caranguejo gigante anda pela areia, atrás dos coqueiros e dos caranguejos pequenos
    surpresa?.();
    // os caranguejos da areia, atrás dos coqueiros (ficam mais longe que o pé deles). Cada um tem a sua toca: espera
    // escondido, sai, anda de lado um tanto e volta, no seu ritmo, para o seu lado e do seu tamanho. Há trechos sem
    // toca, e às vezes dois dividem o mesmo pedaço
    const toca = ciclo(["#b8946a", "#c09a6c", "#a8866e", "#2a241e"], tod);
    const monte = ciclo(["#f8e4b8", "#fce8ba", "#ecd2b0", "#544a3e"], tod);
    repetir(w, off * 0.34, 95, (x, k) => {
      if (variar(k, 5, 4) === 0) return;
      const quantos = variar(k, 37, 5) === 0 ? 2 : 1;
      for (let j = 0; j < quantos; j++) {
        const id = k * 3 + j;
        const tx = x + variar(id, 31, 70) + j * 30;
        const ty = h - 47 - variar(id, 7, 4) * 9;
        const esc = 0.75 + variar(id, 11, 4) * 0.17;
        ctx.fillStyle = monte;
        ctx.beginPath();
        ctx.ellipse(tx + 5 * esc, ty + 3, 5 * esc, 2 * esc, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = toca;
        ctx.beginPath();
        ctx.ellipse(tx, ty + 3, 4 * esc, 1.6 * esc, 0, 0, Math.PI * 2);
        ctx.fill();
        const periodo = 5 + variar(id, 13, 6);
        const fase = (((t + variar(id, 17, 20) * 0.5) % periodo) + periodo) % periodo / periodo;
        if (fase < 0.3) continue;
        // saindo da toca (o corpo sobe) e entrando de novo
        const fora = Math.min(1, (fase - 0.3) / 0.08, (1 - fase) / 0.08);
        const lado = variar(id, 19, 2) ? 1 : -1;
        const passeio = Math.sin(Math.min(1, Math.max(0, (fase - 0.38) / 0.54)) * Math.PI) * (16 + variar(id, 23, 4) * 9) * lado;
        const cor = ["#e8642a", "#d8502a", "#f07a3a", "#c84a2a"][variar(id, 29, 4)]!;
        ctx.save();
        ctx.beginPath();
        ctx.rect(tx - 60, ty - 30, 120, 33);
        ctx.clip();
        caranguejo(ctx, tx + passeio, ty - 3 * esc + (1 - fora) * 10 * esc, esc, cor, t * (1.5 + variar(id, 41, 3) * 0.4));
        ctx.restore();
      }
    });
    const coqueiro = ciclo(COQUEIRO, tod);
    repetir(w, off * 0.36, 170, (x, k) => {
      if (variar(k, 5, 3) === 0) return;
      palmeira(ctx, x + variar(k, 29, 60), h - 40, 120 + variar(k, 13, 3) * 16, coqueiro, t, 0.24);
    });

  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#dcc09e", "#4a4238"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 2);
    // os buraquinhos dos caranguejos
    ctx.fillStyle = "rgba(90,60,30,0.45)";
    for (let x = -(off % 29); x < w; x += 29) {
      ctx.beginPath();
      ctx.ellipse(x + 10, y + 12 + variar(Math.round((x + off) / 29), 7, 18), 2.4, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // o paredão do cânion: rocha em placas verticais, com a marca verde da água perto da base
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, c.luz);
    g.addColorStop(0.5, c.corpo);
    g.addColorStop(1, c.sombra);
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, len);
    ctx.fillStyle = c.sombra;
    for (let i = 0; i < 4; i++) {
      const fx = x0 + 10 + i * 17 + variar(i + variante, 7, 5);
      for (let y = 0; y < len; y += 60) ctx.fillRect(fx + Math.sin(y * 0.05 + i) * 2, y + variar(i + y, 13, 10), 2.4, 46);
    }
    ctx.fillStyle = "rgba(40,120,100,0.35)";
    ctx.fillRect(x0, Math.max(0, len - 60), w, 60);
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = c.luz;
      ctx.beginPath();
      ctx.moveTo(x0, 14);
      ctx.lineTo(x0 + w * 0.2, 3);
      ctx.lineTo(x0 + w * 0.45, 11);
      ctx.lineTo(x0 + w * 0.7, 2);
      ctx.lineTo(x0 + w, 9);
      ctx.lineTo(x0 + w, 16);
      ctx.lineTo(x0, 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // a borda de cima com o mato da caatinga
    ctx.fillStyle = c.luz;
    ctx.fillRect(x0 - 3, 0, w + 6, 10);
    ctx.strokeRect(x0 - 3, 0, w + 6, 10);
    ctx.fillStyle = "#6a7a4a";
    for (let x = x0; x < x0 + w; x += 9) {
      ctx.beginPath();
      ctx.ellipse(x + 4, 12, 4.5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => caranguejo(c, 14, -22, 0.9, "#e8642a", t));
  },
};
