// Vade Mecum do usuário: várias leis, inteiras ou só alguns artigos ("1-120, 155, 157-A"), só os grifos ou só os erros.
import { gravarJSON, lerJSON } from "@/lib/storage";
import { codificar } from "./compartilhar";
import { textoAtual, type Bloco } from "./linha-do-tempo";
import { localizar, type Marcacao } from "./marcacoes";
import { OPCOES_TEXTO_PADRAO, opcoesTexto, type Filtro, type OpcoesTexto } from "./opcoes";
import type { MarcaTexto } from "./texto";

/** um grifo do usuário, copiado para dentro do Vade Mecum (vai no link, então sem id nem data) */
export type GrifoVade = Pick<Marcacao, "i" | "disp" | "exato" | "prefixo" | "sufixo" | "cor" | "nota" | "inteiro" | "grupo">;

export interface ItemVade {
  lei: string;
  /** o que entra da lei: o texto (ou os artigos escolhidos), só os grifos ou só os artigos em que o usuário errou */
  filtro?: Filtro;
  /** faixas de artigos ("1-120, 155"); com filtro "tudo", vazio = a lei inteira; com "erros", os artigos com erro */
  artigos?: string;
  /** com filtro "grifos" (e para o ● dos artigos com erro): a cópia dos grifos da lei no momento da criação */
  grifos?: GrifoVade[];
  /** os artigos em que o usuário errou, no momento da criação (para o ● e para o filtro "erros") */
  errados?: ErroVade[];
}

/** um artigo com erros, como o leitor mostra: quantos erros, em quantas tentativas, e o nível do ● */
export interface ErroVade {
  artigo: string;
  erros: number;
  tentativas: number;
  nivel?: string;
}

/** Opções de saída. Cada uma vale para o que a sua saída suporta: o link só existe na tela e no arquivo baixado. */
export interface OpcoesVade {
  /** a mesma personalização da leitura (fonte, cor, fundo, vide, anotações…) */
  texto: OpcoesTexto;
  /** índices que o Vade Mecum acrescenta (valem na tela, na impressão e no arquivo) */
  indices: { cronologico: boolean; remissivo: boolean };
  /** só para impressão/PDF: não há links clicáveis no papel */
  impressao: { colunas: boolean; novaPaginaPorLei: boolean };
  /** só para o arquivo baixado: os links "Grifo" e "Planalto" ao lado de cada artigo */
  download: { links: boolean };
}

export const OPCOES_VADE_PADRAO: OpcoesVade = {
  texto: OPCOES_TEXTO_PADRAO,
  indices: { cronologico: false, remissivo: false },
  impressao: { colunas: false, novaPaginaPorLei: false },
  download: { links: true },
};

/** Opções de um Vade Mecum salvo antes de existirem (ou com alguma faltando): completa com o padrão. */
export const opcoesDoVade = (v?: Partial<OpcoesVade> | null): OpcoesVade => ({
  texto: opcoesTexto(v?.texto),
  indices: { ...OPCOES_VADE_PADRAO.indices, ...(v?.indices ?? {}) },
  impressao: { ...OPCOES_VADE_PADRAO.impressao, ...(v?.impressao ?? {}) },
  download: { ...OPCOES_VADE_PADRAO.download, ...(v?.download ?? {}) },
});

export interface Vademecum {
  id: string;
  titulo: string;
  itens: ItemVade[];
  em: number;
  opcoes?: OpcoesVade;
}

const K = "grifo:vademecuns";
export const lerVademecuns = () => lerJSON<Vademecum[]>(K, []);
export const gravarVademecuns = (vs: Vademecum[]) => gravarJSON(K, vs);
export function salvarVademecum(v: Vademecum) {
  gravarVademecuns([v, ...lerVademecuns().filter((x) => x.id !== v.id)]);
}

/** Endereço de leitura: o Vade Mecum vai no próprio link, depois do #. */
export const linkLeitura = async (v: Pick<Vademecum, "titulo" | "itens" | "opcoes">) =>
  `/vademecum/ler/#v=${await codificar({ t: v.titulo, d: v.itens, o: opcoesDoVade(v.opcoes) })}`;

interface Num {
  n: number;
  l: string;
}
/** "154-A", o id do dispositivo ("art154-a.p1") ou o id da súmula ("s-145") → número e letra do artigo. */
function numero(s: string): Num | null {
  const m = s.toLowerCase().replace(/^(adct-)?art|^s-/, "").match(/^(\d+)\s*(?:-\s*([a-z]{1,2}))?/);
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
export function blocosEscolhidos(
  blocos: Bloco[],
  filtro?: { faixas?: [Num, Num][] | null; artigos?: Set<string> },
  revogados = false,
): { i: number; bloco: Bloco }[] {
  const atuais = textoAtual(blocos, { revogados });
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

/**
 * Blocos de um item do Vade Mecum (texto vigente), conforme o filtro:
 * "tudo" = os artigos escolhidos (ou a lei inteira); "erros" = só os artigos em que o usuário errou (a lista da criação);
 * "grifos" = só os parágrafos grifados, cada um com o caput do seu artigo e os títulos antes dele.
 */
export function blocosDoItem(
  blocos: Bloco[],
  item: Pick<ItemVade, "filtro" | "artigos" | "grifos">,
  revogados = false,
  automaticos?: Set<number>,
): { i: number; bloco: Bloco }[] {
  if (item.filtro === "grifos") return blocosComMarca(blocos, new Set(marcasPorBloco(blocos, item.grifos ?? []).keys()), revogados);
  if (item.filtro === "automaticos") return blocosComMarca(blocos, automaticos ?? new Set(), revogados);
  if (item.filtro === "erros") return blocosEscolhidos(blocos, { faixas: faixas(item.artigos ?? "") ?? [] }, revogados);
  return blocosEscolhidos(blocos, item.artigos?.trim() ? { faixas: faixas(item.artigos) } : undefined, revogados);
}

/** Onde cada grifo cai no texto da lei: bloco → trechos (ini/fim) com a cor e a nota. Um grifo que não se acha mais fica de fora. */
export function marcasPorBloco(blocos: Bloco[], grifos: GrifoVade[]): Map<number, MarcaTexto[]> {
  const textos = blocos.map((b) => b.texto ?? "");
  const disps = blocos.map((b) => b.disp);
  const saida = new Map<number, MarcaTexto[]>();
  for (const g of grifos) {
    const achado = localizar({ ...g, id: "", em: 0 } as Marcacao, textos, disps);
    if (!achado) continue;
    const lista = saida.get(achado.i) ?? [];
    // o parágrafo inteiro grifado: a forma é do bloco, não de cada linha
    const inteiro = achado.ini === 0 && achado.fim === textos[achado.i]!.length;
    lista.push({ ini: achado.ini, fim: achado.fim, cor: g.cor, nota: g.nota, inteiro });
    saida.set(achado.i, lista);
  }
  return saida;
}

/** O texto dos blocos marcados (um grifo, pronto ou do usuário): cada um com o caput do artigo e os títulos antes dele. */
function blocosComMarca(blocos: Bloco[], comGrifo: Set<number>, revogados: boolean): { i: number; bloco: Bloco }[] {
  const artigos = new Set<string>();
  for (const i of comGrifo) if (blocos[i]?.disp) artigos.add(artigoDe(blocos[i].disp!));
  const saida: { i: number; bloco: Bloco }[] = [];
  let cabecalhos: { i: number; bloco: Bloco }[] = [];
  for (const x of textoAtual(blocos, { revogados })) {
    const b = x.bloco;
    const caput = !!b.disp && b.tipo === "artigo" && b.disp === artigoDe(b.disp);
    if (comGrifo.has(x.i) || (caput && artigos.has(artigoDe(b.disp!)))) {
      saida.push(...cabecalhos, x);
      cabecalhos = [];
    } else if (!b.disp && (b.tipo === "estrutura" || b.tipo === "rubrica")) cabecalhos.push(x);
    else if (b.tipo === "artigo") cabecalhos = [];
  }
  return saida;
}

const MESES = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Data de uma lei ("DECRETO-LEI No 2.848, DE 7 DE DEZEMBRO DE 1940" → 1940-12-07), lida do título do texto.
 * Sem dia e mês no título, usa o ano do registro (1988-00-00). Vazio se não houver nem um nem outro.
 */
export function dataDaLei(blocos: Bloco[], ano?: number): string {
  for (const b of blocos.slice(0, 12)) {
    const m = semAcento(b.texto ?? "").match(/(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})/);
    const mes = m ? MESES.indexOf(m[2]) : -1;
    if (m && mes >= 0) return `${m[3]}-${String(mes + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return ano ? `${ano}-00-00` : "";
}
