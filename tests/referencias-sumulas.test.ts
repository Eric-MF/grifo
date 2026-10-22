import { describe, expect, it } from "vitest";
import { trechos } from "../src/lib/leis/referencias.ts";

// os links de uma súmula ("art. 15" → destino); `data` é a aprovação dela
const links = (texto: string, data?: string, lei = "sumulas-stf") =>
  trechos(texto, lei, undefined, () => false, null, data ? { data } : {})
    .filter((t) => t.href || t.naoEncontrado)
    .map((t) => [t.texto, t.naoEncontrado ? "não encontrado" : t.href]);

describe("citações nas súmulas", () => {
  it("lei abreviada que o Grifo não tem: texto simples, sem a marca de 'não encontrado'", () => {
    expect(links("É devida a multa prevista no art. 15, § 6º, da L. 1.300, de 28.12.50, ainda que", "1963-12-13")).toEqual([]);
    expect(links("o prefeito responde pelos crimes previstos no art. 1º do Dl. 201/67.", "2003-09-24")).toEqual([]);
    expect(links("O art. 35 do Decreto-Lei n° 7.661, de 1945, que estabelece", "2003-08-01", "sumulas-stj")).toEqual([]);
  });

  it("lei de estado ou município não vira link para lei federal", () => {
    expect(links("É constitucional o art. 100, nº II, da L. 4.563, de 20.2.57, do Município de Recife, que", "1963-12-13")).toEqual([]);
    expect(links("Não contraria a Constituição Federal o art. 61 da Constituição de São Paulo, que equiparou", "1963-12-13")).toEqual([]);
  });

  it("as leis do leitor, por extenso ou abreviadas", () => {
    expect(links("Não se aplicam à segunda instância o art. 384 e parágrafo único do Código de Processo Penal", "1964-10-01")).toEqual([["art. 384", "/leis/cpp/#art384"]]);
    expect(links("determinado pelo art. 75 do Código Penal, não é considerada", "2003-09-24")).toEqual([["art. 75", "/leis/cp/#art75"]]);
    // o nome da lei também vira link (para a lei inteira)
    expect(links("prevista no art. 33, § 4º, da Lei n. 11.343/2006 não afasta", "2014-06-11", "sumulas-stj")).toEqual([
      ["art. 33", "/leis/lei-11343/#art33"],
      ["Lei n. 11.343", "/leis/lei-11343/"],
    ]);
    expect(links("O art. 309 do Código de Trânsito Brasileiro, que reclama", "2003-09-24")[0]).toEqual(["art. 309", "/leis/lei-9503/#art309"]);
    expect(links("pena prevista no art. 65, III, d, do CP, independentemente", "2015-06-10", "sumulas-stj")).toEqual([["art. 65", "/leis/cp/#art65"]]);
  });

  it("a Constituição e o CPC da época da súmula", () => {
    // STF 400 (1964): o art. 101, III, é da Constituição de 1946
    expect(links("não autoriza recurso extraordinário pela letra a do art. 101, III, da C.F.", "1964-04-03")).toEqual([
      ["art. 101", "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao46.htm#art101"],
    ]);
    expect(links("com fundamento no art. 64 do C. P. C., depende de reconvenção", "1969-12-03")[0]?.[1]).toContain("del1608.htm#art64");
    expect(links("com fundamento no art. 20 do CPC, depende", "1990-05-10", "sumulas-stj")[0]?.[1]).toContain("l5869.htm#art20");
    expect(links("na forma do art. 102, III, da Constituição Federal", "2003-09-24")).toEqual([["art. 102", "/leis/cf/#art102"]]);
  });

  it("Parte Geral do Código Penal antes de 1985: o texto mudou, fica sem link", () => {
    expect(links("aplica-se o art. 51 do Código Penal", "1963-12-13")).toEqual([]);
    expect(links("aplica-se o art. 155 do Código Penal", "1963-12-13")).toEqual([["art. 155", "/leis/cp/#art155"]]);
  });

  it("nas leis, nada muda: o 'art. N' sem diploma é da própria lei", () => {
    expect(trechos("nos termos do art. 59 deste Código", "cp").filter((t) => t.href)[0]?.href).toBe("#art59");
  });
});
