// Links de artigos citados em textos (enunciados, gabaritos, quiz, PDFs): para o leitor de leis do
// Grifo quando a lei está nele; senão, para o texto no Planalto.
// VIGENCIA marca artigos revogados ou alterados por lei posterior: o aviso aparece ao passar o mouse.

import leis from "@/content/generated/leis.json";
import indiceLeitor from "@/content/generated/leis-indice.json";
import vigenciasDerivadas from "@/content/generated/vigencias.json";
import sumulasNumeros from "@/content/generated/sumulas-numeros.json";
import { normalize } from "@/lib/correcao/normalize";
import { dispositivosDoPrefixo, dispositivosDoSufixo, inicioPrefixo } from "@/lib/leis/prefixo";

interface Diploma {
  nome: string;
  aliases: string[];
  planalto?: string;
}

const DIPLOMAS = leis.diplomas as Record<string, Diploma>;
const NO_LEITOR = new Set(indiceLeitor.map((l) => l.id));
const POR_ALIAS = new Map(
  Object.entries(DIPLOMAS).flatMap(([id, d]) => d.aliases.map((a) => [normalize(a).trim(), id] as const)),
);

type Vigencia = { situacao: "revogado"; lei: string } | { situacao: "alterado"; lei: string; desde: string };

/** Derivado do texto das leis (scripts/build-content.ts). Chave "<id>:artigo" ou "<id>:artigo§parágrafo". */
const VIGENCIA_EXCECOES: Record<string, Vigencia> = {
  "cp:217-A": { situacao: "alterado", lei: "Lei nº 15.280/2025 e Lei nº 15.353/2026", desde: "2025" },
};
const VIGENCIA: Record<string, Vigencia> = { ...(vigenciasDerivadas as Record<string, Vigencia>), ...VIGENCIA_EXCECOES };

const CITACAO =
  /\b[Aa]rt(?:s?\.|igos?)\s*(\d{1,4}(?:-\s?[A-Z])?)\b([^.;\n]{0,80}?)\b(?:do|da|de)\s+(Código Penal|Código de Processo Penal|CRFB|CPP|CP|CF|LEP|CTB|ECA|Lei\s*(?:n[º°o.]?\s*)?[\d.]+(?:\s*\/\s*\d{2,4})?)(?!\w)/g;

// A forma da correção do quiz e do simulador (formatarCitacao): "Art. 593, inciso III, alínea b — Código de Processo
// Penal". O diploma vem pelo nome do cadastro, sem o que está entre parênteses.
const POR_NOME = new Map(Object.entries(DIPLOMAS).map(([id, d]) => [d.nome.split(" (")[0]!, id] as const));
const escapar = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const CITACAO_FORMATADA = new RegExp(
  String.raw`\bArt\. (\d{1,4}(?:-[A-Z])?)[º°]?(?![\w-])((?:, [^—;\n]{1,60}?)?) — (${[...POR_NOME.keys()]
    .sort((a, b) => b.length - a.length)
    .map(escapar)
    .join("|")})(?!\w)`,
  "g",
);

const SUMULA = /\b[Ss]úmula\s*(?:n[º°.]?\s*)?(\d{1,4})\s+(?:do|da)\s+(STF|STJ)(?!\w)/g;
// "Súmula Vinculante 11", "Súmula Vinculante nº 14" (só o STF as tem: o tribunal não precisa vir escrito)
const SUMULA_VINCULANTE = /\b[Ss]úmula\s+[Vv]inculante\s*(?:n[º°.]?\s*)?(\d{1,3})(?!\d)/g;
const LISTA_VINCULANTES = "https://portal.stf.jus.br/jurisprudencia/sumariosumulas.asp?base=26";

export interface Citacao {
  inicio: number;
  fim: number;
  texto: string;
  /** leitor do Grifo (relativo) ou Planalto */
  url: string;
  planalto?: string;
  /** lei e artigo no leitor, para o pop-up com o texto */
  lei?: string;
  art?: string;
  /** dispositivos citados dentro do artigo ("inciso I do art. 386", "art. 581, IV") */
  disps?: string[];
  aviso?: string;
}

function chaveDiploma(token: string): string | null {
  // "Lei nº 9.099/1995", "Lei no 5.869, de 1973": o número sem pontos é a chave (o ano e a sigla não entram)
  const numero = token.match(/^\s*Lei\s*(?:n[º°.o]?\s*)?([\d.]+)/i)?.[1]?.replace(/\./g, "");
  if (numero) return POR_ALIAS.get(`lei ${numero}`) ?? `lei-${numero}`;
  const chave = normalize(token).trim();
  const id = POR_ALIAS.get(chave);
  if (id) return id;
  const lei = chave.match(/^lei (\d+)$/);
  return lei ? `lei-${lei[1]}` : null;
}

function sumulaStf(numero: string): string {
  return `https://jurisprudencia.stf.jus.br/pages/search/seq-sumula${Number(numero)}/false`;
}

// o STJ não tem página por súmula: a lista oficial
const LISTA_STJ = "https://scon.stj.jus.br/SCON/sumstj/";

function ancora(artigo: string): string {
  return `#art${artigo.replace("-", "").toLowerCase()}`;
}

function aviso(v: Vigencia | undefined, data?: string): string | undefined {
  if (!v) return undefined;
  const pela = v.lei ? ` pela ${v.lei}` : "";
  if (v.situacao === "revogado") return `Artigo revogado${pela}: o texto do Planalto mostra a redação anterior.`;
  if (data === undefined || data >= v.desde) return undefined;
  return `Artigo alterado${pela}, depois desta prova: o texto do Planalto mostra a redação anterior.`;
}

/**
 * Lista as citações de artigos e súmulas (STF, STJ e vinculantes) de um texto que tenham link conhecido.
 * `data` é a data da prova (AAAA-MM-DD), usada só para decidir o aviso de artigo alterado.
 */
export function citacoesEm(texto: string, data?: string): Citacao[] {
  const achados: Citacao[] = [];
  const casos = [
    ...[...texto.matchAll(CITACAO)].map((m) => ({ m, diploma: chaveDiploma(m[3]!) })),
    ...[...texto.matchAll(CITACAO_FORMATADA)].map((m) => ({ m, diploma: POR_NOME.get(m[3]!) ?? null })),
  ].sort((a, b) => (a.m.index ?? 0) - (b.m.index ?? 0));
  for (const { m, diploma } of casos) {
    const [inteiro, bruto, meio] = m;
    // as duas formas não se sobrepõem na prática; se acontecer, vale a primeira
    if ((m.index ?? 0) < (achados.at(-1)?.fim ?? 0)) continue;
    const artigo = bruto!.replace(/-\s+/, "-");
    const info = diploma ? DIPLOMAS[diploma] : undefined;
    if (!diploma || !info?.planalto) continue;
    // a subdivisão citada antes do artigo ("inciso I do art. 386") entra na citação
    const pos = m.index ?? 0;
    const inicio = inicioPrefixo(texto, pos, achados.at(-1)?.fim);
    const base = `${diploma}:${artigo}`;
    const paragrafo = meio.match(/§\s*(\d+)/)?.[1];
    const unico = !paragrafo && /par[áa]grafo único|§\s*único/i.test(meio);
    const inciso = !paragrafo && !unico ? meio.match(/\binciso\s+([IVXLC]+)\b/i)?.[1]?.toUpperCase() : undefined;
    const nivel = paragrafo ? `§${paragrafo}` : unico ? "§único" : inciso ? `,${inciso}` : "";
    const vigencia = (nivel ? VIGENCIA[base + nivel] : undefined) ?? VIGENCIA[base];
    const planalto = info.planalto + ancora(artigo);
    const art = `art${artigo.toLowerCase()}`;
    // o dispositivo fica antes do artigo ("inciso I do art. 386") ou depois ("art. 581, IV, do CPP")
    const disps = NO_LEITOR.has(diploma) ? (inicio < pos ? dispositivosDoPrefixo(texto.slice(inicio, pos), art) : dispositivosDoSufixo(meio, art)) : [];
    achados.push({
      inicio,
      fim: pos + inteiro.length,
      texto: texto.slice(inicio, pos + inteiro.length),
      url: NO_LEITOR.has(diploma) ? `/leis/${diploma}/#${art}` : planalto,
      planalto,
      ...(NO_LEITOR.has(diploma) ? { lei: diploma, art } : {}),
      ...(disps.length ? { disps } : {}),
      aviso: aviso(vigencia, data),
    });
  }
  for (const m of texto.matchAll(SUMULA)) {
    const inicio = m.index ?? 0;
    const numero = Number(m[1]);
    const tribunal = m[2]!.toLowerCase() as "stf" | "stj";
    const fora = tribunal === "stf" ? sumulaStf(m[1]!) : LISTA_STJ;
    // a súmula que o Vade Mecum tem abre no leitor (com a prévia); a que não tem vai para o tribunal
    if (sumulasNumeros[tribunal].includes(numero))
      achados.push({ inicio, fim: inicio + m[0].length, texto: m[0], url: `/leis/sumulas/${tribunal}/#s-${numero}`, planalto: fora, lei: `sumulas-${tribunal}`, art: `s-${numero}` });
    else achados.push({ inicio, fim: inicio + m[0].length, texto: m[0], url: fora });
  }
  for (const m of texto.matchAll(SUMULA_VINCULANTE)) {
    const inicio = m.index ?? 0;
    const numero = Number(m[1]);
    if (sumulasNumeros.vinculantes?.includes(numero))
      achados.push({ inicio, fim: inicio + m[0].length, texto: m[0], url: `/leis/sumulas/vinculantes/#s-${numero}`, planalto: LISTA_VINCULANTES, lei: "sumulas-vinculantes", art: `s-${numero}` });
    else achados.push({ inicio, fim: inicio + m[0].length, texto: m[0], url: LISTA_VINCULANTES });
  }
  return achados.sort((a, b) => a.inicio - b.inicio);
}
