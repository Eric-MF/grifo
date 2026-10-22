// Lê os PDFs de súmulas (o STF "Enunciados Súmulas 1 a 736" e o livro "Súmulas do STJ", inteiro teor) e devolve as
// súmulas no formato de content/sumulas. Só extrai o texto (pdfjs); o arquivo não é executado.
//
//   textoDoPdf(caminho)  → o texto, linha a linha
//   lerStf(texto)        → as súmulas do STF (SÚMULA N, com Data de Aprovação, Fonte, Referência, Precedentes, Observação)
//   lerStj(texto)        → as súmulas do STJ (N. Súmula N, com Enunciado, Referências, Órgão Julgador, Fonte e Excerto)
import { readFileSync } from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { SumulaConteudo, VideSumula } from "./baixar.ts";
import { lerReferenciaSTJ } from "./parser.ts";

/** O texto de um PDF, linha a linha: as quebras vêm da posição vertical do texto em cada página. */
export async function textoDoPdf(caminho: string): Promise<string> {
  const doc = await getDocument({ data: new Uint8Array(readFileSync(caminho)), verbosity: 0 }).promise;
  let texto = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const { items } = await (await doc.getPage(i)).getTextContent();
    const linhas: string[] = [];
    let linha = "";
    let y: number | null = null;
    for (const it of items as { str: string; hasEOL?: boolean; transform: number[] }[]) {
      const yi = Math.round(it.transform[5]!);
      if (y !== null && Math.abs(yi - y) > 2) {
        linhas.push(linha);
        linha = "";
      }
      linha += it.str;
      if (it.hasEOL) {
        linhas.push(linha);
        linha = "";
        y = null;
        continue;
      }
      y = yi;
    }
    if (linha) linhas.push(linha);
    texto += linhas.join("\n") + "\n";
  }
  return texto;
}

/** Cabeçalhos e rodapés de página que não fazem parte do texto das súmulas. */
const RODAPE = /^(\d{1,4}|SÚMULA DO STF|SUPREMO TRIBUNAL FEDERAL|Atualizado em .*|Inteiro Teor das|Súmulas|scon\.stj\.jus\.br\/SCON\/sumstj\/\s*\d*)$/;

/** As linhas úteis: sem rodapé e com espaços simples. As linhas em branco ficam, porque separam os parágrafos. */
function linhasUteis(texto: string): string[] {
  return texto
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => !/^<<<PAGINA \d+>>>$/.test(l) && !RODAPE.test(l));
}

const naoVazias = (linhas: string[]) => linhas.filter((l) => l.length > 0);
/** Junta as linhas de um trecho num texto só (os parágrafos do PDF são quebrados por largura de página). */
const junta = (linhas: string[]) => naoVazias(linhas).join(" ").replace(/\s+/g, " ").trim();
/** Os parágrafos de um trecho: grupos de linhas separados por linha em branco. */
function paragrafos(linhas: string[]): string[] {
  const saida: string[][] = [[]];
  for (const l of linhas) {
    if (!l) {
      if (saida.at(-1)!.length) saida.push([]);
    } else saida.at(-1)!.push(l);
  }
  return saida.map((g) => g.join(" ")).filter(Boolean);
}

/** Os trechos de cada rótulo, até o próximo rótulo da lista. */
function secoes(linhas: string[], rotulos: string[]): Map<string, string[]> {
  const mapa = new Map<string, string[]>();
  let atual: string | null = null;
  for (const l of linhas) {
    if (rotulos.includes(l)) {
      atual = l;
      mapa.set(l, []);
    } else if (atual) mapa.get(atual)!.push(l);
  }
  return mapa;
}

// ---------- STF ----------

const STATUS_SUFIXO = /\s*\((Superada|Cancelada)\)\s*$/i;
const ROTULOS_STF = ["Data de Aprovação", "Fonte de Publicação", "Referência Legislativa", "Precedentes", "Observação"];

/** "HC 38969" + "Publicação: DJ de 16/08/1963" → "HC 38969 · DJ de 16/08/1963" (cada precedente é um grupo de linhas). */
function precedentesStf(linhas: string[]): string[] {
  const saida: string[] = [];
  for (const g of paragrafos(linhas)) {
    if (/^Publica(ção|ções):/.test(g) && saida.length) saida[saida.length - 1] += ` · ${g.replace(/^Publica(ção|ções):\s*/, "")}`;
    else saida.push(g);
  }
  return saida;
}

/** Uma observação "Vide …" vira remissão; o alvo é a súmula citada, quando ela é do STF ou do STJ. */
function videDaObservacao(texto: string): VideSumula {
  if (/Súmula\s+Vinculante/i.test(texto)) return { texto };
  const numero = Number(texto.match(/Súmula\s+(\d+)/i)?.[1]);
  if (!numero) return { texto };
  return { texto, alvo: { tribunal: /\bSTJ\b/.test(texto) ? "stj" : "stf", numero } };
}

/** As súmulas do STF no texto do PDF (736), na ordem do número. */
export function lerStf(texto: string): SumulaConteudo[] {
  const linhas = linhasUteis(texto);
  const inicios = linhas.flatMap((l, i) => (/^SÚMULA \d+$/.test(l) ? [i] : []));
  const saida: SumulaConteudo[] = [];
  inicios.forEach((ini, k) => {
    const numero = Number(linhas[ini]!.match(/\d+/)![0]);
    const bloco = linhas.slice(ini + 1, inicios[k + 1] ?? linhas.length);
    const primeiro = bloco.findIndex((l) => ROTULOS_STF.includes(l));
    const corpo = primeiro < 0 ? bloco : bloco.slice(0, primeiro);
    const enunciadoBruto = junta(corpo);
    const st = enunciadoBruto.match(STATUS_SUFIXO)?.[1]?.toLowerCase();
    const enunciado = enunciadoBruto.replace(STATUS_SUFIXO, "").trim();
    if (!enunciado) return;
    const sec = secoes(bloco, ROTULOS_STF);
    const dataAprovacao = junta(sec.get("Data de Aprovação") ?? []) || undefined;
    const fonte = junta(sec.get("Fonte de Publicação") ?? []) || undefined;
    const referencias = paragrafos(sec.get("Referência Legislativa") ?? []).map((norma) => ({ norma, artigos: [] as string[] }));
    const precedentes = precedentesStf(sec.get("Precedentes") ?? []);
    const observacoes = paragrafos(sec.get("Observação") ?? []);
    const vide = observacoes.filter((o) => /^Vide\b/i.test(o)).map(videDaObservacao);
    const outras = observacoes.filter((o) => !/^Vide\b/i.test(o));
    saida.push({
      tribunal: "stf",
      numero,
      status: st === "superada" ? "superada" : st === "cancelada" ? "cancelada" : "vigente",
      baixada: true,
      enunciado,
      url: "",
      vide,
      extras: {
        ...(dataAprovacao ? { dataAprovacao } : {}),
        ...(fonte ? { fonte } : {}),
        ...(referencias.length ? { referenciaLegislativa: referencias } : {}),
        ...(precedentes.length ? { precedentes } : {}),
        ...(outras.length ? { observacoes: outras } : {}),
      },
    });
  });
  return saida.sort((a, b) => a.numero - b.numero);
}

// ---------- STJ ----------

const CABECALHO_STJ = /^\d+\. Súmula (\d+)$/;
/** "Precedentes:" fica depois dos trechos e é a lista das referências processuais: não entra no texto. */
const ROTULOS_STJ = ["Enunciado:", "Referências Legislativas:", "Órgão Julgador:", "Data da decisão:", "Fonte:", "Excerto dos Precedentes Originários:", "Precedentes:"];

/** As súmulas do STJ no texto do PDF (inteiro teor), na ordem do número. */
export function lerStj(texto: string): SumulaConteudo[] {
  const linhas = linhasUteis(texto);
  const inicios = linhas.flatMap((l, i) => (CABECALHO_STJ.test(l) ? [i] : []));
  const saida: SumulaConteudo[] = [];
  inicios.forEach((ini, k) => {
    const numero = Number(linhas[ini]!.match(CABECALHO_STJ)![1]);
    const bloco = linhas.slice(ini + 1, inicios[k + 1] ?? linhas.length);
    // a primeira linha do bloco é o ramo do direito ("DIREITO CIVIL - INVESTIGAÇÃO DE PATERNIDADE")
    const ramo = junta(bloco.slice(0, 1)).includes(" - ") ? junta(bloco.slice(0, 1)) : undefined;
    const sec = secoes(bloco, ROTULOS_STJ);
    const enunciado = junta(sec.get("Enunciado:") ?? []);
    if (!enunciado) return;
    const orgao = junta(sec.get("Órgão Julgador:") ?? []);
    const data = junta(sec.get("Data da decisão:") ?? []);
    const julgamento = orgao && data ? `${orgao}, julgado em ${data}` : undefined;
    const fonte = naoVazias(sec.get("Fonte:") ?? []).join(" · ") || undefined;
    // restos de código ("INC:00009") e de quebra de linha ("(TFR).") não são normas
    const referencias = lerReferenciaSTJ(naoVazias(sec.get("Referências Legislativas:") ?? [])).filter((r) => !/^\(|^[A-Z]{2,5}:\d/.test(r.norma));
    // cada trecho do excerto começa com aspas; o texto de um trecho pode ter linhas em branco
    const precedentes = junta(sec.get("Excerto dos Precedentes Originários:") ?? [])
      .split(/(?<=\))\s+(?=")/)
      .map((t) => t.trim())
      .filter(Boolean);
    saida.push({
      tribunal: "stj",
      numero,
      status: "vigente",
      baixada: true,
      enunciado,
      url: "",
      vide: [],
      extras: {
        ...(ramo ? { ramo } : {}),
        ...(julgamento ? { julgamento } : {}),
        ...(fonte ? { fonte } : {}),
        ...(referencias.length ? { referenciaLegislativa: referencias } : {}),
        ...(precedentes.length ? { precedentes } : {}),
      },
    });
  });
  return saida.sort((a, b) => a.numero - b.numero);
}
