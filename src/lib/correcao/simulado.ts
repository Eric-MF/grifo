// Recorte do exame que vai para o navegador no simulado. O gabarito comentado fica de fora:
// ele só aparece na página de resultado, depois da entrega. A versão atualizada é a dos PDFs atualizados (nomes da
// mitologia, erros materiais corrigidos) e traz os avisos de lei nova de cada parte.

import type { Exame, Item, Peca, Questao } from "@/content/schema";
import type { VersaoSimulado } from "@/lib/tentativas";

export interface ExameSimulado {
  id: string;
  numero: number;
  numeral: string;
  aplicacao?: string;
  observacoes?: string;
  versao?: VersaoSimulado;
  /** na versão atualizada: os avisos de lei nova ou de mudança de jurisprudência, por parte ("peca", "q1"…) */
  notas?: { alvo: string; item?: string; lei: string; texto: string }[];
  peca: Pick<Peca, "nome" | "tipo" | "aliases" | "enunciado" | "linhas" | "valor"> & { itens: Item[] };
  questoes: (Pick<Questao, "n" | "enunciado" | "linhas" | "valor"> & { itens: Item[] })[];
}

export function paraSimulado(e: Exame, versao: VersaoSimulado = "original"): ExameSimulado {
  const { peca, questoes } = e;
  return {
    id: e.id,
    numero: e.numero,
    numeral: e.numeral,
    aplicacao: e.aplicacao,
    observacoes: e.observacoes,
    versao,
    notas: versao === "atualizada" ? (e.atualizado?.notas ?? []).map((n) => ({ alvo: n.alvo, item: n.item, lei: n.lei, texto: n.texto })) : [],
    peca: { nome: peca.nome, tipo: peca.tipo, aliases: peca.aliases, enunciado: peca.enunciado, linhas: peca.linhas, valor: peca.valor, itens: peca.itens },
    questoes: questoes.map((q) => ({ n: q.n, enunciado: q.enunciado, linhas: q.linhas, valor: q.valor, itens: q.itens })),
  };
}
