// Links de artigos citados em textos (enunciados, gabaritos, quiz, PDFs) para o texto no Planalto.
// VIGENCIA marca artigos revogados ou cuja citação é anterior à redação de 2019: o link vai
// para o texto antigo indicado e aparece o aviso ao passar o mouse.

const PLANALTO = "https://www.planalto.gov.br";

interface Diploma {
  nome: string;
  url: string;
}

const DIPLOMAS: Record<string, Diploma> = {
  CP: { nome: "Código Penal", url: `${PLANALTO}/ccivil_03/decreto-lei/del2848compilado.htm` },
  CPP: { nome: "Código de Processo Penal", url: `${PLANALTO}/ccivil_03/decreto-lei/del3689compilado.htm` },
  CF: { nome: "Constituição Federal", url: `${PLANALTO}/ccivil_03/constituicao/constituicao.htm` },
  LEP: { nome: "Lei de Execução Penal", url: `${PLANALTO}/ccivil_03/leis/l7210compilada.htm` },
  "7210": { nome: "Lei de Execução Penal", url: `${PLANALTO}/ccivil_03/leis/l7210compilada.htm` },
  "8069": { nome: "Estatuto da Criança e do Adolescente", url: `${PLANALTO}/ccivil_03/leis/l8069.htm` },
  "8072": { nome: "Lei dos Crimes Hediondos", url: `${PLANALTO}/ccivil_03/leis/l8072.htm` },
  "8137": { nome: "Crimes contra a Ordem Tributária", url: `${PLANALTO}/ccivil_03/leis/l8137.htm` },
  "9099": { nome: "Lei dos Juizados Especiais", url: `${PLANALTO}/ccivil_03/leis/l9099.htm` },
  "9296": { nome: "Lei de Interceptação Telefônica", url: `${PLANALTO}/ccivil_03/leis/l9296.htm` },
  "9455": { nome: "Lei de Tortura", url: `${PLANALTO}/ccivil_03/leis/l9455.htm` },
  "9503": { nome: "Código de Trânsito Brasileiro", url: `${PLANALTO}/ccivil_03/leis/l9503compilado.htm` },
  "9613": { nome: "Lei de Lavagem de Dinheiro", url: `${PLANALTO}/ccivil_03/leis/l9613.htm` },
  "10826": { nome: "Estatuto do Desarmamento", url: `${PLANALTO}/ccivil_03/leis/2003/l10.826.htm` },
  "11340": { nome: "Lei Maria da Penha", url: `${PLANALTO}/ccivil_03/_ato2004-2006/2006/lei/l11340.htm` },
  "11343": { nome: "Lei de Drogas", url: `${PLANALTO}/ccivil_03/_ato2004-2006/2006/lei/l11343.htm` },
  "12850": { nome: "Lei de Organizações Criminosas", url: `${PLANALTO}/ccivil_03/_ato2011-2014/2013/lei/l12850.htm` },
  "13869": { nome: "Lei de Abuso de Autoridade", url: `${PLANALTO}/ccivil_03/_ato2019-2022/2019/lei/L13869.htm` },
  "13964": { nome: "Lei Anticrime", url: `${PLANALTO}/ccivil_03/_ato2019-2022/2019/lei/L13964.htm` },
};

const SIGLAS: Record<string, string> = {
  CP: "CP",
  CPP: "CPP",
  CF: "CF",
  CRFB: "CF",
  LEP: "LEP",
  CTB: "9503",
  ECA: "8069",
  "Código Penal": "CP",
  "Código de Processo Penal": "CPP",
};

/** Chave "DIPLOMA:artigo" (ex.: "CPP:396-A") -> redação revogada ou anterior a 2019. */
const VIGENCIA: Record<string, { situacao: "revogado" | "anterior-2019"; url: string }> = {};

const CITACAO =
  /\b[Aa]rt(?:s?\.|igos?)\s*(\d{1,4}(?:-[A-Z])?)\b([^.;\n]{0,80}?)\b(?:do|da|de)\s+(Código Penal|Código de Processo Penal|CRFB|CPP|CP|CF|LEP|CTB|ECA|Lei\s*(?:n[º°.]?\s*)?[\d.]+\s*\/\s*\d{2,4})(?!\w)/g;

const SUMULA = /\b[Ss]úmula\s*(?:n[º°.]?\s*)?(\d{1,4})\s+(?:do|da)\s+STF(?!\w)/g;

export interface Citacao {
  inicio: number;
  fim: number;
  texto: string;
  url: string;
  aviso?: string;
}

function chaveDiploma(token: string): string | null {
  const lei = token.match(/^Lei\s*(?:n[º°.]?\s*)?([\d.]+)\s*\/\s*\d{2,4}$/);
  if (lei) return lei[1].replace(/\./g, "");
  return SIGLAS[token] ?? null;
}

const STF_SUMULAS = "https://portal.stf.jus.br/jurisprudencia/sumariosumulas.asp?base=26";

function sumulaStf(numero: string): string {
  return `${STF_SUMULAS}&sumula=${Number(numero)}`;
}

function ancora(artigo: string): string {
  return `#art${artigo.replace("-", "").toLowerCase()}`;
}

/** Lista as citações de artigos e súmulas do STF de um texto que tenham link conhecido. */
export function citacoesEm(texto: string): Citacao[] {
  const achados: Citacao[] = [];
  for (const m of texto.matchAll(CITACAO)) {
    const [inteiro, artigo, , token] = m;
    const diploma = chaveDiploma(token);
    const info = diploma ? DIPLOMAS[diploma] : undefined;
    if (!diploma || !info) continue;
    const inicio = m.index ?? 0;
    const chave = `${diploma}:${artigo}`;
    const vigencia = VIGENCIA[chave];
    achados.push({
      inicio,
      fim: inicio + inteiro.length,
      texto: inteiro,
      url: (vigencia?.url ?? info.url) + ancora(artigo),
      aviso: vigencia
        ? vigencia.situacao === "revogado"
          ? "Artigo revogado: o link abre o texto anterior."
          : "Citação anterior à redação de 2019: o link abre o texto anterior."
        : undefined,
    });
  }
  for (const m of texto.matchAll(SUMULA)) {
    const inicio = m.index ?? 0;
    achados.push({ inicio, fim: inicio + m[0].length, texto: m[0], url: sumulaStf(m[1]) });
  }
  return achados.sort((a, b) => a.inicio - b.inicio);
}
