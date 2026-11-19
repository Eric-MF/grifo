import { describe, expect, it } from "vitest";
import { examesDosMarcos, espalhar, faixasDasEras } from "../src/lib/estatisticas/linha";
import type { ExameEstat, MarcoLinha } from "../src/lib/estatisticas/tipos";

const ex = (o: Partial<ExameEstat> & { id: string; ordem: number }): ExameEstat => ({
  numero: o.ordem,
  numeral: String(o.ordem),
  titulo: `${o.ordem} Exame`,
  apelido: null,
  ano: null,
  anoEstimado: false,
  data: null,
  quando: null,
  era: "fgv",
  variante: null,
  pecas: ["apelacao"],
  pecaNaProva: null,
  noSite: true,
  corrigivel: true,
  preliminar: false,
  questoes: 4,
  links: {},
  teses: { peca: [], questoes: [] },
  ...o,
});

const marco = (o: Partial<MarcoLinha> & { de: number }): MarcoLinha => ({
  quando: String(o.de),
  ate: null,
  rotulo: "",
  titulo: "",
  texto: "",
  era: "fgv",
  ...o,
});

describe("espalhar", () => {
  it("afasta os marcadores que estão apertados", () => {
    expect(espalhar([10, 12, 14], 10, 0, 100)).toEqual([10, 20, 30]);
  });

  it("empurra para trás quando passa do máximo", () => {
    expect(espalhar([90, 95, 99], 10, 0, 100)).toEqual([80, 90, 100]);
  });

  it("não sai do mínimo", () => {
    expect(espalhar([-5, 50], 10, 0, 100)).toEqual([0, 50]);
  });

  it("lista vazia dá lista vazia", () => {
    expect(espalhar([], 10, 0, 100)).toEqual([]);
  });
});

describe("faixasDasEras", () => {
  // fora de ordem de propósito: a função ordena pelo momento
  const exames = [
    ex({ id: "f2", ordem: 5, era: "fgv", quando: 2011.2 }),
    ex({ id: "v2", ordem: 1, era: "vunesp", quando: 2001.5 }),
    ex({ id: "c1", ordem: 3, era: "cespe", quando: 2009.5 }),
    ex({ id: "f1", ordem: 4, era: "fgv", quando: 2010.9 }),
    ex({ id: "v1", ordem: 0, era: "vunesp", quando: 2000.5 }),
    ex({ id: "sem", ordem: 6, era: "fgv", quando: null }),
    ex({ id: "var", ordem: 7, era: "cespe", quando: 2010.0, variante: "Porto Velho" }),
  ];

  it("monta uma faixa por época, do primeiro exame até o da época seguinte", () => {
    const faixas = faixasDasEras(exames, 2012);
    expect(faixas).toEqual([
      { era: "vunesp", de: 2000.5, ate: 2009.5, exames: 2 },
      { era: "cespe", de: 2009.5, ate: 2010.9, exames: 1 },
      { era: "fgv", de: 2010.9, ate: 2012, exames: 2 },
    ]);
  });

  it("exames sem quando e reaplicações não entram", () => {
    const faixas = faixasDasEras(exames, 2012);
    expect(faixas.reduce((s, f) => s + f.exames, 0)).toBe(5);
    expect(faixas.some((f) => f.era === "cespe" && f.de === 2010)).toBe(false);
  });
});

describe("examesDosMarcos", () => {
  const marcos = [marco({ de: 2000, quando: "2000" }), marco({ de: 2010, quando: "2010" })];
  const exames = [
    ex({ id: "a", ordem: 0, quando: 2005 }),
    ex({ id: "b", ordem: 1, quando: 2009.9 }),
    ex({ id: "c", ordem: 2, quando: 2010 }),
    ex({ id: "d", ordem: 3, quando: 2020 }),
    ex({ id: "semData", ordem: 4, quando: null }),
  ];

  it("cada marco recebe os exames do seu intervalo", () => {
    const [primeiro, segundo] = examesDosMarcos(marcos, exames).map((l) => l.map((e) => e.id));
    expect(primeiro).toEqual(["a", "b"]);
    expect(segundo).toEqual(["c", "d"]);
  });

  it("exame sem quando não entra em nenhum marco", () => {
    const todos = examesDosMarcos(marcos, exames).flat().map((e) => e.id);
    expect(todos).not.toContain("semData");
  });
});
