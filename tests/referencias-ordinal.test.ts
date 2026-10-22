import { describe, expect, it } from "vitest";
import { trechos } from "../src/lib/leis/referencias.ts";

const linkados = (t: ReturnType<typeof trechos>) => t.filter((x) => x.href).map((x) => x.texto);

describe("sufixo ordinal do artigo não engole a palavra seguinte", () => {
  it("'art. 775 ou ordenará': o link é 'ns. I e II do art. 775' e o 'ou' fica de fora", () => {
    const texto = "a que se referem os ns. I e II do art. 775 ou ordenará";
    const t = trechos(texto, "cpp");
    expect(linkados(t)).toEqual(["ns. I e II do art. 775"]);
    expect(t.at(-1)?.texto).toBe(" ou ordenará");
    expect(t.map((x) => x.texto).join("")).toBe(texto);
  });

  it("'art. 5 o juiz': o 'o' do meio é artigo, não ordinal, e não entra no link", () => {
    const t = trechos("nos termos do art. 5 o juiz", "cpp");
    expect(linkados(t)).toEqual(["art. 5"]);
  });

  it("'art. 1o deste Código' liga 'art. 1o' (ordinal colado com o)", () => {
    const t = trechos("art. 1o deste Código", "cpp");
    expect(linkados(t)).toEqual(["art. 1o"]);
    expect(t[0]?.href).toBe("#art1");
  });

  it("'art. 1º deste Código' liga 'art. 1º' (ordinal com º)", () => {
    const t = trechos("art. 1º deste Código", "cpp");
    expect(linkados(t)).toEqual(["art. 1º"]);
    expect(t[0]?.href).toBe("#art1");
  });

  it("'art. 5 º deste Código' liga 'art. 5 º' (º depois de espaço)", () => {
    const t = trechos("art. 5 º deste Código", "cpp");
    expect(linkados(t)).toEqual(["art. 5 º"]);
  });

  it("'art. 10-A deste Código' liga 'art. 10-A' sem sobrar letra", () => {
    const t = trechos("art. 10-A deste Código", "cpp");
    expect(linkados(t)).toEqual(["art. 10-A"]);
  });

  it("'arts. 1o e 2o' liga os dois números", () => {
    const t = trechos("arts. 1o e 2o deste Código", "cpp");
    expect(linkados(t)).toEqual(["arts. 1o", "2o"]);
    expect(t.filter((x) => x.href).map((x) => x.href)).toEqual(["#art1", "#art2"]);
  });

  it("'arts. 1º e 2º' liga os dois números com º", () => {
    const t = trechos("arts. 1º e 2º deste Código", "cpp");
    expect(linkados(t)).toEqual(["arts. 1º", "2º"]);
  });
});
