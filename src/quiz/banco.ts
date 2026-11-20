// Sorteio de perguntas com repetição espaçada simples: peças e categorias em que o jogador erra
// aparecem mais; perguntas vistas recentemente não se repetem.
import objetivas from "@/content/generated/objetivas.json";
import perguntasItens from "@/content/generated/perguntas-itens.json";
import perguntasFixas from "@/content/generated/perguntas.json";
import type { PerguntaFixa } from "@/content/schema";
import { gravarJSON, lerJSON } from "@/lib/storage";
import { CATEGORIAS_PADRAO } from "./categorias";
import { GERADORES } from "./geradores";
import { aplicarNomes, comNomes } from "./nomes";
import { criarRng } from "./rng";
import type { Categoria, Pergunta, PerguntaPeca, PerguntaTese } from "./types";
import { artigoLegivel, nomePeca, type ModoFacil } from "./verificar";

const K = "grifo:quiz";
interface Estado {
  recentes: string[];
  erros: Record<string, number>;
  acertos: Record<string, number>;
  /** erros e acertos por categoria */
  categorias?: Partial<Record<Categoria, { e: number; a: number }>>;
}
const ler = (): Estado => lerJSON<Estado>(K, { recentes: [], erros: {}, acertos: {} });

export function gerarPergunta(geradorId: string, seed: number): PerguntaPeca {
  const g = GERADORES.find((x) => x.id === geradorId)!;
  return { ...g.gerar(criarRng(seed)), id: `${g.id}:${seed}`, fonte: "gerada", formato: "peca", categorias: ["peca"] };
}

const FIXAS: PerguntaPeca[] = (perguntasFixas as PerguntaFixa[]).map((q) => ({
  formato: "peca",
  categorias: ["peca"],
  id: q.id,
  caso: q.caso,
  comando: q.comando,
  resposta: { peca: q.peca, fundamentos: q.fundamentos },
  explicacao: q.explicacao,
  fonte: q.fonte,
  distratores: q.distratores,
  ...((q as { pessoas?: ("m" | "f")[] }).pessoas ? { pessoas: (q as { pessoas?: ("m" | "f")[] }).pessoas } : {}),
}));

/** Rascunhos só aparecem no servidor de desenvolvimento, com ?rascunho=1 na URL. */
export const comRascunhos = () =>
  process.env.NODE_ENV === "development" && typeof location !== "undefined" && new URLSearchParams(location.search).has("rascunho");

const TODAS = [...perguntasItens, ...objetivas] as unknown as (Pergunta & { revisado: boolean })[];
const ACERVO = (rascunhos = comRascunhos()): Pergunta[] => TODAS.filter((p) => p.revisado || rascunhos);

/** Perguntas prontas de cada categoria (os geradores de peça não entram na conta). */
export function tamanhoAcervo(c: Categoria, rascunhos = comRascunhos()): number {
  if (c === "peca") return Infinity;
  return ACERVO(rascunhos).filter((p) => p.categorias.includes(c)).length;
}

const chaveRecente = (p: Pergunta) => (p.formato === "peca" ? p.caso.slice(0, 60) : p.id);

function anotar(est: Estado, p: Pergunta): Pergunta {
  est.recentes = [chaveRecente(p), ...est.recentes].slice(0, 80);
  gravarJSON(K, est);
  return p;
}

/**
 * "Peça e fundamento" é pergunta curta e direta: um caso de poucas linhas e "qual a peça e o fundamento". O enunciado
 * inteiro da peça de um exame (milhares de caracteres) não entra: ele é a prova, não uma questão sobre a peça.
 */
export const MAX_CASO_PECA = 700;
const curta = (p: Pergunta) => p.caso.length <= MAX_CASO_PECA;

/** As perguntas prontas de "Peça e fundamento": casos resumidos de exames e objetivas sobre a peça ou o recurso cabível. */
export const prontasDePeca = (rascunhos = comRascunhos()): Pergunta[] =>
  [...FIXAS, ...ACERVO(rascunhos).filter((p) => p.formato !== "peca" && p.categorias.includes("peca"))].filter(curta);

function sortearPeca(est: Estado): Pergunta {
  // ~20% das vezes, uma pergunta pronta ainda não vista
  const prontas = prontasDePeca().filter((p) => !est.recentes.includes(chaveRecente(p)));
  if (prontas.length && Math.random() < 0.2) return anotar(est, prontas[Math.floor(Math.random() * prontas.length)]);
  const pesos = GERADORES.map((g) => {
    const e = est.erros[g.peca] ?? 0;
    const a = est.acertos[g.peca] ?? 0;
    return ((g.peso ?? 1) * (1 + Math.min(3, e * 0.6))) / (1 + Math.min(2, a * 0.1));
  });
  const total = pesos.reduce((s, p) => s + p, 0);
  for (let tent = 0; tent < 12; tent++) {
    let r = Math.random() * total;
    let i = 0;
    while ((r -= pesos[i]) > 0 && i < pesos.length - 1) i++;
    const p = gerarPergunta(GERADORES[i].id, (Math.random() * 2 ** 31) >>> 0);
    if (!est.recentes.includes(chaveRecente(p))) return anotar(est, p);
  }
  return gerarPergunta(GERADORES[0].id, Date.now() >>> 0);
}

/**
 * Em "Por dentro da peça", a chance de cada tese é proporcional ao que o item dela vale na prova: o item de 0,10
 * aparece um sexto das vezes do de 0,60. Nas outras categorias, todas têm a mesma chance.
 */
export const pesoNoSorteio = (p: Pergunta, c: Categoria) => (c === "peca-detalhe" && p.formato === "tese" ? Math.max(0.05, p.valor) : 1);

function sortearDoAcervo(est: Estado, c: Categoria): Pergunta {
  const todas = ACERVO().filter((p) => p.categorias.includes(c));
  const novas = todas.filter((p) => !est.recentes.includes(p.id));
  const pool = novas.length ? novas : todas;
  const pesos = pool.map((p) => pesoNoSorteio(p, c));
  let r = Math.random() * pesos.reduce((s, x) => s + x, 0);
  let i = 0;
  while ((r -= pesos[i]!) > 0 && i < pool.length - 1) i++;
  return anotar(est, pool[i]!);
}

/** Sorteia a categoria (mais peso para onde o jogador erra) e, dentro dela, a pergunta. */
export function sortearPergunta({ categorias = CATEGORIAS_PADRAO }: { categorias?: Categoria[] } = {}): Pergunta {
  const est = ler();
  const disponiveis = categorias.filter((c) => tamanhoAcervo(c) > 0);
  // "Peça e fundamento" sempre tem perguntas (os geradores)
  const sempre: Categoria[] = ["peca"];
  const escolhidas = disponiveis.length ? disponiveis : sempre;
  const pesos = escolhidas.map((c) => {
    const s = est.categorias?.[c] ?? { e: 0, a: 0 };
    return (1 + Math.min(2, s.e * 0.3)) / (1 + Math.min(1, s.a * 0.05));
  });
  let r = Math.random() * pesos.reduce((s, p) => s + p, 0);
  let i = 0;
  while ((r -= pesos[i]) > 0 && i < pesos.length - 1) i++;
  const c = escolhidas[i];
  // as pessoas da prova ganham nomes da mitologia, novos a cada vez
  return comNomes(c === "peca" ? sortearPeca(est) : sortearDoAcervo(est, c));
}

let porId: Map<string, Pergunta> | null = null;
/**
 * A questão de um id, como saiu no sorteio: do acervo (os rascunhos também, que podem ter sido respondidos no
 * servidor de desenvolvimento) ou de um gerador ("apelacao:12345", o gerador e a semente), com os nomes sorteados
 * daquela vez. null quando ela não existe mais (saiu do acervo).
 */
export function perguntaPorId(id: string, nomes?: readonly string[]): Pergunta | null {
  porId ??= new Map<string, Pergunta>([...FIXAS, ...TODAS].map((p) => [p.id, p]));
  let p = porId.get(id) ?? null;
  const gerada = p ? null : /^(.+):(\d+)$/.exec(id);
  if (gerada && GERADORES.some((g) => g.id === gerada[1])) p = gerarPergunta(gerada[1]!, Number(gerada[2]));
  if (!p) return null;
  return p.pessoas?.length && nomes?.length ? aplicarNomes(p, nomes) : p;
}

export function registrarResultado(p: Pergunta, acertou: boolean) {
  const est = ler();
  if (p.formato === "peca") {
    const bucket = acertou ? est.acertos : est.erros;
    bucket[p.resposta.peca] = (bucket[p.resposta.peca] ?? 0) + 1;
    if (acertou && est.erros[p.resposta.peca]) est.erros[p.resposta.peca] = Math.max(0, est.erros[p.resposta.peca] - 0.5);
  }
  est.categorias ??= {};
  for (const c of p.categorias) {
    const s = (est.categorias[c] ??= { e: 0, a: 0 });
    if (acertou) {
      s.a++;
      s.e = Math.max(0, s.e - 0.5);
    } else s.e++;
  }
  gravarJSON(K, est);
}

export interface OpcoesFacil {
  /** "artigo": a tese é dada e se escolhe o artigo; "tese": o artigo é dado e se escolhe a tese */
  modo: ModoFacil;
  opcoes: { texto: string; correta: boolean }[];
}

/**
 * As alternativas do fácil: metade das vezes o artigo da tese, metade a tese do artigo (quando há teses erradas
 * bastantes). A certa e 3 erradas, das mais parecidas, embaralhadas. Os artigos aparecem só pelo número, sem o texto.
 */
export function opcoesDaTese(p: PerguntaTese, aleatorio: () => number = Math.random): OpcoesFacil {
  const { artigos, teses } = p.erradas;
  const podeTese = teses.length >= 3;
  const modo: ModoFacil = podeTese && (artigos.length < 3 || aleatorio() < 0.5) ? "tese" : "artigo";
  // as erradas: uma das duas mais parecidas e duas das outras, para não ficar sempre as mesmas
  const escolher = (xs: string[]) => {
    const primeiras = xs.slice(0, 2).sort(() => aleatorio() - 0.5).slice(0, 1);
    const resto = xs.filter((x) => !primeiras.includes(x)).sort(() => aleatorio() - 0.5);
    return [...primeiras, ...resto].slice(0, 3);
  };
  const opcoes =
    modo === "tese"
      ? [{ texto: p.tese, correta: true }, ...escolher(teses).map((texto) => ({ texto, correta: false }))]
      : [{ texto: artigoLegivel(p.artigos[0]!), correta: true }, ...escolher(artigos).map((a) => ({ texto: artigoLegivel(a), correta: false }))];
  return { modo, opcoes: opcoes.sort(() => aleatorio() - 0.5) };
}

/** 4 alternativas (nível fácil): a correta + 3 distratores plausíveis, embaralhadas. */
export function alternativas(p: PerguntaPeca): { tipo: string; nome: string }[] {
  const pool = (p.distratores ?? []).filter((d) => d !== p.resposta.peca);
  const escolhidos = pool.sort(() => Math.random() - 0.5).slice(0, 3);
  return [p.resposta.peca, ...escolhidos]
    .map((tipo) => ({ tipo, nome: nomePeca(tipo) }))
    .sort(() => Math.random() - 0.5);
}
