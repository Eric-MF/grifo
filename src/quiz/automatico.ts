// Modo automático do treino: os tipos de pergunta em ordem (Peça e fundamento → Por dentro da peça → Questões
// discursivas → Objetivas da 1ª fase), cada um do Fácil ao Difícil conforme o aluno acerta, e desce um nível quando erra muito. Depois do último tipo vem o
// modo final: todos os tipos, alternando, só no Difícil. No caminho, uma questão em cada 10 (no 2º tipo), 20 (no 3º)
// ou 30 (no 4º) é a recapitulação de um tipo já vencido, no Difícil, para ver se o aluno continua acertando.
import type { Categoria, Nivel } from "./types";

export const ORDEM_AUTOMATICO: Categoria[] = ["peca", "peca-detalhe", "discursiva", "objetiva"];
/** Sobe de nível com 4 acertos nas últimas 5 questões do nível (as recapitulações não contam). */
export const ACERTOS_PARA_SUBIR = 4;
export const JANELA_PARA_SUBIR = 5;
/** Desce um nível com 3 erros nas últimas 5 questões do nível (as recapitulações não contam); no Fácil e no modo final, não desce. */
export const ERROS_PARA_DESCER = 3;
/** Uma recapitulação a cada 10 questões no 2º tipo; o intervalo cresce 10 a cada tipo (20 no 3º, 30 no 4º). */
export const RECAPITULACAO_A_CADA = 10;

export interface EstadoAutomatico {
  /** os tipos que entram, na ordem do modo */
  tipos: Categoria[];
  /** o tipo da vez (posição em `tipos`); igual a tipos.length no modo final */
  etapa: number;
  nivel: Nivel;
  /** os resultados no nível atual, o mais recente por último (no máximo JANELA_PARA_SUBIR) */
  ultimas: boolean[];
  /** questões respondidas no tipo atual, contando as recapitulações: marca o ritmo delas */
  naEtapa: number;
  /** no modo final, quantas já foram: o tipo da vez gira entre todos */
  vez: number;
}

/** Os tipos na ordem do modo, só os escolhidos (todos, se nenhum). */
export const tiposNaOrdem = (escolhidos: Categoria[]) => {
  const t = ORDEM_AUTOMATICO.filter((c) => escolhidos.includes(c));
  return t.length ? t : [...ORDEM_AUTOMATICO];
};

export const iniciarAutomatico = (tipos: Categoria[]): EstadoAutomatico => ({ tipos: tiposNaOrdem(tipos), etapa: 0, nivel: 1, ultimas: [], naEtapa: 0, vez: 0 });

export const noFinal = (e: EstadoAutomatico) => e.etapa >= e.tipos.length;

/** A próxima questão: o tipo, o nível e se é uma recapitulação. */
export interface QuestaoAutomatica {
  categoria: Categoria;
  nivel: Nivel;
  recapitulacao: boolean;
  /** a questão é do modo final */
  final?: true;
}

/** Quantas questões no tipo atual entre uma recapitulação e outra (0 = sem recapitulação: o 1º tipo e o modo final). */
export const intervaloDaRecapitulacao = (e: EstadoAutomatico) => (noFinal(e) ? 0 : RECAPITULACAO_A_CADA * e.etapa);

export function proximaDoAutomatico(e: EstadoAutomatico, aleatorio: () => number = Math.random): QuestaoAutomatica {
  if (noFinal(e)) return { categoria: e.tipos[e.vez % e.tipos.length]!, nivel: 3, recapitulacao: false, final: true };
  const intervalo = intervaloDaRecapitulacao(e);
  if (intervalo && (e.naEtapa + 1) % intervalo === 0) {
    return { categoria: e.tipos[Math.floor(aleatorio() * e.etapa)]!, nivel: 3, recapitulacao: true };
  }
  return { categoria: e.tipos[e.etapa]!, nivel: e.nivel, recapitulacao: false };
}

/** O que mudou depois da resposta: subiu ou desceu de nível, passou ao próximo tipo ou chegou ao modo final. */
export type Avanco = { tipo: "nivel"; nivel: Nivel } | { tipo: "desceu"; nivel: Nivel } | { tipo: "etapa"; categoria: Categoria } | { tipo: "final" } | null;

/**
 * Registra a resposta: sobe de nível com acertos e desce com erros (`descer: false` desliga a descida).
 * A recapitulação e o modo final não mudam o nível.
 */
export function registrarNoAutomatico(e: EstadoAutomatico, q: QuestaoAutomatica, acertou: boolean, opcoes: { descer?: boolean } = {}): { estado: EstadoAutomatico; avanco: Avanco } {
  const descer = opcoes.descer ?? true;
  if (noFinal(e)) return { estado: { ...e, vez: e.vez + 1 }, avanco: null };
  const naEtapa = e.naEtapa + 1;
  // a recapitulação só confere: não sobe nem desce o nível
  if (q.recapitulacao) return { estado: { ...e, naEtapa }, avanco: null };
  const ultimas = [...e.ultimas, acertou].slice(-JANELA_PARA_SUBIR);
  if (descer && e.nivel > 1 && ultimas.filter((x) => !x).length >= ERROS_PARA_DESCER) {
    const nivel = (e.nivel - 1) as Nivel;
    return { estado: { ...e, naEtapa, nivel, ultimas: [] }, avanco: { tipo: "desceu", nivel } };
  }
  if (ultimas.filter(Boolean).length < ACERTOS_PARA_SUBIR) return { estado: { ...e, naEtapa, ultimas }, avanco: null };
  if (e.nivel < 3) {
    const nivel = (e.nivel + 1) as Nivel;
    return { estado: { ...e, naEtapa, nivel, ultimas: [] }, avanco: { tipo: "nivel", nivel } };
  }
  const etapa = e.etapa + 1;
  const estado = { ...e, etapa, nivel: 1 as Nivel, ultimas: [], naEtapa: 0, vez: 0 };
  return { estado, avanco: etapa >= e.tipos.length ? { tipo: "final" } : { tipo: "etapa", categoria: e.tipos[etapa]! } };
}

/** Quantos acertos seguidos, a partir de agora, sobem o nível (as últimas questões do nível já contam). */
export function faltamParaSubir(e: EstadoAutomatico): number {
  for (let k = 1; k < JANELA_PARA_SUBIR; k++) {
    const janela = [...e.ultimas, ...Array<boolean>(k).fill(true)].slice(-JANELA_PARA_SUBIR);
    if (janela.filter(Boolean).length >= ACERTOS_PARA_SUBIR) return k;
  }
  return ACERTOS_PARA_SUBIR;
}

/** Quantos erros seguidos, a partir de agora, fazem descer o nível (as últimas questões do nível já contam). */
export function faltamParaDescer(e: EstadoAutomatico): number {
  for (let k = 1; k < ERROS_PARA_DESCER; k++) {
    const janela = [...e.ultimas, ...Array<boolean>(k).fill(false)].slice(-JANELA_PARA_SUBIR);
    if (janela.filter((x) => !x).length >= ERROS_PARA_DESCER) return k;
  }
  return ERROS_PARA_DESCER;
}

/**
 * Troca os tipos no meio do modo. O tipo da vez continua, se ficou; se saiu, o modo segue para o próximo da ordem que
 * ficou, no Fácil. Os tipos que vêm antes dele na ordem contam como vencidos (entram nas recapitulações).
 */
export function ajustarTipos(e: EstadoAutomatico, escolhidos: Categoria[]): EstadoAutomatico {
  const tipos = tiposNaOrdem(escolhidos);
  if (tipos.join() === e.tipos.join()) return e;
  if (noFinal(e)) return { ...e, tipos, etapa: tipos.length, vez: 0 };
  const atual = e.tipos[e.etapa]!;
  const k = tipos.indexOf(atual);
  if (k >= 0) return { ...e, tipos, etapa: k };
  const ordem = ORDEM_AUTOMATICO.indexOf(atual);
  const seguinte = tipos.findIndex((c) => ORDEM_AUTOMATICO.indexOf(c) > ordem);
  if (seguinte < 0) return { ...e, tipos, etapa: tipos.length, nivel: 1, ultimas: [], naEtapa: 0, vez: 0 };
  return { ...e, tipos, etapa: seguinte, nivel: 1, ultimas: [], naEtapa: 0 };
}

/** O estado gravado, se ainda é válido (o modo continua de onde parou). */
export function lerAutomatico(gravado: unknown): EstadoAutomatico | null {
  const e = gravado as Partial<EstadoAutomatico> | null;
  if (!e || !Array.isArray(e.tipos) || !e.tipos.length || !e.tipos.every((c) => ORDEM_AUTOMATICO.includes(c))) return null;
  if (typeof e.etapa !== "number" || e.etapa < 0 || e.etapa > e.tipos.length || ![1, 2, 3].includes(e.nivel as number)) return null;
  return { tipos: e.tipos, etapa: e.etapa, nivel: e.nivel as Nivel, ultimas: Array.isArray(e.ultimas) ? e.ultimas.slice(-JANELA_PARA_SUBIR) : [], naEtapa: e.naEtapa ?? 0, vez: e.vez ?? 0 };
}
