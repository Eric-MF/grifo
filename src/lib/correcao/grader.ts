// Corretor automático: aplica a tabela de "Distribuição dos Pontos" da FGV
// (transcrita em content/exames/NN/exame.yaml) a uma resposta.

import type { Componente, Item, Leis, PecasCatalogo } from "../../content/schema.ts";
import type { ExameSimulado } from "./simulado.ts";
import { buildLexico, citacaoAtende, extrairCitacoes, formatarCitacao, parseDispositivo, type Citacao, type Lexico } from "./citacoes.ts";
import { normalize, termToRegex } from "./normalize.ts";

export interface Contexto {
  leis: Leis;
  pecas: PecasCatalogo;
  lex: Lexico;
}
export function criarContexto(leis: Leis, pecas: PecasCatalogo): Contexto {
  return { leis, pecas, lex: buildLexico(leis) };
}

interface ResultadoComponente {
  id: string;
  rotulo: string;
  valor: number;
  obtido: number;
  /** Trechos da resposta (normalizados) que comprovam o acerto. */
  evidencias: string[];
  /** O que faltou, em linguagem legível. */
  faltou: string[];
  /** Pontuaria, mas depende de outro componente que não pontuou. */
  bloqueadoPor?: string;
}
interface ResultadoItem {
  n: string;
  secao?: string;
  descricao: string;
  valor: number;
  obtido: number;
  componentes: ResultadoComponente[];
}
export interface ResultadoParte {
  parte: "peca" | `q${number}`;
  titulo: string;
  valor: number;
  obtido: number;
  /** Nota antes de eventual zeramento (peça inadequada). */
  obtidoBruto: number;
  itens: ResultadoItem[];
  linhasUsadas: number;
  aviso?: { tipo: "inadequada" | "nao-identificada" | "vazia"; mensagem: string };
}
export interface ResultadoExame {
  exameId: string;
  total: number;
  maximo: number;
  aprovado: boolean;
  partes: ResultadoParte[];
}

interface RespostaExame {
  peca: string;
  questoes: string[];
}

export const NOTA_CORTE = 6;

export const round2 = (n: number) => Math.round(n * 100) / 100;

function trecho(norm: string, index: number, len: number) {
  const a = Math.max(0, index - 45);
  const b = Math.min(norm.length, index + len + 45);
  return (a > 0 ? "…" : "") + norm.slice(a, b).trim() + (b < norm.length ? "…" : "");
}

function rotuloComponente(c: Componente, leis: Leis, lex: Lexico): string {
  if (c.rotulo) return c.rotulo;
  if (c.dispositivo) {
    return c.dispositivo
      .map((d) => {
        const p = parseDispositivo(d, lex);
        return p ? formatarCitacao(p, leis) : d;
      })
      .join(" ou ");
  }
  const termos = c.termos ?? c.alternativas?.[0] ?? [];
  return termos.map((t) => t.split("|")[0].replace("*", "…").trim()).join(" + ");
}

function avaliarTermos(norm: string, termos: string[]): { ok: boolean; evid: string[]; faltou: string[] } {
  const evid: string[] = [];
  const faltou: string[] = [];
  for (const t of termos) {
    const m = termToRegex(t).exec(norm);
    if (m) evid.push(trecho(norm, m.index, m[0].length));
    else faltou.push(t.split("|").map((x) => x.trim().replace(/^re:.*/, "(expressão)")).join(" / "));
  }
  return { ok: faltou.length === 0, evid, faltou };
}

function avaliarComponente(
  c: Componente,
  norm: string,
  citacoes: Citacao[],
  tokens: string[],
  ctx: Contexto,
): Omit<ResultadoComponente, "bloqueadoPor"> {
  const rotulo = rotuloComponente(c, ctx.leis, ctx.lex);
  const base = { id: c.id, rotulo, valor: c.valor };

  if (c.dispositivo) {
    for (const spec of c.dispositivo) {
      const esperada = parseDispositivo(spec, ctx.lex);
      if (!esperada) continue;
      const achada = citacoes.find((f) => citacaoAtende(esperada, f));
      if (achada) {
        const idx = tokens.slice(0, achada.pos).join(" ").length;
        return { ...base, obtido: c.valor, evidencias: [trecho(norm, idx, 30)], faltou: [] };
      }
    }
    // Componente misto (dispositivo OU termos): se nenhum dispositivo bateu, tenta os termos.
    if (!c.termos && !c.alternativas) return { ...base, obtido: 0, evidencias: [], faltou: [rotulo] };
  }

  const conjuntos = c.alternativas ?? [c.termos ?? []];
  let melhor: ReturnType<typeof avaliarTermos> | null = null;
  for (const conj of conjuntos) {
    const r = avaliarTermos(norm, conj);
    if (r.ok) return { ...base, obtido: c.valor, evidencias: r.evid, faltou: [] };
    if (!melhor || r.faltou.length < melhor.faltou.length) melhor = r;
  }
  return { ...base, obtido: 0, evidencias: [], faltou: c.dispositivo ? [rotulo] : (melhor?.faltou ?? []) };
}

export function avaliarItens(itens: Item[], texto: string, ctx: Contexto): ResultadoItem[] {
  const norm = normalize(texto);
  const tokens = norm.trim().split(" ");
  const citacoes = extrairCitacoes(norm, ctx.lex);

  return itens.map((item) => {
    const resultados = new Map<string, ResultadoComponente>();
    for (const c of item.componentes) resultados.set(c.id, avaliarComponente(c, norm, citacoes, tokens, ctx));
    // Regra FGV: dispositivo legal sozinho não pontua.
    for (const c of item.componentes) {
      if (!c.requer) continue;
      const dep = resultados.get(c.requer);
      const r = resultados.get(c.id)!;
      if (dep && dep.obtido === 0 && r.obtido > 0) {
        r.obtido = 0;
        r.bloqueadoPor = dep.rotulo;
      }
    }
    const componentes = item.componentes.map((c) => resultados.get(c.id)!);
    const soma = round2(componentes.reduce((s, c) => s + c.valor, 0));
    const valor = item.teto ? Math.min(item.teto, soma) : soma;
    const obtido = round2(Math.min(valor, componentes.reduce((s, c) => s + c.obtido, 0)));
    return { n: item.n, secao: item.secao, descricao: item.descricao, valor, obtido, componentes };
  });
}

/** Identifica a peça escolhida pelo examinando (aproximação pelo início do texto). */
export function identificarPeca(texto: string, tipoEsperado: string, extras: string[], ctx: Contexto) {
  const norm = normalize(texto);
  const head = norm.slice(0, 1200);
  const hits: { tipo: string; nome: string; start: number; end: number }[] = [];
  for (const [tipo, p] of Object.entries(ctx.pecas)) {
    const aliases = [p.nome, ...p.aliases, ...(tipo === tipoEsperado ? extras : [])];
    for (const a of aliases) {
      const m = termToRegex(a).exec(head);
      if (m) hits.push({ tipo, nome: p.nome, start: m.index, end: m.index + m[0].length });
    }
  }
  // Remove acertos contidos em outro maior ("apelacao" dentro de "contrarrazoes de apelacao").
  const maximal = hits.filter(
    (h) => !hits.some((o) => o !== h && o.tipo !== h.tipo && o.start <= h.start && o.end >= h.end && o.end - o.start > h.end - h.start),
  );
  if (maximal.some((h) => h.tipo === tipoEsperado)) return { status: "ok" as const };
  if (maximal.length) {
    const primeira = maximal.sort((a, b) => a.start - b.start)[0];
    return { status: "inadequada" as const, detectada: primeira.nome };
  }
  const esperada = ctx.pecas[tipoEsperado];
  const todos = [esperada?.nome, ...(esperada?.aliases ?? []), ...extras].filter(Boolean) as string[];
  if (todos.some((a) => termToRegex(a).test(norm))) return { status: "ok" as const };
  return { status: "nao-identificada" as const };
}

export function contarLinhas(texto: string) {
  return texto ? texto.replace(/\s+$/, "").split("\n").length : 0;
}

export function corrigirExame(exame: ExameSimulado, resposta: RespostaExame, ctx: Contexto): ResultadoExame {
  const partes: ResultadoParte[] = [];

  // Peça
  const itensPeca = avaliarItens(exame.peca.itens, resposta.peca, ctx);
  const brutoPeca = round2(itensPeca.reduce((s, i) => s + i.obtido, 0));
  const parte: ResultadoParte = {
    parte: "peca",
    titulo: `Peça: ${exame.peca.nome}`,
    valor: exame.peca.valor,
    obtido: brutoPeca,
    obtidoBruto: brutoPeca,
    itens: itensPeca,
    linhasUsadas: contarLinhas(resposta.peca),
  };
  if (!resposta.peca.trim()) {
    parte.aviso = { tipo: "vazia", mensagem: "A peça ficou em branco." };
  } else {
    const id = identificarPeca(resposta.peca, exame.peca.tipo, exame.peca.aliases, ctx);
    if (id.status === "inadequada") {
      parte.obtido = 0;
      parte.aviso = {
        tipo: "inadequada",
        mensagem: `Identificamos "${id.detectada}", mas a peça cabível é "${exame.peca.nome}". Pelo edital, peça inadequada recebe nota zero. A pontuação que você teria nos itens aparece abaixo, só como referência.`,
      };
    } else if (id.status === "nao-identificada") {
      parte.aviso = {
        tipo: "nao-identificada",
        mensagem: `Não encontramos o nome da peça ("${exame.peca.nome}") no texto. Na prova, deixar de nomear a peça pode levar à nota zero.`,
      };
    }
  }
  partes.push(parte);

  // Questões
  exame.questoes.forEach((q, i) => {
    const texto = resposta.questoes[i] ?? "";
    const itens = avaliarItens(q.itens, texto, ctx);
    const obtido = round2(itens.reduce((s, it) => s + it.obtido, 0));
    partes.push({
      parte: `q${q.n}`,
      titulo: `Questão ${q.n}`,
      valor: q.valor,
      obtido,
      obtidoBruto: obtido,
      itens,
      linhasUsadas: contarLinhas(texto),
      aviso: texto.trim() ? undefined : { tipo: "vazia", mensagem: "Questão em branco." },
    });
  });

  const total = round2(partes.reduce((s, p) => s + p.obtido, 0));
  const maximo = round2(partes.reduce((s, p) => s + p.valor, 0));
  return { exameId: exame.id, total, maximo, aprovado: total >= NOTA_CORTE, partes };
}
