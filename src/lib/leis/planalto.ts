// Links de artigos citados em textos (enunciados, gabaritos, quiz, PDFs): para o leitor de leis do
// Grifo quando a lei está nele; senão, para o texto no Planalto.
// VIGENCIA marca artigos revogados ou alterados por lei posterior: o aviso aparece ao passar o mouse.

import leis from "@/content/generated/leis.json";
import indiceLeitor from "@/content/generated/leis-indice.json";
import { normalize } from "@/lib/correcao/normalize";

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

/** Chave "<id em content/leis.yaml>:artigo" ou "…:artigo§parágrafo". `desde` é a data (ou ano) em que a alteração entrou em vigor. */
const VIGENCIA: Record<string, Vigencia> = {
  "cp:214": { situacao: "revogado", lei: "Lei nº 12.015/2009" },
  "cp:154-A": { situacao: "alterado", lei: "Lei nº 14.155/2021", desde: "2021-05-28" },
  "cp:217-A": { situacao: "alterado", lei: "Lei nº 15.280/2025 e Lei nº 15.353/2026", desde: "2025" },
  "lei-8072:2§2": { situacao: "revogado", lei: "Lei nº 13.964/2019" },
  "lei-12850:4§16": { situacao: "alterado", lei: "Lei nº 13.964/2019", desde: "2020-01-23" },
};

const CITACAO =
  /\b[Aa]rt(?:s?\.|igos?)\s*(\d{1,4}(?:-\s?[A-Z])?)\b([^.;\n]{0,80}?)\b(?:do|da|de)\s+(Código Penal|Código de Processo Penal|CRFB|CPP|CP|CF|LEP|CTB|ECA|Lei\s*(?:n[º°.]?\s*)?[\d.]+\s*\/\s*\d{2,4})(?!\w)/g;

const SUMULA = /\b[Ss]úmula\s*(?:n[º°.]?\s*)?(\d{1,4})\s+(?:do|da)\s+STF(?!\w)/g;

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
  aviso?: string;
}

function chaveDiploma(token: string): string | null {
  const chave = normalize(token).trim();
  const id = POR_ALIAS.get(chave);
  if (id) return id;
  const lei = chave.match(/^lei (\d+)$/);
  return lei ? `lei-${lei[1]}` : null;
}

function sumulaStf(numero: string): string {
  return `https://jurisprudencia.stf.jus.br/pages/search/seq-sumula${Number(numero)}/false`;
}

function ancora(artigo: string): string {
  return `#art${artigo.replace("-", "").toLowerCase()}`;
}

function aviso(v: Vigencia | undefined, data?: string): string | undefined {
  if (!v) return undefined;
  if (v.situacao === "revogado") return `Artigo revogado pela ${v.lei}: o texto do Planalto mostra a redação anterior.`;
  if (data === undefined || data >= v.desde) return undefined;
  return `Artigo alterado pela ${v.lei}, depois desta prova: o texto do Planalto mostra a redação anterior.`;
}

/**
 * Lista as citações de artigos e súmulas do STF de um texto que tenham link conhecido.
 * `data` é a data da prova (AAAA-MM-DD), usada só para decidir o aviso de artigo alterado.
 */
export function citacoesEm(texto: string, data?: string): Citacao[] {
  const achados: Citacao[] = [];
  for (const m of texto.matchAll(CITACAO)) {
    const [inteiro, bruto, meio, token] = m;
    const artigo = bruto.replace(/-\s+/, "-");
    const diploma = chaveDiploma(token);
    const info = diploma ? DIPLOMAS[diploma] : undefined;
    if (!diploma || !info?.planalto) continue;
    const inicio = m.index ?? 0;
    const base = `${diploma}:${artigo}`;
    const paragrafo = meio.match(/§\s*(\d+)/)?.[1];
    const vigencia = (paragrafo ? VIGENCIA[`${base}§${paragrafo}`] : undefined) ?? VIGENCIA[base];
    const planalto = info.planalto + ancora(artigo);
    const art = `art${artigo.toLowerCase()}`;
    achados.push({
      inicio,
      fim: inicio + inteiro.length,
      texto: inteiro,
      url: NO_LEITOR.has(diploma) ? `/leis/${diploma}/#${art}` : planalto,
      planalto,
      ...(NO_LEITOR.has(diploma) ? { lei: diploma, art } : {}),
      aviso: aviso(vigencia, data),
    });
  }
  for (const m of texto.matchAll(SUMULA)) {
    const inicio = m.index ?? 0;
    achados.push({ inicio, fim: inicio + m[0].length, texto: m[0], url: sumulaStf(m[1]) });
  }
  return achados.sort((a, b) => a.inicio - b.inicio);
}
