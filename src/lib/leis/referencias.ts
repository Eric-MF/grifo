// Liga as referências do texto da lei: "art. 59" (do próprio diploma), "art. 33 da Lei nº 11.343",
// "Lei nº 8.072, de 25 de julho de 1990". Diploma que está no leitor do Grifo vira link interno;
// os demais apontam para o Planalto. Todo link guarda também o endereço original no Planalto.
import leis from "@/content/generated/leis.json";
import { normalize } from "@/lib/correcao/normalize";

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

// "art. 33", "arts. 33 e 40", "artigo 59" — o diploma vem logo depois ("da Lei nº …", "deste Código") ou é o próprio.
const REF = /\b(?:arts?\.|artigos?)\s*(\d+(?:\.\d{3})*)(?:\s*[ºo°])?(?:\s*-\s*([A-Z])\b)?/gi;
const LISTA = /^(\s*(?:,|\be\b|\bou\b|\ba\b)\s*)(\d+(?:\.\d{3})*)(?:\s*[ºo°])?(?:\s*-\s*([A-Z])\b)?(?![\d/])(?!\s*\(|\s*(?:anos?|dias?|meses|m[êe]s|horas?|vezes|salários?)\b)/;
const DIPLOMA_DEPOIS =
  /^[^;()]{0,90}?\b(?:d[oa]s?|n[oa]s?)\s+(Lei Complementar\s*n[ºo°.]?\s*[\d.]+|Decreto-Lei\s*n[ºo°.]?\s*[\d.]+|Decreto\s*n[ºo°.]?\s*[\d.]+|Lei\s*n[ºo°.]?\s*[\d.]+|C[óo]digo de Processo Penal|C[óo]digo Penal|Constitui[çc][ãa]o(?: Federal)?|Lei de Execu[çc][ãa]o Penal)/i;
const PROPRIO = /^[^;()]{0,40}?\b(dest[ea] (C[óo]digo|Lei|Constitui[çc][ãa]o|Estatuto|Decreto-Lei))/i;
const LEI_SOLTA = /\b(Lei Complementar|Decreto-Lei|Lei)\s*n[ºo°.]?\s*([\d.]+)(?:\s*,\s*de\s+\d{1,2}[ºo°]?\s+de\s+[a-zç]+\s+de\s+\d{4})?/gi;

/** `rotulo`: o "Art. 121" do início do bloco é o próprio dispositivo, não uma referência. */
export function trechos(texto: string, atual: string, rotulo?: string): Trecho[] {
  const marcas: ({ ini: number; fim: number } & Pick<Trecho, "href" | "planalto" | "lei" | "art">)[] = [];
  const pular = rotulo && texto.startsWith(rotulo) ? rotulo.length : 0;
  for (const m of texto.matchAll(REF)) {
    if ((m.index ?? 0) < pular) continue;
    // "arts. 38 e 39", "arts. 33, 34 e 35", "arts. 121 a 128": cada número vira um link
    const itens = [{ ini: m.index ?? 0, fim: (m.index ?? 0) + m[0].length, art: m[1].replace(/\./g, "") + (m[2] ? `-${m[2]}` : "") }];
    let pos = itens[0].fim;
    for (;;) {
      const seg = texto.slice(pos).match(LISTA);
      if (!seg) break;
      const ini = pos + seg[1].length;
      pos += seg[0].length;
      itens.push({ ini, fim: pos, art: seg[2].replace(/\./g, "") + (seg[3] ? `-${seg[3]}` : "") });
    }
    const depois = texto.slice(pos);
    let diploma: string | null = atual;
    if (!PROPRIO.test(depois)) {
      const outro = depois.match(DIPLOMA_DEPOIS);
      // outro "art." antes do diploma: o diploma é do último artigo da lista, não deste
      diploma = outro && !/\bart/i.test(depois.slice(0, outro.index! + outro[0].length - outro[1].length)) ? diplomaPorTexto(outro[1]) : atual;
    }
    if (!diploma) continue;
    for (const it of itens) marcas.push({ ini: it.ini, fim: it.fim, ...destino(diploma, it.art, atual) });
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
    if (m.ini < pos || !m.href) continue;
    if (m.ini > pos) saida.push({ texto: texto.slice(pos, m.ini) });
    saida.push({ texto: texto.slice(m.ini, m.fim), href: m.href, planalto: m.planalto, lei: m.lei, art: m.art });
    pos = m.fim;
  }
  if (pos < texto.length) saida.push({ texto: texto.slice(pos) });
  return saida;
}
