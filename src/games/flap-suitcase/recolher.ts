// Colunas que se recolhem ou recuam para abrir passagem ao pássaro. Duas fontes:
// - o galope do Peçasus recolhe as colunas à frente dele à medida que elas chegam (as duas metades vão para as bordas);
// - a batida de asas do Ícaro Liminar e do Prescritodáctilo empurra para fora de um círculo invisível, em volta do
//   pássaro, as partes da coluna que o tocam. O recuo fica no novo lugar e chega até lá com um quique (mola amortecida).
// Funções puras: o engine decide quando usar.

/** Galope: a coluna começa a se recolher a esta distância à frente do pássaro... */
const GALOPE_INICIO = 260;
/** ...e fica toda recolhida quando chega a esta distância dele. */
const GALOPE_FIM = 60;
/** Mola (galope e batida): rigidez e amortecimento. Com 0,42 de amortecimento, o alvo é passado em cerca de 23%. */
const RIGIDEZ = 420;
const AMORTECIMENTO = 2 * 0.42 * Math.sqrt(RIGIDEZ);
/** O recolhimento do galope não passa deste valor (com folga para o quique). */
const LIMITE_RECOLHIMENTO = 1.3;
/** Quanto a coluna recolhida ainda passa da borda da tela: com o recolhimento total ela sai da tela. */
const FORA = 40;

const limite01 = (x: number) => Math.min(1, Math.max(0, x));

/** Quanto o galope recolhe a coluna (0 = inteira, 1 = toda recolhida), a `distancia` à frente do pássaro. */
export function alvoRecolhimento(distancia: number, galope: boolean): number {
  return galope ? limite01((GALOPE_INICIO - distancia) / (GALOPE_INICIO - GALOPE_FIM)) : 0;
}

/** Um passo da mola amortecida de `x` até `alvo`, limitado a [min, max]. Passa do alvo (quique) e assenta. `dt` em segundos. */
export function passoMola(x: number, v: number, alvo: number, dt: number, min: number, max: number): { x: number; v: number } {
  const v2 = v + (RIGIDEZ * (alvo - x) - AMORTECIMENTO * v) * dt;
  const x2 = Math.min(max, Math.max(min, x + v2 * dt));
  // na borda a velocidade para, para a mola não ficar presa ali
  return { x: x2, v: x2 === min || x2 === max ? 0 : v2 };
}

/** Um passo do recolhimento do galope (de 0 a 1, com quique até 1,3). */
export function molaRecolhimento(x: number, v: number, alvo: number, dt: number): { x: number; v: number } {
  return passoMola(x, v, alvo, dt, 0, LIMITE_RECOLHIMENTO);
}

/** Retângulo `(x, y, w, h)` toca o círculo de centro (cx, cy) e raio `r`? */
export function intersectaCirculo(cx: number, cy: number, r: number, x: number, y: number, w: number, h: number): boolean {
  if (w <= 0 || h <= 0) return false;
  const px = Math.max(x, Math.min(cx, x + w));
  const py = Math.max(y, Math.min(cy, y + h));
  return (cx - px) ** 2 + (cy - py) ** 2 < r * r;
}

/** Topo e base da coluna com o recolhimento do galope aplicado: cada metade anda para a borda da tela. */
export function bordasRecolhidas(topo: number, base: number, recolhido: number, altura: number): { topo: number; base: number } {
  return { topo: topo - recolhido * (topo + FORA), base: base + recolhido * (altura - base + FORA) };
}
