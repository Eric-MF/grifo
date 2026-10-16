// Teto do Ícaro Liminar: batidas de cabeça no teto. Funções puras (ver tests/teto.test.ts).

/** Batidas de cabeça no teto dentro da janela que derretem as asas de cera. */
export const BATIDAS_LIMITE = 5;
/** Janela, em segundos de jogo, em que as batidas contam. */
export const BATIDAS_JANELA = 10;

/** Registra uma batida em `agora` (segundos de jogo) e devolve só as que ainda estão dentro da janela. */
export function registrarBatida(batidas: number[], agora: number): number[] {
  return [...batidas.filter((t) => agora - t < BATIDAS_JANELA), agora];
}

/** Há batidas suficientes dentro da janela para o sol. */
export function atingiuBatidas(batidas: number[]): boolean {
  return batidas.length >= BATIDAS_LIMITE;
}
