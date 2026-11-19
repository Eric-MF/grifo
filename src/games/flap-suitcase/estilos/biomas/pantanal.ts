// Pantanal: a planície alagada que espelha o céu do fim de tarde, os tuiuiús, os jacarés de olho de fora d'água,
// as capivaras e os carandás; as colunas são troncos de carandá com o ninho do tuiuiú, e na maleta vai o chapéu do peão.
import { ciclo, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, ave, lua, noiteDe, palmeira, repetir, sol } from "../kit";

// cores por hora do dia (amanhecer, dia, entardecer, noite); o Pantanal fica no tom do fim de tarde
const HORIZONTE = ["#7a6a7a", "#6a7a7a", "#6a4a6a", "#14121e"];
const AGUA = ["#c88a7a", "#a8a8b0", "#c87a6a", "#1a1a2e"];
const CAMPO = ["#7a8a4a", "#748e48", "#6a6a46", "#12160c"];
const CARANDA = ["#2a3a24", "#2a3e24", "#2a2a24", "#08080a"];
const BICHO = ["#3a2e24", "#3a3024", "#342822", "#0a0806"];

/** Tuiuiú de pé: corpo branco, pescoço e cabeça pretos, o papo vermelho e as pernas compridas. */
function tuiuiu(ctx: Ctx, x: number, base: number, s: number, t: number, k: number) {
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 1.4 * s;
  ctx.beginPath();
  ctx.moveTo(x - 2 * s, base);
  ctx.lineTo(x - 2 * s, base - 16 * s);
  ctx.moveTo(x + 2 * s, base);
  ctx.lineTo(x + 2 * s, base - 16 * s);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(x, base - 22 * s, 8 * s, 6 * s, -0.2, 0, Math.PI * 2);
  ctx.fill();
  const bica = Math.sin(t * 0.7 + k) > 0.6 ? 6 : 0;
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.moveTo(x + 4 * s, base - 26 * s);
  ctx.lineTo(x + 7 * s, base - (36 - bica) * s);
  ctx.lineTo(x + 10 * s, base - (36 - bica) * s);
  ctx.lineTo(x + 8 * s, base - 25 * s);
  ctx.fill();
  ctx.fillStyle = "#d8303a";
  ctx.fillRect(x + 5 * s, base - 29 * s, 4 * s, 3 * s);
  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.moveTo(x + 9 * s, base - (36 - bica) * s);
  ctx.lineTo(x + 19 * s, base - (32 - bica * 1.4) * s);
  ctx.lineTo(x + 9 * s, base - (34 - bica) * s);
  ctx.fill();
}

/** Garça-branca de pé, com o pescoço em S e o bico amarelo; às vezes abaixa a cabeça para pescar. */
function garca(ctx: Ctx, x: number, base: number, s: number, t: number, k: number) {
  const pesca = Math.max(0, Math.sin(t * 0.6 + k * 1.7) - 0.5) * 14;
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 1.2 * s;
  ctx.beginPath();
  ctx.moveTo(x - 1.5 * s, base);
  ctx.lineTo(x - 1 * s, base - 15 * s);
  ctx.moveTo(x + 1.5 * s, base);
  ctx.lineTo(x + 1 * s, base - 15 * s);
  ctx.stroke();
  ctx.fillStyle = "#f8f8f4";
  ctx.beginPath();
  ctx.ellipse(x, base - 19 * s, 7 * s, 4.5 * s, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#f8f8f4";
  ctx.lineWidth = 2.4 * s;
  ctx.beginPath();
  ctx.moveTo(x + 4 * s, base - 22 * s);
  ctx.quadraticCurveTo(x + 9 * s, base - 26 * s, x + 5 * s, base - 30 * s + pesca * s * 0.6);
  ctx.quadraticCurveTo(x + 3 * s, base - 34 * s + pesca * s, x + 7 * s, base - 36 * s + pesca * s);
  ctx.stroke();
  ctx.fillStyle = "#f0c020";
  ctx.beginPath();
  ctx.moveTo(x + 8 * s, base - 37 * s + pesca * s);
  ctx.lineTo(x + 16 * s, base - 35 * s + pesca * s * 1.3);
  ctx.lineTo(x + 8 * s, base - 35 * s + pesca * s);
  ctx.fill();
}

/** Colhereiro de pé: o corpo cor-de-rosa, o pescoço branco e o bico achatado em colher. */
function colhereiro(ctx: Ctx, x: number, base: number, s: number, t: number, k: number) {
  const varre = Math.sin(t * 2 + k) * 2;
  ctx.strokeStyle = "#a83a4a";
  ctx.lineWidth = 1.3 * s;
  ctx.beginPath();
  ctx.moveTo(x - 2 * s, base);
  ctx.lineTo(x - 2 * s, base - 12 * s);
  ctx.moveTo(x + 2 * s, base);
  ctx.lineTo(x + 2 * s, base - 12 * s);
  ctx.stroke();
  ctx.fillStyle = "#f08aa8";
  ctx.beginPath();
  ctx.ellipse(x, base - 17 * s, 8 * s, 5.5 * s, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d8406a";
  ctx.beginPath();
  ctx.ellipse(x - 2 * s, base - 18 * s, 4 * s, 3 * s, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#f6eef0";
  ctx.lineWidth = 2.4 * s;
  ctx.beginPath();
  ctx.moveTo(x + 5 * s, base - 20 * s);
  ctx.quadraticCurveTo(x + 9 * s, base - 24 * s, x + 10 * s, base - 28 * s);
  ctx.stroke();
  ctx.strokeStyle = "#8a7a6a";
  ctx.lineWidth = 1.4 * s;
  ctx.beginPath();
  ctx.moveTo(x + 10 * s, base - 28 * s);
  ctx.lineTo(x + 14 * s, base - 18 * s + varre * s);
  ctx.stroke();
  ctx.fillStyle = "#8a7a6a";
  ctx.beginPath();
  ctx.ellipse(x + 14.5 * s, base - 17 * s + varre * s, 2 * s, 1.4 * s, 0.4, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Os bandos no céu: três, cada um com a sua velocidade e altura. A cada passagem o bando muda: quantas aves (3 a 9),
 * o espaçamento, a abertura do V e de que espécie (aves escuras, garças brancas ou colhereiros cor-de-rosa).
 */
function bandos(ctx: Ctx, w: number, h: number, off: number, t: number) {
  const volta = w + 700;
  for (let j = 0; j < 3; j++) {
    const v = 22 + j * 11;
    const pos = t * v + j * 900 - off * (0.03 + j * 0.01);
    const passagem = Math.floor(pos / volta);
    const x0 = (((pos % volta) + volta) % volta) - 300;
    const semente = j * 97 + passagem * 13;
    const n = 3 + variar(semente, 7, 7);
    const y0 = h * (0.1 + variar(semente, 11, 5) * 0.045);
    const s = 0.55 + variar(semente, 5, 4) * 0.12;
    const especie = variar(semente, 3, 5);
    ctx.fillStyle = especie === 0 ? "#f6f2ec" : especie === 1 ? "#f08aa8" : "#2a1e2a";
    const abertura = 0.25 + variar(semente, 17, 5) * 0.08;
    for (let i = 0; i < n; i++) {
      // em V: a primeira na frente, as outras alternando os lados, cada uma com o seu espaço e o seu balanço
      const fila = Math.ceil(i / 2);
      const lado = i % 2 ? 1 : -1;
      const passo = (24 + variar(semente + i, 13, 12)) * s;
      const ax = x0 - fila * passo + variar(semente + i, 19, 9) - 4;
      const ay = y0 + lado * fila * passo * abertura + Math.sin(t * 1.3 + i * 1.9 + j) * 3;
      ave(ctx, ax, ay, s, Math.sin(t * (5 + (i % 3)) + i * 1.3));
    }
  }
}

/** Jacaré de olho de fora d'água: o focinho, os olhos e as costas. */
function jacare(ctx: Ctx, x: number, y: number, cor: string, t: number) {
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.ellipse(x, y, 22, 2.4, 0, Math.PI, 0);
  ctx.fill();
  for (const dx of [-4, 4]) {
    ctx.beginPath();
    ctx.arc(x + 14 + dx * 0.6, y - 2, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#e8d040";
  if (Math.sin(t * 0.9 + x) > -0.8) {
    ctx.fillRect(x + 11, y - 3, 1.4, 1.4);
    ctx.fillRect(x + 16, y - 3, 1.4, 1.4);
  }
}

/** Capivara: o corpo redondo e a cara quadrada. */
function capivara(ctx: Ctx, x: number, base: number, cor: string) {
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.ellipse(x, base - 9, 14, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x + 9, base - 16, 10, 9, 3);
  ctx.fill();
  for (const px of [-8, 6]) ctx.fillRect(x + px, base - 3, 3, 3);
}

/** Chapéu de palha do peão pantaneiro, com o barbicacho. */
function chapeuPeao(c: Ctx) {
  c.save();
  c.translate(-7, -21);
  c.rotate(-0.12);
  c.fillStyle = "#e8d09a";
  c.strokeStyle = "#a88a4a";
  c.lineWidth = 1;
  c.beginPath();
  c.ellipse(0, 2, 16, 3.2, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(-8, 2);
  c.lineTo(-7, -8);
  c.quadraticCurveTo(0, -11, 7, -8);
  c.lineTo(8, 2);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = "#2a1a10";
  c.fillRect(-8, -2, 16, 2.4);
  c.strokeStyle = "#2a1a10";
  c.beginPath();
  c.moveTo(-6, 3);
  c.quadraticCurveTo(0, 12, 6, 3);
  c.stroke();
  c.restore();
}

export const PANTANAL: Tema = {
  id: "pantanal",
  nome: "Pantanal",
  descricao: "A planície alagada espelhando o fim de tarde, os tuiuiús, os jacarés de olho de fora, as capivaras e os carandás.",
  grupo: "biomas",
  amostra: "linear-gradient(135deg, #f0905a 50%, #1a1a1a 50%)",
  onda: "sine",
  somBase: 247,
  paleta: {
    // fim de tarde nas fases de dia
    ceu: [["#d87a6a", "#ffd0a0"], ["#7a8ab8", "#f6d0a8"], ["#9a4a6a", "#ffa860"], ["#140e2a", "#3a2240"]],
    longe: HORIZONTE,
    perto: CARANDA,
    chao: "#7a7a4a",
    chaoLinha: "#4a4a2a",
    coluna: { corpo: "#6a5a44", sombra: "#4a3e30", luz: "#8a7a5e", contorno: "#1e180e" },
    maleta: { corpo: "#2a5a7a", escuro: "#0e2a3e", fivela: "#e8d09a", alca: "#0e2a3e" },
    asa: { cor: "#ffffff", contorno: "#1a1a1a" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: ["#ffffff", "#d8303a", "#ffa860"],
    recorde: {
      cor: "#ff7a4a", traco: [8, 4, 2, 4], largura: 3.5,
      aviso: { texto: "NOVO RECORDE!", fonte: "800 28px system-ui, sans-serif", corTexto: "#ffffff", corContorno: "#3a1010", corFundo: "rgba(154,74,106,0.92)", anima: "pulsa" },
    },
    hud: "#1a1010",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // uma revoada de araras-azuis cruzando o fim de tarde
    const x0 = atravessa(w, f, 260);
    for (let i = 0; i < 7; i++) {
      const x = x0 - (i % 4) * 40 - Math.floor(i / 4) * 20;
      const y = h * 0.24 + (i % 3) * 22 + Math.sin(t * 2 + i) * 6;
      const bate = Math.sin(t * 10 + i * 1.3);
      ctx.fillStyle = "#1e3ab0";
      ctx.beginPath();
      ctx.ellipse(x, y, 10, 3.6, -0.1, 0, Math.PI * 2);
      ctx.moveTo(x - 8, y);
      ctx.lineTo(x - 30, y + 5);
      ctx.lineTo(x - 8, y + 3);
      ctx.moveTo(x - 2, y - 1);
      ctx.lineTo(x - 8, y - 14 - bate * 6);
      ctx.lineTo(x + 6, y - 1);
      ctx.fill();
      ctx.fillStyle = "#ffd21a";
      ctx.fillRect(x + 8, y - 1, 3, 2);
    }
  },
  decor(ctx, w, h, off, tod, t) {
    const noite = noiteDe(tod);
    const yAgua = h - 200;
    if (noite > 0.5) lua(ctx, w * 0.36, h * 0.14, 22);
    else sol(ctx, w * 0.36, yAgua - 24, 40, "#ffc860", "rgba(255,180,100,0.5)");
    // os bandos voltando para o ninho, cada um diferente a cada passagem
    bandos(ctx, w, h, off, t);
    // o horizonte baixo e a água que espelha o céu
    ctx.fillStyle = ciclo(HORIZONTE, tod);
    ctx.fillRect(0, yAgua - 8, w, 8);
    repetir(w, off * 0.04, 30, (x, k) => {
      ctx.beginPath();
      ctx.arc(x + 15, yAgua - 8, 10 + variar(k, 7, 4) * 3, Math.PI, 0);
      ctx.fill();
    });
    const g = ctx.createLinearGradient(0, yAgua, 0, h - 40);
    g.addColorStop(0, ciclo(AGUA, tod));
    g.addColorStop(1, ciclo(["#8a6a6a", "#7a8aa0", "#8a5a62", "#0e0e1a"], tod));
    ctx.fillStyle = g;
    ctx.fillRect(0, yAgua, w, h - yAgua);
    // reflexo do sol na água
    if (noite < 0.5) {
      ctx.fillStyle = "rgba(255,200,120,0.55)";
      for (let i = 0; i < 7; i++) ctx.fillRect(w * 0.36 - 40 + i * 4 + Math.sin(t * 2 + i) * 3, yAgua + 6 + i * 10, 80 - i * 8, 2.4);
    }
    // ilhas de campo com os carandás e os bichos
    const campo = ciclo(CAMPO, tod);
    const caranda = ciclo(CARANDA, tod);
    const bicho = ciclo(BICHO, tod);
    repetir(w, off * 0.14, 520, (x, k) => {
      const ix = x + variar(k, 37, 120);
      ctx.fillStyle = campo;
      ctx.beginPath();
      ctx.ellipse(ix + 100, yAgua + 40, 140, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 3; i++) palmeira(ctx, ix + 40 + i * 50, yAgua + 40, 70 + variar(k + i, 7, 3) * 14, caranda, t, 0.02);
      capivara(ctx, ix + 190, yAgua + 42, bicho);
      capivara(ctx, ix + 214, yAgua + 44, bicho);
    });
    repetir(w, off * 0.24 - t * 4, 300, (x, k) => jacare(ctx, x + variar(k, 31, 100), yAgua + 90 + variar(k, 7, 3) * 12, bicho, t));
    // a beira com as aves pescando: grupos de tamanhos e espécies variados, e trechos vazios
    repetir(w, off * 0.36, 170, (x, k) => {
      ctx.fillStyle = campo;
      ctx.beginPath();
      ctx.ellipse(x + 85 + variar(k, 7, 30), h - 42, 60 + variar(k, 11, 4) * 14, 8, 0, Math.PI, 0);
      ctx.fill();
      const tipo = variar(k, 5, 6);
      if (tipo === 0) return;
      const quantas = 1 + variar(k, 23, 3);
      for (let i = 0; i < quantas; i++) {
        const bx = x + 40 + variar(k + i, 13, 70) + i * 26;
        const s = 1.2 + variar(k + i, 29, 4) * 0.12;
        if (tipo <= 2) tuiuiu(ctx, bx, h - 44, s + 0.2, t, k + i);
        else if (tipo <= 4) garca(ctx, bx, h - 44, s, t, k + i);
        else colhereiro(ctx, bx, h - 44, s, t, k + i);
      }
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    // a beira lamacenta, com os aguapés
    ctx.fillStyle = ciclo([p.chao, p.chao, "#6a6644", "#14140c"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 3);
    for (let x = -(off % 37); x < w; x += 37) {
      const k = Math.round((x + off) / 37);
      ctx.fillStyle = "#3a7a3a";
      ctx.beginPath();
      ctx.ellipse(x + 12, y + 12 + variar(k, 7, 16), 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      if (variar(k, 3, 2)) {
        ctx.fillStyle = "#b08ae8";
        ctx.beginPath();
        ctx.arc(x + 14, y + 9 + variar(k, 7, 16), 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // tronco de carandá: as bases das folhas antigas em escamas cruzadas
    ctx.fillStyle = c.corpo;
    ctx.fillRect(x0, 0, w, len);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, 0, w, len);
    ctx.clip();
    ctx.strokeStyle = c.sombra;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let y = -20 + ((variante * 7) % 18); y < len + 20; y += 18) {
      ctx.moveTo(x0, y);
      ctx.lineTo(0, y + 12);
      ctx.lineTo(x0 + w, y);
    }
    ctx.stroke();
    ctx.strokeStyle = c.luz;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = -16 + ((variante * 7) % 18); y < len + 20; y += 18) {
      ctx.moveTo(x0, y);
      ctx.lineTo(0, y + 12);
      ctx.lineTo(x0 + w, y);
    }
    ctx.stroke();
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, "rgba(255,255,255,0.12)");
    g.addColorStop(0.5, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(0,0,0,0.32)");
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, len);
    ctx.restore();
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = "#c8a87a";
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
    // o ninho de gravetos do tuiuiú, rente à ponta, com os ovinhos
    ctx.fillStyle = "#7a5a3a";
    ctx.beginPath();
    ctx.roundRect(x0 - 4, 0, w + 8, 14, 6);
    ctx.fill();
    ctx.strokeStyle = "#4a3420";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let x = x0 - 2; x < x0 + w + 2; x += 6) {
      ctx.moveTo(x, 2);
      ctx.lineTo(x + 8, 12);
      ctx.moveTo(x + 8, 2);
      ctx.lineTo(x, 12);
    }
    ctx.stroke();
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, chapeuPeao);
  },
};
