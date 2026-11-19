import { describe, expect, it } from "vitest";
import {
  fracaoPorExtenso,
  numeroDePalavras,
  ordinalPorExtenso,
  porExtenso,
  romanoParaNumero,
} from "../src/lib/fala/extenso.ts";

describe("porExtenso", () => {
  it("números pequenos", () => {
    expect(porExtenso(0)).toBe("zero");
    expect(porExtenso(1)).toBe("um");
    expect(porExtenso(2)).toBe("dois");
    expect(porExtenso(9)).toBe("nove");
    expect(porExtenso(10)).toBe("dez");
    expect(porExtenso(14)).toBe("catorze");
    expect(porExtenso(16)).toBe("dezesseis");
    expect(porExtenso(19)).toBe("dezenove");
    expect(porExtenso(20)).toBe("vinte");
    expect(porExtenso(90)).toBe("noventa");
  });

  it("centenas e a ligação com e", () => {
    expect(porExtenso(100)).toBe("cem");
    expect(porExtenso(101)).toBe("cento e um");
    expect(porExtenso(121)).toBe("cento e vinte e um");
    expect(porExtenso(200)).toBe("duzentos");
    expect(porExtenso(305)).toBe("trezentos e cinco");
    expect(porExtenso(900)).toBe("novecentos");
    expect(porExtenso(999)).toBe("novecentos e noventa e nove");
  });

  it("feminino: um/dois e as centenas", () => {
    expect(porExtenso(1, "f")).toBe("uma");
    expect(porExtenso(2, "f")).toBe("duas");
    expect(porExtenso(21, "f")).toBe("vinte e uma");
    expect(porExtenso(200, "f")).toBe("duzentas");
    expect(porExtenso(900, "f")).toBe("novecentas");
    expect(porExtenso(102, "f")).toBe("cento e duas");
  });

  it("mil", () => {
    expect(porExtenso(1000)).toBe("mil");
    expect(porExtenso(1001)).toBe("mil e um");
    expect(porExtenso(1010)).toBe("mil e dez");
    expect(porExtenso(1020)).toBe("mil e vinte");
    expect(porExtenso(1100)).toBe("mil e cem");
    expect(porExtenso(1200)).toBe("mil e duzentos");
    expect(porExtenso(1230)).toBe("mil duzentos e trinta");
    expect(porExtenso(2000)).toBe("dois mil");
    expect(porExtenso(2019)).toBe("dois mil e dezenove");
    expect(porExtenso(8072)).toBe("oito mil e setenta e dois");
    expect(porExtenso(13964)).toBe("treze mil novecentos e sessenta e quatro");
  });

  it("mil no feminino", () => {
    expect(porExtenso(2000, "f")).toBe("duas mil");
    expect(porExtenso(1002, "f")).toBe("mil e duas");
    expect(porExtenso(1001, "f")).toBe("mil e uma");
  });

  it("milhões e bilhões", () => {
    expect(porExtenso(1000000)).toBe("um milhão");
    expect(porExtenso(2000000)).toBe("dois milhões");
    expect(porExtenso(1000001)).toBe("um milhão e um");
    expect(porExtenso(1500000)).toBe("um milhão e quinhentos mil");
    expect(porExtenso(2350000)).toBe("dois milhões trezentos e cinquenta mil");
    expect(porExtenso(1000000000)).toBe("um bilhão");
    expect(porExtenso(3000000000)).toBe("três bilhões");
    expect(porExtenso(999999999999)).toBe(
      "novecentos e noventa e nove bilhões novecentos e noventa e nove milhões novecentos e noventa e nove mil novecentos e noventa e nove",
    );
  });

  it("milhões e bilhões ficam no masculino, o resto segue o gênero", () => {
    expect(porExtenso(2000002, "f")).toBe("dois milhões e duas");
    expect(porExtenso(2000000, "f")).toBe("dois milhões");
  });

  it("fora do limite, ou não inteiro, devolve os algarismos", () => {
    expect(porExtenso(-5)).toBe("-5");
    expect(porExtenso(1.5)).toBe("1.5");
    expect(porExtenso(1000000000000)).toBe("1000000000000");
    expect(porExtenso(Number.NaN)).toBe("NaN");
  });
});

describe("ordinalPorExtenso", () => {
  it("unidades, dezenas e centenas", () => {
    expect(ordinalPorExtenso(1)).toBe("primeiro");
    expect(ordinalPorExtenso(7)).toBe("sétimo");
    expect(ordinalPorExtenso(10)).toBe("décimo");
    expect(ordinalPorExtenso(20)).toBe("vigésimo");
    expect(ordinalPorExtenso(100)).toBe("centésimo");
    expect(ordinalPorExtenso(900)).toBe("nongentésimo");
  });

  it("compostos separados por espaço, sem e", () => {
    expect(ordinalPorExtenso(11)).toBe("décimo primeiro");
    expect(ordinalPorExtenso(21)).toBe("vigésimo primeiro");
    expect(ordinalPorExtenso(110)).toBe("centésimo décimo");
    expect(ordinalPorExtenso(999)).toBe("nongentésimo nonagésimo nono");
  });

  it("feminino", () => {
    expect(ordinalPorExtenso(2, "f")).toBe("segunda");
    expect(ordinalPorExtenso(21, "f")).toBe("vigésima primeira");
    expect(ordinalPorExtenso(7, "f")).toBe("sétima");
  });

  it("fora de 1 a 999, vale porExtenso", () => {
    expect(ordinalPorExtenso(0)).toBe("zero");
    expect(ordinalPorExtenso(1000)).toBe("mil");
    expect(ordinalPorExtenso(-1)).toBe("-1");
  });
});

describe("romanoParaNumero", () => {
  it("romanos canônicos, em maiúsculas e minúsculas", () => {
    expect(romanoParaNumero("IV")).toBe(4);
    expect(romanoParaNumero("iv")).toBe(4);
    expect(romanoParaNumero("xiv")).toBe(14);
    expect(romanoParaNumero("LXXVIII")).toBe(78);
    expect(romanoParaNumero("MCMXC")).toBe(1990);
    expect(romanoParaNumero("MMMCMXCIX")).toBe(3999);
    expect(romanoParaNumero("I")).toBe(1);
  });

  it("inválidos devolvem null", () => {
    expect(romanoParaNumero("IIII")).toBeNull();
    expect(romanoParaNumero("IC")).toBeNull();
    expect(romanoParaNumero("VX")).toBeNull();
    expect(romanoParaNumero("")).toBeNull();
    expect(romanoParaNumero("ABC")).toBeNull();
    expect(romanoParaNumero("MMMM")).toBeNull();
  });
});

describe("fracaoPorExtenso", () => {
  it("nomes próprios e plural", () => {
    expect(fracaoPorExtenso(1, 2)).toBe("um meio");
    expect(fracaoPorExtenso(2, 2)).toBe("dois meios");
    expect(fracaoPorExtenso(1, 3)).toBe("um terço");
    expect(fracaoPorExtenso(2, 3)).toBe("dois terços");
    expect(fracaoPorExtenso(3, 4)).toBe("três quartos");
    expect(fracaoPorExtenso(1, 10)).toBe("um décimo");
    expect(fracaoPorExtenso(1, 100)).toBe("um centésimo");
    expect(fracaoPorExtenso(1, 1000)).toBe("um milésimo");
  });

  it("os outros denominadores usam avos", () => {
    expect(fracaoPorExtenso(5, 11)).toBe("cinco onze avos");
    expect(fracaoPorExtenso(1, 12)).toBe("um doze avos");
  });

  it("fora do esperado, devolve n/d", () => {
    expect(fracaoPorExtenso(1, 1)).toBe("1/1");
    expect(fracaoPorExtenso(0, 3)).toBe("0/3");
  });
});

describe("numeroDePalavras", () => {
  it("só algarismos, com ponto de milhar e sufixo ordinal", () => {
    expect(numeroDePalavras("121")).toBe(121);
    expect(numeroDePalavras("1.000")).toBe(1000);
    expect(numeroDePalavras("1.000.000")).toBe(1000000);
    expect(numeroDePalavras("5º")).toBe(5);
    expect(numeroDePalavras("1o")).toBe(1);
    expect(numeroDePalavras("3ª")).toBe(3);
    expect(numeroDePalavras("2°")).toBe(2);
    expect(numeroDePalavras("12.34")).toBeNull();
  });

  it("cardinais", () => {
    expect(numeroDePalavras("um")).toBe(1);
    expect(numeroDePalavras("uma")).toBe(1);
    expect(numeroDePalavras("dois")).toBe(2);
    expect(numeroDePalavras("duas")).toBe(2);
    expect(numeroDePalavras("três")).toBe(3);
    expect(numeroDePalavras("tres")).toBe(3);
    expect(numeroDePalavras("catorze")).toBe(14);
    expect(numeroDePalavras("quatorze")).toBe(14);
    expect(numeroDePalavras("dezesseis")).toBe(16);
    expect(numeroDePalavras("dezasseis")).toBe(16);
    expect(numeroDePalavras("zero")).toBe(0);
    expect(numeroDePalavras("cem")).toBe(100);
    expect(numeroDePalavras("cento e um")).toBe(101);
    expect(numeroDePalavras("cento e vinte e um")).toBe(121);
    expect(numeroDePalavras("trezentos e cinco")).toBe(305);
    expect(numeroDePalavras("mil")).toBe(1000);
    expect(numeroDePalavras("mil e um")).toBe(1001);
    expect(numeroDePalavras("dois mil e vinte e três")).toBe(2023);
    expect(numeroDePalavras("um milhão")).toBe(1000000);
  });

  it("ignora maiúsculas, acentos, espaços nas pontas e o e", () => {
    expect(numeroDePalavras("  CENTO E VINTE E UM  ")).toBe(121);
    expect(numeroDePalavras("cento vinte um")).toBe(121);
    expect(numeroDePalavras("Trezentos Cinco")).toBe(305);
  });

  it("ordinais", () => {
    expect(numeroDePalavras("primeiro")).toBe(1);
    expect(numeroDePalavras("primeira")).toBe(1);
    expect(numeroDePalavras("quinto")).toBe(5);
    expect(numeroDePalavras("décimo quinto")).toBe(15);
    expect(numeroDePalavras("vigésimo primeiro")).toBe(21);
    expect(numeroDePalavras("centésimo")).toBe(100);
    expect(numeroDePalavras("vigésima primeira")).toBe(21);
    expect(numeroDePalavras("milésimo")).toBe(1000);
  });

  it("o que não é número devolve null", () => {
    expect(numeroDePalavras("")).toBeNull();
    expect(numeroDePalavras("   ")).toBeNull();
    expect(numeroDePalavras("artigo")).toBeNull();
    expect(numeroDePalavras("cento e banana")).toBeNull();
    expect(numeroDePalavras("e")).toBeNull();
    expect(numeroDePalavras("cento")).toBeNull();
    expect(numeroDePalavras("um dois")).toBeNull();
    expect(numeroDePalavras("cinco três")).toBeNull();
    expect(numeroDePalavras("um vinte")).toBeNull();
    expect(numeroDePalavras("dez cinco")).toBeNull();
    expect(numeroDePalavras("mil milhão")).toBeNull();
    expect(numeroDePalavras("zero mil")).toBeNull();
    expect(numeroDePalavras("cem e um")).toBeNull();
    expect(numeroDePalavras("décimo dois")).toBeNull();
    expect(numeroDePalavras("12 mil")).toBeNull();
  });

  it("ida e volta com porExtenso e ordinalPorExtenso", () => {
    const falhas: string[] = [];
    for (let n = 0; n <= 2100; n++) {
      const ida = numeroDePalavras(porExtenso(n));
      if (ida !== n) falhas.push(`${n} -> "${porExtenso(n)}" -> ${ida}`);
    }
    for (const n of [13964, 1500000, 2350000]) {
      const ida = numeroDePalavras(porExtenso(n));
      if (ida !== n) falhas.push(`${n} -> "${porExtenso(n)}" -> ${ida}`);
    }
    expect(falhas).toEqual([]);
  });

  it("ida e volta dos ordinais de 1 a 999", () => {
    const falhas: string[] = [];
    for (let n = 1; n <= 999; n++) {
      const ida = numeroDePalavras(ordinalPorExtenso(n));
      if (ida !== n) falhas.push(`${n} -> "${ordinalPorExtenso(n)}" -> ${ida}`);
    }
    expect(falhas).toEqual([]);
  });
});
