import { describe, expect, it } from "vitest";
import { dispositivosDoSufixo } from "../src/lib/leis/prefixo.ts";
import { citacoesEm } from "../src/lib/leis/planalto.ts";
import { trechos } from "../src/lib/leis/referencias.ts";

describe("dispositivosDoSufixo — dispositivos citados depois do artigo", () => {
  it("inciso romano depois de vírgula, com e sem o ordinal", () => {
    expect(dispositivosDoSufixo(", XI, da Constituição", "art5")).toEqual(["art5.i11"]);
    expect(dispositivosDoSufixo("º, XI, da Constituição", "art5")).toEqual(["art5.i11"]);
  });

  it("parágrafo e inciso, nessa ordem", () => {
    expect(dispositivosDoSufixo(", § 2º, IV, do Código Penal", "art121")).toEqual(["art121.p2.i4"]);
  });

  it("parágrafo sem inciso, com e sem vírgula antes do 'do'", () => {
    expect(dispositivosDoSufixo(", § 2º, do CP", "art121")).toEqual(["art121.p2"]);
    expect(dispositivosDoSufixo(" § 2º do CP", "art121")).toEqual(["art121.p2"]);
  });

  it("parágrafo único", () => {
    expect(dispositivosDoSufixo(", parágrafo único, do CPP", "art10")).toEqual(["art10.pu"]);
    expect(dispositivosDoSufixo(", par. único", "art10")).toEqual(["art10.pu"]);
  });

  it("inciso com a palavra 'inciso' (singular, plural e lista)", () => {
    expect(dispositivosDoSufixo(", inciso III, do CPP", "art386")).toEqual(["art386.i3"]);
    expect(dispositivosDoSufixo(", incisos I e II, do CPP", "art386")).toEqual(["art386.i1", "art386.i2"]);
  });

  it("lista de incisos, inclusive intervalo com 'a'", () => {
    expect(dispositivosDoSufixo(", I e II, do", "art386")).toEqual(["art386.i1", "art386.i2"]);
    expect(dispositivosDoSufixo(", I a III", "art386")).toEqual(["art386.i1", "art386.i2", "art386.i3"]);
  });

  it("alínea entre aspas ou com a palavra, depois do inciso", () => {
    expect(dispositivosDoSufixo(", III, 'a', do", "art5")).toEqual(["art5.i3.aa"]);
    expect(dispositivosDoSufixo(", III, “a”", "art5")).toEqual(["art5.i3.aa"]);
    expect(dispositivosDoSufixo(", III, alínea a", "art5")).toEqual(["art5.i3.aa"]);
  });

  it("parágrafo com letra e lista de parágrafos", () => {
    expect(dispositivosDoSufixo(", § 1º-A", "art121")).toEqual(["art121.p1-a"]);
    expect(dispositivosDoSufixo(", §§ 1º e 2º", "art121")).toEqual(["art121.p1", "art121.p2"]);
  });

  it("caput, número de artigo e texto sem dispositivo: []", () => {
    expect(dispositivosDoSufixo(", caput, do CPP", "art1")).toEqual([]);
    expect(dispositivosDoSufixo(" do CP", "art121")).toEqual([]);
    expect(dispositivosDoSufixo(", 34 e 35", "art33")).toEqual([]);
    expect(dispositivosDoSufixo(", e", "art5")).toEqual([]);
    expect(dispositivosDoSufixo("", "art5")).toEqual([]);
  });

  it("romano minúsculo ou fora de vírgula não vale como inciso sem a palavra", () => {
    expect(dispositivosDoSufixo(", xi, do CP", "art5")).toEqual([]);
    expect(dispositivosDoSufixo(" XI do CP", "art5")).toEqual([]);
    expect(dispositivosDoSufixo(", civil, do CP", "art5")).toEqual([]);
  });

  it("ordem fora do previsto (inciso antes do parágrafo): []", () => {
    expect(dispositivosDoSufixo(", IV, § 2º, do CP", "art121")).toEqual([]);
  });

  it("'§' e 'inciso' no singular são um só item: o número seguinte é outro artigo da lista", () => {
    // CF, art. 37, XV: "nos arts. 39, § 4º, 150, II, 153, III, e 153, § 2º, I"
    expect(dispositivosDoSufixo(", § 4º, 150, II, 153, III, e 153, § 2º, I", "art39")).toEqual(["art39.p4"]);
    expect(dispositivosDoSufixo(", inciso I, 150", "art5")).toEqual(["art5.i1"]);
    expect(dispositivosDoSufixo(", incisos I e II, do CPP", "art386")).toEqual(["art386.i1", "art386.i2"]);
  });
});

describe("citacoesEm — disps nas citações do leitor", () => {
  it("dispositivo depois do artigo", () => {
    expect(citacoesEm("conforme o art. 581, IV, do CPP")[0]!.disps).toEqual(["art581.i4"]);
  });

  it("dispositivo antes do artigo", () => {
    expect(citacoesEm("nos termos do inciso I do art. 386 do CPP")[0]!.disps).toEqual(["art386.i1"]);
  });

  it("sem dispositivo, o campo não aparece", () => {
    expect(citacoesEm("conforme o art. 5 do CPP")[0]).not.toHaveProperty("disps");
  });
});

describe("trechos — disps quando o dispositivo vem depois do artigo", () => {
  it("'art. 5º, XI, da Constituição' liga o artigo e marca o inciso", () => {
    const ligado = trechos("nos termos do art. 5º, XI, da Constituição", "cpp").find((x) => x.href);
    expect(ligado?.texto).toBe("art. 5º");
    expect(ligado?.disps).toEqual(["art5.i11"]);
  });
});
