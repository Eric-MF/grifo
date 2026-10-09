import type { Nivel } from "./types";

export const TAMANHO_TREINO = 10;
const PONTOS_BASE = 100;

export const LIMITE_SEG: Record<Nivel, number> = { 1: 45, 2: 90, 3: 150 };
export const NOME_NIVEL: Record<Nivel, string> = { 1: "Fácil", 2: "Médio", 3: "Difícil" };
const MULTIPLICADOR: Record<Nivel, number> = { 1: 1, 2: 1.5, 3: 2 };

/** Acerto vale 60 pontos, mais até 40 pela rapidez (zero após o limite do nível); o nível multiplica. */
export function pontuar(nivel: Nivel, acertou: boolean, segundos: number): number {
  if (!acertou) return 0;
  const rapidez = Math.max(0, 1 - segundos / LIMITE_SEG[nivel]);
  return Math.round((60 + 40 * rapidez) * MULTIPLICADOR[nivel]);
}

export function maximoTreino(nivel: Nivel): number {
  return TAMANHO_TREINO * PONTOS_BASE * MULTIPLICADOR[nivel];
}
