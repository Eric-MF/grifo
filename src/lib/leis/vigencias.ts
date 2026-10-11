// Situação de cada artigo (e parágrafo) do texto compilado: revogado, ou alterado por lei posterior.
// Deriva do próprio texto das leis e das datas de vigência (content/leis-alteradoras.yaml).
// Os avisos de citações usam esse mapa; exceções vão à mão em planalto.ts.

import { dataDoAto, marcoDeRevogacao, type Ato, type Bloco, type Datas } from "./linha-do-tempo.ts";

export type Vigencia = { situacao: "revogado"; lei: string } | { situacao: "alterado"; lei: string; desde: string };

const DISPOSITIVO = /^art(\d+(?:-[a-z])?)(?:\.(?:p(\d+)|(pu)|i(\d+)))?$/i;

const ROMANOS: [number, string][] = [[50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];

/** Algarismo romano de inciso ("3" → "III"), como aparece no texto da lei. */
function romano(n: number): string {
  let resto = n;
  let saida = "";
  for (const [valor, simbolo] of ROMANOS) while (resto >= valor) { saida += simbolo; resto -= valor; }
  return saida;
}

const DESIGNACAO = /((?:Lei Complementar|Lei|Emenda Constitucional|Medida Provisória|Decreto-Lei|Decreto) nº ([\d.]+(?: \d{3})?),? (?:de )?[^)]*?(\d{4}))/;

/** "Lei nº 12.015/2009", "Emenda Constitucional nº 45/2004"… ; vazio quando o ato não traz o nome. */
function nomeDaLei(bruto: string): string {
  const m = bruto.match(DESIGNACAO);
  if (!m) return "";
  const [, completo, numero, ano] = m;
  return `${completo.split(" nº ")[0]} nº ${numero.replace(" ", ".")}/${ano}`;
}

/** Marca "(Revogado)" sem nome leva o nome do ato de redação que a acompanha. */
function quemRevogou(atos: Ato[]): string {
  const comNome = (tipo: Ato["tipo"]) => atos.filter((a) => a.tipo === tipo).map((a) => nomeDaLei(a.bruto)).find(Boolean);
  return comNome("revogado") ?? comNome("redacao") ?? "";
}

/** Chave "<id>:<artigo>", "<id>:<artigo>§<parágrafo>", "<id>:<artigo>§único" ou "<id>:<artigo>,<inciso>", como as citações do texto. */
export function vigenciasDaLei(id: string, blocos: Bloco[], datas: Datas): Record<string, Vigencia> {
  const grupos = new Map<string, Bloco[]>();
  for (const b of blocos) {
    if (!b.disp || !DISPOSITIVO.test(b.disp)) continue;
    grupos.set(b.disp, [...(grupos.get(b.disp) ?? []), b]);
  }
  const saida: Record<string, Vigencia> = {};
  for (const [disp, grupo] of grupos) {
    const [, artigo, paragrafo, unico, inciso] = disp.match(DISPOSITIVO)!;
    const nivel = paragrafo ? `§${paragrafo}` : unico ? "§único" : inciso ? `,${romano(Number(inciso))}` : "";
    const chave = `${id}:${artigo!.toUpperCase()}${nivel}`;
    const vigentes = grupo.filter((b) => !b.superada && !marcoDeRevogacao(b));
    if (!vigentes.length) {
      const atos = grupo.flatMap((b) => b.atos);
      const revogacao = atos.find((a) => a.tipo === "revogado");
      if (revogacao) saida[chave] = { situacao: "revogado", lei: quemRevogou(atos) };
      continue;
    }
    const redacao = vigentes.flatMap((b) => b.atos).filter((a) => a.tipo === "redacao").at(-1);
    if (!redacao) continue;
    const { data } = dataDoAto(redacao, datas, disp);
    if (!data) continue;
    saida[chave] = { situacao: "alterado", lei: nomeDaLei(redacao.bruto), desde: data };
  }
  return saida;
}
