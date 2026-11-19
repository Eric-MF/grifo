// Roraima: o Monte Roraima, o tepui de paredes verticais com as cachoeiras caindo do platô e as nuvens em volta,
// o lavrado com os buritis e as colunas de arenito escuro em camadas, como as paredes do tepui; na maleta, o binóculo.
import { ciclo, colinas, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { cachoeira, chapada, lua, noiteDe, repetir, sol, surge } from "../kit";

// cores por hora do dia (amanhecer, dia, entardecer, noite)
const TEPUI = ["#6a5a6a", "#665e6a", "#5a4a62", "#14121c"];
const TEPUI_SOMBRA = ["#4a3e4c", "#4a4250", "#3e3248", "#0c0a12"];
const MATA = ["#3a5a3a", "#346038", "#36443a", "#0a120c"];
const LAVRADO = ["#b8a85a", "#b4ae58", "#988a5a", "#1e1c12"];
// o buriti tem o leque verde-claro e a estipe acinzentada, para não sumir na mata escura do pé do tepui
const BURITI = ["#7a9a3a", "#7aa83a", "#66743e", "#141c0c"];
const BURITI_ESTIPE = ["#8a7a6a", "#948470", "#786a6a", "#1a1614"];
const BURITI_SECO = ["#a8844a", "#b08c4a", "#8a7046", "#1e180e"];
const NUVEM = ["#f6e8ee", "#ffffff", "#f0d8e0", "#4a4e68"];
const AGUA = ["#d8e4ec", "#e8f4fa", "#d8ccdc", "#5a6a80"];

/** Buriti: a palmeira alta do lavrado, com a copa em leque. */
function buriti(ctx: Ctx, x: number, base: number, alt: number, cor: string, estipe: string, seco: string, t: number) {
  // a estipe reta e acinzentada, com os anéis
  ctx.fillStyle = estipe;
  ctx.fillRect(x - 2.5, base - alt, 5, alt);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  for (let y = base - alt + 10; y < base; y += 9) ctx.fillRect(x - 2.5, y, 5, 1.2);
  const topo = base - alt;
  // a saia de folhas secas, pendurada logo abaixo da copa
  ctx.fillStyle = seco;
  for (let i = 0; i < 6; i++) {
    const dx = (i - 2.5) * 2.6;
    ctx.beginPath();
    ctx.moveTo(x + dx - 2, topo + 2);
    ctx.lineTo(x + dx * 1.8 - 1.5, topo + 16 + (i % 2) * 3);
    ctx.lineTo(x + dx * 1.8 + 1.5, topo + 16 + (i % 2) * 3);
    ctx.lineTo(x + dx + 2, topo + 2);
    ctx.fill();
  }
  // o leque: as folhas verdes abertas em roda, com o lado do sol mais claro
  const bal = Math.sin(t * 1.2 + x * 0.02) * 0.06;
  for (let i = 0; i < 11; i++) {
    const a = -Math.PI / 2 + (i - 5) * 0.3 + bal;
    const L = 22 + (i % 2) * 5;
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.moveTo(x, topo);
    ctx.lineTo(x + Math.cos(a - 0.13) * L, topo + Math.sin(a - 0.13) * L);
    ctx.lineTo(x + Math.cos(a) * (L + 3), topo + Math.sin(a) * (L + 3));
    ctx.lineTo(x + Math.cos(a + 0.13) * L, topo + Math.sin(a + 0.13) * L);
    ctx.fill();
    if (i < 5) {
      ctx.fillStyle = "rgba(255,255,220,0.22)";
      ctx.beginPath();
      ctx.moveTo(x, topo);
      ctx.lineTo(x + Math.cos(a - 0.13) * L, topo + Math.sin(a - 0.13) * L);
      ctx.lineTo(x + Math.cos(a) * L, topo + Math.sin(a) * L);
      ctx.fill();
    }
  }
}

/** Binóculo pendurado na alça. */
function binoculo(c: Ctx) {
  c.strokeStyle = "#3a2a1a";
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(-6, -22);
  c.quadraticCurveTo(-14, -10, -10, -2);
  c.moveTo(6, -22);
  c.quadraticCurveTo(-4, -10, -2, -2);
  c.stroke();
  c.fillStyle = "#2a2a2e";
  c.strokeStyle = "#0a0a0e";
  for (const x of [-11, -2]) {
    c.beginPath();
    c.roundRect(x - 3.5, -4, 7, 11, 2);
    c.fill();
    c.stroke();
    c.fillStyle = "#6a8ab0";
    c.beginPath();
    c.ellipse(x, 7.5, 3, 1.2, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#2a2a2e";
  }
  c.fillRect(-8, -1, 3, 4);
}

export const RR: Tema = {
  id: "rr",
  nome: "Roraima",
  descricao: "O Monte Roraima, com as cachoeiras caindo do platô e as nuvens em volta, e o lavrado com os buritis.",
  grupo: "estados",
  amostra: "linear-gradient(135deg, #665e6a 50%, #b4ae58 50%)",
  onda: "sine",
  somBase: 165,
  paleta: {
    ceu: [["#d8a0a8", "#fde0d0"], ["#5aa4dc", "#dcf0fa"], ["#5a4a90", "#f2a070"], ["#081234", "#22386c"]],
    longe: TEPUI,
    perto: LAVRADO,
    chao: "#b8a466",
    chaoLinha: "#7a6a3a",
    coluna: { corpo: "#6e6272", sombra: "#4e4454", luz: "#8e8294", contorno: "#1a141e" },
    maleta: { corpo: "#c8742a", escuro: "#6a340a", fivela: "#ffffff", alca: "#6a340a" },
    asa: { cor: "#ffffff", contorno: "#6e6272" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: ["#b4ae58", "#ffffff", "#c8742a"],
    recorde: {
      cor: "#d8c87a", traco: [2, 3, 2, 3, 10, 3], largura: 3.5,
      aviso: { texto: "NOVO RECORDE NO TOPO!", fonte: "800 24px system-ui, sans-serif", corTexto: "#ffffff", corContorno: "#1a141e", corFundo: "rgba(80,70,90,0.92)", anima: "pulsa" },
    },
    hud: "#1a141e",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f) {
    // as nuvens se abrem e o arco-íris aparece sobre o Monte Roraima
    ctx.globalAlpha = surge(f) * 0.6;
    ctx.lineWidth = 12;
    ["#ff4a4a", "#ffa83a", "#ffe83a", "#4ae86a", "#3a9aff", "#8a5aff"].forEach((cor, i) => {
      ctx.strokeStyle = cor;
      ctx.beginPath();
      ctx.arc(w * 0.5, h - 140, 360 - i * 12, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  },
  decor(ctx, w, h, off, tod, t, tema, surpresa) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.18, h * 0.12, 20);
    else sol(ctx, w * 0.18, h * 0.13, 24, "#fff4d6", "rgba(255,236,180,0.45)");
    // o tepui, alto e de topo reto, com as cachoeiras e o anel de nuvens
    const tepui = ciclo(TEPUI, tod);
    const sombra = ciclo(TEPUI_SOMBRA, tod);
    const mata = ciclo(MATA, tod);
    const agua = ciclo(AGUA, tod);
    const nuvem = ciclo(NUVEM, tod);
    repetir(w, off * 0.04, 1300, (x, k) => {
      // o pé do tepui desce até atrás do lavrado (o topo fica onde estava): onde a crista do lavrado desce, o pé não
      // aparece mais solto no ar
      chapada(ctx, x + 200, h - 70, 760, 370, tepui, sombra, mata, k * 3);
      for (let i = 0; i < 4; i++) cachoeira(ctx, x + 300 + i * 170 + variar(k + i, 7, 40), h - 436, 6 + variar(i, 5, 3) * 3, h - 150, t + i, agua, "#ffffff");
      ctx.fillStyle = nuvem;
      ctx.globalAlpha = 0.75;
      for (let i = 0; i < 9; i++) {
        ctx.beginPath();
        ctx.ellipse(x + 160 + i * 100 + Math.sin(t * 0.3 + i) * 20, h - 300 + variar(i + k, 7, 3) * 12, 70, 16, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
    // a surpresa: o arco-íris na frente do tepui e atrás do lavrado
    surpresa?.();
    // o lavrado e os buritis
    colinas(ctx, w, h - 40, off * 0.16, ciclo(LAVRADO, tod), 80, 10, 0.006, 2);
    colinas(ctx, w, h - 40, off * 0.26, ciclo(["#a89a52", "#a4a050", "#8a7c52", "#1a180e"], tod), 44, 8, 0.01, 4);
    const palha = ciclo(BURITI, tod);
    const estipe = ciclo(BURITI_ESTIPE, tod);
    const seco = ciclo(BURITI_SECO, tod);
    repetir(w, off * 0.34, 110, (x, k) => {
      if (variar(k, 5, 3) === 0) return;
      buriti(ctx, x + variar(k, 31, 40), h - 50, 110 + variar(k, 13, 3) * 20, palha, estipe, seco, t);
    });
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#a08c5c", "#221e14"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 3);
    // capim do lavrado
    ctx.fillStyle = "#8a7a3a";
    ctx.beginPath();
    for (let x = -(off % 19); x < w; x += 19) {
      ctx.moveTo(x, y + 14);
      ctx.lineTo(x + 3, y + 5);
      ctx.lineTo(x + 5, y + 14);
      ctx.lineTo(x + 8, y + 7);
      ctx.lineTo(x + 9, y + 14);
    }
    ctx.fill();
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // arenito escuro do tepui: camadas finas e as fendas verticais por onde a água escorre
    for (let y = 0, i = 0; y < len; y += 12, i++) {
      ctx.fillStyle = [c.corpo, c.luz, c.corpo, c.sombra, c.corpo][(i + variante) % 5];
      ctx.fillRect(x0, y, w, Math.min(12, len - y));
    }
    ctx.fillStyle = c.sombra;
    for (let i = 0; i < 3; i++) ctx.fillRect(x0 + 12 + i * 22 + variar(i + variante, 7, 6), 0, 3, len);
    ctx.fillStyle = "rgba(200,220,240,0.35)";
    ctx.fillRect(x0 + 13 + variar(variante, 7, 6), 0, 1.6, len);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(x0 + w - 8, 0, 8, len);
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = c.luz;
      ctx.beginPath();
      ctx.moveTo(x0, 14);
      ctx.lineTo(x0 + w * 0.2, 6);
      ctx.lineTo(x0 + w * 0.4, 10);
      ctx.lineTo(x0 + w * 0.7, 0);
      ctx.lineTo(x0 + w, 7);
      ctx.lineTo(x0 + w, 16);
      ctx.lineTo(x0, 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // o topo do tepui, com as rochas negras esculpidas e a vegetação baixa
    ctx.fillStyle = "#2a2430";
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const rx = x0 + 2 + (i * (w - 4)) / 4;
      ctx.ellipse(rx, 6, 7, 6, 0, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.fillStyle = "#4a6a3a";
    ctx.fillRect(x0 - 2, 8, w + 4, 6);
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, binoculo);
  },
};
