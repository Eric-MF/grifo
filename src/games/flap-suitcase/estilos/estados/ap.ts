// Amapá: o Marco Zero do Equador, o obelisco por onde passa a linha que divide os hemisférios, a Fortaleza de São José
// de Macapá e o rio Amazonas, com a pororoca e os surfistas; na maleta, a prancha de surfe.
import { ciclo, colinas, maletaPadrao, type Ctx, type Tema } from "../../themes";
import { atravessa, figura, lua, mar, noiteDe, repetir, sol } from "../kit";

const LINHA = "#e8333a";
// cores por hora do dia (amanhecer, dia, entardecer, noite)
const FLORESTA = ["#3a6a3a", "#2f7038", "#384a3a", "#0a160e"];
const RIO = ["#a8805a", "#b4885a", "#94705a", "#2a2018"];
const ONDA = ["#c8a07a", "#d4aa7a", "#b08a74", "#3a3028"];
const ONDA_SOMBRA = ["#8e6a48", "#94704a", "#7a5e52", "#1e1812"];
const MARCO = ["#ecebe8", "#f6f6f4", "#e2dade", "#5a5a6e"];
const FORTE = ["#a8a090", "#b0a894", "#968c8a", "#2a2a2e"];

interface Pororoca {
  /** a ponta da frente da onda (a mais perto), no pé: x e y */
  x: number;
  y: number;
  /** a ponta de trás, lá longe: quanto fica para trás (x) e mais acima (y) */
  comprimento: number;
  subida: number;
  /** a altura da onda na ponta da frente e na de trás */
  alto: number;
  baixo: number;
  /** a cor da água barrenta e a da face da onda, na sombra */
  agua: string;
  sombra: string;
  surfistas: number;
  /** um tronco rolando na espuma */
  tronco?: boolean;
}

/**
 * A pororoca vista de viés: a parede de água barrenta atravessa o rio de longe (pequena, lá atrás à esquerda) até
 * perto (alta, à direita), onde se vê o perfil dela, com o lábio curvando para a frente sobre o tubo; a crista quebra
 * em espuma, voam os borrifos, e os surfistas descem a face, cada um na sua altura.
 */
function pororoca(ctx: Ctx, o: Pororoca, t: number) {
  const N = 30;
  const pe = (u: number): [number, number] => [o.x - o.comprimento * (1 - u), o.y - o.subida * (1 - u)];
  const altura = (u: number) => o.baixo + (o.alto - o.baixo) * u ** 1.4;
  const crista = (u: number): [number, number] => {
    const [bx, by] = pe(u);
    const a = altura(u);
    return [bx - a * 0.25, by - a + Math.sin(t * 3 + u * 9) * a * 0.03];
  };
  const frente = (u: number): [number, number] => {
    const [bx, by] = pe(u);
    return [bx + altura(u) * 0.75, by];
  };
  const H = o.alto;
  const [bx, by] = pe(1);
  // a face da parede, mais escura embaixo
  const g = ctx.createLinearGradient(0, by - H, 0, by);
  g.addColorStop(0, o.agua);
  g.addColorStop(1, o.sombra);
  ctx.fillStyle = g;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const [px, py] = crista(i / N);
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  for (let i = N; i >= 0; i--) {
    const [px, py] = frente(i / N);
    ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  // os fios d'água descendo a face
  ctx.strokeStyle = "rgba(255,240,220,0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < N; i += 2) {
    const u = (i + ((t * 0.6) % 2)) / N;
    if (u > 1) continue;
    const [ax, ay] = crista(u);
    const [fx, fy] = frente(u);
    ctx.moveTo(ax + (fx - ax) * 0.25, ay + (fy - ay) * 0.25);
    ctx.quadraticCurveTo(ax + (fx - ax) * 0.4, ay + (fy - ay) * 0.7, fx, fy);
  }
  ctx.stroke();
  // o perfil da onda na ponta de cá: as costas subindo, a crista, o lábio que se curva sobre o tubo e a face
  const perfil = new Path2D();
  perfil.moveTo(bx - H * 1.7, by);
  perfil.quadraticCurveTo(bx - H * 0.7, by - H * 0.55, bx - H * 0.25, by - H);
  perfil.quadraticCurveTo(bx + H * 0.25, by - H * 1.14, bx + H * 0.58, by - H * 0.72);
  perfil.quadraticCurveTo(bx + H * 0.66, by - H * 0.48, bx + H * 0.47, by - H * 0.4);
  perfil.quadraticCurveTo(bx + H * 0.22, by - H * 0.56, bx + H * 0.14, by - H * 0.3);
  perfil.quadraticCurveTo(bx + H * 0.26, by - H * 0.04, bx + H * 0.78, by);
  perfil.closePath();
  const gp = ctx.createLinearGradient(bx - H, by - H, bx + H * 0.6, by);
  gp.addColorStop(0, o.agua);
  gp.addColorStop(1, o.sombra);
  ctx.fillStyle = gp;
  ctx.fill(perfil);
  // a sombra do tubo, embaixo do lábio
  ctx.fillStyle = "rgba(40,26,14,0.35)";
  ctx.beginPath();
  ctx.moveTo(bx + H * 0.47, by - H * 0.4);
  ctx.quadraticCurveTo(bx + H * 0.22, by - H * 0.56, bx + H * 0.14, by - H * 0.3);
  ctx.quadraticCurveTo(bx + H * 0.3, by - H * 0.36, bx + H * 0.47, by - H * 0.4);
  ctx.fill();
  // o brilho na água das costas da onda
  ctx.strokeStyle = "rgba(255,240,220,0.3)";
  ctx.lineWidth = Math.max(1, H * 0.03);
  ctx.beginPath();
  ctx.moveTo(bx - H * 1.2, by - H * 0.2);
  ctx.quadraticCurveTo(bx - H * 0.6, by - H * 0.55, bx - H * 0.3, by - H * 0.86);
  ctx.stroke();
  // a espuma: os bolos que rolam na crista, com a sombra embaixo para ter volume, e a que cai do lábio
  // os bolos vão juntando em dois caminhos (a sombra e o branco), desenhados de uma vez no fim
  const sombraEspuma = new Path2D();
  const espuma = new Path2D();
  const bolo = (px: number, py: number, r: number) => {
    sombraEspuma.moveTo(px + r * 1.25, py + r * 0.3);
    sombraEspuma.arc(px + r * 0.25, py + r * 0.3, r, 0, Math.PI * 2);
    espuma.moveTo(px + r, py);
    espuma.arc(px, py, r, 0, Math.PI * 2);
  };
  // uma faixa contínua de espuma por baixo dos bolos, para a crista não virar um colar de contas
  ctx.strokeStyle = "rgba(250,244,232,0.95)";
  ctx.lineCap = "round";
  for (let i = 0; i < 10; i++) {
    const [ax, ay] = crista(i / 10);
    const [cx, cy] = crista((i + 1) / 10);
    const a = altura((i + 0.5) / 10);
    ctx.lineWidth = a * 0.2;
    ctx.beginPath();
    ctx.moveTo(ax + a * 0.1, ay + a * 0.06);
    ctx.lineTo(cx + a * 0.1, cy + a * 0.06);
    ctx.stroke();
  }
  for (let i = 0; i <= N * 2; i++) {
    const u = i / (N * 2);
    const [px, py] = crista(u);
    const a = altura(u);
    const rola = Math.sin(t * 5 + i * 1.7);
    const r = a * (0.1 + 0.07 * ((i * 7) % 4) * 0.5) * (0.85 + 0.15 * rola);
    bolo(px + a * 0.1 + ((i * 13) % 5) * a * 0.02, py + a * 0.04 - ((i * 11) % 3) * a * 0.03, r);
  }
  for (let i = 0; i < 9; i++) {
    const u = i / 8;
    const lx = bx - H * 0.25 + u * H * 0.8;
    const ly = by - H * (1.02 - u * u * 0.55);
    bolo(lx + Math.sin(t * 6 + i) * H * 0.02, ly, H * (0.11 - u * 0.04));
  }
  ctx.fillStyle = "rgba(214,196,168,0.9)";
  ctx.fill(sombraEspuma);
  ctx.fillStyle = "rgba(255,252,246,0.95)";
  ctx.fill(espuma);
  // a cortina de espuma caindo do lábio e os borrifos que voam para a frente e para cima da crista
  ctx.fillStyle = "rgba(255,252,246,0.75)";
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const q = (t * 1.8 + i / 6) % 1;
    const r = H * 0.05 * (1 - q * 0.4);
    const px = bx + H * (0.52 - q * 0.08);
    const py = by - H * (0.42 - q * 0.34);
    ctx.moveTo(px + r, py);
    ctx.arc(px, py, r, 0, Math.PI * 2);
  }
  for (let i = 0; i < 30; i++) {
    const u = ((i * 0.379) % 1) * 0.85 + 0.15;
    const q = (t * 1.4 + i * 0.23) % 1;
    const [cx, cy] = crista(u);
    const a = altura(u);
    const r = Math.max(0.6, a * 0.035 * (1 - q));
    const px = cx + a * (0.2 + q * 0.6);
    const py = cy - a * (q * 0.5 - q * q * 0.35);
    ctx.moveTo(px + r, py);
    ctx.arc(px, py, r, 0, Math.PI * 2);
  }
  ctx.fill();
  // um tronco arrancado da margem, rolando na espuma
  if (o.tronco) {
    const [px, py] = crista(0.55);
    const a = altura(0.55);
    ctx.save();
    ctx.translate(px + a * 0.2, py + a * 0.05);
    ctx.rotate(t * 1.2);
    ctx.fillStyle = "#4a3422";
    ctx.fillRect(-a * 0.5, -a * 0.07, a, a * 0.14);
    ctx.fillRect(a * 0.1, -a * 0.07, a * 0.07, -a * 0.28);
    ctx.restore();
  }
  // os surfistas agachados descendo a face, menores lá longe; a prancha segue a linha da onda
  const linha = Math.atan2(o.subida, o.comprimento);
  for (let i = 0; i < o.surfistas; i++) {
    const u = 0.22 + (i / Math.max(1, o.surfistas - 1)) * 0.6;
    const [ax, ay] = crista(u);
    const [fx, fy] = frente(u);
    const desce = 0.5 + Math.sin(t * 1.3 + i * 2) * 0.12;
    const sx = ax + (fx - ax) * desce;
    const sy = ay + (fy - ay) * desce;
    const e = (altura(u) / 54) * 0.75;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(linha - 0.08 + Math.sin(t * 2 + i) * 0.06);
    // a esteira que a prancha risca na água
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = Math.max(0.6, 1.2 * e);
    ctx.beginPath();
    ctx.moveTo(-12 * e, 1.5 * e);
    ctx.quadraticCurveTo(-26 * e, 2 * e, -40 * e, -2 * e);
    ctx.stroke();
    ctx.fillStyle = ["#ffd21a", "#e8333a", "#2a8ae8", "#2fbf5a", "#ffffff"][i % 5]!;
    ctx.beginPath();
    ctx.ellipse(0, 0, 15 * e, 2.2 * e, 0, 0, Math.PI * 2);
    ctx.fill();
    figura(ctx, 1 * e, -1.4 * e, 0.8 * e, "#2a1e1a", { tronco: 0.35, bracoE: -1.7, bracoD: 1.3, pernaE: 0.55, pernaD: -0.45, dobra: 0.35 });
    ctx.restore();
  }
}

/** O Marco Zero: o obelisco com o furo do relógio de sol e a linha do Equador pintada no chão. */
function marcoZero(ctx: Ctx, x: number, base: number, cor: string, ceu: string) {
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(x - 14, base);
  ctx.lineTo(x - 7, base - 150);
  ctx.lineTo(x, base - 160);
  ctx.lineTo(x + 7, base - 150);
  ctx.lineTo(x + 14, base);
  ctx.fill();
  ctx.fillStyle = ceu;
  ctx.beginPath();
  ctx.arc(x, base - 120, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = LINHA;
  ctx.fillRect(x - 150, base - 3, 300, 4);
}

/** Fortaleza de São José: muralha baixa de baluartes pontudos. */
function fortaleza(ctx: Ctx, x: number, base: number, cor: string) {
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.lineTo(x + 20, base - 30);
  ctx.lineTo(x + 50, base - 30);
  ctx.lineTo(x + 70, base - 40);
  ctx.lineTo(x + 90, base - 30);
  ctx.lineTo(x + 170, base - 30);
  ctx.lineTo(x + 190, base - 40);
  ctx.lineTo(x + 210, base - 30);
  ctx.lineTo(x + 240, base - 30);
  ctx.lineTo(x + 260, base);
  ctx.fill();
  for (let i = 30; i < 240; i += 14) ctx.fillRect(x + i, base - 36, 7, 6);
}

/** Prancha de surfe nas costas da maleta. */
function prancha(c: Ctx) {
  c.save();
  c.translate(20, 0);
  c.rotate(0.35);
  c.fillStyle = "#ffd21a";
  c.strokeStyle = "#8a6a0a";
  c.lineWidth = 1;
  c.beginPath();
  c.ellipse(0, 0, 4.5, 24, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.fillStyle = LINHA;
  c.fillRect(-4, -2, 8, 3);
  c.fillStyle = "#2a8ae8";
  c.beginPath();
  c.moveTo(0, 18);
  c.lineTo(3, 24);
  c.lineTo(-3, 24);
  c.fill();
  c.restore();
}

export const AP: Tema = {
  id: "ap",
  nome: "Amapá",
  descricao: "O Marco Zero, onde passa a linha do Equador, a Fortaleza de São José e a pororoca no Amazonas com os surfistas.",
  grupo: "estados",
  amostra: `linear-gradient(180deg, #2f7038 45%, ${LINHA} 45% 55%, #ffd21a 55%)`,
  onda: "sawtooth",
  somBase: 262,
  paleta: {
    ceu: [["#f0a088", "#ffe0bc"], ["#4aa4e4", "#d8f0fc"], ["#5a4a96", "#f4a464"], ["#081234", "#22386c"]],
    longe: FLORESTA,
    perto: FLORESTA,
    chao: "#c8b48a",
    chaoLinha: "#9a8458",
    coluna: { corpo: "#f0efec", sombra: "#c8c4c0", luz: "#ffffff", contorno: "#3a3a44" },
    maleta: { corpo: "#2f7038", escuro: "#123a1a", fivela: "#ffd21a", alca: "#123a1a" },
    asa: { cor: "#ffffff", contorno: LINHA },
    moeda: ["#ffd866", "#c08a1e"],
    particula: [LINHA, "#ffd21a", "#ffffff"],
    recorde: {
      cor: "#e8333a", traco: [1, 4], largura: 4,
      aviso: { texto: "RECORDE NOS DOIS HEMISFÉRIOS!", fonte: "800 22px system-ui, sans-serif", corTexto: "#ffffff", corContorno: "#4a0a0a", corFundo: "rgba(232,51,58,0.92)", anima: "pulsa" },
    },
    hud: "#1a1a24",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // a pororoca grande atravessando o rio de viés, com a fila de surfistas descendo o paredão da onda
    pororoca(
      ctx,
      { x: atravessa(w, f, 300), y: h - 134, comprimento: 640, subida: 56, alto: 70, baixo: 10, agua: "#c49a6e", sombra: "#8a6440", surfistas: 5, tronco: true },
      t,
    );
  },
  decor(ctx, w, h, off, tod, t, tema, surpresa) {
    const noite = noiteDe(tod);
    if (noite > 0.5) lua(ctx, w * 0.5, h * 0.12, 22);
    else sol(ctx, w * 0.5, h * 0.1, 28, "#fff6dc", "rgba(255,240,190,0.55)");
    // a floresta do outro lado do rio, bem longe
    colinas(ctx, w, h - 200, off * 0.03, ciclo(FLORESTA, tod), 16, 6, 0.02, 1);
    // o rio largo e barrento, com a pororoca chegando e os surfistas na onda
    const yRio = h - 200;
    mar(ctx, w, yRio, 90, off * 0.08, ciclo(RIO, tod), "rgba(255,240,220,0.35)", t);
    // a pororoca de todo dia, pequena e lá longe; na surpresa, vem a grande e ela não aparece
    if (!surpresa) {
      const xOnda = ((t * 40) % (w + 400)) - 200;
      pororoca(ctx, { x: xOnda, y: yRio + 46, comprimento: 400, subida: 30, alto: 24, baixo: 5, agua: ciclo(ONDA, tod), sombra: ciclo(ONDA_SOMBRA, tod), surfistas: 3 }, t);
    }
    // a surpresa: a pororoca vem pelo rio, atrás da margem de Macapá
    surpresa?.();
    // a margem de Macapá: a fortaleza e o Marco Zero
    ctx.fillStyle = ciclo(["#6a8a4a", "#5f9046", "#566a4a", "#101c10"], tod);
    ctx.fillRect(0, yRio + 86, w, h - yRio - 86);
    repetir(w, off * 0.16, 1100, (x) => fortaleza(ctx, x + 100, yRio + 90, ciclo(FORTE, tod)));
    const ceu = ciclo(tema.paleta.ceu.map((c) => c[1]), tod);
    repetir(w, off * 0.26, 900, (x) => marcoZero(ctx, x + 600, h - 46, ciclo(MARCO, tod), ceu));
    colinas(ctx, w, h - 40, off * 0.36, ciclo(["#4a7a3a", "#3f8040", "#3e503c", "#0c180e"], tod), 10, 4, 0.03, 2);
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#b49e7e", "#2e2a22"], tod);
    ctx.fillRect(0, y, w, h - y);
    // a linha do Equador atravessa o chão de tempos em tempos, com N e S
    for (let x = -(off % 600); x < w; x += 600) {
      ctx.fillStyle = LINHA;
      ctx.fillRect(x + 300, y, 6, h - y);
      ctx.fillStyle = "#3a3a44";
      ctx.font = "700 11px system-ui, sans-serif";
      ctx.fillText("N", x + 286, y + 24);
      ctx.fillText("S", x + 312, y + 24);
    }
    ctx.fillStyle = p.chaoLinha;
    ctx.fillRect(0, y, w, 2);
  },
  coluna(ctx, w, len, variante, quebrada, tema) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // concreto branco do obelisco, com a linha do Equador atravessando
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, c.luz);
    g.addColorStop(0.5, c.corpo);
    g.addColorStop(1, c.sombra);
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, len);
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    for (let y = 40; y < len; y += 40) ctx.fillRect(x0, y, w, 1.4);
    const yLinha = 70 + ((variante * 37) % 60);
    if (yLinha + 10 < len) {
      ctx.fillStyle = LINHA;
      ctx.fillRect(x0, yLinha, w, 10);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x0, yLinha + 4, w, 2);
    }
    // o furo do relógio de sol
    if (len > 150) {
      ctx.fillStyle = "#3a3a44";
      ctx.beginPath();
      ctx.arc(0, yLinha + 50, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    if (quebrada) {
      ctx.fillStyle = c.corpo;
      ctx.beginPath();
      ctx.moveTo(x0, 12);
      ctx.lineTo(x0 + w * 0.3, 2);
      ctx.lineTo(x0 + w * 0.55, 9);
      ctx.lineTo(x0 + w * 0.8, 0);
      ctx.lineTo(x0 + w, 8);
      ctx.lineTo(x0 + w, 14);
      ctx.lineTo(x0, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    // a ponta: placa de bronze com as marcas da latitude
    ctx.fillStyle = "#b8863a";
    ctx.fillRect(x0 - 4, 0, w + 8, 11);
    ctx.strokeStyle = "#5a3a10";
    ctx.strokeRect(x0 - 4, 0, w + 8, 11);
    ctx.fillStyle = "#5a3a10";
    for (let x = x0 + 2; x < x0 + w; x += 8) ctx.fillRect(x, 3, 1.4, 5);
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, prancha);
  },
};
