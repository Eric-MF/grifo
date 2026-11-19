import type { Componente, Item } from "@/content/schema";

export interface ComponentePontos {
  id: string;
  valor: number;
  rotulo: string;
}

export interface ItemPontos {
  n: string;
  descricao: string;
  pontos: string;
  anulado?: number;
  componentes: ComponentePontos[];
}

export interface PartePontos {
  titulo: string;
  valor: number;
  itens: ItemPontos[];
}

const rotuloDe = (c: Componente) =>
  c.rotulo ?? (c.dispositivo?.length ? c.dispositivo.join(" ou ") : c.termos?.join(" + ") ?? (c.alternativas ?? []).map((a) => a.join(" + ")).join(" ou "));

const pontosDe = (it: Item) => (it.valores ? it.valores.join(" / ") : it.teto !== undefined ? `até ${it.teto}` : "—");

const itemDe = (it: Item): ItemPontos => ({
  n: it.n,
  descricao: it.descricao,
  pontos: pontosDe(it),
  anulado: it.anulado,
  componentes: it.componentes.map((c) => ({ id: c.id, valor: c.valor, rotulo: rotuloDe(c) })),
});

/** Pontuação de cada parte do exame, como está no YAML (serve o exame inteiro e o recorte de /dados/exames). */
export function pontuacaoDo(exame: { peca: { valor: number; itens: Item[] }; questoes: { n: number; valor: number; itens: Item[] }[] }): PartePontos[] {
  return [
    { titulo: "Peça", valor: exame.peca.valor, itens: exame.peca.itens.map(itemDe) },
    ...exame.questoes.map((q) => ({ titulo: `Questão ${q.n}`, valor: q.valor, itens: q.itens.map(itemDe) })),
  ];
}
