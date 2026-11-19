import { describe, expect, it } from "vitest";
import { citacaoAtende, extrairCitacoes, formatarCitacao, parseDispositivo } from "../src/lib/correcao/citacoes.ts";
import { normalize } from "../src/lib/correcao/normalize.ts";
import { ctx, leis } from "./helpers.ts";

const cits = (s: string) => extrairCitacoes(normalize(s), ctx.lex);
const atende = (spec: string, texto: string) => {
  const e = parseDispositivo(spec, ctx.lex)!;
  return cits(texto).some((c) => citacaoAtende(e, c));
};

describe("extrairCitacoes", () => {
  it("artigo com parágrafo e alínea", () => {
    expect(cits("na forma do Art. 33, § 2º, alínea c, do CP")).toMatchObject([
      { tipo: "art", art: "33", pars: ["2"], als: ["c"], diploma: "cp" },
    ]);
  });
  it("enumeração de artigos e parágrafos", () => {
    const r = cits("Arts. 44, §§ 4º e 5º e 69, § 2º, do Código Penal e 181, § 1º, da LEP");
    expect(r).toMatchObject([
      { art: "44", pars: ["4", "5"], diploma: "cp" },
      { art: "69", pars: ["2"], diploma: "cp" },
    ]);
  });
  it("parágrafo com letra (§ 2º-A) é parágrafo, não outro artigo", () => {
    expect(cits("art. 157, § 2º-A, inciso I, do CP")).toMatchObject([{ art: "157", pars: ["2-a"], incs: ["1"], diploma: "cp" }]);
    expect(cits("art. 4º, § 10-A, da Lei 12.850/13")).toMatchObject([{ art: "4", pars: ["10-a"], diploma: "lei-12850" }]);
    expect(atende("art. 157, § 2º-A, I, CP", "art. 157, § 2-A, I, do CP")).toBe(true);
    expect(atende("art. 157, § 2º-A, I, CP", "art. 157, I, do CP")).toBe(false);
    expect(formatarCitacao(parseDispositivo("art. 157, § 2º-A, I, CP", ctx.lex)!, leis)).toBe("Art. 157, § 2º-A, inciso I — Código Penal");
    expect(formatarCitacao(parseDispositivo("art. 4, § 16, III, Lei 12.850", ctx.lex)!)).toMatch(/^Art\. 4, § 16, inciso III — /);
  });
  it("parágrafo, inciso ou alínea antes do artigo", () => {
    expect(cits("nos termos do § 1º do art. 28 do CP")).toMatchObject([{ art: "28", pars: ["1"], diploma: "cp" }]);
    expect(cits("a alínea d do inciso II do art. 61 do Código Penal")).toMatchObject([{ art: "61", incs: ["2"], als: ["d"], diploma: "cp" }]);
    expect(atende("art. 28, § 1º, CP", "isento de pena, conforme o parágrafo primeiro do art. 28 do CP")).toBe(true);
  });
  it("remissão ao último artigo citado: “o § 1º do mesmo artigo”", () => {
    const texto = "nos termos do art. 28, inciso II, do Código Penal. Mas o § 1º do mesmo artigo isenta de pena o agente";
    expect(cits(texto)).toMatchObject([
      { art: "28", incs: ["2"], diploma: "cp" },
      { art: "28", pars: ["1"], incs: [], diploma: "cp" },
    ]);
    expect(atende("art. 28, § 1º, CP", texto)).toBe(true);
    expect(atende("art. 28, § 1º, CP", "art. 28, II, do CP. E o § 1º deste artigo prevê a isenção")).toBe(true);
    expect(atende("art. 28, § 1º, CP", "art. 28, II, e o § 1º do referido artigo, do Código Penal")).toBe(true);
    // sem artigo antes, a remissão não vira citação
    expect(cits("o § 1º do mesmo artigo")).toEqual([]);
  });
  it("inciso romano sem a palavra inciso", () => {
    expect(cits("com fundamento no art. 593, I, do CPP")).toMatchObject([{ art: "593", incs: ["1"], diploma: "cpp" }]);
  });
  it("lei especial por número e por apelido", () => {
    expect(cits("art. 16 da Lei 11.340/06")[0]).toMatchObject({ art: "16", diploma: "lei-11340" });
    expect(cits("art. 16 da Lei Maria da Penha")[0]).toMatchObject({ art: "16", diploma: "lei-11340" });
  });
  it("diploma citado antes do artigo", () => {
    expect(cits("o Código de Processo Penal, em seu art. 586")[0]).toMatchObject({ art: "586", diploma: "cpp" });
  });
  it("súmulas em várias formas", () => {
    expect(cits("Súmula 700 do STF")[0]).toMatchObject({ tipo: "sumula", n: "700", tribunal: "stf" });
    expect(cits("enunciado nº 700 da súmula da jurisprudência do STF")[0]).toMatchObject({ n: "700", tribunal: "stf" });
    expect(cits("Súmula Vinculante 24")[0]).toMatchObject({ n: "24", vinculante: true, tribunal: "stf" });
  });
  it("artigo com letra", () => {
    expect(cits("Art. 313-A do Código Penal")[0]).toMatchObject({ art: "313-a", diploma: "cp" });
  });
});

describe("citacaoAtende", () => {
  it("exige o diploma certo", () => {
    expect(atende("art. 586 CPP", "art. 586 do CPP")).toBe(true);
    expect(atende("art. 586 CPP", "art. 586 do CP")).toBe(false);
  });
  it("exige parágrafo/alínea quando a rubrica pede", () => {
    expect(atende("art. 33, § 2º, c, CP", "art. 33, § 2º, 'c', do CP")).toBe(true);
    expect(atende("art. 33, § 2º, c, CP", "art. 33 do CP")).toBe(false);
  });
  it("aceita citação mais detalhada que a esperada", () => {
    expect(atende("art. 158 CPP", "art. 158, caput, do CPP")).toBe(true);
  });
  it("formata para leitura", () => {
    expect(formatarCitacao(parseDispositivo("art. 5º, LXV, CF", ctx.lex)!, leis)).toBe("Art. 5, inciso LXV — Constituição Federal");
  });
});
