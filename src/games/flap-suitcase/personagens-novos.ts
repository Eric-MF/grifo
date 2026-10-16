// Os 14 personagens novos do Flap Suitcase, desenhados em vetor como o Grifo: caminhos SVG em Path2D, cores do
// tema (a maleta pinta o corpo, a asa pinta as penas), contorno na cor mais escura do tema e sombras suaves.
// Coordenadas: origem no centro do corpo, y para baixo, de frente para a direita (o sentido do voo). Cada
// desenho cabe em x entre −35 e +35 e y entre −45 e +25.

import type { Ctx, Tema } from "./themes";

type Desenho = (c: Ctx, tema: Tema, fase: number, t: number, poder: boolean, semAsas?: boolean) => void;
type Ponto = readonly [number, number];

// ---------------------------------------------------------------------------
// Cores
// ---------------------------------------------------------------------------
function rgb(cor: string): [number, number, number] {
  const v = cor.replace("#", "");
  const n = parseInt(v.length === 3 ? v.split("").map((x) => x + x).join("") : v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const misturas = new Map<string, string>();
/** Mistura duas cores hexadecimais (k = 0 dá `a`, k = 1 dá `b`); devolve hexadecimal, para poder misturar de novo. */
function mistura(a: string, b: string, k: number) {
  const chave = `${a}|${b}|${k}`;
  let cor = misturas.get(chave);
  if (!cor) {
    const [r1, g1, b1] = rgb(a);
    const [r2, g2, b2] = rgb(b);
    const f = (x: number, y: number) => Math.round(x + (y - x) * k);
    cor = `#${((1 << 24) | (f(r1, r2) << 16) | (f(g1, g2) << 8) | f(b1, b2)).toString(16).slice(1)}`;
    misturas.set(chave, cor);
  }
  return cor;
}

/** Luminosidade de 0 (preto) a 1 (branco). */
function luz(cor: string) {
  const [r, g, b] = rgb(cor);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/**
 * Cor fixa pedida pelo conceito (fogo, tomate, inseto). Nos estilos monocromáticos ela não destoa:
 * vira cinza no Noir e sépia de nanquim no Papiro, com a mesma luminosidade.
 */
function acento(tema: Tema, cor: string) {
  if (tema.id !== "noir" && tema.id !== "papiro") return cor;
  const l = luz(cor);
  if (tema.id === "noir") return mistura("#282828", "#f0f0f0", l);
  return mistura(tema.paleta.maleta.escuro, tema.paleta.asa.cor, Math.min(1, l * 1.15));
}

// ---------------------------------------------------------------------------
// Caminhos: cada bloco de dados vira Path2D na primeira vez que é desenhado e fica guardado
// ---------------------------------------------------------------------------
const guardados = new WeakMap<object, Record<string, Path2D>>();
function caminhos<K extends string>(dados: Record<K, string>): Record<K, Path2D> {
  let p = guardados.get(dados);
  if (!p) {
    p = Object.fromEntries(Object.entries<string>(dados).map(([k, d]) => [k, new Path2D(d)]));
    guardados.set(dados, p);
  }
  return p as Record<K, Path2D>;
}

const num = (v: number) => Math.round(v * 100) / 100;

/** Caminho de uma linha quebrada (pernas): "M x y L x y ...". */
const linha = (pts: readonly Ponto[]) => pts.map(([x, y], i) => `${i ? "L" : "M"} ${x} ${y}`).join(" ");

/** Penas pontudas em leque, saindo de (cx, cy), da direção `de` até `ate` (graus); as alternadas são mais curtas. */
function leque(cx: number, cy: number, raio: number, de: number, ate: number, n: number, larg: number) {
  let d = "";
  for (let i = 0; i < n; i++) {
    const ang = ((de + ((ate - de) * i) / (n - 1)) * Math.PI) / 180;
    const r = raio * (i % 2 ? 0.8 : 1);
    const [cos, sen] = [Math.cos(ang), Math.sin(ang)];
    const [mx, my] = [cx + cos * r * 0.45, cy + sen * r * 0.45];
    const [nx, ny] = [-sen * larg, cos * larg];
    d += `M ${cx} ${cy} Q ${num(mx + nx)} ${num(my + ny)} ${num(cx + cos * r)} ${num(cy + sen * r)} Q ${num(mx - nx)} ${num(my - ny)} ${cx} ${cy} Z `;
  }
  return d;
}

/** Ponto e direção numa curva de Bézier cúbica (para enfileirar espinhos ao longo da cauda). */
function bezier(p0: Ponto, p1: Ponto, p2: Ponto, p3: Ponto, t: number) {
  const u = 1 - t;
  const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
  const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
  const dx = 3 * u * u * (p1[0] - p0[0]) + 6 * u * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
  const dy = 3 * u * u * (p1[1] - p0[1]) + 6 * u * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
  return { x, y, ang: Math.atan2(dy, dx) };
}

/**
 * Moldura da sombra de borda: um retângulo grande com a forma deslocada vazada (regra par-ímpar). Recortada
 * pela própria forma, sobra só a faixa da borda oposta ao deslocamento. Fica guardada por forma e deslocamento.
 */
const molduras = new WeakMap<Path2D, Map<string, Path2D>>();
function moldura(forma: Path2D, dx: number, dy: number) {
  let porForma = molduras.get(forma);
  if (!porForma) molduras.set(forma, (porForma = new Map()));
  const chave = `${dx},${dy}`;
  let p = porForma.get(chave);
  if (!p) {
    p = new Path2D();
    p.rect(-90, -90, 180, 180);
    p.addPath(forma, new DOMMatrix([1, 0, 0, 1, dx, dy]));
    porForma.set(chave, p);
  }
  return p;
}

// ---------------------------------------------------------------------------
// Pincéis: as operações de pintura de todos os personagens
// ---------------------------------------------------------------------------
function pincel(c: Ctx, tema: Tema) {
  const m = tema.paleta.maleta;
  const a = tema.paleta.asa;
  const traco = (p: Path2D, cor: string, largura: number) => {
    c.strokeStyle = cor;
    c.lineWidth = largura;
    c.stroke(p);
  };
  const enche = (p: Path2D, cor: string) => {
    c.fillStyle = cor;
    c.fill(p);
  };
  /** pinta o caminho em construção (beginPath já feito) com contorno escuro */
  const fecha = (cor: string, largura = 1.6) => {
    c.fillStyle = cor;
    c.fill();
    c.strokeStyle = m.escuro;
    c.lineWidth = largura;
    c.stroke();
  };
  const papel = mistura(a.cor, "#ffffff", 0.6);
  return {
    m,
    a,
    /** folha de papel no tom do tema */
    papel,
    /** membrana de asa sem penas (morcego, dragão, pterossauro) */
    membrana: mistura(a.cor, a.contorno, 0.55),
    /** tinta para detalhes sobre `fundo`: a escura do tema, ou o papel quando o fundo já é escuro (Papiro) */
    contraste: (fundo: string) => (luz(fundo) < 0.4 ? papel : m.escuro),
    traco,
    enche,
    fecha,
    pinta(p: Path2D, cor: string, largura = 1.8) {
      enche(p, cor);
      traco(p, m.escuro, largura);
    },
    /** membro em traço duplo (contorno e cor), como a cauda do Grifo */
    membro(p: Path2D, cor: string, largura: number) {
      traco(p, m.escuro, largura + 3);
      traco(p, cor, largura);
    },
    /** escurece a forma inteira (o lado de lá do corpo) */
    escurece(p: Path2D, forca = 0.22) {
      enche(p, `rgba(40,20,0,${forca})`);
    },
    /** sombra suave: a mancha, recortada pela forma */
    sombra(forma: Path2D, mancha: Path2D, forca = 0.22) {
      c.save();
      c.clip(forma);
      enche(mancha, `rgba(40,20,0,${forca})`);
      c.restore();
    },
    /** sombra suave na borda de baixo da forma (luz vinda de cima e da frente) */
    sombraBorda(forma: Path2D, forca = 0.18, dx = 1, dy = -2.6) {
      c.save();
      c.clip(forma);
      c.fillStyle = `rgba(40,20,0,${forca})`;
      c.fill(moldura(forma, dx, dy), "evenodd");
      c.restore();
    },
    /** olho; com `branco`, ganha a esclera clara (para não sumir em cabeça escura, como no Noir) */
    olho(x: number, y: number, r = 2.4, branco = false) {
      if (branco) {
        c.beginPath();
        c.arc(x - r * 0.25, y, r * 1.5, 0, Math.PI * 2);
        fecha(papel, 1);
      }
      c.fillStyle = "#1b1408";
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.arc(x + r * 0.35, y - r * 0.35, r * 0.36, 0, Math.PI * 2);
      c.fill();
    },
    circulo(x: number, y: number, r: number, cor: string, largura = 1.6) {
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      fecha(cor, largura);
    },
    /** casco na ponta da perna, alinhado com o último trecho dela */
    casco(perna: readonly Ponto[], cor: string) {
      const [x0, y0] = perna[perna.length - 2];
      const [x1, y1] = perna[perna.length - 1];
      c.save();
      c.translate(x1, y1);
      c.rotate(Math.atan2(y1 - y0, x1 - x0));
      c.beginPath();
      c.roundRect(-2.8, -3.1, 4.4, 6.2, 1.2);
      fecha(cor, 1.4);
      c.restore();
    },
    /** gira o que `desenho` pinta em torno de (px, py) */
    gira(px: number, py: number, ang: number, desenho: () => void) {
      c.save();
      c.translate(px, py);
      c.rotate(ang);
      c.translate(-px, -py);
      desenho();
      c.restore();
    },
    /** moeda deitada (elipse com espessura), nas cores das moedas do tema */
    moedaDeitada(x: number, y: number, r: number) {
      const [ouro, borda] = tema.paleta.moeda;
      c.beginPath();
      c.ellipse(x, y + 1.1, r, r * 0.42, 0, 0, Math.PI * 2);
      fecha(borda, 1.2);
      c.beginPath();
      c.ellipse(x, y, r, r * 0.42, 0, 0, Math.PI * 2);
      fecha(ouro, 1.2);
    },
    /** moeda de frente, com aro */
    moedaEmPe(x: number, y: number, r: number, inclina = 1) {
      const [ouro, borda] = tema.paleta.moeda;
      c.beginPath();
      c.ellipse(x, y, r * inclina, r, 0, 0, Math.PI * 2);
      fecha(ouro, 1.3);
      c.strokeStyle = borda;
      c.lineWidth = 1;
      c.beginPath();
      c.ellipse(x, y, r * inclina * 0.6, r * 0.6, 0, 0, Math.PI * 2);
      c.stroke();
    },
  };
}

/** Abre o desenho: estado salvo, juntas arredondadas. */
function comeca(c: Ctx) {
  c.save();
  c.lineJoin = "round";
  c.lineCap = "round";
}

// ---------------------------------------------------------------------------
// 1. Peçasus: cavalo alado em galope no ar, de couro escuro (o Súmulicórnio usa o mesmo cavalo)
// ---------------------------------------------------------------------------
const PF_LONGE: Ponto[] = [[10, 4], [16, 10], [13.5, 16]];
const PT_LONGE: Ponto[] = [[-13, 4], [-19, 11], [-24, 16]];
const PF: Ponto[] = [[6, 4], [12, 12], [8.5, 18]];
const PT: Ponto[] = [[-9, 4], [-13, 13], [-19, 19]];
const PECASUS = {
  asa: "M 4 -9 C 6 -21 4 -31 -3 -40 C -6 -37 -9 -36 -12 -38 C -13 -33 -16 -31 -19 -33 C -19 -28 -22 -26 -25 -27 C -24 -22 -26 -20 -29 -20 C -22 -13 -12 -9.5 -3 -8 Z",
  asaSombra: "M -3 -8 C -12 -9.5 -22 -13 -29 -20 C -23 -18 -16 -15 -9 -12.5 C -5 -11 -1 -10.2 2 -9.5 Z",
  penas: "M -12 -38 C -9 -29 -5 -19 0 -10 M -19 -33 C -14 -24 -8 -15.5 -2 -9.5 M -25 -27 C -18 -20 -11 -13.5 -4 -9",
  cauda: "M -18 -5 C -26 -9 -33 -5 -33 2 C -33 7 -30 11 -34 16 C -27 16 -24 11 -24 6 C -24 3 -22 1 -18 1 Z",
  caudaFios: "M -21 -3 C -26 -5 -30 -2 -30 3 M -22 0 C -25 1 -27 4 -27 8",
  pernaFrenteLonge: linha(PF_LONGE),
  pernaTrasLonge: linha(PT_LONGE),
  pernaFrente: linha(PF),
  pernaTras: linha(PT),
  corpo: "M -19 -1 C -20 -8 -13 -11 -5 -10 L 5 -10 C 11 -10 15 -6 14 0 C 13 6 9 9 3 9 L -11 9 C -17 9 -19 5 -19 -1 Z",
  barriga: "M -22 4 C -12 9 4 9 18 2 L 18 14 L -22 14 Z",
  pescoco: "M 1 -9 C 3 -17 8 -25 15 -29 L 23 -22 C 19 -16 16 -9 14 -3 Z",
  crina: "M 17 -32 C 12 -33.5 8 -31 7 -28 C 4 -27.5 2.5 -24.5 3.5 -22 C 0.5 -21 -0.5 -17.5 1 -15 C -1.5 -14 -2 -10.5 0 -9 L 3 -9 C 5 -16 9 -24 16 -28 Z",
  crinaFios: "M 12.5 -29.5 C 9.5 -27.5 7 -24.5 6 -21.5 M 6 -19 C 4.5 -16.5 3.5 -14 3 -11.5",
  cabeca: "M 13 -27 C 14 -32 19 -34 23 -31 L 31 -22 C 34 -19 33 -14 29 -14 C 26 -14 24 -15 21 -17 C 16 -19 12 -22 13 -27 Z",
  orelha: "M 15 -30 L 15.5 -37 L 20 -31.5 Z",
  narina: "M 29 -18.5 C 30 -18 30.5 -17 30 -16",
  boca: "M 26.5 -14.6 C 28 -15.2 29.5 -15.4 31 -15.2",
};

// chifre do Súmulicórnio, na testa do cavalo: uma folha enrolada em cone, com a costura da espiral
const CHIFRE_UNICORNIO = {
  chifre: "M 14.6 -31.2 L 23.8 -42.6 L 20 -29.2 Z",
  espiral: "M 15.8 -32.4 Q 18.3 -32.2 20.1 -30.4 M 17.5 -34.9 Q 19.6 -34.7 21.1 -33.2 M 19.2 -37.4 Q 20.9 -37.2 21.9 -36 M 20.9 -39.9 Q 22.1 -39.7 22.7 -38.8",
  folha: "M 20 -29.2 C 21.5 -30.5 23.5 -30.2 23.6 -28.6 C 23.7 -27.4 22.2 -27 21.6 -28 Z",
};

/**
 * Cavalo alado em galope no ar. O Peçasus tem o lombo de couro escuro; o Súmulicórnio é o mesmo cavalo, de pelagem
 * clara, crina de cores e chifre espiral na testa.
 */
function cavalo(c: Ctx, tema: Tema, fase: number, unicornio: boolean) {
  const P = caminhos(PECASUS);
  const k = pincel(c, tema);
  const { m, a } = k;
  const bate = Math.sin(fase) * 0.28;
  const corpo = unicornio ? mistura(a.cor, "#ffffff", 0.5) : m.corpo;
  const crina = unicornio ? mistura(m.corpo, a.cor, 0.55) : m.escuro;
  const longe = mistura(corpo, m.escuro, 0.3);
  comeca(c);
  const asa = () => {
    k.pinta(P.asa, a.cor);
    k.enche(P.asaSombra, a.contorno);
    k.traco(P.penas, a.contorno, 1.4);
    k.traco(P.asa, m.escuro, 1.8);
  };
  // asa do lado de lá, um pouco à frente e na sombra
  c.save();
  c.translate(6, -2);
  k.gira(1, -9, bate, () => {
    asa();
    k.escurece(P.asa, 0.14);
  });
  c.restore();
  k.membro(P.pernaFrenteLonge, longe, 3.8);
  k.membro(P.pernaTrasLonge, longe, 3.8);
  k.casco(PF_LONGE, m.escuro);
  k.casco(PT_LONGE, m.escuro);
  k.pinta(P.cauda, crina);
  k.traco(P.caudaFios, m.corpo, 1.2);
  k.membro(P.pernaFrente, corpo, 3.8);
  k.membro(P.pernaTras, corpo, 3.8);
  k.casco(PF, m.escuro);
  k.casco(PT, m.escuro);
  k.pinta(P.corpo, corpo);
  k.sombra(P.corpo, P.barriga);
  k.gira(1, -9, bate, asa);
  k.pinta(P.pescoco, corpo);
  k.pinta(P.crina, crina);
  k.traco(P.crinaFios, m.corpo, 1.2);
  k.pinta(P.orelha, corpo, 1.5);
  k.pinta(P.cabeca, corpo);
  if (unicornio) {
    const chifre = caminhos(CHIFRE_UNICORNIO);
    k.pinta(chifre.chifre, k.papel, 1.5);
    k.traco(chifre.espiral, m.escuro, 1);
    k.pinta(chifre.folha, mistura(k.papel, m.fivela, 0.45), 1.1);
  }
  k.traco(P.narina, m.escuro, 1.2);
  k.traco(P.boca, m.escuro, 1.2);
  k.olho(21.5, -25.5, 1.9, true);
  c.restore();
}

function pecasus(c: Ctx, tema: Tema, fase: number) {
  cavalo(c, tema, fase, false);
}

// ---------------------------------------------------------------------------
// 2. Gabaruda: ave de rapina de frente, asas abertas em V largo, segurando o gabarito com as garras
// ---------------------------------------------------------------------------
const GABARUDA = {
  // asa direita, com a raiz no ombro (0,0); a esquerda é o espelho
  asa: "M -2 -2 C 3 -10 10 -19 16 -27 C 16 -31 18 -34 21 -33 C 21 -30 22 -29 23 -30 C 24 -33 27 -33 27 -30 C 27 -28 27 -27 28 -27 C 30 -28 32 -26 30 -23 L 29 -22 C 31 -21 32 -18 29 -17 C 20 -12 10 -4 2 4 Z",
  asaCobertura: "M -2 -2 C 3 -10 9 -17 14 -24 C 14 -16 10 -8 4 -1 C 2 1 0 1 -2 -2 Z",
  penas: "M 19 -27 C 14 -20 8 -12 2 -4 M 25 -26 C 18 -19 11 -11 4 -2 M 28 -20 C 20 -14 12 -7 5 0",
  corpo: "M 0 -16 C 8 -16 11.5 -8 11 0 C 10.5 7 6 11 0 11 C -6 11 -10.5 7 -11 0 C -11.5 -8 -8 -16 0 -16 Z",
  peito: "M 0 -9 C 5.5 -9 8 -4 7.5 1 C 7 6 3.5 9 0 9 C -3.5 9 -7 6 -7.5 1 C -8 -4 -5.5 -9 0 -9 Z",
  escamas: "M -4.5 -3 Q -2.2 -0.8 0 -3 Q 2.2 -0.8 4.5 -3 M -3.4 2.2 Q -1.7 4.2 0 2.2 Q 1.7 4.2 3.4 2.2",
  pernas: "M -4 8 L -5 11.5 M 4 8 L 5 11.5",
  dedos: "M -8 10.5 C -7 9 -4 9 -2.5 10.5 C -4 12 -7 12 -8 10.5 Z M 2.5 10.5 C 4 9 7 9 8 10.5 C 7 12 4 12 2.5 10.5 Z",
  unhas: "M -7.3 11.3 L -7.6 13.1 M -5.3 11.8 L -5.3 13.5 M -3.4 11.4 L -3.1 13.1 M 3.4 11.4 L 3.1 13.1 M 5.3 11.8 L 5.3 13.5 M 7.3 11.3 L 7.6 13.1",
  tufo: "M -1 -30 C -6 -33 -9 -37 -8 -42 C -4 -40 -1 -36 1 -32 Z M 1 -31 C -1 -35 0 -40 3 -43.5 C 5 -39 4 -35 3 -31 Z M 3 -31 C 5 -35 8 -38 12 -39 C 10 -35 7 -32 5 -30 Z",
  cabeca: "M -6 -12 C -9 -20 -6 -30 2 -32 C 8 -34 14 -31 15 -26 L 15 -20 C 13 -16 10 -14 7 -13 L 6 -10 L 3 -13 L 0 -9 L -2 -13 L -5 -9 Z",
  bico: "M 12 -29 C 18 -31 24 -27 23 -19 C 23 -17 21 -16 20 -17 C 20 -20 18 -21 13 -21 Z",
  boca: "M 14 -21 L 19 -20",
  sobrancelha: "M 2 -29 L 12 -27.5 L 11 -25.8 L 3 -27.5 Z",
};

function gabaruda(c: Ctx, tema: Tema, fase: number) {
  const P = caminhos(GABARUDA);
  const k = pincel(c, tema);
  const { m, a } = k;
  const bate = Math.sin(fase) * 0.18;
  comeca(c);
  for (const lado of [-1, 1]) {
    c.save();
    c.translate(lado * 4, -7);
    c.scale(lado * 0.86, 0.86);
    c.rotate(-bate);
    k.pinta(P.asa, a.cor);
    k.enche(P.asaCobertura, m.corpo);
    k.traco(P.penas, a.contorno, 1.3);
    k.traco(P.asa, m.escuro, 1.9);
    c.restore();
  }
  k.pinta(P.corpo, m.corpo);
  k.sombraBorda(P.corpo);
  k.enche(P.peito, mistura(m.corpo, a.cor, 0.35));
  k.traco(P.escamas, m.escuro, 1);
  k.membro(P.pernas, m.fivela, 2.4);
  // gabarito: bolhas marcadas e o visto de certo
  c.save();
  c.translate(0, 17.6);
  c.rotate(-0.05);
  c.beginPath();
  c.rect(-8.5, -6.8, 17, 12.9);
  k.fecha(k.papel, 1.5);
  c.fillStyle = mistura(k.papel, m.escuro, 0.3);
  c.fillRect(-7.5, -6, 15, 2);
  c.lineWidth = 0.8;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 2; j++) {
      c.beginPath();
      c.arc(-5.2 + j * 3, -1 + i * 3.1, 1.1, 0, Math.PI * 2);
      c.strokeStyle = m.escuro;
      if ((i + j) % 2 === 0) {
        c.fillStyle = m.escuro;
        c.fill();
      }
      c.stroke();
    }
  }
  c.strokeStyle = m.escuro;
  c.lineWidth = 3.2;
  c.beginPath();
  c.moveTo(0.5, 1.5);
  c.lineTo(3, 4.6);
  c.lineTo(7.4, -2.6);
  c.stroke();
  c.strokeStyle = acento(tema, "#2f9e55");
  c.lineWidth = 1.5;
  c.stroke();
  c.restore();
  k.pinta(P.dedos, m.fivela, 1.3);
  k.traco(P.unhas, m.escuro, 1.2);
  k.pinta(P.tufo, m.fivela, 1.5);
  k.pinta(P.cabeca, a.cor);
  k.pinta(P.bico, m.fivela);
  k.traco(P.boca, m.escuro, 1.3);
  k.enche(P.sobrancelha, m.escuro);
  k.olho(7.5, -25, 2.4);
  c.restore();
}

// ---------------------------------------------------------------------------
// 3. Fênixame: fênix pequena de asas e cauda em labaredas, com a folha da prova
// ---------------------------------------------------------------------------
const FENIXAME = {
  asaFogo: "M 5 -6 C 8 -18 6 -30 -2 -43 C -1 -37 -3 -34 -6 -32 C -8 -36 -12 -38 -17 -39 C -13 -34 -13 -30 -14 -27 C -17 -29 -22 -30 -27 -29 C -22 -25 -20 -22 -19 -19 C -22 -19 -26 -17 -28 -14 C -20 -10 -12 -7 -3 -4 Z",
  asaPenas: "M 5 -6 C 6 -12 5 -17 2 -21 C -3 -18 -7 -13 -10 -8 C -7 -6 -4 -5 -1 -5 Z",
  caudaFogo: "M -8 -1 C -15 -2 -22 -6 -27 -12 C -26 -8 -25 -6 -23 -4 C -27 -5 -30.5 -4 -33.5 -1 C -30.5 0 -28 2 -26 4 C -29 5 -31 8 -32 12 C -27 10 -23 9 -19 9 C -21 11 -22 14 -21 18 C -17 13 -13 10 -8 6 Z",
  corpo: "M -9 3 C -10 -5 -3 -10 5 -9 C 10 -8 12 -3 10 2 C 8 7 2 9 -3 8 C -7 7 -9 5 -9 3 Z",
  peito: "M 9 -6 C 12 -2 11 3 8 6 C 5 8 1 9 -2 8 C 3 5 7 0 9 -6 Z",
  cabeca: "M 3 -8 C 2 -15 5 -21 11 -22 C 16 -22 19 -18 18 -13 C 17 -9 13 -6 9 -6 Z",
  crista: "M 5 -20 C 1 -23 0 -27 1 -31 C 3 -28 5 -27 7 -26 C 6 -30 7 -33 10 -36 C 10 -32 11 -30 13 -28 C 13 -31 15 -33 18 -34 C 16 -30 16 -26 15 -21 Z",
  bico: "M 17 -17 C 21 -17 23 -14 22 -11 C 21 -12 19 -13 17 -13 Z",
  pernas: "M 0 7 L -1 11.5 M 4 7 L 5 11.5",
};

function fenixame(c: Ctx, tema: Tema, fase: number, t: number) {
  const P = caminhos(FENIXAME);
  const k = pincel(c, tema);
  const { m, a } = k;
  const fogo = acento(tema, "#f26b1d");
  const brasa = acento(tema, "#ffc93c");
  const bate = Math.sin(fase) * 0.25;
  // as labaredas tremulam com o tempo
  const treme = (desvio: number) => 1 + Math.sin(t * 13 + desvio) * 0.05;
  const labareda = (p: Path2D, px: number, py: number, s: number) => {
    k.pinta(p, fogo, 1.5);
    c.save();
    c.translate(px, py);
    c.scale(0.62 * s, 0.62 * s);
    c.translate(-px, -py);
    k.enche(p, brasa);
    c.restore();
  };
  comeca(c);
  c.translate(3, 0);
  k.gira(-8, 2, Math.sin(t * 9) * 0.04, () => labareda(P.caudaFogo, -8, 2, treme(1)));
  k.pinta(P.corpo, m.corpo);
  k.sombraBorda(P.corpo);
  k.enche(P.peito, mistura(m.corpo, a.cor, 0.45));
  k.membro(P.pernas, m.fivela, 1.6);
  // folha da prova, presa nas patas: cabeçalho, linhas e o círculo da nota
  c.save();
  c.translate(2, 16.8);
  c.rotate(0.08);
  c.beginPath();
  c.rect(-7.5, -6.5, 15, 13);
  k.fecha(k.papel, 1.5);
  c.strokeStyle = m.escuro;
  c.lineWidth = 0.9;
  c.beginPath();
  c.moveTo(-5.5, -3.8);
  c.lineTo(1, -3.8);
  for (let i = 0; i < 4; i++) {
    c.moveTo(-5.5, -0.6 + i * 2.2);
    c.lineTo(i === 3 ? 1.5 : 5.5, -0.6 + i * 2.2);
  }
  c.stroke();
  c.beginPath();
  c.arc(4, -3.6, 2, 0, Math.PI * 2);
  c.strokeStyle = fogo;
  c.lineWidth = 1.2;
  c.stroke();
  c.restore();
  for (const x of [-1.5, 5.3]) {
    c.beginPath();
    c.ellipse(x, 11.5, 2, 1.2, 0, 0, Math.PI * 2);
    k.fecha(m.fivela, 1.1);
  }
  // asa: penas claras junto ao corpo, labaredas na ponta
  k.gira(2, -6, bate, () => {
    labareda(P.asaFogo, 0, -8, treme(0));
    k.pinta(P.asaPenas, a.cor, 1.4);
  });
  c.save();
  c.translate(9, -21);
  c.scale(1, treme(2));
  c.translate(-9, 21);
  labareda(P.crista, 9, -21, 1);
  c.restore();
  k.pinta(P.cabeca, m.corpo);
  k.sombraBorda(P.cabeca, 0.14);
  k.pinta(P.bico, m.fivela, 1.5);
  k.olho(12.8, -15.5, 1.9, true);
  c.restore();
}

// ---------------------------------------------------------------------------
// 4. Corujuris: coruja redonda de olhos em disco, lendo o livro grosso de jurisprudência
// ---------------------------------------------------------------------------
const CORUJURIS = {
  orelhas: "M -15 -24 L -19.5 -38 L -8 -30 Z M 15 -24 L 19.5 -38 L 8 -30 Z",
  corpo: "M -16 -22 C -16 -30 -9 -32 0 -32 C 9 -32 16 -30 16 -22 C 20 -12 21 4 14 13 C 8 19 -8 19 -14 13 C -21 4 -20 -12 -16 -22 Z",
  barriga: "M 0 -8 C 8 -8 12 -2 12 5 C 12 11 7 15 0 15 C -7 15 -12 11 -12 5 C -12 -2 -8 -8 0 -8 Z",
  pintas: "M -6 -4 L -4 -2 L -2 -4 M 2 -4 L 4 -2 L 6 -4",
  disco: "M 0 -26 C -4 -30 -16 -30 -16 -19 C -16 -10 -7 -8 0 -12 C 7 -8 16 -10 16 -19 C 16 -30 4 -30 0 -26 Z",
  bico: "M -2.6 -15.5 L 2.6 -15.5 L 0 -9.5 Z",
  // asa direita, raiz no ombro (0,0)
  asa: "M -1 -3 C 6 -5 12 0 14 10 C 12 13 9 15 6 15 C 2 11 -1 5 -1 -3 Z",
  asaPenas: "M 4 1 C 7 5 9 9 10 13 M 1 4 C 3 8 5 11 7 14",
  // livro aberto: capa por baixo, o bloco das folhas (a grossura) e as duas páginas
  capa: "M 0 -3 C -5 -6 -11 -6 -16.5 -4 L -16.5 8 C -11 6 -5 6 0 9 C 5 6 11 6 16.5 8 L 16.5 -4 C 11 -6 5 -6 0 -3 Z",
  bloco: "M 0 -6 C -5 -9 -10 -9 -15 -7 L -15 4.5 C -10 2.5 -5 2.5 0 5.5 C 5 2.5 10 2.5 15 4.5 L 15 -7 C 10 -9 5 -9 0 -6 Z",
  paginas: "M 0 -7 C -4 -10 -9.5 -10 -14.5 -8 L -14.5 3 C -9.5 1 -4 1 0 4 C 4 1 9.5 1 14.5 3 L 14.5 -8 C 9.5 -10 4 -10 0 -7 Z",
  lombada: "M 0 -7 L 0 4",
  linhas: "M -2.5 -5.6 C -5.5 -7.4 -8.5 -7.4 -12 -6.4 M -2.5 -2.8 C -5.5 -4.6 -8.5 -4.6 -12 -3.6 M -2.5 0 C -5.5 -1.8 -8.5 -1.8 -12 -0.8 M 2.5 -5.6 C 5.5 -7.4 8.5 -7.4 12 -6.4 M 2.5 -2.8 C 5.5 -4.6 8.5 -4.6 12 -3.6 M 2.5 0 C 4.5 -1.2 6.5 -1.5 8.5 -1.2",
  pes: "M -9.5 14.5 C -8.5 13 -5 13 -4 14.5 C -5 16 -8.5 16 -9.5 14.5 Z M 4 14.5 C 5 13 8.5 13 9.5 14.5 C 8.5 16 5 16 4 14.5 Z",
};

function corujuris(c: Ctx, tema: Tema, fase: number, _t: number, poder: boolean) {
  const P = caminhos(CORUJURIS);
  const k = pincel(c, tema);
  const { m, a } = k;
  const bate = Math.sin(fase) * 0.35;
  comeca(c);
  for (const lado of [-1, 1]) {
    c.save();
    c.translate(lado * 15, -10);
    c.scale(lado, 1);
    c.rotate(-0.1 - bate);
    k.pinta(P.asa, a.cor);
    k.traco(P.asaPenas, a.contorno, 1.3);
    k.traco(P.asa, m.escuro, 1.8);
    c.restore();
  }
  k.pinta(P.orelhas, m.corpo, 1.6);
  k.pinta(P.corpo, m.corpo);
  k.sombraBorda(P.corpo, 0.16, 1.5, -3.5);
  k.enche(P.barriga, mistura(m.corpo, a.cor, 0.55));
  k.traco(P.pintas, m.escuro, 1.1);
  k.pinta(P.disco, a.cor, 1.6);
  for (const lado of [-1, 1]) {
    k.circulo(lado * 7, -19, 5.4, m.fivela, 1.5);
    if (poder) {
      // olhos fechados enquanto a sabedoria da noite está ativa
      c.beginPath();
      c.moveTo(lado * 7 - 3.6, -19.5);
      c.quadraticCurveTo(lado * 7, -16.2, lado * 7 + 3.6, -19.5);
      c.strokeStyle = m.escuro;
      c.lineWidth = 1.7;
      c.stroke();
    } else k.olho(lado * 7 + 0.8, -19, 3);
  }
  k.pinta(P.bico, m.fivela, 1.3);
  // livro aberto e grosso, com fitas marcadoras pendendo da lombada
  c.save();
  c.translate(0, 10);
  c.rotate(-0.05);
  c.scale(0.86, 0.86);
  for (const [x0, x1, y1, cor] of [[-1.4, -3.6, 12.5, m.fivela], [0, 0.6, 14, acento(tema, "#c0392b")], [1.4, 3.8, 12, a.contorno]] as const) {
    c.beginPath();
    c.moveTo(x0 - 0.9, 5);
    c.lineTo(x1 - 0.9, y1);
    c.lineTo(x1, y1 - 1.3);
    c.lineTo(x1 + 0.9, y1);
    c.lineTo(x0 + 0.9, 5);
    c.closePath();
    k.fecha(cor, 0.9);
  }
  k.pinta(P.capa, mistura(m.alca, m.fivela, 0.2), 1.6);
  c.save();
  c.translate(0, 2.4);
  k.pinta(P.bloco, mistura(k.papel, a.contorno, 0.3), 1.1);
  c.translate(0, -1.2);
  k.pinta(P.bloco, k.papel, 1.1);
  c.restore();
  k.pinta(P.paginas, k.papel, 1.5);
  k.traco(P.linhas, a.contorno, 0.9);
  k.traco(P.lombada, m.escuro, 1.2);
  c.restore();
  k.pinta(P.pes, m.fivela, 1.2);
  c.restore();
}

// ---------------------------------------------------------------------------
// 5. Dracofisco: dragãozinho sentado no monte de moedas, com distintivo do fisco no peito
// ---------------------------------------------------------------------------
const CAUDA_DRACO: [Ponto, Ponto, Ponto, Ponto] = [[-6, 9], [-14, 14], [-24, 12], [-27, 4]];
const DRACOFISCO = {
  asa: "M -4 -9 L -9 -30 L -26.5 -34.5 Q -23.5 -28 -29 -23 Q -23.5 -18 -24.5 -12 Q -17.5 -13 -11 -7 Z",
  asaOssos: "M -4 -9 L -9 -30 L -26.5 -34.5 M -9 -30 L -29 -23 M -9 -30 L -24.5 -12",
  polegar: "M -9 -30 L -6 -35 L -11 -32 Z",
  cauda: `M ${CAUDA_DRACO[0].join(" ")} C ${CAUDA_DRACO.slice(1).flat().join(" ")}`,
  monte: "M -22 23 C -20 14.5 -12 10.5 0 10.5 C 12 10.5 20 14.5 22 23 Z",
  corpo: "M -11 10 C -15 0 -11 -12 -1 -14 C 7 -15 12 -9 12 -1 C 12 6 9 10 4 11 Z",
  barriga: "M 3 -11 C 8 -9 11 -3 10 3 C 9 7 6 10 2 10 C 4 4 4 -4 3 -11 Z",
  placas: "M 4 -6 L 10 -6 M 4.5 -1 L 10.8 -1 M 4 4 L 10 4",
  coxa: "M -10 6 C -10 0 -2 -1 2 3 C 5 6 4 10 0 11 L -8 11 C -10 10 -10 8 -10 6 Z",
  pe: "M -3 9 L 6 9 C 9 9 10 11 9 12.5 L -3 12.5 Z",
  unhas: "M 5 12.5 L 6 14 M 7.5 12.5 L 8.5 14 M 9.3 11.6 L 10.6 12.8",
  braco: "M 6 -2 C 9 -1 11 1 12 3.5",
  cabeca: "M 0 -18 C -2 -26 3 -32 10 -32 C 14 -32 17 -30 19 -28 L 25 -26 C 28 -25 28 -20 25 -19 L 14 -17 C 8 -15 2 -14 0 -18 Z",
  chifres: "M 4 -30 C 0 -36 -5 -38 -9 -38 C -5 -35 -2 -31 1 -27 Z M 8 -32 C 6 -38 2 -42 -2 -43 C 1 -39 3 -35 5 -30 Z",
  espinhosDorso: "M -1 -22 L -6 -22 L -2 -18 Z M -5 -15 L -10 -14 L -6 -11 Z",
  narina: "M 23.5 -24.5 C 24.5 -24 25 -23.5 25 -22.5",
  boca: "M 15 -19.5 L 24 -20.5",
  sobrancelha: "M 6 -29 L 14 -27.5 L 13 -26 L 7 -27.2 Z",
};

function dracofisco(c: Ctx, tema: Tema, fase: number) {
  const P = caminhos(DRACOFISCO);
  const k = pincel(c, tema);
  const { m, a } = k;
  const bate = Math.sin(fase) * 0.25;
  comeca(c);
  const asa = () => {
    k.pinta(P.asa, k.membrana);
    k.traco(P.asaOssos, m.escuro, 3.4);
    k.traco(P.asaOssos, m.corpo, 1.6);
    k.pinta(P.polegar, a.cor, 1.2);
  };
  c.save();
  c.translate(6, -2);
  k.gira(-4, -9, bate, () => {
    asa();
    k.escurece(P.asa, 0.18);
  });
  c.restore();
  // cauda com espinhos em losango no dorso e um losango maior na ponta
  const losango = (x: number, y: number, ang: number, comp: number, larg: number) => {
    c.save();
    c.translate(x, y);
    c.rotate(ang);
    c.beginPath();
    c.moveTo(0, -comp);
    c.lineTo(larg, 0);
    c.lineTo(0, comp);
    c.lineTo(-larg, 0);
    c.closePath();
    k.fecha(m.fivela, 1.3);
    c.restore();
  };
  const [p0, p1, p2, p3] = CAUDA_DRACO;
  for (const s of [0.28, 0.58, 0.86]) {
    const q = bezier(p0, p1, p2, p3, s);
    losango(q.x + Math.sin(q.ang) * 4.4, q.y - Math.cos(q.ang) * 4.4, q.ang, 3.4, 2.1);
  }
  k.membro(P.cauda, m.corpo, 4.4);
  const fim = bezier(p0, p1, p2, p3, 1);
  losango(fim.x + Math.cos(fim.ang) * 4, fim.y + Math.sin(fim.ang) * 4, fim.ang + Math.PI / 2, 5, 3.4);
  // monte de moedas
  const [ouro, borda] = tema.paleta.moeda;
  k.pinta(P.monte, ouro, 1.6);
  c.strokeStyle = borda;
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(-15, 18.2);
  c.quadraticCurveTo(0, 14.4, 15, 18.2);
  c.stroke();
  for (const [x, y, r] of [[-15, 19.2, 3.6], [14, 18.8, 3.6], [-6, 21.2, 3.8], [7, 21.4, 3.6], [0, 16.4, 3.4]] as const) k.moedaDeitada(x, y, r);
  k.pinta(P.corpo, m.corpo);
  k.sombraBorda(P.corpo);
  k.pinta(P.barriga, a.cor, 1.4);
  k.traco(P.placas, a.contorno, 1.1);
  k.pinta(P.coxa, m.corpo);
  k.pinta(P.pe, m.corpo, 1.5);
  k.traco(P.unhas, m.escuro, 1.3);
  // a pata da frente segura uma moeda, a do imposto
  k.moedaEmPe(14, 4.5, 3, 0.85);
  k.membro(P.braco, m.corpo, 3);
  // distintivo redondo, de borda serrilhada
  c.beginPath();
  for (let i = 0; i < 16; i++) {
    const r = i % 2 ? 4 : 4.8;
    const ang = (i * Math.PI) / 8;
    c.lineTo(5.5 + Math.cos(ang) * r, -6 + Math.sin(ang) * r);
  }
  c.closePath();
  k.fecha(m.fivela, 1.3);
  c.strokeStyle = k.contraste(m.fivela);
  c.lineWidth = 1;
  c.beginPath();
  c.arc(5.5, -6, 2.5, 0, Math.PI * 2);
  c.stroke();
  c.fillStyle = k.contraste(m.fivela);
  c.beginPath();
  c.arc(5.5, -6, 0.9, 0, Math.PI * 2);
  c.fill();
  k.gira(-4, -9, bate, asa);
  k.pinta(P.espinhosDorso, m.fivela, 1.3);
  k.pinta(P.chifres, a.cor, 1.5);
  k.pinta(P.cabeca, m.corpo);
  k.sombraBorda(P.cabeca, 0.14);
  k.traco(P.narina, m.escuro, 1.2);
  k.traco(P.boca, m.escuro, 1.3);
  k.olho(10.8, -24.2, 2.1, true);
  k.enche(P.sobrancelha, m.escuro);
  c.restore();
}

// ---------------------------------------------------------------------------
// 6. Harpia Corpus: harpia robusta e de pé, crista eriçada em leque, com o cadeado aberto nas garras.
// Desenhada em escala 0,9 (a crista é alta e o cadeado fica embaixo).
// ---------------------------------------------------------------------------
const HARPIA = {
  asa: "M -3 -14 C -9 -21 -15 -26 -22 -29 C -24 -26 -26.5 -26 -28.5 -28 C -29.5 -24 -31.5 -23 -33.5 -24 C -33 -20 -34 -18 -36 -18 C -32 -12 -23 -8 -12 -7 Z",
  asaCobertura: "M -3 -14 C -9 -21 -15 -26 -22 -29 C -21 -22 -17 -15 -11 -9.5 C -7 -9.5 -4 -11 -3 -14 Z",
  asaFaixas: "M -24 -25 C -26 -23 -29 -21.5 -32 -21 M -19 -18 C -22 -16 -25 -14.5 -29 -14 M -13 -11.5 C -16 -10.5 -19 -10 -22 -9.5",
  crista: leque(3, -27, 19, 165, 280, 7, 3),
  cabeca: "M -7 -25 C -7 -34 0 -38.5 6.5 -38.5 C 14 -38.5 18 -32 18 -25 C 18 -18.5 12.5 -14.5 6 -14.5 C -0.5 -14.5 -7 -18.5 -7 -25 Z",
  coroa: "M -7 -25 C -7 -34 0 -38.5 6.5 -38.5 C 12 -38.5 15.5 -35.5 16.5 -31.5 C 11 -33.5 6 -33 2.5 -30 C 0.5 -27.5 -1.5 -24 -7 -25 Z",
  disco: "M 4.5 -31 C 10 -34.5 17 -31 17.5 -25 C 18 -19.5 13.5 -16.5 9 -17 C 4 -18 1.5 -27 4.5 -31 Z",
  bico: "M 14.5 -28.5 C 21 -29.5 24.5 -24 23.5 -17.5 C 23 -15.5 20.5 -15.5 20.3 -17.3 C 20 -20.5 17.5 -21.5 14.5 -21.5 Z",
  sobrancelha: "M 5.5 -31 L 16 -28.8 L 15 -26.8 L 6.5 -28.8 Z",
  corpo: "M -14 -5 C -15 -15 -7 -21 2 -21 C 11 -21 17 -14 16 -3 C 15 7 9 12 1 12 C -8 12 -14 6 -14 -5 Z",
  barriga: "M 3 -6 C 11 -6 15 -1 14 4 C 13 9.5 7.5 12 1 12 C -4.5 12 -7.5 8 -7 3.5 C -6.5 -1.5 -2.5 -6 3 -6 Z",
  riscas: "M 1 -1 L 5 -1 M 8 0 L 12 0 M -3 4 L 1 4 M 5 5 L 9.5 5",
  calcas: "M -9 5 C -11 9 -9 13.5 -5 13.5 C -1 13.5 0 9 -1.5 5 Z M 3.5 5 C 2 9 4 13.5 8 13.5 C 12 13.5 13 9 11 5 Z",
  calcasRiscas: "M -8.8 8.5 L -2 8.5 M -8.3 11.5 L -2.2 11.5 M 3.6 8.5 L 11 8.5 M 4.2 11.5 L 11 11.5",
  // pés fechados na haste do cadeado, com as garras curvas por baixo dela
  pes: "M -7 12.2 C -7 9.8 -1.6 9.8 -1.2 12.2 C -1 14.2 -6.8 14.4 -7 12.2 Z M 4.2 12.2 C 4.4 9.8 9.8 9.8 9.8 12.2 C 9.8 14.4 4.2 14.2 4.2 12.2 Z",
  unhas: "M -6.2 13.6 Q -6.4 16 -4.6 16.6 M -4.1 14 Q -4.2 16.4 -2.6 16.8 M -2 13.6 Q -1.6 15.6 -0.4 15.6 M 5 13.6 Q 4.8 16 6.4 16.6 M 7.1 14 Q 7 16.4 8.6 16.8 M 9.2 13.6 Q 9.6 15.6 10.8 15.6",
  pernas: "M -4 10 L -4 12 M 7 10 L 7 12",
};

function harpiaCorpus(c: Ctx, tema: Tema, fase: number) {
  const P = caminhos(HARPIA);
  const k = pincel(c, tema);
  const { m, a } = k;
  const bate = Math.sin(fase) * 0.25;
  comeca(c);
  c.translate(3, 0);
  c.scale(0.9, 0.9);
  // asa larga e arredondada: cobertura escura junto ao ombro, penas claras com faixas
  const asa = () => {
    k.pinta(P.asa, a.cor);
    k.traco(P.asaFaixas, a.contorno, 2.2);
    k.enche(P.asaCobertura, m.corpo);
    k.traco(P.asa, m.escuro, 1.9);
  };
  c.save();
  c.translate(8, -5);
  k.gira(-4, -13, bate, () => {
    asa();
    k.escurece(P.asa, 0.18);
  });
  c.restore();
  k.gira(-4, -13, bate, asa);
  k.pinta(P.corpo, m.corpo);
  k.sombraBorda(P.corpo);
  k.enche(P.barriga, a.cor);
  k.traco(P.riscas, a.contorno, 1.1);
  k.pinta(P.calcas, a.cor, 1.5);
  k.traco(P.calcasRiscas, m.corpo, 1.2);
  k.membro(P.pernas, m.fivela, 2.6);
  // cadeado aberto: a haste longa entra no corpo, a curta ficou de fora
  c.save();
  c.translate(1.5, -1.2);
  c.strokeStyle = m.escuro;
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(4.2, 20);
  c.lineTo(4.2, 15.5);
  c.arc(0, 15.5, 4.2, 0, Math.PI, true);
  c.lineTo(-4.2, 17);
  c.stroke();
  c.strokeStyle = a.contorno;
  c.lineWidth = 2.2;
  c.stroke();
  c.beginPath();
  c.roundRect(-7.5, 19, 15, 8.6, 2.2);
  k.fecha(m.fivela, 1.8);
  c.fillStyle = "rgba(40,20,0,0.18)";
  c.fillRect(-6.6, 24.6, 13.2, 2);
  c.fillStyle = k.contraste(m.fivela);
  c.beginPath();
  c.arc(0, 22.2, 1.5, 0, Math.PI * 2);
  c.fill();
  c.fillRect(-0.65, 22.2, 1.3, 3);
  c.restore();
  k.pinta(P.pes, m.fivela, 1.4);
  k.traco(P.unhas, m.escuro, 1.7);
  // cabeça grande: crista eriçada em leque atrás, coroa mais escura, rosto em disco e bico escuro
  k.pinta(P.crista, m.corpo, 1.5);
  k.pinta(P.cabeca, a.cor);
  k.enche(P.coroa, mistura(a.cor, a.contorno, 0.6));
  k.traco(P.disco, a.contorno, 1.8);
  k.traco(P.cabeca, m.escuro, 1.8);
  k.pinta(P.bico, mistura(m.escuro, a.contorno, 0.3));
  k.enche(P.sobrancelha, m.escuro);
  k.olho(11, -25.5, 2.6);
  c.restore();
}

// ---------------------------------------------------------------------------
// 7. Morcegravo: morcego de frente, asas de membrana com dedos, e o agravo dobrado nos pés
// ---------------------------------------------------------------------------
const MORCEGRAVO = {
  // asa direita, raiz no ombro (0,0)
  asa: "M 0 0 L 13 -12 L 30 -6 Q 25 -1 27 6 Q 21 5 17 12 Q 10 7 2 9 Z",
  dedos: "M 0 0 L 13 -12 L 30 -6 M 13 -12 L 27 6 M 13 -12 L 17 12",
  polegar: "M 13 -12 L 14 -16 L 11 -13 Z",
  orelhas: "M -8 -19 L -13 -39 L -2 -24 Z M 8 -19 L 13 -39 L 2 -24 Z",
  orelhasDentro: "M -7.5 -21.5 L -11.2 -34 L -4.5 -24.5 Z M 7.5 -21.5 L 11.2 -34 L 4.5 -24.5 Z",
  corpo: "M 0 -10 C 6 -10 9 -4 9 2 C 9 8 5 11 0 11 C -5 11 -9 8 -9 2 C -9 -4 -6 -10 0 -10 Z",
  peito: "M 0 -6 C 4 -6 5.5 -2 5.5 2 C 5.5 6 3 8 0 8 C -3 8 -5.5 6 -5.5 2 C -5.5 -2 -4 -6 0 -6 Z",
  cabeca: "M 0 -25 C 6 -25 9 -21 9 -16 C 9 -11 5 -8 0 -8 C -5 -8 -9 -11 -9 -16 C -9 -21 -6 -25 0 -25 Z",
  sobrancelhas: "M -6.5 -21 L -1.5 -19 M 6.5 -21 L 1.5 -19",
  presas: "M -2.6 -12 L -1.4 -9 L -0.6 -12 Z M 0.6 -12 L 1.4 -9 L 2.6 -12 Z",
  boca: "M -3.5 -12.2 Q 0 -10.5 3.5 -12.2",
};
const DOBRAS_AGRAVO: Ponto[] = [[-9, -5], [-3, -7], [3, -5], [9, -7]];

function morcegravo(c: Ctx, tema: Tema, fase: number) {
  const P = caminhos(MORCEGRAVO);
  const k = pincel(c, tema);
  const { m, a } = k;
  const bate = Math.sin(fase) * 0.3;
  comeca(c);
  for (const lado of [-1, 1]) {
    c.save();
    c.translate(lado * 5, -7);
    c.scale(lado * 0.92, 0.92);
    c.rotate(-bate);
    k.pinta(P.asa, k.membrana);
    k.traco(P.dedos, m.escuro, 3.2);
    k.traco(P.dedos, m.corpo, 1.5);
    k.pinta(P.polegar, a.cor, 1.1);
    c.restore();
  }
  k.pinta(P.orelhas, m.corpo, 1.6);
  k.enche(P.orelhasDentro, k.membrana);
  k.pinta(P.corpo, m.corpo);
  k.sombraBorda(P.corpo);
  k.enche(P.peito, mistura(m.corpo, a.cor, 0.3));
  // agravo: folha dobrada em sanfona, presa pelos pés
  c.save();
  c.translate(0, 16.6);
  for (let i = 0; i < 3; i++) {
    const [x0, y0] = DOBRAS_AGRAVO[i];
    const [x1, y1] = DOBRAS_AGRAVO[i + 1];
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x1, y1);
    c.lineTo(x1, y1 + 12);
    c.lineTo(x0, y0 + 12);
    c.closePath();
    k.fecha(i === 1 ? mistura(k.papel, a.contorno, 0.7) : k.papel, 1.4);
    c.strokeStyle = m.escuro;
    c.lineWidth = 0.8;
    c.beginPath();
    for (let j = 0; j < 3; j++) {
      c.moveTo(x0 + 1.2, y0 + 3 + j * 2.6 + (y1 - y0) * 0.15);
      c.lineTo(x1 - 1.2, y1 + 3 + j * 2.6 - (y1 - y0) * 0.15);
    }
    c.stroke();
  }
  c.restore();
  for (const x of [-3, 3]) {
    c.beginPath();
    c.ellipse(x, 11, 1.8, 1.4, 0, 0, Math.PI * 2);
    k.fecha(m.corpo, 1.2);
  }
  k.pinta(P.cabeca, m.corpo);
  k.sombraBorda(P.cabeca, 0.14);
  for (const x of [-3.6, 3.6]) {
    c.beginPath();
    c.ellipse(x, -17, 2.3, 2.6, 0, 0, Math.PI * 2);
    k.fecha(k.papel, 1.1);
    k.olho(x + 0.4, -16.6, 1.3);
  }
  k.traco(P.sobrancelhas, m.escuro, 1.4);
  k.traco(P.boca, m.escuro, 1.1);
  k.pinta(P.presas, k.papel, 0.8);
  c.restore();
}

// ---------------------------------------------------------------------------
// 8. Ícaro Liminar: o rapaz em voo, de braço erguido com o cronômetro; as asas de cera vão presas aos braços
// ---------------------------------------------------------------------------
const ICARO_PERNA: Ponto[] = [[-9, 2], [-18, 4], [-27, 3]];
const ICARO_PERNA_LONGE: Ponto[] = [[-9, 0], [-17, -3], [-25, -2]];
const ICARO = {
  asa: "M 8 -5 L 7 -25 C 5 -31 1 -35 -4 -37 C -6 -34 -8 -34 -10 -36 C -12 -32 -15 -32 -17 -33 C -17 -29 -20 -28 -22 -29 C -21 -25 -23 -23 -26 -23 C -21 -15 -12 -8 0 -6 Z",
  asaPenas: "M -4 -37 C -1 -28 2 -18 5 -9 M -10 -36 C -6 -26 -1 -16 3 -8 M -17 -33 C -11 -24 -5 -15 1 -7 M -22 -29 C -15 -21 -8 -13 -1 -6.5",
  braco: "M 8 -5 L 7 -24",
  pernaLonge: linha(ICARO_PERNA_LONGE),
  perna: linha(ICARO_PERNA),
  tunica: "M 13 -6 C 15 -2 13 2 9 3 L -6 4.5 C -10 4.5 -11 -2 -7 -4 C -2 -6.5 6 -7.5 13 -6 Z",
  saia: "M -3 -4 L -12.5 -2.6 L -14 0.6 L -11.6 1.4 L -13.4 4 L -10.6 4.4 L -11.6 7 L -3 5 Z",
  cinto: "M -1.5 -5.5 L -0.5 4",
  cabeca: "M 12 -8 C 12 -13 15.5 -15.5 19.5 -15.5 C 24 -15.5 26.5 -12 26 -8 L 27.4 -6.2 L 26 -5.6 C 25.5 -2.5 22.5 -0.5 19 -0.5 C 15 -0.5 12 -3.5 12 -8 Z",
  cabelo: "M 11.5 -8 C 10.5 -12 12.5 -16 17 -16.8 C 21 -17.5 25 -16 26 -12.5 C 24.5 -12.8 23.5 -12 23.2 -11 C 21.8 -12.4 20 -12 19.5 -10.8 C 18.5 -11.8 16.5 -11.2 16.5 -9.6 C 15.6 -9.8 14.6 -9 14.8 -7.8 C 14 -6.4 12.5 -6 11.5 -8 Z",
  orelha: "M 16 -8.5 C 17.5 -8.5 18 -6.5 16.5 -5.8",
  boca: "M 23.6 -3.6 L 25.2 -3.9",
  sandalias: "M -24.5 1.6 L -24.5 4.6 M -22.5 -3.6 L -22.6 -0.6",
};

function icaroLiminar(c: Ctx, tema: Tema, fase: number, _t: number, _poder: boolean, semAsas = false) {
  const P = caminhos(ICARO);
  const k = pincel(c, tema);
  const { m, a } = k;
  const pele = acento(tema, "#efc39b");
  const bate = Math.sin(fase) * 0.22;
  comeca(c);
  c.translate(2, 8);
  c.scale(1.08, 1.08);
  const asa = () => {
    if (semAsas) return;
    k.pinta(P.asa, a.cor);
    k.traco(P.asaPenas, a.contorno, 1.3);
    k.traco(P.asa, m.escuro, 1.8);
  };
  // asa e braço do lado de lá, atrás do corpo e mais aberta
  c.save();
  c.translate(-2, -3);
  k.gira(8, -5, bate * 0.85 - 0.22, () => {
    asa();
    // a sombra é da própria asa: sem a asa (semAsas), não sobra mancha escura atrás do corpo
    if (!semAsas) k.escurece(P.asa, 0.16);
  });
  c.restore();
  k.membro(P.pernaLonge, mistura(pele, m.escuro, 0.25), 3.2);
  k.membro(P.perna, pele, 3.2);
  k.traco(P.sandalias, m.alca, 1.6);
  k.pinta(P.saia, mistura(m.corpo, m.escuro, 0.15), 1.4);
  k.pinta(P.tunica, m.corpo);
  k.sombraBorda(P.tunica);
  k.traco(P.cinto, m.escuro, 2.8);
  k.traco(P.cinto, m.fivela, 1.3);
  k.pinta(P.cabeca, pele);
  k.pinta(P.cabelo, m.escuro, 1.2);
  k.traco(P.orelha, m.escuro, 1.1);
  k.traco(P.boca, m.escuro, 1.1);
  k.olho(22, -8.5, 1.4);
  // braço erguido com a asa de cera e o cronômetro na mão
  k.gira(8, -5, bate, () => {
    asa();
    k.membro(P.braco, pele, 3);
    k.circulo(7.2, -25.5, 2.4, pele, 1.3);
    c.save();
    c.translate(7.6, -31.2);
    c.rotate(0.15);
    c.beginPath();
    c.roundRect(-1.3, -7.8, 2.6, 2.6, 0.6);
    k.fecha(m.fivela, 1.2);
    k.circulo(0, 0, 5.4, m.fivela, 1.6);
    k.circulo(0, 0, 3.9, k.papel, 1);
    c.strokeStyle = m.escuro;
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, -2.9);
    c.moveTo(0, 0);
    c.lineTo(2, 0.9);
    c.stroke();
    c.restore();
  });
  c.restore();
}

// ---------------------------------------------------------------------------
// 9. Prescritodáctilo: pterodáctilo de bico longo e crista, asa de membrana, com a ampulheta
// ---------------------------------------------------------------------------
const PRESCRITODACTILO = {
  asa: "M 4 -5 C 0 -10 -4 -14 -8 -17 C -14.5 -19.5 -22 -21.5 -29 -23.5 C -22 -17.5 -16 -9 -11 3 Z",
  asaOsso: "M 4 -5 C 0 -10 -4 -14 -8 -17 C -14.5 -19.5 -22 -21.5 -29 -23.5",
  garras: "M -8 -17 L -4.5 -20 M -8 -17 L -4 -17.6 M -8 -17 L -5 -14.8",
  cauda: "M -11 1 L -20 3 L -11 5 Z",
  corpo: "M -12 2 C -12 -4 -5 -7 2 -6 C 7 -5 9 -1 8 3 C 7 7 1 8 -5 7 C -10 6 -12 4 -12 2 Z",
  pescoco: "M 5 -3 C 8 -7 10 -11 12 -15",
  crista: "M 12 -19.5 C 8 -24 4 -28 -1 -31 C -2 -31.6 -1.6 -33.2 -0.2 -33 C 6 -30 12 -26 17.5 -22 Z",
  bico: "M 16 -20 C 23 -19 28 -17 33.5 -14 C 28 -13 23 -12 15 -14 Z",
  boca: "M 17 -16 L 29 -14.6",
  cabeca: "M 9.5 -18 C 9.5 -21 12 -22 14 -22 C 17 -22 18.5 -20 18.5 -18 C 18.5 -15.5 16.5 -14 14 -14 C 11.5 -14 9.5 -15.5 9.5 -18 Z",
  pernas: "M -3 6 L -4 10 M 2 6 L 3 10",
  vidro: "M -4.5 -5.3 C -4.5 -2 -1 -1 -1 0 C -1 1 -4.5 2 -4.5 5.3 L 4.5 5.3 C 4.5 2 1 1 1 0 C 1 -1 4.5 -2 4.5 -5.3 Z",
  areiaCima: "M -3.6 -2.2 Q 0 -1.2 3.6 -2.2 L 1 0 L -1 0 Z",
  areiaBaixo: "M -4.4 5.2 Q 0 0.6 4.4 5.2 Z M -0.35 0 L 0.35 0 L 0.35 4 L -0.35 4 Z",
  colunas: "M -5.2 -5 L -5.2 5.2 M 5.2 -5 L 5.2 5.2",
};

function prescritodactilo(c: Ctx, tema: Tema, fase: number) {
  const P = caminhos(PRESCRITODACTILO);
  const k = pincel(c, tema);
  const { m, a } = k;
  const bate = Math.sin(fase) * 0.25;
  comeca(c);
  const asa = () => {
    k.pinta(P.asa, k.membrana);
    k.traco(P.asaOsso, m.escuro, 3.6);
    k.traco(P.asaOsso, m.corpo, 1.8);
    k.traco(P.garras, m.escuro, 1.2);
  };
  // a asa de lá aparece mais erguida, por trás
  c.save();
  c.translate(4, -3);
  k.gira(3, -5, bate + 0.25, () => {
    asa();
    k.escurece(P.asa, 0.2);
  });
  c.restore();
  k.pinta(P.cauda, m.corpo, 1.5);
  k.membro(P.pernas, m.corpo, 2);
  // ampulheta: a areia escorre de cima para baixo
  c.save();
  c.translate(-0.5, 16.6);
  k.enche(P.vidro, mistura(k.papel, a.contorno, 0.25));
  k.enche(P.areiaCima, m.fivela);
  k.enche(P.areiaBaixo, m.fivela);
  k.traco(P.vidro, m.escuro, 1.3);
  k.traco(P.colunas, m.escuro, 1.2);
  for (const y of [-7.2, 5.2]) {
    c.beginPath();
    c.roundRect(-6.2, y, 12.4, 2.2, 0.8);
    k.fecha(m.corpo, 1.3);
  }
  c.restore();
  k.pinta(P.corpo, m.corpo);
  k.sombraBorda(P.corpo);
  k.gira(3, -5, bate, asa);
  k.membro(P.pescoco, m.corpo, 3.4);
  k.pinta(P.crista, m.fivela, 1.5);
  k.pinta(P.bico, m.fivela, 1.5);
  k.traco(P.boca, m.escuro, 1);
  k.pinta(P.cabeca, m.corpo, 1.5);
  k.olho(14.8, -18.5, 1.5, true);
  c.restore();
}

// ---------------------------------------------------------------------------
// 10. Pombodoro: pombo redondo de peito estufado e asas fechadas, com o timer de tomate pendurado
// ---------------------------------------------------------------------------
const POMBODORO = {
  cauda: "M -12 2 L -27 6 L -26 14.5 L -11 9 Z",
  caudaPonta: "M -23.4 5 L -27 6 L -26 14.5 L -22.4 13.2 Z",
  pernas: "M 0 13.5 L 0.4 18 M 6 12.5 L 6.8 17",
  dedos: "M -1.8 18.4 L 2.8 18.4 M 4.9 17.4 L 9.2 17.4",
  corpo: "M -15 6 C -18 -4 -12 -13 -2 -15 C 6 -16.5 13 -13 16 -7 C 19 -1 18 7 11 12 C 4 16.5 -6 16 -11 12.5 C -13.5 11 -14.5 8.5 -15 6 Z",
  brilho: "M 3 -15.5 C 9.5 -15 14 -11 15.8 -6 C 11 -7 6.5 -9 2.5 -11 Z",
  barriga: "M -16 8 C -8 14 4 15 12 11 L 14 19 L -16 19 Z",
  asa: "M 7 -7 C 10 -2 8 4 2 8 C -4 11 -12 12.5 -24 11 C -18 5.5 -12 -2 -5 -7 C -1 -9.5 4 -9.5 7 -7 Z",
  asaFaixas: "M -5 -4.5 C -7.5 -0.5 -8.5 4 -8.5 9.5 M -11.5 -0.5 C -13.5 2.5 -14.5 6.5 -14.5 10.5",
  cabeca: "M 7.5 -16 C 7 -20.5 9.5 -23 13 -23 C 16 -23 18 -21 17.6 -17.6 C 17.2 -15 15 -13.5 12 -13.5 Z",
  bico: "M 17.2 -19.2 L 21.5 -17.8 L 17.4 -16.6 Z",
  cordao: "M 9.5 -13 C 12 -9 15 -4.5 16.5 -0.8",
};

function pombodoro(c: Ctx, tema: Tema, fase: number) {
  const P = caminhos(POMBODORO);
  const k = pincel(c, tema);
  const { m, a } = k;
  const tomate = acento(tema, "#e5452f");
  const folha = acento(tema, "#4f9d3a");
  const bate = Math.sin(fase) * 0.26;
  comeca(c);
  // o pombo é compacto: um pouco maior, para ter o mesmo peso dos outros personagens
  c.translate(0, 1);
  c.scale(1.15, 1.15);
  k.pinta(P.cauda, m.corpo, 1.6);
  k.enche(P.caudaPonta, m.escuro);
  k.membro(P.pernas, m.fivela, 1.8);
  k.traco(P.dedos, m.escuro, 3.2);
  k.traco(P.dedos, m.fivela, 1.4);
  k.pinta(P.corpo, m.corpo);
  c.save();
  c.globalAlpha = 0.6;
  k.enche(P.brilho, a.contorno);
  c.restore();
  k.sombra(P.corpo, P.barriga);
  k.gira(4, -6, bate, () => {
    k.pinta(P.asa, mistura(a.cor, m.corpo, 0.4));
    k.traco(P.asaFaixas, m.escuro, 1.8);
  });
  k.pinta(P.cabeca, m.corpo);
  k.pinta(P.bico, m.fivela, 1.3);
  c.fillStyle = k.papel;
  c.beginPath();
  c.ellipse(17.7, -19.1, 1.2, 0.8, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = m.fivela;
  c.lineWidth = 1.2;
  c.beginPath();
  c.arc(13.8, -19.2, 2.1, 0, Math.PI * 2);
  c.stroke();
  k.olho(13.8, -19.2, 1.4);
  // cordão e timer de tomate: escala do mostrador, ponteiro e as folhas em estrela
  k.traco(P.cordao, m.escuro, 1.2);
  c.save();
  c.translate(17, 7);
  c.beginPath();
  c.ellipse(0, 0, 8, 7, 0, 0, Math.PI * 2);
  k.fecha(tomate, 1.7);
  c.strokeStyle = "rgba(255,255,255,0.5)";
  c.lineWidth = 1.4;
  c.beginPath();
  c.arc(0, 0, 5.2, Math.PI * 1.1, Math.PI * 1.42);
  c.stroke();
  c.strokeStyle = k.papel;
  c.lineWidth = 1.1;
  c.beginPath();
  for (let i = 0; i < 7; i++) {
    const ang = Math.PI * (0.2 + i * 0.1);
    c.moveTo(Math.cos(ang) * 5, Math.sin(ang) * 4.4);
    c.lineTo(Math.cos(ang) * 6.6, Math.sin(ang) * 5.8);
  }
  c.stroke();
  c.beginPath();
  c.moveTo(0, 1);
  c.lineTo(-1.3, 4.4);
  c.lineTo(1.3, 4.4);
  c.closePath();
  k.fecha(k.papel, 0.8);
  c.beginPath();
  for (let i = 0; i < 5; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    c.lineTo(Math.cos(ang) * 4.6, -6.2 + Math.sin(ang) * 1.8);
    const meio = ang + Math.PI / 5;
    c.lineTo(Math.cos(meio) * 1.3, -6.2 + Math.sin(meio) * 0.7);
  }
  c.closePath();
  k.fecha(folha, 1.1);
  c.restore();
  c.restore();
}

// ---------------------------------------------------------------------------
// 11. Agravião: gavião de peito listrado e asas largas e curtas, com o pergaminho no bico
// ---------------------------------------------------------------------------
const AGRAVIAO = {
  asa: "M 6 -5 C 6 -15 2 -24 -6 -31 C -6 -35 -9 -36 -11 -34 C -12 -37 -15 -37 -16 -34 C -18 -36 -21 -35 -21 -32 C -23 -33 -26 -31 -25 -28 C -27 -28 -28 -25 -26 -23 C -22 -13 -12 -6 -2 -3 Z",
  asaSombra: "M -2 -3 C -12 -6 -22 -13 -26 -23 C -21 -18 -14 -12 -6 -8 C -3 -6.5 0 -5.5 3 -5 Z",
  asaPenas: "M -11 -34 C -8 -26 -4 -17 1 -7 M -16 -34 C -12 -25 -7 -16 -1 -6 M -21 -32 C -16 -23 -10 -14 -3 -5",
  cauda: "M -14 -1 L -33 -3.8 C -34 0 -34 4 -33 6.8 L -14 5 Z",
  caudaFaixas: "M -20.5 -2.1 L -20.5 5.8 M -26 -2.9 L -26 6.4 M -31 -3.5 L -31 6.7",
  corpo: "M -16 1 C -15 -6 -6 -10 4 -9 C 11 -8 15 -4 14 2 C 13 7 6 10 -3 9 C -10 8 -16 6 -16 1 Z",
  peito: "M 2 -7 C 9 -7 14 -3 14 2 C 13 7 6 10 -3 9 C -8 8.5 -11 7 -12 5 C -4 5 1 0 2 -7 Z",
  pes: "M -6 8 L -9 11 M -2 8.5 L -5 11.5",
  cabeca: "M 6 -9 C 5 -16 9 -20 15 -20 C 20 -20 23 -16 22 -12 C 21 -8 17 -6 12 -6 Z",
  bone: "M 6 -10 C 6 -17 10 -20 15 -20 C 19 -20 22 -18 22 -15 C 18 -16 14 -16 10 -14 Z",
  bico: "M 20 -17 C 25 -18 28 -15 27 -11 C 26.5 -10 25.5 -10 25.5 -11 C 25 -13 23 -14 20.5 -13.5 Z",
  sobrancelha: "M 12 -18 L 20 -16.5 L 19.3 -15 L 12.5 -16.3 Z",
};

function agraviao(c: Ctx, tema: Tema, fase: number) {
  const P = caminhos(AGRAVIAO);
  const k = pincel(c, tema);
  const { m, a } = k;
  const bate = Math.sin(fase) * 0.22;
  comeca(c);
  const asa = () => {
    k.pinta(P.asa, a.cor);
    k.enche(P.asaSombra, a.contorno);
    k.traco(P.asaPenas, a.contorno, 1.3);
    k.traco(P.asa, m.escuro, 1.8);
  };
  c.save();
  c.translate(6, -2);
  k.gira(2, -5, bate, () => {
    asa();
    k.escurece(P.asa, 0.18);
  });
  c.restore();
  k.pinta(P.cauda, m.corpo, 1.6);
  k.traco(P.caudaFaixas, m.escuro, 1.6);
  k.membro(P.pes, m.fivela, 1.6);
  k.pinta(P.corpo, m.corpo);
  // peito listrado
  k.enche(P.peito, a.cor);
  c.save();
  c.clip(P.peito);
  c.strokeStyle = m.corpo;
  c.lineWidth = 1.5;
  c.beginPath();
  for (let y = -5; y < 10; y += 3) {
    c.moveTo(-12, y + 1);
    c.lineTo(15, y - 1);
  }
  c.stroke();
  c.restore();
  k.traco(P.corpo, m.escuro, 1.8);
  k.sombraBorda(P.corpo);
  k.gira(2, -5, bate, asa);
  k.pinta(P.cabeca, a.cor);
  k.enche(P.bone, m.corpo);
  k.traco(P.cabeca, m.escuro, 1.8);
  // pergaminho enrolado, preso no bico, com uma fita no meio
  c.save();
  c.translate(23.5, -7.5);
  c.rotate(0.12);
  c.beginPath();
  c.roundRect(-9, -2.6, 18, 5.2, 2.6);
  k.fecha(k.papel, 1.5);
  c.fillStyle = "rgba(40,20,0,0.18)";
  c.fillRect(-7, 0.6, 14, 1.6);
  for (const x of [-9, 9]) {
    c.beginPath();
    c.ellipse(x, 0, 1.5, 2.6, 0, 0, Math.PI * 2);
    k.fecha(mistura(k.papel, m.fivela, 0.35), 1.2);
    c.strokeStyle = m.escuro;
    c.lineWidth = 0.8;
    c.beginPath();
    c.ellipse(x, 0, 0.6, 1.2, 0, 0, Math.PI * 2);
    c.stroke();
  }
  c.beginPath();
  c.rect(0.6, -2.7, 2.8, 5.4);
  k.fecha(m.fivela, 1.1);
  c.restore();
  k.pinta(P.bico, m.fivela, 1.6);
  k.enche(P.sobrancelha, m.escuro);
  k.olho(16, -14.5, 2.1);
  c.restore();
}

// ---------------------------------------------------------------------------
// 12. Súmulicórnio: unicórnio alado empinado; o chifre é uma súmula enrolada em espiral
// ---------------------------------------------------------------------------

function sumulicornio(c: Ctx, tema: Tema, fase: number) {
  cavalo(c, tema, fase, true);
}

// ---------------------------------------------------------------------------
// 13. Falcão Falimentar: falcão pontudo de asas finas, com o saco de moedas rasgado e a placa
// ---------------------------------------------------------------------------
const FALCAO = {
  asa: "M 7 -7 C 2 -15 -9.5 -25 -28 -35 C -20 -27 -13.5 -16.5 -6 -4 Z",
  asaPonta: "M -16.5 -27.5 C -20 -30 -24 -32.8 -28 -35 C -24.5 -30 -21.8 -26.2 -19.5 -22.8 Z",
  asaPenas: "M -11.5 -21 C -9.5 -16.8 -6.8 -12.5 -3 -7 M -18.5 -27 C -15 -22 -11.5 -17 -7.8 -11.5",
  cauda: "M -13 -1 L -29 -8.5 C -33.5 -4 -34.2 4 -29.8 9.5 L -13 3 Z",
  caudaRaios: "M -14 1 L -31.5 -4 M -14 1 L -32.5 3 M -14 1 L -30.5 7.5",
  corpo: "M -15 0 C -10 -6 0 -9 8 -9 C 14 -9 17 -6 17 -2 C 16 3 9 5 0 5 C -6 5 -11 3 -15 0 Z",
  barriga: "M 6 -4 C 12 -4 16 -2 16 0 C 13 4 6 5 -2 5 C -6 5 -9 4 -11 2 C -4 2 2 -1 6 -4 Z",
  pernas: "M -1 4 L -2 8.5 M 3 4 L 3 8.5",
  cabeca: "M 9 -8 C 9 -14 13 -17 18 -17 C 22 -17 25 -14 25 -11 C 25 -8 22 -6 18 -5 L 12 -4 Z",
  capuz: "M 9 -9 C 9 -15 13 -17.5 18 -17.5 C 22 -17.5 24.5 -15 25 -12.5 C 22 -13.5 19 -13.5 17 -12 C 16 -10 15 -7 13 -5 Z",
  bigode: "M 16.5 -12 C 17.5 -9 17.4 -7 15.8 -5 C 14.8 -7 14.8 -10 16.5 -12 Z",
  bico: "M 24 -13.5 C 27 -13.5 28.5 -11.5 28 -9 C 27.5 -8.5 27 -8.5 26.8 -9.2 C 26.5 -10.5 25.5 -11 24 -11 Z",
  saco: "M -3 9.5 C -8 10 -9 16 -8 20 C -7 24 7 24 8 20 C 9 16 8 10 3 9.5 Z",
  sacoBoca: "M -4 7.5 L -1.5 9.5 L 1.5 9.5 L 4 7.5 L 3 10.5 L -3 10.5 Z",
  rasgo: "M -7.5 17 L -5.5 16.6 L -4.6 18.6 L -2.8 18 L -3.4 21 L -6.8 21.4 Z",
  cordao: "M 13 -1 L 15 -6 M 22 -1 L 20 -5.5",
};

function falcaoFalimentar(c: Ctx, tema: Tema, fase: number) {
  const P = caminhos(FALCAO);
  const k = pincel(c, tema);
  const { m, a } = k;
  const queda = acento(tema, "#c62828");
  const bate = Math.sin(fase) * 0.25;
  comeca(c);
  const asa = () => {
    k.pinta(P.asa, a.cor);
    k.enche(P.asaPonta, m.corpo);
    k.traco(P.asaPenas, a.contorno, 1.2);
    k.traco(P.asa, m.escuro, 1.8);
  };
  c.save();
  c.translate(7, 1);
  k.gira(5, -7, bate - 0.15, () => {
    asa();
    k.escurece(P.asa, 0.18);
  });
  c.restore();
  k.pinta(P.cauda, m.corpo, 1.6);
  k.traco(P.caudaRaios, a.contorno, 1);
  c.save();
  c.clip(P.cauda);
  c.strokeStyle = a.cor;
  c.lineWidth = 2.4;
  c.beginPath();
  c.arc(-14, 1, 17.6, Math.PI * 0.8, Math.PI * 1.2);
  c.stroke();
  c.restore();
  k.traco(P.cauda, m.escuro, 1.6);
  k.membro(P.pernas, m.fivela, 1.6);
  // saco de moedas rasgado, com moedas caindo pelo rasgo
  const saco = mistura(m.fivela, m.corpo, 0.35);
  k.pinta(P.saco, saco, 1.6);
  k.pinta(P.sacoBoca, saco, 1.3);
  k.enche(P.rasgo, m.escuro);
  k.moedaEmPe(-10.5, 21.4, 2.4, 0.8);
  k.moedaEmPe(-14, 17, 2, 0.45);
  k.pinta(P.corpo, m.corpo);
  k.enche(P.barriga, a.cor);
  c.fillStyle = m.corpo;
  for (const [x, y] of [[2, 2], [7, 1], [11, 0], [-3, 3]] as const) {
    c.beginPath();
    c.ellipse(x, y, 0.9, 0.6, 0, 0, Math.PI * 2);
    c.fill();
  }
  k.traco(P.corpo, m.escuro, 1.8);
  k.sombraBorda(P.corpo, 0.16);
  k.gira(5, -7, bate, asa);
  // placa com seta para baixo, pendurada no pescoço
  k.traco(P.cordao, m.escuro, 1.1);
  c.save();
  c.translate(17.5, 3);
  c.rotate(0.06);
  c.beginPath();
  c.roundRect(-6, -4, 12, 8, 1);
  k.fecha(k.papel, 1.5);
  c.strokeStyle = queda;
  c.lineWidth = 1.8;
  c.beginPath();
  c.moveTo(0, -2.6);
  c.lineTo(0, 1.4);
  c.stroke();
  c.fillStyle = queda;
  c.beginPath();
  c.moveTo(-2.6, 0.4);
  c.lineTo(2.6, 0.4);
  c.lineTo(0, 3.2);
  c.closePath();
  c.fill();
  c.restore();
  k.pinta(P.cabeca, a.cor);
  k.enche(P.capuz, m.corpo);
  k.enche(P.bigode, m.corpo);
  k.traco(P.cabeca, m.escuro, 1.8);
  k.pinta(P.bico, m.fivela, 1.5);
  c.strokeStyle = m.fivela;
  c.lineWidth = 1.1;
  c.beginPath();
  c.arc(19.5, -12.5, 2.3, 0, Math.PI * 2);
  c.stroke();
  k.olho(19.5, -12.5, 1.6);
  c.restore();
}

// ---------------------------------------------------------------------------
// 14. Gafanhoto de Mora: gafanhoto verde e segmentado, com o despertador e a bolsa de moedas
// ---------------------------------------------------------------------------
const GAFANHOTO = {
  antenas: "M 13 -13 C 10 -26 2 -36 -10 -42 M 15.5 -13.5 C 15.5 -26 11 -36 2 -43",
  asaTras: "M 2 -7 C -6 -16 -16 -26 -28 -32 C -25 -26 -17 -16 -3 -4 Z",
  asaFrente: "M 2 -7 C -8 -12 -19 -17.5 -30 -20 C -27.5 -15.5 -18 -9.5 -3 -3 Z",
  asaNervuras: "M 0 -6 C -9 -11.5 -17 -15.5 -26.5 -18.5 M -4 -5.5 C -11 -9 -17 -11.5 -24 -14",
  asaTrasNervura: "M 0 -6 C -8 -15 -16 -23 -25 -29",
  abdome: "M -2 -5 C -10 -7 -20 -6 -28 -3 C -31 -2 -31 1 -28 2 C -20 5 -10 6 -2 5 Z",
  segmentos: "M -7 -5.6 C -6 -2 -6 2 -7 5.6 M -12 -5.6 C -11 -2 -11 2 -12 5.4 M -17 -5.2 C -16 -2 -16 2 -17 4.8 M -22 -4.4 C -21 -2 -21 1.5 -22 3.8",
  torax: "M -3 -6 C 0 -9 6 -9 9 -7 L 10 3 C 7 6 0 6 -3 4 Z",
  cabeca: "M 8 -9 C 10 -14 17 -15 20 -11 C 23 -7 22 0 18 4 C 15 6 11 5 9 2 Z",
  boca: "M 19.5 1 L 21 3.5",
  coxa: "M 3 1 C -4 -6 -12 -13 -21 -18 C -24 -19 -26 -16 -24 -13 C -17 -8 -9 -2 -1 6 Z",
  coxaEspinha: "M -4 -2 L -7.5 -6.5 L -8 -1.5 M -11 -7.5 L -14.5 -11.5 L -15 -6.5 M -17.5 -12.5 L -20.5 -15.5 L -21 -11.5",
  canela: "M -23 -14 L -10 11 L -3 12.5",
  pernasMeio: "M 3 4 L 0 9.5 L -3 11.5 M 8 4 L 10 9 L 14 10",
  pernaFrente: "M 12 3 L 17 8 L 21 7",
};

function gafanhotoMora(c: Ctx, tema: Tema, fase: number) {
  const P = caminhos(GAFANHOTO);
  const k = pincel(c, tema);
  const { m, a } = k;
  const verde = acento(tema, "#86c440");
  const verdeEscuro = acento(tema, "#4f8a2a");
  const bate = Math.sin(fase) * 0.35;
  const chuta = Math.sin(fase) * 0.12;
  comeca(c);
  k.traco(P.antenas, m.escuro, 1.5);
  k.membro(P.pernasMeio, verdeEscuro, 1.6);
  // bolsa de moedas com fecho de beijinho, pendurada na perna do meio
  c.save();
  c.translate(-4, 16.9);
  c.beginPath();
  c.moveTo(-5.5, -3);
  c.lineTo(5.5, -3);
  c.quadraticCurveTo(8, 6.5, 0, 6.8);
  c.quadraticCurveTo(-8, 6.5, -5.5, -3);
  c.closePath();
  k.fecha(m.corpo, 1.6);
  k.moedaEmPe(0, 2, 2.4, 1);
  c.strokeStyle = m.escuro;
  c.lineWidth = 3.4;
  c.beginPath();
  c.moveTo(-6, -3);
  c.quadraticCurveTo(0, -5.2, 6, -3);
  c.stroke();
  c.strokeStyle = m.fivela;
  c.lineWidth = 1.6;
  c.stroke();
  k.circulo(-1.4, -5.6, 1.3, m.fivela, 1);
  k.circulo(1.4, -5.6, 1.3, m.fivela, 1);
  c.restore();
  k.gira(2, -6, bate * 0.7, () => {
    c.save();
    c.globalAlpha = 0.55;
    k.enche(P.asaTras, a.cor);
    c.restore();
    k.traco(P.asaTrasNervura, a.contorno, 0.9);
    k.traco(P.asaTras, m.escuro, 1.2);
  });
  k.pinta(P.abdome, verde);
  k.sombraBorda(P.abdome);
  k.traco(P.segmentos, verdeEscuro, 1.2);
  k.gira(2, -6, bate, () => {
    c.save();
    c.globalAlpha = 0.6;
    k.enche(P.asaFrente, a.cor);
    c.restore();
    k.traco(P.asaNervuras, a.contorno, 0.9);
    k.traco(P.asaFrente, m.escuro, 1.2);
  });
  k.pinta(P.torax, verdeEscuro);
  k.pinta(P.cabeca, verde);
  k.sombraBorda(P.cabeca, 0.14);
  c.beginPath();
  c.ellipse(14.5, -7.5, 2.8, 3.6, 0.2, 0, Math.PI * 2);
  c.fillStyle = "#1b1408";
  c.fill();
  c.fillStyle = "#ffffff";
  c.beginPath();
  c.arc(15.4, -8.9, 1, 0, Math.PI * 2);
  c.fill();
  k.traco(P.boca, m.escuro, 1.3);
  // perna de salto, que chuta com o bater
  k.gira(1, 2, chuta, () => {
    k.membro(P.canela, verdeEscuro, 1.8);
    k.pinta(P.coxa, verde);
    k.traco(P.coxaEspinha, verdeEscuro, 1.1);
  });
  // despertador nas patas da frente
  c.save();
  c.translate(26, 9);
  for (const lado of [-1, 1]) {
    c.beginPath();
    c.arc(lado * 3.8, -5.6, 2.5, Math.PI, 0);
    c.closePath();
    k.fecha(m.fivela, 1.2);
  }
  c.strokeStyle = m.escuro;
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(-4, 5);
  c.lineTo(-5.5, 7.5);
  c.moveTo(4, 5);
  c.lineTo(5.5, 7.5);
  c.stroke();
  k.circulo(0, 0, 6, m.fivela, 1.6);
  k.circulo(0, 0, 4.4, k.papel, 1);
  c.strokeStyle = m.escuro;
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(0, -3.2);
  c.moveTo(0, 0);
  c.lineTo(2.4, 1.2);
  c.stroke();
  c.restore();
  k.membro(P.pernaFrente, verdeEscuro, 1.6);
  c.restore();
}

export const DESENHOS_NOVOS: Record<string, Desenho> = {
  pecasus,
  gabaruda,
  fenixame,
  corujuris,
  dracofisco,
  "harpia-corpus": harpiaCorpus,
  morcegravo,
  "icaro-liminar": icaroLiminar,
  prescritodactilo,
  pombodoro,
  agraviao,
  sumulicornio,
  "falcao-falimentar": falcaoFalimentar,
  "gafanhoto-mora": gafanhotoMora,
};

/**
 * Asa de cera solta (Ícaro Liminar): o mesmo desenho da asa presa ao corpo, girando em torno do ombro (`ang`).
 * `atras`: é a asa de trás (mais atrás e com a sombra).
 */
export function desenharAsaSolta(c: Ctx, tema: Tema, ang: number, atras = false) {
  const P = caminhos(ICARO);
  const k = pincel(c, tema);
  comeca(c);
  c.translate(2, 8);
  c.scale(1.08, 1.08);
  // a asa de trás fica um pouco atrás e tem a mesma sombra que tinha presa ao corpo
  c.translate(atras ? -2 : 0, atras ? -3 : 0);
  k.gira(8, -5, ang, () => {
    k.pinta(P.asa, k.a.cor);
    k.traco(P.asaPenas, k.a.contorno, 1.3);
    k.traco(P.asa, k.m.escuro, 1.8);
    if (atras) k.escurece(P.asa, 0.16);
  });
  c.restore();
}
