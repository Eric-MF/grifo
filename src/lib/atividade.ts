// Atividade de cada dia nas perguntas do treino e dos jogos, guardada só no navegador (chave `grifo:atividade`).
// Alimenta "Meu desempenho" em /estatisticas/: os acertos e erros por tipo de pergunta e por peça, o tempo de resposta e
// o calendário de estudo. Os contadores de src/quiz/banco.ts não servem para isso: os erros de lá diminuem com os acertos
// (servem ao sorteio), e aqui a conta é a de verdade.
import type { Categoria } from "@/quiz/types";
import { diaISO } from "./conquistas";
import { gravarJSON, lerJSON } from "./storage";

/** [acertos, erros] */
export type Placar = [number, number];

export interface DiaAtividade {
  a: number;
  e: number;
  /** soma do tempo das respostas, em ms */
  ms: number;
  /** por tipo de pergunta */
  c: Partial<Record<Categoria, Placar>>;
  /** por peça (as perguntas de "Peça e fundamento", pela chave de content/pecas.yaml) */
  p: Record<string, Placar>;
}

export interface Atividade {
  v: 1;
  dias: Record<string, DiaAtividade>;
}

export const CHAVE_ATIVIDADE = "grifo:atividade";
/** dias guardados (os mais antigos saem) */
export const DIAS_ATIVIDADE = 400;

export const ATIVIDADE_VAZIA: Atividade = { v: 1, dias: {} };

const somar = (p: Placar | undefined, acertou: boolean): Placar => [(p?.[0] ?? 0) + (acertou ? 1 : 0), (p?.[1] ?? 0) + (acertou ? 0 : 1)];

/** Conta uma resposta no dia de `agora`. Pura: devolve a atividade nova. */
export function contarResposta(
  at: Atividade,
  r: { acertou: boolean; categorias: Categoria[]; peca?: string; tempoMs: number },
  agora: Date = new Date(),
): Atividade {
  const dia = diaISO(agora);
  const d: DiaAtividade = at.dias[dia] ?? { a: 0, e: 0, ms: 0, c: {}, p: {} };
  const c = { ...d.c };
  for (const cat of r.categorias) c[cat] = somar(c[cat], r.acertou);
  const p = r.peca ? { ...d.p, [r.peca]: somar(d.p[r.peca], r.acertou) } : d.p;
  // um tempo absurdo (a aba ficou aberta) não entra na média: conta no máximo 10 minutos
  const ms = d.ms + Math.min(Math.max(0, r.tempoMs), 600_000);
  const dias = { ...at.dias, [dia]: { a: d.a + (r.acertou ? 1 : 0), e: d.e + (r.acertou ? 0 : 1), ms, c, p } };
  const chaves = Object.keys(dias).sort();
  for (const k of chaves.slice(0, Math.max(0, chaves.length - DIAS_ATIVIDADE))) delete dias[k];
  return { v: 1, dias };
}

export function lerAtividade(): Atividade {
  const salvo = lerJSON<Partial<Atividade> | null>(CHAVE_ATIVIDADE, null);
  return salvo?.v === 1 && salvo.dias && typeof salvo.dias === "object" ? { v: 1, dias: salvo.dias } : ATIVIDADE_VAZIA;
}

export function registrarAtividade(r: Parameters<typeof contarResposta>[1]) {
  gravarJSON(CHAVE_ATIVIDADE, contarResposta(lerAtividade(), r));
}
