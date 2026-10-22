import { describe, expect, it } from "vitest";
import { corrigirExame } from "../src/lib/correcao/grader.ts";
import { marcasDoComponente } from "../src/lib/correcao/marcas.ts";
import { criteriosPontuados } from "../src/lib/correcao/recurso.ts";
import { ctx, loadExame } from "./helpers.ts";

// Simulado 43 (Contrarrazões em Apelação): a resposta trazia "no prazo de 3 (três) dias, na forma do Art. 600, § 1º,
// do CPP." A tabela pontuava o item 3 (prazo e dispositivo), mas o ✂ não aparecia: o recurso não encontrava a frase.
const frase = "no prazo de 3 (três) dias, na forma do Art. 600, § 1º, do CPP.";
const resposta = `Interposta a apelação, ${frase}\nNo mais, reitera-se o pedido de absolvição.`;

describe("simulado 43: o critério do prazo e do dispositivo pode ser retirado", () => {
  const ex = loadExame("43");
  const peca = ex.peca.itens.find((i) => i.n === "3")!;

  it("a tabela pontua os dois componentes do item 3 com essa resposta", () => {
    const r = corrigirExame(ex, { peca: resposta, questoes: [] }, ctx);
    const item = r.partes[0]!.itens.find((i) => i.n === "3")!;
    expect(item.componentes.map((c) => c.obtido > 0)).toEqual([true, true]);
  });

  it("o trecho do prazo (3 (três) dias) é marcado na linha, como a palavra inteira", () => {
    const linhas = resposta.split("\n");
    const c1 = peca.componentes.find((c) => c.id === "c1")!;
    const marcas = marcasDoComponente(c1, linhas, ctx);
    expect(marcas).toHaveLength(1);
    expect(linhas[marcas[0]!.linha]!.slice(marcas[0]!.ini, marcas[0]!.fim)).toBe("3 (três) dias");
  });

  it("a frase vem inteira mesmo quando há outras na mesma linha ('do CPP.' encerra a frase)", () => {
    const meio = `Primeiro ponto, sem relação. Interposta a apelação, ${frase} Segundo ponto, à parte.`;
    const r = corrigirExame(ex, { peca: meio, questoes: [] }, ctx);
    const doItem3 = criteriosPontuados(r.partes[0]!, ex.peca.itens, meio.split("\n"), ctx).filter((c) => c.n === "3");
    expect(doItem3[0]!.frases).toEqual([{ texto: `Interposta a apelação, ${frase}`, linha: 1 }]);
  });

  it("o recurso oferece o critério com a frase inteira da resposta", () => {
    const r = corrigirExame(ex, { peca: resposta, questoes: [] }, ctx);
    const criterios = criteriosPontuados(r.partes[0]!, ex.peca.itens, resposta.split("\n"), ctx);
    const doItem3 = criterios.filter((c) => c.n === "3");
    expect(doItem3.map((c) => c.id)).toEqual(["c1", "c2"]);
    for (const c of doItem3) {
      expect(c.frases).toEqual([{ texto: `Interposta a apelação, ${frase}`, linha: 1 }]);
    }
  });
});
