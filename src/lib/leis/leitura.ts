// Leitura da lei seca. Uma unidade (artigo, parágrafo, inciso ou alínea) conta como lida quando fica na tela por
// TEMPO_LEITURA_MS e todas as anteriores já foram lidas: os artigos só são lidos do primeiro para o último.
// Funções puras; o armazenamento (localStorage, por visitante) fica nas funções lerLeitura e gravarLeitura.
import { gravarJSON, lerJSON } from "@/lib/storage";
import type { Bloco } from "./linha-do-tempo";

/** Tempo, em milissegundos, em que a unidade precisa ficar na tela para contar como lida. */
export const TEMPO_LEITURA_MS = 2000;

export type TipoLei = "codigo" | "constituicao" | "estatuto" | "lei";

/** Grupos da aba Vade Mecum, na ordem em que aparecem, com a cor de cada tipo (as variáveis seguem o tema, em globals.css). */
export const GRUPOS_LEIS: { tipo: TipoLei; titulo: string; cor: string }[] = [
  { tipo: "codigo", titulo: "Códigos", cor: "var(--lei-codigos)" },
  { tipo: "constituicao", titulo: "Constituição", cor: "var(--lei-constituicao)" },
  { tipo: "estatuto", titulo: "Estatutos", cor: "var(--lei-estatutos)" },
  { tipo: "lei", titulo: "Leis", cor: "var(--lei-leis)" },
];

export interface Unidades {
  /** identificadores (`disp`) das unidades, na ordem do texto */
  ids: string[];
  /** rótulo do artigo ("Art. 121") pelo identificador do artigo */
  rotulos: Record<string, string>;
}

/** Unidades de leitura da lei: os dispositivos com identificador que não foram superados, na ordem do texto. */
export function unidadesDeLeitura(blocos: Bloco[]): Unidades {
  const ids: string[] = [];
  const rotulos: Record<string, string> = {};
  for (const b of blocos) {
    if (!b.disp || b.superada) continue;
    ids.push(b.disp);
    if (b.tipo === "artigo" && b.rotulo) rotulos[b.disp] = b.rotulo;
  }
  return { ids, rotulos };
}

export interface Leitura {
  /** quantas unidades já foram lidas, em ordem */
  n: number;
  /** a última unidade lida */
  ultimo: string | null;
  /** rótulo do artigo da última unidade lida */
  rotulo: string | null;
}

export const LEITURA_INICIAL: Leitura = { n: 0, ultimo: null, rotulo: null };

/** A única unidade que pode contar agora: a próxima da ordem. */
export function proximaUnidade(l: Leitura, ids: string[]): string | null {
  return ids[l.n] ?? null;
}

/** Conta a unidade só se ela for a próxima da ordem; uma unidade fora de ordem não muda nada. */
export function registrarLeitura(l: Leitura, ids: string[], id: string, rotulos: Record<string, string>): Leitura {
  if (proximaUnidade(l, ids) !== id) return l;
  return { n: l.n + 1, ultimo: id, rotulo: rotulos[id.split(".")[0]!] ?? null };
}

/** Fração lida, de 0 a 1. */
export function fracaoLida(n: number, total: number): number {
  return total > 0 ? Math.min(1, Math.max(0, n / total)) : 0;
}

const chave = (lei: string) => `grifo:leitura:${lei}`;

/** Leitura guardada neste navegador; sem dados válidos, começa do zero. */
export function lerLeitura(lei: string): Leitura {
  const salvo = lerJSON<Partial<Leitura>>(chave(lei), {});
  if (typeof salvo.n !== "number" || salvo.n < 0) return LEITURA_INICIAL;
  return {
    n: salvo.n,
    ultimo: typeof salvo.ultimo === "string" ? salvo.ultimo : null,
    rotulo: typeof salvo.rotulo === "string" ? salvo.rotulo : null,
  };
}

export function gravarLeitura(lei: string, l: Leitura): void {
  gravarJSON(chave(lei), l);
}
