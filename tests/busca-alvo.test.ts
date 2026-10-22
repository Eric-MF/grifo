import { describe, expect, it } from "vitest";
import { alvoDigitado, artigoDigitado, leiDigitada } from "../src/lib/leis/busca.ts";

describe("alvoDigitado — o que a busca rápida lê como referência a artigo", () => {
  it("só o artigo", () => {
    expect(alvoDigitado("121")).toEqual({ art: "art121" });
    expect(alvoDigitado("art. 121")).toEqual({ art: "art121" });
    expect(alvoDigitado("Art 155-A")).toEqual({ art: "art155-a" });
    expect(alvoDigitado("5º")).toEqual({ art: "art5" });
    expect(alvoDigitado("155a")).toEqual({ art: "art155-a" });
    expect(alvoDigitado("1.072")).toEqual({ art: "art1072" });
    expect(alvoDigitado("121 caput")).toEqual({ art: "art121" });
  });

  it("inciso em romano, com ou sem a palavra", () => {
    expect(alvoDigitado("5 XI")).toEqual({ art: "art5", disp: "art5.i11" });
    expect(alvoDigitado("5, xi")).toEqual({ art: "art5", disp: "art5.i11" });
    expect(alvoDigitado("5º, LXIII")).toEqual({ art: "art5", disp: "art5.i63" });
    expect(alvoDigitado("5 inc. XI")).toEqual({ art: "art5", disp: "art5.i11" });
    expect(alvoDigitado("5 inciso V-A")).toEqual({ art: "art5", disp: "art5.i5-a" });
  });

  it("parágrafo, com ou sem inciso depois", () => {
    expect(alvoDigitado("121 § 2")).toEqual({ art: "art121", disp: "art121.p2" });
    expect(alvoDigitado("121 §2º IV")).toEqual({ art: "art121", disp: "art121.p2.i4" });
    expect(alvoDigitado("81 § 1º, II")).toEqual({ art: "art81", disp: "art81.p1.i2" });
    expect(alvoDigitado("121 § 2º-A")).toEqual({ art: "art121", disp: "art121.p2-a" });
    expect(alvoDigitado("121 par. 2")).toEqual({ art: "art121", disp: "art121.p2" });
    expect(alvoDigitado("121 parágrafo 2")).toEqual({ art: "art121", disp: "art121.p2" });
  });

  it("parágrafo único", () => {
    expect(alvoDigitado("10 pu")).toEqual({ art: "art10", disp: "art10.pu" });
    expect(alvoDigitado("10 parágrafo único")).toEqual({ art: "art10", disp: "art10.pu" });
    expect(alvoDigitado("10 p.u.")).toEqual({ art: "art10", disp: "art10.pu" });
  });

  it("alínea depois de inciso, sem a palavra ou entre aspas", () => {
    expect(alvoDigitado("5 XXVIII a")).toEqual({ art: "art5", disp: "art5.i28.aa" });
    expect(alvoDigitado("5, XXVIII, 'a'")).toEqual({ art: "art5", disp: "art5.i28.aa" });
  });

  it("alínea direto no artigo só com a palavra", () => {
    expect(alvoDigitado("5 alínea b")).toEqual({ art: "art5", disp: "art5.ab" });
  });

  it("inciso em algarismo arábico, com i, inc. ou inciso", () => {
    expect(alvoDigitado("5 i38")).toEqual({ art: "art5", disp: "art5.i38" });
    expect(alvoDigitado("5 I38")).toEqual({ art: "art5", disp: "art5.i38" });
    expect(alvoDigitado("5 i 38")).toEqual({ art: "art5", disp: "art5.i38" });
    expect(alvoDigitado("5 inc 38")).toEqual({ art: "art5", disp: "art5.i38" });
    expect(alvoDigitado("5 inc. 38")).toEqual({ art: "art5", disp: "art5.i38" });
    expect(alvoDigitado("5 inciso 38")).toEqual({ art: "art5", disp: "art5.i38" });
    expect(alvoDigitado("5 i5-a")).toEqual({ art: "art5", disp: "art5.i5-a" });
  });

  it("parágrafo com p ou p., em algarismo", () => {
    expect(alvoDigitado("5 p38")).toEqual({ art: "art5", disp: "art5.p38" });
    expect(alvoDigitado("5 P38")).toEqual({ art: "art5", disp: "art5.p38" });
    expect(alvoDigitado("5 p 2")).toEqual({ art: "art5", disp: "art5.p2" });
    expect(alvoDigitado("5 p.2")).toEqual({ art: "art5", disp: "art5.p2" });
    expect(alvoDigitado("121 p2-a")).toEqual({ art: "art121", disp: "art121.p2-a" });
  });

  it("parágrafo e inciso em algarismo, na ordem parágrafo → inciso → alínea", () => {
    expect(alvoDigitado("121 p2 i4")).toEqual({ art: "art121", disp: "art121.p2.i4" });
    expect(alvoDigitado("5 i38 a")).toEqual({ art: "art5", disp: "art5.i38.aa" });
  });

  it("regressões: parágrafo único, inciso romano e alínea continuam iguais", () => {
    expect(alvoDigitado("10 pu")).toEqual({ art: "art10", disp: "art10.pu" });
    expect(alvoDigitado("10 p.u.")).toEqual({ art: "art10", disp: "art10.pu" });
    expect(alvoDigitado("5 i")).toEqual({ art: "art5", disp: "art5.i1" });
    expect(alvoDigitado("5 iv")).toEqual({ art: "art5", disp: "art5.i4" });
    expect(alvoDigitado("5 a")).toBeNull();
    expect(alvoDigitado("5 civil")).toBeNull();
  });

  it("negativos: null quando não é só referência a artigo", () => {
    expect(alvoDigitado("furto")).toBeNull();
    expect(alvoDigitado("5 civil")).toBeNull();
    expect(alvoDigitado("121 homicídio")).toBeNull();
    expect(alvoDigitado("art. 5 da CF")).toBeNull();
    expect(alvoDigitado("")).toBeNull();
    expect(alvoDigitado("5 a")).toBeNull();
    expect(alvoDigitado("5 'a'")).toBeNull();
  });
});

describe("artigoDigitado — continua dando o id do artigo", () => {
  it("usa o artigo do alvo, também com inciso", () => {
    expect(artigoDigitado("5 XI")).toBe("art5");
    expect(artigoDigitado("furto")).toBeNull();
  });
});

describe("leiDigitada — a lei digitada junto do número", () => {
  it("lei no fim da consulta, com ou sem espaço e conectores", () => {
    expect(leiDigitada("100 cp")).toEqual({ lei: "cp", resto: "100" });
    expect(leiDigitada("100cp")).toEqual({ lei: "cp", resto: "100" });
    expect(leiDigitada("art. 100 do CP")).toEqual({ lei: "cp", resto: "art. 100" });
    expect(leiDigitada("art. 100, CP")).toEqual({ lei: "cp", resto: "art. 100" });
    expect(leiDigitada("5 XI CF")).toEqual({ lei: "cf", resto: "5 xi" });
    expect(leiDigitada("121 código penal")).toEqual({ lei: "cp", resto: "121" });
    expect(leiDigitada("33 lei de drogas")).toEqual({ lei: "lei-11343", resto: "33" });
    expect(leiDigitada("art. 33 da Lei de Drogas")).toEqual({ lei: "lei-11343", resto: "art. 33" });
  });

  it("lei no começo da consulta", () => {
    expect(leiDigitada("cp 100")).toEqual({ lei: "cp", resto: "100" });
    expect(leiDigitada("cp, art. 100")).toEqual({ lei: "cp", resto: "art. 100" });
    expect(leiDigitada("código penal 121")).toEqual({ lei: "cp", resto: "121" });
    expect(leiDigitada("lei 11343 art 33")).toEqual({ lei: "lei-11343", resto: "art 33" });
  });

  it("alias de lei que é prefixo ou sufixo de outro: cpp não é cp + p", () => {
    expect(leiDigitada("100 cpp")?.lei).toBe("cpp");
    expect(leiDigitada("100 cpp")).toEqual({ lei: "cpp", resto: "100" });
    expect(leiDigitada("cpp 100")?.lei).toBe("cpp");
  });

  it("número da lei com ponto, nº e ano", () => {
    expect(leiDigitada("art. 33 da Lei nº 11.343/2006")).toEqual({ lei: "lei-11343", resto: "art. 33" });
    expect(leiDigitada("33 lei 11.343")?.lei).toBe("lei-11343");
    expect(leiDigitada("lei 11.343/06 art 33")).toEqual({ lei: "lei-11343", resto: "art 33" });
  });

  it("o resto é uma referência a artigo válida, com inciso e parágrafo", () => {
    expect(alvoDigitado(leiDigitada("121 § 2º IV cp")!.resto)).toEqual({ art: "art121", disp: "art121.p2.i4" });
    expect(alvoDigitado(leiDigitada("5 i38 cf")!.resto)).toEqual({ art: "art5", disp: "art5.i38" });
  });

  it("negativos: null quando não há lei, não há artigo ou a lei não está no leitor", () => {
    expect(leiDigitada("100")).toBeNull();
    expect(leiDigitada("cp")).toBeNull();
    expect(leiDigitada("furto cp")).toBeNull();
    expect(leiDigitada("5 a cp")).toBeNull();
    expect(leiDigitada("121 lcp")).toBeNull();
    expect(leiDigitada("")).toBeNull();
  });
});

describe("alvoDigitado — parágrafo ou inciso colado no número (sem espaço)", () => {
  it("5p35 é parágrafo, não a letra p do artigo", () => {
    expect(alvoDigitado("5p35")).toEqual({ art: "art5", disp: "art5.p35" });
  });

  it("5i38 é inciso em algarismo arábico", () => {
    expect(alvoDigitado("5i38")).toEqual({ art: "art5", disp: "art5.i38" });
  });

  it("121p2 é parágrafo 2 do art. 121", () => {
    expect(alvoDigitado("121p2")).toEqual({ art: "art121", disp: "art121.p2" });
  });

  it("a letra do artigo continua valendo quando não vem seguida de dígito", () => {
    expect(alvoDigitado("155a")).toEqual({ art: "art155-a" });
    expect(alvoDigitado("155-A")).toEqual({ art: "art155-a" });
    expect(alvoDigitado("Art 155-A")).toEqual({ art: "art155-a" });
  });
});
