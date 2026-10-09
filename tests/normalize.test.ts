import { describe, expect, it } from "vitest";
import { normalize, termToRegex } from "../src/lib/correcao/normalize.ts";

describe("normalize", () => {
  it.each([
    ["Art. 33, § 2º, alínea 'c', do CP", " art 33 paragrafo 2 alinea c do cp "],
    ["Lei nº 11.343/06", " lei 11343 "],
    ["prazo de cinco dias", " prazo de 5 dias "],
    ["prazo de 5 (cinco) dias", " prazo de 5 dias "],
    ["1º de setembro de 2023", " 2023-09-01 "],
    ["01/09/2023", " 2023-09-01 "],
    ["inciso LXV", " inciso 65 "],
    ["Art. 5º, inciso LXV, da CRFB/88", " art 5 inciso 65 da crfb "],
    ["fração de um sexto a dois terços", " fracao de 1/6 a 2/3 "],
    ["vinte e cinco dias", " 25 dias "],
    ["parágrafo único", " paragrafo unico "],
  ])("%s", (input, expected) => {
    expect(normalize(input)).toBe(expected);
  });
});

describe("termToRegex", () => {
  const t = (term: string, text: string) => termToRegex(term).test(normalize(text));
  it("casa palavra inteira, sem acento", () => expect(t("retratação", "juízo de retratação")).toBe(true));
  it("não casa pedaço de palavra", () => expect(t("pena", "apenas isso")).toBe(false));
  it("aceita prefixo com *", () => expect(t("retrat*", "requer que se retrate")).toBe(true));
  it("aceita alternativas com |", () => expect(t("trf | tribunal regional federal", "ao TRF da 10ª Região")).toBe(true));
  it("data por extenso ou numérica", () => expect(t("1 de setembro de 2023", "Alfa, 01/09/2023.")).toBe(true));
});

describe("frações com numerador em dígito", () => {
  it("2 terços", () => expect(normalize("aumento de 2 terços")).toBe(" aumento de 2/3 "));
});

describe("barras", () => {
  it("separa sigla de UF e tribunal", () => {
    expect(normalize("Comarca de Maricá/RJ")).toBe(" comarca de marica rj ");
    expect(normalize("Súmula Vinculante 56/STF")).toBe(" sumula vinculante 56 stf ");
  });
});

describe("zeros à esquerda", () => {
  it("prazo com zero", () => expect(normalize("prazo de 05 dias")).toBe(" prazo de 5 dias "));
  it("data com zeros continua ISO", () => expect(normalize("09/03/2018")).toBe(" 2018-03-09 "));
});
