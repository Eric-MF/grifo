import { describe, expect, it } from "vitest";
import type { Componente } from "../src/content/schema.ts";
import type { Contexto } from "../src/lib/correcao/grader.ts";
import { gabaritoComenta, marcasDoComponente } from "../src/lib/correcao/marcas.ts";

// Só termos: o contexto de dispositivos não é usado aqui
const ctx = {} as Contexto;
const comp = (o: Partial<Componente>) => ({ id: "c", valor: 0.1, rotulo: "", ...o }) as Componente;
const trechos = (linhas: string[], marcas: ReturnType<typeof marcasDoComponente>) => marcas.map((m) => linhas[m.linha]!.slice(m.ini, m.fim));

describe("marcas: a palavra que concedeu o ponto", () => {
  it("marca só a palavra da regra, sem a pontuação da borda", () => {
    const linhas = ["O prazo é de cinco dias."];
    const marcas = marcasDoComponente(comp({ termos: ["prazo", "5 dias"] }), linhas, ctx);
    expect(trechos(linhas, marcas)).toEqual(["prazo", "cinco dias"]);
  });

  it("a palavra inteira é marcada mesmo quando a regra pega só o começo dela", () => {
    const linhas = ["O julgamento do recurso foi adiado."];
    const marcas = marcasDoComponente(comp({ termos: ["julga*"] }), linhas, ctx);
    expect(trechos(linhas, marcas)).toEqual(["julgamento"]);
  });

  it("marca o parágrafo (linha) em que a palavra está, na posição certa", () => {
    const linhas = ["Primeiro parágrafo sem nada.", "Segundo: a prescrição ocorreu."];
    const [m] = marcasDoComponente(comp({ termos: ["prescri*"] }), linhas, ctx);
    expect(m!.linha).toBe(1);
    expect(linhas[1]!.slice(m!.ini, m!.fim)).toBe("prescrição");
  });

  it("usa a primeira alternativa que casa inteira, como o corretor", () => {
    const linhas = ["Trânsito em julgado da sentença."];
    const comp1 = comp({ alternativas: [["transito em julgado", "prescricao"], ["trânsito em julgado"]] });
    expect(trechos(linhas, marcasDoComponente(comp1, linhas, ctx))).toEqual(["Trânsito em julgado"]);
  });

  it("componente que não pontuou não tem marcas", () => {
    expect(marcasDoComponente(comp({ termos: ["decadencia"] }), ["Nada a ver."], ctx)).toEqual([]);
  });
});

describe("gabarito: o parágrafo que comenta o componente", () => {
  it("reconhece o parágrafo que trata do termo da regra", () => {
    const c = comp({ termos: ["prazo", "5 dias"] });
    expect(gabaritoComenta(c, "O prazo para a apelação é de cinco dias.", ctx)).toBe(true);
    expect(gabaritoComenta(c, "Cabe a inteligência do art. 5º.", ctx)).toBe(false);
  });
});

describe("marcas: a conjunção de termos fica num só parágrafo, na ordem do texto", () => {
  const conjuncao = comp({ termos: ["tribunal de justica | tj", "campo belo"] });

  it("marca o parágrafo em que todos os termos aparecem juntos, mesmo que outro parágrafo antes cite um deles", () => {
    const linhas = ["Ação ajuizada em Campo Belo.", "O Tribunal de Justiça de Campo Belo é o competente."];
    const marcas = marcasDoComponente(conjuncao, linhas, ctx);
    expect(marcas.map((m) => m.linha)).toEqual([1, 1]);
    expect(trechos(linhas, marcas)).toEqual(["Tribunal de Justiça", "Campo Belo"]);
  });

  it("entre os parágrafos que reúnem todos os termos, vale o primeiro na ordem do texto", () => {
    const linhas = ["Campo Belo e Tribunal de Justiça.", "Outro Tribunal de Justiça de Campo Belo."];
    expect(marcasDoComponente(conjuncao, linhas, ctx).map((m) => m.linha)).toEqual([0, 0]);
  });

  it("sem parágrafo que reúna os termos, cada um vale onde estiver (a regra do corretor aceita o texto inteiro)", () => {
    const linhas = ["Ação ajuizada em Campo Belo.", "Recurso ao Tribunal de Justiça."];
    // na ordem dos termos da regra: o tribunal (no parágrafo 2) e depois a cidade (no parágrafo 1)
    expect(marcasDoComponente(conjuncao, linhas, ctx).map((m) => m.linha)).toEqual([1, 0]);
  });
});
