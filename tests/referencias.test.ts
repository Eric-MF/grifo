import { describe, expect, it } from "vitest";
import { trechos } from "../src/lib/leis/referencias.ts";

const links = (texto: string, atual: string) => trechos(texto, atual).filter((t) => t.href).map((t) => [t.texto, t.href, t.planalto]);

describe("referências no texto da lei", () => {
  it("artigo sem diploma é do próprio diploma: âncora interna", () => {
    expect(links("na forma do art. 59 e do art. 154-A", "cp")).toEqual([
      ["art. 59", "#art59", "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848.htm#art59"],
      ["art. 154-A", "#art154-a", "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848.htm#art154a"],
    ]);
  });

  it("artigo de outra lei que está no leitor vira link para a página dela", () => {
    expect(links("previsto no art. 33 da Lei nº 11.343, de 23 de agosto de 2006", "cpp")[0]).toEqual([
      "art. 33",
      "/leis/lei-11343/#art33",
      "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11343.htm#art33",
    ]);
    expect(links("o art. 1º do Decreto-Lei nº 2.848, de 7 de dezembro de 1940", "cpp")[0][1]).toBe("/leis/cp/#art1");
  });

  it("'deste Código' fica no próprio diploma", () => {
    expect(links("as penas do art. 121 deste Código", "cp")[0][1]).toBe("#art121");
  });

  it("lei solta que está no leitor ganha link; desconhecida, não", () => {
    expect(links("nos termos da Lei nº 8.072, de 25 de julho de 1990", "cp")[0][1]).toBe("/leis/lei-8072/");
    expect(links("nos termos da Lei nº 99.999", "cp")).toEqual([]);
  });

  it("o texto inteiro se mantém", () => {
    const t = "Art. 1º Não há crime sem lei anterior que o defina, conforme o art. 5º da Constituição.";
    expect(trechos(t, "cp").map((x) => x.texto).join("")).toBe(t);
  });
});

describe("rótulo do bloco", () => {
  it("o 'Art. 121' do início não vira link para si mesmo", () => {
    expect(trechos("Art. 121. Matar alguém, salvo o disposto no art. 128", "cp", "Art. 121").filter((t) => t.href).map((t) => t.texto)).toEqual(["art. 128"]);
  });
});

describe("listas de artigos", () => {
  it("'arts. 38 e 39 deste Código' liga os dois", () => {
    expect(links("nos arts. 38 e 39 deste Código", "cp").map((l) => [l[0], l[1]])).toEqual([
      ["arts. 38", "#art38"],
      ["39", "#art39"],
    ]);
  });
  it("lista com vírgulas e diploma no fim", () => {
    expect(links("os arts. 33, 34 e 35 da Lei nº 11.343, de 2006", "cpp").map((l) => l[1])).toEqual([
      "/leis/lei-11343/#art33",
      "/leis/lei-11343/#art34",
      "/leis/lei-11343/#art35",
      "/leis/lei-11343/",
    ]);
  });
  it("não confunde quantidades com artigos", () => {
    expect(links("o art. 5º e 2 (dois) anos de pena", "cp").map((l) => l[0])).toEqual(["art. 5º"]);
    expect(links("art. 121 e 5 dias", "cp").map((l) => l[0])).toEqual(["art. 121"]);
  });
});
