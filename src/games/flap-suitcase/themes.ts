// Estilos visuais do Flap Suitcase. Tudo é desenhado proceduralmente (sem sprites),
// para o jogo ser leve e para cada estilo poder mudar forma, cor e efeitos.
//
// Para criar um estilo: copie um objeto de TEMAS, ajuste a paleta e, se quiser,
// sobrescreva `decor`, `coluna` ou `maleta`.

export type Ctx = CanvasRenderingContext2D;

export interface Paleta {
  ceu: [string, string][]; // [topo, horizonte] para amanhecer, dia, entardecer, noite
  longe: string[]; // colinas distantes por hora do dia
  perto: string[]; // silhuetas próximas por hora do dia
  chao: string;
  chaoLinha: string;
  coluna: { corpo: string; sombra: string; luz: string; contorno: string };
  maleta: { corpo: string; escuro: string; fivela: string; alca: string };
  asa: { cor: string; contorno: string };
  moeda: [string, string];
  particula: string[];
  hud: string;
  estrelas: string;
}

export interface Tema {
  id: string;
  nome: string;
  descricao: string;
  paleta: Paleta;
  onda: OscillatorType;
  somBase: number;
  /** <1 renderiza em baixa resolução e amplia (estética pixel) */
  escala?: number;
  /** com `escala`: cores do buffer viram a paleta do tema, sem bordas intermediárias */
  semAntisserrilhado?: boolean;
  /** força clima */
  climaFixo?: Clima;
  capitel?: "dorico" | "jonico" | "corintio" | "misto";
  decor?: (ctx: Ctx, w: number, h: number, off: number, tod: number, t: number, tema: Tema) => void;
  coluna?: (ctx: Ctx, w: number, len: number, variante: number, quebrada: boolean, tema: Tema, t: number) => void;
  maleta?: (ctx: Ctx, fase: number, t: number, tema: Tema) => void;
  chao?: (ctx: Ctx, w: number, h: number, y: number, off: number, tema: Tema, tod: number) => void;
}

export type Clima = "limpo" | "chuva" | "neve" | "folhas" | "tempestade" | "neblina";

// ---------------------------------------------------------------------------
// Utilidades de cor
// ---------------------------------------------------------------------------
function hex(c: string): [number, number, number] {
  const v = c.replace("#", "");
  const n = parseInt(v.length === 3 ? v.split("").map((x) => x + x).join("") : v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a: string, b: string, k: number) {
  const [r1, g1, b1] = hex(a);
  const [r2, g2, b2] = hex(b);
  const f = (x: number, y: number) => Math.round(x + (y - x) * k);
  return `rgb(${f(r1, r2)},${f(g1, g2)},${f(b1, b2)})`;
}
/** Interpola uma lista de 4 cores (ciclo do dia) em tod ∈ [0, 4). */
export function ciclo(cores: string[], tod: number) {
  const i = Math.floor(tod) % 4;
  return mix(cores[i], cores[(i + 1) % 4], tod - Math.floor(tod));
}
const rr = (ctx: Ctx, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
};

// ---------------------------------------------------------------------------
// Peças de cenário reutilizáveis
// ---------------------------------------------------------------------------
function colinas(ctx: Ctx, w: number, h: number, off: number, cor: string, alt: number, amp: number, freq: number, seed: number) {
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w + 20; x += 20) {
    const X = x + off;
    const y = h - alt - Math.sin(X * freq + seed) * amp - Math.sin(X * freq * 2.3 + seed * 2) * amp * 0.4;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}

function templo(ctx: Ctx, x: number, base: number, s: number, cor: string) {
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(x - 6 * s, base - 40 * s);
  ctx.lineTo(x + 50 * s, base - 58 * s);
  ctx.lineTo(x + 106 * s, base - 40 * s);
  ctx.fill();
  ctx.fillRect(x - 6 * s, base - 40 * s, 112 * s, 6 * s);
  for (let i = 0; i < 6; i++) ctx.fillRect(x + i * 19 * s, base - 34 * s, 8 * s, 30 * s);
  ctx.fillRect(x - 10 * s, base - 4 * s, 120 * s, 4 * s);
}

function nuvem(ctx: Ctx, x: number, y: number, s: number, cor: string) {
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.arc(x, y, 18 * s, 0, Math.PI * 2);
  ctx.arc(x + 20 * s, y - 10 * s, 22 * s, 0, Math.PI * 2);
  ctx.arc(x + 44 * s, y, 18 * s, 0, Math.PI * 2);
  ctx.rect(x, y, 44 * s, 18 * s);
  ctx.fill();
}

function engrenagem(ctx: Ctx, x: number, y: number, r: number, dentes: number, ang: number, cor: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.fillStyle = cor;
  ctx.beginPath();
  for (let i = 0; i < dentes * 2; i++) {
    const a = (i / (dentes * 2)) * Math.PI * 2;
    const rad = i % 2 ? r : r * 1.18;
    ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Coluna grega padrão (desenhada a partir da ponta voltada para o vão, em y=0,
// crescendo para +y). O engine espelha a de cima.
// ---------------------------------------------------------------------------
export function colunaGrega(ctx: Ctx, w: number, len: number, variante: number, quebrada: boolean, tema: Tema) {
  const c = tema.paleta.coluna;
  const ordem = tema.capitel === "misto" || !tema.capitel ? (["dorico", "jonico", "corintio"] as const)[variante % 3] : tema.capitel;
  const capH = quebrada ? 0 : ordem === "dorico" ? 16 : ordem === "jonico" ? 20 : 26;
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = c.contorno;

  // fuste com caneluras
  const x0 = -w / 2;
  ctx.fillStyle = c.corpo;
  ctx.fillRect(x0, capH, w, len - capH);
  const n = 6;
  for (let i = 0; i < n; i++) {
    const fx = x0 + (i + 0.5) * (w / n);
    ctx.fillStyle = i % 2 ? c.sombra : c.luz;
    ctx.fillRect(fx - w / n / 4, capH + 2, w / n / 2, len - capH);
  }
  ctx.fillStyle = c.sombra;
  ctx.fillRect(x0 + w - 6, capH, 6, len - capH);
  ctx.strokeRect(x0, capH, w, len - capH);

  if (quebrada) {
    // ponta quebrada (ruína)
    ctx.fillStyle = c.corpo;
    ctx.beginPath();
    ctx.moveTo(x0, 14);
    ctx.lineTo(x0 + w * 0.2, 4);
    ctx.lineTo(x0 + w * 0.38, 12);
    ctx.lineTo(x0 + w * 0.6, 0);
    ctx.lineTo(x0 + w * 0.8, 9);
    ctx.lineTo(x0 + w, 3);
    ctx.lineTo(x0 + w, 16);
    ctx.lineTo(x0, 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    return;
  }

  // capitel
  const aw = w * 1.3;
  ctx.fillStyle = c.luz;
  rr(ctx, -aw / 2, 0, aw, 8, 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = c.corpo;
  if (ordem === "dorico") {
    ctx.beginPath();
    ctx.moveTo(-aw / 2 + 4, 8);
    ctx.lineTo(aw / 2 - 4, 8);
    ctx.lineTo(w / 2, capH);
    ctx.lineTo(-w / 2, capH);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (ordem === "jonico") {
    ctx.fillRect(-w / 2 - 2, 8, w + 4, capH - 8);
    ctx.strokeRect(-w / 2 - 2, 8, w + 4, capH - 8);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(s * (w / 2 + 2), 14, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s * (w / 2 + 2), 14, 3, 0, Math.PI * 1.6);
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(-aw / 2 + 2, 8);
    ctx.lineTo(aw / 2 - 2, 8);
    ctx.lineTo(w / 2 + 2, capH);
    ctx.lineTo(-w / 2 - 2, capH);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = c.sombra;
    for (let i = 0; i < 5; i++) {
      const lx = -w / 2 + (i + 0.5) * (w / 5);
      ctx.beginPath();
      ctx.ellipse(lx, capH - 6, 5, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = c.sombra;
  ctx.fillRect(-w / 2, capH, w, 3);
}

// ---------------------------------------------------------------------------
// Maleta padrão (centrada em 0,0; ~46×34)
// ---------------------------------------------------------------------------
export function asas(ctx: Ctx, fase: number, tema: Tema, estilo: "penas" | "neon" | "mecanica" | "tinta" = "penas") {
  const a = tema.paleta.asa;
  const ang = Math.sin(fase) * 0.7;
  for (const lado of [-1, 1]) {
    ctx.save();
    ctx.translate(lado * 14, -8);
    ctx.scale(lado, 1);
    ctx.rotate(-0.35 - ang * 0.6);
    ctx.lineWidth = estilo === "neon" ? 2 : 1.4;
    ctx.strokeStyle = a.contorno;
    ctx.fillStyle = estilo === "neon" ? "transparent" : a.cor;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      const L = 34 - i * 5;
      ctx.ellipse(10 + i * 3, -6 - i * 5, L * 0.55, 6, -0.5 - i * 0.18, 0, Math.PI * 2);
      if (estilo !== "neon") ctx.fill();
      ctx.stroke();
      if (estilo === "mecanica") {
        ctx.beginPath();
        ctx.arc(2, -2, 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

export function maletaPadrao(ctx: Ctx, fase: number, t: number, tema: Tema, extras?: (ctx: Ctx) => void, estiloAsa?: "penas" | "neon" | "mecanica" | "tinta") {
  const m = tema.paleta.maleta;
  asas(ctx, fase, tema, estiloAsa);
  // alça
  ctx.strokeStyle = m.alca;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(-8, -24, 16, 10, 5);
  ctx.stroke();
  // corpo
  ctx.fillStyle = m.corpo;
  ctx.strokeStyle = m.escuro;
  ctx.lineWidth = 2;
  rr(ctx, -23, -16, 46, 32, 6);
  ctx.fill();
  ctx.stroke();
  // aba
  ctx.fillStyle = m.escuro;
  rr(ctx, -23, -16, 46, 11, 6);
  ctx.globalAlpha = 0.35;
  ctx.fill();
  ctx.globalAlpha = 1;
  // costuras e tiras
  ctx.strokeStyle = m.escuro;
  ctx.lineWidth = 3;
  for (const x of [-12, 12]) {
    ctx.beginPath();
    ctx.moveTo(x, -16);
    ctx.lineTo(x, 8);
    ctx.stroke();
  }
  // fivelas e fecho
  ctx.fillStyle = m.fivela;
  for (const x of [-12, 12]) ctx.fillRect(x - 3.5, 2, 7, 6);
  rr(ctx, -4, -8, 8, 7, 2);
  ctx.fill();
  extras?.(ctx);
}

// ---------------------------------------------------------------------------
// Temas
// ---------------------------------------------------------------------------
const CLASSICO: Tema = {
  id: "classico",
  nome: "Clássico",
  descricao: "Mármore, mar Egeu e a Acrópole ao fundo.",
  onda: "triangle",
  somBase: 440,
  capitel: "misto",
  paleta: {
    ceu: [["#f3a86b", "#fbd9a8"], ["#4f9fe0", "#bfe3fb"], ["#3b4f8f", "#f0915a"], ["#07142e", "#1d3a6b"]],
    longe: ["#c9a98a", "#8fb3c9", "#6d5a7c", "#12223f"],
    perto: ["#a98c6c", "#6f97a8", "#4d3f5e", "#0b1830"],
    chao: "#e8dcc4",
    chaoLinha: "#c9b48c",
    coluna: { corpo: "#efe6d6", sombra: "#d3c6ad", luz: "#fbf6ec", contorno: "#a8977a" },
    maleta: { corpo: "#b8742e", escuro: "#7a4617", fivela: "#e8c35a", alca: "#6b3d14" },
    asa: { cor: "#ffffff", contorno: "#b9c7d6" },
    moeda: ["#f3c44f", "#b8860b"],
    particula: ["#ffffff", "#f3c44f", "#d9c9a8"],
    hud: "#03112c",
    estrelas: "#ffffff",
  },
  decor(ctx, w, h, off, tod, t, tema) {
    const p = tema.paleta;
    // sol/lua
    const noite = tod > 2.6 && tod < 3.9;
    ctx.fillStyle = noite ? "#f2f0e6" : "#fff2c4";
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(w * 0.78, h * (tod < 1 ? 0.45 - tod * 0.2 : tod < 2 ? 0.25 : 0.25 + (tod - 2) * 0.25), noite ? 22 : 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    for (let i = 0; i < 4; i++) nuvem(ctx, ((i * 330 - off * 0.1) % (w + 200) + w + 200) % (w + 200) - 100, 70 + (i % 2) * 50, 1 + (i % 3) * 0.3, "rgba(255,255,255,0.55)");
    // mar
    ctx.fillStyle = mix("#2d6fa3", "#0a1a33", tod > 2 ? Math.min(1, tod - 2) : 0);
    ctx.fillRect(0, h - 150, w, 150);
    colinas(ctx, w, h - 40, off * 0.15, ciclo(p.longe, tod), 70, 26, 0.006, 1);
    // templos
    const esp = 900;
    for (let k = -1; k < w / esp + 2; k++) {
      const x = k * esp - ((off * 0.3) % esp);
      templo(ctx, x + 200, h - 92, 1.1, ciclo(p.perto, tod));
    }
    colinas(ctx, w, h - 40, off * 0.35, ciclo(p.perto, tod), 40, 14, 0.012, 4);
  },
};

const FOFO: Tema = {
  id: "fofo",
  nome: "Fofo",
  descricao: "Tons pastel, nuvens de algodão e uma maleta sorridente.",
  onda: "sine",
  somBase: 660,
  capitel: "jonico",
  paleta: {
    ceu: [["#ffc6d9", "#fff0f5"], ["#a8dcff", "#e9f7ff"], ["#ffb3c7", "#ffe3b3"], ["#4b3f8f", "#9d84d6"]],
    longe: ["#ffd6e8", "#c8f0dc", "#f7c6e0", "#6d5fb0"],
    perto: ["#ffb8d4", "#9fe3c0", "#eaa6cf", "#584a9c"],
    chao: "#b8f0cf",
    chaoLinha: "#86d9ad",
    coluna: { corpo: "#ffe1ee", sombra: "#ffc2da", luz: "#ffffff", contorno: "#e59ab9" },
    maleta: { corpo: "#ff8fb8", escuro: "#d45f8d", fivela: "#fff1a8", alca: "#c24f7c" },
    asa: { cor: "#ffffff", contorno: "#ffc2da" },
    moeda: ["#ffe27a", "#f7a8c4"],
    particula: ["#ff8fb8", "#ffe27a", "#a8dcff", "#ffffff"],
    hud: "#8a3a63",
    estrelas: "#fff6a8",
  },
  decor(ctx, w, h, off, tod, t, tema) {
    const p = tema.paleta;
    // arco-íris
    const cores = ["#ff9aa2", "#ffdac1", "#e2f0cb", "#b5ead7", "#c7ceea"];
    ctx.lineWidth = 12;
    cores.forEach((c, i) => {
      ctx.strokeStyle = c;
      ctx.globalAlpha = tod > 2.6 ? 0.2 : 0.55;
      ctx.beginPath();
      ctx.arc(w * 0.7 - off * 0.05 % 50, h - 40, 260 - i * 12, Math.PI, Math.PI * 2);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    for (let i = 0; i < 6; i++) {
      const x = ((i * 260 - off * 0.2) % (w + 200) + w + 200) % (w + 200) - 100;
      nuvem(ctx, x, 60 + ((i * 37) % 120), 1.2, "rgba(255,255,255,0.85)");
    }
    colinas(ctx, w, h - 40, off * 0.2, ciclo(p.longe, tod), 80, 30, 0.007, 2);
    colinas(ctx, w, h - 40, off * 0.4, ciclo(p.perto, tod), 45, 20, 0.014, 5);
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    colunaGrega(ctx, w, len, variante, quebrada, tema);
    // listras de bala
    ctx.save();
    ctx.beginPath();
    ctx.rect(-w / 2, 26, w, len);
    ctx.clip();
    ctx.strokeStyle = "rgba(255,143,184,0.35)";
    ctx.lineWidth = 7;
    for (let y = 20; y < len + w; y += 22) {
      ctx.beginPath();
      ctx.moveTo(-w / 2, y);
      ctx.lineTo(w / 2, y - w * 0.5);
      ctx.stroke();
    }
    ctx.restore();
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => {
      const pisca = Math.sin(t * 2.3) > 0.97;
      c.fillStyle = "#3a2140";
      for (const x of [-8, 8]) {
        c.beginPath();
        if (pisca) c.rect(x - 3, 3, 6, 1.5);
        else c.arc(x, 4, 2.6, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = "rgba(255,90,140,0.5)";
      for (const x of [-15, 15]) {
        c.beginPath();
        c.ellipse(x, 9, 4, 2.5, 0, 0, Math.PI * 2);
        c.fill();
      }
      c.strokeStyle = "#3a2140";
      c.lineWidth = 1.5;
      c.beginPath();
      c.arc(0, 8, 3.5, 0.15 * Math.PI, 0.85 * Math.PI);
      c.stroke();
    });
  },
};

const RETRO: Tema = {
  id: "retro",
  nome: "Retrofuturista",
  descricao: "Synthwave: sol listrado, grade neon e colunas de luz.",
  onda: "sawtooth",
  somBase: 330,
  capitel: "dorico",
  paleta: {
    ceu: [["#2b0b4f", "#ff5ea8"], ["#1b0b40", "#ff8a3d"], ["#140630", "#ff3f8e"], ["#05010f", "#3a0b5e"]],
    longe: ["#3b0f63", "#401066", "#2c0a4a", "#150426"],
    perto: ["#1a0633", "#1c0738", "#12042a", "#07010f"],
    chao: "#0b0118",
    chaoLinha: "#ff3fd1",
    coluna: { corpo: "#12052b", sombra: "#1d0a40", luz: "#2a0f5c", contorno: "#27e0ff" },
    maleta: { corpo: "#c8d3e6", escuro: "#6c3bd6", fivela: "#27e0ff", alca: "#ff3fd1" },
    asa: { cor: "#27e0ff", contorno: "#27e0ff" },
    moeda: ["#fff36b", "#ff3fd1"],
    particula: ["#27e0ff", "#ff3fd1", "#fff36b"],
    hud: "#ffffff",
    estrelas: "#ffffff",
  },
  decor(ctx, w, h) {
    // sol listrado
    const cx = w * 0.55;
    const cy = h - 170;
    const g = ctx.createLinearGradient(0, cy - 120, 0, cy + 60);
    g.addColorStop(0, "#fff36b");
    g.addColorStop(1, "#ff3f8e");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 120, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1b0b40";
    for (let i = 0; i < 6; i++) ctx.fillRect(cx - 130, cy - 50 + i * 10, 260, 2 + i * 1.2);
    // montanhas wireframe
    ctx.strokeStyle = "#ff3fd1";
    ctx.lineWidth = 1.5;
    ctx.fillStyle = "#12042a";
    ctx.beginPath();
    ctx.moveTo(0, h - 40);
    for (let x = 0; x <= w; x += 60) ctx.lineTo(x, h - 40 - (Math.abs(Math.sin(x * 0.013)) * 90 + 20));
    ctx.lineTo(w, h - 40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  },
  chao(ctx, w, h, y, off) {
    ctx.fillStyle = "#0b0118";
    ctx.fillRect(0, y, w, h - y);
    ctx.strokeStyle = "#ff3fd1";
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.8;
    for (let i = 0; i < 5; i++) {
      const yy = y + 4 + i * i * 2.5;
      ctx.beginPath();
      ctx.moveTo(0, yy);
      ctx.lineTo(w, yy);
      ctx.stroke();
    }
    const cx = w / 2;
    for (let k = -12; k <= 12; k++) {
      const x = cx + k * 60 - (off % 60);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(cx + (x - cx) * 3, h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    colunaGrega(ctx, w, len, variante, quebrada, tema);
    // brilho neon (traço largo translúcido + traço fino)
    ctx.strokeStyle = variante % 2 ? "#ff3fd1" : "#27e0ff";
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 8;
    ctx.strokeRect(-w / 2, 0, w, len);
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2, 0, w, len);
  },
  maleta(ctx, fase, t, tema) {
    // rastro de propulsor
    ctx.fillStyle = "rgba(255,63,209,0.55)";
    ctx.beginPath();
    ctx.moveTo(-23, 6);
    ctx.lineTo(-40 - Math.random() * 12, 10);
    ctx.lineTo(-23, 14);
    ctx.fill();
    maletaPadrao(ctx, fase, t, tema, (c) => {
      c.strokeStyle = "#27e0ff";
      c.lineWidth = 1.5;
      c.strokeRect(-20, -13, 40, 26);
    }, "neon");
  },
};

const STEAMPUNK: Tema = {
  id: "steampunk",
  nome: "Steampunk",
  descricao: "Latão, engrenagens girando e vapor por todo lado.",
  onda: "triangle",
  somBase: 220,
  capitel: "corintio",
  paleta: {
    ceu: [["#6b4a2b", "#d9a066"], ["#8a6a45", "#e8c79a"], ["#5a3522", "#d97a3d"], ["#1f140c", "#4a3320"]],
    longe: ["#5a4230", "#6e5540", "#4a2f20", "#1a110a"],
    perto: ["#3d2b1e", "#4a3727", "#33201a", "#0f0a06"],
    chao: "#3a2a1c",
    chaoLinha: "#b5863a",
    coluna: { corpo: "#b5863a", sombra: "#8a5f22", luz: "#e0b766", contorno: "#5a3a12" },
    maleta: { corpo: "#6b4226", escuro: "#3d2412", fivela: "#d9a441", alca: "#2a1a0d" },
    asa: { cor: "#c98b4a", contorno: "#6b4226" },
    moeda: ["#e0b766", "#8a5f22"],
    particula: ["#d9d2c5", "#b5863a", "#8a8178"],
    hud: "#2a1a0d",
    estrelas: "#f0d9a8",
  },
  decor(ctx, w, h, off, tod, t, tema) {
    const p = tema.paleta;
    for (let i = 0; i < 5; i++) {
      const x = ((i * 300 - off * 0.15) % (w + 300) + w + 300) % (w + 300) - 150;
      engrenagem(ctx, x, h - 220 + (i % 2) * 60, 40 + (i % 3) * 18, 10 + i, t * (i % 2 ? 0.4 : -0.3), "rgba(90,58,18,0.45)");
    }
    colinas(ctx, w, h - 40, off * 0.2, ciclo(p.longe, tod), 60, 18, 0.008, 3);
    // chaminés
    ctx.fillStyle = ciclo(p.perto, tod);
    for (let k = -1; k < w / 240 + 2; k++) {
      const x = k * 240 - ((off * 0.4) % 240);
      ctx.fillRect(x + 40, h - 170, 26, 130);
      ctx.fillRect(x + 110, h - 130, 70, 90);
      ctx.fillRect(x + 34, h - 176, 38, 10);
    }
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    g.addColorStop(0, c.sombra);
    g.addColorStop(0.35, c.luz);
    g.addColorStop(1, c.sombra);
    ctx.fillStyle = g;
    ctx.fillRect(-w / 2, 18, w, len);
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2, 18, w, len);
    // anéis com rebites
    for (let y = 60; y < len; y += 90) {
      ctx.fillStyle = c.sombra;
      ctx.fillRect(-w / 2 - 4, y, w + 8, 10);
      ctx.fillStyle = "#f0d9a8";
      for (let x = -w / 2; x <= w / 2; x += w / 4) {
        ctx.beginPath();
        ctx.arc(x, y + 5, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // flange + engrenagem na ponta
    ctx.fillStyle = c.corpo;
    ctx.fillRect(-w / 2 - 8, 0, w + 16, 18);
    ctx.strokeRect(-w / 2 - 8, 0, w + 16, 18);
    if (!quebrada) engrenagem(ctx, 0, 9, 13, 8, variante, "#5a3a12");
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => {
      engrenagem(c, 14, 8, 5, 7, t * 3, "#d9a441");
      c.fillStyle = "#2a1a0d";
      c.fillRect(-20, -3, 16, 5);
      c.fillStyle = "#9fe0f0";
      for (const x of [-16, -8]) {
        c.beginPath();
        c.arc(x, -1, 3, 0, Math.PI * 2);
        c.fill();
      }
    }, "mecanica");
  },
};

const PIXEL: Tema = {
  id: "pixel",
  nome: "Pixel 8-bit",
  descricao: "Resolução baixa e cores de console antigo.",
  onda: "square",
  somBase: 523,
  escala: 0.34,
  semAntisserrilhado: true,
  capitel: "dorico",
  paleta: {
    ceu: [["#f8b878", "#fce0a8"], ["#5c94fc", "#a4e4fc"], ["#d82800", "#fca044"], ["#000000", "#0000a8"]],
    longe: ["#e45c10", "#00a800", "#a81000", "#000080"],
    perto: ["#ac7c00", "#008800", "#881400", "#000058"],
    chao: "#c84c0c",
    chaoLinha: "#fcbcb0",
    coluna: { corpo: "#fcfcfc", sombra: "#bcbcbc", luz: "#fcfcfc", contorno: "#000000" },
    maleta: { corpo: "#c84c0c", escuro: "#7c0800", fivela: "#fcd8a8", alca: "#000000" },
    asa: { cor: "#fcfcfc", contorno: "#000000" },
    moeda: ["#fca044", "#c84c0c"],
    particula: ["#fcfcfc", "#fca044", "#5c94fc"],
    hud: "#000000",
    estrelas: "#fcfcfc",
  },
  decor(ctx, w, h, off, tod, t, tema) {
    const p = tema.paleta;
    for (let i = 0; i < 4; i++) {
      const x = ((i * 320 - off * 0.2) % (w + 200) + w + 200) % (w + 200) - 100;
      ctx.fillStyle = "#fcfcfc";
      ctx.fillRect(x, 80 + (i % 2) * 40, 60, 16);
      ctx.fillRect(x + 14, 68 + (i % 2) * 40, 32, 12);
    }
    // morros em degraus
    ctx.fillStyle = ciclo(p.longe, tod);
    for (let k = -1; k < w / 200 + 2; k++) {
      const x = k * 200 - ((off * 0.3) % 200);
      for (let s = 0; s < 5; s++) ctx.fillRect(x + s * 12, h - 40 - (5 - s) * 16, 120 - s * 24, 16);
    }
  },
};

const NOIR: Tema = {
  id: "noir",
  nome: "Noir Tribunal",
  descricao: "Preto e branco, chuva constante e luz de refletor.",
  onda: "sine",
  somBase: 196,
  climaFixo: "chuva",
  capitel: "dorico",
  paleta: {
    ceu: [["#2a2a2a", "#555555"], ["#3a3a3a", "#707070"], ["#222222", "#4a4a4a"], ["#050505", "#1c1c1c"]],
    longe: ["#1e1e1e", "#2a2a2a", "#191919", "#0a0a0a"],
    perto: ["#111111", "#161616", "#0d0d0d", "#000000"],
    chao: "#141414",
    chaoLinha: "#3a3a3a",
    coluna: { corpo: "#3c3c3c", sombra: "#262626", luz: "#6a6a6a", contorno: "#c8c8c8" },
    maleta: { corpo: "#1c1c1c", escuro: "#000000", fivela: "#d8d8d8", alca: "#000000" },
    asa: { cor: "#e8e8e8", contorno: "#8a8a8a" },
    moeda: ["#e0e0e0", "#7a7a7a"],
    particula: ["#dddddd", "#9a9a9a"],
    hud: "#ffffff",
    estrelas: "#bbbbbb",
  },
  decor(ctx, w, h, off, tod, t, tema) {
    const p = tema.paleta;
    // refletor
    const g = ctx.createRadialGradient(w * 0.3, 0, 10, w * 0.3, 0, h);
    g.addColorStop(0, "rgba(255,255,255,0.18)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(w * 0.3, 0);
    ctx.lineTo(w * 0.3 - 200 + Math.sin(t * 0.3) * 80, h);
    ctx.lineTo(w * 0.3 + 200 + Math.sin(t * 0.3) * 80, h);
    ctx.fill();
    // silhueta do fórum / cidade
    ctx.fillStyle = ciclo(p.longe, tod);
    for (let k = -1; k < w / 90 + 2; k++) {
      const x = k * 90 - ((off * 0.2) % 90);
      const hh = 80 + ((k * 7919) % 5 + 5) % 5 * 30;
      ctx.fillRect(x, h - 40 - hh, 70, hh);
    }
    templo(ctx, ((-off * 0.35) % 700) + 700 * 0.6, h - 40, 1.6, ciclo(p.perto, tod));
  },
};

const PAPIRO: Tema = {
  id: "papiro",
  nome: "Papiro",
  descricao: "Tudo desenhado a nanquim sobre pergaminho, com parágrafos voando.",
  onda: "triangle",
  somBase: 392,
  climaFixo: "folhas",
  capitel: "jonico",
  paleta: {
    ceu: [["#efe0bd", "#f7ecd2"], ["#f1e4c6", "#faf3e0"], ["#e8d3a8", "#f3e2bf"], ["#b9a47c", "#d6c49b"]],
    longe: ["#d9c69d", "#dccaa3", "#cdb68a", "#9c8762"],
    perto: ["#c7b084", "#cbb58b", "#baa073", "#85704d"],
    chao: "#dcc79c",
    chaoLinha: "#3b2a1a",
    coluna: { corpo: "#f4e8cc", sombra: "#e3d2ab", luz: "#fbf4e2", contorno: "#3b2a1a" },
    maleta: { corpo: "#f4e8cc", escuro: "#3b2a1a", fivela: "#3b2a1a", alca: "#3b2a1a" },
    asa: { cor: "#fbf4e2", contorno: "#3b2a1a" },
    moeda: ["#f4e8cc", "#3b2a1a"],
    particula: ["#3b2a1a", "#7a5c3a"],
    hud: "#3b2a1a",
    estrelas: "#3b2a1a",
  },
  decor(ctx, w, h, off, tod, t, tema) {
    const p = tema.paleta;
    ctx.strokeStyle = "rgba(59,42,26,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 8) {
      const X = x + off * 0.2;
      ctx.lineTo(x, h - 110 - Math.sin(X * 0.007) * 30);
    }
    ctx.stroke();
    // hachuras das colinas
    colinas(ctx, w, h - 40, off * 0.35, ciclo(p.perto, tod), 40, 16, 0.012, 6);
    ctx.fillStyle = "rgba(59,42,26,0.35)";
    ctx.font = "italic 22px Georgia, serif";
    for (let i = 0; i < 5; i++) {
      const x = ((i * 250 - off * 0.25) % (w + 200) + w + 200) % (w + 200) - 100;
      ctx.fillText(["§", "Art.", "CP", "CPP", "LEP"][i], x, 120 + (i % 3) * 60);
    }
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => {
      c.strokeStyle = "#3b2a1a";
      c.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.moveTo(-20 + i * 3, 14);
        c.lineTo(-10 + i * 3, 4);
        c.stroke();
      }
    }, "tinta");
  },
};

export const TEMAS: Tema[] = [CLASSICO, FOFO, RETRO, STEAMPUNK, PIXEL, NOIR, PAPIRO];
export const temaPorId = (id: string) => TEMAS.find((t) => t.id === id) ?? CLASSICO;
