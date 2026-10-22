import { describe, expect, it } from "vitest";
import { leiDigitada, leiNaBusca, semPalavraSumula } from "../src/lib/leis/busca.ts";

describe("leiDigitada — número de súmula com a lista do STF ou do STJ", () => {
  it("o número e o tribunal, em qualquer ordem e com ou sem a palavra súmula", () => {
    const stf = { lei: "sumulas-stf", resto: "145" };
    for (const consulta of ["145 stf", "stf 145", "súmula 145 stf", "Súmula 145 do STF", "sumula 145 do stf", "súmula nº 145 do STF", "stf súmula 145", "súmula stf 145", "sum. 145 stf", "S. 145 STF"]) {
      expect(leiDigitada(consulta), consulta).toEqual(stf);
    }
  });

  it("STJ, com as mesmas formas", () => {
    const stj = { lei: "sumulas-stj", resto: "145" };
    for (const consulta of ["145 stj", "stj 145", "súmula 145 stj", "Súmula 145 do STJ", "súmula nº 145 do STJ", "stj súmula 145", "súmula stj 145", "S. 145 STJ"]) {
      expect(leiDigitada(consulta), consulta).toEqual(stj);
    }
  });

  it("as formas com a palavra súmula no nome da lista", () => {
    expect(leiDigitada("145 sumulas do stf")).toEqual({ lei: "sumulas-stf", resto: "145" });
    expect(leiDigitada("145 sumula stj")).toEqual({ lei: "sumulas-stj", resto: "145" });
  });

  it("a palavra súmula não atrapalha as leis", () => {
    expect(leiDigitada("100 cp")).toEqual({ lei: "cp", resto: "100" });
    expect(leiDigitada("art. 100 do CP")).toEqual({ lei: "cp", resto: "art. 100" });
  });

  it("sem número, a lista sozinha não é referência", () => {
    expect(leiDigitada("stf")).toBeNull();
    expect(leiDigitada("súmula do stj")).toBeNull();
  });
});

describe("leiNaBusca — lista de súmulas junto de palavras", () => {
  it("o tribunal depois ou antes das palavras", () => {
    expect(leiNaBusca("tráfico stj")).toEqual({ lei: "sumulas-stj", resto: "trafico" });
    expect(leiNaBusca("insignificância do STF")).toEqual({ lei: "sumulas-stf", resto: "insignificancia" });
    expect(leiNaBusca("stj prescrição")).toEqual({ lei: "sumulas-stj", resto: "prescricao" });
  });

  it("número de súmula não é busca de palavras", () => {
    expect(leiNaBusca("súmula 145 stf")).toBeNull();
    expect(leiNaBusca("145 stf")).toBeNull();
    expect(leiNaBusca("stf 145")).toBeNull();
    expect(leiNaBusca("sumula stf")).toBeNull();
  });

  it("não regride: lei de alias parcial e palavras que terminam igual", () => {
    expect(leiNaBusca("biblioteca")).toBeNull();
    expect(leiNaBusca("absolvição cpp")).toEqual({ lei: "cpp", resto: "absolvicao" });
    expect(leiNaBusca("lcp absolvição")).toBeNull();
  });
});

describe("semPalavraSumula — a palavra súmula antes do número, na lista aberta", () => {
  it("tira a palavra e o nº", () => {
    expect(semPalavraSumula("súmula 145")).toBe("145");
    expect(semPalavraSumula("Súmula nº 145")).toBe("145");
    expect(semPalavraSumula("sum. 145")).toBe("145");
    expect(semPalavraSumula("S. 145")).toBe("145");
  });

  it("o número sem palavra fica como está", () => {
    expect(semPalavraSumula("145")).toBe("145");
    expect(semPalavraSumula("art. 145")).toBe("art. 145");
  });
});
