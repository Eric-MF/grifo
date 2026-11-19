// Contas da aba "Exames anteriores": o filtro de épocas e intervalo, o ranking das peças, as teses e os artigos.
// Funções puras: a página chama de novo a cada mudança de filtro.
import { atende, compilar, lerConsulta, normalizar, OPCOES_PADRAO, type OpcoesBusca } from "./busca";
import type { ArtigoEstat, Era, ExameEstat, OrigemArtigo } from "./tipos";

export interface FiltroExames {
  eras: Era[];
  /** os últimos N exames da época (null = todos) */
  ultimos: number | null;
  /** inclui as reaplicações regionais (XX Porto Velho, XXV Porto Alegre) */
  reaplicacoes: boolean;
}

export const FILTRO_PADRAO: FiltroExames = { eras: ["fgv"], ultimos: null, reaplicacoes: false };

/** Os exames da época escolhida, em ordem cronológica, cortados nos últimos N. */
export function filtrarExames(exames: ExameEstat[], f: FiltroExames): ExameEstat[] {
  const lista = exames
    .filter((e) => f.eras.includes(e.era) && (f.reaplicacoes || !e.variante))
    .sort((a, b) => a.ordem - b.ordem);
  if (f.ultimos === null || f.ultimos >= lista.length) return lista;
  // as reaplicações não contam como mais um exame no "últimos N": vão junto do exame de mesmo número
  const numeros = [...new Set(lista.map((e) => `${e.era}:${e.numero}`))].slice(-f.ultimos);
  return lista.filter((e) => numeros.includes(`${e.era}:${e.numero}`));
}

export interface LinhaRanking {
  tipo: string;
  /** em quantos exames a peça caiu (uma vez por exame, mesmo quando o exame antigo a repetiu) */
  vezes: number;
  /** fração dos exames da lista */
  fracao: number;
  /** posição (índice na lista) de cada exame em que caiu */
  posicoes: number[];
  ultima: ExameEstat;
  /** exames da lista depois da última vez (0 = caiu no mais recente) */
  desdeUltima: number;
  /** a distância média entre duas vezes, em exames (null com uma vez só) */
  intervaloMedio: number | null;
  /** a maior distância entre duas vezes seguidas, em exames */
  maiorJejum: number | null;
}

export type OrdemRanking = "vezes" | "jejum" | "recentes" | "nome";

/** As peças da lista, da mais cobrada para a menos (no empate, a que caiu mais recentemente vem antes). */
export function rankingDePecas(lista: ExameEstat[], nome: (tipo: string) => string = (t) => t, ordem: OrdemRanking = "vezes"): LinhaRanking[] {
  const porTipo = new Map<string, number[]>();
  lista.forEach((e, i) => {
    for (const t of new Set(e.pecas)) porTipo.set(t, [...(porTipo.get(t) ?? []), i]);
  });
  const linhas = [...porTipo].map(([tipo, posicoes]): LinhaRanking => {
    const gaps = posicoes.slice(1).map((p, k) => p - posicoes[k]!);
    const ultimaPos = posicoes.at(-1)!;
    return {
      tipo,
      vezes: posicoes.length,
      fracao: lista.length ? posicoes.length / lista.length : 0,
      posicoes,
      ultima: lista[ultimaPos]!,
      desdeUltima: lista.length - 1 - ultimaPos,
      intervaloMedio: gaps.length ? gaps.reduce((s, g) => s + g, 0) / gaps.length : null,
      maiorJejum: gaps.length ? Math.max(...gaps) : null,
    };
  });
  const porVezes = (a: LinhaRanking, b: LinhaRanking) => b.vezes - a.vezes || b.ultima.ordem - a.ultima.ordem;
  const comparar: Record<OrdemRanking, (a: LinhaRanking, b: LinhaRanking) => number> = {
    vezes: porVezes,
    jejum: (a, b) => b.desdeUltima - a.desdeUltima || porVezes(a, b),
    recentes: (a, b) => a.desdeUltima - b.desdeUltima || porVezes(a, b),
    nome: (a, b) => nome(a.tipo).localeCompare(nome(b.tipo), "pt-BR"),
  };
  return linhas.sort(comparar[ordem]);
}

export type ParteProva = "peca" | "questoes" | "tudo";

export interface Contagem {
  id: string;
  /** exames da lista em que aparece */
  exames: string[];
}

const naParte = (x: { peca: string[]; questoes: string[] }, parte: ParteProva) =>
  parte === "peca" ? x.peca : parte === "questoes" ? x.questoes : [...new Set([...x.peca, ...x.questoes])];

/** Quantos exames da lista têm cada tese, na peça, nas questões ou em qualquer parte. */
export function contarTeses(lista: ExameEstat[], parte: ParteProva): Contagem[] {
  const m = new Map<string, string[]>();
  for (const e of lista) for (const t of naParte(e.teses, parte)) m.set(t, [...(m.get(t) ?? []), e.id]);
  return [...m].map(([id, exames]) => ({ id, exames })).sort((a, b) => b.exames.length - a.exames.length);
}

/** Os artigos mais citados nas tabelas de pontos dos exames da lista. */
export function contarArtigos(artigos: ArtigoEstat[], lista: ExameEstat[], parte: ParteProva, origem: OrigemArtigo | null): (Contagem & { artigo: ArtigoEstat })[] {
  const ids = new Set(lista.map((e) => e.id));
  return artigos
    .filter((a) => !origem || a.origem === origem)
    .map((a) => ({ id: a.chave, artigo: a, exames: naParte(a, parte).filter((id) => ids.has(id)) }))
    .filter((c) => c.exames.length > 0)
    .sort((a, b) => b.exames.length - a.exames.length || a.artigo.rotulo.localeCompare(b.artigo.rotulo, "pt-BR", { numeric: true }));
}

/** A origem dos artigos citados (quantas citações de cada uma), para a barra "de onde vêm os artigos". */
export function origemDosArtigos(contagens: { artigo: ArtigoEstat; exames: string[] }[]): { origem: OrigemArtigo; n: number }[] {
  const m = new Map<OrigemArtigo, number>();
  for (const c of contagens) m.set(c.artigo.origem, (m.get(c.artigo.origem) ?? 0) + c.exames.length);
  return [...m].map(([origem, n]) => ({ origem, n })).sort((a, b) => b.n - a.n);
}

/** A busca da lista de exames nos dados de cada um (número, ano, banca, peça e tese), com a sintaxe de busca.ts. */
export function buscarExames(lista: ExameEstat[], q: string, texto: (e: ExameEstat) => string, opcoes: OpcoesBusca = OPCOES_PADRAO): ExameEstat[] {
  const c = compilar(lerConsulta(q), opcoes);
  if (c.vazia) return lista;
  return lista.filter((e) => atende([normalizar(texto(e), opcoes).texto], c));
}

/** "2,7" exames: uma casa, vírgula. */
export const fmtMedia = (n: number) => n.toFixed(1).replace(".", ",").replace(/,0$/, "");
/** "37%" */
export const fmtPct = (f: number) => `${Math.round(f * 100)}%`;
