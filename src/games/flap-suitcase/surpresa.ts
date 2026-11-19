// Surpresa (easter egg) de cada estilo: aparece no fundo de tempos em tempos ou a cada tantos pontos, o que vier
// primeiro, e some depois de alguns segundos. Funções puras (ver tests/surpresa.test.ts); o motor guarda o estado.

/** Segundos de voo entre uma surpresa e a próxima. */
export const SURPRESA_A_CADA_S = 40;
/** Pontos feitos desde a última surpresa que já trazem a próxima. */
export const SURPRESA_A_CADA_PONTOS = 25;
/** Quanto tempo a surpresa fica na tela, em segundos. */
export const DURACAO_SURPRESA = 8;

export interface EstadoSurpresa {
  /** relógio de jogo em que a surpresa atual começou; null se não há nenhuma na tela */
  inicio: number | null;
  /** relógio de jogo em que a última surpresa acabou (ou o começo da partida) */
  ultimoFim: number;
  /** pontos que o jogador tinha quando a última surpresa acabou */
  pontosBase: number;
}

export const SURPRESA_INICIAL: EstadoSurpresa = { inicio: null, ultimoFim: 0, pontosBase: 0 };

/** Avança o estado: começa uma surpresa quando passou o tempo ou os pontos desde a última; acaba depois da duração. */
export function passoSurpresa(s: EstadoSurpresa, relogio: number, pontos: number): EstadoSurpresa {
  if (s.inicio !== null) return relogio - s.inicio >= DURACAO_SURPRESA ? { inicio: null, ultimoFim: relogio, pontosBase: pontos } : s;
  if (relogio - s.ultimoFim >= SURPRESA_A_CADA_S || pontos - s.pontosBase >= SURPRESA_A_CADA_PONTOS) return { ...s, inicio: relogio };
  return s;
}

/** Progresso (0 a 1) da surpresa na tela, ou null quando não há nenhuma. */
export function progressoSurpresa(s: EstadoSurpresa, relogio: number): number | null {
  if (s.inicio === null) return null;
  return Math.min(1, Math.max(0, (relogio - s.inicio) / DURACAO_SURPRESA));
}
