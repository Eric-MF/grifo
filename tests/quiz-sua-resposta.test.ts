import { describe, expect, it } from "vitest";

const { gerarPergunta } = await import("../src/quiz/banco.ts");
const { corrigirResposta, fundamentoDaPeca, artigosCitados } = await import("../src/quiz/verificar.ts");
const { contextoCorrecao } = await import("../src/lib/correcao/cliente.ts");

describe("a resposta do aluno na correção da peça", () => {
  const p = gerarPergunta("rese", 12345);

  it("toda peça do catálogo tem fundamento padrão", () => {
    for (const tipo of Object.keys(contextoCorrecao().pecas)) expect(fundamentoDaPeca(tipo).length, tipo).toBeGreaterThan(0);
  });

  it("alternativa errada: a peça escolhida com o fundamento padrão dela", () => {
    const r = corrigirResposta(p, 1, { peca: "apelacao" });
    expect(r.acertou).toBe(false);
    expect(r.respondida).toMatchObject({ peca: "Apelação", tipo: "apelacao", artigos: [] });
    expect(r.respondida?.fundamentoDaPeca[0]).toMatch(/^Art\. 593\b/);
    expect(r.respondida?.fundamento).toBeUndefined();
  });

  it("peça digitada errada, com o artigo de outra peça: as duas aparecem", () => {
    const r = corrigirResposta(p, 2, { peca: "recurso de apelação", fundamento: "art. 593, III, b, do CPP" });
    expect(r.acertouPeca).toBe(false);
    expect(r.acertouFundamento).toBe(false);
    expect(r.respondida?.tipo).toBe("apelacao");
    expect(r.respondida?.fundamento).toBe("art. 593, III, b, do CPP");
    expect(r.respondida?.artigos).toEqual([expect.objectContaining({ lei: "cpp", art: "art593", disps: ["art593.i3.ab"] })]);
  });

  it("peça digitada que não existe no catálogo fica sem tipo", () => {
    const r = corrigirResposta(p, 2, { peca: "petição qualquer", fundamento: "art. 581 do CPP" });
    expect(r.respondida).toMatchObject({ peca: "petição qualquer", tipo: null, fundamentoDaPeca: [] });
  });

  it("os dispositivos citados viram as âncoras do leitor", () => {
    expect(artigosCitados("art. 609, parágrafo único, CPP")[0]).toMatchObject({ art: "art609", disps: ["art609.pu"] });
    expect(artigosCitados("art. 5º, LXV, CF")[0]).toMatchObject({ lei: "cf", art: "art5", disps: ["art5.i65"] });
    expect(artigosCitados("art. 403, § 3º, do CPP")[0]).toMatchObject({ disps: ["art403.p3"] });
    expect(artigosCitados("sem artigo")).toEqual([]);
  });
});
