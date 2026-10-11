// Vade-mécum do usuário: várias leis, inteiras ou só alguns artigos ("1-120, 155, 157-A").
import { gravarJSON, lerJSON } from "@/lib/storage";
import { codificar } from "./compartilhar";
import { textoAtual, type Bloco } from "./linha-do-tempo";

export interface ItemVade {
  lei: string;
  /** faixas de artigos; vazio = a lei inteira */
  artigos?: string;
}
export interface Vademecum {
  id: string;
  titulo: string;
  itens: ItemVade[];
  em: number;
}

const K = "grifo:vademecuns";
export const lerVademecuns = () => lerJSON<Vademecum[]>(K, []);
export const gravarVademecuns = (vs: Vademecum[]) => gravarJSON(K, vs);
export function salvarVademecum(v: Vademecum) {
  gravarVademecuns([v, ...lerVademecuns().filter((x) => x.id !== v.id)]);
}

/** Endereço de leitura: o vade-mécum vai no próprio link, depois do #. */
export const linkLeitura = async (v: Pick<Vademecum, "titulo" | "itens">) => `/vademecum/ler/#v=${await codificar({ t: v.titulo, d: v.itens })}`;

interface Num {
  n: number;
  l: string;
}
/** "154-A" ou o id do dispositivo ("art154-a.p1") → número e letra do artigo. */
function numero(s: string): Num | null {
  const m = s.toLowerCase().replace(/^(adct-)?art/, "").match(/^(\d+)\s*(?:-\s*([a-z]{1,2}))?/);
  return m ? { n: Number(m[1]), l: m[2] ?? "" } : null;
}
const comparar = (a: Num, b: Num) => a.n - b.n || a.l.localeCompare(b.l);

/** Interpreta "1-120, 155, 157-A"; devolve null se alguma parte não for entendida. */
export function faixas(texto: string): [Num, Num][] | null {
  const partes = texto.split(/[,;]/).map((p) => p.trim()).filter(Boolean);
  const saida: [Num, Num][] = [];
  for (const p of partes) {
    const m = p.match(/^(\d+\s*(?:-\s*[a-z]{1,2})?)\s*(?:a|até|–|—|\.\.|-(?=\s*\d))\s*(\d+\s*(?:-\s*[a-z]{1,2})?)$/i);
    const a = numero(m ? m[1] : p);
    const b = m ? numero(m[2]) : a;
    if (!a || !b) return null;
    saida.push(comparar(a, b) <= 0 ? [a, b] : [b, a]);
  }
  return saida;
}

export function artigoNaFaixa(disp: string, fs: [Num, Num][]): boolean {
  if (disp.startsWith("adct-")) return false;
  const n = numero(disp);
  return !!n && fs.some(([a, b]) => comparar(a, n) <= 0 && comparar(n, b) <= 0);
}

/** artigo a que pertence o dispositivo: "art121.p2.i6" → "art121" */
export const artigoDe = (disp: string) => disp.split(".")[0];

/**
 * Blocos vigentes de uma lei, só dos artigos escolhidos (por faixas ou por um conjunto de ids),
 * com os títulos e rubricas que vêm logo antes de cada artigo incluído.
 */
export function blocosEscolhidos(blocos: Bloco[], filtro?: { faixas?: [Num, Num][] | null; artigos?: Set<string> }): { i: number; bloco: Bloco }[] {
  const atuais = textoAtual(blocos);
  if (!filtro?.faixas && !filtro?.artigos) return atuais;
  const entra = (disp: string) => (filtro.artigos ? filtro.artigos.has(artigoDe(disp)) : artigoNaFaixa(disp, filtro.faixas!));
  const saida: { i: number; bloco: Bloco }[] = [];
  let cabecalhos: { i: number; bloco: Bloco }[] = [];
  for (const x of atuais) {
    if (!x.bloco.disp) {
      if (x.bloco.tipo === "estrutura" || x.bloco.tipo === "rubrica") cabecalhos.push(x);
      continue;
    }
    if (entra(x.bloco.disp)) {
      saida.push(...cabecalhos, x);
      cabecalhos = [];
    } else if (x.bloco.tipo === "artigo") cabecalhos = [];
  }
  return saida;
}
