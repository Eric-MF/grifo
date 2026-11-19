// Busca no texto das leis: por número de artigo ("121", "art. 155-A") ou por palavras.

import { romanoParaArabico, sufixoDoItem } from "@/lib/leis/prefixo";
import { idSumulas } from "@/lib/leis/sumulas";
import leis from "@/content/generated/leis.json";
import indice from "@/content/generated/leis-indice.json";

/**
 * [id do artigo, rótulo, texto vigente, disps?] — formato de public/dados/leis/<id>.artigos.json.
 * O 4º elemento é o dispositivo de cada linha do texto, relativo ao artigo ("" = o próprio artigo).
 */
export type ArtigoTexto = [id: string, rotulo: string, texto: string, disps?: string[]];

export const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Alvo da busca rápida do leitor: o artigo e, se foi digitado, o dispositivo dentro dele ("5 XI" → art5.i11). */
export interface AlvoDigitado {
  art: string;
  disp?: string;
}

// separadores entre as partes ("5, XI", "5 inc. XI"): espaço, vírgula e ponto
const SEP = String.raw`[\s,.]*`;
const ASPAS = String.raw`["“”‘’']?`;
// romano minúsculo válido; começa por i, v, x, l ou c para não casar com palavras ("civil")
const ROMANO = /^(?=[ivxlc])c{0,3}(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/;
const PREFIXO_ART = /^(?:artigos?|arts?)(?![a-z])\.?/;
const NUMERO_ART = /^\s*(\d{1,3}(?:\.\d{3})+|\d{1,4})(?!\d)/;
const ORDINAL = /^(?:[º°]|o(?![a-z]))/;
// letra do artigo só presa ("155A") ou com hífen ("155-A"); "5 a" não é, e "5p35" não é "5-p" seguido de 35
const LETRA_ART = /^(?:\s*-\s*|)([a-z])(?![a-z0-9])/;
const CAPUT = new RegExp(`^${SEP}caput(?![a-z])`);
const PARAGRAFO = new RegExp(`^${SEP}(?:§|par(?:agrafo)?\\.?|p\\.?)\\s*(\\d+)(?:[º°]|o(?![a-z]))?(?:-\\s*([a-z])(?![a-z]))?`);
const PARAGRAFO_UNICO = new RegExp(`^${SEP}(?:§|par(?:agrafo)?\\.?|p\\.?)\\s*(?:unico|u\\.?)(?![a-z])`);
// inciso em algarismo arábico, com "i" colado ("i38"), com "i" ou "inc." e espaço ("i 38", "inc. 38"); antes do romano
const INCISO_ARABE = new RegExp(`^${SEP}(?:incisos?|inc\\.?|i)${SEP}(\\d+)(?:\\s*-\\s*([a-z])(?![a-z]))?`);
const INCISO = new RegExp(`^${SEP}(?:(?:incisos?|inc\\.?)${SEP})?([a-z]+)(?:\\s*-\\s*([a-z])(?![a-z]))?`);
const ALINEA_COM_PALAVRA = new RegExp(`^${SEP}(?:alinea|al\\.)\\s*${ASPAS}([a-z])${ASPAS}(?![a-z])`);
const ALINEA = new RegExp(`^${SEP}${ASPAS}([a-z])${ASPAS}(?![a-z])`);

/**
 * Lê o que o usuário digitou na busca do leitor, se for só uma referência a artigo: "121", "art. 155-A",
 * "5º", "1.072", "10 pu", "121 § 2º IV", "5 XXVIII a", "5 alínea b", "5 i38" / "5 inc. 38" (inciso em algarismo),
 * "5 p38" / "121 p.2" (parágrafo), "5p35" / "5i38" (sem espaço). Texto com outras palavras: null.
 * O dispositivo segue a ordem parágrafo → inciso → alínea; "caput" é ignorado.
 */
export function alvoDigitado(consulta: string): AlvoDigitado | null {
  let t = semAcento(consulta).trim().replace(PREFIXO_ART, "");
  const numero = t.match(NUMERO_ART);
  if (!numero) return null;
  let art = `art${Number(numero[1]!.replace(/\./g, ""))}`;
  t = t.slice(numero[0].length);
  const ordinal = t.match(ORDINAL);
  if (ordinal) t = t.slice(ordinal[0].length);
  else {
    const letra = t.match(LETRA_ART);
    if (letra) {
      art += `-${letra[1]}`;
      t = t.slice(letra[0].length);
    }
  }
  // consome do começo do resto o que casa com a expressão (e devolve o casamento)
  const le = (re: RegExp) => {
    const m = t.match(re);
    if (m) t = t.slice(m[0].length);
    return m;
  };
  let disp = art;
  let pai = false;
  le(CAPUT);
  const paragrafo = le(PARAGRAFO);
  if (paragrafo) {
    disp += `.${sufixoDoItem("p", { n: Number(paragrafo[1]), letra: paragrafo[2] })}`;
    pai = true;
  } else if (le(PARAGRAFO_UNICO)) {
    disp += ".pu";
    pai = true;
  }
  const incisoArabe = le(INCISO_ARABE);
  const inciso = incisoArabe ? null : t.match(INCISO);
  if (incisoArabe) {
    disp += `.${sufixoDoItem("i", { n: Number(incisoArabe[1]), letra: incisoArabe[2] })}`;
    pai = true;
  } else if (inciso && ROMANO.test(inciso[1]!)) {
    t = t.slice(inciso[0].length);
    disp += `.${sufixoDoItem("i", { n: romanoParaArabico(inciso[1]!.toUpperCase()), letra: inciso[2] })}`;
    pai = true;
  }
  // alínea: com a palavra "alínea" pode vir logo após o artigo; sem ela, só depois de inciso ou parágrafo
  const alinea = le(ALINEA_COM_PALAVRA) ?? (pai ? le(ALINEA) : null);
  if (alinea) disp += `.a${alinea[1]}`;
  if (!/^[\s,.]*$/.test(t)) return null;
  return disp === art ? { art } : { art, disp };
}

/** "121", "art. 121", "Art 155-A", "5º", "5 XI" → id do artigo procurado (ver alvoDigitado), ou null se não for número de artigo. */
export function artigoDigitado(consulta: string): string | null {
  return alvoDigitado(consulta)?.art ?? null;
}

/** Na lista de súmulas, tira a palavra no começo: "Súmula nº 145" → "145", "sum. 145" → "145", "S. 145" → "145". */
export function semPalavraSumula(consulta: string): string {
  return consulta.normalize("NFC").replace(/^\s*(?:s[úu]mulas?\s*(?:vinculantes?\s*)?|sum\.?|s\.|sv)\s*(?:n\s*[º°o]?\.?\s*)?(?=\d)/i, "");
}

/** O id completo do dispositivo da linha do texto ("art121.p2.i4"); a linha sem dispositivo próprio dá o artigo. */
export function dispDaLinha(a: ArtigoTexto, linha: number): string {
  return a[3]?.[linha] ? `${a[0]}.${a[3][linha]}` : a[0];
}

/** Se o artigo tem o dispositivo (id completo, como "art5.i35"); o próprio artigo conta. */
export function temDispositivo(a: ArtigoTexto, disp: string): boolean {
  return disp === a[0] || !!a[3]?.some((s) => `${a[0]}.${s}` === disp);
}

/**
 * Destino da busca rápida. Se o artigo não tem o parágrafo digitado mas tem o inciso de mesmo número
 * ("5p35" → art5.i35, pois o art. 5º não tem § 35, mas tem o inciso XXXV), vai para o inciso.
 */
export function ajustarAlvo(alvo: AlvoDigitado, a: ArtigoTexto | undefined): string {
  const destino = alvo.disp ?? alvo.art;
  if (!a || !a[3] || !alvo.disp || temDispositivo(a, alvo.disp)) return destino;
  const [art, ...segs] = alvo.disp.split(".");
  if (!/^p\d+(?:-[a-z])?$/.test(segs[0] ?? "")) return alvo.disp;
  const inciso = `i${segs[0]!.slice(1)}`;
  const inteiro = [art, inciso, ...segs.slice(1)].join(".");
  if (temDispositivo(a, inteiro)) return inteiro;
  const ateInciso = [art, inciso].join(".");
  if (temDispositivo(a, ateInciso)) return ateInciso;
  return alvo.disp;
}

/** Lei do leitor citada junto da referência ao artigo, e o resto da consulta (já sem a lei). */
export interface LeiDigitada {
  /** id da lei no leitor ("cp", "cpp", "lei-11343") */
  lei: string;
  /** o resto, sem a lei: a referência ao artigo em leiDigitada (alvoDigitado(resto) nunca é null), as palavras em leiNaBusca */
  resto: string;
}

const normaliza = (s: string) => semAcento(s).replace(/\s+/g, " ").trim();
// "lei nº 11.343/2006" → "lei 11343": o número sem pontos nem ano, como nos aliases; "1.072" sem lei fica como está
const LEI_NUMERADA = /(?<![a-z])(decreto-lei|decreto lei|dl|lei|decreto)\s*(?:n\s*[º°o]?\.?\s*)?(\d{1,3}(?:\.\d{3})+|\d+)(?:\s*\/\s*\d{2,4})?/g;
// a palavra "súmula" (ou "sum.", "S.") logo antes do número: "súmula 145", "Súmula nº 145", "S. 145"
const PALAVRA_SUMULA_ANTES_NUMERO = /(?<![a-z])(?:sumulas?|sum\.?|s\.)\s*(?:n\s*[º°o]?\.?\s*)?(?=\d)/g;
// o tribunal com a palavra "súmula" antes ou depois: "súmula do STF", "sumulas stj", "STF súmula"
const SUMULA_DO_TRIBUNAL = /(?<![a-z])sumulas?\s*(?:(?:do|da|de)\s+)?(stf|stj)(?![a-z])/g;
const TRIBUNAL_SUMULA = /(?<![a-z])(stf|stj)\s+sumulas?(?![a-z])/g;

/**
 * Tira a palavra "súmula" de um texto já normalizado, para sobrarem a lei e o número: "súmula 145 do STF" → "145 do stf",
 * "STF súmula 145" → "stf 145", "sum. 145 stf" → "145 stf". Sem a palavra, o texto fica igual.
 */
const semSumula = (t: string) => t.replace(SUMULA_DO_TRIBUNAL, "$1").replace(TRIBUNAL_SUMULA, "$1").replace(PALAVRA_SUMULA_ANTES_NUMERO, "");

// o texto de uma consulta pronto para casar com os aliases: sem acento, sem a palavra "súmula" e com o número da lei sem pontos
const preparar = (consulta: string) => semSumula(normaliza(consulta)).replace(LEI_NUMERADA, (_, p: string, n: string) => `${p} ${n.replace(/\./g, "")}`);

// conectores entre o artigo e a lei: vírgula, espaço, "do/da/de/dos/das"
const CONECTOR_FIM = /(?:[\s,]+|(?<![a-z])(?:dos?|das?|de)\s+)+$/;
const CONECTOR_INICIO = /^(?:[\s,]+|(?:dos?|das?|de)\s+)+/;
// nomes e siglas das leis que estão no leitor, os mais longos primeiro: "cpp" é testado antes de "cp"
const ALIAS_DAS_LEIS: [string, string][] = Object.entries(leis.diplomas as Record<string, { aliases: string[]; sigla?: string }>)
  .filter(([id]) => indice.some((l) => l.id === id))
  .flatMap(([id, d]) => [...d.aliases, ...(d.sigla ? [d.sigla] : [])].map((a): [string, string] => [normaliza(a), id]));
// as súmulas não estão no JSON das leis: o nome do tribunal, sozinho ou com "súmula" ("sumulas do stj"). As
// vinculantes ficam de fora: "súmula vinculante 14" digitada no quiz vai para o leitor de citações da correção
const ALIAS_SUMULAS: [string, string][] = [
  ...(["stf", "stj"] as const).flatMap((t) =>
    ["", "sumula ", "sumulas ", "sumula do ", "sumulas do "].map((palavra): [string, string] => [`${palavra}${t}`, idSumulas(t)]),
  ),
];
const ALIAS_LEIS = [...ALIAS_DAS_LEIS, ...ALIAS_SUMULAS].sort((a, b) => b[0].length - a[0].length);
/** [nome ou sigla normalizado, id da lei], os mais longos primeiro: para achar a lei numa frase ("… do CPP"). */
export const aliasesDasLeis = (): readonly [string, string][] => ALIAS_LEIS;

/**
 * "100 cp", "art. 100 do CP", "100cp", "5 XI CF", "cp, art. 100", "lei 11.343/06 art 33", "súmula 145 do STF", "S. 145 STJ":
 * a lei do leitor e o artigo (ou o número da súmula), ou null.
 */
export function leiDigitada(consulta: string): LeiDigitada | null {
  const t = preparar(consulta);
  for (const [alias, lei] of ALIAS_LEIS) {
    // a lei no fim; não pode vir colada numa letra ("lcp" não é "cp")
    if (t.endsWith(alias)) {
      const antes = t.slice(0, t.length - alias.length);
      const resto = antes.replace(CONECTOR_FIM, "").trim();
      if (!/[a-z]$/.test(antes) && alvoDigitado(resto)) return { lei, resto };
    }
    // a lei no começo, seguida de não-letra ("cpp" não é "cp")
    const depois = t.slice(alias.length);
    if (t.startsWith(alias) && !/^[a-z]/.test(depois)) {
      const resto = depois.replace(CONECTOR_INICIO, "").trim();
      if (alvoDigitado(resto)) return { lei, resto };
    }
  }
  return null;
}

// várias referências num campo: separadas por ";", "+", " e " ou " c/c "
const partesDaReferencia = (texto: string) =>
  texto
    .split(/;|\+|\s+e\s+|\s+c\/c\s+/i)
    .map((p) => p.trim())
    .filter(Boolean);

/** Os artigos digitados sem a lei ("403, §3", "121 e 155"): para avisar que falta a lei. */
export const alvosSemLei = (texto: string): AlvoDigitado[] => partesDaReferencia(texto).flatMap((p) => alvoDigitado(p) ?? []);

/** Uma referência digitada: a lei do leitor e o alvo dentro dela. */
export interface ReferenciaDigitada {
  lei: string;
  alvo: AlvoDigitado;
}

/**
 * As referências de um campo em que só se digita referência (o fundamento, no quiz), com a mesma leitura da busca
 * rápida do leitor: "403, §3 cpp", "406, cpp", "art. 581, IV, do CPP", "5 LXV CF", "súmula 523 stf". Várias vêm
 * separadas por ";", "+", " e " ou " c/c "; a parte sem a lei usa a da parte seguinte (ou da anterior):
 * "art. 321 e 310, III, do CPP". Mudou a leitura da busca, muda aqui também.
 */
export function referenciasDigitadas(texto: string): ReferenciaDigitada[] {
  const ler = (t: string) => {
    const l = leiDigitada(t);
    const alvo = l && alvoDigitado(l.resto);
    return l && alvo ? { lei: l.lei, alvo } : null;
  };
  const inteira = ler(texto);
  if (inteira) return [inteira];
  const partes = partesDaReferencia(texto);
  const lidas = partes.map(ler);
  return partes.flatMap((p, k) => {
    const lida = lidas[k];
    if (lida) return [lida];
    const alvo = alvoDigitado(p);
    const vizinha = lidas.slice(k + 1).find(Boolean) ?? lidas.slice(0, k).reverse().find(Boolean);
    return alvo && vizinha ? [{ lei: vizinha.lei, alvo }] : [];
  });
}

// conectores entre a lei e as palavras da busca: os de leiDigitada, mais "no/na/nos/nas/em"
const CONECTOR_FIM_TEXTO = /(?:[\s,]+|(?<![a-z])(?:dos?|das?|de|nos?|nas?|em)\s+)+$/;
const CONECTOR_INICIO_TEXTO = /^(?:[\s,]+|(?:dos?|das?|de|nos?|nas?|em)\s+)+/;

/**
 * Lei do leitor citada junto de palavras (sem número de artigo): "absolvição cpp", "cpp absolvição sumária",
 * "absolvição do CPP", "lesão corporal código penal". O resto sai normalizado ("absolvicao").
 * Referência a artigo ("100 cp") ou lei sem palavras ("cpp"): null.
 */
export function leiNaBusca(consulta: string): LeiDigitada | null {
  const t = preparar(consulta);
  const valido = (resto: string) => /[a-z]{2}/.test(resto) && alvoDigitado(resto) === null;
  for (const [alias, lei] of ALIAS_LEIS) {
    // a lei no fim; o texto antes dela não pode terminar em letra ("biblioteca" não é "eca")
    if (t.endsWith(alias)) {
      const antes = t.slice(0, t.length - alias.length);
      const resto = antes.replace(CONECTOR_FIM_TEXTO, "").trim();
      if (!/[a-z]$/.test(antes) && valido(resto)) return { lei, resto };
    }
    // a lei no começo; o texto depois dela não pode começar por letra ("cpp" não é "cp")
    const depois = t.slice(alias.length);
    if (t.startsWith(alias) && !/^[a-z]/.test(depois)) {
      const resto = depois.replace(CONECTOR_INICIO_TEXTO, "").trim();
      if (valido(resto)) return { lei, resto };
    }
  }
  return null;
}

/** "1-250": o primeiro e o último número de artigo da lei, sem o ADCT (nas súmulas, "1-736"); sem artigos, null. */
export function faixaDosArtigos(artigos: ArtigoTexto[]): string | null {
  let menor = Infinity;
  let maior = -Infinity;
  for (const [id] of artigos) {
    const m = id.match(/^(?:art|s-)(\d+)/);
    if (!m) continue;
    menor = Math.min(menor, Number(m[1]));
    maior = Math.max(maior, Number(m[1]));
  }
  return maior < 0 ? null : `${menor}-${maior}`;
}

/** Artigos cujo número começa pelo que foi digitado; o exato primeiro. */
export function sugerirArtigos(consulta: string, artigos: ArtigoTexto[], limite = 8): ArtigoTexto[] {
  const alvo = artigoDigitado(consulta);
  if (!alvo) return [];
  const exato = artigos.filter((a) => a[0] === alvo);
  const comeca = artigos.filter((a) => a[0] !== alvo && a[0].startsWith(alvo.replace(/-.*/, "")) && !a[0].startsWith("adct"));
  return [...exato, ...comeca].slice(0, limite);
}

/** Resultado de um número de artigo (o texto mostrado é o começo do artigo, sem destaque). */
export function achadosDoNumero(consulta: string, artigos: ArtigoTexto[], limite = 8): Achado[] {
  return sugerirArtigos(consulta, artigos, limite).map(([art, rotulo, texto]) => ({
    art,
    rotulo,
    antes: "",
    achado: "",
    depois: texto.slice(rotulo.length).replace(/^[\s.\-–:]+/, "").slice(0, 160),
  }));
}

export interface Achado {
  art: string;
  rotulo: string;
  antes: string;
  achado: string;
  depois: string;
  /** o dispositivo da linha em que está a palavra, quando não é o próprio artigo ("art5.i35"); no caput fica vazio */
  disp?: string;
}

/**
 * Artigos que têm todas as palavras (sem acento, sem diferença de maiúsculas);
 * entre aspas, procura a expressão exata. O trecho mostrado é o da primeira ocorrência.
 */
export function buscarTexto(consulta: string, artigos: ArtigoTexto[], limite = 60): Achado[] {
  const frases = [...consulta.matchAll(/"([^"]+)"/g)].map((m) => semAcento(m[1]).trim()).filter(Boolean);
  const palavras = semAcento(consulta.replace(/"[^"]*"/g, " "))
    .split(/[^a-z0-9§-]+/)
    .filter((p) => p.length >= 2);
  const termos = [...frases, ...palavras];
  if (!termos.length) return [];
  const saida: Achado[] = [];
  for (const a of artigos) {
    const [art, rotulo, texto] = a;
    const t = semAcento(texto);
    if (!termos.every((p) => t.includes(p))) continue;
    // semAcento não muda o comprimento do texto em português, então as posições valem no original
    const k = t.indexOf(termos[0]);
    // o dispositivo da linha da primeira ocorrência (número de quebras de linha antes dela)
    const disp = dispDaLinha(a, texto.slice(0, k).split("\n").length - 1);
    // o trecho mostrado fica na linha (no dispositivo) do achado: não começa no inciso anterior nem invade o seguinte
    const inicioLinha = texto.lastIndexOf("\n", k - 1) + 1;
    const fimLinha = texto.indexOf("\n", k) < 0 ? texto.length : texto.indexOf("\n", k);
    const fim = k + termos[0].length;
    saida.push({
      art,
      rotulo,
      antes: (k - inicioLinha > 60 ? "…" : "") + texto.slice(Math.max(inicioLinha, k - 60), k),
      achado: texto.slice(k, fim),
      depois: texto.slice(fim, Math.min(fimLinha, fim + 90)) + (Math.min(fimLinha, fim + 90) < texto.length ? "…" : ""),
      ...(disp !== art ? { disp } : {}),
    });
    if (saida.length >= limite) break;
  }
  return saida;
}
