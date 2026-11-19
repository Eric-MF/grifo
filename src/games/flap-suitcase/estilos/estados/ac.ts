// Acre: o Palácio Rio Branco, a beira do rio Acre, o seringal e as colunas em tronco de seringueira, com os cortes em
// espiral, o látex pingando na tigelinha e as raízes no chão; na maleta, a poronga, a lamparina de cabeça do seringueiro.
// O fundo anda: as castanheiras acima da mata, as araras, o macaco-prego nos cipós, o canoeiro remando, as borboletas
// azuis de dia e, à noite, as porongas dos seringueiros e os vaga-lumes no seringal. A surpresa é um dinossauro
// (o Acre é terra de fósseis): um saurópode que atravessa o rio Acre, com a água pelos joelhos.
import { ciclo, colinas, maletaPadrao, variar, type Ctx, type Tema } from "../../themes";
import { atravessa, lua, mar, noiteDe, repetir, sol, surge } from "../kit";

const TAU = Math.PI * 2;
const mod = (a: number, n: number) => ((a % n) + n) % n;
// as cores do dinossauro por hora do dia; a surpresa não recebe a hora, então o cenário guarda a dela (desenhado antes)
const DINO_PELE = ["#6a8a6a", "#5a8a6a", "#5a6a6a", "#22322e"];
const DINO_ESCURA = ["#4a6a50", "#3e6a50", "#3e4a50", "#141e1c"];
const DINO_BARRIGA = ["#b8c898", "#a8c890", "#98a088", "#3a4636"];
const DINO_PINTA = ["#8aa880", "#7aa880", "#6a8078", "#2a3a32"];
let horaDoCenario = 1;

// cores por hora do dia (amanhecer, dia, entardecer, noite)
const FLORESTA = ["#3a6a3a", "#2f7038", "#384a3a", "#0a160e"];
const FLORESTA_LONGE = ["#6a8a74", "#5f9074", "#5a6272", "#14202a"];
const RIO = ["#9a7a5a", "#a8825a", "#8a6a5a", "#241c18"];
const PALACIO = ["#f2ece2", "#fbf8f0", "#e8dcd4", "#5a5a6e"];
const PALACIO_SOMBRA = ["#d0c4b4", "#d8ccbc", "#c4b0ac", "#3a3a4e"];

/** Palácio Rio Branco: o corpo neoclássico com colunas, o frontão e a escadaria. */
function palacio(ctx: Ctx, x: number, base: number, cor: string, sombra: string, acesas: number) {
  ctx.fillStyle = cor;
  ctx.fillRect(x, base - 64, 200, 64);
  ctx.fillRect(x + 60, base - 86, 80, 22);
  ctx.beginPath();
  ctx.moveTo(x + 54, base - 86);
  ctx.lineTo(x + 100, base - 108);
  ctx.lineTo(x + 146, base - 86);
  ctx.fill();
  ctx.fillRect(x - 4, base - 68, 208, 5);
  ctx.fillStyle = sombra;
  for (let i = 0; i < 6; i++) ctx.fillRect(x + 66 + i * 13, base - 62, 5, 48);
  for (let i = 0; i < 4; i++) {
    for (const lado of [x + 8, x + 148]) {
      ctx.fillStyle = acesas > 0.3 ? "#ffe2a0" : sombra;
      ctx.fillRect(lado + (i % 2) * 22, base - 56 + Math.floor(i / 2) * 24, 12, 16);
    }
  }
  ctx.fillStyle = sombra;
  for (let i = 0; i < 4; i++) ctx.fillRect(x + 60 - i * 6, base - 12 + i * 3, 80 + i * 12, 2);
}

/** Seringueira: tronco reto com os cortes em diagonal, a tigelinha e a copa. */
function seringueira(ctx: Ctx, x: number, base: number, s: number, tronco: string, copa: string) {
  ctx.fillStyle = tronco;
  ctx.fillRect(x - 4 * s, base - 70 * s, 8 * s, 70 * s);
  ctx.strokeStyle = "#f2ece0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    ctx.moveTo(x - 4 * s, base - (20 + i * 6) * s);
    ctx.lineTo(x + 4 * s, base - (24 + i * 6) * s);
  }
  ctx.stroke();
  ctx.fillStyle = "#f2ece0";
  ctx.fillRect(x + 3 * s, base - 22 * s, 4 * s, 3 * s);
  ctx.fillStyle = copa;
  for (const [dx, dy, r] of [[-14, -74, 14], [0, -86, 17], [14, -74, 14], [-6, -64, 11], [8, -64, 11]]) {
    ctx.beginPath();
    ctx.arc(x + dx * s, base + dy * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Poronga: a lamparina de cabeça do seringueiro, com a chama. */
function poronga(c: Ctx, t: number) {
  c.save();
  c.translate(-8, -22);
  c.rotate(-0.1);
  c.fillStyle = "#4a3a2a";
  c.beginPath();
  c.ellipse(0, 3, 12, 2.6, 0, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.moveTo(-7, 3);
  c.quadraticCurveTo(-7, -7, 0, -7);
  c.quadraticCurveTo(7, -7, 7, 3);
  c.fill();
  // a lamparina na frente
  c.fillStyle = "#c8c8d0";
  c.strokeStyle = "#5a5a64";
  c.lineWidth = 0.8;
  c.beginPath();
  c.moveTo(-3, -6);
  c.lineTo(3, -6);
  c.lineTo(4, -14);
  c.lineTo(-4, -14);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = "rgba(255,200,90,0.35)";
  c.beginPath();
  c.arc(0, -18, 6, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#ffb82a";
  c.beginPath();
  c.ellipse(Math.sin(t * 14) * 0.5, -17, 1.6, 3, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

/** Castanheira: o tronco reto e altíssimo, acima da mata, com a copa larga em guarda-chuva. */
function castanheira(ctx: Ctx, x: number, base: number, alt: number, cor: string, t: number, k: number) {
  const balanca = Math.sin(t * 0.6 + k) * 2;
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(x - 4, base);
  ctx.lineTo(x - 2.5 + balanca * 0.3, base - alt);
  ctx.lineTo(x + 2.5 + balanca * 0.3, base - alt);
  ctx.lineTo(x + 4, base);
  ctx.closePath();
  for (const [dx, dy, rx, ry] of [[-26, -4, 26, 10], [22, -6, 28, 11], [-4, -14, 30, 12], [10, 2, 22, 8]]) {
    ctx.moveTo(x + balanca + dx + rx, base - alt + dy);
    ctx.ellipse(x + balanca + dx, base - alt + dy, rx, ry, 0, 0, TAU);
  }
  ctx.fill();
}

/** Arara voando: o corpo e a cauda comprida, as asas batendo; vermelha com o azul e o amarelo nas asas. */
function arara(ctx: Ctx, x: number, y: number, s: number, t: number, k: number) {
  const bate = Math.sin(t * 9 + k * 1.7);
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 1.3 + k) * 4);
  ctx.scale(s, s);
  // a cauda
  ctx.fillStyle = "#d8302a";
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.lineTo(-30, 4 + bate * 1.5);
  ctx.lineTo(-28, 8 + bate * 1.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#2a6ad8";
  ctx.beginPath();
  ctx.moveTo(-8, 2);
  ctx.lineTo(-24, 8 + bate * 1.5);
  ctx.lineTo(-22, 10 + bate * 1.5);
  ctx.closePath();
  ctx.fill();
  // as asas: a de trás e a da frente
  for (const [lado, cor] of [[-1, "#1a4aa8"], [1, "#2a6ad8"]] as const) {
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.moveTo(-2, -1);
    ctx.quadraticCurveTo(-4, -12 * bate * lado - 2, -14, -16 * bate * lado);
    ctx.quadraticCurveTo(-6, -4 * bate * lado, 4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f2c83a";
    ctx.beginPath();
    ctx.ellipse(-4, -4 * bate * lado, 3, 1.6, 0.4, 0, TAU);
    ctx.fill();
  }
  // o corpo e a cabeça com o bico
  ctx.fillStyle = "#e8402a";
  ctx.beginPath();
  ctx.ellipse(0, 0, 9, 4, -0.1, 0, TAU);
  ctx.arc(9, -2, 3.6, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#f4ecdc";
  ctx.beginPath();
  ctx.arc(9.6, -2.4, 1.4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#2a2018";
  ctx.beginPath();
  ctx.moveTo(12, -3);
  ctx.quadraticCurveTo(16, -2, 13, 1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** O macaco-prego pendurado no cipó preso no galho em (ancora, topo), balançando. */
function macacoNoCipo(ctx: Ctx, ancora: number, topo: number, t: number) {
  const ang = Math.sin(t * 1.6) * 0.7;
  const comp = 54;
  const x = ancora + Math.sin(ang) * comp;
  const y = topo + Math.cos(ang) * comp;
  ctx.strokeStyle = "#3a5a2a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ancora, topo);
  ctx.quadraticCurveTo(ancora + Math.sin(ang) * comp * 0.5 + 6, topo + Math.cos(ang) * comp * 0.55, x, y);
  ctx.stroke();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-ang * 0.6);
  ctx.fillStyle = "#5a3a22";
  ctx.strokeStyle = "#5a3a22";
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-2, 4);
  ctx.lineTo(0, 0);
  ctx.moveTo(2, 4);
  ctx.lineTo(1, 0);
  ctx.moveTo(-3, 16);
  ctx.quadraticCurveTo(-16, 22 + Math.sin(t * 3) * 3, -12, 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 12, 5, 7.5, 0, 0, TAU);
  ctx.moveTo(5.5, 4);
  ctx.arc(1, 4, 4.6, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#d8b088";
  ctx.beginPath();
  ctx.ellipse(2, 5, 2.8, 2.4, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** A canoa com o canoeiro remando: o corpo inclina, o remo entra na água e a esteira fica para trás. */
function canoa(ctx: Ctx, x: number, y: number, t: number, k: number, cor: string) {
  const remada = t * 2.4 + k;
  const r = Math.sin(remada);
  // a esteira na água, abrindo para trás
  ctx.strokeStyle = "rgba(255,240,220,0.45)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const f = mod(t * 0.6 + i / 3, 1);
    ctx.moveTo(x - 22 - f * 40, y + 1 + f * 4);
    ctx.lineTo(x - 30 - f * 40, y + 1 + f * 4);
    ctx.moveTo(x - 22 - f * 40, y + 1 - f * 2);
    ctx.lineTo(x - 30 - f * 40, y + 1 - f * 2);
  }
  ctx.stroke();
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(x - 24, y - 4);
  ctx.quadraticCurveTo(x, y + 5, x + 24, y - 4);
  ctx.lineTo(x + 20, y - 1);
  ctx.quadraticCurveTo(x, y + 2, x - 20, y - 1);
  ctx.fill();
  // o canoeiro, inclinando a cada remada
  ctx.save();
  ctx.translate(x - 2, y - 4);
  ctx.rotate(r * 0.12);
  ctx.fillRect(-2, -12, 4, 12);
  ctx.beginPath();
  ctx.arc(0, -14, 3, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#e8c87a";
  ctx.beginPath();
  ctx.ellipse(0, -16.5, 5, 1.4, 0, 0, TAU);
  ctx.fill();
  // o remo
  ctx.strokeStyle = cor;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(2 + r * 4, -10);
  ctx.lineTo(-6 + r * 10, 8);
  ctx.stroke();
  ctx.restore();
  // a água espirrando quando o remo sai
  if (r > 0.6) {
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath();
    ctx.arc(x + 4 + r * 4, y + 2, 1.4, 0, TAU);
    ctx.arc(x + 8 + r * 4, y, 1, 0, TAU);
    ctx.fill();
  }
}

/**
 * O dinossauro da surpresa: um saurópode atravessando o rio, de pescoço comprido, virado para a direita. As quatro
 * patas andam em pares cruzados (as de trás mais escuras), o corpo sobe e desce a cada passo, a cauda ondula, o pescoço
 * balança e a cabeça mastiga e pisca. `passo` é a fase da caminhada; `agua` é a linha da água, em coordenadas locais.
 */
function sauropode(ctx: Ctx, passo: number, t: number, agua: number, tod: number) {
  const pele = ciclo(DINO_PELE, tod);
  const escura = ciclo(DINO_ESCURA, tod);
  const barriga = ciclo(DINO_BARRIGA, tod);
  const pinta = ciclo(DINO_PINTA, tod);
  const sobe = Math.abs(Math.sin(passo)) * 2.5;
  const perna = (hx: number, fase: number, cor: string, frente: boolean) => {
    const a = Math.sin(passo + fase) * 0.32;
    ctx.save();
    ctx.translate(hx, -6 - sobe);
    ctx.rotate(a);
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.moveTo(-9, 0);
    ctx.quadraticCurveTo(-11, 22, -8, 44);
    ctx.lineTo(9, 44);
    ctx.quadraticCurveTo(11, 22, 9, 0);
    ctx.closePath();
    ctx.fill();
    // as unhas no pé
    ctx.fillStyle = frente ? "#e8e0c8" : "#c8c0a8";
    for (const ux of [-6, 0, 6]) ctx.fillRect(ux - 1.6, 42, 3.2, 3);
    ctx.restore();
  };
  // as patas de trás (do outro lado do corpo), mais escuras
  perna(-36, Math.PI, escura, false);
  perna(34, 0, escura, false);
  // a cauda, ondulando
  const onda = Math.sin(t * 2.2);
  ctx.fillStyle = pele;
  ctx.beginPath();
  ctx.moveTo(-50, -34 - sobe);
  ctx.bezierCurveTo(-110, -40 + onda * 6, -160, -10 + onda * 14, -200, -4 + onda * 22);
  ctx.bezierCurveTo(-160, -2 + onda * 14, -110, -12 + onda * 6, -52, -6 - sobe);
  ctx.closePath();
  ctx.fill();
  // o pescoço: sobe da frente do corpo até a cabeça, que balança
  const hx = 118 + Math.sin(t * 0.9) * 8;
  const hy = -170 + Math.sin(t * 1.4) * 6 - sobe;
  ctx.beginPath();
  ctx.moveTo(40, -44 - sobe);
  ctx.bezierCurveTo(70, -70, hx - 30, hy + 10, hx - 6, hy - 6);
  ctx.lineTo(hx + 4, hy + 8);
  ctx.bezierCurveTo(hx - 18, hy + 30, 88, -40, 56, -14 - sobe);
  ctx.closePath();
  ctx.fill();
  // o corpo, com a barriga clara e as pintas nas costas
  ctx.beginPath();
  ctx.ellipse(0, -28 - sobe, 66, 32, -0.04, 0, TAU);
  ctx.fill();
  ctx.fillStyle = barriga;
  ctx.beginPath();
  ctx.ellipse(4, -12 - sobe, 50, 12, -0.04, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = pinta;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const px = -40 + i * 16;
    const py = -50 - sobe + Math.abs(i - 2.5) * 3;
    ctx.moveTo(px + 5, py);
    ctx.ellipse(px, py, 5, 3, 0, 0, TAU);
  }
  for (let i = 0; i < 4; i++) {
    const f = (i + 1) / 5;
    const px = 40 + (hx - 40) * f * 0.9;
    const py = -50 + (hy + 4 + 50) * f;
    ctx.moveTo(px + 3, py);
    ctx.ellipse(px, py, 3, 2, 0, 0, TAU);
  }
  ctx.fill();
  // a cabeça: o focinho, a boca que mastiga, o olho que pisca
  const mastiga = Math.max(0, Math.sin(t * 7)) * 2;
  ctx.fillStyle = pele;
  ctx.beginPath();
  ctx.ellipse(hx + 6, hy, 16, 10, 0.15, 0, TAU);
  ctx.moveTo(hx + 30, hy + 4 + mastiga);
  ctx.ellipse(hx + 18, hy + 4 + mastiga, 12, 5, 0.2, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = escura;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(hx + 12, hy + 4);
  ctx.quadraticCurveTo(hx + 22, hy + 7 + mastiga, hx + 29, hy + 3 + mastiga);
  ctx.stroke();
  const pisca = mod(t, 3.4) < 0.14;
  ctx.fillStyle = "#1a2418";
  ctx.beginPath();
  if (pisca) ctx.rect(hx + 4, hy - 4, 6, 1.4);
  else ctx.arc(hx + 7, hy - 3.5, 2.4, 0, TAU);
  ctx.fill();
  if (!pisca) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(hx + 7.4, hy - 5, 1, 1);
  }
  ctx.fillStyle = escura;
  ctx.beginPath();
  ctx.arc(hx + 24, hy - 1, 1.2, 0, TAU);
  ctx.fill();
  // as patas da frente (deste lado), por cima do corpo
  perna(-26, 0, pele, true);
  perna(44, Math.PI, pele, true);
  // a água por cima das patas: o rio pelos joelhos, com os anéis de cada passo
  ctx.fillStyle = "rgba(150,118,84,0.55)";
  ctx.fillRect(-90, agua, 200, 40);
  ctx.strokeStyle = "rgba(255,240,220,0.6)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (const [px, fase] of [[-36, Math.PI], [34, 0], [-26, 0], [44, Math.PI]] as const) {
    const f = mod((passo + fase) / TAU, 1);
    const r = 6 + f * 22;
    ctx.moveTo(px + r, agua + 2);
    ctx.ellipse(px, agua + 2, r, r * 0.22, 0, 0, TAU);
  }
  ctx.globalAlpha = 0.8;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** As raízes da seringueira na linha do chão `y`: a base do tronco alarga e as raízes se esparramam para os lados. */
function raizes(ctx: Ctx, x0: number, w: number, y: number, c: { corpo: string; sombra: string; luz: string; contorno: string }) {
  if (y < 30) return;
  const g = ctx.createLinearGradient(x0 - 22, 0, x0 + w + 22, 0);
  g.addColorStop(0, c.luz);
  g.addColorStop(0.5, c.corpo);
  g.addColorStop(1, c.sombra);
  ctx.fillStyle = g;
  ctx.strokeStyle = c.contorno;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x0, y - 26);
  ctx.quadraticCurveTo(x0 - 2, y - 6, x0 - 24, y + 2);
  ctx.lineTo(x0 - 30, y + 6);
  ctx.quadraticCurveTo(x0 - 10, y + 4, x0 + 10, y + 3);
  ctx.quadraticCurveTo(x0 + w / 2, y + 8, x0 + w - 10, y + 3);
  ctx.quadraticCurveTo(x0 + w + 10, y + 4, x0 + w + 30, y + 6);
  ctx.lineTo(x0 + w + 24, y + 2);
  ctx.quadraticCurveTo(x0 + w + 2, y - 6, x0 + w, y - 26);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // as raízes do meio, mais finas
  ctx.strokeStyle = c.sombra;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0 + w * 0.3, y - 4);
  ctx.quadraticCurveTo(x0 + w * 0.25, y + 1, x0 + w * 0.12, y + 4);
  ctx.moveTo(x0 + w * 0.7, y - 4);
  ctx.quadraticCurveTo(x0 + w * 0.76, y + 1, x0 + w * 0.88, y + 4);
  ctx.stroke();
}

export const AC: Tema = {
  id: "ac",
  nome: "Acre",
  descricao: "O Palácio Rio Branco, o rio Acre e o seringal, com as colunas em tronco de seringueira e a tigelinha de látex.",
  grupo: "estados",
  amostra: "linear-gradient(135deg, #ffd21a 50%, #2f7038 50%)",
  onda: "sine",
  somBase: 311,
  paleta: {
    ceu: [["#e8a8a0", "#fde2cc"], ["#5aa8e0", "#dcf0fa"], ["#5a5a98", "#f0a878"], ["#0a1434", "#24386a"]],
    longe: FLORESTA_LONGE,
    perto: FLORESTA,
    chao: "#8a6a4a",
    chaoLinha: "#5a3e24",
    coluna: { corpo: "#8a7a62", sombra: "#665a48", luz: "#aa9a80", contorno: "#2e2618" },
    maleta: { corpo: "#2f7038", escuro: "#123a1a", fivela: "#ffd21a", alca: "#123a1a" },
    asa: { cor: "#ffffff", contorno: "#2f7038" },
    moeda: ["#ffd866", "#c08a1e"],
    particula: ["#ffd21a", "#2f7038", "#ffffff"],
    recorde: {
      cor: "#d8c21a", traco: [8, 2, 8, 6], largura: 3.5,
      aviso: { texto: "NOVO RECORDE!", fonte: "800 28px system-ui, sans-serif", corTexto: "#ffd21a", corContorno: "#0a2a10", corFundo: "rgba(47,112,56,0.92)", anima: "pulsa" },
    },
    hud: "#0e2414",
    estrelas: "#ffffff",
  },
  surpresa(ctx, w, h, f, t) {
    // o dinossauro atravessa o rio Acre, devagar, com a água pelos joelhos; as aves fogem da copa quando ele passa
    const x = atravessa(w, f, 260);
    const base = h - 114;
    ctx.save();
    ctx.globalAlpha = surge(f);
    ctx.translate(x, base - 44);
    sauropode(ctx, x / 26, t, 30, horaDoCenario);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = surge(f);
    ctx.fillStyle = "#2a2a2a";
    for (let i = 0; i < 5; i++) {
      const p = mod(t * 0.5 + i / 5, 1);
      const bx = x + 140 + i * 22 + p * 160;
      const by = base - 220 - p * 150 + Math.sin(t * 3 + i) * 6;
      const bate = Math.sin(t * 14 + i) * 3;
      ctx.globalAlpha = surge(f) * (1 - p);
      ctx.beginPath();
      ctx.moveTo(bx - 6, by - bate);
      ctx.quadraticCurveTo(bx - 3, by - 3, bx, by);
      ctx.quadraticCurveTo(bx + 3, by - 3, bx + 6, by - bate);
      ctx.lineTo(bx, by + 1.5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  },
  decor(ctx, w, h, off, tod, t, tema, surpresa) {
    const p = tema.paleta;
    const noite = noiteDe(tod);
    horaDoCenario = tod;
    if (noite > 0.5) lua(ctx, w * 0.2, h * 0.14, 20);
    else sol(ctx, w * 0.2, h * 0.15, 24, "#fff4d6", "rgba(255,236,180,0.45)");
    // as araras cruzando o céu, em par
    for (let i = 0; i < 3; i++) {
      const x = mod(i * 410 + t * (34 + i * 6) - off * 0.06, w + 300) - 150;
      arara(ctx, x, 90 + i * 34, 0.9 - i * 0.12, t, i);
      arara(ctx, x - 34, 104 + i * 34, 0.85 - i * 0.12, t + 0.4, i + 5);
    }
    colinas(ctx, w, h - 40, off * 0.04, ciclo(p.longe, tod), 180, 16, 0.01, 1);
    // a mata, com as castanheiras acima da copa; tudo balança devagar
    const floresta = ciclo(p.perto, tod);
    const oMata = off * 0.08;
    repetir(w, oMata, 380, (x, k) => {
      if (variar(k, 3, 3) !== 0) castanheira(ctx, x + variar(k, 7, 200), h - 190, 70 + variar(k, 11, 3) * 14, floresta, t, k);
    });
    ctx.fillStyle = floresta;
    ctx.beginPath();
    repetir(w, oMata, 46, (x, k) => {
      const r = 24 + variar(k, 13, 3) * 4;
      const cy = h - 196 - variar(k, 7, 4) * 6 + Math.sin(t * 0.7 + k * 0.9) * 1.5;
      ctx.moveTo(x + 23 + r, cy);
      ctx.arc(x + 23, cy, r, 0, TAU);
    });
    ctx.rect(0, h - 196, w, 60);
    ctx.fill();
    // o macaco-prego balançando no cipó de uma castanheira
    repetir(w, oMata, 1700, (x, k) => {
      const alt = 96;
      castanheira(ctx, x + 900, h - 190, alt, floresta, t, k + 50);
      macacoNoCipo(ctx, x + 920, h - 190 - alt + 6, t);
    });
    repetir(w, off * 0.12, 1200, (x) => palacio(ctx, x + 500, h - 150, ciclo(PALACIO, tod), ciclo(PALACIO_SOMBRA, tod), noite));
    // o rio, com o brilho na água e as folhas boiando
    mar(ctx, w, h - 150, 40, off * 0.16, ciclo(RIO, tod), "rgba(255,240,220,0.35)", t);
    ctx.fillStyle = "#6a8a3a";
    repetir(w, off * 0.16 + t * 6, 170, (x, k) => {
      if (variar(k, 17, 3) !== 0) return;
      ctx.beginPath();
      ctx.ellipse(x + variar(k, 19, 80), h - 138 + variar(k, 23, 4) * 6 + Math.sin(t * 1.5 + k) * 1, 4, 1.6, k, 0, TAU);
      ctx.fill();
    });
    // as canoas, com o canoeiro remando
    repetir(w, off * 0.18 + t * 10, 460, (x, k) => canoa(ctx, x + variar(k, 37, 150), h - 128, t, k, noite > 0.5 ? "#1c140e" : "#4a3020"));
    // o dinossauro da surpresa atravessa o rio, atrás do seringal
    surpresa?.();
    // o seringal, na beira de cá
    const oSeringal = off * 0.3;
    colinas(ctx, w, h - 40, oSeringal, ciclo(["#4a7a3a", "#3f8040", "#3e503c", "#0c180e"], tod), 50, 8, 0.012, 2);
    const tronco = ciclo(["#6a5a44", "#6e5e46", "#5a4c42", "#16120e"], tod);
    const oArvores = off * 0.38;
    repetir(w, oArvores, 90, (x, k) => {
      if (variar(k, 5, 4) === 0) return;
      seringueira(ctx, x + variar(k, 29, 30), h - 44, 1.3 + variar(k, 7, 3) * 0.15, tronco, floresta);
    });
    if (noite > 0.3) {
      // à noite: as porongas dos seringueiros andando entre as árvores, e os vaga-lumes
      repetir(w, oArvores + t * 14, 520, (x, k) => {
        const px = x + variar(k, 41, 200);
        const py = h - 74 + Math.abs(Math.sin(t * 3 + k)) * -2;
        const g = ctx.createRadialGradient(px, py, 0, px, py, 26);
        g.addColorStop(0, `rgba(255,210,110,${0.55 * noite})`);
        g.addColorStop(1, "rgba(255,210,110,0)");
        ctx.fillStyle = g;
        ctx.fillRect(px - 26, py - 26, 52, 52);
        ctx.fillStyle = "#ffe8a0";
        ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
      });
      ctx.fillStyle = "#e8ff8a";
      for (let i = 0; i < 16; i++) {
        const x = mod(i * 97 + Math.sin(t * 0.6 + i) * 30 - oArvores, w);
        const y = h - 60 - (i % 5) * 18 + Math.sin(t * 1.1 + i * 2) * 10;
        ctx.globalAlpha = noite * Math.max(0, Math.sin(t * 2.6 + i * 1.9));
        ctx.fillRect(x, y, 2.4, 2.4);
      }
      ctx.globalAlpha = 1;
    } else {
      // de dia, as borboletas azuis (morfo) entre as seringueiras
      for (let i = 0; i < 4; i++) {
        const x = mod(i * 271 + t * (16 + i * 4) - oArvores, w + 60) - 30;
        const y = h - 70 - Math.abs(Math.sin(t * 0.8 + i * 2)) * 40;
        const bate = Math.abs(Math.sin(t * 11 + i));
        ctx.fillStyle = "#3a8ae8";
        ctx.beginPath();
        for (const l of [-1, 1]) {
          ctx.moveTo(x, y);
          ctx.ellipse(x + l * 4 * bate, y - 2, 4 * bate + 0.5, 4.4, l * 0.5, 0, TAU);
        }
        ctx.fill();
      }
    }
  },
  chao(ctx, w, h, y, off, tema, tod) {
    const p = tema.paleta;
    ctx.fillStyle = ciclo([p.chao, p.chao, "#7a5c42", "#221a12"], tod);
    ctx.fillRect(0, y, w, h - y);
    ctx.fillStyle = "#3f7a3a";
    ctx.fillRect(0, y, w, 4);
    // folhas caídas no chão da mata
    for (let x = -(off % 27); x < w; x += 27) {
      const k = Math.round((x + off) / 27);
      ctx.fillStyle = variar(k, 3, 2) ? "#6a8a3a" : "#a8843a";
      ctx.beginPath();
      ctx.ellipse(x + 10, y + 12 + variar(k, 7, 18), 4, 1.8, k, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  coluna(ctx, w, len, variante, quebrada, tema, t) {
    const c = tema.paleta.coluna;
    const x0 = -w / 2;
    // tronco de seringueira: casca lisa acinzentada, os cortes em espiral e as tigelinhas
    const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
    g.addColorStop(0, c.luz);
    g.addColorStop(0.5, c.corpo);
    g.addColorStop(1, c.sombra);
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, w, len);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, 0, w, len);
    ctx.clip();
    ctx.strokeStyle = "#f2ece0";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let y = 30 + variante * 20; y < len + 30; y += 26) {
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + w, y - 22);
    }
    ctx.stroke();
    // o látex escorrendo até a tigelinha (desvirada na coluna de cima)
    const deCima = ctx.getTransform().d < 0;
    for (let y = 90 + variante * 40; y < len - 20; y += 160) {
      ctx.save();
      ctx.translate(x0 + w - 16, y);
      if (deCima) ctx.scale(1, -1);
      ctx.fillStyle = "#f8f4ea";
      ctx.fillRect(-1, -16, 2.4, 14);
      // a gota de látex caindo na tigelinha
      const gota = mod(t * 0.7 + variante * 0.37 + y * 0.01, 1);
      if (gota < 0.8) {
        ctx.beginPath();
        ctx.ellipse(0.2, -2 + (gota / 0.8) * 7, 1.4, 2, 0, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = "#c8c0b0";
      ctx.beginPath();
      ctx.moveTo(-8, -2);
      ctx.lineTo(8, -2);
      ctx.quadraticCurveTo(7, 8, 0, 8);
      ctx.quadraticCurveTo(-7, 8, -8, -2);
      ctx.fill();
      ctx.fillStyle = "#fbf8f0";
      ctx.beginPath();
      ctx.ellipse(0, -2, 7, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    ctx.strokeStyle = c.contorno;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, 0, w, len);
    // a coluna de baixo é uma árvore plantada: as raízes se abrem na linha do chão (que fica a 40 do pé da tela) e
    // entram na terra; a de cima, espelhada, não tem chão
    if (ctx.getTransform().d > 0) raizes(ctx, x0, w, len - 40, c);
    if (quebrada) {
      ctx.fillStyle = "#d8c49a";
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
    // o corte do tronco com os anéis
    ctx.fillStyle = "#d8c49a";
    ctx.fillRect(x0 - 3, 0, w + 6, 10);
    ctx.strokeRect(x0 - 3, 0, w + 6, 10);
    ctx.strokeStyle = "rgba(90,70,40,0.45)";
    ctx.beginPath();
    for (let i = 1; i < 4; i++) {
      ctx.moveTo(x0 + i * 6, 5);
      ctx.lineTo(x0 + w - i * 6, 5);
    }
    ctx.stroke();
  },
  maleta(ctx, fase, t, tema) {
    maletaPadrao(ctx, fase, t, tema, (c) => poronga(c, t));
  },
};
