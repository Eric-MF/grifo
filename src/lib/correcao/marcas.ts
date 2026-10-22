// Onde a resposta comprova cada componente da tabela: o trecho do texto original que concedeu o ponto. Usa as mesmas regras
// do corretor (termToRegex, citacaoAtende e a normalização do texto inteiro): a linha é normalizada como o corretor a lê,
// e cada palavra do texto original é ligada aos tokens que ela produz. Assim o trecho marcado é exatamente o que pontuou:
// "3 (três) dias" é um prazo só, "Lei nº 11.340/2006" é uma lei só, e "julga*" marca a palavra "julgamento" inteira.
import type { Componente } from "../../content/schema.ts";
import { citacaoAtende, extrairCitacoes, parseDispositivo } from "./citacoes.ts";
import type { Contexto } from "./grader.ts";
import { normalize, termToRegex } from "./normalize.ts";

/** Um trecho da resposta que comprova um componente: a linha (parágrafo) e as posições do trecho nela. */
export interface Marca {
  linha: number;
  ini: number;
  fim: number;
}

interface Linha {
  /** cada palavra do texto original, sem a pontuação das bordas ("dias." → "dias") */
  palavras: { ini: number; fim: number }[];
  /** os tokens do texto normalizado, como o corretor os enxerga */
  tokens: string[];
  /** para cada token, a palavra do texto original de onde ele saiu */
  origem: number[];
  /** quantos tokens cada palavra produz (zero: a palavra some na normalização, como "(três)" depois de "3") */
  produz: number[];
  /** " tok tok … " como o corretor enxerga o texto */
  norm: string;
}

const CONTEUDO = /[\p{L}\p{N}]/u;

/** As palavras da linha, com a posição de cada uma no texto (sem a pontuação das bordas; "§" também conta). */
function palavrasDaLinha(texto: string): Linha["palavras"] {
  return [...texto.matchAll(/\S+/g)].map((m) => {
    const chars = [...m[0]];
    const a = Math.max(0, chars.findIndex((ch) => CONTEUDO.test(ch)));
    const b = chars.length - Math.max(0, [...chars].reverse().findIndex((ch) => CONTEUDO.test(ch)));
    const ini = m.index! + chars.slice(0, a).join("").length;
    return { ini, fim: ini + chars.slice(a, b).join("").length };
  });
}

const cache = new Map<string, Linha>();

/**
 * Lê uma linha como o corretor: os tokens são os da normalização da linha inteira. Cada token é ligado à palavra de origem
 * pela normalização do texto até o fim de cada palavra (o que o corretor já leu até ali).
 */
function lerLinha(texto: string): Linha {
  const lida = cache.get(texto);
  if (lida) return lida;
  const palavras = palavrasDaLinha(texto);
  const norm = normalize(texto);
  const tokens = norm.trim() ? norm.trim().split(" ") : [];
  const origem: number[] = [];
  const produz = palavras.map(() => 0);
  let t = 0;
  palavras.forEach((p, w) => {
    const prefixo = normalize(texto.slice(0, p.fim)).trim();
    const ate = prefixo ? prefixo.split(" ").length : 0;
    for (; t < Math.min(ate, tokens.length); t++) {
      origem[t] = w;
      produz[w]++;
    }
  });
  // sobras (não deveria haver): ficam com a última palavra
  for (; t < tokens.length; t++) {
    origem[t] = palavras.length - 1;
    produz[palavras.length - 1]++;
  }
  const r = { palavras, tokens, origem, produz, norm };
  if (cache.size > 400) cache.clear();
  cache.set(texto, r);
  return r;
}

/**
 * O trecho do texto original que cobre os tokens de `a` a `b` (inclusive). Palavras que não produzem token logo depois
 * entram no trecho ("Lei nº 11.340/2006": o "nº" some, e o número é a palavra seguinte).
 */
function trechoDosTokens(L: Linha, a: number, b: number): { ini: number; fim: number } | null {
  const wa = L.origem[a];
  let wb = L.origem[b];
  if (wa === undefined || wb === undefined) return null;
  while (wb + 1 < L.palavras.length && L.produz[wb + 1] === 0) wb++;
  return { ini: L.palavras[wa]!.ini, fim: L.palavras[wb]!.fim };
}

/** O primeiro trecho da linha em que a expressão casa (do primeiro token ao último). */
function casa(linha: Linha, re: RegExp): { ini: number; fim: number } | null {
  const m = re.exec(linha.norm);
  if (!m) return null;
  const antes = linha.norm.slice(0, m.index).trim();
  const i = antes ? antes.split(" ").length : 0;
  const n = m[0].trim().split(" ").filter(Boolean).length;
  return n ? trechoDosTokens(linha, i, i + n - 1) : null;
}

/** Primeira ocorrência da expressão em qualquer linha da resposta. */
function primeira(linhas: Linha[], re: RegExp): Marca | null {
  for (let k = 0; k < linhas.length; k++) {
    const t = casa(linhas[k]!, re);
    if (t) return { linha: k, ...t };
  }
  return null;
}

/**
 * Os trechos de uma conjunção de termos (todos têm de aparecer). Prefere o parágrafo: o primeiro, na ordem do texto, em que
 * todos aparecem juntos. Só se nenhum parágrafo os reúne valem as primeiras aparições de cada termo, em qualquer lugar.
 */
function marcasDaConjuncao(lidas: Linha[], termos: string[]): Marca[] | null {
  const regs = termos.map((t) => termToRegex(t));
  for (let k = 0; k < lidas.length; k++) {
    const achados = regs.map((re) => casa(lidas[k]!, re));
    if (achados.every(Boolean)) return achados.map((t) => ({ linha: k, ...t! }));
  }
  const emQualquerLugar = regs.map((re) => primeira(lidas, re));
  return emQualquerLugar.every(Boolean) ? (emQualquerLugar as Marca[]) : null;
}

/** O trecho que comprova um componente (só o que a regra do corretor aceitou). Vazio se ele não pontuou. */
export function marcasDoComponente(c: Componente, linhas: string[], ctx: Contexto): Marca[] {
  const lidas = linhas.map(lerLinha);
  // dispositivo: a citação inteira (a súmula com o tribunal, o artigo com a lei) é o que concede o ponto
  if (c.dispositivo) {
    for (const spec of c.dispositivo) {
      const esperada = parseDispositivo(spec, ctx.lex);
      if (!esperada) continue;
      for (let k = 0; k < lidas.length; k++) {
        const L = lidas[k]!;
        const achada = extrairCitacoes(L.norm, ctx.lex).find((f) => citacaoAtende(esperada, f));
        const trecho = achada ? trechoDosTokens(L, achada.pos, achada.fim) : null;
        if (trecho) return [{ linha: k, ...trecho }];
      }
    }
    // componente misto (dispositivo OU termos): se nenhum dispositivo bateu, valem os termos
    if (!c.termos && !c.alternativas) return [];
  }
  // a primeira alternativa em que todos os termos aparecem, como no corretor (e, de preferência, no mesmo parágrafo)
  for (const conj of c.alternativas ?? [c.termos ?? []]) {
    const achados = marcasDaConjuncao(lidas, conj);
    if (achados) return achados;
  }
  return [];
}

/** Se um parágrafo do gabarito comenta o componente: a regra (termos ou dispositivo) casa com o texto dele. */
export function gabaritoComenta(c: Componente, paragrafo: string, ctx: Contexto): boolean {
  const norm = normalize(paragrafo);
  if (c.dispositivo) {
    const citacoes = extrairCitacoes(norm, ctx.lex);
    if (c.dispositivo.some((spec) => {
      const esperada = parseDispositivo(spec, ctx.lex);
      return !!esperada && citacoes.some((f) => citacaoAtende(esperada, f));
    })) return true;
    if (!c.termos && !c.alternativas) return false;
  }
  return (c.alternativas ?? [c.termos ?? []]).some((conj) => conj.length > 0 && conj.every((t) => termToRegex(t).test(norm)));
}

/** Uma evidência parcial: a palavra da resposta que comprova um termo da regra (mesmo quando a regra não pontuou). */
export interface Evidencia extends Marca {
  /** o termo da regra que a palavra comprova (ou o dispositivo citado) */
  termo: string;
}

/**
 * O que a resposta traz de uma regra mesmo quando ela não pontuou: o dispositivo citado, ou os termos da alternativa
 * que mais casou. É a base do recurso automático: o item não pontuou, mas a resposta tem essas palavras.
 */
export function evidenciasParciais(c: Componente, linhas: string[], ctx: Contexto): Evidencia[] {
  const lidas = linhas.map(lerLinha);
  if (c.dispositivo) {
    const dispositivos: Evidencia[] = [];
    for (const spec of c.dispositivo) {
      const esperada = parseDispositivo(spec, ctx.lex);
      if (!esperada) continue;
      for (let k = 0; k < lidas.length; k++) {
        const L = lidas[k]!;
        const achada = extrairCitacoes(L.norm, ctx.lex).find((f) => citacaoAtende(esperada, f));
        const trecho = achada ? trechoDosTokens(L, achada.pos, achada.fim) : null;
        if (trecho) {
          dispositivos.push({ termo: spec, linha: k, ...trecho });
          break;
        }
      }
      if (dispositivos.length) break;
    }
    if (dispositivos.length || (!c.termos && !c.alternativas)) return dispositivos;
  }
  // a alternativa em que mais termos aparecem: é a que o examinando mais se aproximou da regra
  let melhor: Evidencia[] = [];
  for (const conj of c.alternativas ?? [c.termos ?? []]) {
    const completa = marcasDaConjuncao(lidas, conj);
    const achados = completa
      ? conj.map((t, i) => ({ termo: t, ...completa[i]! }))
      : conj.flatMap((t) => {
          const m = primeira(lidas, termToRegex(t));
          return m ? [{ termo: t, ...m }] : [];
        });
    if (achados.length > melhor.length) melhor = achados;
  }
  return melhor;
}
