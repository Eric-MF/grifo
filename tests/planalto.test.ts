import { describe, expect, it } from "vitest";
import { citacoesEm } from "@/lib/leis/planalto";

describe("citacoesEm", () => {
  it("liga artigo do CPP ao anchor do Planalto", () => {
    const [c] = citacoesEm("Cabe o recurso do art. 122 do CPP, segundo o texto.");
    expect(c.texto).toBe("art. 122 do CPP");
    expect(c.url).toBe("https://www.planalto.gov.br/ccivil_03/decreto-lei/del3689compilado.htm#art122");
  });

  it("trata artigo com letra e parágrafo/alínea antes do diploma", () => {
    const [c] = citacoesEm("art. 396-A, § 2º, do CPP");
    expect(c.url.endsWith("#art396a")).toBe(true);
  });

  it("reconhece lei pelo número", () => {
    const [c] = citacoesEm("art. 33 da Lei 11.343/06");
    expect(c.url).toBe("https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11343.htm#art33");
  });

  it("ignora diploma desconhecido", () => {
    expect(citacoesEm("art. 10 do Código Civil")).toEqual([]);
  });
});

describe("citacoesEm — súmulas do STF", () => {
  it("liga Súmula do STF à respectiva súmula", () => {
    const [c] = citacoesEm("Tempestividade, na forma da Súmula 707 do STF.");
    expect(c.texto).toBe("Súmula 707 do STF");
    expect(c.url).toBe("https://portal.stf.jus.br/jurisprudencia/sumariosumulas.asp?base=26&sumula=707");
  });

  it("mantém a ordem quando súmula e artigo aparecem juntos", () => {
    const achados = citacoesEm("Súmula 700 do STF ou art. 586 do CPP");
    expect(achados.map((c) => c.texto)).toEqual(["Súmula 700 do STF", "art. 586 do CPP"]);
  });

  it("não liga súmula vinculante", () => {
    expect(citacoesEm("Súmula Vinculante 11 do STF")).toEqual([]);
  });
});
