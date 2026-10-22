// Recorte do exame que vai para o navegador no simulado. O gabarito comentado fica de fora:
// ele só aparece na página de resultado, depois da entrega.

import type { Exame, Item, Peca, Questao } from "@/content/schema";

export interface ExameSimulado {
  id: string;
  numero: number;
  numeral: string;
  aplicacao?: string;
  observacoes?: string;
  peca: Pick<Peca, "nome" | "tipo" | "aliases" | "enunciado" | "linhas" | "valor"> & { itens: Item[] };
  questoes: (Pick<Questao, "n" | "enunciado" | "linhas" | "valor"> & { itens: Item[] })[];
}

export function paraSimulado(e: Exame): ExameSimulado {
  const { peca, questoes } = e;
  return {
    id: e.id,
    numero: e.numero,
    numeral: e.numeral,
    aplicacao: e.aplicacao,
    observacoes: e.observacoes,
    peca: { nome: peca.nome, tipo: peca.tipo, aliases: peca.aliases, enunciado: peca.enunciado, linhas: peca.linhas, valor: peca.valor, itens: peca.itens },
    questoes: questoes.map((q) => ({ n: q.n, enunciado: q.enunciado, linhas: q.linhas, valor: q.valor, itens: q.itens })),
  };
}
