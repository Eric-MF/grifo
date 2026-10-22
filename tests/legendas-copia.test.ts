import { describe, expect, it, vi } from "vitest";
import {
  copiarSistema,
  corDoPronto,
  corUnicas,
  idDosProntos,
  lerLegendas,
  SISTEMAS_PRONTOS,
  type Sistema,
} from "../src/lib/leis/legendas.ts";
import { prontosDosBlocos, type GrifosProntos } from "../src/lib/leis/grifos.ts";
import prontos from "../src/content/generated/grifos.json";

const [materias, teses] = SISTEMAS_PRONTOS as [Sistema, Sistema];

describe("copiar um sistema pronto", () => {
  it("traz id e nome novos, a base, as mesmas cores e rótulos, e a origem de cada cor", () => {
    const copia = copiarSistema(teses!, { id: "meu-1", nome: "Minhas teses" });
    expect(copia.id).toBe("meu-1");
    expect(copia.nome).toBe("Minhas teses");
    expect(copia.base).toBe("teses");
    expect(copia.cores.map((c) => [c.cor, c.rotulo])).toEqual(teses!.cores.map((c) => [c.cor, c.rotulo]));
    expect(copia.cores.map((c) => c.origem)).toEqual(teses!.cores.map((c) => c.rotulo));
  });

  it("a cópia não compartilha objetos com o pronto", () => {
    const copia = copiarSistema(teses!, { id: "meu-1", nome: "Minhas teses" });
    copia.cores[0]!.cor = "#000000";
    copia.cores[0]!.rotulo = "Outro";
    expect(teses!.cores[0]).toEqual({ cor: "#93c5fd", rotulo: "Competência" });
    expect(SISTEMAS_PRONTOS[1]!.cores[0]!.rotulo).toBe("Competência");
  });

  it("depois de trocar rótulo e cor na cópia, o grifo pronto continua com a cor nova", () => {
    const copia = copiarSistema(teses!, { id: "meu-1", nome: "Minhas teses" });
    copia.cores[0] = { ...copia.cores[0]!, cor: "#000001", rotulo: "Foro" };
    expect(corDoPronto(copia, "Competência")).toBe("#000001");
    expect(idDosProntos(copia)).toBe("teses");
    expect(idDosProntos(materias!)).toBe("materias");
  });

  it("copiar de um sistema do usuário com base mantém a base e as origens", () => {
    const copia1 = copiarSistema(materias!, { id: "meu-1", nome: "Um" });
    copia1.cores[1] = { ...copia1.cores[1]!, rotulo: "Recursos da defesa" };
    const copia2 = copiarSistema(copia1, { id: "meu-2", nome: "Dois" });
    expect(copia2.base).toBe("materias");
    expect(copia2.cores.map((c) => c.origem)).toEqual(["Competência", "Recursos", "Procedimentos", "Direitos fundamentais"]);
    expect(corDoPronto(copia2, "Recursos")).toBe(materias!.cores[1]!.cor);
  });

  it("copiar de um sistema do usuário sem base não cria base nem origem", () => {
    const proprio: Sistema = { id: "meu-3", nome: "Próprio", cores: [{ cor: "#111111", rotulo: "Algo" }] };
    const copia = copiarSistema(proprio, { id: "meu-4", nome: "Cópia" });
    expect("base" in copia).toBe(false);
    expect("origem" in copia.cores[0]!).toBe(false);
    expect(idDosProntos(copia)).toBe("meu-4");
  });
});

describe("preservação de origem e base", () => {
  it("corUnicas preserva origem, inclusive na cor que recebe cor nova", () => {
    const cores = [
      { cor: "#fde047", rotulo: "Competência", origem: "Competência" },
      { cor: "#FDE047", rotulo: "Outra", origem: "Competência" },
    ];
    const unicas = corUnicas(cores);
    expect(unicas[0]!.origem).toBe("Competência");
    expect(unicas[1]!.origem).toBe("Competência");
    expect(unicas[1]!.cor).not.toBe("#FDE047");
  });

  it("lerLegendas preserva base e origem dos sistemas salvos", () => {
    const salvo = {
      ativo: "meu-1",
      porLei: {},
      meus: [
        { id: "meu-1", nome: "Minhas", base: "teses", cores: [{ cor: "#93c5fd", rotulo: "Foro", origem: "Competência" }] },
      ],
    };
    // o ambiente de teste é node: um localStorage de mentira, só com a chave dos grifos
    vi.stubGlobal("localStorage", { getItem: () => JSON.stringify(salvo), setItem: () => {}, removeItem: () => {} });
    try {
      const e = lerLegendas();
      expect(e.meus[0]!.base).toBe("teses");
      expect(e.meus[0]!.cores[0]).toEqual({ cor: "#93c5fd", rotulo: "Foro", origem: "Competência" });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("grifos prontos de uma cópia", () => {
  it("o art. 70 do CPP recebe a cor da cópia pela regra de Competência de teses", () => {
    const copia = copiarSistema(teses!, { id: "meu-1", nome: "Minhas teses" });
    copia.cores[0] = { ...copia.cores[0]!, cor: "#123456" };
    const m = prontosDosBlocos([{ disp: "art70" }], prontos as GrifosProntos, idDosProntos(copia), "cpp", (r) => corDoPronto(copia, r));
    expect(m.get(0)?.rotulo).toBe("Competência");
    expect(m.get(0)?.cor).toBe("#123456");
  });
});
