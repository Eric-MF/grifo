import { describe, expect, it } from "vitest";
import type { Item } from "../src/content/schema.ts";
import type { Contexto, ResultadoParte } from "../src/lib/correcao/grader.ts";
import { criteriosPontuados, type CriterioRetirado, fraseNaLinha, gerarRecurso, gerarRecursoDiferente, type Sorteio } from "../src/lib/correcao/recurso.ts";

const ctx = {} as Contexto;

/** Um sorteio determinístico (congruencial): a mesma semente dá a mesma sequência. */
function semente(n: number): Sorteio {
  let s = n;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x80000000;
  };
}

// Um critério que a tabela pontuou: exige "justica federal" e a resposta o traz.
const itens = [
  { n: "1", descricao: "Competência da Justiça Federal (0,75).", secao: "PRELIMINARES", componentes: [{ id: "c1", valor: 0.75, rotulo: "Competência federal", termos: ["justica federal"] }] },
] as unknown as Item[];
const parte = {
  parte: "peca",
  titulo: "Peça (Resposta à Acusação)",
  valor: 5,
  obtido: 0.75,
  obtidoBruto: 0.75,
  linhasUsadas: 2,
  itens: [{ n: "1", descricao: "Competência da Justiça Federal (0,75).", obtido: 0.75, valor: 0.75, componentes: [{ id: "c1", rotulo: "Competência federal", valor: 0.75, obtido: 0.75, evidencias: [], faltou: [] }] }],
} as unknown as ResultadoParte;
const linhas = ["Trata-se de tema da justiça federal como juízo competente, conforme o art. 109, V. Sem mais.", "Nada a acrescentar."];

const criterio = (n: string, id: string, frase: string, nome = `Critério ${n}`, linha = 1): CriterioRetirado => ({
  n,
  id,
  criterio: nome,
  valor: 0.5,
  frases: [{ texto: frase, linha }],
});

describe("recurso: a frase inteira, não só a palavra", () => {
  it("devolve a frase inteira em que a palavra aparece", () => {
    const linha = "A resposta trata da justiça federal como juízo competente.";
    const ini = linha.indexOf("justiça");
    expect(fraseNaLinha(linha, ini, ini + "justiça federal".length)).toBe("A resposta trata da justiça federal como juízo competente.");
  });

  it("não quebra a frase numa abreviatura como 'art.'", () => {
    const linha = "Conforme o art. 109, V, a competência é da justiça federal. Sem mais.";
    const ini = linha.indexOf("justiça");
    expect(fraseNaLinha(linha, ini, ini + 7)).toBe("Conforme o art. 109, V, a competência é da justiça federal.");
  });
});

describe("recurso: só o que a tabela pontuou", () => {
  it("acha os critérios pontuados e as frases que os comprovam", () => {
    const criterios = criteriosPontuados(parte, itens, linhas, ctx);
    expect(criterios).toHaveLength(1);
    expect(criterios[0]!.n).toBe("1");
    expect(criterios[0]!.criterio).toBe("Competência federal");
    expect(criterios[0]!.frases).toEqual([{ texto: "Trata-se de tema da justiça federal como juízo competente, conforme o art. 109, V.", linha: 1 }]);
  });

  it("não traz critério que a tabela não pontuou", () => {
    const naoPontuou = { ...parte, itens: [{ ...parte.itens[0]!, componentes: [{ ...parte.itens[0]!.componentes[0]!, obtido: 0 }] }] } as unknown as ResultadoParte;
    expect(criteriosPontuados(naoPontuou, itens, linhas, ctx)).toEqual([]);
  });
});

describe("recurso: conteúdo fixo, redação variável", () => {
  const criterios = [criterio("1", "c1", "A resposta trata da justiça federal como juízo competente.")];

  it("cita o item, o critério e a frase inteira com a linha, sem mencionar caracteres", () => {
    const texto = gerarRecurso("Peça (Resposta à Acusação)", criterios, semente(7));
    expect(texto).toContain("Critério 1");
    expect(texto).toContain("“A resposta trata da justiça federal como juízo competente.” (linha 1)");
    expect(texto.toLowerCase()).not.toContain("caractere");
  });

  it("muda a redação de uma geração para outra", () => {
    expect(gerarRecurso("Peça", criterios, semente(1))).not.toBe(gerarRecurso("Peça", criterios, semente(2)));
  });

  it("a mesma semente dá o mesmo texto (o sorteio é o único que varia)", () => {
    expect(gerarRecurso("Peça", criterios, semente(42))).toBe(gerarRecurso("Peça", criterios, semente(42)));
  });

  it("há muitas variações de redação", () => {
    const textos = new Set(Array.from({ length: 60 }, (_, k) => gerarRecurso("Peça", criterios, semente(k + 1))));
    expect(textos.size).toBeGreaterThan(40);
  });

  it("a nova redação nunca repete a anterior", () => {
    let anterior = gerarRecurso("Peça", criterios, semente(3));
    for (let k = 0; k < 100; k++) {
      const nova = gerarRecursoDiferente("Peça", criterios, semente(k + 100), anterior);
      expect(nova).not.toBe(anterior);
      anterior = nova;
    }
  });

  it("sem critérios escolhidos, diz isso em vez de inventar um recurso", () => {
    expect(gerarRecurso("Questão 2", [], semente(1))).toMatch(/Nenhum critério foi retirado em Questão 2/);
  });
});

describe("recurso: só os critérios, sem repetir o texto do item", () => {
  it("o recurso não traz a descrição do item, só o número e o critério", () => {
    const criterios = [criterio("11", "c1", "Frase um.", "Critério de prazo")];
    for (let k = 0; k < 50; k++) {
      const texto = gerarRecurso("Peça", criterios, semente(k + 1));
      expect(texto).toContain("item 11");
      expect(texto).toContain("“Critério de prazo”");
      expect(texto).not.toContain("Competência");
    }
  });
});

describe("recurso: dois critérios do mesmo item se ligam pelo item", () => {
  it("o segundo critério do item começa por 'Ainda sobre o item N'", () => {
    const criterios = [criterio("11", "a", "Frase um.", "Critério A"), criterio("11", "b", "Frase dois.", "Critério B", 2)];
    for (let k = 0; k < 50; k++) {
      const segundo = gerarRecurso("Peça", criterios, semente(k + 1)).split("\n\n")[2]!;
      expect(segundo).toMatch(/^(Ainda sobre o item 11|No mesmo item 11),/);
      expect(segundo).toContain("“Critério B”");
    }
  });

  it("um critério de outro item não usa essa ligação", () => {
    const criterios = [criterio("11", "a", "Frase um.", "Critério A"), criterio("12", "b", "Frase dois.", "Critério B", 2)];
    for (let k = 0; k < 50; k++) {
      const segundo = gerarRecurso("Peça", criterios, semente(k + 1)).split("\n\n")[2]!;
      expect(segundo).not.toMatch(/Ainda sobre|No mesmo item/);
    }
  });

  it("a mesma passagem não se repete para dois critérios do mesmo item", () => {
    const frase = "Frase que comprova os dois critérios.";
    const criterios = [criterio("11", "a", frase, "Critério A"), criterio("11", "b", frase, "Critério B")];
    for (let k = 0; k < 50; k++) {
      const segundo = gerarRecurso("Peça", criterios, semente(k + 1)).split("\n\n")[2]!;
      expect(segundo).not.toContain(`“${frase}”`);
      expect(segundo).toMatch(/passagem/);
    }
  });
});

describe("recurso: a ordem e o número de conectivos", () => {
  it("cada item tem um conectivo de abertura (e os itens seguintes trazem o número do item)", () => {
    const criterios = [criterio("1", "a", "Frase um.", "A"), criterio("2", "b", "Frase dois.", "B", 2), criterio("3", "c", "Frase três.", "C", 2)];
    for (let k = 0; k < 50; k++) {
      const paragrafos = gerarRecurso("Peça", criterios, semente(k + 1)).split("\n\n");
      expect(paragrafos[1]).toMatch(/item 1/);
      expect(paragrafos[2]).toMatch(/item 2/);
      expect(paragrafos[3]).toMatch(/item 3/);
    }
  });
});
