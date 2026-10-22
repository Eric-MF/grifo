import { describe, expect, it } from "vitest";

const { gerarPergunta } = await import("../src/quiz/banco.ts");
const { corrigirResposta, artigosCitados, citacoesDoFundamento } = await import("../src/quiz/verificar.ts");
const { referenciasDigitadas } = await import("../src/lib/leis/busca.ts");

// o fundamento digitado no quiz é lido como a busca "/" do leitor
describe("fundamento digitado", () => {
  it("lê as formas curtas da busca do leitor", () => {
    expect(referenciasDigitadas("403, §3 cpp")).toEqual([{ lei: "cpp", alvo: { art: "art403", disp: "art403.p3" } }]);
    expect(referenciasDigitadas("406, cpp")).toEqual([{ lei: "cpp", alvo: { art: "art406" } }]);
    expect(referenciasDigitadas("art. 581, IV, do CPP")).toEqual([{ lei: "cpp", alvo: { art: "art581", disp: "art581.i4" } }]);
    expect(referenciasDigitadas("5 LXV CF")).toEqual([{ lei: "cf", alvo: { art: "art5", disp: "art5.i65" } }]);
  });
  it("várias referências, e a parte sem lei usa a da vizinha", () => {
    expect(referenciasDigitadas("art. 5º, LXV, CF; art. 310, I, CPP").map((r) => r.lei)).toEqual(["cf", "cpp"]);
    expect(referenciasDigitadas("art. 321 e 310, III, do CPP")).toEqual([
      { lei: "cpp", alvo: { art: "art321" } },
      { lei: "cpp", alvo: { art: "art310", disp: "art310.i3" } },
    ]);
  });
  it("o que a busca não lê vai para o leitor de citações da correção", () => {
    expect(citacoesDoFundamento("Súmula Vinculante 14")[0]).toMatchObject({ tipo: "sumula", n: "14", vinculante: true });
    expect(citacoesDoFundamento("súmula 523 stf")[0]).toMatchObject({ tipo: "sumula", n: "523", tribunal: "stf" });
  });
  it("memoriais com “403, §3 cpp” e resposta à acusação do júri com “406, cpp” são aceitos", () => {
    const m = gerarPergunta("memoriais", 7);
    expect(corrigirResposta(m, 3, { peca: "memoriais", fundamento: "403, §3 cpp" }).acertou).toBe(true);
    const j = gerarPergunta("resposta-acusacao-juri", 3);
    expect(corrigirResposta(j, 2, { peca: "resposta à acusação", fundamento: "406, cpp" }).acertou).toBe(true);
    expect(artigosCitados("403, §3 cpp")[0]).toMatchObject({ lei: "cpp", art: "art403", disps: ["art403.p3"] });
  });
});
