// Contador de strike do treino: bolinhas por acerto, strike quando completa o tamanho atual.

/** Strikes seguidos a partir dos quais o strike pede mais 5 questões: 3, 6, 12, 24 (o tamanho para em 30). */
export const DEGRAUS_STRIKE = [3, 6, 12, 24] as const;
export const STRIKE_INICIAL = 10;
export const STRIKE_MAXIMO = 30;

/** Quantas questões seguidas o próximo strike pede, com `seguidos` strikes já feitos sem errar. */
export function tamanhoDoStrike(seguidos: number): number {
  let tamanho = STRIKE_INICIAL;
  for (const degrau of DEGRAUS_STRIKE) if (seguidos >= degrau) tamanho += 5;
  return Math.min(tamanho, STRIKE_MAXIMO);
}

export interface EstadoStrike {
  /** bolinhas acumuladas no strike atual */
  acertos: number;
  /** strikes feitos em sequência, sem errar */
  seguidos: number;
  /** strikes feitos na sessão inteira */
  total: number;
}

export const STRIKE_ZERO: EstadoStrike = { acertos: 0, seguidos: 0, total: 0 };

/** O placar depois de uma resposta: `strike` quando completou um; `perdeu` = bolinhas perdidas no erro (0 se acertou). */
export function registrarStrike(e: EstadoStrike, acertou: boolean): { estado: EstadoStrike; strike: boolean; perdeu: number } {
  // Erro zera as bolinhas e a sequência; o total da sessão fica.
  if (!acertou) return { estado: { acertos: 0, seguidos: 0, total: e.total }, strike: false, perdeu: e.acertos };

  const acertos = e.acertos + 1;
  if (acertos < tamanhoDoStrike(e.seguidos)) return { estado: { ...e, acertos }, strike: false, perdeu: 0 };

  return { estado: { acertos: 0, seguidos: e.seguidos + 1, total: e.total + 1 }, strike: true, perdeu: 0 };
}

/** 0 a 1: quanto falta para o strike (a cor das bolinhas esquenta com isso). */
export function progressoDoStrike(e: EstadoStrike): number {
  return Math.min(1, Math.max(0, e.acertos / tamanhoDoStrike(e.seguidos)));
}
