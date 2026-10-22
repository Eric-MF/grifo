import { describe, expect, it } from "vitest";
import { dispositivosDoPrefixo } from "../src/lib/leis/prefixo.ts";
import { trechos } from "../src/lib/leis/referencias.ts";

describe("dispositivosDoPrefixo — dispositivos nomeados antes do artigo", () => {
  it("ns. I e II do art. 775", () => {
    expect(dispositivosDoPrefixo("ns. I e II do ", "art775")).toEqual(["art775.i1", "art775.i2"]);
  });

  it("inciso XI do art. 5º", () => {
    expect(dispositivosDoPrefixo("inciso XI do ", "art5")).toEqual(["art5.i11"]);
  });

  it("§ 2º do art. 121", () => {
    expect(dispositivosDoPrefixo("§ 2º do ", "art121")).toEqual(["art121.p2"]);
  });

  it("parágrafo único do art. 10", () => {
    expect(dispositivosDoPrefixo("parágrafo único do ", "art10")).toEqual(["art10.pu"]);
  });

  it("alínea a do inciso II do art. 5º", () => {
    expect(dispositivosDoPrefixo("alínea a do inciso II do ", "art5")).toEqual(["art5.i2.aa"]);
  });

  it("inciso II do § 1º do art. 81", () => {
    expect(dispositivosDoPrefixo("inciso II do § 1º do ", "art81")).toEqual(["art81.p1.i2"]);
  });

  it("incisos I a III do art. 9º (intervalo)", () => {
    expect(dispositivosDoPrefixo("incisos I a III do ", "art9")).toEqual(["art9.i1", "art9.i2", "art9.i3"]);
  });

  it("§§ 1º e 2º do art. 383", () => {
    expect(dispositivosDoPrefixo("§§ 1º e 2º do ", "art383")).toEqual(["art383.p1", "art383.p2"]);
  });

  it("inciso IV do caput do art. 3º (o caput é ignorado)", () => {
    expect(dispositivosDoPrefixo("inciso IV do caput do ", "art3")).toEqual(["art3.i4"]);
  });

  it("caput do art. 1º: nenhum dispositivo extra", () => {
    expect(dispositivosDoPrefixo("caput do ", "art1")).toEqual([]);
  });

  it("II do art. 751 (inciso só pelo número)", () => {
    expect(dispositivosDoPrefixo("II do ", "art751")).toEqual(["art751.i2"]);
  });

  it("§ 1º-A do art. 7º (parágrafo com letra)", () => {
    expect(dispositivosDoPrefixo("§ 1º-A do ", "art7")).toEqual(["art7.p1-a"]);
  });

  it("alíneas a e b do inciso I do art. 4º (produto cartesiano com a lista interna)", () => {
    expect(dispositivosDoPrefixo("alíneas a e b do inciso I do ", "art4")).toEqual(["art4.i1.aa", "art4.i1.ab"]);
  });

  it("inciso com letra 'III-A' (sufixo em minúscula)", () => {
    expect(dispositivosDoPrefixo("inciso III-A do ", "art5")).toEqual(["art5.i3-a"]);
  });

  it("alínea entre aspas e com 'ou'", () => {
    expect(dispositivosDoPrefixo("alíneas “a” ou “c” do inciso II do ", "art5")).toEqual(["art5.i2.aa", "art5.i2.ac"]);
  });

  it("alínea direto no artigo (sem inciso nem parágrafo)", () => {
    expect(dispositivosDoPrefixo("alínea b do ", "art5")).toEqual(["art5.ab"]);
  });

  it("nº I e n. II no lugar de 'inciso'", () => {
    expect(dispositivosDoPrefixo("nº I do ", "art5")).toEqual(["art5.i1"]);
    expect(dispositivosDoPrefixo("n. II do ", "art5")).toEqual(["art5.i2"]);
  });

  it("nada legível: []", () => {
    expect(dispositivosDoPrefixo("", "art5")).toEqual([]);
    expect(dispositivosDoPrefixo("o juiz do ", "art5")).toEqual([]);
  });

  it("cadeia impossível (parágrafo dentro de inciso): []", () => {
    expect(dispositivosDoPrefixo("§ 1º do inciso I do ", "art5")).toEqual([]);
  });

  it("intervalo grande é cortado em 30 itens", () => {
    const ids = dispositivosDoPrefixo("incisos I a XL do ", "art5");
    expect(ids).toHaveLength(30);
    expect(ids[0]).toBe("art5.i1");
    expect(ids[29]).toBe("art5.i30");
  });
});

describe("trechos — campo disps no link com subdivisão antes do artigo", () => {
  it("'os ns. I e II do art. 775 ou': disps com os dois incisos", () => {
    const t = trechos("os ns. I e II do art. 775 ou ordenará", "cpp");
    const ligado = t.find((x) => x.href);
    expect(ligado?.texto).toBe("ns. I e II do art. 775");
    expect(ligado?.lei).toBe("cpp");
    expect(ligado?.art).toBe("art775");
    expect(ligado?.disps).toEqual(["art775.i1", "art775.i2"]);
  });

  it("'inciso III do art. 5º' com 'nos termos do' antes", () => {
    const ligado = trechos("nos termos do inciso III do art. 5º", "cpp").find((x) => x.href);
    expect(ligado?.disps).toEqual(["art5.i3"]);
  });

  it("'conforme o art. 5': sem disps", () => {
    const ligado = trechos("conforme o art. 5", "cpp").find((x) => x.href);
    expect(ligado?.texto).toBe("art. 5");
    expect(ligado?.disps).toBeUndefined();
  });
});
