import { describe, expect, it } from "vitest";
import { PADROES, code128B, codigoDaFolha, modulosCode128, numeroDoCanto, numeroDoDownload } from "../src/lib/folha/codigos.ts";

const soma = (xs: number[]) => xs.reduce((t, x) => t + x, 0);
const PARADA = [2, 3, 3, 1, 1, 1, 2];
const INICIO_B = [2, 1, 1, 2, 1, 4];

describe("tabela Code 128", () => {
  it("cada padrão soma 11 módulos e não há dois iguais", () => {
    for (const p of PADROES) expect(soma(p.split("").map(Number))).toBe(11);
    expect(new Set(PADROES).size).toBe(PADROES.length);
    expect(PADROES).toHaveLength(106);
  });

  it("a parada soma 13 módulos", () => {
    expect(soma(PARADA)).toBe(13);
    expect(code128B("").slice(-7)).toEqual(PARADA);
  });
});

describe("code128B", () => {
  it("começa pelo início B e termina pela parada", () => {
    const w = code128B("grifo");
    expect(w.slice(0, 6)).toEqual(INICIO_B);
    expect(w.slice(-7)).toEqual(PARADA);
  });

  it("tem 49 larguras e 90 módulos para \"grifo\"", () => {
    const w = code128B("grifo");
    expect(w).toHaveLength(6 * (1 + 5 + 1) + 7);
    expect(modulosCode128(w)).toBe(11 * 7 + 13);
  });

  it("o dígito verificador de \"grifo\" é o padrão do valor 100", () => {
    const w = code128B("grifo");
    expect(w.slice(-6 - 7, -7).join("")).toBe("114131");
    expect(PADROES[100]).toBe("114131");
  });

  it("recusa caracteres fora do conjunto B", () => {
    expect(() => code128B("ç")).toThrow();
  });
});

describe("numeroDoDownload", () => {
  it("com exame", () => {
    expect(numeroDoDownload(new Date(2026, 9, 20, 14, 5), 41)).toBe("05142010202641");
  });

  it("sem exame", () => {
    expect(numeroDoDownload(new Date(2026, 9, 20, 14, 5))).toBe("051420102026");
    expect(numeroDoDownload(new Date(2026, 9, 20, 14, 5), null)).toBe("051420102026");
  });
});

const REGEX_FOLHA = /^[1-9]\/[1-9]\d{4} - [1-9]\d{13}$/;

describe("codigoDaFolha", () => {
  it("formato com sorteio mínimo e máximo", () => {
    expect(codigoDaFolha(() => 0)).toMatch(REGEX_FOLHA);
    expect(codigoDaFolha(() => 0.999999)).toMatch(REGEX_FOLHA);
  });

  it("formato em 200 sorteios aleatórios", () => {
    for (let i = 0; i < 200; i++) expect(codigoDaFolha(Math.random)).toMatch(REGEX_FOLHA);
  });
});

describe("numeroDoCanto", () => {
  it("vai de 1 a 15 nos extremos", () => {
    expect(numeroDoCanto(() => 0)).toBe(1);
    expect(numeroDoCanto(() => 0.999999)).toBe(15);
  });

  it("fica entre 1 e 15 em 200 sorteios aleatórios", () => {
    for (let i = 0; i < 200; i++) {
      const n = numeroDoCanto(Math.random);
      expect(Number.isInteger(n) && n >= 1 && n <= 15).toBe(true);
    }
  });
});
