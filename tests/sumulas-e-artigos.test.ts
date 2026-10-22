import { describe, expect, it } from "vitest";
import { corrigirExame } from "../src/lib/correcao/grader.ts";
import { marcasDoComponente } from "../src/lib/correcao/marcas.ts";
import { ctx, loadExame } from "./helpers.ts";

// Simulado 43, peça, item 5: c1 é a natureza da ação (0,45); c2 é a súmula 542 do STJ ou o art. 41 da Lei 11.340/2006 (0,10).
// A regra do c2 pede o número e o tribunal da súmula, e a lei e o artigo do dispositivo. Uma súmula de outro número ou de
// outro tribunal, ou uma súmula sem tribunal, não pontua. O recurso e a marcação mostram a citação inteira.
const ex = loadExame("43");
const base = "Contrarrazões em Apelação\nTrata-se de violência doméstica e familiar contra a mulher, e a ação penal é pública incondicionada, ";
const c2 = (texto: string) => {
  const r = corrigirExame(ex, { peca: base + texto, questoes: ["", "", "", ""] }, ctx);
  return r.partes[0]!.itens.find((i) => i.n === "5")!.componentes.find((c) => c.id === "c2")!;
};

describe("súmula: o número e o tribunal", () => {
  it("pontua com a súmula do tribunal certo", () => {
    expect(c2("consoante Súmula 542 do STJ.").obtido).toBe(0.1);
  });

  it("não pontua sem o tribunal (\"Súmula 542\" sozinha)", () => {
    expect(c2("consoante Súmula 542.").obtido).toBe(0);
  });

  it("não pontua com a mesma súmula de outro tribunal", () => {
    expect(c2("consoante Súmula 542 do STF.").obtido).toBe(0);
  });

  it("não pontua com outra súmula do mesmo tribunal", () => {
    expect(c2("consoante Súmula 700 do STJ.").obtido).toBe(0);
  });

  it("pontua com o enunciado escrito por extenso", () => {
    expect(c2("consoante o enunciado 542 da Súmula da Jurisprudência do Superior Tribunal de Justiça.").obtido).toBe(0.1);
  });
});

describe("artigo: o número da lei e do artigo", () => {
  it("pontua com o artigo e a lei, e a lei pode vir sem a pontuação", () => {
    expect(c2("consoante o Art. 41 da Lei nº 11.340/2006.").obtido).toBe(0.1);
    expect(c2("consoante o art. 41 da Lei 11340.").obtido).toBe(0.1);
  });

  it("não pontua com outro artigo da mesma lei", () => {
    expect(c2("consoante o Art. 42 da Lei nº 11.340/2006.").obtido).toBe(0);
  });
});

describe("a marcação mostra a citação inteira, não só a palavra que a começa", () => {
  const marcar = (linha: string, id: string) => {
    const linhas = ["Contrarrazões em Apelação", base + linha];
    const comp = ex.peca.itens.find((i) => i.n === "5")!.componentes.find((c) => c.id === id)!;
    return marcasDoComponente(comp, linhas, ctx).map((m) => linhas[m.linha]!.slice(m.ini, m.fim));
  };

  it("a súmula com o tribunal", () => {
    expect(marcar("consoante Súmula 542 do STJ.", "c2")).toEqual(["Súmula 542 do STJ"]);
  });

  it("o enunciado da súmula, com a palavra 'enunciado'", () => {
    expect(marcar("consoante o enunciado 542 da Súmula do STJ.", "c2")).toEqual(["enunciado 542 da Súmula do STJ"]);
  });

  it("o artigo com a lei, incluindo o número com a pontuação", () => {
    expect(marcar("consoante o Art. 41 da Lei nº 11.340/2006.", "c2")).toEqual(["Art. 41 da Lei nº 11.340/2006"]);
  });

  it("não marca nada quando a súmula não tem o tribunal", () => {
    expect(marcar("consoante Súmula 542.", "c2")).toEqual([]);
  });
});
