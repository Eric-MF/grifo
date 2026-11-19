// Os "momentos" do Visual das melhorias (textos e tempos em momentos-textos.ts): o que aparece na tela no instante que
// marca cada poder. O grito do Voo do Grifo vira ondas saindo do bico; cada batida das asas de cera solta uma rajada e
// gotas de cera; a fênix que ganha a vida sobe numa coluna de fogo… O nível 1 é o momento básico, o 3 acrescenta um
// elemento (carimbo, onomatopeia, o objeto do poder) e o 5 traz a aparição do dono do poder, grande e translúcido (nos
// poderes dos orbes, o emblema com o ícone). A aparição só vem no primeiro momento depois de usar o poder, para não
// cobrir a tela nos que se repetem (cada coluna, cada moeda, cada batida).
//
// Cada momento é desenhado com a origem na âncora: o personagem, o vão da coluna ou a moeda. A camada "atras" vai antes
// do personagem (a aparição); a "frente", depois das partículas. O motor (engine.ts) cria e anima; a prévia do menu
// (index.ts) desenha o mesmo, em ciclo.
//
// Além dos momentos, alguns poderes mostram o que fazem enquanto duram (desenharMecanica): o caminho que a guia das Asas
// de Ouro e do Voo do Grifo vai seguir até os próximos vãos, as linhas do ímã até as moedas puxadas, a lupa do
// Inquérito vigiando onde as moedas surgem e a geada nas colunas paradas do Trânsito em Julgado.

import { desenharMotivo, type Forma, type Motivo } from "./motivos";
import { TEXTOS_MOMENTO } from "./momentos-textos";
import { desenharPersonagem } from "./personagens";
import type { IdPoder } from "./powers";
import type { Ctx, Tema } from "./themes";

export interface Momento {
  id: IdPoder;
  x: number;
  y: number;
  /** segundos desde que começou */
  idade: number;
  /** nível do Visual do poder */
  nivel: number;
  /** o primeiro momento desde que o poder foi usado: só ele traz a aparição do nível 5 (e os carimbos únicos) */
  principal: boolean;
  /** meia abertura do vão, nos momentos de coluna */
  ab?: number;
  /** do personagem até o alvo (o raio do Chifre) */
  dx?: number;
  dy?: number;
  /** vidas ganhas (Revisão Criminal) */
  n?: number;
  /** a fênix não renasceu: só as cinzas */
  falhou?: boolean;
  /** a variante da coluna (para desenhá-la de novo, nas que o poder tira da tela) */
  variante?: number;
  /** pontos em volta, relativos à âncora (as moedas que o sonar do Eco acha) */
  alvos?: [number, number][];
  /** a inclinação do personagem quando o momento começou (as batidas de asa acompanham o corpo) */
  ang?: number;
  semente: number;
}

export interface CenaMomento {
  tema: Tema;
  /** cores da aura do poder no estilo (coresAura) */
  cores: string[];
  motivo: Motivo;
  /** o personagem dono do poder (a aparição do nível 5); sem dono, o emblema com o ícone */
  dono?: string;
  /** o personagem em jogo (a imagem que fica para trás na Absolvição Sumária) */
  jogador: string;
  icone?: HTMLImageElement;
  /** relógio do jogo, em segundos */
  t: number;
  /** a altura e a largura da tela (o chão fica 40 acima do fim) */
  altura: number;
  largura: number;
  /** desenha a coluna do estilo, de `len` de comprimento, a partir de (0, 0) para baixo */
  coluna?: (c: Ctx, len: number, variante: number) => void;
}

export type Camada = "atras" | "frente";

const TAU = Math.PI * 2;
const lim = (k: number) => Math.max(0, Math.min(1, k));
/** 1 até `de` e depois cai até 0 no fim */
const some = (k: number, de = 0.7) => (k < de ? 1 : lim((1 - k) / (1 - de)));
/** de 0 a 1 até `ate` */
const surge = (k: number, ate = 0.12) => lim(k / ate);
const suave = (k: number) => 1 - (1 - lim(k)) ** 3;
/** escala com um tranco: passa de 1 e volta */
const tranco = (k: number) => (k < 0.12 ? 0.4 + (k / 0.12) * 0.85 : k < 0.24 ? 1.25 - ((k - 0.12) / 0.12) * 0.25 : 1);
/** número de 0 a 1 que só depende da semente e de `i` (o mesmo a cada quadro) */
const acaso = (s: number, i: number) => {
  const v = Math.sin(s * 12.9898 + i * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

// ---------- peças comuns ----------

function alfa(c: Ctx, a: number) {
  c.globalAlpha = Math.max(0, a);
}

/** Ondas que se abrem do centro: anéis inteiros ou só o arco [a0, a1] (o som que sai para a frente). */
function ondas(c: Ctx, k: number, cor: string, n: number, r0: number, r1: number, arco?: [number, number], largura = 3) {
  const a0 = c.globalAlpha;
  c.strokeStyle = cor;
  c.lineCap = "round";
  for (let i = 0; i < n; i++) {
    const ki = (k - i * 0.15) / (1 - (n - 1) * 0.15);
    if (ki <= 0 || ki >= 1) continue;
    alfa(c, a0 * (1 - ki) * 0.9);
    c.lineWidth = largura * (1 - ki * 0.5);
    c.beginPath();
    c.arc(0, 0, r0 + (r1 - r0) * suave(ki), arco?.[0] ?? 0, arco?.[1] ?? TAU);
    c.stroke();
  }
  c.globalAlpha = a0;
}

/** Texto grosso com contorno, centrado em (x, y). */
function letreiro(c: Ctx, texto: string, x: number, y: number, tam: number, cor: string, contorno: string, rot = 0) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.font = `900 ${tam}px system-ui, sans-serif`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.lineJoin = "round";
  c.lineWidth = Math.max(2, tam * 0.2);
  c.strokeStyle = contorno;
  c.strokeText(texto, 0, 0);
  c.fillStyle = cor;
  c.fillText(texto, 0, 0);
  c.restore();
}

/** Onomatopeia de quadrinho: o texto sobre uma estrela de pontas, que entra com um tranco e some. */
function onomatopeia(c: Ctx, texto: string, x: number, y: number, k: number, cor: string, fundo: string, contorno: string, tam = 24) {
  const a0 = c.globalAlpha;
  c.save();
  c.translate(x, y);
  const s = tranco(k);
  c.scale(s, s);
  c.rotate(-0.12 + Math.sin(k * 40) * 0.04 * (1 - k));
  alfa(c, a0 * some(k, 0.65));
  c.font = `900 ${tam}px system-ui, sans-serif`;
  const w = c.measureText(texto).width / 2 + tam * 0.5;
  const h = tam * 0.95;
  c.beginPath();
  const pontas = 13;
  for (let i = 0; i < pontas * 2; i++) {
    const a = (i / (pontas * 2)) * TAU;
    const r = i % 2 ? 0.7 : 1;
    c.lineTo(Math.cos(a) * w * r * 1.15, Math.sin(a) * h * r * 1.15);
  }
  c.closePath();
  c.fillStyle = fundo;
  c.fill();
  c.lineWidth = 2;
  c.strokeStyle = contorno;
  c.stroke();
  letreiro(c, texto, 0, 1, tam, cor, contorno);
  c.restore();
  c.globalAlpha = a0;
}

/** Carimbo: cai de cima (grande e transparente), bate e fica um tempo, com a moldura dupla. */
function carimbo(c: Ctx, texto: string, x: number, y: number, k: number, cor: string, rot = -0.16, tam = 13) {
  const a0 = c.globalAlpha;
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  const s = k < 0.1 ? 2 - k / 0.1 : 1 + Math.sin(Math.min(1, (k - 0.1) / 0.08) * Math.PI) * 0.05;
  c.scale(s, s);
  alfa(c, a0 * surge(k, 0.1) * some(k, 0.72) * 0.9);
  c.font = `900 ${tam}px system-ui, sans-serif`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  const w = c.measureText(texto).width + 16;
  const h = tam + 11;
  c.strokeStyle = cor;
  c.lineWidth = 2.6;
  c.strokeRect(-w / 2, -h / 2, w, h);
  c.lineWidth = 1;
  c.strokeRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
  c.fillStyle = cor;
  c.fillText(texto, 0, 1);
  c.restore();
  c.globalAlpha = a0;
}

/** Raios girando em volta do centro, como de um emblema. */
function raios(c: Ctx, cor: string, n: number, r0: number, r1: number, giro: number) {
  c.fillStyle = cor;
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const a = giro + (i / n) * TAU;
    const d = (Math.PI / n) * 0.45;
    c.moveTo(Math.cos(a - d) * r0, Math.sin(a - d) * r0);
    c.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
    c.lineTo(Math.cos(a + d) * r0, Math.sin(a + d) * r0);
  }
  c.fill();
}

/**
 * O desenho do personagem guardado num canvas à parte (por estilo), para a aparição ficar translúcida por igual. Com
 * `tinta`, ele sai banhado nessa cor (a aparição do nível 5, espectral, na cor do poder).
 */
const desenhos = new Map<string, HTMLCanvasElement | null>();
const LADO = 160;
const ESC_DESENHO = 2.2;
function desenhoDoPersonagem(id: string, tema: Tema, tinta?: string): HTMLCanvasElement | null {
  const chave = `${id}:${tema.id}:${tinta ?? ""}`;
  const salvo = desenhos.get(chave);
  if (salvo !== undefined) return salvo;
  if (typeof document === "undefined") return null;
  const tela = document.createElement("canvas");
  tela.width = tela.height = LADO;
  const c = tela.getContext("2d");
  if (c) {
    c.translate(LADO / 2, LADO / 2 + 8);
    c.scale(ESC_DESENHO, ESC_DESENHO);
    desenharPersonagem(c, id, tema, 0.5, 0);
    if (tinta) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalCompositeOperation = "source-atop";
      c.globalAlpha = 0.55;
      c.fillStyle = tinta;
      c.fillRect(0, 0, LADO, LADO);
    }
  }
  desenhos.set(chave, c ? tela : null);
  return c ? tela : null;
}

/**
 * Aparição do nível 5: o dono do poder grande e translúcido, num halo com raios, que surge, sobe um pouco e some (nos
 * poderes dos orbes, o ícone do poder no lugar dele).
 */
function aparicao(c: Ctx, cena: CenaMomento, k: number, x = 0, y = -30, escala = 2.4) {
  const a = Math.sin(Math.PI * lim(k));
  if (a <= 0.01) return;
  const a0 = c.globalAlpha;
  c.save();
  c.translate(x, y - 16 * k);
  const r = 30 * escala;
  const g = c.createRadialGradient(0, 0, 4, 0, 0, r);
  g.addColorStop(0, cena.cores[0]!);
  g.addColorStop(1, "rgba(255,255,255,0)");
  alfa(c, a0 * a * 0.45);
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 0, r, 0, TAU);
  c.fill();
  alfa(c, a0 * a * 0.28);
  raios(c, cena.cores[2] ?? cena.cores[0]!, 12, r * 0.35, r * 1.25, cena.t * 0.5);
  const img = cena.dono ? desenhoDoPersonagem(cena.dono, cena.tema, cena.cores[0]) : null;
  if (img) {
    const s = (escala / ESC_DESENHO) * (0.94 + 0.12 * k);
    alfa(c, a0 * a * 0.6);
    c.drawImage(img, (-LADO / 2) * s, (-LADO / 2 - 8) * s, LADO * s, LADO * s);
  } else if (cena.icone?.complete && cena.icone.naturalWidth) {
    const t = 13 * escala * (0.94 + 0.12 * k);
    alfa(c, a0 * a * 0.8);
    c.drawImage(cena.icone, -t, -t, t * 2, t * 2);
  }
  c.restore();
}

/** Motivos do poder voando do centro para fora, girando. */
function espalhar(c: Ctx, cena: CenaMomento, m: Momento, k: number, n: number, dist: number, tam = 1.2, forma: Forma = cena.motivo.forma) {
  const a0 = c.globalAlpha;
  alfa(c, a0 * some(k, 0.55));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + acaso(m.semente, i) * 0.6;
    const d = dist * suave(k) * (0.6 + acaso(m.semente, i + 9) * 0.4);
    desenharMotivo(c, forma, Math.cos(a) * d, Math.sin(a) * d + k * k * 20, tam, cena.motivo.cores[0], cena.motivo.cores[1], k * 5 + i);
  }
  c.globalAlpha = a0;
}

/** Contorno de coração centrado em (0, 0), com uns 2·s de largura. */
function coracao(c: Ctx, s: number) {
  c.beginPath();
  c.moveTo(0, s * 0.35);
  c.bezierCurveTo(-s * 1.1, -s * 0.35, -s * 0.55, -s * 1.05, 0, -s * 0.5);
  c.bezierCurveTo(s * 0.55, -s * 1.05, s * 1.1, -s * 0.35, 0, s * 0.35);
  c.closePath();
}

/** Língua de fogo de `alt` de altura, com a base em (x, base). */
function lingua(c: Ctx, x: number, base: number, larg: number, alt: number, ondula: number) {
  c.moveTo(x - larg, base);
  c.quadraticCurveTo(x - larg * 0.9, base - alt * 0.55, x + ondula, base - alt);
  c.quadraticCurveTo(x + larg * 0.9, base - alt * 0.55, x + larg, base);
  c.closePath();
}

/** Asa de penas abertas, saindo de (0, 0) para o lado `lado` (−1 esquerda, 1 direita), de `tam` de comprimento. */
function asaDePenas(c: Ctx, lado: number, tam: number, abre: number) {
  for (let j = 0; j < 6; j++) {
    const a = -Math.PI / 2 - lado * (0.35 + j * 0.22 * abre);
    const comp = tam * (1 - j * 0.1);
    c.save();
    c.rotate(a + Math.PI / 2);
    c.beginPath();
    c.ellipse(0, -comp / 2, comp * 0.11, comp / 2, 0, 0, TAU);
    c.fill();
    c.stroke();
    c.restore();
  }
}

/**
 * As duas partes da coluna (com o desenho do estilo) em volta do vão, com a origem no centro dele: `encolhe` (0 a 1)
 * recolhe as partes para dentro do vão, `afasta` as separa e `gira` as inclina. Para as colunas que o poder tira da tela.
 */
function pecasDaColuna(c: Ctx, m: Momento, cena: CenaMomento, encolhe = 0, afasta = 0, gira = 0) {
  if (!cena.coluna) return;
  const ab = m.ab ?? 70;
  const cima = Math.max(40, m.y - ab + 20);
  const baixo = Math.max(40, cena.altura - m.y - ab);
  const v = m.variante ?? 0;
  const s = Math.max(0.02, 1 - encolhe);
  c.save();
  c.translate(0, -ab * (1 - encolhe) - afasta);
  c.rotate(-gira);
  c.scale(1, -s);
  cena.coluna(c, cima, (v + 1) % 3);
  c.restore();
  c.save();
  c.translate(0, ab * (1 - encolhe) + afasta);
  c.rotate(gira);
  c.scale(1, s);
  cena.coluna(c, baixo, v);
  c.restore();
}

/** O círculo da batida de asas: o que ele toca é empurrado para fora. Cresce até o raio `r` e some. */
function circuloDaBatida(c: Ctx, r: number, k: number, cor: string) {
  const a0 = c.globalAlpha;
  const p = suave(lim(k / 0.35));
  alfa(c, a0 * (1 - k) * 0.6);
  c.strokeStyle = cor;
  c.lineWidth = 2;
  c.setLineDash([6, 6]);
  c.beginPath();
  c.arc(0, 0, r * (0.55 + 0.45 * p), 0, TAU);
  c.stroke();
  c.setLineDash([]);
  c.globalAlpha = a0;
}

/** Pasta de arquivo em (x, y): `abre` 1 com a frente caída e as folhas à mostra, 0 fechada. */
function pasta(c: Ctx, x: number, y: number, abre: number, s = 1) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.fillStyle = "#b8843a";
  c.fillRect(-22, -14, 44, 28);
  c.fillRect(-22, -18, 16, 5);
  if (abre > 0.05) {
    c.fillStyle = "#faf6ee";
    c.fillRect(-18, -12 - 10 * abre, 36, 12);
    c.fillStyle = "rgba(90,70,50,0.5)";
    for (let l = 0; l < 3; l++) c.fillRect(-14, -9 - 10 * abre + l * 3, 26 - l * 5, 1);
  }
  c.save();
  c.translate(0, 14);
  c.scale(1, Math.cos(abre * 1.25));
  c.fillStyle = "#e8c87a";
  c.fillRect(-22, -26, 44, 26);
  c.strokeStyle = "#8a6a3a";
  c.lineWidth = 1;
  c.strokeRect(-22, -26, 44, 26);
  c.restore();
  c.restore();
}

/** O armário de arquivo com a gaveta de cima, com o topo em `y`; `aberta` (0 a 1) abre a fenda por onde a pasta entra. */
function arquivo(c: Ctx, y: number, aberta: number) {
  c.fillStyle = "#5a4a3a";
  c.fillRect(-36, y, 72, 44);
  c.fillStyle = "#2a2018";
  c.fillRect(-30, y + 3, 60, 4 + aberta * 8);
  c.fillStyle = "#8a7458";
  c.fillRect(-32, y + 7 + aberta * 8, 64, 15);
  c.fillRect(-32, y + 25, 64, 15);
  c.fillStyle = "#d8c8a0";
  c.fillRect(-7, y + 12 + aberta * 8, 14, 3);
  c.fillRect(-7, y + 30, 14, 3);
}

// ---------- os momentos de cada poder ----------

type Desenho = (c: Ctx, m: Momento, k: number, cena: CenaMomento) => void;
interface Def {
  atras?: Desenho;
  frente: Desenho;
}

/** A aparição do nível 5, só no primeiro momento depois de usar o poder. */
const aparece =
  (x = 0, y = -30, escala = 2.4): Desenho =>
  (c, m, k, cena) => {
    if (m.nivel >= 5 && m.principal) aparicao(c, cena, k, x, y, escala);
  };

const MOMENTOS: Record<IdPoder, Def> = {
  // ---- poderes dos orbes ----
  escudo: {
    atras: aparece(0, -8, 2.2),
    frente(c, m, k, cena) {
      // a bolha do escudo estilhaça: um clarão e cacos azuis voando
      const a0 = c.globalAlpha;
      if (k < 0.25) {
        alfa(c, a0 * (1 - k / 0.25));
        c.strokeStyle = "#ffffff";
        c.lineWidth = 4;
        c.beginPath();
        c.arc(0, -2, 34 + k * 60, 0, TAU);
        c.stroke();
      }
      alfa(c, a0 * some(k, 0.45));
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU + acaso(m.semente, i) * 0.4;
        const d = 34 + suave(k) * (60 + acaso(m.semente, i + 3) * 30);
        c.save();
        c.translate(Math.cos(a) * d, -2 + Math.sin(a) * d + k * k * 30);
        c.rotate(a + k * 6 * (acaso(m.semente, i + 5) - 0.5));
        c.beginPath();
        c.moveTo(-6, -3);
        c.quadraticCurveTo(0, -6, 6, -3);
        c.lineTo(2, 4);
        c.closePath();
        c.fillStyle = cena.cores[0]!;
        c.fill();
        c.strokeStyle = "rgba(255,255,255,0.9)";
        c.lineWidth = 1.2;
        c.stroke();
        c.restore();
      }
      c.globalAlpha = a0;
      if (m.nivel >= 3) carimbo(c, "CONCEDIDO", 0, -56, k, "#2e6fb0", -0.14, 13);
    },
  },
  ima: {
    atras(c, m, k, cena) {
      // o Vade Mecum aberto, brilhando acima de quem atrai as moedas
      if (m.nivel < 5 || !m.principal) return;
      const a = Math.sin(Math.PI * k);
      const a0 = c.globalAlpha;
      const g = c.createRadialGradient(0, -46, 2, 0, -46, 40);
      g.addColorStop(0, cena.cores[0]!);
      g.addColorStop(1, "rgba(255,255,255,0)");
      alfa(c, a0 * a * 0.5);
      c.fillStyle = g;
      c.beginPath();
      c.arc(0, -46, 40, 0, TAU);
      c.fill();
      alfa(c, a0 * a * 0.85);
      desenharMotivo(c, "livro", 0, -46, 3, cena.motivo.cores[0], cena.motivo.cores[1]);
      c.globalAlpha = a0;
    },
    frente(c, m, k, cena) {
      // uma página que vira e sobe de onde a moeda chegou
      const a0 = c.globalAlpha;
      const paginas = m.nivel >= 3 ? 3 : 1;
      for (let i = 0; i < paginas; i++) {
        const ki = lim(k - i * 0.12);
        c.save();
        c.translate((i - (paginas - 1) / 2) * 12, -ki * 38);
        c.rotate((i - 1) * 0.25);
        c.scale(Math.cos(ki * TAU), 1);
        alfa(c, a0 * some(ki, 0.55));
        c.fillStyle = "#f6eedc";
        c.fillRect(-7, -9, 14, 18);
        c.strokeStyle = cena.motivo.cores[0];
        c.lineWidth = 1.2;
        c.strokeRect(-7, -9, 14, 18);
        c.fillStyle = "rgba(90,70,50,0.6)";
        for (let l = 0; l < 4; l++) c.fillRect(-4.5, -5 + l * 3.4, 9 - (l === 3 ? 4 : 0), 1);
        c.restore();
      }
      c.globalAlpha = a0;
      if (m.nivel >= 3) {
        alfa(c, a0 * some(k, 0.6));
        letreiro(c, "§", 14, -14 - k * 44, 15, cena.motivo.cores[1], cena.motivo.cores[0]);
        c.globalAlpha = a0;
      }
    },
  },
  lento: {
    atras: aparece(0, -6, 2.4),
    frente(c, m, k, cena) {
      // o relógio por cima, com os ponteiros que giram rápido e desaceleram até quase parar
      const a0 = c.globalAlpha;
      if (m.nivel >= 3) ondas(c, k, cena.cores[0]!, 3, 24, 140, undefined, 2);
      alfa(c, a0 * surge(k, 0.12) * some(k, 0.7));
      c.save();
      c.translate(0, -54);
      c.scale(tranco(k), tranco(k));
      c.fillStyle = "#f6f0e4";
      c.strokeStyle = cena.motivo.cores[1];
      c.lineWidth = 3;
      c.beginPath();
      c.arc(0, 0, 22, 0, TAU);
      c.fill();
      c.stroke();
      c.lineWidth = 1.5;
      c.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        c.moveTo(Math.cos(a) * 17, Math.sin(a) * 17);
        c.lineTo(Math.cos(a) * 20, Math.sin(a) * 20);
      }
      c.stroke();
      const giro = 16 * suave(k);
      c.lineCap = "round";
      c.lineWidth = 2.5;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(Math.sin(giro) * 16, -Math.cos(giro) * 16);
      c.moveTo(0, 0);
      c.lineTo(Math.sin(giro / 12) * 10, -Math.cos(giro / 12) * 10);
      c.stroke();
      c.restore();
      c.globalAlpha = a0;
    },
  },
  mini: {
    atras: aparece(0, -6, 2.2),
    frente(c, m, k, cena) {
      // as bolhas se fecham na maleta, que encolhe, e um "puf"
      const a0 = c.globalAlpha;
      const fecha = suave(lim(k / 0.55));
      alfa(c, a0 * some(k, 0.55));
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU + k * 2;
        const r = 64 - fecha * 54;
        desenharMotivo(c, "bolha", Math.cos(a) * r, -2 + Math.sin(a) * r, 0.9, cena.motivo.cores[0], cena.motivo.cores[1]);
      }
      if (k > 0.5) {
        const p = (k - 0.5) / 0.5;
        alfa(c, a0 * (1 - p) * 0.8);
        c.fillStyle = "#ffffff";
        c.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU;
          const x = Math.cos(a) * (10 + p * 18);
          const y = Math.sin(a) * (10 + p * 18);
          const r = 6 * (1 - p * 0.5);
          c.moveTo(x + r, y);
          c.arc(x, y, r, 0, TAU);
        }
        c.fill();
      }
      c.globalAlpha = a0;
      if (m.nivel >= 3) {
        // a lupa que passa procurando a maleta, de tão pequena
        alfa(c, a0 * surge(k, 0.15) * some(k, 0.75));
        desenharMotivo(c, "lupa", -70 + k * 140, -40 + Math.sin(k * 6) * 6, 2.8, "rgba(220,240,255,0.6)", "#3a4a5a", -0.3);
        c.globalAlpha = a0;
      }
    },
  },
  fantasma: {
    atras(c, m, k, cena) {
      // a imagem do personagem que fica para trás, onde ele atravessou
      if (m.nivel >= 3) {
        const img = desenhoDoPersonagem(cena.jogador, cena.tema);
        if (img) {
          const a0 = c.globalAlpha;
          const s = 1 / ESC_DESENHO;
          alfa(c, a0 * 0.4 * (1 - k));
          c.drawImage(img, (-LADO / 2) * s - k * 16, (-LADO / 2 - 8) * s, LADO * s, LADO * s);
          c.globalAlpha = a0;
        }
      }
      if (m.nivel >= 5 && m.principal) aparicao(c, cena, k, 0, -70, 1.8);
    },
    frente(c, m, k, cena) {
      // a coluna ondula onde foi atravessada: elipses compridas que se abrem
      const a0 = c.globalAlpha;
      for (let i = 0; i < 3; i++) {
        const ki = (k - i * 0.16) / 0.7;
        if (ki <= 0 || ki >= 1) continue;
        alfa(c, a0 * (1 - ki) * 0.85);
        c.strokeStyle = i % 2 ? cena.cores[0]! : "#ffffff";
        c.lineWidth = 2.5;
        c.beginPath();
        c.ellipse(0, 0, 8 + ki * 34, 18 + ki * 80, 0, 0, TAU);
        c.stroke();
      }
      c.globalAlpha = a0;
      if (m.nivel >= 5 && m.principal) carimbo(c, "ABSOLVIDO", 0, -44, k, "#5a6a80", 0.12, 12);
    },
  },
  dobro: {
    atras(c, m, k) {
      // a medalha dourada do ×2, girando atrás do número
      if (m.nivel < 5) return;
      const a0 = c.globalAlpha;
      alfa(c, a0 * surge(k, 0.15) * some(k, 0.6));
      c.save();
      c.translate(0, -12 - k * 26);
      c.scale(Math.cos(k * TAU * 1.5) * 0.9 + 0.1, 1);
      c.fillStyle = "#c08a1e";
      c.beginPath();
      c.arc(0, 0, 25, 0, TAU);
      c.fill();
      c.fillStyle = "#ffd866";
      c.beginPath();
      c.arc(0, 0, 21, 0, TAU);
      c.fill();
      c.restore();
      c.globalAlpha = a0;
    },
    frente(c, m, k, cena) {
      onomatopeia(c, "×2", 0, -12 - k * 26, k, "#ffd23a", "rgba(255,255,255,0.9)", "#5a3a0a", 20);
      if (m.nivel >= 3) espalhar(c, cena, m, k, 4, 46, 1.4);
    },
  },
  leve: {
    atras: aparece(0, -10, 2.4),
    frente(c, m, k, cena) {
      // a onda do pulso em forma de asas: penas douradas que se abrem para os dois lados
      const a0 = c.globalAlpha;
      c.fillStyle = "rgba(255,233,168,0.35)";
      c.strokeStyle = cena.cores[0]!;
      c.lineWidth = 1.5;
      for (let i = 0; i < 2; i++) {
        const ki = lim((k - i * 0.15) / 0.8);
        if (ki <= 0 || ki >= 1) continue;
        alfa(c, a0 * (1 - ki));
        c.save();
        c.translate(0, -4);
        asaDePenas(c, -1, 30 + ki * 90, 0.6 + ki * 0.5);
        asaDePenas(c, 1, 30 + ki * 90, 0.6 + ki * 0.5);
        c.restore();
      }
      c.globalAlpha = a0;
      if (m.nivel >= 3) espalhar(c, cena, m, k, 8, 110, 1.3);
    },
  },
  congelar: {
    frente(c, m, k, cena) {
      // a geada: pontas de gelo que crescem nas duas bordas do vão, e a coluna embranquece perto delas
      const ab = m.ab ?? 70;
      const cresce = suave(lim(k / 0.3));
      const a0 = c.globalAlpha;
      alfa(c, a0 * some(k, 0.75));
      for (const lado of [-1, 1]) {
        const borda = lado * ab;
        const g = c.createLinearGradient(0, borda, 0, borda + lado * 70);
        g.addColorStop(0, "rgba(228,248,255,0.55)");
        g.addColorStop(1, "rgba(228,248,255,0)");
        c.fillStyle = g;
        c.fillRect(-37, lado < 0 ? borda - 70 : borda, 74, 70);
      }
      geada(c, ab, cresce, Math.round(m.y));
      if (m.nivel >= 5) {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + k * 3;
          desenharMotivo(c, "floco", Math.cos(a) * 46, Math.sin(a) * (ab + 30), 1.4, cena.motivo.cores[0], cena.motivo.cores[1], k * 4);
        }
      }
      c.globalAlpha = a0;
      if (m.nivel >= 3 && m.principal) carimbo(c, "TRANSITADO EM JULGADO", 0, -ab - 36, k, "#2a7a9a", -0.1, 9);
    },
  },
  prescricao: {
    frente(c, m, k, cena) {
      // a coluna envelhece e some, e vira pó de papel velho, que cai e se desfaz
      const ab = m.ab ?? 70;
      const a0 = c.globalAlpha;
      if (k < 0.45) {
        alfa(c, a0 * (1 - k / 0.45) * 0.85);
        pecasDaColuna(c, m, cena, 0, k * 10);
      }
      alfa(c, a0 * some(k, 0.45));
      for (let i = 0; i < 22; i++) {
        const lado = i % 2 ? 1 : -1;
        const x = (acaso(m.semente, i) - 0.5) * 70 + Math.sin(k * 5 + i) * 6;
        const y = lado * (ab + 16 + acaso(m.semente, i + 30) * 150) + k * k * 70;
        const t = 3 + acaso(m.semente, i + 60) * 4;
        c.save();
        c.translate(x, y);
        c.rotate(k * 6 * (acaso(m.semente, i + 90) - 0.5) * 2);
        c.fillStyle = i % 3 ? "#e8d8a8" : "#c8b080";
        c.fillRect(-t / 2, -t / 2, t, t * 0.8);
        c.restore();
      }
      c.globalAlpha = a0;
      if (m.nivel >= 3 && m.principal) {
        alfa(c, a0 * surge(k, 0.15) * some(k, 0.7));
        desenharMotivo(c, "ampulheta", 0, 0, 3, cena.motivo.cores[0], cena.motivo.cores[1], k * 2);
        c.globalAlpha = a0;
        carimbo(c, "PRESCRITO", 0, -ab - 26, k, "#6a5a44", -0.18, 13);
      }
      if (m.nivel >= 5 && m.principal) {
        // folhas de calendário que voam
        alfa(c, a0 * some(k, 0.6));
        for (let i = 0; i < 5; i++) {
          const ki = lim(k - i * 0.06);
          c.save();
          c.translate(-20 + i * 10 + ki * 80, -20 - ki * 90 + i * 6);
          c.rotate(ki * 4 + i);
          c.fillStyle = "#ffffff";
          c.fillRect(-7, -8, 14, 16);
          c.fillStyle = "#c8323a";
          c.fillRect(-7, -8, 14, 4);
          c.fillStyle = "#3a3a3a";
          c.font = "700 7px system-ui, sans-serif";
          c.textAlign = "center";
          c.fillText(String(31 - i * 6), 0, 5);
          c.restore();
        }
        c.globalAlpha = a0;
      }
    },
  },
  revisao: {
    atras: aparece(0, -10, 2.2),
    frente(c, m, k) {
      // o coração com o "+1" (ou "+2") que sobe
      const a0 = c.globalAlpha;
      alfa(c, a0 * surge(k, 0.1) * some(k, 0.7));
      c.save();
      c.translate(0, -26 - k * 52);
      c.scale(tranco(k), tranco(k));
      coracao(c, 16);
      c.fillStyle = "#ff5a6a";
      c.fill();
      c.strokeStyle = "#ffffff";
      c.lineWidth = 2;
      c.stroke();
      letreiro(c, `+${m.n ?? 1}`, 0, -3, 12, "#ffffff", "#a8202e");
      c.restore();
      c.globalAlpha = a0;
      if (m.nivel >= 3) {
        // o processo reaberto: a pasta abre, as folhas saem e vem o carimbo
        alfa(c, a0 * surge(k, 0.15) * some(k, 0.7));
        desenharMotivo(c, "pasta", 40, -18, 2.4, "#e8c87a", "#8a6a3a");
        for (let i = 0; i < 3; i++) desenharMotivo(c, "papel", 40 + (i - 1) * 10 * suave(k), -26 - suave(k) * (18 + i * 6), 1.2, "#faf6ee", "#8a6a3a", (i - 1) * 0.4);
        c.globalAlpha = a0;
        carimbo(c, "REVISTA", 40, -54, lim(k - 0.1), "#a8202e", -0.15, 11);
      }
    },
  },
  // ---- poderes dos personagens ----
  arquivamento: {
    atras: aparece(0, 0, 2.4),
    frente(c, m, k, cena) {
      // a coluna é arquivada: as duas partes se recolhem para dentro de uma pasta no vão, a pasta fecha e desce até a
      // gaveta do arquivo no chão, que se fecha com ela dentro
      const a0 = c.globalAlpha;
      const recolhe = suave(lim(k / 0.32));
      if (recolhe < 1) {
        alfa(c, a0 * (1 - recolhe * 0.4));
        pecasDaColuna(c, m, cena, recolhe);
      }
      alfa(c, a0 * some(k, 0.86));
      const chao = cena.altura - 40 - m.y;
      const topoArquivo = chao - 44;
      const aberta = k < 0.3 ? surge(k, 0.3) : k < 0.82 ? 1 : 1 - suave((k - 0.82) / 0.12);
      arquivo(c, topoArquivo, aberta);
      // a pasta: abre no vão enquanto as partes entram, fecha e cai na gaveta
      const fecha = 1 - suave(lim((k - 0.32) / 0.16));
      const cai = suave(lim((k - 0.5) / 0.3)) ** 1.6;
      if (k < 0.84) {
        const y = cai * (topoArquivo + 2);
        c.save();
        if (cai > 0.7) {
          // entra pela fenda: só o que está acima dela aparece
          c.beginPath();
          c.rect(-40, -cena.altura, 80, cena.altura + topoArquivo + 4);
          c.clip();
        }
        pasta(c, 0, y, fecha, 0.6 + 0.4 * Math.min(1, recolhe * 1.2));
        c.restore();
      }
      c.globalAlpha = a0;
      if (m.nivel >= 3) carimbo(c, "ARQUIVADO", 0, -30, lim((k - 0.34) / 0.66), "#8a6a3a", -0.2, 13);
    },
  },
  equilibrio: {
    atras: aparece(0, 0, 2),
    frente(c, m, k, cena) {
      // o vão se abre (as setas nas bordas) e o travessão sobre ele oscila e se nivela
      const a0 = c.globalAlpha;
      const ab = m.ab ?? 70;
      alfa(c, a0 * some(k, 0.6));
      c.fillStyle = cena.motivo.cores[0];
      for (const lado of [-1, 1]) {
        const y = lado * (ab - 4 + suave(lim(k / 0.5)) * 10);
        c.beginPath();
        c.moveTo(-6, y);
        c.lineTo(6, y);
        c.lineTo(0, y + lado * 9);
        c.closePath();
        c.fill();
      }
      const ang = 0.5 * Math.exp(-k * 5) * Math.cos(k * 18);
      alfa(c, a0 * surge(k, 0.1) * some(k, 0.7));
      c.save();
      c.rotate(ang);
      c.strokeStyle = cena.motivo.cores[1];
      c.lineCap = "round";
      c.lineWidth = 3.5;
      c.beginPath();
      c.moveTo(-32, 0);
      c.lineTo(32, 0);
      c.stroke();
      if (m.nivel >= 3) {
        // os pratos pendurados nas pontas
        c.lineWidth = 1.2;
        c.fillStyle = cena.motivo.cores[0];
        for (const x of [-30, 30]) {
          c.save();
          c.translate(x, 0);
          c.rotate(-ang);
          c.beginPath();
          c.moveTo(0, 0);
          c.lineTo(-8, 14);
          c.moveTo(0, 0);
          c.lineTo(8, 14);
          c.stroke();
          c.beginPath();
          c.ellipse(0, 14, 10, 3.5, 0, 0, Math.PI);
          c.fill();
          c.stroke();
          c.restore();
        }
      }
      c.restore();
      // o fiel no meio, que brilha quando nivela
      c.fillStyle = Math.abs(ang) < 0.04 ? "#ffffff" : cena.motivo.cores[0];
      c.beginPath();
      c.moveTo(0, -2);
      c.lineTo(-5, 7);
      c.lineTo(5, 7);
      c.closePath();
      c.fill();
      c.globalAlpha = a0;
    },
  },
  inquerito: {
    atras: aparece(0, -30, 2.2),
    frente(c, m, k, cena) {
      // a impressão digital onde a moeda estava
      const a0 = c.globalAlpha;
      alfa(c, a0 * surge(k, 0.15) * some(k, 0.55));
      c.strokeStyle = cena.motivo.cores[1];
      c.lineWidth = 1.2;
      c.beginPath();
      for (let i = 1; i <= 5; i++) {
        c.moveTo(Math.cos(3.5) * 2.2 * i, Math.sin(3.5) * 3 * i);
        c.ellipse(0, 0, 2.2 * i, 3 * i, 0, 3.5, 3.5 + 4.6 - i * 0.25);
      }
      c.stroke();
      c.globalAlpha = a0;
      if (m.nivel >= 3) {
        alfa(c, a0 * surge(k, 0.2) * some(k, 0.7));
        desenharMotivo(c, "lupa", 10 - k * 10, -6 + Math.sin(k * 8) * 3, 2.2, "rgba(220,236,250,0.55)", cena.motivo.cores[1], -0.3);
        c.globalAlpha = a0;
      }
    },
  },
  presuncao: {
    atras: aparece(0, -44, 2.2),
    frente(c, m, k, cena) {
      // a rachada se fecha: o zigue-zague brilha e encolhe até sumir
      const a0 = c.globalAlpha;
      const resta = 1 - suave(lim(k / 0.6));
      alfa(c, a0 * (0.4 + resta * 0.6) * some(k, 0.6));
      c.save();
      c.scale(1, resta + 0.05);
      c.lineJoin = "round";
      for (const [cor, lw] of [[cena.cores[0]!, 6], ["#ffffff", 2.5]] as const) {
        c.strokeStyle = cor;
        c.lineWidth = lw;
        c.beginPath();
        for (let i = 0; i <= 8; i++) c.lineTo(i % 2 ? 5 : -5, -40 + i * 10);
        c.stroke();
      }
      c.restore();
      c.globalAlpha = a0;
      if (m.nivel >= 3) {
        alfa(c, a0 * some(k, 0.6));
        desenharMotivo(c, "pomba", 6 + k * 30, -10 - k * 60, 2.2, cena.motivo.cores[0], cena.motivo.cores[1], -0.2);
        c.globalAlpha = a0;
        carimbo(c, "INOCENTE", 0, -30, k, "#4a6a8a", -0.12, 12);
      }
    },
  },
  dosimetria: {
    atras: aparece(0, -24, 2.2),
    frente(c, m, k, cena) {
      // o martelo desce na base de madeira e sai o "+3"
      const a0 = c.globalAlpha;
      alfa(c, a0 * some(k, 0.7));
      c.fillStyle = "#6a4a2a";
      c.fillRect(-14, 8, 28, 6);
      const desce = k < 0.22 ? -1.3 * (1 - k / 0.22) : Math.sin(Math.min(1, (k - 0.22) / 0.12) * Math.PI) * -0.15;
      c.save();
      c.translate(20, 4);
      c.rotate(desce);
      desenharMotivo(c, "martelo", -14, 0, 2.4, cena.motivo.cores[0], cena.motivo.cores[1], 0.5);
      c.restore();
      if (k > 0.22) {
        const p = (k - 0.22) / 0.78;
        alfa(c, a0 * some(p, 0.6));
        letreiro(c, "+3", 0, -8 - p * 40, 16, "#ffe9a8", "#4a2e18");
        if (m.nivel >= 3) {
          c.save();
          c.translate(0, 11);
          c.scale(1, 0.35);
          ondas(c, p, cena.cores[0]!, 2, 10, 50, undefined, 4);
          c.restore();
        }
      }
      c.globalAlpha = a0;
    },
  },
  denuncia: {
    atras: aparece(0, 0, 2.2),
    frente(c, m, k, cena) {
      // a acusação: uma seta tracejada do personagem até a rachada, que leva um X vermelho e vira papel rasgado
      const ab = m.ab ?? 70;
      const a0 = c.globalAlpha;
      if (m.dx !== undefined && k < 0.45) {
        const p = suave(lim(k / 0.2));
        alfa(c, a0 * (1 - k / 0.45));
        c.strokeStyle = "#b3262e";
        c.lineWidth = 2.5;
        c.setLineDash([8, 6]);
        c.beginPath();
        c.moveTo(m.dx, m.dy ?? 0);
        c.lineTo(m.dx * (1 - p), (m.dy ?? 0) * (1 - p));
        c.stroke();
        c.setLineDash([]);
      }
      const risca = lim(k / 0.25);
      alfa(c, a0 * some(k, 0.55));
      c.strokeStyle = "#b3262e";
      c.lineCap = "round";
      c.lineWidth = 7;
      c.beginPath();
      c.moveTo(-24, -24);
      c.lineTo(-24 + 48 * Math.min(1, risca * 2), -24 + 48 * Math.min(1, risca * 2));
      if (risca > 0.5) {
        c.moveTo(24, -24);
        c.lineTo(24 - 48 * (risca - 0.5) * 2, -24 + 48 * (risca - 0.5) * 2);
      }
      c.stroke();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU + acaso(m.semente, i);
        const d = suave(k) * (50 + acaso(m.semente, i + 4) * 50);
        desenharMotivo(c, "papel", Math.cos(a) * d, Math.sin(a) * d * 1.6 + k * k * 40, 1.3, cena.motivo.cores[0], cena.motivo.cores[1], k * 7 + i);
      }
      c.globalAlpha = a0;
      if (m.nivel >= 3) carimbo(c, "DENUNCIADO", 0, -ab - 24, k, "#b3262e", -0.18, 13);
    },
  },
  tipificacao: {
    atras: aparece(0, -32, 2.4),
    frente(c, m, k, cena) {
      // os "§" sobem com os pontos
      const a0 = c.globalAlpha;
      alfa(c, a0 * surge(k, 0.1) * some(k, 0.65));
      for (let i = 0; i < 3; i++) letreiro(c, "§", (i - 1) * 22, -20 - k * 70 * (0.8 + i * 0.15) + Math.abs(i - 1) * 8, 20 - Math.abs(i - 1) * 4, cena.motivo.cores[0], cena.motivo.cores[1]);
      letreiro(c, "+20", 0, -44 - k * 46, 14, "#ffe9a8", "#3e5262");
      // as moedas da tipificação chegando
      for (let i = 0; i < 5; i++) {
        const p = suave(lim((k - i * 0.06) / 0.5));
        if (p >= 1) continue;
        const a = (i / 5) * TAU + 0.5;
        c.fillStyle = cena.tema.paleta.moeda[0];
        c.beginPath();
        c.ellipse(Math.cos(a) * 70 * (1 - p), Math.sin(a) * 50 * (1 - p), 4, 5, 0, 0, TAU);
        c.fill();
      }
      if (m.nivel >= 3) {
        // o código aberto, com as folhas virando
        c.save();
        c.translate(0, -92 + (1 - suave(k)) * 20);
        c.fillStyle = "#3e5262";
        c.fillRect(-26, -2, 52, 22);
        c.fillStyle = "#f4f0e4";
        c.beginPath();
        c.moveTo(-24, 0);
        c.quadraticCurveTo(-12, -4, 0, 0);
        c.lineTo(0, 18);
        c.quadraticCurveTo(-12, 14, -24, 18);
        c.closePath();
        c.moveTo(24, 0);
        c.quadraticCurveTo(12, -4, 0, 0);
        c.lineTo(0, 18);
        c.quadraticCurveTo(12, 14, 24, 18);
        c.closePath();
        c.fill();
        c.fillStyle = "rgba(62,82,98,0.7)";
        c.font = "700 5px system-ui, sans-serif";
        c.textAlign = "left";
        c.fillText("Art. 1º", -21, 6);
        c.fillText("Art. 2º", 4, 6);
        c.fillRect(-21, 9, 16, 0.8);
        c.fillRect(-21, 12, 13, 0.8);
        c.fillRect(4, 9, 16, 0.8);
        c.fillRect(4, 12, 12, 0.8);
        // a folha que vira
        c.save();
        c.scale(Math.cos(k * TAU * 2), 1);
        c.fillStyle = "#ffffff";
        c.fillRect(0, 0, 22, 17);
        c.restore();
        c.restore();
      }
      c.globalAlpha = a0;
    },
  },
  voo: {
    atras: aparece(10, -26, 2.8),
    frente(c, m, k, cena) {
      // o grito do grifo: ondas que saem do bico para a frente, brancas e na cor do poder
      c.save();
      c.translate(16, -8);
      ondas(c, k, "rgba(58,36,16,0.35)", 4, 10, 160, [-0.75, 0.75], 9);
      ondas(c, k, "#ffffff", 4, 10, 160, [-0.75, 0.75], 5);
      ondas(c, lim(k - 0.03), cena.cores[0]!, 4, 8, 150, [-0.7, 0.7], 3);
      c.restore();
      if (m.nivel >= 3) onomatopeia(c, "KRÍÍÍ!", 96, -70, k, "#fff6d8", cena.cores[0]!, "#3a2410", 28);
    },
  },
  galope: {
    atras: aparece(0, 0, 2.2),
    frente(c, m, k, cena) {
      // poeira levantando nas bordas da coluna que se recolhe
      const ab = m.ab ?? 70;
      const a0 = c.globalAlpha;
      c.fillStyle = "#d8c8a8";
      for (const lado of [-1, 1]) {
        alfa(c, a0 * 0.55 * (1 - k));
        c.beginPath();
        for (let i = 0; i < 6; i++) {
          const x = -30 + i * 12 + (acaso(m.semente, i) - 0.5) * 6;
          const y = lado * (ab + 4) + lado * k * (6 + acaso(m.semente, i + 8) * 14);
          const r = 4 + k * (10 + acaso(m.semente, i + 3) * 8);
          c.moveTo(x + r, y);
          c.arc(x, y, r, 0, TAU);
        }
        c.fill();
      }
      c.globalAlpha = a0;
      if (m.nivel >= 3) {
        // as faíscas das ferraduras
        alfa(c, a0 * some(k, 0.5));
        c.strokeStyle = "#ffe9a8";
        c.lineWidth = 1.6;
        c.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU;
          const lado = i % 2 ? 1 : -1;
          const r0 = 4 + k * 20;
          c.moveTo(Math.cos(a) * r0, lado * ab + Math.sin(a) * r0);
          c.lineTo(Math.cos(a) * (r0 + 7), lado * ab + Math.sin(a) * (r0 + 7));
        }
        c.stroke();
        desenharMotivo(c, "ferradura", -14, -ab - 10 - k * 16, 1.6, cena.motivo.cores[0], cena.motivo.cores[1], -0.4);
        desenharMotivo(c, "ferradura", 14, ab + 10 + k * 16, 1.6, cena.motivo.cores[0], cena.motivo.cores[1], Math.PI + 0.4);
        c.globalAlpha = a0;
      }
    },
  },
  garras: {
    atras: aparece(0, 0, 2.2),
    frente(c, m, k, cena) {
      // três arranhões riscados de uma vez na coluna, nas duas partes dela, que se soltam e caem para os lados
      const ab = m.ab ?? 70;
      const risca = suave(lim(k / 0.22));
      const a0 = c.globalAlpha;
      if (k < 0.6) {
        alfa(c, a0 * (1 - k / 0.6));
        pecasDaColuna(c, m, cena, 0, Math.max(0, k - 0.2) * 120, Math.max(0, k - 0.2) * 0.5);
      }
      alfa(c, a0 * some(k, 0.6));
      for (const lado of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const x0 = -26 + i * 16;
          const y0 = lado * (ab + 20) - 40;
          const y1 = y0 + 80 * risca;
          const x1 = x0 + 18 * risca;
          c.lineCap = "round";
          if (m.nivel >= 3) {
            // em brasa
            c.strokeStyle = "rgba(255,140,40,0.45)";
            c.lineWidth = 11;
            c.beginPath();
            c.moveTo(x0, y0);
            c.lineTo(x1, y1);
            c.stroke();
          }
          c.strokeStyle = "#2a1a0c";
          c.lineWidth = 5;
          c.beginPath();
          c.moveTo(x0, y0);
          c.lineTo(x1, y1);
          c.stroke();
          c.strokeStyle = "rgba(255,255,255,0.7)";
          c.lineWidth = 1.4;
          c.beginPath();
          c.moveTo(x0 + 2, y0);
          c.lineTo(x1 + 2, y1);
          c.stroke();
        }
      }
      if (m.nivel >= 3) {
        // as lascas da coluna
        c.fillStyle = cena.tema.paleta.coluna.corpo;
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * TAU + acaso(m.semente, i);
          const d = suave(k) * 70;
          c.save();
          c.translate(Math.cos(a) * d, Math.sin(a) * d + k * k * 50);
          c.rotate(k * 8 + i);
          c.fillRect(-3, -2, 6, 4);
          c.restore();
        }
      }
      c.globalAlpha = a0;
    },
  },
  renascer: {
    atras(c, m, k, cena) {
      if (m.falhou) return;
      if (m.nivel >= 5 && m.principal) aparicao(c, cena, k, 0, -40, 3);
      const a0 = c.globalAlpha;
      // a coluna de fogo que sobe atrás da fênix, com o brilho na base e as brasas
      const alt = 130 * suave(lim(k / 0.35)) * (1 - 0.3 * lim((k - 0.6) / 0.4));
      const g = c.createRadialGradient(0, 24, 2, 0, 24, 46);
      g.addColorStop(0, "rgba(255,200,80,0.9)");
      g.addColorStop(1, "rgba(255,120,40,0)");
      alfa(c, a0 * some(k, 0.6));
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(0, 24, 46, 16, 0, 0, TAU);
      c.fill();
      for (const [cor, larg, fator] of [["#e8401a", 1, 1], ["#ffa02a", 0.7, 0.85], ["#ffe86a", 0.4, 0.65]] as const) {
        c.fillStyle = cor;
        c.beginPath();
        for (let i = 0; i < 7; i++) {
          const x = (i - 3) * 8;
          const h = alt * fator * (0.55 + acaso(m.semente, i) * 0.45) * (1 - Math.abs(i - 3) * 0.12);
          lingua(c, x * 1.2, 26, 8 * larg, h, Math.sin(cena.t * 14 + i * 1.7) * 4);
        }
        c.fill();
      }
      c.fillStyle = "#ffe86a";
      for (let i = 0; i < 12; i++) {
        const y = 20 - k * 140 * (0.4 + acaso(m.semente, i + 11) * 0.6);
        const x = (acaso(m.semente, i + 20) - 0.5) * 60 + Math.sin(k * 9 + i) * 5;
        c.fillRect(x, y, 2.5, 2.5);
      }
      c.globalAlpha = a0;
    },
    frente(c, m, k, cena) {
      const a0 = c.globalAlpha;
      if (m.falhou) {
        // não renasceu: só cinzas que caem e um fio de fumaça
        alfa(c, a0 * some(k, 0.5));
        c.fillStyle = "#7a7a7a";
        for (let i = 0; i < 14; i++) {
          const x = (acaso(m.semente, i) - 0.5) * 40 + Math.sin(k * 4 + i) * 5;
          const y = -6 + k * (40 + acaso(m.semente, i + 5) * 40);
          c.fillRect(x, y, 2.5, 2.5);
        }
        alfa(c, a0 * (1 - k) * 0.4);
        c.fillStyle = "#9a9a9a";
        c.beginPath();
        c.arc(Math.sin(k * 5) * 4, -14 - k * 40, 6 + k * 14, 0, TAU);
        c.fill();
        c.globalAlpha = a0;
        return;
      }
      if (m.nivel >= 3) {
        // o coração em chamas "+1"
        const p = lim((k - 0.2) / 0.8);
        if (p > 0) {
          alfa(c, a0 * surge(p, 0.12) * some(p, 0.7));
          c.save();
          c.translate(0, -50 - p * 50);
          c.scale(tranco(p) * 1.35, tranco(p) * 1.35);
          c.fillStyle = "#ffa02a";
          c.beginPath();
          lingua(c, -7, -6, 6, 16, Math.sin(cena.t * 12) * 2);
          lingua(c, 7, -6, 6, 16, Math.sin(cena.t * 12 + 1) * 2);
          c.fill();
          coracao(c, 15);
          c.fillStyle = "#e8401a";
          c.fill();
          c.strokeStyle = "#ffe86a";
          c.lineWidth = 2;
          c.stroke();
          letreiro(c, "+1", 0, -3, 12, "#ffffff", "#8a1a0a");
          c.restore();
          c.globalAlpha = a0;
        }
      }
    },
  },
  sabedoria: {
    atras(c, m, k, cena) {
      if (m.nivel >= 3) {
        // os olhos da coruja que se abrem no céu e piscam
        const a0 = c.globalAlpha;
        const ab = m.ab ?? 70;
        const abre = Math.max(0.08, Math.sin(Math.PI * k) * (k > 0.45 && k < 0.55 ? 0.15 : 1));
        alfa(c, a0 * Math.sin(Math.PI * k) * 0.85);
        for (const x of [-15, 15]) {
          c.save();
          c.translate(x, -ab - 70);
          c.scale(1, abre);
          const g = c.createRadialGradient(0, 0, 2, 0, 0, 16);
          g.addColorStop(0, "#fff2b0");
          g.addColorStop(1, "rgba(255,210,80,0)");
          c.fillStyle = g;
          c.beginPath();
          c.arc(0, 0, 16, 0, TAU);
          c.fill();
          c.fillStyle = "#ffd23a";
          c.beginPath();
          c.arc(0, 0, 9, 0, TAU);
          c.fill();
          c.fillStyle = "#1a1030";
          c.beginPath();
          c.arc(0, 0, 4, 0, TAU);
          c.fill();
          c.restore();
        }
        c.globalAlpha = a0;
      }
      if (m.nivel >= 5 && m.principal) aparicao(c, cena, k, 0, -40, 2.2);
    },
    frente(c, m, k, cena) {
      // "XP ×2" subindo com estrelinhas
      const a0 = c.globalAlpha;
      alfa(c, a0 * surge(k, 0.1) * some(k, 0.65));
      letreiro(c, "XP ×2", 0, -10 - k * 34, 14, cena.motivo.cores[0], "#2a1e5a");
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU + k * 3;
        desenharMotivo(c, "estrela", Math.cos(a) * 28, -10 - k * 34 + Math.sin(a) * 14, 1 + Math.sin(k * 12 + i) * 0.3, cena.motivo.cores[0], cena.motivo.cores[1], k * 4);
      }
      c.globalAlpha = a0;
    },
  },
  tesouro: {
    atras: aparece(0, -34, 2.4),
    frente(c, m, k, cena) {
      // o baú que se abre e as moedas que pulam dele
      const a0 = c.globalAlpha;
      alfa(c, a0 * surge(k, 0.08) * some(k, 0.75));
      c.save();
      c.translate(34, 14);
      c.fillStyle = "#8a5a2a";
      c.fillRect(-15, -10, 30, 18);
      c.fillStyle = "#e0a526";
      c.fillRect(-15, -4, 30, 3);
      c.fillRect(-2, -10, 4, 18);
      c.save();
      c.translate(-15, -10);
      c.rotate(-1.9 * suave(lim(k / 0.2)));
      c.fillStyle = "#a8743a";
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(30, 0);
      c.quadraticCurveTo(30, -9, 15, -10);
      c.quadraticCurveTo(0, -9, 0, 0);
      c.fill();
      c.restore();
      // o brilho de dentro e as moedas
      c.fillStyle = "rgba(255,230,120,0.7)";
      c.fillRect(-13, -12, 26, 3);
      for (let i = 0; i < 8; i++) {
        const p = lim((k - 0.12 - i * 0.03) / 0.6);
        if (p <= 0 || p >= 1) continue;
        const x = (i - 3.5) * 9 * p;
        const y = -12 - Math.sin(Math.PI * p) * (40 + acaso(m.semente, i) * 30);
        c.fillStyle = cena.tema.paleta.moeda[1];
        c.beginPath();
        c.ellipse(x, y, Math.abs(Math.cos(p * 10 + i)) * 4 + 1.2, 5, 0, 0, TAU);
        c.fill();
        c.fillStyle = cena.tema.paleta.moeda[0];
        c.beginPath();
        c.ellipse(x, y, Math.abs(Math.cos(p * 10 + i)) * 3 + 0.8, 4, 0, 0, TAU);
        c.fill();
      }
      c.restore();
      c.globalAlpha = a0;
      if (m.nivel >= 3) {
        // o sopro de fogo do dragão, para a frente
        const p = lim((k - 0.05) / 0.55);
        if (p > 0 && p < 1) {
          alfa(c, a0 * Math.sin(Math.PI * p) * 0.85);
          const comp = 110 * suave(p);
          const g = c.createLinearGradient(14, 0, 14 + comp, 0);
          g.addColorStop(0, "#ffe86a");
          g.addColorStop(0.5, "#ffa02a");
          g.addColorStop(1, "rgba(232,64,26,0)");
          c.fillStyle = g;
          c.beginPath();
          c.moveTo(14, -8);
          for (let i = 0; i <= 6; i++) c.lineTo(14 + (comp * i) / 6, -8 - (i * 3 + Math.sin(cena.t * 20 + i) * 3));
          for (let i = 6; i >= 0; i--) c.lineTo(14 + (comp * i) / 6, -4 + (i * 3 + Math.sin(cena.t * 20 + i + 2) * 3));
          c.closePath();
          c.fill();
          c.globalAlpha = a0;
        }
      }
    },
  },
  liberdade: {
    atras: aparece(0, -34, 2.4),
    frente(c, m, k, cena) {
      const a0 = c.globalAlpha;
      if (m.nivel >= 3) {
        // a gaiola que se abre: as grades se curvam para fora
        alfa(c, a0 * some(k, 0.55) * 0.9);
        c.strokeStyle = "#6a6a78";
        c.lineWidth = 2;
        const abre = suave(lim(k / 0.4));
        c.beginPath();
        for (let i = 0; i < 7; i++) {
          const x = -27 + i * 9;
          const lado = Math.sign(x) || 0;
          c.moveTo(x, -34);
          c.quadraticCurveTo(x + lado * abre * 34, -4, x, 26);
        }
        c.moveTo(-27, -34);
        c.quadraticCurveTo(0, -48, 27, -34);
        c.stroke();
        c.globalAlpha = a0;
        espalhar(c, cena, m, k, 6, 70, 1.4);
      }
      // as vidas que chegam (uma, duas ou nenhuma, conforme a sorte)
      const vidas = m.n ?? 1;
      for (let v = 0; v < vidas; v++) {
        const lado = vidas === 1 ? 0 : v ? 1 : -1;
        const p = lim((k - 0.15) / 0.85);
        if (p <= 0) continue;
        alfa(c, a0 * surge(p, 0.1) * some(p, 0.7));
        c.save();
        c.translate(lado * 16, -30 - p * 40);
        coracao(c, 9);
        c.fillStyle = "#ff5a6a";
        c.fill();
        c.strokeStyle = "#ffffff";
        c.lineWidth = 1.5;
        c.stroke();
        c.restore();
      }
      c.globalAlpha = a0;
      // as correntes que se partem: os elos voando para os lados
      if (k < 0.18) {
        alfa(c, a0 * (1 - k / 0.18));
        c.strokeStyle = "#ffffff";
        c.lineWidth = 2;
        c.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU;
          c.moveTo(Math.cos(a) * 10, Math.sin(a) * 10);
          c.lineTo(Math.cos(a) * 30, Math.sin(a) * 30);
        }
        c.stroke();
      }
      alfa(c, a0 * some(k, 0.55));
      c.strokeStyle = "#9a9aa8";
      c.lineWidth = 2.4;
      for (let i = 0; i < 8; i++) {
        const lado = i % 2 ? 1 : -1;
        const x = lado * (12 + suave(k) * 70 * (0.5 + acaso(m.semente, i) * 0.5));
        const y = -6 + (acaso(m.semente, i + 3) - 0.5) * 24 + k * k * 60;
        c.save();
        c.translate(x, y);
        c.rotate(k * 8 * lado + i);
        c.beginPath();
        c.ellipse(0, 0, 6, 3.6, 0, 0, TAU);
        c.stroke();
        c.restore();
      }
      c.globalAlpha = a0;
    },
  },
  eco: {
    atras: aparece(0, -30, 2.2),
    frente(c, m, k, cena) {
      // as ondas do sonar, para a frente; no nível 3, os ecos que voltam das colunas
      // as moedas que o sonar acha: um anel em cada uma quando a onda chega
      const a0 = c.globalAlpha;
      c.strokeStyle = "#ffe9a8";
      c.lineWidth = 2;
      for (const [x, y] of m.alvos ?? []) {
        const chega = Math.hypot(x, y) / 170;
        const p = (k - chega * 0.6) / 0.35;
        if (p <= 0 || p >= 1) continue;
        alfa(c, a0 * (1 - p));
        c.beginPath();
        c.arc(x, y, 8 + p * 12, 0, TAU);
        c.stroke();
      }
      c.globalAlpha = a0;
      c.save();
      c.translate(14, -4);
      ondas(c, k, "rgba(40,28,70,0.4)", 3, 10, 160, [-0.55, 0.55], 7);
      ondas(c, k, cena.cores[0]!, 3, 10, 160, [-0.55, 0.55], 3.5);
      if (m.nivel >= 3 && k > 0.3) {
        c.translate(170, 0);
        const p = (k - 0.3) / 0.7;
        const a0 = c.globalAlpha;
        c.strokeStyle = cena.motivo.cores[0];
        c.lineWidth = 2;
        for (let i = 0; i < 2; i++) {
          const pi = lim(p - i * 0.2);
          if (pi <= 0 || pi >= 1) continue;
          alfa(c, a0 * (1 - pi) * 0.6);
          c.beginPath();
          c.arc(0, 0, 90 - pi * 70, Math.PI - 0.4, Math.PI + 0.4);
          c.stroke();
        }
        c.globalAlpha = a0;
      }
      c.restore();
    },
  },
  "asas-de-cera": {
    atras(c, m, k, cena) {
      if (m.nivel < 5) return;
      // as asas de cera gigantes, que batem junto, e o sol perto demais
      const a0 = c.globalAlpha;
      const a = Math.sin(Math.PI * k);
      c.rotate(m.ang ?? 0);
      alfa(c, a0 * a * 0.45);
      c.fillStyle = "#fbf0c8";
      c.strokeStyle = cena.motivo.cores[1];
      c.lineWidth = 1.2;
      c.save();
      c.translate(-4, -8);
      // a asa vai para trás (o voo é para a direita) e a batida a leva de cima para baixo
      c.rotate(0.6 - k * 1.1);
      asaDePenas(c, 1, 96, 1);
      c.restore();
      alfa(c, a0 * a * 0.7);
      const g = c.createRadialGradient(64, -76, 2, 64, -76, 26);
      g.addColorStop(0, "#fff8d0");
      g.addColorStop(1, "rgba(255,200,80,0)");
      c.fillStyle = g;
      c.beginPath();
      c.arc(64, -76, 26, 0, TAU);
      c.fill();
      c.globalAlpha = a0;
    },
    frente(c, m, k, cena) {
      // o círculo da batida (o que estiver nele é empurrado para fora), a rajada em meia-lua e a cera que pinga das asas
      const a0 = c.globalAlpha;
      c.rotate(m.ang ?? 0);
      if (m.ab) circuloDaBatida(c, m.ab, k, cena.motivo.cores[1]);
      c.lineCap = "round";
      for (let i = 0; i < 3; i++) {
        const ki = lim(k - i * 0.12);
        if (ki >= 1) continue;
        for (const [cor, lw] of [["rgba(140,110,40,0.35)", 7], ["#ffffff", 3.5]] as const) {
          alfa(c, a0 * (1 - ki) * 0.85);
          c.strokeStyle = cor;
          c.lineWidth = lw * (1 - ki * 0.5);
          c.beginPath();
          c.arc(-8 + ki * 80, 0, 26 + ki * 16 - i * 4, -0.95, 0.95);
          c.stroke();
        }
      }
      alfa(c, a0 * some(k, 0.6));
      for (let i = 0; i < 3; i++) desenharMotivo(c, "gota", -12 + i * 7 - k * 18, 4 + k * k * 60 + i * 3, 0.75, cena.motivo.cores[0], cena.motivo.cores[1]);
      if (m.nivel >= 3) {
        for (let i = 0; i < 3; i++) desenharMotivo(c, "pena", -10 - k * 70 * (1 + i * 0.3), -10 + Math.sin(k * 6 + i) * 8 - k * 20 * i, 1.2, "#fbf0c8", cena.motivo.cores[1], k * 4 + i);
      }
      c.globalAlpha = a0;
    },
  },
  pterossauro: {
    atras(c, m, k, cena) {
      if (m.nivel < 5) return;
      // a asa membranosa gigante do pterossauro, batendo junto
      const a0 = c.globalAlpha;
      c.rotate(m.ang ?? 0);
      alfa(c, a0 * Math.sin(Math.PI * k) * 0.3);
      c.save();
      c.translate(-2, -6);
      // a asa vai para trás e a batida a leva de cima para baixo
      c.rotate(0.5 - k * 1.2);
      c.fillStyle = cena.motivo.cores[1];
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(-30, -60);
      c.lineTo(-90, -40);
      c.quadraticCurveTo(-70, -26, -60, -10);
      c.quadraticCurveTo(-44, -14, -36, 0);
      c.quadraticCurveTo(-20, -6, 0, 0);
      c.fill();
      c.restore();
      c.globalAlpha = a0;
    },
    frente(c, m, k, cena) {
      // o círculo da batida, a rajada forte com as linhas de vento à frente e o arco do choque
      const a0 = c.globalAlpha;
      c.rotate(m.ang ?? 0);
      if (m.ab) circuloDaBatida(c, m.ab, k, cena.motivo.cores[1]);
      alfa(c, a0 * some(k, 0.4));
      c.strokeStyle = "#ffffff";
      c.lineCap = "round";
      c.lineWidth = 2;
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        const y = -30 + i * 12 + (acaso(m.semente, i) - 0.5) * 6;
        const x0 = 20 + k * 50 + acaso(m.semente, i + 4) * 14;
        c.moveTo(x0, y);
        c.lineTo(x0 + 30 + k * 40, y);
      }
      c.stroke();
      alfa(c, a0 * (1 - k));
      c.lineWidth = 5 * (1 - k);
      c.beginPath();
      c.arc(0, 0, 30 + k * 56, -1, 1);
      c.stroke();
      c.globalAlpha = a0;
      if (m.nivel >= 3) {
        alfa(c, a0 * some(k, 0.55));
        for (let i = 0; i < 4; i++) desenharMotivo(c, "folha", -10 - k * 80 * (0.7 + i * 0.2), -16 + i * 10 + Math.sin(k * 8 + i) * 6, 1.4, "#6a9a4a", "#3a5a2a", k * 6 + i);
        c.globalAlpha = a0;
      }
    },
  },
  foco: {
    atras: aparece(0, -30, 2),
    frente(c, m, k, cena) {
      onomatopeia(c, "×3", 0, -12 - k * 22, k, "#ffffff", cena.motivo.cores[0], "#5a1a10", 19);
      const a0 = c.globalAlpha;
      alfa(c, a0 * some(k, 0.65));
      desenharMotivo(c, "tomate", 26, -18 - k * 22, 1.5, cena.motivo.cores[0], cena.motivo.cores[1]);
      if (m.nivel >= 3) {
        // o relógio do pomodoro em volta do tomate
        c.strokeStyle = cena.motivo.cores[1];
        c.lineWidth = 2.4;
        c.beginPath();
        c.arc(26, -18 - k * 22, 13, -Math.PI / 2, -Math.PI / 2 + TAU * suave(k));
        c.stroke();
      }
      c.globalAlpha = a0;
    },
  },
  agravo: {
    atras: aparece(0, -32, 2.2),
    frente(c, m, k, cena) {
      // o impacto que o recurso segura, e as setas que o desviam para fora
      const a0 = c.globalAlpha;
      if (k < 0.2) {
        alfa(c, a0 * (1 - k / 0.2));
        c.fillStyle = "#ffffff";
        raios(c, "#ffffff", 10, 8, 30 + k * 60, 0);
      }
      alfa(c, a0 * some(k, 0.55));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + 0.3;
        const d = 20 + suave(k) * 60;
        desenharMotivo(c, "seta", Math.cos(a) * d, -4 + Math.sin(a) * d, 1.6, cena.motivo.cores[0], cena.motivo.cores[1], a + Math.PI / 2);
      }
      c.globalAlpha = a0;
      if (m.nivel >= 3) carimbo(c, "PROVIDO", 0, -52, k, "#8a6a1a", -0.15, 14);
    },
  },
  chifre: {
    atras: aparece(0, -32, 2.2),
    frente(c, m, k, cena) {
      // o raio que sai do chifre até a coluna, e o estouro de brilhos nela
      const dx = m.dx ?? 120;
      const dy = m.dy ?? 0;
      const a0 = c.globalAlpha;
      const p = lim(k / 0.6);
      if (p < 1) {
        const larg = 10 * (1 - p * 0.7);
        const feixes: [string, number][] = m.nivel >= 3 ? [["#ff6a6a", -6], ["#ffd23a", -3], ["#6ad46a", 0], ["#5ab0ff", 3], ["#b48aff", 6]] : [[cena.cores[0]!, 0]];
        c.lineCap = "round";
        for (const [cor, off] of feixes) {
          alfa(c, a0 * 0.45);
          c.strokeStyle = cor;
          c.lineWidth = larg * 2.2;
          c.beginPath();
          c.moveTo(18, -14 + off);
          c.lineTo(dx, dy + off);
          c.stroke();
          alfa(c, a0);
          c.lineWidth = Math.max(1, larg * (m.nivel >= 3 ? 0.5 : 1));
          c.beginPath();
          c.moveTo(18, -14 + off);
          c.lineTo(dx, dy + off);
          c.stroke();
        }
        alfa(c, a0);
        c.strokeStyle = "#ffffff";
        c.lineWidth = Math.max(1, larg * 0.35);
        c.beginPath();
        c.moveTo(18, -14);
        c.lineTo(dx, dy);
        c.stroke();
      }
      c.save();
      c.translate(dx, dy);
      espalhar(c, cena, m, k, 7, 50, 1.5, "brilho");
      c.restore();
      c.globalAlpha = a0;
    },
  },
  penhora: {
    atras: aparece(0, -40, 2.2),
    frente(c, m, k, cena) {
      // a garra que desce e agarra a moeda, e o cifrão que sobe
      const a0 = c.globalAlpha;
      const fecha = suave(lim(k / 0.35));
      alfa(c, a0 * surge(k, 0.1) * some(k, 0.6));
      c.save();
      c.translate(0, -24 + fecha * 16 - lim((k - 0.4) / 0.6) * 30);
      c.strokeStyle = "#3a2410";
      c.lineCap = "round";
      c.lineWidth = 3.2;
      c.beginPath();
      for (const lado of [-1, 0, 1]) {
        const a = lado * (0.9 - fecha * 0.6);
        c.moveTo(0, -8);
        c.quadraticCurveTo(Math.sin(a) * 16, 2, Math.sin(a) * 8, 10);
      }
      c.stroke();
      c.fillStyle = "#e8c89a";
      c.fillRect(-4, -16, 8, 9);
      c.restore();
      if (k > 0.35) desenharMotivo(c, "cifrao", 12, -16 - (k - 0.35) * 50, 1.4, cena.motivo.cores[0], cena.motivo.cores[1]);
      c.globalAlpha = a0;
      if (m.nivel >= 3 && m.principal) carimbo(c, "PENHORADO", 0, -40, k, "#b3261e", -0.2, 12);
    },
  },
  praga: {
    atras: aparece(0, -34, 2.4),
    frente(c, m, k, cena) {
      // a nuvem de gafanhotos que atravessa a tela
      const a0 = c.globalAlpha;
      alfa(c, a0 * surge(k, 0.1) * some(k, 0.8));
      for (let i = 0; i < 24; i++) {
        const x = -280 + k * 640 + (acaso(m.semente, i) - 0.5) * 160;
        const y = -70 + acaso(m.semente, i + 40) * 130 + Math.sin(k * 12 + i) * 8;
        c.save();
        c.translate(x, y);
        c.rotate(Math.sin(k * 10 + i) * 0.2);
        c.fillStyle = cena.motivo.cores[1];
        c.beginPath();
        c.ellipse(0, 0, 5, 1.8, 0, 0, TAU);
        c.fill();
        c.strokeStyle = "rgba(220,255,200,0.75)";
        c.lineWidth = 1;
        const bate = Math.sin(cena.t * 50 + i) * 3;
        c.beginPath();
        c.moveTo(0, -1);
        c.lineTo(-3, -3 - bate);
        c.moveTo(1, -1);
        c.lineTo(-1, -4 + bate);
        c.stroke();
        c.restore();
      }
      // alguns trazem as moedas da praga até o personagem
      for (let i = 0; i < 6; i++) {
        const p = suave(lim((k - i * 0.05) / 0.7));
        if (p >= 1) continue;
        const a = (i / 6) * TAU;
        const x = Math.cos(a) * 160 * (1 - p);
        const y = Math.sin(a) * 90 * (1 - p);
        c.fillStyle = cena.tema.paleta.moeda[0];
        c.beginPath();
        c.ellipse(x, y + 4, 3.5, 4.5, 0, 0, TAU);
        c.fill();
        c.fillStyle = cena.motivo.cores[1];
        c.beginPath();
        c.ellipse(x, y, 5, 1.8, Math.atan2(-y, -x), 0, TAU);
        c.fill();
      }
      if (m.nivel >= 3) {
        for (let i = 0; i < 6; i++) {
          const x = -60 + i * 26 + Math.sin(k * 5 + i) * 10;
          const y = -60 + k * 140 + acaso(m.semente, i + 70) * 30;
          desenharMotivo(c, "folha", x, y, 1.3, cena.motivo.cores[0], cena.motivo.cores[1], k * 5 + i);
        }
      }
      c.globalAlpha = a0;
    },
  },
};

/** Desenha um momento na camada pedida, com a origem na âncora dele e o tamanho `escala`. */
export function desenharMomento(c: Ctx, m: Momento, cena: CenaMomento, camada: Camada, escala = 1) {
  const def = MOMENTOS[m.id];
  const desenho = camada === "atras" ? def?.atras : def?.frente;
  if (!desenho) return;
  const k = lim(m.idade / TEXTOS_MOMENTO[m.id].dur);
  c.save();
  c.translate(m.x, m.y);
  c.scale(escala, escala);
  desenho(c, m, k, cena);
  c.restore();
}

// ---------- a mecânica enquanto o poder dura ----------

/** O que a mecânica precisa: a posição do personagem e os alvos dela, [x, y, meia abertura do vão] (ou raio), em tela. */
export interface DadosMecanica {
  x: number;
  y: number;
  /**
   * os próximos vãos (a guia), as moedas no alcance (o ímã), onde está a lupa (o Inquérito), as colunas (a geada) ou as
   * colunas arquivadas que ainda vão para a pasta (com a variante delas no 4º número)
   */
  alvos: [number, number, number, number?][];
  /** o alcance do ímã */
  raio?: number;
}

/** Curva suave que passa por todos os pontos (Catmull-Rom). */
function curvaPor(c: Ctx, pts: [number, number][]) {
  c.beginPath();
  c.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(pts.length - 1, i + 2)]!;
    c.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
}

/** A geada nas duas bordas do vão (de meia abertura `ab`), já crescida até `cresce`. Origem no centro do vão. */
function geada(c: Ctx, ab: number, cresce: number, semente: number) {
  c.fillStyle = "#e4f8ff";
  c.strokeStyle = "#5ab8d8";
  c.lineWidth = 1;
  for (const lado of [-1, 1]) {
    const borda = lado * ab;
    c.beginPath();
    for (let i = 0; i < 7; i++) {
      const x = -33 + i * 11;
      const len = (6 + acaso(semente, i + lado * 7) * 12) * cresce;
      c.moveTo(x - 4, borda);
      c.lineTo(x, borda - lado * len);
      c.lineTo(x + 4, borda);
    }
    c.fill();
    c.stroke();
  }
}

type Mecanica = (c: Ctx, nivel: number, d: DadosMecanica, cena: CenaMomento) => void;

/** O caminho que a guia vai seguir: do personagem pelo centro dos próximos vãos, tracejado e andando para a frente. */
const guia: Mecanica = (c, nivel, d, cena) => {
  if (!d.alvos.length) return;
  const pts: [number, number][] = [[d.x + 16, d.y], ...d.alvos.map(([x, y]) => [x, y] as [number, number])];
  const a0 = c.globalAlpha;
  c.save();
  c.lineCap = "round";
  if (nivel >= 5) {
    alfa(c, a0 * 0.22);
    c.strokeStyle = cena.cores[0]!;
    c.lineWidth = 14;
    curvaPor(c, pts);
    c.stroke();
  }
  c.setLineDash([9, 9]);
  c.lineDashOffset = -cena.t * 70;
  alfa(c, a0 * 0.4);
  c.strokeStyle = "#3a2410";
  c.lineWidth = 5;
  curvaPor(c, pts);
  c.stroke();
  alfa(c, a0 * 0.95);
  c.strokeStyle = cena.cores[0]!;
  c.lineWidth = 2.6;
  curvaPor(c, pts);
  c.stroke();
  c.setLineDash([]);
  // o alvo em cada vão
  for (const [x, y] of d.alvos) {
    const pulsa = 1 + Math.sin(cena.t * 6 + x * 0.01) * 0.12;
    alfa(c, a0 * 0.9);
    c.strokeStyle = cena.cores[0]!;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(x, y, 9 * pulsa, 0, TAU);
    c.stroke();
    c.fillStyle = "#ffffff";
    c.beginPath();
    c.arc(x, y, 2.5, 0, TAU);
    c.fill();
    if (nivel >= 3) desenharMotivo(c, cena.motivo.forma, x, y - 16 * pulsa, 1.1, cena.motivo.cores[0], cena.motivo.cores[1], Math.sin(cena.t * 3) * 0.3);
  }
  c.restore();
  c.globalAlpha = a0;
};

/** As linhas do ímã: de cada moeda no alcance até o personagem, tracejadas e correndo para ele. */
const ima: Mecanica = (c, nivel, d, cena) => {
  const a0 = c.globalAlpha;
  const raio = d.raio ?? 170;
  c.save();
  c.lineCap = "round";
  if (nivel >= 3) {
    alfa(c, a0 * 0.25);
    c.strokeStyle = cena.cores[0]!;
    c.lineWidth = 1.5;
    c.setLineDash([4, 8]);
    c.beginPath();
    c.arc(d.x, d.y, raio, 0, TAU);
    c.stroke();
  }
  c.setLineDash([5, 7]);
  c.lineDashOffset = cena.t * 60;
  c.strokeStyle = cena.cores[0]!;
  c.lineWidth = 2;
  for (const [x, y] of d.alvos) {
    const dist = Math.hypot(x - d.x, y - d.y);
    alfa(c, a0 * Math.max(0.15, 1 - dist / raio) * 0.9);
    // a linha faz uma curva leve, como as de um campo
    const mx = (x + d.x) / 2 + (y - d.y) * 0.15;
    const my = (y + d.y) / 2 - (x - d.x) * 0.15;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(mx, my, d.x, d.y);
    c.stroke();
    if (nivel >= 5) desenharMotivo(c, cena.motivo.forma, x, y - 14, 0.9, cena.motivo.cores[0], cena.motivo.cores[1]);
  }
  c.restore();
  c.globalAlpha = a0;
};

/** A lupa do Inquérito, vigiando a borda por onde as moedas entram, com o facho de luz. */
const lupa: Mecanica = (c, nivel, d, cena) => {
  const alvo = d.alvos[0];
  if (!alvo) return;
  const [x, y] = alvo;
  const a0 = c.globalAlpha;
  if (nivel >= 3) {
    const g = c.createLinearGradient(x, y, x - 160, y);
    g.addColorStop(0, "rgba(255,250,210,0.35)");
    g.addColorStop(1, "rgba(255,250,210,0)");
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(x - 6, y - 6);
    c.lineTo(x - 160, y - 60);
    c.lineTo(x - 160, y + 60);
    c.closePath();
    c.fill();
  }
  alfa(c, a0 * 0.95);
  desenharMotivo(c, "lupa", x, y, 3.4, "rgba(220,236,250,0.55)", cena.motivo.cores[1], Math.sin(cena.t * 2) * 0.2 + 0.4);
  c.globalAlpha = a0;
};

/** A geada nas colunas paradas enquanto o Trânsito em Julgado dura. */
const geadaNasColunas: Mecanica = (c, nivel, d) => {
  const a0 = c.globalAlpha;
  alfa(c, a0 * 0.8);
  for (const [x, y, ab] of d.alvos) {
    c.save();
    c.translate(x, y);
    geada(c, ab, nivel >= 3 ? 1 : 0.7, Math.round(y));
    c.restore();
  }
  c.globalAlpha = a0;
};

/** A coluna arquivada, que não conta mais para o jogo: um fantasma tracejado até chegar a vez de ir para a pasta. */
const arquivadas: Mecanica = (c, nivel, d, cena) => {
  const a0 = c.globalAlpha;
  for (const [x, y, ab, variante] of d.alvos) {
    const m: Momento = { id: "arquivamento", x, y, idade: 0, nivel, principal: false, ab, variante, semente: 0 };
    c.save();
    c.translate(x, y);
    alfa(c, a0 * 0.3);
    pecasDaColuna(c, m, cena);
    alfa(c, a0 * 0.8);
    c.strokeStyle = cena.cores[0]!;
    c.lineWidth = 2;
    c.setLineDash([7, 5]);
    c.lineDashOffset = -cena.t * 30;
    c.strokeRect(-37, -y - 20, 74, y - ab + 20);
    c.strokeRect(-37, ab, 74, cena.altura - y - ab);
    c.setLineDash([]);
    c.restore();
  }
  c.globalAlpha = a0;
};

const MECANICAS: Partial<Record<IdPoder, Mecanica>> = { leve: guia, voo: guia, ima, eco: ima, tesouro: ima, inquerito: lupa, congelar: geadaNasColunas, arquivamento: arquivadas };

/** O poder tem uma mecânica para desenhar enquanto dura? */
export const temMecanica = (id: IdPoder) => id in MECANICAS;

/** Desenha a mecânica do poder `id` enquanto ele dura (a partir do nível 1 do Visual). */
export function desenharMecanica(c: Ctx, id: IdPoder, nivel: number, d: DadosMecanica, cena: CenaMomento) {
  const f = MECANICAS[id];
  if (!f || nivel < 1) return;
  c.save();
  f(c, nivel, d, cena);
  c.restore();
}
