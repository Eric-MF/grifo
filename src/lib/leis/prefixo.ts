// Subdivisões citadas logo antes do artigo ("inciso I do art. 5º", "a alínea a do inciso II do art. 5º"):
// o link do artigo as cobre, como faz o Planalto.

const ROMANO = String.raw`[IVXLCDM]+\b`;
const NUM = String.raw`\d+(?:\s*[º°]|o\b)?(?:-[A-Z]\b)?`;
const LETRA = String.raw`["“”']?[a-z]["“”']?(?![A-Za-zÀ-ÿ])`;
const SEP = String.raw`(?:\s*,\s*(?:e\s+|ou\s+)?|\s+(?:e|ou|a)\s+)`;
const SEP_LETRA = String.raw`(?:\s*,\s*(?:e\s+|ou\s+)?|\s+(?:e|ou)\s+)`;
const lista = (item: string, sep = SEP) => `${item}(?:${sep}${item})*`;

const SUBDIVISAO = [
  String.raw`[Aa]l[íi]neas?\s+${lista(LETRA, SEP_LETRA)}`,
  String.raw`[Ii]nc(?:isos?|s?\.)\s+${lista(ROMANO)}`,
  // "nº I", "n. I", "ns. I e II"; o "no" de "no II do art. 751" é "no inciso II", não "nº": fica fora do link
  String.raw`n(?:[º°]|s?\.)\s+${lista(ROMANO)}`,
  String.raw`§§?\s*${lista(NUM)}`,
  String.raw`[Pp]ar[áa]grafo\s+[úu]nico|§\s*[úu]nico`,
  String.raw`[Cc]aput`,
  // o inciso só pelo número ("no II do art. 751"): o número entra no link
  lista(String.raw`[IVXL]+\b`),
];

// subdivisões encadeadas por "do/da/dos/das/no/na", até o fim do texto antes do "art."
const PREFIXO = new RegExp(String.raw`(?<![A-Za-zÀ-ÿ\d])(?:(?:${SUBDIVISAO.join("|")})\s+(?:d[oa]s?|n[oa]s?)\s+)+$`);

/**
 * Início da expressão que o artigo cita junto ("inciso I do art. 5º", "§§ 1º e 2º do art. 383"), a partir do
 * índice `inicio` do "art.". `limite`: fim do link anterior; a expressão não pode começar antes dele.
 * Sem subdivisão (ou se ela começaria dentro do link anterior), devolve `inicio`.
 */
export function inicioPrefixo(texto: string, inicio: number, limite = 0): number {
  const m = texto.slice(0, inicio).match(PREFIXO);
  return m && m.index! >= limite ? m.index! : inicio;
}

export const MAX_DISPOSITIVOS = 30;
export const SEPARADOR_ITENS = /\s*,\s*(?:e\s+|ou\s+)?|\s+(?:e|ou)\s+/;
const VALOR_ROMANO: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

export function romanoParaArabico(s: string): number {
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const v = VALOR_ROMANO[s[i]!] ?? 0;
    const proximo = VALOR_ROMANO[s[i + 1] ?? ""] ?? 0;
    total += v < proximo ? -v : v;
  }
  return total;
}

export interface Item {
  n: number;
  letra?: string;
}

/** Itens de uma lista ("I e II", "1º, 2º-A", "I a III"); null se algum item não se lê. Intervalos têm no máximo 30 itens. */
export function itensDaLista(corpo: string, romano: boolean): Item[] | null {
  const saida: Item[] = [];
  for (const t of corpo.trim().split(SEPARADOR_ITENS)) {
    const intervalo = romano
      ? t.match(/^([IVXLCDM]+)\s+a\s+([IVXLCDM]+)$/)
      : t.match(/^(\d+)(?:\s*[º°]|o)?\s+a\s+(\d+)(?:\s*[º°]|o)?$/);
    if (intervalo) {
      const de = romano ? romanoParaArabico(intervalo[1]!) : Number(intervalo[1]);
      const ate = romano ? romanoParaArabico(intervalo[2]!) : Number(intervalo[2]);
      if (!(de >= 1 && ate >= de)) return null;
      for (let n = de; n <= ate && saida.length < MAX_DISPOSITIVOS; n++) saida.push({ n });
      continue;
    }
    const m = romano
      ? t.match(/^([IVXLCDM]+)(?:\s*-\s*([A-Za-z]))?$/)
      : t.match(/^(\d+)(?:\s*[º°]|o)?(?:\s*-\s*([A-Za-z]))?$/);
    if (!m) return null;
    saida.push({ n: romano ? romanoParaArabico(m[1]!) : Number(m[1]), letra: m[2] });
  }
  return saida;
}

export const sufixoDoItem = (k: "p" | "i", it: Item) => `${k}${it.n}${it.letra ? `-${it.letra.toLowerCase()}` : ""}`;

/** Um nível da cadeia: `rank` 1 = parágrafo, 2 = inciso, 3 = alínea (quanto maior, mais dentro do artigo). */
interface Nivel {
  rank: number;
  sufixos: string[];
}

/** Lê um pedaço da cadeia ("inciso II", "§ 1º-A", "alíneas a e b", "caput"); null se não se lê. "caput" tem rank 0 (ignorado). */
function nivelDe(seg: string): Nivel | null {
  const s = seg.trim().replace(/^n[oa]\s+/, "");
  if (/^caput$/i.test(s)) return { rank: 0, sufixos: [] };
  if (/^[Pp]ar[áa]grafo\s+[úu]nico$/.test(s) || /^§\s*[úu]nico$/.test(s)) return { rank: 1, sufixos: ["pu"] };
  let m = s.match(/^[Aa]l[íi]neas?\s+(.+)$/);
  if (m) {
    const letras = m[1]!.replace(/["“”']/g, "").split(SEPARADOR_ITENS);
    if (!letras.every((l) => /^[a-z]$/i.test(l))) return null;
    return { rank: 3, sufixos: letras.map((l) => `a${l.toLowerCase()}`) };
  }
  m = s.match(/^(?:[Ii]nc(?:isos?|s?\.)|n(?:[º°]|s?\.))\s+(.+)$/);
  if (m) {
    const itens = itensDaLista(m[1]!, true);
    return itens?.length ? { rank: 2, sufixos: itens.map((i) => sufixoDoItem("i", i)) } : null;
  }
  m = s.match(/^§§?\s*(.+)$/);
  if (m) {
    if (/^[úu]nico$/.test(m[1]!)) return { rank: 1, sufixos: ["pu"] };
    const itens = itensDaLista(m[1]!, false);
    return itens?.length ? { rank: 1, sufixos: itens.map((i) => sufixoDoItem("p", i)) } : null;
  }
  // inciso só pelo número ("II do art. 751")
  if (/^[IVXLCDM]+\b/.test(s)) {
    const itens = itensDaLista(s, true);
    return itens?.length ? { rank: 2, sufixos: itens.map((i) => sufixoDoItem("i", i)) } : null;
  }
  return null;
}

/**
 * Dispositivos que a referência nomeia dentro do artigo, a partir do texto entre o início da subdivisão e o "art.":
 * "inciso XI do " + "art5" → ["art5.i11"]; "alínea a do inciso II do " → ["art5.i2.aa"]; "caput do " → [].
 * A cadeia é lida da direita para a esquerda (a subdivisão mais perto do artigo é a mais de fora).
 * Parágrafo e parágrafo único só se ligam ao artigo; alínea pode ficar em inciso, parágrafo ou artigo.
 */
export function dispositivosDoPrefixo(prefixo: string, artId: string): string[] {
  const partes = prefixo.replace(/\s+(?:d[oa]s?|n[oa]s?)\s*$/, "").split(/\s+(?:d[oa]s?|n[oa]s?)\s+/);
  const niveis: Nivel[] = [];
  // de fora para dentro: cada nível tem de ser mais interno que o anterior
  for (const seg of partes.reverse()) {
    const nivel = nivelDe(seg);
    if (!nivel) return [];
    if (nivel.rank === 0) continue;
    if (niveis.length && nivel.rank <= niveis.at(-1)!.rank) return [];
    niveis.push(nivel);
  }
  if (!niveis.length) return [];
  let ids = [artId];
  for (const nivel of niveis) {
    ids = ids.flatMap((base) => nivel.sufixos.map((s) => `${base}.${s}`)).slice(0, MAX_DISPOSITIVOS);
  }
  return ids;
}

// Dispositivos citados logo depois do artigo ("art. 5º, XI, da CF"): o texto que segue o número do artigo.
const CONECTIVO_ITEM = String.raw`(?:\s*,\s*(?:e\s+|ou\s+)?|\s+(?:e|ou|a)\s+)`;
const SEPARADOR_PARTE = String.raw`(?:\s*,\s*|\s+)`;
// romano válido e maiúsculo (um número romano que não é letra solta: "civil" e "cd" não entram)
const ROMANO_MAIUSCULO = String.raw`M{0,3}(?:CM|CD|D?C{0,3})(?:XC|XL|L?X{0,3})(?:IX|IV|V?I{0,3})`;
const ROMANO_ITEM = String.raw`(?=[IVXLCDM])${ROMANO_MAIUSCULO}(?:\s*-\s*[A-Za-z])?(?![A-Za-zÀ-ÿ])`;
const LISTA_ROMANO = String.raw`${ROMANO_ITEM}(?:${CONECTIVO_ITEM}${ROMANO_ITEM})*`;
const NUM_ITEM = String.raw`\d+(?:\s*[º°]|o(?![a-zà-ÿ]))?(?:\s*-\s*[A-Za-z](?![A-Za-zÀ-ÿ]))?`;
const LISTA_NUMERO = String.raw`${NUM_ITEM}(?:${CONECTIVO_ITEM}${NUM_ITEM})*`;
const LETRA_ITEM = String.raw`["“”']?[a-zA-Z]["“”']?(?![A-Za-zÀ-ÿ])`;
const LISTA_LETRA = String.raw`${LETRA_ITEM}(?:(?:\s*,\s*(?:e\s+|ou\s+)?|\s+(?:e|ou)\s+)${LETRA_ITEM})*`;

const PARTES_SUFIXO: { re: RegExp; rank: number; ler: (m: RegExpMatchArray) => string[] }[] = [
  { re: new RegExp(String.raw`^${SEPARADOR_PARTE}caput(?![A-Za-zÀ-ÿ])`), rank: 0, ler: () => [] },
  {
    re: new RegExp(String.raw`^${SEPARADOR_PARTE}(?:§|[Pp]ar(?:[áa]grafo)?\.?)\s*[úu]nico(?![A-Za-zÀ-ÿ])`),
    rank: 1,
    ler: () => ["pu"],
  },
  // "§§ 1º e 2º" é lista; "§ 4º" é um só: em "arts. 39, § 4º, 150, II", o 150 é outro artigo, não parágrafo do 39
  {
    re: new RegExp(String.raw`^${SEPARADOR_PARTE}(?:§§|[Pp]ar[áa]grafos)\s*(${LISTA_NUMERO})`),
    rank: 1,
    ler: (m) => (itensDaLista(m[1]!, false) ?? []).map((i) => sufixoDoItem("p", i)),
  },
  {
    re: new RegExp(String.raw`^${SEPARADOR_PARTE}(?:§|[Pp]ar[áa]grafo|[Pp]ar\.)\s*(${NUM_ITEM})`),
    rank: 1,
    ler: (m) => (itensDaLista(m[1]!, false) ?? []).map((i) => sufixoDoItem("p", i)),
  },
  // o mesmo para "incisos I e II" (lista) e "inciso I" (um só)
  {
    re: new RegExp(String.raw`^${SEPARADOR_PARTE}[Ii]nc(?:isos|s\.)\s*(${LISTA_ROMANO})`),
    rank: 2,
    ler: (m) => (itensDaLista(m[1]!, true) ?? []).map((i) => sufixoDoItem("i", i)),
  },
  {
    re: new RegExp(String.raw`^${SEPARADOR_PARTE}[Ii]nc(?:iso|\.)\s*(${ROMANO_ITEM})`),
    rank: 2,
    ler: (m) => (itensDaLista(m[1]!, true) ?? []).map((i) => sufixoDoItem("i", i)),
  },
  {
    re: new RegExp(String.raw`^\s*,\s*(${LISTA_ROMANO})`),
    rank: 2,
    ler: (m) => (itensDaLista(m[1]!, true) ?? []).map((i) => sufixoDoItem("i", i)),
  },
  {
    re: new RegExp(String.raw`^${SEPARADOR_PARTE}(?:[Aa]l[íi]neas?|[Aa]l\.)\s*(${LISTA_LETRA})`),
    rank: 3,
    ler: (m) => m[1]!.replace(/["“”']/g, "").split(SEPARADOR_ITENS).map((l) => `a${l.toLowerCase()}`),
  },
  {
    re: new RegExp(String.raw`^${SEPARADOR_PARTE}["“”']([a-zA-Z])["“”']`),
    rank: 3,
    ler: (m) => [`a${m[1]!.toLowerCase()}`],
  },
];

/**
 * Dispositivos que a referência nomeia logo depois do artigo, a partir do texto que segue o número:
 * ", XI, da Constituição" → ["art5.i11"]; ", § 2º, IV, do CP" → ["art121.p2.i4"]; ", III, 'a', do" → ["art5.i3.aa"].
 * Inciso sem a palavra "inciso" só vem depois de vírgula e em maiúsculas. Caput e texto sem dispositivo: [].
 */
export function dispositivosDoSufixo(depois: string, artId: string): string[] {
  // o "º" (ou "o") do número do artigo não entra na cadeia
  let resto = depois.replace(/^(?:[º°]|o(?![a-zà-ÿ]))/, "");
  const niveis: Nivel[] = [];
  for (;;) {
    const parte = PARTES_SUFIXO.map((p) => ({ p, m: resto.match(p.re) })).find((x) => x.m);
    if (!parte?.m) break;
    resto = resto.slice(parte.m[0].length);
    if (parte.p.rank === 0) continue;
    // de dentro para fora na ordem do texto: parágrafo, inciso, alínea
    if (niveis.length && parte.p.rank <= niveis.at(-1)!.rank) return [];
    niveis.push({ rank: parte.p.rank, sufixos: parte.p.ler(parte.m) });
  }
  if (!niveis.length) return [];
  let ids = [artId];
  for (const nivel of niveis) {
    ids = ids.flatMap((base) => nivel.sufixos.map((s) => `${base}.${s}`)).slice(0, MAX_DISPOSITIVOS);
  }
  return ids;
}
