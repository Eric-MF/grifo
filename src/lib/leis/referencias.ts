// Liga as referências do texto da lei: "art. 59" (do próprio diploma), "art. 33 da Lei nº 11.343",
// "Lei nº 8.072, de 25 de julho de 1990". Diploma que está no leitor do Grifo vira link interno;
// os demais apontam para o Planalto. Todo link guarda também o endereço original no Planalto.
import leis from "@/content/generated/leis.json";
import { normalize } from "@/lib/correcao/normalize";
import { dispositivosDoPrefixo, dispositivosDoSufixo, inicioPrefixo } from "@/lib/leis/prefixo";

interface Registro {
  nome: string;
  aliases: string[];
  planalto?: string;
  ler?: boolean;
}
const DIPLOMAS = leis.diplomas as Record<string, Registro>;
const POR_ALIAS = new Map(
  Object.entries(DIPLOMAS).flatMap(([id, d]) => d.aliases.map((a) => [normalize(a).trim(), id] as const)),
);

export interface Trecho {
  texto: string;
  /** destino no Grifo (ou no Planalto, quando o diploma não está no leitor) */
  href?: string;
  /** o mesmo destino no Planalto */
  planalto?: string;
  /** lei e artigo de destino ("cp", "art121"), para o pop-up com o texto */
  lei?: string;
  art?: string;
  /** dispositivos citados dentro do artigo, quando a referência os nomeia ("inciso XI do art. 5º" → art5.i11) */
  disps?: string[];
  /** "art. N" sem diploma que não se conseguiu ligar: sem link, com a mensagem MSG_NAO_ENCONTRADO */
  naoEncontrado?: boolean;
}

/** "154-A" → id do dispositivo no leitor ("art154-a") e âncora do Planalto ("art154a"). */
export const idArtigo = (art: string) => `art${art.replace(/\./g, "").replace(/\s*-\s*/, "-").toLowerCase()}`;
const ancoraPlanalto = (art: string) => `#art${art.replace(/[.\s-]/g, "").toLowerCase()}`;

function diplomaPorTexto(t: string): string | null {
  const lei = t.match(/^(Lei Complementar|Decreto-Lei|Decreto|Lei)\s*n[ºo°.]?\s*([\d.]+)/i);
  if (lei) {
    const especie = /complementar/i.test(lei[1]) ? "lc" : /decreto-lei/i.test(lei[1]) ? "decreto-lei" : /decreto/i.test(lei[1]) ? "decreto" : "lei";
    const numero = lei[2].replace(/\./g, "");
    return POR_ALIAS.get(`${especie.replace("-", " ")} ${numero}`) ?? POR_ALIAS.get(`${especie} ${numero}`) ?? `${especie}-${numero}`;
  }
  return POR_ALIAS.get(normalize(t).trim()) ?? null;
}

export function destino(diploma: string, art: string | null, atual: string): Pick<Trecho, "href" | "planalto" | "lei" | "art"> {
  const d = DIPLOMAS[diploma];
  const planalto = d?.planalto ? d.planalto + (art ? ancoraPlanalto(art) : "") : undefined;
  const alvo = d?.ler && art ? { lei: diploma, art: idArtigo(art) } : {};
  if (diploma === atual) return { href: art ? `#${idArtigo(art)}` : undefined, planalto, ...alvo };
  if (d?.ler) return { href: `/leis/${diploma}/${art ? `#${idArtigo(art)}` : ""}`, planalto, ...alvo };
  return { href: planalto, planalto };
}

// Endereço do Planalto sem o que muda entre os links do próprio Planalto e o cadastro: protocolo, "www", âncora,
// "compilado" e a extensão ("Del2848.htm" e "del2848compilado.htm" são a mesma lei).
const chaveDoEndereco = (u: string) => u.toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/#.*$/, "").replace(/compilado/g, "").replace(/\.html?$/, "");
const POR_ENDERECO = new Map(Object.entries(DIPLOMAS).flatMap(([id, d]) => (d.planalto ? [[chaveDoEndereco(d.planalto), id] as const] : [])));
const arquivoDe = (chave: string) => chave.slice(chave.lastIndexOf("/") + 1);
const POR_ARQUIVO = (() => {
  const m = new Map<string, string | null>();
  for (const [chave, id] of POR_ENDERECO) {
    const a = arquivoDe(chave);
    m.set(a, m.has(a) && m.get(a) !== id ? null : id);
  }
  return m;
})();

/**
 * Destino de um link que o Planalto pôs no texto (endereço absoluto): o leitor do Grifo quando a lei está nele, com a
 * prévia do artigo; senão, o próprio endereço do Planalto. "#art81§1ii" vai ao art. 81; "#art154a", ao 154-A.
 */
export function destinoDoPlanalto(endereco: string, atual: string): Pick<Trecho, "href" | "planalto" | "lei" | "art"> {
  const chave = chaveDoEndereco(endereco);
  const diploma = POR_ENDERECO.get(chave) ?? POR_ARQUIVO.get(arquivoDe(chave)) ?? null;
  if (!diploma || !DIPLOMAS[diploma]?.ler) return { href: endereco, planalto: endereco };
  let ancora = "";
  try {
    ancora = decodeURIComponent(endereco.split("#")[1] ?? "");
  } catch {
    ancora = endereco.split("#")[1] ?? "";
  }
  // a letra do artigo não pode ser algarismo romano: "art5ii" é o inciso II do art. 5º
  const m = ancora.match(/^art(\d+)(?:-?([abdefghjkmnopqrstuwyz])(?![a-z]))?/i);
  const art = m ? `${m[1]}${m[2] ? `-${m[2].toUpperCase()}` : ""}` : null;
  const d = destino(diploma, art, atual);
  // âncora que não é de artigo na própria lei ("#cap", sem âncora): fica o endereço do Planalto
  return d.href ? { ...d, planalto: endereco } : { href: endereco, planalto: endereco };
}

// "art. 33", "arts. 33 e 40", "artigo 59" — o diploma vem logo depois ("da Lei nº …", "deste Código") ou é o próprio.
// o sufixo é "º"/"°" (com espaço antes ou não) ou um "o" colado ao número e não seguido de letra ou dígito ("1o", não "ou" nem "o juiz")
const REF = /\b(?:arts?\.|artigos?)\s*(\d+(?:\.\d{3})*)(?:\s*[º°]|o(?![A-Za-zÀ-ÿ\d]))?(?:\s*-\s*([A-Z])\b)?/gi;
const LISTA = /^(\s*(?:,\s*(?=\be\b|\bou\b))?(?:,|\be\b|\bou\b|\ba\b)\s*)(\d+(?:\.\d{3})*)(?:\s*[º°]|o(?![A-Za-zÀ-ÿ\d]))?(?:\s*-\s*([A-Z])\b)?(?![\d/])(?!\s*\(|\s*(?:anos?|dias?|meses|m[êe]s|horas?|vezes|salários?)\b)/;
// "arts. 86, 89, § 2º, e 100": o parágrafo no meio da lista não corta a lista
const PARAGRAFO_NA_LISTA = /^\s*,\s*§§?\s*\d+[º°o]?(?:-[A-Z])?(?=\s*,\s*(?:\be\b|\bou\b))/;
const DIPLOMA_DEPOIS =
  /^[^;()]{0,90}?\b(?:d[oa]s?|n[oa]s?)\s+(Lei Complementar\s*n[ºo°.]?\s*[\d.]+|Decreto-Lei\s*n[ºo°.]?\s*[\d.]+|Decreto\s*n[ºo°.]?\s*[\d.]+|Lei\s*n[ºo°.]?\s*[\d.]+|C[óo]digo de Processo Penal|C[óo]digo Penal|Constitui[çc][ãa]o(?: Federal)?|Lei de Execu[çc][ãa]o Penal|Lei que institui o marco legal do combate ao crime organizado)/i;
const PROPRIO = /^[^;()]{0,40}?\b(dest[ea] (C[óo]digo|Lei|Constitui[çc][ãa]o|Estatuto|Decreto-Lei))/i;
// "(Constituição, arts. 86, 89, § 2º, e 100)": o diploma vem antes dos números, dentro do mesmo parêntese
const DIPLOMA_NO_PARENTESE = /^\(\s*(Constitui[çc][ãa]o(?: Federal)?|C[óo]digo [^(),;]{0,40}|Lei(?: Complementar)? ?n[ºo°.]?\s*[\d.]+|Decreto-Lei ?n[ºo°.]?\s*[\d.]+|Lei [^(),;]{0,40})\s*,\s*$/i;

/** Diploma que abre o parêntese em que está a referência, se ele vier antes dos números (ver DIPLOMA_NO_PARENTESE). */
function diplomaAntesDoParentese(antes: string): string | null {
  const abre = antes.lastIndexOf("(");
  if (abre < 0 || antes.indexOf(")", abre) >= 0) return null;
  const m = antes.slice(abre).match(DIPLOMA_NO_PARENTESE);
  return m ? diplomaPorTexto(m[1]!) : null;
}
const LEI_SOLTA = /\b(Lei Complementar|Decreto-Lei|Lei)\s*n[ºo°.]?\s*([\d.]+)(?:\s*,\s*de\s+\d{1,2}[ºo°]?\s+de\s+[a-zç]+\s+de\s+\d{4})?/gi;

// "acrescidas de metade" (pena) não é alteração de lei: só a fórmula de alteração ("passa a vigorar", "fica acrescido")
const ALTERA = /\b(passa(?:m)? a vigorar|fica(?:m)? acrescid[oa]s?|alter(?:a|ad[oa]s?)|revoga(?:d[oa])?s?)\b/i;

/**
 * Artigo que altera outra lei ("O art. 35 da Lei nº 6.368 ... passa a vigorar acrescido de parágrafo único"): a lei
 * alterada. As referências sem diploma dos blocos seguintes do mesmo artigo são dela, não desta lei.
 */
export function diplomaDaAlteracao(texto: string): string | null {
  if (!ALTERA.test(texto)) return null;
  const m = texto.match(
    /\b(?:d[oa]s?|n[oa]s?)\s+((?:Lei Complementar|Decreto-Lei|Decreto|Lei)\s*n[ºo°.]?\s*[\d.]+|C[óo]digo Penal|C[óo]digo de Processo Penal|Constitui[çc][ãa]o(?: Federal)?|Lei de Execu[çc][ãa]o Penal)/i,
  );
  return m ? diplomaPorTexto(m[1]!) : null;
}

/** Textos da própria lei em que se procura o diploma de um "art. N" sem diploma que a lei não tem. */
export interface Apoio {
  /** caput do artigo que contém a referência */
  caput?: string;
  /** caput do primeiro artigo da lei */
  caputPrimeiro?: string;
  /** ementa e preâmbulo: o texto antes do primeiro artigo */
  preambulo?: string;
  /** quando o texto foi escrito (AAAA-MM-DD; nas súmulas, a aprovação): a Constituição ou o CPC citados são os da época */
  data?: string;
}

/** Mensagem do link que não pôde ser ligado a nenhum diploma. */
export const MSG_NAO_ENCONTRADO = "Não encontramos o link deste artigo: a lei citada não foi identificada.";

const MENCAO =
  /(?:Lei Complementar|Decreto-Lei|Decreto|Lei)\s*n[ºo°.]?\s*[\d.]+|C[óo]digo (?:Penal|de Processo Penal|Civil|de Processo Civil|de Tr[âa]nsito Brasileiro|Eleitoral)|Constitui[çc][ãa]o(?: Federal)?|Lei de Execu[çc][ãa]o Penal|Estatuto da Crian[çc]a e do Adolescente/gi;

/** Primeiro diploma citado no texto que o Grifo consegue ligar (no leitor ou no Planalto); a própria lei não conta. */
function diplomaMencionado(texto: string | undefined, atual: string): string | null {
  if (!texto) return null;
  for (const m of texto.matchAll(MENCAO)) {
    const id = diplomaPorTexto(m[0]);
    if (id && id !== atual && (DIPLOMAS[id]?.ler || DIPLOMAS[id]?.planalto)) return id;
  }
  return null;
}

/**
 * "art. N" sem diploma, na ordem: a própria lei, se tiver o artigo; senão, o diploma citado no caput do artigo,
 * depois no caput do art. 1º e por fim no preâmbulo. Sem nenhum, null: o link não é ligado.
 */
function diplomaSemDiploma(art: string, atual: string, existe: ((art: string) => boolean) | undefined, apoio: Apoio): string | null {
  if (!existe || existe(art)) return atual;
  return diplomaMencionado(apoio.caput, atual) ?? diplomaMencionado(apoio.caputPrimeiro, atual) ?? diplomaMencionado(apoio.preambulo, atual);
}

// Nas súmulas o diploma vem abreviado ("da L. 1.300", "do Dl. 201/67", "da C.F.", "do C. P. C.") ou por nomes que as
// leis não usam ("do Código Tributário Nacional", "da Constituição de São Paulo"). Só nas súmulas: nas leis, um
// "art. N" sem diploma conhecido é da própria lei, e estas formas não aparecem.
const DIPLOMA_NA_SUMULA = new RegExp(
  String.raw`^[^;()]{0,90}?\b(?:d[oa]s?|n[oa]s?)\s+(` +
    [
      String.raw`L\.\s*\d[\d.]*`,
      String.raw`Lei(?:\s+Complementar)?\s*(?:n[º°o]?\.?\s*)?\d[\d.]*`,
      String.raw`LC\s*(?:n[º°o]?\.?\s*)?\d[\d.]*`,
      String.raw`(?:Decreto-[Ll]ei|Dec\.?\s*-?\s*Lei|D\.\s*L|Dl|D)\.?\s*(?:n[º°o]?\.?\s*)?\d[\d.]*`,
      String.raw`Decreto\s*(?:n[º°o]?\.?\s*)?\d[\d.]*`,
      String.raw`C\.\s?F\.?|CF\b|CRFB\b`,
      String.raw`C\.\s?P\.\s?P\.?|CPP\b|C\.\s?Pr\.\s?Pen\.?|C[óo]d\.\s*(?:de\s+)?Proc\.\s*Pen(?:al\b|\.)`,
      String.raw`C\.\s?P\.\s?C\.?|CPC\b|C\.\s?Pr\.\s?Civ\.?|C[óo]d\.\s*(?:de\s+)?Proc\.\s*Civ(?:il\b|\.)`,
      String.raw`C\.\s?P\.|CP\b|C[óo]d\.\s*Penal\b`,
      String.raw`C\.\s?L\.\s?T\.?|CLT\b|CTN\b|CTB\b|ECA\b|CDC\b|ADCT\b|RISTJ\b`,
      String.raw`C[óo]digo(?:\s+(?:de|do|da|dos|das))?(?:\s+[A-ZÀ-Ú][a-zà-ú]+){1,3}`,
      String.raw`Constitui[çc][ãa]o(?:\s+(?:Federal|da\s+Rep[úu]blica|[Ee]stadual|de\s+\d{4}|d[oe]\s+(?:Estado\s+d[eoa]\s+)?[A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)?))?`,
      String.raw`Lei\s+(?:das|dos|de|do|da)\s+[A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){0,2}`,
    ].join("|") +
    ")",
);
// lei de estado ou município ("da L. 4.563, de 20.2.57, do Município de Recife"): não é federal, fica sem link
const LOCAL = /^\s*(?:,\s*de\s+[\d./]+(?:\s+de\s+\d{4})?\s*)?,?\s*(?:d[oa]\s+)?(?:Munic[íi]pio|Estado|Distrito Federal|estadual|municipal)\b/i;

/** O diploma citado numa súmula (id do cadastro, ou "lei-1300" etc.), ou null quando não é federal ou não se sabe qual é. */
function diplomaNaSumula(t: string, depois: string): string | null {
  if (LOCAL.test(depois)) return null;
  const n = t.match(/\d[\d.]*/)?.[0]?.replace(/\./g, "");
  if (n) {
    if (/^(?:L\.|Lei\s*(?:n|\d))/i.test(t)) return diplomaPorTexto(`Lei nº ${n}`);
    if (/^(?:LC|Lei\s+Complementar)/i.test(t)) return diplomaPorTexto(`Lei Complementar nº ${n}`);
    if (/^Decreto\s*(?:n|\d)/i.test(t)) return diplomaPorTexto(`Decreto nº ${n}`);
    return diplomaPorTexto(`Decreto-Lei nº ${n}`);
  }
  const sem = t.replace(/[\s.]/g, "").toUpperCase();
  if (/^(?:CF|CRFB)$/.test(sem)) return "cf";
  if (/^(?:CPP|CPRPEN|C[ÓO]DDEPROCPEN(?:AL)?|C[ÓO]DPROCPEN(?:AL)?)$/.test(sem)) return "cpp";
  if (/^(?:CPC|CPRCIV|C[ÓO]D(?:DE)?PROCCIV(?:IL)?)$/.test(sem)) return "cpc";
  if (/^(?:CP|C[ÓO]DPENAL)$/.test(sem)) return "cp";
  const sigla: Record<string, string> = { CTB: "lei-9503", ECA: "lei-8069", CDC: "lei-8078" };
  if (sigla[sem]) return sigla[sem]!;
  const ano = t.match(/^Constitui[çc][ãa]o\s+de\s+(\d{4})$/i)?.[1];
  if (ano) return `cf-${ano}`;
  if (/^Constitui[çc][ãa]o/i.test(t)) return /^Constitui[çc][ãa]o(?:\s+Federal|\s+da\s+Rep[úu]blica)?$/i.test(t) ? "cf" : null;
  return POR_ALIAS.get(normalize(t).trim()) ?? null;
}

// As Constituições e os CPCs anteriores aos atuais, no Planalto: a súmula aprovada antes de 5/10/1988 cita a
// Constituição de então (o art. 101 de 1946 não é o art. 101 de 1988); a de antes de 2016, o CPC de 1973 ou o de 1939.
const PLANALTO = "https://www.planalto.gov.br/ccivil_03";
const ANTIGOS: Record<string, string> = {
  "cf-1946": `${PLANALTO}/constituicao/constituicao46.htm`,
  "cf-1967": `${PLANALTO}/constituicao/constituicao67.htm`,
  "cf-1969": `${PLANALTO}/constituicao/emendas/emc_anterior1988/emc01-69.htm`,
  "cpc-1939": `${PLANALTO}/decreto-lei/1937-1946/del1608.htm`,
};
const EPOCAS: Record<string, { ate: string; diploma: string }[]> = {
  cf: [
    { ate: "1967-03-15", diploma: "cf-1946" },
    { ate: "1969-10-30", diploma: "cf-1967" },
    { ate: "1988-10-05", diploma: "cf-1969" },
  ],
  cpc: [
    { ate: "1974-01-01", diploma: "cpc-1939" },
    { ate: "2016-03-18", diploma: "lei-5869" },
  ],
};
// a Parte Geral do Código Penal (arts. 1º a 120) foi reescrita em 1984 (Lei 7.209, em vigor desde 13/1/1985)
const PARTE_GERAL_NOVA = "1985-01-13";

/** O diploma da época em que o texto foi escrito ("cf" em 1963 → a Constituição de 1946). */
function diplomaDaEpoca(diploma: string, data: string | undefined): string {
  if (!data) return diploma;
  return EPOCAS[diploma]?.find((e) => data < e.ate)?.diploma ?? diploma;
}

/** Destino de uma referência a um diploma antigo, ou à Parte Geral do CP de antes de 1985 (sem link: o texto mudou). */
function destinoAntigo(diploma: string, art: string, data: string | undefined): Pick<Trecho, "href" | "planalto" | "lei" | "art"> | null {
  if (diploma === "cp" && data && data < PARTE_GERAL_NOVA && Number.parseInt(art, 10) <= 120) return {};
  const url = ANTIGOS[diploma];
  return url ? { href: url + ancoraPlanalto(art), planalto: url + ancoraPlanalto(art) } : null;
}

/**
 * `rotulo`: o "Art. 121" do início do bloco é o próprio dispositivo, não uma referência.
 * `existe`: a lei atual tem o artigo? Se não tem, o "art. N" sem diploma é procurado em `apoio` (ver diplomaSemDiploma).
 * `alteracao`: a lei alterada pelo artigo de que o bloco faz parte (ver diplomaDaAlteracao).
 */
export function trechos(texto: string, atual: string, rotulo?: string, existe?: (art: string) => boolean, alteracao?: string | null, apoio: Apoio = {}): Trecho[] {
  const marcas: ({ ini: number; fim: number; naoEncontrado?: boolean; disps?: string[] } & Pick<Trecho, "href" | "planalto" | "lei" | "art">)[] = [];
  const pular = rotulo && texto.startsWith(rotulo) ? rotulo.length : 0;
  const sumula = atual.startsWith("sumulas-");
  for (const m of texto.matchAll(REF)) {
    if ((m.index ?? 0) < pular) continue;
    // "Art. 17-A." dentro de um texto citado é o rótulo do dispositivo, não uma referência
    if (/^Art\./.test(m[0]) && /^\s*[.:]/.test(texto.slice((m.index ?? 0) + m[0].length))) continue;
    // "arts. 38 e 39", "arts. 33, 34 e 35", "arts. 121 a 128": cada número vira um link
    const itens = [{ ini: m.index ?? 0, fim: (m.index ?? 0) + m[0].length, art: m[1].replace(/\./g, "") + (m[2] ? `-${m[2]}` : "") }];
    let pos = itens[0].fim;
    for (;;) {
      const paragrafo = texto.slice(pos).match(PARAGRAFO_NA_LISTA);
      if (paragrafo) {
        pos += paragrafo[0].length;
        continue;
      }
      const seg = texto.slice(pos).match(LISTA);
      if (!seg) break;
      const ini = pos + seg[1].length;
      pos += seg[0].length;
      itens.push({ ini, fim: pos, art: seg[2].replace(/\./g, "") + (seg[3] ? `-${seg[3]}` : "") });
    }
    const depois = texto.slice(pos);
    let diploma: string | null = atual;
    const doParentese = diplomaAntesDoParentese(texto.slice(0, m.index ?? 0));
    // outro "art." antes do diploma: o diploma é do último artigo da lista, não deste
    const desteArtigo = (d: RegExpMatchArray) => !/\bart/i.test(depois.slice(0, d.index! + d[0].length - d[1]!.length));
    if (doParentese) diploma = doParentese;
    else if (sumula) {
      // na súmula, o "art. N" é sempre de uma lei: a citada (abreviada ou por extenso), ou nenhuma. A forma das
      // súmulas vem primeiro: ela distingue "da Constituição de São Paulo" de "da Constituição"
      const abreviado = depois.match(DIPLOMA_NA_SUMULA);
      const outro = depois.match(DIPLOMA_DEPOIS);
      diploma =
        abreviado && desteArtigo(abreviado)
          ? diplomaNaSumula(abreviado[1]!, depois.slice(abreviado.index! + abreviado[0].length))
          : outro && desteArtigo(outro)
            ? diplomaPorTexto(outro[1]!)
            : null;
      if (diploma) diploma = diplomaDaEpoca(diploma, apoio.data);
    } else if (!PROPRIO.test(depois)) {
      const outro = depois.match(DIPLOMA_DEPOIS);
      diploma = outro && desteArtigo(outro) ? diplomaPorTexto(outro[1]!) : atual;
    }
    if (!diploma) continue;
    for (const [k, it] of itens.entries()) {
      // explícito; senão, o da alteração (o texto copiado é de outra lei); senão, a ordem de diplomaSemDiploma
      const alvo = diploma !== atual ? diploma : alteracao && alteracao !== atual ? alteracao : diplomaSemDiploma(it.art, atual, existe, apoio);
      if (alvo) {
        const d = destinoAntigo(alvo, it.art, apoio.data) ?? destino(alvo, it.art, atual);
        // o link do primeiro artigo cobre as subdivisões citadas junto ("inciso I do art. 5º")
        const ini = k === 0 && d.href ? inicioPrefixo(texto, it.ini, marcas.at(-1)?.fim) : it.ini;
        // o dispositivo nomeado no prefixo ("inciso XI do art. 5º") é o que o link cita dentro do artigo
        const doPrefixo = ini < it.ini && d.lei && d.art ? dispositivosDoPrefixo(texto.slice(ini, it.ini), d.art) : [];
        // sem subdivisão antes, a que vem depois do único artigo ("art. 5º, XI, da CF") é a citada
        const disps = doPrefixo.length ? doPrefixo : itens.length === 1 && d.lei && d.art ? dispositivosDoSufixo(texto.slice(it.fim), d.art) : [];
        marcas.push({ ini, fim: it.fim, ...d, ...(disps.length ? { disps } : {}) });
      } else marcas.push({ ini: it.ini, fim: it.fim, naoEncontrado: true });
    }
  }
  for (const m of texto.matchAll(LEI_SOLTA)) {
    const ini = m.index ?? 0;
    if (marcas.some((x) => ini < x.fim && ini + m[0].length > x.ini)) continue;
    const diploma = diplomaPorTexto(m[0]);
    if (!diploma || diploma === atual) continue;
    const alvo = destino(diploma, null, atual);
    if (alvo.href) marcas.push({ ini, fim: ini + m[0].length, ...alvo });
  }
  marcas.sort((a, b) => a.ini - b.ini);
  const saida: Trecho[] = [];
  let pos = 0;
  for (const m of marcas) {
    if (m.ini < pos || (!m.href && !m.naoEncontrado)) continue;
    if (m.ini > pos) saida.push({ texto: texto.slice(pos, m.ini) });
    saida.push({
      texto: texto.slice(m.ini, m.fim),
      href: m.href,
      planalto: m.planalto,
      lei: m.lei,
      art: m.art,
      naoEncontrado: m.naoEncontrado,
      ...(m.disps ? { disps: m.disps } : {}),
    });
    pos = m.fim;
  }
  if (pos < texto.length) saida.push({ texto: texto.slice(pos) });
  return saida;
}
