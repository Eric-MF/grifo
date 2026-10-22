// Sorteio de perguntas com repetição espaçada simples: peças e categorias em que o jogador erra
// aparecem mais; perguntas vistas recentemente não se repetem.
import objetivas from "@/content/generated/objetivas.json";
import perguntasItens from "@/content/generated/perguntas-itens.json";
import perguntasFixas from "@/content/generated/perguntas.json";
import type { PerguntaFixa } from "@/content/schema";
import { gravarJSON, lerJSON } from "@/lib/storage";
import { CATEGORIAS_PADRAO } from "./categorias";
import { GERADORES } from "./geradores";
import { comNomes } from "./nomes";
import { criarRng } from "./rng";
import type { Categoria, Pergunta, PerguntaItem, PerguntaPeca } from "./types";
import { nomePeca } from "./verificar";

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

/** Quanto o item vale na tabela da FGV: a nota máxima de cada item, somada. */
export function valorDoItem(p: PerguntaItem): number {
  return p.itens.reduce((s, i) => s + (i.valores?.length ? Math.max(...i.valores) : i.componentes.reduce((t, c) => t + c.valor, 0)), 0);
}

/**
 * Em "Por dentro da peça", a chance de cada item é proporcional ao que ele vale na prova: o item de 0,10 aparece
 * um sexto das vezes do de 0,60. Nas outras categorias, todas têm a mesma chance.
 */
export const pesoNoSorteio = (p: Pergunta, c: Categoria) => (c === "peca-detalhe" && p.formato === "item" ? Math.max(0.05, valorDoItem(p)) : 1);

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
  const escolhidas = disponiveis.length ? disponiveis : CATEGORIAS_PADRAO;
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

/** Índices das alternativas de um item (nível fácil): a correta + até 3 erradas, embaralhadas. */
export function opcoesDoItem(p: PerguntaItem): number[] {
  const idx = p.opcoes.map((_, i) => i);
  const corretas = idx.filter((i) => p.opcoes[i].correta);
  const erradas = idx.filter((i) => !p.opcoes[i].correta).sort(() => Math.random() - 0.5).slice(0, 3);
  return [...corretas.slice(0, 1), ...erradas].sort(() => Math.random() - 0.5);
}

/** 4 alternativas (nível fácil): a correta + 3 distratores plausíveis, embaralhadas. */
export function alternativas(p: PerguntaPeca): { tipo: string; nome: string }[] {
  const pool = (p.distratores ?? []).filter((d) => d !== p.resposta.peca);
  const escolhidos = pool.sort(() => Math.random() - 0.5).slice(0, 3);
  return [p.resposta.peca, ...escolhidos]
    .map((tipo) => ({ tipo, nome: nomePeca(tipo) }))
    .sort(() => Math.random() - 0.5);
}
