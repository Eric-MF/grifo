// Rascunhos e tentativas do simulador, guardados só no navegador.
import type { ResultadoExame } from "./correcao/grader";
import type { ResultadoIA } from "./ia/types";
import { gravarJSON, lerJSON, remover } from "./storage";

interface Rascunho {
  peca: string;
  questoes: string[];
  /** segundos já decorridos no cronômetro */
  decorrido: number;
  /** segundos gastos em cada parte ("peca", "q1"…), com o cronômetro correndo */
  tempos?: Record<string, number>;
  /** a parte em que o examinando estava ("peca", "q1"…): ao continuar, a prova volta para ela */
  aba?: string;
  atualizadoEm: number;
}

export interface Tentativa {
  id: string;
  exameId: string;
  criadaEm: number;
  duracaoSeg: number;
  respostas: { peca: string; questoes: string[] };
  /** segundos gastos em cada parte; ausente nas tentativas feitas antes de o tempo por parte existir */
  tempos?: { peca: number; questoes: number[] };
  resultado: ResultadoExame;
  ia?: ResultadoIA;
  codigo?: string;
  impressao?: number;
}

const kRascunho = (exameId: string) => `grifo:rascunho:${exameId}`;
const K_TENTATIVAS = "grifo:tentativas";
const MAX = 30;

export const lerRascunho = (exameId: string) => lerJSON<Rascunho | null>(kRascunho(exameId), null);
export const salvarRascunho = (exameId: string, r: Rascunho) => gravarJSON(kRascunho(exameId), r);
export const apagarRascunho = (exameId: string) => remover(kRascunho(exameId));

export const listarTentativas = () => lerJSON<Tentativa[]>(K_TENTATIVAS, []);
const gravarTentativas = (todas: Tentativa[]) => gravarJSON(K_TENTATIVAS, todas.slice(0, MAX));

/** Devolve false se o navegador não tinha espaço para guardar a tentativa. */
export function salvarTentativa(t: Tentativa): boolean {
  const todas = listarTentativas().filter((x) => x.id !== t.id);
  todas.unshift(t);
  return gravarTentativas(todas);
}
export const obterTentativa = (id: string) => listarTentativas().find((t) => t.id === id) ?? null;
/** Lê a lista uma vez: a tentativa atualizada volta para o início, como em salvarTentativa. */
export function atualizarTentativa(id: string, patch: Partial<Tentativa>) {
  const todas = listarTentativas();
  const atual = todas.find((t) => t.id === id);
  if (!atual) return;
  gravarTentativas([{ ...atual, ...patch }, ...todas.filter((t) => t.id !== id)]);
}
