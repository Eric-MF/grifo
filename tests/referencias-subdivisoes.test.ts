import { describe, expect, it } from "vitest";
import { citacoesEm } from "../src/lib/leis/planalto.ts";
import { inicioPrefixo } from "../src/lib/leis/prefixo.ts";
import { trechos } from "../src/lib/leis/referencias.ts";

// texto com o link entre colchetes: confere o trecho ligado e o texto em volta de uma vez
const marcado = (t: ReturnType<typeof trechos>) => t.map((x) => (x.href ? `[${x.texto}]` : x.texto)).join("");

describe("trechos — subdivisões citadas antes do artigo entram no link", () => {
  it("'ns. I e II do art. 775 ou ordenará': o link cobre 'ns. I e II do art. 775'", () => {
    const texto = "a que se referem os ns. I e II do art. 775 ou ordenará";
    expect(marcado(trechos(texto, "cpp"))).toBe("a que se referem os [ns. I e II do art. 775] ou ordenará");
  });

  it("'inciso III do art. 5º' com 'nos termos do' antes", () => {
    expect(marcado(trechos("nos termos do inciso III do art. 5º", "cpp"))).toBe("nos termos do [inciso III do art. 5º]");
  });

  it("'incisos I e II do art. 109'", () => {
    expect(marcado(trechos("os incisos I e II do art. 109", "cpp"))).toBe("os [incisos I e II do art. 109]");
  });

  it("'§ 2º do art. 121'", () => {
    expect(marcado(trechos("o § 2º do art. 121", "cpp"))).toBe("o [§ 2º do art. 121]");
  });

  it("'§§ 1º e 2º do art. 383'", () => {
    expect(marcado(trechos("conforme §§ 1º e 2º do art. 383", "cpp"))).toBe("conforme [§§ 1º e 2º do art. 383]");
  });

  it("'§§ 2º, 3º, 4º e 5º do art. 384'", () => {
    expect(marcado(trechos("§§ 2º, 3º, 4º e 5º do art. 384", "cpp"))).toBe("[§§ 2º, 3º, 4º e 5º do art. 384]");
  });

  it("'parágrafo único do art. 10'", () => {
    expect(marcado(trechos("o parágrafo único do art. 10", "cpp"))).toBe("o [parágrafo único do art. 10]");
  });

  it("cadeia 'alínea a do inciso II do art. 5º' (com 'a' antes da alínea fora do link)", () => {
    expect(marcado(trechos("a alínea a do inciso II do art. 5º", "cpp"))).toBe("a [alínea a do inciso II do art. 5º]");
  });

  it("'caput do art. 1º'", () => {
    expect(marcado(trechos("o caput do art. 1º", "cpp"))).toBe("o [caput do art. 1º]");
  });

  it("cadeia 'inciso IV do caput do art. 3º' inteira", () => {
    expect(marcado(trechos("inciso IV do caput do art. 3º", "cpp"))).toBe("[inciso IV do caput do art. 3º]");
  });

  it("forma 'n. I' e 'nº I'; o 'no' de 'no II' (no inciso II) fica fora do link", () => {
    expect(marcado(trechos("o n. I do art. 5", "cpp"))).toBe("o [n. I do art. 5]");
    expect(marcado(trechos("conforme no I do art. 5", "cpp"))).toBe("conforme no [I do art. 5]");
    expect(marcado(trechos("e no II do art. 751 e no II do art. 752, o", "cpp"))).toBe("e no [II do art. 751] e no [II do art. 752], o");
    expect(marcado(trechos("conforme nº I do art. 5", "cpp"))).toBe("conforme [nº I do art. 5]");
  });

  it("forma 'inc. I' e 'incs. I e II'", () => {
    expect(marcado(trechos("o inc. I do art. 5", "cpp"))).toBe("o [inc. I do art. 5]");
    expect(marcado(trechos("os incs. I e II do art. 5", "cpp"))).toBe("os [incs. I e II do art. 5]");
  });

  it("parágrafo com sufixo '§ 1o-A'", () => {
    expect(marcado(trechos("o § 1o-A do art. 121", "cpp"))).toBe("o [§ 1o-A do art. 121]");
  });

  it("intervalo de incisos 'inciso I a III'", () => {
    expect(marcado(trechos("inciso I a III do art. 5", "cpp"))).toBe("[inciso I a III do art. 5]");
  });

  it("alíneas em lista 'alíneas a e b do inciso II do art. 5'", () => {
    expect(marcado(trechos("alíneas a e b do inciso II do art. 5", "cpp"))).toBe("[alíneas a e b do inciso II do art. 5]");
  });

  it("alínea entre aspas, curvas e retas", () => {
    expect(marcado(trechos("alínea “a” do inciso II do art. 5", "cpp"))).toBe("[alínea “a” do inciso II do art. 5]");
    expect(marcado(trechos('alínea "a" do inciso II do art. 5', "cpp"))).toBe('[alínea "a" do inciso II do art. 5]');
  });

  it("lista de artigos: o prefixo vai só para o primeiro item", () => {
    expect(marcado(trechos("inciso I do arts. 1o e 2o", "cpp"))).toBe("[inciso I do arts. 1o] e [2o]");
  });

  it("não estende sobre palavras que não são 'do/da/dos/das/no/na <próximo>'", () => {
    expect(marcado(trechos("o juiz, nos termos do art. 5", "cpp"))).toBe("o juiz, nos termos do [art. 5]");
    expect(marcado(trechos("prazo do art. 10", "cpp"))).toBe("prazo do [art. 10]");
    expect(marcado(trechos("inciso I, do art. 5", "cpp"))).toBe("inciso I, do [art. 5]");
    expect(marcado(trechos("o inciso I e o art. 5", "cpp"))).toBe("o inciso I e o [art. 5]");
    expect(marcado(trechos("inciso I do juiz do art. 5", "cpp"))).toBe("inciso I do juiz do [art. 5]");
  });

  it("artigo sem link (não encontrado) não é estendido", () => {
    const t = trechos("inciso I do art. 999", "cpp", undefined, () => false);
    expect(t).toEqual([
      { texto: "inciso I do " },
      { texto: "art. 999", href: undefined, planalto: undefined, lei: undefined, art: undefined, naoEncontrado: true },
    ]);
  });
});

describe("inicioPrefixo", () => {
  it("não começa antes do limite (fim do link anterior)", () => {
    const texto = "inciso I do art. 5";
    expect(inicioPrefixo(texto, 12)).toBe(0);
    expect(inicioPrefixo(texto, 12, 5)).toBe(12);
    expect(inicioPrefixo(texto, 12, 0)).toBe(0);
  });

  it("sem subdivisão, devolve o próprio índice", () => {
    expect(inicioPrefixo("prazo do art. 10", 9)).toBe(9);
  });
});

describe("citacoesEm — subdivisões citadas antes do artigo", () => {
  it("'inciso I do art. 386 do CPP' inteiro na citação", () => {
    const [c] = citacoesEm("Absolvição, nos termos do inciso I do art. 386 do CPP, segundo o texto.");
    expect(c.texto).toBe("inciso I do art. 386 do CPP");
    expect(c.url).toBe("/leis/cpp/#art386");
    expect(c.planalto).toBe("https://www.planalto.gov.br/ccivil_03/decreto-lei/del3689.htm#art386");
    expect(c.inicio).toBe("Absolvição, nos termos do ".length);
  });

  it("'§ 2º do art. 121 do CP' inteiro na citação", () => {
    const [c] = citacoesEm("Aplica-se o § 2º do art. 121 do CP.");
    expect(c.texto).toBe("§ 2º do art. 121 do CP");
    expect(c.planalto).toBe("https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848.htm#art121");
  });

  it("lista de subdivisões 'incisos I e II do art. 109 do CPP'", () => {
    const [c] = citacoesEm("os incisos I e II do art. 109 do CPP");
    expect(c.texto).toBe("incisos I e II do art. 109 do CPP");
  });

  it("sem subdivisão encadeada, a citação continua só 'art. N do X'", () => {
    const [c] = citacoesEm("o juiz, nos termos do art. 122 do CPP");
    expect(c.texto).toBe("art. 122 do CPP");
  });

  it("duas citações seguidas: cada uma com a sua subdivisão", () => {
    const achados = citacoesEm("inciso I do art. 386 do CPP e § 2º do art. 121 do CP");
    expect(achados.map((c) => c.texto)).toEqual(["inciso I do art. 386 do CPP", "§ 2º do art. 121 do CP"]);
  });
});
