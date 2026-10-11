import { isMap, isScalar, isSeq, parseDocument, type YAMLSeq } from "yaml";

export type Caminho = (string | number)[];
type Faixa = [number, number, number] | null | undefined;

const faixa = (no: unknown): Faixa => (no as { range?: Faixa } | null | undefined)?.range;
const dentro = (no: unknown, pos: number) => {
  const r = faixa(no);
  return !!r && pos >= r[0] && pos <= r[2];
};
const chaveDe = (k: unknown) => String(isScalar(k) ? k.value : k);

function descer(no: unknown, pos: number, caminho: Caminho): Caminho | null {
  if (isMap(no)) {
    for (const par of no.items) {
      const nome = chaveDe(par.key);
      if (dentro(par.key, pos)) return [...caminho, nome];
      if (dentro(par.value, pos)) return descer(par.value, pos, [...caminho, nome]) ?? [...caminho, nome];
    }
    return null;
  }
  if (isSeq(no)) {
    for (let i = 0; i < no.items.length; i++) {
      if (dentro(no.items[i], pos)) return descer(no.items[i], pos, [...caminho, i]) ?? [...caminho, i];
    }
  }
  return null;
}

/** Caminho do dado sob a posição (índice de caractere) do YAML; null fora de qualquer nó. */
export function caminhoEm(texto: string, pos: number): Caminho | null {
  const doc = parseDocument(texto);
  return dentro(doc.contents, pos) ? (descer(doc.contents, pos, []) ?? []) : null;
}

/** Intervalo [início, fim) do valor no YAML, para selecionar no editor. */
export function intervaloDe(texto: string, caminho: Caminho): [number, number] | null {
  const doc = parseDocument(texto);
  const no = doc.getIn(caminho, true);
  const r = faixa(no);
  return r ? [r[0], r[1]] : null;
}

/** Caminho até o item (peca.itens.N ou questoes.K.itens.N), para o que vale para a peça toda. */
export function caminhoDoItem(caminho: Caminho): Caminho | null {
  for (let i = caminho.length - 2; i >= 0; i--) {
    if (caminho[i] === "itens" && typeof caminho[i + 1] === "number") return caminho.slice(0, i + 2);
  }
  return null;
}

export const textoDeCaminho = (caminho: Caminho) => caminho.join(".");
export const caminhoDeTexto = (texto: string): Caminho => texto.split(".").map((p) => (/^\d+$/.test(p) ? Number(p) : p));

function fluxo(no: unknown) {
  if (isMap(no) || isSeq(no)) {
    no.flow = true;
    (isMap(no) ? no.items.map((p) => p.value) : no.items).forEach(fluxo);
  }
}

export interface NovoComponente {
  valor: number;
  dispositivo: string[];
}

/** Acrescenta um componente com dispositivo ao item; devolve o texto novo, ou null se o item não existe. */
export function inserirComponente(texto: string, caminhoItem: Caminho, novo: NovoComponente): string | null {
  const doc = parseDocument(texto);
  const item = doc.getIn(caminhoItem, true);
  if (!isMap(item)) return null;
  const existentes = (item.toJSON() as { componentes?: { id?: string }[] }).componentes ?? [];
  const usados = new Set(existentes.map((c) => c.id));
  let n = 1;
  while (usados.has(`c${n}`)) n++;
  const existente = item.get("componentes", true);
  let componentes: YAMLSeq<unknown>;
  if (isSeq(existente)) componentes = existente;
  else {
    componentes = doc.createNode([]) as YAMLSeq<unknown>;
    item.set("componentes", componentes);
  }
  const no = doc.createNode({ id: `c${n}`, valor: novo.valor, dispositivo: novo.dispositivo });
  fluxo(no);
  componentes.items.push(no);
  return doc.toString({ lineWidth: 0, blockQuote: "literal" });
}
