// Dados das leis no navegador, baixados uma vez por página (public/dados/leis/, gerados pelo build).
import type { ArtigoTexto } from "./busca";
import type { Bloco, Datas, InfoBloco } from "./linha-do-tempo";
import { corrigido, corrigirBlocos } from "./texto";
import { jsonDeGzip } from "@/lib/gzip";

export interface LeiCompleta {
  id: string;
  nome: string;
  url: string;
  blocos: Bloco[];
  /** lei de mais de 1 MB: o texto vem em partes (por Livro, ou por Título), e `blocos` chega vazio no arquivo principal */
  total?: number;
  partes?: ParteLei[];
}
export interface ParteLei {
  de: number;
  ate: number;
  rotulo: string;
  arquivo: string;
  /** os artigos que estão na parte ("art5", "art144") */
  artigos?: string[];
}
export interface ArtigosDaLei {
  id: string;
  nome: string;
  artigos: ArtigoTexto[];
}

const caches = new Map<string, Promise<unknown>>();
function obter<T>(url: string): Promise<T> {
  if (!caches.has(url))
    caches.set(
      url,
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(`${r.status} em ${url}`);
        return r.json();
      }),
    );
  return caches.get(url) as Promise<T>;
}

// A lei inteira: as partes (quando há) são baixadas juntas, em paralelo, e emendadas na ordem.
const leisInteiras = new Map<string, Promise<LeiCompleta>>();
function leiInteira(lei: string): Promise<LeiCompleta> {
  if (!leisInteiras.has(lei))
    leisInteiras.set(
      lei,
      obter<LeiCompleta>(`/dados/leis/${lei}.json`).then(async (l) => {
        if (!l.partes?.length) return l;
        const partes = await Promise.all(l.partes.map((p) => obter<{ blocos: Bloco[] }>(`/dados/leis/${p.arquivo}`)));
        return { ...l, blocos: partes.flatMap((p) => p.blocos) };
      }),
    );
  const p = leisInteiras.get(lei)!;
  p.catch(() => leisInteiras.delete(lei));
  return p;
}

/** O arquivo principal da lei, sem juntar as partes: o leitor baixa primeiro só a parte que vai mostrar (ver carregarParte). */
export const carregarManifesto = (lei: string) => obter<LeiCompleta>(`/dados/leis/${lei}.json`);
/** Os blocos de uma parte da lei (blocos de `de` a `ate`), na forma pedida. */
export const carregarParte = (parte: ParteLei, original = false) =>
  obter<{ blocos: Bloco[] }>(`/dados/leis/${parte.arquivo}`).then((p) => corrigirBlocos(p.blocos, original));

// Os textos saem como o Grifo os mostra (ordinal e trema corrigidos), a menos que `original` peça a redação do Planalto.
export const carregarLei = (lei: string, original = false) => leiInteira(lei).then((l) => ({ ...l, blocos: corrigirBlocos(l.blocos, original) }));
export const carregarArtigos = (lei: string, original = false) =>
  obter<ArtigosDaLei>(`/dados/leis/${lei}.artigos.json`).then((d) => ({
    ...d,
    artigos: original ? d.artigos : d.artigos.map(([id, rotulo, texto, disps]) => (disps ? [id, corrigido(rotulo), corrigido(texto), disps] : [id, corrigido(rotulo), corrigido(texto)]) as ArtigoTexto),
  }));
/** Texto superado de cada dispositivo, pelo índice do bloco. */
export const carregarVersoes = (lei: string, original = false) =>
  obter<Record<number, Bloco>>(`/dados/leis/${lei}.versoes.json`).then((v) => Object.fromEntries(Object.entries(v).map(([k, b]) => [k, corrigirBlocos([b], original)[0]!])));
export const carregarDatas = () => obter<Datas>("/dados/leis/_datas.json");
/** Quem cita cada artigo (chave "lei|artigo"), e o nome de cada lei. Gerado no build (src/app/dados/citacoes.json). */
export interface CitacoesGerais {
  nomes: Record<string, string>;
  citacoes: Record<string, { d: string; a: string; r: string }[]>;
}
export const carregarCitacoes = () => obter<CitacoesGerais>("/dados/citacoes.json");

/** Índice alfabético-remissivo de um diploma (palavra-chave → artigos), de content/remissivos/ (gerado no build). */
export interface RemissivoSubitem {
  texto: string;
  ref: string;
}
export interface RemissivoEntrada {
  palavra: string;
  total: number;
  subitens: RemissivoSubitem[];
}
export interface Remissivo {
  fonte: string;
  paginas: number;
  palavras: number;
  subitens: number;
  entradas: RemissivoEntrada[];
}
export const carregarRemissivo = (lei: string) => obter<Remissivo>(`/dados/remissivos/${lei}.json`);

/** O que a página inicial do Vade Mecum mostra das súmulas (gerado no build). Lido sem cache: acompanha as atualizações. */
export type ResumoSumulas = Record<"stf" | "stj" | "vinculantes", { total: number; baixadas: number; coletadoEm: string; unidades: number }>;
export async function carregarResumoSumulas(): Promise<ResumoSumulas> {
  const r = await fetch("/dados/leis/_sumulas.json", { cache: "no-store" });
  if (!r.ok) throw new Error(`${r.status} no resumo das súmulas`);
  return r.json();
}

/** Um arquivo .json.gz que o próprio site serve, comprimido ou já descomprimido pelo navegador (src/lib/gzip.ts). */
const baixarGzip = <T,>(url: string): Promise<T> => fetch(url).then((r) => jsonDeGzip<T>(r));

const infosDasSumulas = new Map<string, Promise<Record<string, InfoBloco[]>>>();
/** As informações adicionais de cada súmula (dispositivo → linhas). Baixa só quando o leitor as pede, uma vez. */
export function carregarInfoSumulas(lei: string): Promise<Record<string, InfoBloco[]>> {
  if (!infosDasSumulas.has(lei))
    infosDasSumulas.set(
      lei,
      baixarGzip<Record<string, InfoBloco[]>>(`/dados/leis/${lei}.info.json.gz`).catch((erro) => {
        infosDasSumulas.delete(lei);
        throw erro;
      }),
    );
  return infosDasSumulas.get(lei)!;
}

/** Súmulas de um tribunal, ou as vinculantes (content/sumulas/, gerado por scripts/sumulas/atualizar.ts). */
export interface SumulaVide {
  texto: string;
  alvo?: { tribunal: "stf" | "stj" | "vinculantes"; numero: number };
}
export interface SumulaDados {
  tribunal: "stf" | "stj" | "vinculantes";
  numero: number;
  status: "vigente" | "superada" | "cancelada";
  /** false quando só a lista foi baixada: o texto ainda não está no Grifo */
  baixada: boolean;
  enunciado: string;
  url: string;
  vide: SumulaVide[];
  extras: {
    ramo?: string;
    julgamento?: string;
    fonte?: string;
    dataAprovacao?: string;
    dataPublicacao?: string;
    teses?: string[];
    precedentesRepresentativos?: { titulo?: string; ementa: string; referencia: string }[];
    jurisprudencia?: { titulo?: string; ementa: string; referencia: string }[];
    observacoes?: string[];
    referenciaLegislativa?: { norma: string; artigos: string[] }[];
    precedentes?: string[];
  };
}
export interface SumulasDoTribunal {
  tribunal: "stf" | "stj" | "vinculantes";
  fonte: string;
  coletadoEm: string;
  total: number;
  baixadas: number;
  sumulas: SumulaDados[];
}
