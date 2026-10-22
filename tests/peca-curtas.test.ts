import { describe, expect, it } from "vitest";
import { MAX_CASO_PECA, prontasDePeca } from "../src/quiz/banco.ts";
import { GERADORES } from "../src/quiz/geradores";
import { criarRng } from "../src/quiz/rng";

describe("Peça e fundamento: só perguntas curtas e sobre a peça", () => {
  it("as perguntas prontas têm caso curto, inclusive as dos exames, que entram resumidas", () => {
    const prontas = prontasDePeca(true);
    expect(prontas.length).toBeGreaterThanOrEqual(54);
    for (const p of prontas) expect(p.caso.length, p.id).toBeLessThanOrEqual(MAX_CASO_PECA);
    // os enunciados das peças dos exames entram resumidos (content/perguntas/exames-reais.yaml)
    expect(prontas.filter((p) => p.id.startsWith("exame-")).length).toBeGreaterThanOrEqual(44);
  });

  it("as objetivas que não perguntam a peça ou o recurso cabível não entram", () => {
    const ids = prontasDePeca(true).map((p) => p.id);
    expect(ids).not.toContain("obj-40-63");
    expect(ids).not.toContain("obj-46-66");
    expect(ids).toContain("obj-44-63");
  });

  it("os casos gerados também são curtos", () => {
    for (const g of GERADORES)
      for (let s = 1; s <= 40; s++) expect(g.gerar(criarRng(s)).caso.length, g.id).toBeLessThanOrEqual(MAX_CASO_PECA);
  });
});
