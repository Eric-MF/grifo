import type { Nivel, Pergunta } from "./types";

export const TAMANHO_TREINO = 10;
const PONTOS_BASE = 100;

export const LIMITE_SEG: Record<Nivel, number> = { 1: 45, 2: 90, 3: 150 };
const LIMITE_OBJETIVA: Record<Nivel, number> = { 1: 60, 2: 45, 3: 30 };
const LIMITE_ITEM: Record<Nivel, number> = { 1: 60, 2: 180, 3: 240 };

/** Segundos até a bonificação de rapidez zerar: depende do nível e do formato da pergunta. */
export function limiteSeg(p: Pergunta, nivel: Nivel): number {
  if (p.formato === "objetiva") return LIMITE_OBJETIVA[nivel];
  if (p.formato === "item") return LIMITE_ITEM[nivel];
  return LIMITE_SEG[nivel];
}
export const NOME_NIVEL: Record<Nivel, string> = { 1: "Fácil", 2: "Médio", 3: "Difícil" };
const MULTIPLICADOR: Record<Nivel, number> = { 1: 1, 2: 1.5, 3: 2 };

/** Acerto vale 60 pontos, mais até 40 pela rapidez (zero após o limite do nível); o nível multiplica. */
export function pontuar(nivel: Nivel, acertou: boolean, segundos: number, limite = LIMITE_SEG[nivel]): number {
  if (!acertou) return 0;
  const rapidez = Math.max(0, 1 - segundos / limite);
  return Math.round((60 + 40 * rapidez) * MULTIPLICADOR[nivel]);
}

export function maximoTreino(nivel: Nivel): number {
  return TAMANHO_TREINO * PONTOS_BASE * MULTIPLICADOR[nivel];
}
