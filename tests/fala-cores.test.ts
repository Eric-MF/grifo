import { describe, expect, it } from "vitest";
import { corDita, corParaGrifar, corPeloNome, nomeDaCor } from "../src/lib/fala/cores-faladas.ts";

// a legenda dos sistemas prontos (src/lib/leis/legendas.ts)
const LEGENDA = [
  { cor: "#86efac", rotulo: "Peças" },
  { cor: "#fde047", rotulo: "Teses" },
  { cor: "#93c5fd", rotulo: "Súmulas" },
  { cor: "#fca5a5", rotulo: "Pedidos" },
];

describe("nomeDaCor", () => {
  it.each([
    ["#fde047", "amarelo"],
    ["#86efac", "verde"],
    ["#93c5fd", "azul"],
    ["#f9a8d4", "rosa"],
    ["#fca5a5", "vermelho"],
    ["#c4b5fd", "roxo"],
    ["#fdba74", "laranja"],
    ["#5eead4", "verde"],
    ["#cccccc", "cinza"],
  ])("%s é %s", (hex, nome) => {
    expect(nomeDaCor(hex)).toBe(nome);
  });

  it("o que não é hex não tem nome", () => {
    expect(nomeDaCor("color-mix(in srgb, red, blue)")).toBeNull();
  });
});

describe("corDita", () => {
  it("pelo significado na legenda, no singular ou no plural", () => {
    for (const dito of ["teses", "tese", "as teses"]) {
      const c = corDita(dito, LEGENDA)!;
      expect(c.nome).toBe("Teses");
      expect(c.casa("#fde047")).toBe(true);
      expect(c.casa("#86efac")).toBe(false);
    }
    expect(corDita("peça", LEGENDA)?.nome).toBe("Peças");
    expect(corDita("sumulas", LEGENDA)?.nome).toBe("Súmulas");
  });

  it("pelo nome da cor, em qualquer tom dela", () => {
    const c = corDita("amarela", LEGENDA)!;
    expect(c.nome).toBe("amarelo");
    expect(c.casa("#fde047")).toBe(true);
    expect(c.casa("#fde68a")).toBe(true);
    expect(c.casa("#93c5fd")).toBe(false);
  });

  it("o que não é cor nem legenda: null", () => {
    expect(corDita("banana", LEGENDA)).toBeNull();
    expect(corPeloNome("banana")).toBeNull();
  });
});

describe("corParaGrifar", () => {
  it("o significado ou o nome escolhem a cor da legenda", () => {
    expect(corParaGrifar("teses", LEGENDA)?.cor).toBe("#fde047");
    expect(corParaGrifar("verde", LEGENDA)?.cor).toBe("#86efac");
    expect(corParaGrifar("roxo", LEGENDA)).toBeNull();
  });
});
