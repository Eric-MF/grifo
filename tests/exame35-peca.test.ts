import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { corrigirExame } from "../src/lib/correcao/grader.ts";
import { parteDaIA } from "../src/lib/ia/corrigir.ts";
import { ctx, loadExame } from "./helpers.ts";

// Simulado 35, peça completa: o § 1º do art. 28 do CP aparece como "o § 1º do mesmo artigo", logo depois de
// "art. 28, inciso II, do Código Penal". O item 8.2 deve dar o ponto do dispositivo.
const peca = readFileSync(new URL("./fixtures/exame35-peca.txt", import.meta.url), "utf8");

describe("simulado 35, peça completa", () => {
  const r = corrigirExame(loadExame("35"), { peca, questoes: ["", "", "", ""] }, ctx);
  const item = (n: string) => r.partes[0]!.itens.find((i) => i.n === n)!;

  it("item 8.2: o “§ 1º do mesmo artigo” vale como art. 28, § 1º, do CP", () => {
    expect(item("8.2").componentes.map((c) => [c.id, c.obtido])).toEqual([
      ["c1", 0.25],
      ["c2", 0.1],
    ]);
  });
});

describe("correção por IA: o código da parte", () => {
  const codigos = ["peca", "q1", "q2", "q3", "q4"];
  it("aceita o nome da seção da peça ou da questão no lugar do código", () => {
    expect(parteDaIA("peca", codigos)).toBe("peca");
    expect(parteDaIA("Razões de Apelação", codigos)).toBe("peca");
    expect(parteDaIA("Petição de Interposição", codigos)).toBe("peca");
    expect(parteDaIA("Questão 2", codigos)).toBe("q2");
    expect(parteDaIA("Q3", codigos)).toBe("q3");
  });
});
