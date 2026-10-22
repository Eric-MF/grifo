import { describe, expect, it } from "vitest";
import { corrigirExame } from "../src/lib/correcao/grader.ts";
import { marcasDoComponente } from "../src/lib/correcao/marcas.ts";
import { ctx, loadExame } from "./helpers.ts";

// Simulado 43, peça, item 4 (endereçamento: Tribunal de Justiça de Campo Belo). A resposta cita "Campo Belo" num
// parágrafo anterior; o parágrafo seguinte traz o tribunal e a cidade juntos. A marcação deve ser o parágrafo completo.
describe("simulado 43, item 4: a marcação do endereçamento", () => {
  const ex = loadExame("43");
  const item4 = ex.peca.itens.find((i) => i.n === "4")!;
  const c1 = item4.componentes.find((c) => c.id === "c1")!;
  const linhas = [
    "Contrarrazões em Apelação",
    "Nos autos da ação ocorrida em Campo Belo, o réu foi denunciado.",
    "Excelentíssimo Senhor Desembargador do Tribunal de Justiça de Campo Belo.",
  ];

  it("a pontuação é dada com o texto inteiro", () => {
    const r = corrigirExame(ex, { peca: linhas.join("\n"), questoes: ["", "", "", ""] }, ctx);
    expect(r.partes[0]!.itens.find((i) => i.n === "4")!.componentes.find((c) => c.id === "c1")!.obtido).toBe(0.1);
  });

  it("a marcação vai para o parágrafo em que o tribunal e a cidade aparecem juntos", () => {
    const marcas = marcasDoComponente(c1, linhas, ctx);
    expect(marcas.map((m) => m.linha)).toEqual([2, 2]);
    expect(marcas.map((m) => linhas[m.linha]!.slice(m.ini, m.fim))).toEqual(["Tribunal de Justiça", "Campo Belo"]);
  });
});
