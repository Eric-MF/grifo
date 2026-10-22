import { describe, expect, it } from "vitest";
import { corUnicas, novaCorPara } from "@/lib/leis/legendas";

describe("novaCorPara: cada + cor acrescentada é diferente das demais", () => {
  it("não repete as cores que o sistema já tem", () => {
    expect(novaCorPara(["#fde047"])).not.toBe("#fde047");
    expect(novaCorPara(["#fde047", "#86efac"])).not.toBe("#86efac");
  });

  it("acrescentando cor após cor, nenhuma se repete (passa da paleta e continua)", () => {
    const usadas: string[] = [];
    for (let k = 0; k < 30; k++) usadas.push(novaCorPara(usadas));
    expect(new Set(usadas).size).toBe(30);
  });

  it("devolve cor em hexadecimal, também depois da paleta, que o seletor de cor aceita", () => {
    const usadas: string[] = [];
    for (let k = 0; k < 30; k++) usadas.push(novaCorPara(usadas));
    for (const cor of usadas) expect(cor).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("corUnicas: um sistema não tem cor repetida", () => {
  it("mantém a primeira ocorrência e troca a repetida por outra cor", () => {
    const cores = corUnicas([
      { cor: "#fde047", rotulo: "Competência" },
      { cor: "#FDE047", rotulo: "Recursos" },
      { cor: "#86efac", rotulo: "Procedimentos" },
    ]);
    expect(cores[0]!.cor).toBe("#fde047");
    expect(cores[1]!.cor.toLowerCase()).not.toBe("#fde047");
    expect(cores[1]!.rotulo).toBe("Recursos");
    expect(new Set(cores.map((c) => c.cor.toLowerCase())).size).toBe(3);
  });
});
