// Moedas sugadas: quem tem moedas no desenho (`moedas` em progressao.ts) manda cada moeda pega para o contador do HUD.
// A moeda sai do ponto em que foi pega, faz um arco e acelera até o contador, como se fosse sugada.
// Funções puras, em coordenadas lógicas do canvas; o motor avança os voos a cada passo.

/** Uma moeda em voo. */
export interface VooMoeda {
  /** onde a moeda foi pega */
  x: number;
  y: number;
  /** ponto de controle do arco, acima das duas pontas */
  cx: number;
  cy: number;
  /** o contador do HUD */
  ax: number;
  ay: number;
  /** segundos que a moeda espera antes de sair; escalona as moedas de um lote */
  atraso: number;
  /** de 0 (saindo) a 1 (chegou) */
  t: number;
  dur: number;
  /** fase do giro, para a moeda girar enquanto voa */
  fase: number;
}

const DURACAO = 0.55;

/**
 * Cria o voo de uma moeda de (x, y) até o contador (ax, ay). `aleatorio`, de 0 a 1, muda o arco e a duração,
 * para as moedas de um lote não andarem em fila.
 */
export function criarVoo(x: number, y: number, ax: number, ay: number, atraso: number, aleatorio: number): VooMoeda {
  return {
    x,
    y,
    cx: (x + ax) / 2,
    cy: Math.min(y, ay) - 60 - aleatorio * 60,
    ax,
    ay,
    atraso,
    t: 0,
    dur: DURACAO * (0.85 + aleatorio * 0.3),
    fase: aleatorio * Math.PI * 2,
  };
}

/** Avança o voo em `dt` segundos. Devolve true quando a moeda chegou ao contador. */
export function avancarVoo(v: VooMoeda, dt: number): boolean {
  if (v.atraso > 0) {
    v.atraso -= dt;
    return false;
  }
  v.t = Math.min(1, v.t + dt / v.dur);
  v.fase += dt * 14;
  return v.t >= 1;
}

/**
 * Posição da moeda no voo: curva quadrática de (x, y) a (ax, ay). O tempo entra ao quadrado, então a moeda
 * sai devagar e chega ao contador em alta velocidade.
 */
export function posicaoVoo(v: VooMoeda): { x: number; y: number } {
  const s = v.t * v.t;
  const k = 1 - s;
  return {
    x: k * k * v.x + 2 * k * s * v.cx + s * s * v.ax,
    y: k * k * v.y + 2 * k * s * v.cy + s * s * v.ay,
  };
}
