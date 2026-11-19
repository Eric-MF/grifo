// A busca da lista de exames das estatísticas: lê a consulta (palavras, "expressões entre aspas", -exclusões,
// alternativas com | ou OU, começo de palavra com *) e procura nos textos, com os trechos achados para mostrar.
// Funções puras; a página normaliza cada texto uma vez e reusa.

export interface OpcoesBusca {
  /** só a palavra inteira ("pena" não acha "apenas"); com *, o começo da palavra */
  palavraInteira: boolean;
  /** "pena" não acha "pená" */
  acentos: boolean;
  /** "CP" não acha "cp" */
  maiusculas: boolean;
}
export const OPCOES_PADRAO: OpcoesBusca = { palavraInteira: false, acentos: false, maiusculas: false };

/** Um termo da consulta: uma palavra, uma expressão entre aspas ou um começo de palavra ("prescri*"). */
export interface Atomo {
  texto: string;
  frase: boolean;
  prefixo: boolean;
}
/** Uma exigência: uma das alternativas tem de aparecer (ou, negada, nenhuma pode aparecer). */
export interface Clausula {
  negada: boolean;
  alternativas: Atomo[];
}
export interface Consulta {
  clausulas: Clausula[];
}

/**
 * Lê a consulta. Espaço separa exigências (todas valem); | ou OU (maiúsculo) junta alternativas; aspas prendem a
 * expressão inteira, na ordem; o hífen na frente exclui; o * no fim pede o começo da palavra. O resto (pontuação, §, º,
 * números) é procurado como está.
 */
export function lerConsulta(q: string): Consulta {
  const pedacos: { texto: string; frase: boolean; negada: boolean; ou: boolean }[] = [];
  const re = /(-?)"([^"]*)"?|(\S+)/g;
  for (let m = re.exec(q); m; m = re.exec(q)) {
    if (m[2] !== undefined) {
      const texto = m[2].trim().replace(/\s+/g, " ");
      if (texto) pedacos.push({ texto, frase: true, negada: m[1] === "-", ou: false });
      continue;
    }
    const bruto = m[3]!;
    if (bruto === "|" || bruto === "OU") {
      pedacos.push({ texto: "", frase: false, negada: false, ou: true });
      continue;
    }
    // "furto|roubo" sem espaços: as alternativas vêm dentro da palavra
    const partes = bruto.split("|");
    partes.forEach((p, i) => {
      if (i > 0) pedacos.push({ texto: "", frase: false, negada: false, ou: true });
      const negada = p.length > 1 && p.startsWith("-");
      const texto = negada ? p.slice(1) : p;
      if (texto) pedacos.push({ texto, frase: false, negada, ou: false });
    });
  }
  const clausulas: Clausula[] = [];
  let juntar = false;
  for (const p of pedacos) {
    if (p.ou) {
      juntar = clausulas.length > 0;
      continue;
    }
    const prefixo = !p.frase && p.texto.length > 1 && p.texto.endsWith("*");
    const atomo: Atomo = { texto: prefixo ? p.texto.slice(0, -1) : p.texto, frase: p.frase, prefixo };
    const anterior = clausulas.at(-1);
    if (juntar && anterior && !anterior.negada && !p.negada) anterior.alternativas.push(atomo);
    else clausulas.push({ negada: p.negada, alternativas: [atomo] });
    juntar = false;
  }
  return { clausulas };
}

const MARCA = /\p{M}/gu;

export interface TextoNormalizado {
  /** o texto como a busca compara (sem acento e em minúsculas, conforme as opções) */
  texto: string;
  /** para cada letra de `texto`, a posição dela no original (para destacar o trecho certo) */
  mapa: number[];
}

/** O texto normalizado, letra a letra, com o mapa de volta para o original. */
export function normalizar(original: string, o: OpcoesBusca): TextoNormalizado {
  let texto = "";
  const mapa: number[] = [];
  let i = 0;
  for (const c of original) {
    let d = o.acentos ? c : c.normalize("NFD").replace(MARCA, "");
    if (!o.maiusculas) d = d.toLowerCase();
    // os espaços seguidos contam como um: "art.  386" acha "art. 386"
    if (/\s/.test(d)) d = texto.endsWith(" ") ? "" : " ";
    for (const x of d) {
      texto += x;
      mapa.push(i);
    }
    i += c.length;
  }
  return { texto, mapa };
}

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export interface ConsultaCompilada {
  positivas: RegExp[][];
  negadas: RegExp[];
  vazia: boolean;
}

/** As expressões regulares de cada termo, já com as opções (o texto do termo passa pela mesma normalização). */
export function compilar(c: Consulta, o: OpcoesBusca): ConsultaCompilada {
  const re = (a: Atomo) => {
    const t = normalizar(a.texto, o).texto.trim();
    if (!t) return null;
    let corpo = t.split(" ").map(escapar).join("\\s+");
    if (o.palavraInteira) corpo = `(?<![\\p{L}\\p{N}])${corpo}${a.prefixo ? "[\\p{L}\\p{N}]*" : "(?![\\p{L}\\p{N}])"}`;
    return new RegExp(corpo, "gu");
  };
  const positivas = c.clausulas
    .filter((x) => !x.negada)
    .map((x) => x.alternativas.map(re).filter((r): r is RegExp => !!r))
    .filter((alts) => alts.length);
  const negadas = c.clausulas
    .filter((x) => x.negada)
    .flatMap((x) => x.alternativas.map(re))
    .filter((r): r is RegExp => !!r);
  return { positivas, negadas, vazia: !positivas.length && !negadas.length };
}

const temEm = (r: RegExp, t: string) => {
  r.lastIndex = 0;
  return r.test(t);
};

/**
 * Os textos (de um exame) atendem à consulta? Cada exigência tem de aparecer em algum dos textos, e nenhuma excluída
 * pode aparecer em nenhum. Consulta vazia atende tudo.
 */
export function atende(textos: string[], c: ConsultaCompilada): boolean {
  if (c.vazia) return true;
  if (c.negadas.some((r) => textos.some((t) => temEm(r, t)))) return false;
  return c.positivas.every((alts) => alts.some((r) => textos.some((t) => temEm(r, t))));
}

export interface Trecho {
  /** o pedaço do texto original em volta do primeiro achado */
  texto: string;
  /** os achados dentro de `texto`, como [início, fim) */
  marcas: [number, number][];
  /** quantos achados o texto inteiro tem */
  achados: number;
}

/** O trecho de um texto em volta do primeiro achado (com `folga` letras de cada lado) e as marcas dos achados nele. */
export function trechoDe(original: string, n: TextoNormalizado, c: ConsultaCompilada, folga = 70): Trecho | null {
  const achados: [number, number][] = [];
  for (const r of c.positivas.flat()) {
    r.lastIndex = 0;
    for (let m = r.exec(n.texto); m; m = r.exec(n.texto)) {
      if (!m[0].length) {
        r.lastIndex++;
        continue;
      }
      const ini = n.mapa[m.index]!;
      const fimNorm = m.index + m[0].length - 1;
      const fim = (n.mapa[fimNorm] ?? original.length - 1) + 1;
      achados.push([ini, Math.min(original.length, fim + (original.codePointAt(fim - 1)! > 0xffff ? 1 : 0))]);
    }
  }
  if (!achados.length) return null;
  achados.sort((a, b) => a[0] - b[0]);
  const [primeiro, primeiroFim] = achados[0]!;
  let ini = Math.max(0, primeiro - folga);
  let fim = Math.min(original.length, Math.max(primeiroFim, primeiro + folga * 2));
  // o trecho começa e termina em palavra inteira, sem cortar o primeiro achado
  if (ini > 0) {
    const m = /\s/.exec(original.slice(ini, primeiro));
    if (m) ini += m.index + 1;
  }
  if (fim < original.length) {
    const k = original.slice(primeiroFim, fim).search(/\s\S*$/);
    if (k >= 0) fim = primeiroFim + k;
  }
  const marcas = achados
    .filter(([a, b]) => a >= ini && b <= fim)
    .reduce<[number, number][]>((acc, [a, b]) => {
      const ult = acc.at(-1);
      if (ult && a <= ult[1]) ult[1] = Math.max(ult[1], b - ini);
      else acc.push([a - ini, b - ini]);
      return acc;
    }, []);
  const prefixo = ini > 0 ? "…" : "";
  const texto = prefixo + original.slice(ini, fim).replace(/\s+/g, " ") + (fim < original.length ? "…" : "");
  // os espaços juntados mudam as posições: refaz as marcas sobre o texto já limpo
  const limpo = original.slice(ini, fim);
  const ajustar = (pos: number) => prefixo.length + limpo.slice(0, pos).replace(/\s+/g, " ").length;
  return { texto, marcas: marcas.map(([a, b]) => [ajustar(a), ajustar(b)]), achados: achados.length };
}
