import { describe, expect, it } from "vitest";
import { coresPorArtigo } from "../src/lib/leis/remissivo-cores.ts";

const ORDEM = ["#a00", "#0a0", "#00a"];
const opcoes = (marcas: { disp?: string; cor: string }[], prontos: { disp: string; cor: string }[]) =>
  coresPorArtigo({
    marcas,
    prontos,
    corDoPronto: (g) => g.cor,
    rotuloDoPronto: (g) => `pronto ${g.cor}`,
    rotuloDaMarca: (cor) => `meu ${cor}`,
    ordem: (cor) => ORDEM.indexOf(cor),
  });

describe("coresPorArtigo", () => {
  it("junta, por artigo, as cores dos grifos do usuário e dos prontos, na ordem do sistema", () => {
    const m = opcoes([{ disp: "art366.p1", cor: "#00a" }], [{ disp: "art366", cor: "#a00" }, { disp: "art225.i2", cor: "#0a0" }]);
    expect(m.get("art366")).toEqual([
      { cor: "#a00", rotulo: "pronto #a00", meu: false },
      { cor: "#00a", rotulo: "meu #00a", meu: true },
    ]);
    expect(m.get("art225")).toEqual([{ cor: "#0a0", rotulo: "pronto #0a0", meu: false }]);
  });

  it("a mesma cor entra uma vez; a do usuário vale como dele", () => {
    const m = opcoes([{ disp: "art61.i2", cor: "#a00" }], [{ disp: "art61", cor: "#a00" }]);
    expect(m.get("art61")).toEqual([{ cor: "#a00", rotulo: "meu #a00", meu: true }]);
  });

  it("ignora anotação sem cor, marcação sem dispositivo e pronto sem cor no sistema", () => {
    const m = coresPorArtigo({
      marcas: [{ disp: "art1", cor: "nota" }, { cor: "#a00" }],
      prontos: [{ disp: "art2" }],
      corDoPronto: () => null,
      rotuloDoPronto: () => "",
      rotuloDaMarca: () => "",
      ordem: () => 0,
    });
    expect(m.size).toBe(0);
  });
});
