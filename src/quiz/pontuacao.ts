import type { Nivel, Pergunta } from "./types";

export const TAMANHO_TREINO = 10;
export const TAMANHOS_TREINO = [10, 20, 30, 50] as const;
const PONTOS_BASE = 100;

export const LIMITE_SEG: Record<Nivel, number> = { 1: 45, 2: 90, 3: 150 };
/** Segundos de vantagem: até eles, a rapidez vale inteira; o bônus só começa a cair depois. */
export const FOLGA_SEG: Record<Nivel, number> = { 1: 13, 2: 15, 3: 20 };
const LIMITE_OBJETIVA: Record<Nivel, number> = { 1: 60, 2: 45, 3: 30 };
/** A tese: no médio, um ponto central curto; no difícil, ele e o artigo (como a peça e o fundamento). */
const LIMITE_TESE: Record<Nivel, number> = { 1: 50, 2: 90, 3: 150 };

/** Segundos até a bonificação de rapidez zerar: depende do nível e do formato da pergunta. */
export function limiteSeg(p: Pergunta, nivel: Nivel): number {
  if (p.formato === "objetiva") return LIMITE_OBJETIVA[nivel];
  if (p.formato === "tese") return LIMITE_TESE[nivel];
  return LIMITE_SEG[nivel];
}

const contar = (texto: string) => texto.trim().split(/\s+/).filter(Boolean).length;

/** Palavras que o jogador lê na questão: o caso, o comando e as alternativas que aparecem no nível. */
export function palavrasDaQuestao(p: Pergunta, nivel: Nivel): number {
  let total = contar(p.caso) + contar(p.comando);
  // objetiva: as quatro alternativas sempre aparecem
  if (p.formato === "objetiva") total += Object.values(p.alternativas).reduce((soma, t) => soma + contar(t), 0);
  // tese no fácil: quatro alternativas (teses, do tamanho da certa, ou artigos, curtos) e a tese ou o artigo dados
  if (p.formato === "tese" && nivel === 1) total += contar(p.tese) * 3;
  // peça no fácil: quatro nomes de peça curtos (três palavras cada)
  if (p.formato === "peca" && nivel === 1) total += 4 * 3;
  return total;
}

/** Segundos que não tiram pontos: a base do nível ou, na questão longa, um segundo a cada 4 palavras. */
export function folgaSeg(p: Pergunta, nivel: Nivel): number {
  return Math.max(FOLGA_SEG[nivel], Math.ceil(palavrasDaQuestao(p, nivel) / 4));
}

/** Segundos, depois da folga, em que o bônus cai até zerar: o limite do formato ou, se maior, a própria folga. */
export function janelaSeg(p: Pergunta, nivel: Nivel): number {
  return Math.max(limiteSeg(p, nivel), folgaSeg(p, nivel));
}

export const NOME_NIVEL: Record<Nivel, string> = { 1: "Fácil", 2: "Médio", 3: "Difícil" };
const MULTIPLICADOR: Record<Nivel, number> = { 1: 1, 2: 1.5, 3: 2 };

/**
 * Acerto vale 60 pontos, mais até 40 pela rapidez; o nível multiplica.
 * A rapidez é total até a folga (folgaSeg) e cai linearmente até zerar
 * em folga + limite segundos (janelaSeg). Erro vale zero.
 */
export function pontuar(
  nivel: Nivel,
  acertou: boolean,
  segundos: number,
  limite = LIMITE_SEG[nivel],
  folga = FOLGA_SEG[nivel],
): number {
  if (!acertou) return 0;
  const rapidez = Math.max(0, 1 - Math.max(0, segundos - folga) / limite);
  return Math.round((60 + 40 * rapidez) * MULTIPLICADOR[nivel]);
}

/** Pontuação máxima de um treino com `tamanho` perguntas acertadas no nível. */
export function maximoTreino(nivel: Nivel, tamanho = TAMANHO_TREINO): number {
  return tamanho * PONTOS_BASE * MULTIPLICADOR[nivel];
}
