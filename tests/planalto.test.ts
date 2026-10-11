import { describe, expect, it } from "vitest";
import { citacoesEm } from "@/lib/leis/planalto";

describe("citacoesEm", () => {
  it("liga artigo do CPP ao anchor do Planalto", () => {
    const [c] = citacoesEm("Cabe o recurso do art. 122 do CPP, segundo o texto.");
    expect(c.texto).toBe("art. 122 do CPP");
    expect(c.url).toBe("/leis/cpp/#art122");
    expect(c.planalto).toBe("https://www.planalto.gov.br/ccivil_03/decreto-lei/del3689compilado.htm#art122");
    expect(c).toMatchObject({ lei: "cpp", art: "art122" });
  });

  it("trata artigo com letra e parágrafo/alínea antes do diploma", () => {
    const [c] = citacoesEm("art. 396-A, § 2º, do CPP");
    expect(c.planalto!.endsWith("#art396a")).toBe(true);
    expect(c.url).toBe("/leis/cpp/#art396-a");
  });

  it("aceita espaço entre o hífen e a letra do artigo", () => {
    const [c] = citacoesEm("estupro de vulnerável, artigo 217- A do CP");
    expect(c.planalto).toBe("https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848.htm#art217a");
  });

  it("reconhece lei pelo número", () => {
    const [c] = citacoesEm("art. 33 da Lei 11.343/06");
    expect(c.planalto).toBe("https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11343.htm#art33");
  });

  it("resolve a lei pelo apelido do registro de leis", () => {
    const [lep] = citacoesEm("art. 197 da Lei 7.210/84");
    expect(lep.planalto).toBe("https://www.planalto.gov.br/ccivil_03/leis/l7210.htm#art197");
    const [hediondos] = citacoesEm("art. 2º da Lei 8.072/90");
    expect(hediondos.planalto).toBe("https://www.planalto.gov.br/ccivil_03/leis/l8072.htm#art2");
    const [ctb] = citacoesEm("art. 302 do CTB");
    expect(ctb.planalto).toBe("https://www.planalto.gov.br/ccivil_03/leis/l9503.htm#art302");
  });

  it("ignora diploma desconhecido", () => {
    expect(citacoesEm("art. 10 do Código Civil")).toEqual([]);
  });
});

describe("citacoesEm — súmulas do STF", () => {
  it("liga Súmula do STF à respectiva súmula", () => {
    const [c] = citacoesEm("Tempestividade, na forma da Súmula 707 do STF.");
    expect(c.texto).toBe("Súmula 707 do STF");
    expect(c.url).toBe("https://jurisprudencia.stf.jus.br/pages/search/seq-sumula707/false");
  });

  it("mantém a ordem quando súmula e artigo aparecem juntos", () => {
    const achados = citacoesEm("Súmula 700 do STF ou art. 586 do CPP");
    expect(achados.map((c) => c.texto)).toEqual(["Súmula 700 do STF", "art. 586 do CPP"]);
  });

  it("não liga súmula vinculante", () => {
    expect(citacoesEm("Súmula Vinculante 11 do STF")).toEqual([]);
  });
});

describe("citacoesEm — vigência", () => {
  it("avisa artigo revogado mesmo sem data da prova", () => {
    const [c] = citacoesEm("Art. 214 do Código Penal");
    expect(c.planalto).toBe("https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848.htm#art214");
    expect(c.aviso).toContain("revogado pela Lei nº 12.015/2009");
  });

  it("avisa artigo alterado só quando a prova é anterior à alteração", () => {
    const antes = citacoesEm("art. 154-A do CP", "2017-09-17");
    expect(antes[0].aviso).toContain("alterado pela Lei nº 14.155/2021");
    const depois = citacoesEm("art. 154-A do CP", "2022-03-01");
    expect(depois[0].aviso).toBeUndefined();
  });

  it("sem data da prova não avisa artigo alterado", () => {
    const [c] = citacoesEm("art. 154-A do CP");
    expect(c.aviso).toBeUndefined();
  });

  it("aplica a vigência do parágrafo indicado", () => {
    const [c] = citacoesEm("art. 4º, § 16, da Lei 12.850/13", "2016-05-29");
    expect(c.planalto).toBe("https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12850.htm#art4");
    expect(c.aviso).toContain("alterado pela Lei nº 13.964/2019");
  });

  it("o parágrafo sem vigência cadastrada não herda o aviso do caput", () => {
    const [c] = citacoesEm("art. 4º, § 1º, da Lei 12.850/13", "2016-05-29");
    expect(c.aviso).toBeUndefined();
  });

  it("avisa parágrafo revogado da Lei 8.072", () => {
    const [c] = citacoesEm("artigo 2º, § 2º, da Lei 8.072/90");
    expect(c.aviso).toContain("revogado pela Lei nº 13.964/2019");
  });
});
